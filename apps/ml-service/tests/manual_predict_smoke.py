"""Manual smoke test against the real seeded database — not part of the
pytest suite (needs DATABASE_URL and a live corpus). Run directly:

    DATABASE_URL=... python3 tests/test_predict_e2e_manual.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from training.generate_training_data import _generate_candidate_cells, database_url  # noqa: E402


def main() -> None:
    with psycopg.connect(database_url()) as conn, conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(
            "SELECT c.*, cx.h3_r8 as true_h3 FROM complaints c "
            "LEFT JOIN withdrawals cx ON cx.complaint_id = c.id "
            "ORDER BY c.id LIMIT 1"
        )
        complaint = cur.fetchone()
        assert complaint is not None

        cur.execute(
            "SELECT t.*, af.account_id as from_business_id, at.account_id as to_business_id "
            "FROM transactions t "
            "JOIN accounts af ON af.id = t.from_account_id JOIN accounts at ON at.id = t.to_account_id "
            "WHERE t.complaint_id = %s ORDER BY t.hop_index",
            (complaint["id"],),
        )
        txns = cur.fetchall()

        account_ids = {t["from_account_id"] for t in txns} | {t["to_account_id"] for t in txns}
        cur.execute(
            "SELECT * FROM accounts WHERE id = ANY(%s)", (list(account_ids),)
        )
        accounts = cur.fetchall()

        cur.execute("SELECT h3_r8, count(*) c FROM withdrawals GROUP BY h3_r8")
        withdrawal_counts = {r["h3_r8"]: r["c"] for r in cur.fetchall()}
        cur.execute("SELECT h3_r8, count(*) c FROM atms GROUP BY h3_r8")
        atm_counts = {r["h3_r8"]: r["c"] for r in cur.fetchall()}
        cur.execute(
            "SELECT a.state, w.h3_r8 FROM withdrawals w JOIN atms a ON w.atm_id = a.id"
        )
        by_state: dict[str, list[str]] = {}
        for r in cur.fetchall():
            by_state.setdefault(r["state"], []).append(r["h3_r8"])
        top_cells_by_state = {
            s: sorted(cells, key=cells.count, reverse=True) for s, cells in by_state.items()
        }
        cur.execute("SELECT h3_r8, city, district, state FROM atms")
        location_by_cell = {}
        for r in cur.fetchall():
            location_by_cell.setdefault(r["h3_r8"], (r["city"], r["district"], r["state"]))

    candidates = _generate_candidate_cells(
        complaint["victim_h3_r8"], complaint["city"], complaint["district"], complaint["state"],
        withdrawal_counts, atm_counts, top_cells_by_state, location_by_cell,
    )

    payload = {
        "requestId": "req_manual_test",
        "complaint": {
            "complaintId": complaint["complaint_id"],
            "fraudType": complaint["fraud_type"],
            "amountPaise": complaint["amount_paise"],
            "timestamp": complaint["complaint_timestamp"].isoformat(),
            "victimLat": complaint["victim_lat"],
            "victimLon": complaint["victim_lon"],
            "victimH3R8": complaint["victim_h3_r8"],
        },
        "transactions": [
            {
                "amountPaise": t["amount_paise"], "timestamp": t["timestamp"].isoformat(),
                "channel": t["channel"], "hopIndex": t["hop_index"], "riskIndicator": t["risk_indicator"],
            }
            for t in txns
        ],
        "accounts": [
            {
                "accountId": a["account_id"], "accountType": a["account_type"],
                "openedAt": a["opened_at"].isoformat(), "riskScore": a["risk_score"],
                "priorSuspiciousFlags": 0, "priorWithdrawalCount": 0,
            }
            for a in accounts
        ],
        "candidateCells": [
            {
                "h3Index": c.h3_index, "lat": c.lat, "lon": c.lon, "atmCount": c.atm_count,
                "atmDensity": c.atm_density, "historicalHotspotScore": c.historical_hotspot_score,
                "withdrawalCount": c.withdrawal_count, "name": c.name, "district": c.district, "state": c.state,
            }
            for c in candidates
        ],
        "topK": 5,
    }

    with TestClient(app) as client:
        health = client.get("/health")
        print("health:", health.status_code, health.json())

        res = client.post("/predict", json=payload)
        print("predict status:", res.status_code)
        if res.status_code != 200:
            print(res.text)
            return
        body = res.json()
        print("riskScore:", body["riskScore"], "riskLevel:", body["riskLevel"], "confidence:", body["confidence"])
        print("predictedLocation:", body["predictedLocation"])
        print("expectedWindow:", body["expectedWindow"])
        print("true h3 was:", complaint["true_h3"], "-> matched top?", complaint["true_h3"] == body["predictedLocation"]["h3Index"])
        print("factors:", body["factors"])
        print("explanationAvailable:", body["explanationAvailable"], "clusteringFallback:", body["clusteringFallback"])
        print("pipelineStages:", body["pipelineStages"])
        print("rankedHotspots count:", len(body["rankedHotspots"]))


if __name__ == "__main__":
    main()
