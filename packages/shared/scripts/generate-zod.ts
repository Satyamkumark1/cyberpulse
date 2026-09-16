// Generates packages/shared/zod/*.ts from packages/shared/schemas/*.schema.json.
// Output is committed (engineering/folder-structure.md §4) so a fresh clone
// type-checks without running codegen, and a drifted commit shows as a diff in review.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { jsonSchemaToZod } from "json-schema-to-zod";

const schemasDir = join(import.meta.dirname, "..", "schemas");
const outDir = join(import.meta.dirname, "..", "zod");

mkdirSync(outDir, { recursive: true });

const HEADER = `// GENERATED FILE — do not edit by hand.
// Source: packages/shared/schemas/*.schema.json — regenerate with \`pnpm generate:zod\`.
import { z } from 'zod';

`;

for (const file of readdirSync(schemasDir)) {
  if (!file.endsWith(".schema.json")) continue;

  const schema = JSON.parse(readFileSync(join(schemasDir, file), "utf-8"));
  const name: string = schema.title ?? pascalCase(basename(file, ".schema.json"));
  const expr = jsonSchemaToZod(schema, { module: "none", type: false });
  const body = `export const ${name} = ${expr};\nexport type ${name} = z.infer<typeof ${name}>;\n`;

  writeFileSync(join(outDir, `${basename(file, ".schema.json")}.ts`), HEADER + body);
  console.log(`generated zod/${basename(file, ".schema.json")}.ts`);
}

function pascalCase(s: string): string {
  return s.replace(/(^|[-_])([a-z])/g, (_, __, c) => c.toUpperCase());
}
