#!/usr/bin/env python3
"""Blocks `db:seed` on any personal-data shape in the generated corpus
(security/data-protection.md §3.2, FR-01.7, AC-016-06). Six pattern classes.
Non-bypassable: no flag skips this (CLAUDE.md §Commands). Never prints the
matched value itself — only its location — so the scan's own output can't
become a PII leak.
"""

import argparse
import csv
import re
import sys
from pathlib import Path

AADHAAR_RE = re.compile(r"\b\d{4}[\s-]\d{4}[\s-]\d{4}\b")  # spacing is required, not optional —
# a bare 12-digit run matches inside any long decimal fraction (lat/lon, timestamps)
PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
MOBILE_RE = re.compile(r"\b[6-9]\d{9}\b")
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
ACCOUNT_ID_RE = re.compile(r"^ACC-\d{8}$")

# A representative, non-exhaustive reference list — enough to catch a real
# name accidentally introduced by a bug or a bad edit, matched as whole words
# so common English words and synthetic tokens (ACC-, TXN-, ATM-) never trip it.
REFERENCE_NAMES = {
    "aarav", "vivaan", "aditya", "vihaan", "arjun", "reyansh", "krishna", "ishaan",
    "rohan", "kabir", "aryan", "sai", "ananya", "diya", "saanvi", "aadhya",
    "kiara", "myra", "pari", "anika", "riya", "priya", "neha", "pooja",
    "sharma", "verma", "gupta", "patel", "reddy", "nair", "iyer", "singh",
    "kumar", "yadav", "mishra", "agarwal", "chopra", "malhotra", "bhatt", "rao",
}
WORD_RE = re.compile(r"[A-Za-z]+")


def scan_text(value: str) -> set[str]:
    hits: set[str] = set()
    if AADHAAR_RE.search(value):
        hits.add("aadhaar")
    if PAN_RE.search(value):
        hits.add("pan")
    if MOBILE_RE.search(value):
        hits.add("mobile")
    if EMAIL_RE.search(value):
        hits.add("email")
    if any(w.lower() in REFERENCE_NAMES for w in WORD_RE.findall(value)):
        hits.add("name")
    return hits


ACCOUNT_ID_COLUMNS = ("accountId", "fromAccountId", "toAccountId")

# Plain measurement/money columns are excluded from the digit-shaped scans
# (aadhaar/pan/mobile): a 10-digit paise amount or a long decimal coordinate
# is structurally indistinguishable from those shapes but carries no
# identifier risk. Name/email scanning still applies everywhere.
NUMERIC_MEASUREMENT_COLUMNS = (
    "amountPaise", "latitude", "longitude", "victimLat", "victimLon",
    "riskScore", "hopIndex",
)
DIGIT_SHAPE_CATEGORIES = {"aadhaar", "pan", "mobile"}


def scan_file(path: Path) -> dict[str, list[tuple[int, str]]]:
    findings: dict[str, list[tuple[int, str]]] = {}
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):  # header is row 1
            for col, value in row.items():
                if not value:
                    continue
                for category in scan_text(value):
                    if category in DIGIT_SHAPE_CATEGORIES and col in NUMERIC_MEASUREMENT_COLUMNS:
                        continue
                    findings.setdefault(category, []).append((row_num, col))
                if col in ACCOUNT_ID_COLUMNS and not ACCOUNT_ID_RE.match(value):
                    findings.setdefault("account_id_format", []).append((row_num, col))
    return findings


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan the generated corpus for personal-data shapes")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "generated")
    args = parser.parse_args()

    csv_files = sorted(args.data_dir.glob("*.csv"))
    if not csv_files:
        print(f"no CSV files found in {args.data_dir}", file=sys.stderr)
        sys.exit(1)

    total_findings: dict[str, int] = {}
    for path in csv_files:
        findings = scan_file(path)
        for category, locations in findings.items():
            total_findings[category] = total_findings.get(category, 0) + len(locations)
            for row_num, col in locations[:3]:
                print(f"[FOUND] {category}: {path.name}:{row_num} column={col}")
            if len(locations) > 3:
                print(f"  ... and {len(locations) - 3} more {category} match(es) in {path.name}")

    categories = ("aadhaar", "pan", "mobile", "email", "name", "account_id_format")
    for category in categories:
        count = total_findings.get(category, 0)
        print(f"[{'FAIL' if count else 'PASS'}] {category}: {count} match(es)")

    if total_findings:
        print(f"\npii_scan FAILED: {sum(total_findings.values())} match(es) across {len(total_findings)} categor(ies)", file=sys.stderr)
        sys.exit(1)

    print("\npii_scan PASSED: zero matches across all six categories")


if __name__ == "__main__":
    main()
