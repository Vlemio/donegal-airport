// Live METAR/TAF endpoint for EIDL (Donegal) — read-only proxy.
//
// aviationweather.gov (NOAA/FAA) publishes global METAR/TAF for free with
// no API key, but sends no Access-Control-Allow-Origin header, so the
// browser can't fetch it cross-origin directly. This route re-serves it
// same-origin, same pattern as flights-today.json.ts.
import type { APIRoute } from "astro";

export const prerender = false;

const ICAO = "EIDL";
const UPSTREAM = "https://aviationweather.gov/api/data";

export const GET: APIRoute = async () => {
  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch(`${UPSTREAM}/metar?ids=${ICAO}&format=json`),
      fetch(`${UPSTREAM}/taf?ids=${ICAO}&format=json`),
    ]);
    const [metarArr, tafArr] = await Promise.all([
      metarRes.ok ? metarRes.json() : [],
      tafRes.ok ? tafRes.json() : [],
    ]);

    const metar = Array.isArray(metarArr) && metarArr.length ? metarArr[0] : null;
    const taf = Array.isArray(tafArr) && tafArr.length ? tafArr[0] : null;

    return new Response(JSON.stringify({ metar, taf, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // METAR updates ~every 30 min, TAF every few hours — a short CDN
        // cache is plenty and keeps every visitor from hitting the
        // upstream API individually.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    });
  } catch {
    return new Response(JSON.stringify({ metar: null, taf: null, fetchedAt: new Date().toISOString() }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
};
