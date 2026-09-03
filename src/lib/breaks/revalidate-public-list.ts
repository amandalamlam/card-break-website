import { revalidateTag } from "next/cache";
import { after } from "next/server";

export const PUBLIC_BREAKS_LIST_CACHE_TAG = "public-breaks-list";

/** Bust cached break listing slot counts after inventory changes. */
export function revalidatePublicBreaksList(): void {
  after(() => {
    revalidateTag(PUBLIC_BREAKS_LIST_CACHE_TAG);
  });
}
