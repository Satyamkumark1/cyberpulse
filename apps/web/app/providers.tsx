"use client"; // client-only library: TanStack Query's QueryClient holds in-memory cache state

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalRequestIndicator } from "@/components/common/GlobalRequestIndicator";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <GlobalRequestIndicator />
    </QueryClientProvider>
  );
}
