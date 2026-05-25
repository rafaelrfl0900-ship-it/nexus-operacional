import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Backup } from "@prisma/client";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { AuditService } from "../audit/audit.service";

interface BackupQuery {
  status?: string;
  take?: string;
}

interface DatabaseTable {
  table_name: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class BackupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  async list(query: BackupQuery) {
    const take = this.sanitizeTake(query.take);
    const status = query.status?.trim().toUpperCase() || undefined;

    const [items, total, completed, failed, running, storage] = await Promise.all([
      this.prisma.backup.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take
      }),
      this.prisma.backup.count(),
      this.prisma.backup.count({ where: { status: "COMPLETED" } }),
      this.prisma.backup.count({ where: { status: "FAILED" } }),
      this.prisma.backup.count({ where: { status: "RUNNING" } }),
      this.prisma.backup.aggregate({ _sum: { sizeBytes: true } })
    ]);

    return {
      items: items.map((backup) => this.toDto(backup)),
      summary: {
        total,
        completed,
        failed,
        running,
        storageBytes: storage._sum.sizeBytes?.toString() ?? "0",
        latestCreatedAt: items[0]?.createdAt.toISOString() ?? null
      }
    };
  }

  async create(user?: CurrentUser) {
    const backupDir = this.config.get<string>("BACKUP_DIR")?.trim() || "./backups";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `nexus-backup-${timestamp}.json`;
    const filePath = `${backupDir.replace(/[\\/]+$/, "")}/${fileName}`;
    const fullPath = resolve(process.cwd(), backupDir, fileName);
    const createdBy = user?.id && uuidPattern.test(user.id) ? user.id : undefined;

    try {
      await mkdir(resolve(process.cwd(), backupDir), { recursive: true });
      const snapshot = await this.buildSnapshot();
      const payload = JSON.stringify(snapshot, this.jsonReplacer, 2);
      await writeFile(fullPath, payload, "utf8");

      const [fileBuffer, fileStat] = await Promise.all([readFile(fullPath), stat(fullPath)]);
      const checksum = createHash("sha256").update(fileBuffer).digest("hex");

      const backup = await this.prisma.backup.create({
        data: {
          filePath,
          status: "COMPLETED",
          sizeBytes: BigInt(fileStat.size),
          checksum,
          createdBy
        }
      });

      await this.audit.record({
        userId: user?.id,
        module: "backups",
        action: "create",
        entity: "Backup",
        entityId: backup.id,
        after: this.toDto(backup)
      });

      return this.toDto(backup);
    } catch (error) {
      await this.recordFailedBackup(filePath, createdBy, user, error);
      throw new InternalServerErrorException("Nao foi possivel gerar o backup do banco.");
    }
  }

  private async buildSnapshot() {
    const tables = await this.prisma.$queryRaw<DatabaseTable[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `;

    const data: Record<string, unknown[]> = {};
    for (const table of tables) {
      const tableName = table.table_name.replace(/"/g, "\"\"");
      data[table.table_name] = await this.prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${tableName}"`);
    }

    return {
      app: this.config.get<string>("APP_NAME") ?? "NEXUS OPERACIONAL",
      generatedAt: new Date().toISOString(),
      format: "nexus-json-snapshot-v1",
      tables: data
    };
  }

  private async recordFailedBackup(filePath: string, createdBy: string | undefined, user: CurrentUser | undefined, error: unknown) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    try {
      const backup = await this.prisma.backup.create({
        data: {
          filePath,
          status: "FAILED",
          createdBy
        }
      });

      await this.audit.record({
        userId: user?.id,
        module: "backups",
        action: "failed",
        entity: "Backup",
        entityId: backup.id,
        after: { ...this.toDto(backup), error: message }
      });
    } catch {
      // If the database itself is unavailable, the HTTP error above is the only safe signal.
    }
  }

  private sanitizeTake(raw?: string) {
    const parsed = Number(raw ?? 50);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(Math.max(Math.trunc(parsed), 1), 100);
  }

  private toDto(backup: Backup) {
    return {
      id: backup.id,
      filePath: backup.filePath,
      fileName: basename(backup.filePath),
      status: backup.status,
      sizeBytes: backup.sizeBytes?.toString() ?? null,
      checksum: backup.checksum,
      createdAt: backup.createdAt.toISOString(),
      createdBy: backup.createdBy
    };
  }

  private jsonReplacer(_key: string, value: unknown) {
    if (typeof value === "bigint") return value.toString();
    return value;
  }
}
