import { describe, expect, it } from "vitest";
import { legacyWorkbookInsights } from "../../apps/api/src/domain/legacy-insights";

describe("legacy workbook contract", () => {
  it("keeps the workbook discovery facts available to the API", () => {
    expect(legacyWorkbookInsights.sheets).toContain("Plan x Real (P1)");
    expect(legacyWorkbookInsights.formulas).toBeGreaterThan(9000);
    expect(legacyWorkbookInsights.cachedErrors["#N/A"]).toBe(565);
  });
});
