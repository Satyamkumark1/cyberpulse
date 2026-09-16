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
  predict: { limit: 20, windowMs: 60_000 },
  alerts: { limit: 10, windowMs: 60_000 },
  mutations: { limit: 30, windowMs: 60_000 },
  reads: { limit: 120, windowMs: 60_000 },
  health: { limit: 600, windowMs: 60_000 },
  network: { limit: 60, windowMs: 60_000 },
} as const;

export const GENERATOR_SEED = 26184;

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
