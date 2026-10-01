// Local mirror of hotspotService's REST shapes (architecture/api-design.md
// API-030/031) — not shared with the ML service, so declared here rather
// than codegen'd (same rationale as components/graph/types.ts).
import type { RiskLevel } from "@cyberpulse/shared/enums";

// Map paint colours per risk level (pins, cell fills). Shared by the risk map
// and the prediction panel's map so the two never disagree.
export const RISK_COLORS: Record<RiskLevel, string> = { HIGH: "#C0392B", MEDIUM: "#C97A0E", LOW: "#1F7A47" };

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
