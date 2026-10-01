// Local mirror of hotspotService's REST shapes (architecture/api-design.md
// API-030/031) — not shared with the ML service, so declared here rather
// than codegen'd (same rationale as components/graph/types.ts).
import type { RiskLevel } from "@cyberpulse/shared/enums";

export interface HotspotListItem {
  h3Index: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  riskScore: number;
  riskLevel: RiskLevel;
  likelyAtmCount: number;
  expectedStart: string | null;
  expectedEnd: string | null;
}

export interface HotspotDetail extends HotspotListItem {
  nearbyAtms: { atmId: string; bankName: string; distance: number }[];
  topFactors: { name: string; contribution: number; direction: "INCREASES" | "REDUCES" }[];
  relatedComplaints: { complaintId: string; fraudType: string; amountPaise: number }[];
  predictionRef: string | null;
  estimatedExposurePaise: number | null;
}

export interface AtmListItem {
  atmId: string;
  bankName: string;
  latitude: number;
  longitude: number;
  city: string;
  status: string;
}
