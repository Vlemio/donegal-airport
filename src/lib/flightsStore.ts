// Live flight-board store — reads the secret GitHub Gist the Donegal FIDS
// pushes to.
//
// The FIDS server (wherever it physically runs — laptop today, an airport
// PC later) never receives inbound connections. It only ever PATCHes its
// own GitHub Gist directly with its own token; this module just reads that
// gist's content back. No database, no paid Vercel storage — a secret gist
// (unlisted, but readable by anyone who has the ID) is free forever and
// exactly matches the "obscure public URL" pattern already used elsewhere
// on this site.
//
// Reading a gist by ID needs no auth, but anonymous GitHub API calls are
// capped at 60/hour PER IP — and on Vercel that IP pool is shared with
// other traffic, so it can be exhausted fast. FLIGHTS_GIST_TOKEN (the same
// gist-only token the FIDS uses to write) raises that to 5000/hour. A short
// in-memory cache further keeps repeated visitor requests within a warm
// serverless instance from hitting GitHub on every single page load.
const GIST_ID = import.meta.env.FLIGHTS_GIST_ID;
const GIST_TOKEN = import.meta.env.FLIGHTS_GIST_TOKEN;
const GIST_API = GIST_ID ? `https://api.github.com/gists/${GIST_ID}` : null;
const CACHE_MS = 10_000;

export interface SyncedFlight {
  id: string;
  type: "arrival" | "departure";
  time: string;
  estTime: string | null;
  estLate: boolean;
  estVeryLate: boolean;
  airline: string;
  airlineCode: string;
  city: string;
  flightNo: string;
  codeshare: string[];
  status: string;
}

export interface FlightsPayload {
  updated: string;
  flights: SyncedFlight[];
}

export const FALLBACK_FLIGHTS: FlightsPayload = {
  updated: "2026-06-19T06:00:00Z",
  flights: [
    { id: "ARR-EI3401", type: "arrival", time: "08:55", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3401", codeshare: [], status: "Landed" },
    { id: "DEP-EI3402", type: "departure", time: "10:25", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3402", codeshare: [], status: "Departed" },
    { id: "ARR-EI3403", type: "arrival", time: "16:55", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3403", codeshare: [], status: "Scheduled" },
    { id: "DEP-EI3408", type: "departure", time: "18:40", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3408", codeshare: [], status: "Scheduled" },
  ],
};

let cache: { payload: FlightsPayload; at: number } | null = null;

export function isLiveStoreConfigured(): boolean {
  return GIST_API !== null;
}

export async function readFlights(): Promise<{ payload: FlightsPayload; live: boolean }> {
  if (!GIST_API) return { payload: FALLBACK_FLIGHTS, live: false };

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return { payload: cache.payload, live: true };
  }

  try {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "user-agent": "donegal-airport-web",
    };
    if (GIST_TOKEN) headers.authorization = `Bearer ${GIST_TOKEN}`;
    const res = await fetch(GIST_API, { headers });
    if (!res.ok) throw new Error(`gist fetch ${res.status}`);
    const gist = await res.json();
    const content = gist?.files?.["flights.json"]?.content;
    if (!content) throw new Error("flights.json missing from gist");
    const payload = JSON.parse(content) as FlightsPayload;
    if (!Array.isArray(payload.flights)) throw new Error("malformed payload");
    cache = { payload, at: Date.now() };
    return { payload, live: true };
  } catch {
    // FIDS hasn't synced yet, or GitHub is unreachable — keep the board
    // showing something rather than an empty page.
    return { payload: cache?.payload ?? FALLBACK_FLIGHTS, live: false };
  }
}
