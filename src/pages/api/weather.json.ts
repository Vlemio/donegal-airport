// Live TAF endpoint for EIDL (Donegal) — read-only proxy.
//
// aviationweather.gov (NOAA/FAA) publishes global METAR/TAF for free with
// no API key, but sends no Access-Control-Allow-Origin header, so the
// browser can't fetch it cross-origin directly. This route re-serves it
// same-origin, same pattern as flights-today.json.ts.
//
// TAF only, not METAR: EIDL doesn't have an automated station reporting
// METAR outside ATC/AFIS hours, so aviationweather.gov usually answers the
// METAR query with 204 No Content. TAF is forecast (issued a few times a
// day regardless), so it's reliably available.
import type { APIRoute } from "astro";

export const prerender = false;

const ICAO = "EIDL";
const UPSTREAM = "https://aviationweather.gov/api/data";

export const GET: APIRoute = async () => {
  try {
    const tafRes = await fetch(`${UPSTREAM}/taf?ids=${ICAO}&format=json`);
    // 204 No Content has an empty body — .json() on it throws, so check
    // for actual content before parsing rather than trusting res.ok
    // (204 is still in the 200-299 "ok" range).
    const tafArr = tafRes.status === 200 ? await tafRes.json() : [];
    const taf = Array.isArray(tafArr) && tafArr.length ? tafArr[0] : null;

    return new Response(JSON.stringify({ taf, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // TAF is issued a few times a day — a short CDN cache is plenty
        // and keeps every visitor from hitting the upstream API individually.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch {
    return new Response(JSON.stringify({ taf: null, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
};
