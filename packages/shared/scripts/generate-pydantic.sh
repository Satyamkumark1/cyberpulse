#!/usr/bin/env bash
# Generates apps/ml-service/app/schemas/*.py from packages/shared/schemas/*.schema.json
# using datamodel-code-generator (pip install -r apps/ml-service/requirements-dev.txt).
# Output is committed — engineering/folder-structure.md §4.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMAS_DIR="$SCRIPT_DIR/../schemas"
OUT_DIR="$SCRIPT_DIR/../../../apps/ml-service/app/schemas"

mkdir -p "$OUT_DIR"

if ! command -v datamodel-codegen &> /dev/null; then
  echo "datamodel-codegen not found. Install with: pip install -r apps/ml-service/requirements-dev.txt" >&2
  exit 1
fi

# Only the contracts the ML service speaks: it serves /health and /predict and
# errors in the shared envelope. Web-only schemas (health, prediction,
# predict-request) have no Python consumer.
for name in error ml-health ml-predict-request ml-predict-response; do
  schema="$SCHEMAS_DIR/${name}.schema.json"
  module_name="$(echo "$name" | tr '-' '_')"
  out_file="$OUT_DIR/${module_name}.py"

  body_file="$(mktemp)"
  datamodel-codegen \
    --input "$schema" \
    --input-file-type jsonschema \
    --output "$body_file" \
    --output-model-type pydantic_v2.BaseModel \
    --use-schema-description \
    --disable-timestamp \
    --enum-field-as-literal all \
    --field-constraints

  {
    echo "# GENERATED FILE — do not edit by hand."
    echo "# Source: packages/shared/schemas/${name}.schema.json — regenerate with \`pnpm generate:pydantic\`."
    cat "$body_file"
  } > "$out_file"
  rm -f "$body_file"

  echo "generated app/schemas/${module_name}.py"
done
