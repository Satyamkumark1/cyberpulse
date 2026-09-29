#!/usr/bin/env python3
"""The deterministic synthetic corpus generator (FEAT-16, FR-01.x).

Same seed -> byte-identical output (FR-01.1). Writes CSVs plus manifest.json
to a version-controlled data directory (FR-01.8) — nothing here touches the
network, and no field can hold a real or realistic personal identifier
(FR-01.7): accounts have no name/address/contact column at all.
"""

import argparse
import csv
import math
import random
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import h3

from manifest import write_manifest
from patterns import (
    AVERAGE_MEAN_LOG_AMOUNT,
    AVERAGE_SIGMA_LOG_AMOUNT,
    DISABLED_HOP_DELAY_MEAN_MINUTES,
    FRAUD_HOP_DELAY_MEAN_MINUTES,
    FRAUD_PROFILES,
    GLOBAL_DAY_WEIGHTS,
    HOT_ATM_MULTIPLIER,
    MULE_POOL_FRACTION,
    MULE_POOL_REUSE_WEIGHT,
    PATTERN_NAMES,
    SAME_REGION_WEIGHT,
    UNIFORM_DAYS,
    UNIFORM_HOURS,
)
from regions import REGIONS

# Share the walkthrough identifier with the web app.
_SHARED_CONSTANTS = (Path(__file__).resolve().parents[2] / "packages/shared/constants.ts").read_text()
DEMO_COMPLAINT_IDS = re.findall(r'"(C-\d{5})"', re.search(r'export const DEMO_COMPLAINT_IDS = \[(.*?)\] as const;', _SHARED_CONSTANTS, re.S).group(1))
DEMO_COMPLAINT_ID = DEMO_COMPLAINT_IDS[0]

H3_RES_HOTSPOT = 8
H3_RES_DENSITY = 9

FRAUD_TYPES = tuple(FRAUD_PROFILES.keys())
CHANNELS_BY_FRAUD = {
    "UPI_FRAUD": "UPI",
    "INVESTMENT_SCAM": "NEFT",
    "PHISHING": "IMPS",
    "JOB_SCAM": "UPI",
    "QR_FRAUD": "UPI",
    "CARD_FRAUD": "CARD",
}

VOLUME_FLOORS = {"complaints": 500, "accounts": 10_000, "transactions": 50_000, "withdrawals": 2_000, "atms": 500, "guard_posts": 1_000}
VOLUME_DEFAULTS = {"complaints": 500, "accounts": 12_000, "transactions": 60_000, "withdrawals": 2_400, "atms": 520}


def jittered_point(lat: float, lon: float, rng: random.Random, spread_deg: float = 0.01) -> tuple[float, float]:
    return lat + rng.uniform(-spread_deg, spread_deg), lon + rng.uniform(-spread_deg, spread_deg)


def weighted_choice(rng: random.Random, items: list, weights: list[float]):
    return rng.choices(items, weights=weights, k=1)[0]


@dataclass
class Atm:
    atm_id: str
    bank_name: str
    lat: float
    lon: float
    city: str
    district: str
    state: str
    region_name: str
    zone_name: str
    is_hot: bool

    @property
    def h3_r8(self) -> str:
        return h3.latlng_to_cell(self.lat, self.lon, H3_RES_HOTSPOT)

    @property
    def h3_r9(self) -> str:
        return h3.latlng_to_cell(self.lat, self.lon, H3_RES_DENSITY)


@dataclass
class Account:
    account_id: str
    account_type: str
    bank_name: str
    risk_score: float
    opened_at: datetime
    home_h3_r8: str | None
    last_activity: datetime | None = None


@dataclass
class Complaint:
    complaint_id: str
    fraud_type: str
    amount_paise: int
    complaint_timestamp: datetime
    victim_lat: float
    victim_lon: float
    victim_h3_r8: str
    city: str
    district: str
    state: str
    region_index: int


@dataclass
class Txn:
    transaction_id: str
    complaint_id: str | None
    from_account_id: str
    to_account_id: str
    amount_paise: int
    timestamp: datetime
    channel: str
    lat: float | None
    lon: float | None
    h3_r8: str | None
    risk_indicator: str
    hop_index: int


@dataclass
class Withdrawal:
    withdrawal_id: str
    account_id: str
    atm_id: str
    complaint_id: str | None
    amount_paise: int
    timestamp: datetime
    h3_r8: str


@dataclass
class GuardPost:
    post_id: str
    atm_id: str
    shift_start_hour_ist: int
    shift_end_hour_ist: int


BANKS = ("SBI-Sim", "HDFC-Sim", "ICICI-Sim", "Axis-Sim", "PNB-Sim", "BOI-Sim")


def build_atms(rng: random.Random, count: int, disabled: set[str]) -> list[Atm]:
    atms: list[Atm] = []
    per_region = count // len(REGIONS)
    remainder = count - per_region * len(REGIONS)

    for r_idx, region in enumerate(REGIONS):
        n = per_region + (1 if r_idx < remainder else 0)
        zones = region.zones

        # ATMs are placed roughly evenly across a region's zones regardless of
        # any pattern flag — zone *count* is not the density signal. Which
        # zone gets picked at withdrawal time is (pick_atm, below); keeping
        # placement uniform stops zone count from confounding that test.
        hot_assigned: set[str] = set()
        for i in range(n):
            zone = zones[i % len(zones)]
            lat, lon = jittered_point(zone.lat, zone.lon, rng, spread_deg=0.015)
            is_hot = zone.name not in hot_assigned and "historical_hotspot" not in disabled
            if is_hot:
                hot_assigned.add(zone.name)
            atms.append(
                Atm(
                    atm_id=f"ATM-{len(atms) + 1:03d}",
                    bank_name=rng.choice(BANKS),
                    lat=lat,
                    lon=lon,
                    city=region.city,
                    district=region.district,
                    state=region.state,
                    region_name=region.name,
                    zone_name=zone.name,
                    is_hot=is_hot,
                )
            )
    return atms


DAY_SHIFTS = ((6, 14), (14, 22))
NIGHT_SHIFT = (22, 6)


def build_guard_posts(rng: random.Random, atms: list[Atm]) -> list["GuardPost"]:
    """Staffed duty positions, one set per ATM.

    A post is an operational asset, not a person: it carries an identifier, the
    ATM it covers and a recurring IST shift, and there is deliberately nowhere
    to put a name or a phone number (FR-01.7, `pii_scan.py`, TC-SEC-022). Who
    stands at a post on a given day is the operating bank's record.

    Every ATM gets the two day shifts. Historical-hotspot ATMs also carry a
    night post, which is the only place the planted pattern shows up here —
    it is derived from `is_hot`, never sampled, so the same seed produces the
    same roster.
    """
    posts: list[GuardPost] = []
    for atm in atms:
        shifts = list(DAY_SHIFTS) + ([NIGHT_SHIFT] if atm.is_hot else [])
        for start, end in shifts:
            posts.append(
                GuardPost(
                    post_id=f"GRD-{len(posts) + 1:05d}",
                    atm_id=atm.atm_id,
                    shift_start_hour_ist=start,
                    shift_end_hour_ist=end,
                )
            )
    return posts


def build_accounts(rng: random.Random, count: int, n_victims: int, base_time: datetime) -> list[Account]:
    n_mule = round(count * 0.25)
    n_suspicious = round(count * 0.125)
    n_merchant = round(count * 0.167)
    n_normal = count - n_victims - n_mule - n_suspicious - n_merchant

    accounts: list[Account] = []
    idx = 1

    def make(account_type: str, n: int, risk_range: tuple[float, float]) -> None:
        nonlocal idx
        for _ in range(n):
            opened = base_time - timedelta(days=rng.randint(30, 1800))
            region = rng.choice(REGIONS)
            zone = rng.choice(region.zones)
            accounts.append(
                Account(
                    account_id=f"ACC-{idx:08d}",
                    account_type=account_type,
                    bank_name=rng.choice(BANKS),
                    risk_score=round(rng.uniform(*risk_range), 3),
                    opened_at=opened,
                    home_h3_r8=h3.latlng_to_cell(zone.lat, zone.lon, H3_RES_HOTSPOT),
                )
            )
            idx += 1

    make("VICTIM", n_victims, (0.0, 0.2))
    make("MULE", n_mule, (0.55, 0.95))
    make("SUSPICIOUS", n_suspicious, (0.4, 0.8))
    make("MERCHANT", n_merchant, (0.0, 0.15))
    make("NORMAL", n_normal, (0.0, 0.25))
    return accounts


def sample_lognormal_paise(rng: random.Random, mean_log: float, sigma_log: float) -> int:
    return max(10000, round(math.exp(rng.gauss(mean_log, sigma_log))))


def sample_hour(rng: random.Random, weights: tuple[float, ...]) -> int:
    return weighted_choice(rng, list(range(24)), list(weights))


def sample_weekday_offset(rng: random.Random, weights: tuple[float, ...]) -> int:
    return weighted_choice(rng, list(range(7)), list(weights))


def dated_at(base: datetime, hour: int, weekday: int, week_offset: int) -> datetime:
    monday = base - timedelta(days=base.weekday(), weeks=-week_offset)
    day = monday + timedelta(days=weekday)
    return day.replace(hour=hour, minute=0, second=0, microsecond=0)


def generate(
    seed: int,
    out_dir: Path,
    scale: float,
    disabled_patterns: set[str],
) -> dict[str, int]:
    rng = random.Random(seed)
    base_time = datetime(2026, 6, 1, tzinfo=timezone.utc)

    n_complaints = max(VOLUME_FLOORS["complaints"], round(VOLUME_DEFAULTS["complaints"] * scale))
    n_accounts = max(VOLUME_FLOORS["accounts"], round(VOLUME_DEFAULTS["accounts"] * scale))
    n_atms = max(VOLUME_FLOORS["atms"], round(VOLUME_DEFAULTS["atms"] * scale))
    n_withdrawals_target = max(VOLUME_FLOORS["withdrawals"], round(VOLUME_DEFAULTS["withdrawals"] * scale))

    atms = build_atms(rng, n_atms, disabled_patterns)
    guard_posts = build_guard_posts(rng, atms)
    atms_by_zone = group_atms_by_zone(atms)
    accounts = build_accounts(rng, n_accounts, n_complaints, base_time)

    victims = [a for a in accounts if a.account_type == "VICTIM"]
    mule_pool_candidates = [a for a in accounts if a.account_type in ("MULE", "SUSPICIOUS")]
    pool_size = max(1, round(len(mule_pool_candidates) * MULE_POOL_FRACTION))
    mule_pool = mule_pool_candidates[:pool_size] if "linked_account" not in disabled_patterns else []
    # Pareto weights: a handful of "hub" mule accounts handle most of the
    # reused traffic, most handle little — a flat pool with uniform draws
    # inside it caps concentration regardless of pool size.
    mule_pool_weights = [rng.paretovariate(1.5) for _ in mule_pool]
    mule_general = mule_pool_candidates

    complaints: list[Complaint] = []
    transactions: list[Txn] = []
    withdrawals: list[Withdrawal] = []
    txn_seq = 1
    wd_seq = 1

    def next_mule(rng: random.Random, exclude_account_id: str) -> Account:
        # DB CHECK transactions_no_self_transfer forbids from == to — reject
        # and redraw on the rare collision with the previous hop's account.
        while True:
            if mule_pool and rng.random() < MULE_POOL_REUSE_WEIGHT:
                candidate = rng.choices(mule_pool, weights=mule_pool_weights, k=1)[0]
            else:
                candidate = rng.choice(mule_general)
            if candidate.account_id != exclude_account_id:
                return candidate

    fraud_type_cycle = list(FRAUD_TYPES) * (n_complaints // len(FRAUD_TYPES) + 1)
    rng.shuffle(fraud_type_cycle)

    for i in range(n_complaints):
        fraud_type = fraud_type_cycle[i]
        profile = FRAUD_PROFILES[fraud_type]
        hour_weights = UNIFORM_HOURS if "time_of_day" in disabled_patterns else profile.hour_weights
        day_weights = UNIFORM_DAYS if "day_of_week" in disabled_patterns else GLOBAL_DAY_WEIGHTS

        region_idx = rng.randrange(len(REGIONS))
        region = REGIONS[region_idx]
        zone = rng.choice(region.zones)
        v_lat, v_lon = jittered_point(zone.lat, zone.lon, rng, spread_deg=0.02)

        week_offset = rng.randint(0, 14)
        hour = sample_hour(rng, hour_weights)
        weekday = sample_weekday_offset(rng, day_weights)
        first_txn_time = dated_at(base_time, hour, weekday, week_offset) + timedelta(minutes=rng.randint(0, 59))

        if "amount_behaviour" in disabled_patterns:
            mean_log, sigma_log = AVERAGE_MEAN_LOG_AMOUNT, AVERAGE_SIGMA_LOG_AMOUNT
        else:
            mean_log, sigma_log = profile.mean_log_amount, profile.sigma_log_amount
        amount = sample_lognormal_paise(rng, mean_log + 6, sigma_log)  # +6 -> rupee-ish scale
        victim = victims[i]
        complaint_id = f"C-{i + 1:05d}"
        # Swap IDs so even the minimum corpus contains the demo complaint,
        # without collisions when larger corpora reach its numeric ID.
        if i == 0:
            complaint_id = DEMO_COMPLAINT_ID
        elif complaint_id == DEMO_COMPLAINT_ID:
            complaint_id = "C-00001"

        # Report delay: how long after the first fraud transaction the victim
        # files the complaint. Drawn wide enough (mean 45 min, tail to 4 days)
        # that most complaints are filed while cash-out is still pending —
        # the case FEAT-08's forward-looking withdrawal window predicts — and
        # a realistic minority are filed after the money is already gone,
        # which is the honest "too late" case the temporal fallback path
        # exists for. A fixed 2-72h delay (the prior formula) put the
        # complaint after every withdrawal unconditionally, since a chain's
        # hops and cash-out complete in minutes: the temporal model would
        # never see a real future window to learn, only a single degenerate
        # class. Tight rather than wide (contrast the original 2-72h fixed
        # window): report delay needs to be small relative to the 2-hour
        # bin width, otherwise it swamps the depth -> cash-out-timing signal
        # below with noise larger than a bin itself. See decision-log.md.
        report_delay_hours = min(24.0, max(0.05, rng.uniform(0.1, 1.0)))

        complaints.append(
            Complaint(
                complaint_id=complaint_id,
                fraud_type=fraud_type,
                amount_paise=amount,
                complaint_timestamp=first_txn_time + timedelta(hours=report_delay_hours),
                victim_lat=v_lat,
                victim_lon=v_lon,
                victim_h3_r8=h3.latlng_to_cell(v_lat, v_lon, H3_RES_HOTSPOT),
                city=region.city,
                district=region.district,
                state=region.state,
                region_index=region_idx,
            )
        )

        depth = rng.choice((2, 3, 4))
        chain_accounts = [victim]
        for _ in range(depth):
            chain_accounts.append(next_mule(rng, chain_accounts[-1].account_id))
        t = first_txn_time
        remaining = amount
        velocity_disabled = "transaction_velocity" in disabled_patterns

        for hop in range(depth):
            fee_kept = round(remaining * rng.uniform(0.95, 0.99))
            transactions.append(
                Txn(
                    transaction_id=f"TXN-{txn_seq:010d}",
                    complaint_id=complaint_id,
                    from_account_id=chain_accounts[hop].account_id,
                    to_account_id=chain_accounts[hop + 1].account_id,
                    amount_paise=remaining,
                    timestamp=t,
                    channel=CHANNELS_BY_FRAUD[fraud_type] if hop == 0 else "IMPS",
                    lat=v_lat if hop == 0 else None,
                    lon=v_lon if hop == 0 else None,
                    h3_r8=h3.latlng_to_cell(v_lat, v_lon, H3_RES_HOTSPOT) if hop == 0 else None,
                    risk_indicator="MEDIUM" if hop == 0 else "HIGH",
                    hop_index=hop,
                )
            )
            txn_seq += 1
            remaining = fee_kept
            delay_mean = DISABLED_HOP_DELAY_MEAN_MINUTES if velocity_disabled else FRAUD_HOP_DELAY_MEAN_MINUTES
            t = t + timedelta(minutes=rng.expovariate(1 / delay_mean))

        last_account = chain_accounts[-1]
        atm = pick_atm(rng, atms_by_zone, region_idx, disabled_patterns)
        n_partial = 1 if rng.random() < 0.7 else 2
        per_withdrawal = remaining // n_partial
        # Cash-out delay after the chain completes: most mules cash out
        # quickly, but a realistic minority hold the funds for hours before
        # visiting an ATM (avoiding an immediate, easily-traced withdrawal).
        # Without this second mode every withdrawal completes within
        # minutes of the chain regardless of report timing, which leaves
        # FEAT-08's 12-bin window model nothing to learn — the true cash-out
        # bin would be ~constant. The quick/delayed split is itself tied to
        # `depth` (-> the model's own `linked_depth` feature): a longer,
        # more-layered chain is a more cautious network, which also waits
        # longer before cashing out. Each depth draws from its own tight
        # window (rather than one wide distribution) so that, net of the
        # small report delay above, a chain's depth places its cash-out in
        # a predictable one-or-two-bin neighbourhood — that separation is
        # what makes the 12-bin window genuinely learnable from `linked_depth`
        # rather than being pure per-complaint noise. See decision-log.md.
        wd_delay_minutes = {
            2: rng.uniform(10, 40),  # -> bin 0
            3: rng.uniform(300, 420),  # 5-7h -> bin 2-3
            4: rng.uniform(900, 1080),  # 15-18h -> bin 7-8
        }[depth]
        for w in range(n_partial):
            wd_time = t + timedelta(minutes=wd_delay_minutes + w * rng.uniform(10, 90))
            withdrawals.append(
                Withdrawal(
                    withdrawal_id=f"WD-{wd_seq:08d}",
                    account_id=last_account.account_id,
                    atm_id=atm.atm_id,
                    complaint_id=complaint_id,
                    amount_paise=max(10000, per_withdrawal),
                    timestamp=wd_time,
                    h3_r8=atm.h3_r8,
                )
            )
            wd_seq += 1

    # Background noise: transactions and withdrawals unrelated to any complaint,
    # so hotspot/density statistics reflect ATM usage broadly, not just fraud.
    all_accounts_non_victim = [a for a in accounts if a.account_type != "VICTIM"]
    while len(transactions) < VOLUME_DEFAULTS["transactions"] * scale:
        a, b = rng.sample(all_accounts_non_victim, 2)
        ts = base_time + timedelta(days=rng.randint(0, 100), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        transactions.append(
            Txn(
                transaction_id=f"TXN-{txn_seq:010d}",
                complaint_id=None,
                from_account_id=a.account_id,
                to_account_id=b.account_id,
                amount_paise=sample_lognormal_paise(rng, 10.0, 1.0),
                timestamp=ts,
                channel=rng.choice(("UPI", "IMPS", "NEFT", "WALLET")),
                lat=None,
                lon=None,
                h3_r8=None,
                risk_indicator="NONE",
                hop_index=0,
            )
        )
        txn_seq += 1

    while len(withdrawals) < n_withdrawals_target:
        acct = rng.choice(all_accounts_non_victim)
        region_idx = rng.randrange(len(REGIONS))
        atm = pick_atm(rng, atms_by_zone, region_idx, disabled_patterns)
        ts = base_time + timedelta(days=rng.randint(0, 100), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        withdrawals.append(
            Withdrawal(
                withdrawal_id=f"WD-{wd_seq:08d}",
                account_id=acct.account_id,
                atm_id=atm.atm_id,
                complaint_id=None,
                amount_paise=sample_lognormal_paise(rng, 9.5, 0.8),
                timestamp=ts,
                h3_r8=atm.h3_r8,
            )
        )
        wd_seq += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    write_complaints_csv(out_dir / "complaints.csv", complaints)
    write_accounts_csv(out_dir / "accounts.csv", accounts)
    write_atms_csv(out_dir / "atms.csv", atms)
    write_transactions_csv(out_dir / "transactions.csv", transactions)
    write_withdrawals_csv(out_dir / "withdrawals.csv", withdrawals)
    write_guard_posts_csv(out_dir / "guard_posts.csv", guard_posts)

    return {
        "complaints": len(complaints),
        "accounts": len(accounts),
        "atms": len(atms),
        "transactions": len(transactions),
        "withdrawals": len(withdrawals),
        "guard_posts": len(guard_posts),
    }


def group_atms_by_zone(atms: list[Atm]) -> dict[tuple[str, str], list[Atm]]:
    by_zone: dict[tuple[str, str], list[Atm]] = defaultdict(list)
    for atm in atms:
        by_zone[(atm.region_name, atm.zone_name)].append(atm)
    return by_zone


def pick_atm(
    rng: random.Random,
    atms_by_zone: dict[tuple[str, str], list[Atm]],
    home_region_idx: int,
    disabled: set[str],
) -> Atm:
    # Two independent stages, each gated by its own pattern flag: which zone
    # (withdrawal_density), then which ATM inside that zone (historical_hotspot).
    # Kept separate so disabling one can never leak signal through the other.
    if "distance" not in disabled and rng.random() < SAME_REGION_WEIGHT:
        region = REGIONS[home_region_idx]
    else:
        region = rng.choice(REGIONS)

    zones = region.zones
    zone_weights = [1.0] * len(zones) if "withdrawal_density" in disabled else [z.weight for z in zones]
    zone = weighted_choice(rng, list(zones), zone_weights)

    zone_atms = atms_by_zone[(region.name, zone.name)]
    if "historical_hotspot" in disabled:
        return rng.choice(zone_atms)

    weights = [HOT_ATM_MULTIPLIER if a.is_hot else 1.0 for a in zone_atms]
    return weighted_choice(rng, zone_atms, weights)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def write_complaints_csv(path: Path, rows: list[Complaint]) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["complaintId", "fraudType", "amountPaise", "complaintTimestamp", "victimLat", "victimLon", "victimH3R8", "city", "district", "state"])
        for c in rows:
            w.writerow([c.complaint_id, c.fraud_type, c.amount_paise, iso(c.complaint_timestamp), c.victim_lat, c.victim_lon, c.victim_h3_r8, c.city, c.district, c.state])


def write_accounts_csv(path: Path, rows: list[Account]) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["accountId", "accountType", "bankName", "riskScore", "openedAt", "homeH3R8"])
        for a in rows:
            w.writerow([a.account_id, a.account_type, a.bank_name, a.risk_score, iso(a.opened_at), a.home_h3_r8])


def write_atms_csv(path: Path, rows: list[Atm]) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["atmId", "bankName", "latitude", "longitude", "h3R8", "h3R9", "locality", "city", "district", "state"])
        for a in rows:
            w.writerow([a.atm_id, a.bank_name, a.lat, a.lon, a.h3_r8, a.h3_r9, a.zone_name, a.city, a.district, a.state])


def write_transactions_csv(path: Path, rows: list[Txn]) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["transactionId", "complaintId", "fromAccountId", "toAccountId", "amountPaise", "timestamp", "channel", "latitude", "longitude", "h3R8", "riskIndicator", "hopIndex"])
        for t in rows:
            w.writerow([t.transaction_id, t.complaint_id or "", t.from_account_id, t.to_account_id, t.amount_paise, iso(t.timestamp), t.channel, t.lat if t.lat is not None else "", t.lon if t.lon is not None else "", t.h3_r8 or "", t.risk_indicator, t.hop_index])


def write_guard_posts_csv(path: Path, rows: list["GuardPost"]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["postId", "atmId", "shiftStartHourIst", "shiftEndHourIst"])
        for g in rows:
            w.writerow([g.post_id, g.atm_id, g.shift_start_hour_ist, g.shift_end_hour_ist])


def write_withdrawals_csv(path: Path, rows: list[Withdrawal]) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["withdrawalId", "accountId", "atmId", "complaintId", "amountPaise", "timestamp", "h3R8"])
        for wd in rows:
            w.writerow([wd.withdrawal_id, wd.account_id, wd.atm_id, wd.complaint_id or "", wd.amount_paise, iso(wd.timestamp), wd.h3_r8])


def main() -> None:
    parser = argparse.ArgumentParser(description="CyberPulse AI synthetic data generator")
    parser.add_argument("--seed", type=int, default=26184)
    parser.add_argument("--out-dir", type=Path, default=Path(__file__).resolve().parents[2] / "data" / "generated")
    parser.add_argument("--scale", type=float, default=1.0, help="volume scale factor, floors always enforced")
    parser.add_argument(
        "--disable-pattern",
        choices=PATTERN_NAMES,
        action="append",
        default=[],
        help="flatten one planted pattern to a uniform baseline (signal_check.py negative test)",
    )
    args = parser.parse_args()

    disabled = set(args.disable_pattern)
    row_counts = generate(args.seed, args.out_dir, args.scale, disabled)

    files = ["complaints.csv", "accounts.csv", "atms.csv", "transactions.csv", "withdrawals.csv", "guard_posts.csv"]
    write_manifest(args.out_dir, args.seed, files, row_counts)

    for name, count in row_counts.items():
        floor = VOLUME_FLOORS[name]
        if count < floor:
            raise SystemExit(f"generator produced {count} {name}, below the floor of {floor}")

    print(f"generated: {row_counts}")
    if disabled:
        print(f"disabled patterns: {sorted(disabled)}")


if __name__ == "__main__":
    main()
