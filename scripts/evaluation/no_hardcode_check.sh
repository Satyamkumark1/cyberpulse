#!/usr/bin/env bash
# CI gate 6 (devops/ci-cd.md §2.1). Three checks over apps/web source, none
# bypassable by a flag: a hard-coded model value, a prohibited claim, or
# prohibited terminology reaching rendered/shipped text. Test fixtures and
# specs are excluded — they legitimately assert against these strings.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCAN_DIRS=("$ROOT/apps/web/app" "$ROOT/apps/web/components" "$ROOT/apps/web/lib" "$ROOT/apps/web/services")

# prohibitedLexicon.ts is the runtime deny-list that discards AI replies using
# these words; like the specs, it must spell them out to match against them.
GREP_EXCLUDES=(--exclude-dir=node_modules --exclude-dir=.next --exclude="*.test.*" --exclude="*.spec.*" --exclude-dir=__fixtures__ --exclude=prohibitedLexicon.ts)

fail=0

echo "=== hard-coded model values (ux/wireframes.md placeholders) ==="
# TC-E2E-051: these exact figures only ever belong in wireframes, never in
# shipped source — any appearance means a placeholder was copy-pasted.
HARDCODE_PATTERN='91\.7%|81\.4%|87\.2%|₹1,15,000|₹1,20,000|₹1,45,000|₹1,70,000|₹2,10,000|₹2,80,000|₹3,80,000|₹45,000|₹92,500|14:00.{0,3}16:00|15:00.{0,3}17:00'
if grep -rEn "${GREP_EXCLUDES[@]}" "$HARDCODE_PATTERN" "${SCAN_DIRS[@]}" 2>/dev/null; then
  echo "[FAIL] wireframe placeholder value(s) found in source"
  fail=1
else
  echo "[PASS] no wireframe placeholder values found"
fi

echo
echo "=== prohibited-claims scan (CLAUDE.md §Terminology) ==="
# FEAT-17 serves Hindi too (apps/web/lib/safety/copy.ts); the same claims are
# prohibited in either language: आधिकारिक = official, गारंटी = guarantee.
PROHIBITED_PATTERN='\bofficial\b|\bendorsed\b|guaranteed recovery|\bguaranteed\b|आधिकारिक|गारंटी'
if grep -rEni "${GREP_EXCLUDES[@]}" "$PROHIBITED_PATTERN" "${SCAN_DIRS[@]}" 2>/dev/null; then
  echo "[FAIL] prohibited claim found in source"
  fail=1
else
  echo "[PASS] no prohibited claims found"
fi

echo
echo "=== terminology scan (CLAUDE.md §Terminology) ==="
# Hindi: अपराधी = criminal, धोखेबाज = fraudster, आरोपी = accused, दोषी = guilty.
TERMINOLOGY_PATTERN='\bcriminal(s)?\b|\bfraudster(s)?\b|\boffender(s)?\b|\bguilty\b|\baccused\b|\bculprit(s)?\b|confirmed location|अपराधी|धोखेबाज|आरोपी|दोषी'
if grep -rEni "${GREP_EXCLUDES[@]}" "$TERMINOLOGY_PATTERN" "${SCAN_DIRS[@]}" 2>/dev/null; then
  echo "[FAIL] prohibited terminology found in source"
  fail=1
else
  echo "[PASS] no prohibited terminology found"
fi

echo
if [ "$fail" -eq 1 ]; then
  echo "no_hardcode_check FAILED" >&2
  exit 1
fi
echo "no_hardcode_check PASSED"
