// CLAUDE.md §Terminology deny-list, applied at runtime to discard an AI reply
// that uses a prohibited word (English or Hindi — the two languages the
// assistant writes that the lexicon covers). A deny-list has to spell its words
// out, so scripts/evaluation/no_hardcode_check.sh excludes this one file by name.
// Keep it in sync with PROHIBITED_PATTERN and TERMINOLOGY_PATTERN in that script.
export const PROHIBITED_TERMS =
  /\b(criminals?|fraudsters?|offenders?|guilty|accused|culprits?|confirmed location|guaranteed?|official|endorsed)\b|आधिकारिक|गारंटी|अपराधी|धोखेबाज|आरोपी|दोषी/i;
