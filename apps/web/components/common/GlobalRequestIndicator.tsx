"use client"; // interaction: reads TanStack Query's live in-flight counts

import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

/** Small spinner, top-right, while any query or mutation is in flight.
 *  Deliberately numberless — it says "working", never how far along. */
export function GlobalRequestIndicator() {
  // Mutations that render their own in-place progress (meta.inlineProgress) are skipped.
  const mutating = useIsMutating({ predicate: (m) => m.options.meta?.inlineProgress !== true });
  const active = useIsFetching() + mutating > 0;
  const [visible, setVisible] = useState(false);

  // 150 ms grace so sub-perceptual requests don't flicker the spinner.
  useEffect(() => {
    if (!active) return setVisible(false);
    const id = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(id);
  }, [active]);

  if (!visible) return null;
  return (
    <div role="status" className="pointer-events-none fixed right-3 top-3 z-[60]">
      <div
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sih-blue-600 motion-reduce:animate-none"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
