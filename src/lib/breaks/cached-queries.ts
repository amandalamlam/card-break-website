import { unstable_cache } from "next/cache";
import {
  fetchCancelledBreaksPage,
  fetchCompletedBreaksPage,
  fetchPublicBreaks,
  getHistoryBreakCount,
  type PaginatedBreakListResult,
} from "@/lib/breaks/queries";
import { PUBLIC_BREAKS_LIST_CACHE_TAG } from "@/lib/breaks/revalidate-public-list";

export const PUBLIC_LIST_REVALIDATE_SECONDS = 60;

export function getPublicBreaksCached() {
  return unstable_cache(fetchPublicBreaks, ["public-breaks-list"], {
    revalidate: PUBLIC_LIST_REVALIDATE_SECONDS,
    tags: [PUBLIC_BREAKS_LIST_CACHE_TAG],
  })();
}

export function getCompletedBreaksCached(limit: number) {
  return unstable_cache(
    async () => {
      const result = await fetchCompletedBreaksPage(1);
      return result.items.slice(0, limit);
    },
    ["completed-breaks-preview", String(limit)],
    { revalidate: PUBLIC_LIST_REVALIDATE_SECONDS }
  )();
}

export function getCompletedBreaksPaginatedCached(page: number) {
  return unstable_cache(
    () => fetchCompletedBreaksPage(page),
    ["completed-breaks-page", String(page)],
    { revalidate: PUBLIC_LIST_REVALIDATE_SECONDS }
  )();
}

export function getCancelledBreaksPaginatedCached(page: number) {
  return unstable_cache(
    () => fetchCancelledBreaksPage(page),
    ["cancelled-breaks-page", String(page)],
    { revalidate: PUBLIC_LIST_REVALIDATE_SECONDS }
  )();
}

export function getHistoryBreakCountCached(status: "completed" | "cancelled") {
  return unstable_cache(
    () => getHistoryBreakCount(status),
    [`${status}-breaks-count`],
    { revalidate: PUBLIC_LIST_REVALIDATE_SECONDS }
  )();
}

export type { PaginatedBreakListResult };
