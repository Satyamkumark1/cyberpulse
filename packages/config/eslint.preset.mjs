// Shared flat-config rules. The forbidden-import boundaries below implement
// engineering/folder-structure.md §7 — each one is a lint error because it is
// a shortcut that looks harmless in one PR and is expensive to unwind later.

/** @type {import('eslint').Linter.Config[]} */
export const boundaryRules = [
  {
    files: ["**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@cyberpulse/db", message: "Components never touch the database directly — go through a Server Component calling services/, or a route handler." },
          ],
          patterns: [
            { group: ["**/services/mlClient", "**/services/mlClient.js"], message: "Components never call the ML client directly." },
            { group: ["**/services/lib/auth", "**/services/lib/auth.js"], message: "Components never resolve authorisation directly — a hidden button is not a control." },
          ],
        },
      ],
    },
  },
  {
    files: ["**/app/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@cyberpulse/db", message: "Route handlers delegate to services/ — no direct database access (RULE-backend.md)." },
          ],
        },
      ],
    },
  },
  {
    files: ["**/services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "services/ must run identically in a CLI — no React." },
            { name: "next/server", message: "services/ must run identically in a CLI — no Next.js runtime types." },
          ],
        },
      ],
    },
  },
];

/** @type {import('eslint').Linter.Config} */
export const baseRules = {
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
};
