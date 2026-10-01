"""manifest.json provenance. `pii_scan.py` and `db:seed` both verify these
checksums before touching a file — a substituted file is rejected, not loaded
(RULE-database.md §Seeding)."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest(out_dir: Path, seed: int, files: list[str], row_counts: dict[str, int]) -> None:
    manifest = {
        "seed": seed,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rowCounts": row_counts,
        "files": {name: sha256_of(out_dir / name) for name in files},
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

