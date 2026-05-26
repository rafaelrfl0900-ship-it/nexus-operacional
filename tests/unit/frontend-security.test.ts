import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const webRoot = join(repoRoot, "apps/web");

function webFiles(dir = webRoot): string[] {
  return readdirSync(dir).flatMap((name) => {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if ([".next", "out", "node_modules"].includes(name)) return [];
      return webFiles(fullPath);
    }
    return [fullPath];
  });
}

describe("frontend security boundary", () => {
  it("does not ship the workbook-derived legacy JSON in the web app", () => {
    expect(existsSync(join(webRoot, "lib/legacy-data.json"))).toBe(false);
  });

  it("does not import legacy workbook data or expose local admin credentials in frontend source", () => {
    const forbidden = [
      "legacy-data.json",
      "local-admin-session",
      "NEXT_PUBLIC_LOCAL_ADMIN_PASSWORD",
      "NEXT_PUBLIC_ENABLE_LOCAL_ADMIN",
      "window.localStorage",
      "ChangeMe!2026"
    ];

    const offenders = webFiles()
      .map((file) => ({ file, text: readFileSync(file, "utf-8") }))
      .flatMap(({ file, text }) =>
        forbidden.filter((pattern) => text.includes(pattern)).map((pattern) => `${relative(repoRoot, file)} -> ${pattern}`)
      );

    expect(offenders).toEqual([]);
  });
});
