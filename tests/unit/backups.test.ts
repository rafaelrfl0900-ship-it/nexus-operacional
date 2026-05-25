import { describe, expect, it, vi } from "vitest";
import { BackupsService } from "../../apps/api/src/modules/backups/backups.service";

describe("backups service", () => {
  it("serializes BigInt sizes before returning backup rows", async () => {
    const createdAt = new Date("2026-05-25T10:00:00.000Z");
    const prisma = {
      backup: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "backup-1",
            filePath: "./backups/nexus-backup.json",
            status: "COMPLETED",
            sizeBytes: 2048n,
            checksum: "abc123",
            createdAt,
            createdBy: null
          }
        ]),
        count: vi.fn().mockResolvedValue(1),
        aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 2048n } })
      }
    };

    const service = new BackupsService(prisma as never, { get: vi.fn() } as never, { record: vi.fn() } as never);

    await expect(service.list({ take: "10" })).resolves.toMatchObject({
      items: [
        {
          id: "backup-1",
          fileName: "nexus-backup.json",
          sizeBytes: "2048",
          createdAt: "2026-05-25T10:00:00.000Z"
        }
      ],
      summary: {
        total: 1,
        storageBytes: "2048",
        latestCreatedAt: "2026-05-25T10:00:00.000Z"
      }
    });
  });
});
