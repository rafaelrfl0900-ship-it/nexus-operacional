import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "apps/api/dist/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/web/tsconfig.tsbuildinfo",
      "coverage/**",
      "dist/**",
      "playwright-report/**",
      "test-results/**"
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off"
    }
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    settings: {
      next: {
        rootDir: "apps/web/"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/triple-slash-reference": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  },
  {
    files: [
      "apps/web/**/*.{js,jsx,mjs,ts,tsx,mts,cts}",
      "app/**/*.{js,jsx,mjs,ts,tsx,mts,cts}",
      "components/**/*.{js,jsx,mjs,ts,tsx,mts,cts}",
      "lib/**/*.{js,jsx,mjs,ts,tsx,mts,cts}",
      "services/**/*.{js,jsx,mjs,ts,tsx,mts,cts}",
      "next.config.ts",
      "tailwind.config.ts",
      "postcss.config.mjs"
    ],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin
    },
    settings: {
      next: {
        rootDir: "apps/web/"
      }
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off"
    }
  },
  {
    files: ["apps/api/src/**/*.ts", "prisma/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts", "*.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
);
