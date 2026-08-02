import { NextResponse } from "next/server";
import { fetchBreakSlotsWithLazyRelease } from "@/lib/slots/fetch-slots";

export const dynamic = "force-dynamic";

/**
 * GET /api/slots?breakId=<uuid>
 * Lazy-releases expired locks, then returns up-to-date slot rows for polling clients.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const breakId = searchParams.get("breakId");

  if (!breakId) {
    return NextResponse.json({ ok: false, error: "MISSING_BREAK_ID" }, { status: 400 });
  }

  try {
    const { slots, released } = await fetchBreakSlotsWithLazyRelease(breakId);

    return NextResponse.json(
      { ok: true, slots, released },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
