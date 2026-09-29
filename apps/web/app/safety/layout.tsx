import type { Metadata } from "next";

// FEAT-17 Scam Shield. The shell lives in each page (SafetyShell) because the
// language comes from searchParams, which a layout cannot read.
export const metadata: Metadata = {
  title: "Scam Shield · CyberPulse AI",
  description:
    "Check a call, link or UPI ID before you pay, and what to do in the first hour after a fraud. Prototype with synthetic demonstration data.",
};

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
