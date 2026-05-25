import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { legacyWorkbookInsights } from "../../domain/legacy-insights";

const execFileAsync = promisify(execFile);

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
  constructor(private readonly prisma: PrismaService) {}

  preview() {
    return {
      source: process.env.LEGACY_EXCEL_PATH ?? "Relatorios - MAIO 2026.xlsx",
      ...legacyWorkbookInsights
    };
  }

  async registerBatch(sourceFile: string) {
    return this.prisma.importBatch.create({
      data: {
        sourceFile,
        status: "RECEIVED",
        summary: legacyWorkbookInsights
      }
    });
  }

  async importProducts(sourceFile?: string) {
    const selectedFile = sourceFile ?? process.env.LEGACY_EXCEL_PATH;
    const batch = await this.prisma.importBatch.create({
      data: {
        sourceFile: selectedFile ?? "auto-detected legacy workbook",
        status: "RECEIVED",
        summary: { stage: "products" }
      }
    });

    try {
      const report = await this.runLegacyWorkbookImport(selectedFile);
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
            notes: "Importado da planilha legada."
          },
          update: {
            name: product.name,
            defaultSectorId: sector.id,
            unit: product.unit ?? "kg",
            active: product.active ?? true,
            notes: "Atualizado pela importacao da planilha legada."
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

      if (importErrors.length) {
        await this.prisma.importError.createMany({
          data: importErrors.map((error) => ({
            batchId: batch.id,
            sheetName: error.sheetName ?? null,
            cell: error.cell ?? null,
            rowNumber: error.rowNumber ?? null,
            field: error.field ?? null,
            message: error.message,
            rawValue: error.rawValue ?? null
          }))
        });
      }

      const summary = {
        sourceFile: report.file,
        importedProducts,
        duplicateProductCodes: legacyData?.duplicateProductCodes ?? [],
        duplicateWeightCodes: legacyData?.duplicateWeightCodes ?? [],
        importErrorCount: importErrors.length
      };

      return this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: importErrors.length ? "IMPORTED_WITH_ERRORS" : "IMPORTED",
          summary,
          completedAt: new Date()
        },
        include: { errors: { take: 10, orderBy: { createdAt: "asc" } } }
      });
    } catch (error) {
      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          summary: { message: error instanceof Error ? error.message : "Falha desconhecida na importacao." },
          completedAt: new Date()
        }
      });
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error instanceof Error ? error.message : "Falha ao importar produtos.");
    }
  }

  private async runLegacyWorkbookImport(sourceFile?: string): Promise<LegacyImportReport> {
    const scriptPath = this.resolveImportScript();
    const args = [scriptPath];
    if (sourceFile) {
      args.push("--file", sourceFile);
    }

    const { stdout } = await execFileAsync(process.env.PYTHON_BIN ?? "python", args, {
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
