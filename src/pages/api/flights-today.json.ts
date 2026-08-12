// Public flight-board endpoint — read-only.
//
// Reads the Donegal FIDS's own public /api/flights directly (see
// ../../lib/flightsStore.ts) and re-serves it same-origin, so the board's
// client-side JS never needs to know the FIDS's URL exists at all.
import type { APIRoute } from "astro";
import { readFlights } from "../../lib/flightsStore";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { payload, live } = await readFlights();
  return new Response(JSON.stringify({ ...payload, live }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // Let Vercel's CDN absorb repeated hits instead of every request
      // hitting GitHub — a client-side flood here would otherwise burn
      // through the same token's rate limit the FIDS needs for writes.
      "cache-control": "public, s-maxage=10, stale-while-revalidate=30",
    },
  });
};
