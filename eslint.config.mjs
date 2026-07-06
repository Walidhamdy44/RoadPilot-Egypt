import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "temp-next/**",
  ]),
  // Global rules
  {
    rules: {
      // Max cyclomatic complexity
      complexity: ["error", { max: 10 }],
      // Max file lines
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // Clean Architecture: Domain layer cannot import from infrastructure or presentation
  {
    files: ["src/features/*/domain/**/*.ts", "src/features/*/domain/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/infrastructure"],
              message: "Domain layer cannot import from infrastructure layer.",
            },
            {
              group: ["**/presentation/**", "**/presentation"],
              message: "Domain layer cannot import from presentation layer.",
            },
            {
              group: ["@/app/**", "../../../app/**"],
              message: "Domain layer cannot import from the app directory.",
            },
          ],
        },
      ],
    },
  },
  // Clean Architecture: Infrastructure layer cannot import from presentation
  {
    files: ["src/features/*/infrastructure/**/*.ts", "src/features/*/infrastructure/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/presentation/**", "**/presentation"],
              message: "Infrastructure layer cannot import from presentation layer.",
            },
            {
              group: ["@/app/**", "../../../app/**"],
              message: "Infrastructure layer cannot import from the app directory.",
            },
          ],
        },
      ],
    },
  },
  // Features cannot import from the app directory
  {
    files: ["src/features/**/*.ts", "src/features/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**"],
              message: "Features cannot import from the app directory.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
