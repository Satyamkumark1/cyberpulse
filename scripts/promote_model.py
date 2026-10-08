"""Promote a gate-passing model bundle without training over live artifacts.

The evaluator is responsible for writing the staged model card only after all
gates pass. This command is the explicit release boundary used by Makefile.
"""

import argparse
import hashlib
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path


REQUIRED = ("risk_model.joblib", "temporal_model.joblib", "feature_schema.json", "model_card.json")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--staging", type=Path, required=True)
    parser.add_argument("--production", type=Path, required=True)
    args = parser.parse_args()

    missing = [name for name in (*REQUIRED, "evaluation_passed.json") if not (args.staging / name).is_file()]
    if missing:
        raise SystemExit(f"cannot promote incomplete bundle; missing: {', '.join(missing)}")

    card = json.loads((args.staging / "model_card.json").read_text())
    evaluation = json.loads((args.staging / "evaluation_passed.json").read_text())
    if not card.get("modelVersion") or not card.get("metrics"):
        raise SystemExit("cannot promote bundle without evaluated modelVersion and metrics")
    if evaluation.get("modelVersion") != card["modelVersion"] or evaluation.get("holdoutGatesPassed") is not True:
        raise SystemExit("cannot promote bundle without a matching successful evaluation marker")

    args.production.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="cyberpulse-promote-") as temp:
        temp_dir = Path(temp)
        for name in REQUIRED:
            shutil.copy2(args.staging / name, temp_dir / name)
        manifest = {
            "bundleId": f"{card['modelVersion']}-{sha256(temp_dir / 'model_card.json')[:12]}",
            "modelVersion": card["modelVersion"],
            "featureSchemaVersion": card.get("featureSchemaVersion"),
            "promotedAt": datetime.now(timezone.utc).isoformat(),
            "files": {name: sha256(temp_dir / name) for name in REQUIRED},
        }
        (temp_dir / "bundle_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        for name in (*REQUIRED, "bundle_manifest.json"):
            shutil.copy2(temp_dir / name, args.production / name)

    print(f"promoted {manifest['bundleId']} to {args.production}")


if __name__ == "__main__":
    main()
