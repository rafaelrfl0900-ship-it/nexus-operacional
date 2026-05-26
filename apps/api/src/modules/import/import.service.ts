import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { promisify } from "node:util";
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";

const execFileAsync = promisify(execFile);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxUploadBytes = Number(process.env.IMPORT_MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);
const xlsxMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream"
]);

export interface UploadedWorkbookFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

interface LegacyImportProduct {
  code: string;
  name: string;
  defaultSector: "P1" | "P2";
  packageWeightKg: number;
  boxWeightKg: number;
  packagesPerBox: number;
  massWeightKg: number;
  targetPackageWeightG: number;
  unit: string;
  overweightTolerancePercent: number;
  formula: "BOX_WEIGHT" | "PACKAGE_WEIGHT";
  active: boolean;
  source?: unknown;
}

interface LegacyImportError {
  sheetName?: string | null;
  cell?: string | null;
  rowNumber?: number | null;
  field?: string | null;
  message: string;
  rawValue?: string | null;
}

interface LegacyImportReport {
  file: string;
  sheetCount?: number;
  formulaCount?: number;
  tableCount?: number;
  chartCount?: number;
  errors?: Record<string, number>;
  legacyData?: {
    products?: LegacyImportProduct[];
    productCount?: number;
    duplicateProductCodes?: string[];
    duplicateWeightCodes?: string[];
    importErrors?: LegacyImportError[];
    importErrorCount?: number;
  };
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async preview(batchId?: string) {
    const batch = batchId
      ? await this.prisma.importBatch.findUnique({
          where: { id: batchId },
          include: { errors: { take: 100, orderBy: { createdAt: "asc" } } }
        })
      : await this.prisma.importBatch.findFirst({
          orderBy: { createdAt: "desc" },
          include: { errors: { take: 100, orderBy: { createdAt: "asc" } } }
        });

    if (!batch) {
      return {
        source: "Nenhuma planilha carregada",
        sheetCount: 0,
        formulaCount: 0,
        tableCount: 0,
        chartCount: 0,
        errors: {},
        importErrors: [],
        status: "NO_WORKBOOK"
      };
    }

    const summary = typeof batch.summary === "object" && batch.summary ? batch.summary : {};
    return {
      source: batch.originalFileName ?? batch.sourceFile,
      batchId: batch.id,
      status: batch.status,
      fileHash: batch.fileHash,
      fileSizeBytes: batch.fileSizeBytes?.toString() ?? null,
      ...summary,
      importErrors: batch.errors
    };
  }

  async uploadWorkbook(file: UploadedWorkbookFile | undefined, user?: CurrentUser) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Arquivo XLSX nao enviado.");
    }
    this.assertSafeWorkbook(file);

    const uploadDir = this.uploadDir();
    await mkdir(uploadDir, { recursive: true });

    const fileHash = createHash("sha256").update(file.buffer).digest("hex");
    const storedName = `${randomUUID()}.xlsx`;
    const storedPath = resolve(uploadDir, storedName);
    await writeFile(storedPath, file.buffer);

    const report = await this.runLegacyWorkbookImport(storedPath);
    const importErrors = report.legacyData?.importErrors ?? [];
    const createdBy = this.safeUserId(user);

    const batch = await this.prisma.importBatch.create({
      data: {
        sourceFile: file.originalname,
        originalFileName: file.originalname,
        storedFilePath: storedPath,
        fileHash,
        fileSizeBytes: BigInt(file.size),
        status: "CLEANED",
        summary: this.reportSummary(report),
        createdBy,
        errors: importErrors.length ? { create: importErrors.map((error) => this.importErrorData(error)) } : undefined
      },
      include: { errors: { take: 100, orderBy: { createdAt: "asc" } } }
    });

    await this.audit.record({
      userId: createdBy,
      module: "import",
      action: "upload",
      entity: "ImportBatch",
      entityId: batch.id,
      after: {
        originalFileName: batch.originalFileName,
        fileHash: batch.fileHash,
        fileSizeBytes: batch.fileSizeBytes?.toString(),
        status: batch.status
      }
    });

    return {
      id: batch.id,
      status: batch.status,
      sourceFile: batch.sourceFile,
      originalFileName: batch.originalFileName,
      fileHash: batch.fileHash,
      fileSizeBytes: batch.fileSizeBytes?.toString() ?? null,
      summary: batch.summary,
      errors: batch.errors
    };
  }

  async importProducts(batchId: string | undefined, user?: CurrentUser) {
    if (!batchId || !uuidPattern.test(batchId)) {
      throw new BadRequestException("Informe o lote de importacao criado por upload.");
    }

    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch?.storedFilePath) {
      throw new NotFoundException("Lote de importacao com arquivo armazenado nao encontrado.");
    }

    const userId = this.safeUserId(user);

    try {
      const report = await this.runLegacyWorkbookImport(batch.storedFilePath);
      const legacyData = report.legacyData;
      const products = legacyData?.products ?? [];
      const importErrors = legacyData?.importErrors ?? [];

      if (!products.length) {
        throw new BadRequestException("Nenhum produto normalizado foi encontrado na planilha.");
      }

      const p1 = await this.prisma.sector.upsert({
        where: { code: "P1" },
        create: { code: "P1", name: "P1 - Pao de Queijo" },
        update: {}
      });
      const p2 = await this.prisma.sector.upsert({
        where: { code: "P2" },
        create: { code: "P2", name: "P2 - Bolos e Churros" },
        update: {}
      });

      let importedProducts = 0;
      for (const product of products) {
        const sector = product.defaultSector === "P2" ? p2 : p1;
        const saved = await this.prisma.product.upsert({
          where: { code: product.code },
          create: {
            code: product.code,
            name: product.name,
            defaultSectorId: sector.id,
            unit: product.unit ?? "kg",
            active: product.active ?? true,
            notes: "Importado da planilha legada.",
            createdBy: userId,
            updatedBy: userId
          },
          update: {
            name: product.name,
            defaultSectorId: sector.id,
            unit: product.unit ?? "kg",
            active: product.active ?? true,
            notes: "Atualizado pela importacao da planilha legada.",
            updatedBy: userId
          }
        });

        await this.prisma.productWeightConfig.upsert({
          where: { productId: saved.id },
          create: {
            productId: saved.id,
            packageWeightKg: product.packageWeightKg,
            boxWeightKg: product.boxWeightKg,
            packagesPerBox: product.packagesPerBox,
            massWeightKg: product.massWeightKg,
            targetPackageWeightG: product.targetPackageWeightG,
            overweightTolerancePercent: product.overweightTolerancePercent,
            formula: product.formula
          },
          update: {
            packageWeightKg: product.packageWeightKg,
            boxWeightKg: product.boxWeightKg,
            packagesPerBox: product.packagesPerBox,
            massWeightKg: product.massWeightKg,
            targetPackageWeightG: product.targetPackageWeightG,
            overweightTolerancePercent: product.overweightTolerancePercent,
            formula: product.formula
          }
        });
        importedProducts += 1;
      }

      await this.prisma.importError.deleteMany({ where: { batchId: batch.id } });
      if (importErrors.length) {
        await this.prisma.importError.createMany({
          data: importErrors.map((error) => ({
            batchId: batch.id,
            ...this.importErrorData(error)
          }))
        });
      }

      const summary = {
        ...this.reportSummary(report),
        importedProducts,
        duplicateProductCodes: legacyData?.duplicateProductCodes ?? [],
        duplicateWeightCodes: legacyData?.duplicateWeightCodes ?? [],
        importErrorCount: importErrors.length
      };

      const updated = await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: importErrors.length ? "IMPORTED_WITH_ERRORS" : "IMPORTED",
          summary,
          completedAt: new Date()
        },
        include: { errors: { take: 100, orderBy: { createdAt: "asc" } } }
      });

      await this.audit.record({
        userId,
        module: "import",
        action: "import_products",
        entity: "ImportBatch",
        entityId: batch.id,
        before: { status: batch.status },
        after: {
          status: updated.status,
          importedProducts,
          importErrorCount: importErrors.length
        }
      });

      return updated;
    } catch (error) {
      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          summary: { message: error instanceof Error ? error.message : "Falha desconhecida na importacao." },
          completedAt: new Date()
        }
      });
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(error instanceof Error ? error.message : "Falha ao importar produtos.");
    }
  }

  private assertSafeWorkbook(file: UploadedWorkbookFile) {
    const extension = extname(file.originalname).toLowerCase();
    if (extension !== ".xlsx") {
      throw new BadRequestException("Somente arquivos .xlsx sao aceitos.");
    }
    if (file.size > maxUploadBytes) {
      throw new BadRequestException("Arquivo excede o limite permitido para importacao.");
    }
    if (!xlsxMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Tipo MIME do arquivo nao permitido para importacao.");
    }
    if (!file.buffer?.subarray(0, 2).equals(Buffer.from("PK"))) {
      throw new BadRequestException("Assinatura do arquivo XLSX invalida.");
    }
  }

  private importErrorData(error: LegacyImportError) {
    return {
      sheetName: error.sheetName ?? null,
      cell: error.cell ?? null,
      rowNumber: error.rowNumber ?? null,
      field: error.field ?? null,
      message: error.message,
      rawValue: error.rawValue ?? null,
      originalValue: error.rawValue ?? null
    };
  }

  private reportSummary(report: LegacyImportReport) {
    return {
      sourceFile: report.file,
      sheetCount: report.sheetCount ?? 0,
      formulaCount: report.formulaCount ?? 0,
      tableCount: report.tableCount ?? 0,
      chartCount: report.chartCount ?? 0,
      errors: report.errors ?? {},
      productCount: report.legacyData?.productCount ?? 0,
      importErrorCount: report.legacyData?.importErrorCount ?? report.legacyData?.importErrors?.length ?? 0,
      duplicateProductCodes: report.legacyData?.duplicateProductCodes ?? [],
      duplicateWeightCodes: report.legacyData?.duplicateWeightCodes ?? []
    };
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }

  private uploadDir() {
    return resolve(process.cwd(), process.env.IMPORT_UPLOAD_DIR ?? "uploads/imports");
  }

  private async runLegacyWorkbookImport(sourceFile: string): Promise<LegacyImportReport> {
    const scriptPath = this.resolveImportScript();
    const pythonBin = process.env.PYTHON_BIN ?? (process.platform === "win32" ? "python" : "python3");
    const { stdout } = await execFileAsync(pythonBin, [scriptPath, "--file", sourceFile], {
      maxBuffer: 20 * 1024 * 1024,
      cwd: resolve(__dirname, "../../../../..")
    });

    return JSON.parse(stdout) as LegacyImportReport;
  }

  private resolveImportScript() {
    const candidates = [
      resolve(process.cwd(), "scripts/import_excel.py"),
      resolve(process.cwd(), "../../scripts/import_excel.py"),
      resolve(__dirname, "../../../../../scripts/import_excel.py")
    ];
    const scriptPath = candidates.find((candidate) => existsSync(candidate));
    if (!scriptPath) {
      throw new BadRequestException(`Script de importacao nao encontrado. Procurado em: ${candidates.join(", ")}`);
    }
    return scriptPath;
  }
}
