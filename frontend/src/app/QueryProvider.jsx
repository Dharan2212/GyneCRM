/**
 * GyneCRM — React Query Provider
 * Phase 7.2 — Authentication Infrastructure
 *
 * Configures TanStack Query (v5) with project-wide defaults.
 * Wraps children with QueryClientProvider.
 *
 * DEVTOOLS:
 *   ReactQueryDevtools is included only when VITE_ENABLE_QUERY_DEVTOOLS=true.
 *   It is never included in production builds (Vite tree-shakes it out).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// ─────────────────────────────────────────────────────────────────────────────
// Query Client
//
// Created OUTSIDE the component so it is a stable singleton.
// Recreating it on every render would wipe the entire cache.
// ─────────────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ── Caching ────────────────────────────────────────────────────────
      // Data is considered fresh for 2 minutes. No background refetch
      // within this window unless explicitly invalidated.
      staleTime: 2 * 60 * 1000,           // 2 minutes

      // Garbage-collect unused queries after 5 minutes.
      gcTime: 5 * 60 * 1000,              // 5 minutes (formerly cacheTime)

      // ── Retry ─────────────────────────────────────────────────────────
      // Retry once on failure. Hospital staff can retry manually if needed.
      // 401/403 should NOT be retried — handled by the auth interceptor.
      retry: (failureCount, error) => {
        // Never retry on auth or permission errors
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 1;
      },

      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),

      // ── Refetch behaviour ──────────────────────────────────────────────
      // Do not refetch when the browser tab regains focus.
      // Hospital staff frequently switch tabs — this avoids network noise.
      refetchOnWindowFocus: false,

      // Do not refetch on reconnect by default.
      // Individual queries can override this if real-time accuracy matters.
      refetchOnReconnect: false,

      // ── Error handling ─────────────────────────────────────────────────
      // Throw errors so React error boundaries or query error states
      // can catch and display them.
      throwOnError: false,
    },

    mutations: {
      // No global retry on mutations — side effects must not duplicate.
      retry: 0,

      // Surface mutation errors to the calling component via useMutation.onError
      throwOnError: false,
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ children: React.ReactNode }} props
 */
export function QueryProvider({ children }) {
  const enableDevtools =
    import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' &&
    import.meta.env.MODE !== 'production';

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {enableDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}

// Export the singleton client so it can be used for programmatic
// cache invalidation outside of React components (e.g. after logout).
export { queryClient };
