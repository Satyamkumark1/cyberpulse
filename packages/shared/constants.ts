// Cross-service constants. One definition; both the web app and the generator/
// evaluation scripts import from here rather than restating a number by hand
// (CLAUDE.md binding instruction 11; TC-DOC-021 checks these stay consistent).

export const MODEL_VERSION = "CyberPulse-Demo-v1";
export const FEATURE_SCHEMA_VERSION = "fs-1";

export const DEFAULT_THRESHOLD_HIGH = 0.7;
export const DEFAULT_THRESHOLD_MEDIUM = 0.4;

export const H3_RESOLUTION_HOTSPOT = 8;
export const H3_RESOLUTION_DENSITY = 9;

export const CANDIDATE_CELL_CAP = 60;
export const PREDICTION_WINDOW_MAX_HOURS = 4;

export const TRAVERSAL_MAX_DEPTH = 6;
export const TRAVERSAL_ROW_LIMIT = 500;
export const TRAVERSAL_DEPTH_DEFAULT = 4;
export const TRAVERSAL_MAX_NODES_DEFAULT = 200;
export const TRAVERSAL_MAX_NODES_CAP = 500;

export const PAGE_SIZE_MAX = 100;
export const DATE_SPAN_MAX_DAYS = 365;

export const INDIA_BOUNDS = {
  latMin: 6.0,
  latMax: 37.5,
  lonMin: 68.0,
  lonMax: 97.5,
} as const;

export const RATE_LIMITS = {
  // 30, not 20: the guided demo's "RUN DEMO SCENARIO" control now fires ten
  // real predict calls per run (DEMO_COMPLAINT_IDS), so one run alone used to
  // consume the whole prior window. 30 leaves headroom for three runs inside
  // one minute (a presenter re-triggering it) — still an explicit, bounded
  // cap, not an unbounded one (.claude/rules/backend.md).
  predict: { limit: 30, windowMs: 60_000 },
  alerts: { limit: 10, windowMs: 60_000 },
  mutations: { limit: 30, windowMs: 60_000 },
  reads: { limit: 120, windowMs: 60_000 },
  health: { limit: 600, windowMs: 60_000 },
  network: { limit: 60, windowMs: 60_000 },
  // FEAT-17: the only public write. Per IP — a rehearsal files a handful of
  // reports a minute; anything faster is not a person reporting a fraud.
  citizenReport: { limit: 5, windowMs: 60_000 },
} as const;

export const GENERATOR_SEED = 26184;

// FEAT-17 Report Now: ₹1 to ₹10 crore, integer paise (ADR-018). Here rather
// than in citizen.ts so the /safety client bundle can use them without Zod.
export const CITIZEN_AMOUNT_MIN_PAISE = 100;
export const CITIZEN_AMOUNT_MAX_PAISE = 10_00_00_000_00;

// FEAT-14. The ten complaints the guided demo's "RUN DEMO SCENARIO" control
// loads and predicts concurrently — fixed so the walkthrough is identical
// every run, never a hard-coded prediction (FR-19.2). Verified against the
// seed-26184 corpus: each has a real, populated transaction chain. The
// generator's volume floor (VOLUME_FLOORS.complaints, >=500) guarantees all
// ten exist in any fresh seed; the generator must guarantee it, and a corpus
// without one is a seeding defect, not a /demo one (packages/db/seed/seed.ts).
export const DEMO_COMPLAINT_IDS = [
  "C-10284", "C-00002", "C-00003", "C-00004", "C-00005",
  "C-00006", "C-00007", "C-00008", "C-00009", "C-00010",
] as const;

export const VOLUME_FLOORS = {
  complaints: 500,
  accounts: 10_000,
  transactions: 50_000,
  withdrawals: 2_000,
  atms: 500,
} as const;

export const VOLUME_DEFAULTS = {
  complaints: 500,
  accounts: 12_000,
  transactions: 60_000,
  withdrawals: 2_400,
  atms: 520,
} as const;
