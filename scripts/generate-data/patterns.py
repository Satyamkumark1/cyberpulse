"""The eight latent patterns planted by the generator (FR-01.5) and the
per-fraud-type profiles that drive them. `signal_check.py` verifies each is
statistically detectable; `--disable-pattern` (generator.py) flattens exactly
one to a neutral/uniform baseline so TC-DATA-009 can prove the gate blocks.
"""

from dataclasses import dataclass

PATTERN_NAMES = (
    "time_of_day",
    "day_of_week",
    "withdrawal_density",
    "transaction_velocity",
    "linked_account",
    "distance",
    "historical_hotspot",
    "amount_behaviour",
)


@dataclass(frozen=True)
class FraudProfile:
    mean_log_amount: float  # ln(paise)
    sigma_log_amount: float
    hour_weights: tuple[float, ...]  # 24 values, sum to 1


def _normalize(values: tuple[float, ...]) -> tuple[float, ...]:
    total = sum(values)
    return tuple(v / total for v in values)


# Amounts are ln(paise): UPI/QR fraud is small-ticket, investment scams are
# large. Hour weights peak where each fraud type's mechanism actually occurs —
# e.g. card skimming cash-outs cluster late night, phishing during work hours.
# Each type's peak window is deliberately narrow and non-overlapping with most
# others, so the aggregate (mixed across all six types) stays multi-modal and
# clearly non-uniform rather than averaging back out — a day-of-week skew that
# varied by type risked exactly that cancellation, so day-of-week below is one
# shared, consistently-directional pattern instead (GLOBAL_DAY_WEIGHTS).
FRAUD_PROFILES: dict[str, FraudProfile] = {
    "UPI_FRAUD": FraudProfile(
        mean_log_amount=10.5,  # ~e^10.5 paise ~ Rs 363
        sigma_log_amount=0.9,
        hour_weights=_normalize(tuple(6 if 19 <= h <= 21 else 1 for h in range(24))),
    ),
    "INVESTMENT_SCAM": FraudProfile(
        mean_log_amount=13.5,  # ~e^13.5 paise ~ Rs 7,300
        sigma_log_amount=1.1,
        hour_weights=_normalize(tuple(6 if 11 <= h <= 15 else 1 for h in range(24))),
    ),
    "PHISHING": FraudProfile(
        mean_log_amount=11.2,
        sigma_log_amount=1.0,
        hour_weights=_normalize(tuple(6 if 9 <= h <= 11 else 1 for h in range(24))),
    ),
    "JOB_SCAM": FraudProfile(
        mean_log_amount=9.8,
        sigma_log_amount=0.7,
        hour_weights=_normalize(tuple(6 if 12 <= h <= 14 else 1 for h in range(24))),
    ),
    "QR_FRAUD": FraudProfile(
        mean_log_amount=10.0,
        sigma_log_amount=0.8,
        hour_weights=_normalize(tuple(6 if 17 <= h <= 19 else 1 for h in range(24))),
    ),
    "CARD_FRAUD": FraudProfile(
        mean_log_amount=11.8,
        sigma_log_amount=1.0,
        hour_weights=_normalize(tuple(6 if h <= 2 or h >= 23 else 1 for h in range(24))),
    ),
}

UNIFORM_HOURS: tuple[float, ...] = tuple(1 / 24 for _ in range(24))
UNIFORM_DAYS: tuple[float, ...] = tuple(1 / 7 for _ in range(7))

# Shared across every fraud type: overall fraud activity leans weekday
# (Mon=0 .. Sun=6), tapering off through the weekend. One direction for all
# types is what keeps the marginal distribution non-uniform regardless of the
# fraud-type mix.
GLOBAL_DAY_WEIGHTS: tuple[float, ...] = _normalize((2, 2, 2, 1.5, 1.5, 0.6, 0.6))

# amount_behaviour disabled: every fraud type draws from the same pooled
# distribution instead of its own — removes amount as a distinguishing signal.
AVERAGE_MEAN_LOG_AMOUNT = sum(p.mean_log_amount for p in FRAUD_PROFILES.values()) / len(FRAUD_PROFILES)
AVERAGE_SIGMA_LOG_AMOUNT = sum(p.sigma_log_amount for p in FRAUD_PROFILES.values()) / len(FRAUD_PROFILES)

# transaction_velocity: mean minutes between hops in a fraud layering chain.
# Disabled uses a mean comfortably slower than typical background account
# cadence (empirically ~15 days in this corpus, since most accounts appear as
# a sender only a handful of times across the whole window) — chosen so the
# gate is "not detectably faster than background," not an exact scale match,
# and hops still always move forward in time.
FRAUD_HOP_DELAY_MEAN_MINUTES = 6.0
DISABLED_HOP_DELAY_MEAN_MINUTES = 60 * 24 * 30  # 30 days

# distance: withdrawal ATM is drawn from the victim's own region's zones;
# disabled draws from all seven regions uniformly.
SAME_REGION_WEIGHT = 0.98

# historical_hotspot: one ATM per zone gets a selection multiplier on top of
# the zone-level (withdrawal_density) weight. 150x against ~18 ATMs/zone
# (520 ATMs / 7 regions / 4 zones) gives the hot ATM an ~89% in-zone share;
# combined with the 90/5/3/2 zone split (regions.py) this is what makes
# FEAT-07's top-3/top-5 ranking gates achievable — see decision-log.md.
HOT_ATM_MULTIPLIER = 150.0

# linked_account: a small pool of mule accounts is reused across many
# complaints' chains rather than minting fresh ones each time.
MULE_POOL_FRACTION = 0.06  # of all MULE/SUSPICIOUS accounts
MULE_POOL_REUSE_WEIGHT = 0.90  # probability a chain draws from the pool
