// Live flight-board store — reads the Donegal FIDS's own public API directly.
//
// Used to go through a secret GitHub Gist: the FIDS PATCHed the gist, this
// module read it back. That existed because the FIDS used to run somewhere
// with no inbound connections (a laptop, an airport PC). Now that the FIDS
// is itself deployed on Vercel with a real public URL, that relay is a
// pure liability — an extra network hop through GitHub's own API, synced
// only every ~2 min by the FIDS's cron tick, with GitHub's own eventual
// consistency on top. Reading /api/flights directly means this board is
// never more than one HTTP round-trip from the exact same data the FIDS's
// own admin panel shows, with no intermediate copy that can fall out of
// sync. FIDS_API_URL can override the default if the deployment ever moves.
const FIDS_API_URL = import.meta.env.FIDS_API_URL || "https://donegal-fids.vercel.app";
const FIDS_FLIGHTS_ENDPOINT = `${FIDS_API_URL}/api/flights`;

// Raw shape of a flight as the FIDS stores it — a superset of what this site
// displays (also carries internal fields like `source`, `locks`, `live`,
// `schedDate`, `suppressed`). /api/flights already filters out suppressed
// flights server-side, so nothing here needs to re-filter.
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
  // Heartbeat of the FIDS's last completed sync tick (~every 1-2 min),
  // distinct from `updated` — which only moves when a flight's own data
  // actually changes. A quiet flight list can leave `updated` looking
  // frozen for a long stretch even though the sync is running fine;
  // `lastTick` is what the board's "Updated" label should show.
  lastTick: string | null;
  flights: SyncedFlight[];
}

export const FALLBACK_FLIGHTS: FlightsPayload = {
  updated: "2026-06-19T06:00:00Z",
  lastTick: null,
  flights: [
    { id: "ARR-EI3401", type: "arrival", time: "08:55", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3401", codeshare: [], status: "Landed" },
    { id: "DEP-EI3402", type: "departure", time: "10:25", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3402", codeshare: [], status: "Departed" },
    { id: "ARR-EI3403", type: "arrival", time: "16:55", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3403", codeshare: [], status: "Scheduled" },
    { id: "DEP-EI3408", type: "departure", time: "18:40", estTime: null, estLate: false, estVeryLate: false, airline: "Aer Lingus Regional", airlineCode: "EI", city: "Dublin", flightNo: "EI3408", codeshare: [], status: "Scheduled" },
  ],
};

export function isLiveStoreConfigured(): boolean {
  return true;
}

export async function readFlights(): Promise<{ payload: FlightsPayload; live: boolean }> {
  try {
    const res = await fetch(FIDS_FLIGHTS_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`FIDS fetch ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body.flights)) throw new Error("malformed payload");
    const payload: FlightsPayload = { updated: body.lastUpdated, lastTick: body.lastTick || null, flights: body.flights };
    return { payload, live: true };
  } catch {
    // FIDS is unreachable — keep the board showing something rather than
    // an empty page.
    return { payload: FALLBACK_FLIGHTS, live: false };
  }
}
