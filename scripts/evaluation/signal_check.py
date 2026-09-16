#!/usr/bin/env python3
"""Verifies the eight latent patterns planted by the generator (FR-01.5,
FR-01.9) are statistically detectable. Exits non-zero — naming the failed
pattern — if any is not, which blocks `train:model` (RULE-ai.md, AC-P2-05).
Non-bypassable: no flag skips this (CLAUDE.md §Commands).
"""

import argparse
import csv
import math
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "generate-data"))
from regions import REGIONS  # noqa: E402

ALPHA = 0.01
EARTH_RADIUS_KM = 6371.0


def read_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def nearest_zone(lat: float, lon: float) -> tuple[str, str]:
    best = min(
        ((region.name, zone.name, haversine_km(lat, lon, zone.lat, zone.lon)) for region in REGIONS for zone in region.zones),
        key=lambda t: t[2],
    )
    return best[0], best[1]


def _first_hop_timestamps(transactions: list[dict]) -> list[str]:
    # The planted hour/weekday live on the fraud chain's first hop — the
    # transaction that actually moves the money. complaintTimestamp carries a
    # separate, unrelated reporting-delay offset (2-72h) on top of it.
    return [t["timestamp"] for t in transactions if t["complaintId"] and t["hopIndex"] == "0"]


def check_time_of_day(transactions: list[dict]) -> tuple[bool, str]:
    hours = [int(ts[11:13]) for ts in _first_hop_timestamps(transactions)]
    counts = np.bincount(hours, minlength=24)
    chi2, p = stats.chisquare(counts)
    return p < ALPHA, f"chi2={chi2:.1f} p={p:.2e} (uniform-24h null)"


def check_day_of_week(transactions: list[dict]) -> tuple[bool, str]:
    from datetime import datetime

    weekdays = [datetime.fromisoformat(ts).weekday() for ts in _first_hop_timestamps(transactions)]
    counts = np.bincount(weekdays, minlength=7)
    chi2, p = stats.chisquare(counts)
    return p < ALPHA, f"chi2={chi2:.1f} p={p:.2e} (uniform-7day null)"


def check_withdrawal_density(withdrawals: list[dict], atm_by_id: dict[str, dict]) -> tuple[bool, str]:
    zone_counts: dict[str, int] = defaultdict(int)
    for wd in withdrawals:
        atm = atm_by_id[wd["atmId"]]
        _, zone = nearest_zone(float(atm["latitude"]), float(atm["longitude"]))
        zone_counts[zone] += 1
    counts = np.array(list(zone_counts.values()))
    chi2, p = stats.chisquare(counts)
    return p < ALPHA, f"chi2={chi2:.1f} p={p:.2e} across {len(counts)} zones"


def check_transaction_velocity(transactions: list[dict]) -> tuple[bool, str]:
    from datetime import datetime

    by_complaint: dict[str, list[dict]] = defaultdict(list)
    by_background_account: dict[str, list[datetime]] = defaultdict(list)
    for t in transactions:
        if t["complaintId"]:
            by_complaint[t["complaintId"]].append(t)
        else:
            by_background_account[t["fromAccountId"]].append(datetime.fromisoformat(t["timestamp"]))

    hop_delays_minutes: list[float] = []
    for rows in by_complaint.values():
        rows.sort(key=lambda r: int(r["hopIndex"]))
        for a, b in zip(rows, rows[1:]):
            delta = (datetime.fromisoformat(b["timestamp"]) - datetime.fromisoformat(a["timestamp"])).total_seconds() / 60
            hop_delays_minutes.append(delta)

    # Background pace: gaps between an account's own successive outgoing
    # transactions — the fair comparison to "gap between successive hops of
    # the same chain," not gaps in one merged global event stream (which are
    # tiny purely from event density, regardless of any real pattern).
    background_gaps: list[float] = []
    for timestamps in by_background_account.values():
        timestamps.sort()
        for a, b in zip(timestamps, timestamps[1:]):
            background_gaps.append((b - a).total_seconds() / 60)

    stat, p = stats.mannwhitneyu(hop_delays_minutes, background_gaps, alternative="less")
    detected = p < ALPHA and float(np.mean(hop_delays_minutes)) < float(np.mean(background_gaps))
    return detected, f"mean_hop_delay={np.mean(hop_delays_minutes):.1f}min mean_background_gap={np.mean(background_gaps):.1f}min p={p:.2e}"


def check_linked_account(transactions: list[dict], accounts_by_id: dict[str, dict]) -> tuple[bool, str]:
    appearances: dict[str, int] = defaultdict(int)
    for t in transactions:
        if not t["complaintId"]:
            continue
        to_acct = accounts_by_id.get(t["toAccountId"])
        if to_acct and to_acct["accountType"] in ("MULE", "SUSPICIOUS"):
            appearances[t["toAccountId"]] += 1

    counts = sorted(appearances.values(), reverse=True)
    if not counts:
        return False, "no mule appearances found"
    total = sum(counts)
    top_decile_n = max(1, len(counts) // 10)
    top_decile_share = sum(counts[:top_decile_n]) / total
    return top_decile_share > 0.30, f"top-decile share of mule reuse = {top_decile_share:.2f} (n_mules={len(counts)})"


def check_distance(complaints: list[dict], withdrawals: list[dict], atm_by_id: dict[str, dict]) -> tuple[bool, str]:
    complaint_by_id = {c["complaintId"]: c for c in complaints}
    within_100km = 0
    total = 0
    for wd in withdrawals:
        if not wd["complaintId"]:
            continue
        complaint = complaint_by_id[wd["complaintId"]]
        atm = atm_by_id[wd["atmId"]]
        d = haversine_km(float(complaint["victimLat"]), float(complaint["victimLon"]), float(atm["latitude"]), float(atm["longitude"]))
        within_100km += d <= 100
        total += 1
    fraction = within_100km / total
    return fraction > 0.5, f"fraction of labelled withdrawals within 100km of victim = {fraction:.2f} (chance baseline ~1/7)"


def check_historical_hotspot(withdrawals: list[dict], atm_by_id: dict[str, dict]) -> tuple[bool, str]:
    by_zone: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for wd in withdrawals:
        atm = atm_by_id[wd["atmId"]]
        _, zone = nearest_zone(float(atm["latitude"]), float(atm["longitude"]))
        by_zone[zone][wd["atmId"]] += 1

    max_shares = []
    for atm_counts in by_zone.values():
        total = sum(atm_counts.values())
        if total == 0:
            continue
        max_shares.append(max(atm_counts.values()) / total)
    mean_max_share = float(np.mean(max_shares))
    return mean_max_share > 0.14, f"mean top-ATM share per zone = {mean_max_share:.2f} (near-uniform baseline is ~0.06-0.11)"


def check_amount_behaviour(complaints: list[dict]) -> tuple[bool, str]:
    by_type: dict[str, list[float]] = defaultdict(list)
    for c in complaints:
        by_type[c["fraudType"]].append(float(c["amountPaise"]))
    groups = list(by_type.values())
    stat, p = stats.kruskal(*groups)
    return p < ALPHA, f"kruskal H={stat:.1f} p={p:.2e} across {len(groups)} fraud types"


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the eight planted patterns are statistically detectable")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "generated")
    args = parser.parse_args()

    complaints = read_csv(args.data_dir / "complaints.csv")
    accounts = read_csv(args.data_dir / "accounts.csv")
    atms = read_csv(args.data_dir / "atms.csv")
    transactions = read_csv(args.data_dir / "transactions.csv")
    withdrawals = read_csv(args.data_dir / "withdrawals.csv")

    atm_by_id = {a["atmId"]: a for a in atms}
    accounts_by_id = {a["accountId"]: a for a in accounts}

    checks = {
        "time_of_day": lambda: check_time_of_day(transactions),
        "day_of_week": lambda: check_day_of_week(transactions),
        "withdrawal_density": lambda: check_withdrawal_density(withdrawals, atm_by_id),
        "transaction_velocity": lambda: check_transaction_velocity(transactions),
        "linked_account": lambda: check_linked_account(transactions, accounts_by_id),
        "distance": lambda: check_distance(complaints, withdrawals, atm_by_id),
        "historical_hotspot": lambda: check_historical_hotspot(withdrawals, atm_by_id),
        "amount_behaviour": lambda: check_amount_behaviour(complaints),
    }

    failed: list[str] = []
    for name, check in checks.items():
        detected, detail = check()
        status = "PASS" if detected else "FAIL"
        print(f"[{status}] {name}: {detail}")
        if not detected:
            failed.append(name)

    if failed:
        print(f"\nsignal_check FAILED: undetectable pattern(s): {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)

    print("\nsignal_check PASSED: all eight patterns statistically detectable")


if __name__ == "__main__":
    main()
