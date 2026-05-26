import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("legacy workbook contract", () => {
  it("does not expose workbook discovery metrics as static API facts", () => {
    expect(existsSync(join(repoRoot, "apps/api/src/domain/legacy-insights.ts"))).toBe(false);

    const dashboard = readFileSync(join(repoRoot, "apps/api/src/modules/dashboard/dashboard.service.ts"), "utf-8");
    expect(dashboard).not.toContain("legacyWorkbookInsights");
  });

  it("keeps imports tied to uploaded batches instead of arbitrary server paths", () => {
    const controller = readFileSync(join(repoRoot, "apps/api/src/modules/import/import.controller.ts"), "utf-8");
    expect(controller).toContain('@Post("upload")');
    expect(controller).toContain("FileInterceptor");
    expect(controller).not.toContain("sourceFile?: string");
  });
});
