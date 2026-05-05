import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createPirateQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60_000,
      },
    },
  });
}

export function PirateQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createPirateQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
