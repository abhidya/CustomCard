import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/errors";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.retryable) return false;
          return failureCount < 2;
        }
      },
      mutations: {
        // Mutations are idempotent server-side, but auto-retrying writes can
        // surprise users; surface the error and let them retry explicitly.
        retry: false
      }
    }
  });
}
