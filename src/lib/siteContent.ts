// Shared Keystatic reader for the site-wide singletons (tower hours,
// aerodrome data, fees, terminal/café hours) — reads whatever's currently
// committed to src/content/site/*.yaml, whether that's the seed data below
// or a later edit saved through /keystatic.
import { createReader } from '@keystatic/core/reader';
import { fileURLToPath } from 'node:url';
import config from '../../keystatic.config';

// Mirrors src/pages/api/keystatic/[...params].ts — process.cwd() can point
// to the wrong directory depending on how the dev server was launched.
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export const reader = createReader(projectRoot, config);

type Bilingual = { en: string; ga: string };

function bi(v: Bilingual | null | undefined, fallback: Bilingual): Bilingual {
  return v && v.en && v.ga ? v : fallback;
}

export async function readTowerHours() {
  const data = await reader.singletons.towerHours.read();
  return {
    winter: data?.winter || '07:40-08:30, 09:00-13:00, 13:30-17:00, 18:00-20:10',
    summer: data?.summer || '06:40-07:30, 08:00-12:00, 12:30-16:00, 17:00-19:10',
  };
}

export async function readAerodromeData() {
  const data = await reader.singletons.aerodromeData.read();
  const id = data?.identifiers;
  const rw = data?.runway;
  const air = data?.airspace;
  const app = data?.approaches;
  const nav = data?.navaids;
  const com = data?.comms;
  const ops = data?.ops;
  return {
    identifiers: {
      iataIcao: bi(id?.iataIcao, { en: 'CFN / EIDL', ga: 'CFN / EIDL' }),
      aerodromeType: bi(id?.aerodromeType, { en: 'Civil · Donegal Airport Co.', ga: 'Sibhialta · Donegal Airport Co.' }),
      arp: bi(id?.arp, { en: '55°02′39″N 008°20′28″W', ga: '55°02′39″N 008°20′28″W' }),
      position: bi(id?.position, { en: '2 NM SW of Bunbeg', ga: '2 NM SI ó Bun Beag' }),
      refTemp: bi(id?.refTemp, { en: '19.1 °C max · 2.2 °C min', ga: '19.1 °C ar a mhéad · 2.2 °C ar a laghad' }),
      magVar: bi(id?.magVar, { en: '2°W (2026) · −11′/yr', ga: '2°I (2026) · −11′/bl' }),
      trafficPermitted: bi(id?.trafficPermitted, { en: 'IFR / VFR', ga: 'IFR / VFR' }),
    },
    runway: {
      bearing: bi(rw?.bearing, { en: '023° / 203° mag · 020.4° / 200.4° true', ga: '023° / 203° maighnéadach · 020.4° / 200.4° fíor' }),
      surface: bi(rw?.surface, { en: 'Grooved asphalt · PCN 21/F/B/X/T', ga: 'Asfalt eangaithe · PCN 21/F/B/X/T' }),
      displacedThr: bi(rw?.displacedThr, { en: '02 → 209 m · 20 → 129 m', ga: '02 → 209 m · 20 → 129 m' }),
      stripResa: bi(rw?.stripResa, { en: '1562 × 150 m / 120 × 60 m', ga: '1562 × 150 m / 120 × 60 m' }),
      papi: bi(rw?.papi, { en: '3.3° both (left) · MEHT 43 ft', ga: '3.3° an dá cheann (ar chlé) · MEHT 43 ft' }),
      approachLgt: bi(rw?.approachLgt, { en: '02: LIH 420 m\n20: LIH 455 m · LED', ga: '02: LIH 420 m\n20: LIH 455 m · LED' }),
    },
    airspace: {
      designation: bi(air?.designation, { en: 'Donegal CTR · within Shannon FIR', ga: "CTR Dhún na nGall · laistigh d'FIR na Sionainne" }),
      lateralLimits: bi(air?.lateralLimits, { en: 'Circle radius 10 NM about ARP', ga: 'Ciorcal ga 10 NM timpeall an ARP' }),
      verticalLimits: bi(air?.verticalLimits, { en: 'SFC – 5000 ft AMSL', ga: 'SFC – 5000 ft AMSL' }),
      airspaceClass: bi(air?.airspaceClass, { en: 'C (G outside ATC hours)', ga: "C (G lasmuigh d'uaireanta ATC)" }),
      transitionAltitude: bi(air?.transitionAltitude, { en: '5000 ft', ga: '5000 ft' }),
      flightPlan: bi(air?.flightPlan, { en: 'Mandatory during ATS hours', ga: 'Éigeantach le linn uaireanta ATS' }),
    },
    approaches: {
      rwy02: bi(app?.rwy02, { en: 'RNP (RNAV) · NDB/DME', ga: 'RNP (RNAV) · NDB/DME' }),
      rwy20: bi(app?.rwy20, { en: 'RNP (RNAV) · LOC · NDB/DME', ga: 'RNP (RNAV) · LOC · NDB/DME' }),
    },
    navaids: {
      ndb: bi(nav?.ndb, { en: 'CFN · 361 kHz · H24 · DOC 25 NM', ga: 'CFN · 361 kHz · H24 · DOC 25 NM' }),
      dme: bi(nav?.dme, { en: 'IFN · 110.3 MHz (Ch 40X)\nzero at DTHR · DOC 20 NM', ga: 'IFN · 110.3 MHz (Ch 40X)\nnialas ag DTHR · DOC 20 NM' }),
      loc20: bi(nav?.loc20, { en: 'IFN · 110.3 MHz · H24', ga: 'IFN · 110.3 MHz · H24' }),
    },
    comms: {
      tower: bi(com?.tower, { en: 'Donegal Tower · 129.805 MHz', ga: 'Túr Dhún na nGall · 129.805 MHz' }),
      ground: bi(com?.ground, { en: 'Donegal Ground · 129.805 MHz', ga: 'Talamh Dhún na nGall · 129.805 MHz' }),
      afis: bi(com?.afis, { en: 'Donegal Information · 129.805 MHz', ga: 'Faisnéis Dhún na nGall · 129.805 MHz' }),
      atis: bi(com?.atis, { en: 'Donegal ATIS · 129.930 MHz', ga: 'ATIS Dhún na nGall · 129.930 MHz' }),
    },
    ops: {
      rffs: bi(ops?.rffs, { en: 'CAT 5 (scheduled flights) · fire cover during operating hours', ga: 'CAT 5 (eitiltí sceidealta) · clúdach dóiteáin le linn uaireanta oibríochta' }),
      northApron: bi(ops?.northApron, { en: 'Bitumen / macadam · PCR 134/F/C/X/T', ga: 'Biotúman / macadam · PCR 134/F/C/X/T' }),
      southApron: bi(ops?.southApron, { en: 'Concrete · MTOW 5700 kg · GA parking', ga: 'Coincréit · MTOW 5700 kg · páirceáil GA' }),
      taxiwayA: bi(ops?.taxiwayA, { en: 'Asphalt · PCN 23/F/B/X/T · 25 m', ga: 'Asfalt · PCN 23/F/B/X/T · 25 m' }),
      taxiwayB: bi(ops?.taxiwayB, { en: 'Concrete · 12 m', ga: 'Coincréit · 12 m' }),
      fuel: bi(ops?.fuel, { en: 'Jet A1 only · 10000 L bowser', ga: 'Jet A1 amháin · tancaer 10000 L' }),
      security: bi(ops?.security, { en: 'H24', ga: 'H24' }),
      ppr: bi(ops?.ppr, { en: 'Required for all flights', ga: 'Riachtanach do gach eitilt' }),
      customsImm: bi(ops?.customsImm, { en: '24 HR PN non-EU\n12 HR PN EU', ga: '24 UAIR fógra neamh-AE\n12 UAIR fógra AE' }),
    },
    cautions: bi(data?.cautions, {
      en: 'Wind shear & turbulence in the lee of Mt Errigal — caution on approach to RWY 20 in winds 250°–300°.',
      ga: 'Fiarshiabadh gaoithe agus suaiteacht faoi choimirce Shliabh na hEaragaile — bí airdeallach ag druidim le RWY 20 i ngaotha 250°–300°.',
    }),
  };
}

export async function readFees() {
  const data = await reader.singletons.fees.read();
  const g = data || ({} as NonNullable<typeof data>);
  const landing = g.landing, parking = g.parking, handling = g.handling;
  const groundServices = g.groundServices, outOfHours = g.outOfHours, hangarage = g.hangarage;
  return {
    landing: {
      singleEngine: bi(landing?.singleEngine, { en: '€15.00', ga: '€15.00' }),
      twinEngine: bi(landing?.twinEngine, { en: '€28.75', ga: '€28.75' }),
      over4t: bi(landing?.over4t, { en: '€17.50 / t or part', ga: '€17.50 / t nó cuid de' }),
    },
    parking: {
      first2h: bi(parking?.first2h, { en: 'No charge', ga: 'Saor in aisce' }),
      under3t: bi(parking?.under3t, { en: '€15.00', ga: '€15.00' }),
      under10t: bi(parking?.under10t, { en: '€35.75', ga: '€35.75' }),
      under20t: bi(parking?.under20t, { en: '€64.00', ga: '€64.00' }),
      over20t: bi(parking?.over20t, { en: '€80.00', ga: '€80.00' }),
    },
    handling: {
      paxSupplement: bi(handling?.paxSupplement, { en: '€17.50', ga: '€17.50' }),
      handlingFee: bi(handling?.handlingFee, { en: '€9.75', ga: '€9.75' }),
      exempt: bi(handling?.exempt, { en: 'Under 2s · non-commercial', ga: 'Faoi bhun 2 bhliain · neamhthráchtála' }),
    },
    groundServices: {
      gpu: bi(groundServices?.gpu, { en: '€51.50 hook-up + €51.50/h or part after 30 min', ga: '€51.50 nascadh + €51.50/uair nó cuid de tar éis 30 nóim' }),
      hotWater: bi(groundServices?.hotWater, { en: '€35.00', ga: '€35.00' }),
      cleaning: bi(groundServices?.cleaning, { en: '€50.00', ga: '€50.00' }),
      towing: bi(groundServices?.towing, { en: '€50.00 / tow', ga: '€50.00 / tarraingt' }),
      special: bi(groundServices?.special, { en: '+15% (min €30)', ga: '+15% (íosmhéid €30)' }),
    },
    outOfHours: {
      extension: bi(outOfHours?.extension, { en: '€330.00 / aircraft / hour', ga: '€330.00 / aerárthach / uair' }),
    },
    hangarage: {
      privateSingle: bi(hangarage?.privateSingle, { en: '€20.00 / 24 h', ga: '€20.00 / 24 uair' }),
      privateTwin: bi(hangarage?.privateTwin, { en: '€40.00 / 24 h', ga: '€40.00 / 24 uair' }),
      commercial: bi(hangarage?.commercial, { en: '€15.00 / t / 24 h', ga: '€15.00 / t / 24 uair' }),
      pushInOut: bi(hangarage?.pushInOut, { en: '€50.00 / push', ga: '€50.00 / brú' }),
    },
  };
}

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

const DAY_LABEL: Record<'en' | 'ga', Record<WeekDay, string>> = {
  en: { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' },
  // Short forms, matching the DAY_GA convention already used on pilots.astro.
  ga: { monday: 'Luan', tuesday: 'Máirt', wednesday: 'Céad', thursday: 'Déar', friday: 'Aoine', saturday: 'Sath', sunday: 'Domh' },
};

export async function readHours() {
  const data = await reader.singletons.hours.read();
  const cafe = data?.cafeHours;
  const cafeHours: Record<WeekDay, string> = {
    monday: cafe?.monday || '06:30–13:30',
    tuesday: cafe?.tuesday || '06:30–13:30',
    wednesday: cafe?.wednesday || '06:30–16:00',
    thursday: cafe?.thursday || '06:30–13:30',
    friday: cafe?.friday || '06:30–13:30',
    saturday: cafe?.saturday || '06:30–16:00',
    sunday: cafe?.sunday || '06:30–13:30, 17:00–19:00',
  };
  return {
    terminal: data?.terminal || '06:30–20:15',
    cafeHours,
  };
}

// Groups the 7 day → hours values by matching hours (any days sharing the
// exact same hours string land in one group, not just adjacent ones — a
// Mon/Tue/Thu/Fri match with Wed excluded is exactly what a café that
// opens later midweek looks like). A group of 3+ CONSECUTIVE days renders
// as a "Mon–Fri" range; anything else lists the days out. Empty/blank days
// are treated as closed and dropped.
export function groupCafeHours(cafeHours: Record<WeekDay, string>, lang: 'en' | 'ga') {
  const labels = DAY_LABEL[lang];
  const byHours = new Map<string, WeekDay[]>();
  for (const day of WEEK_DAYS) {
    const hours = (cafeHours[day] || '').trim();
    if (!hours) continue;
    if (!byHours.has(hours)) byHours.set(hours, []);
    byHours.get(hours)!.push(day);
  }
  return Array.from(byHours.entries())
    .map(([hours, days]) => ({ hours, days, firstIdx: WEEK_DAYS.indexOf(days[0]) }))
    .sort((a, b) => a.firstIdx - b.firstIdx)
    .map(({ hours, days }) => {
      const idxs = days.map((d) => WEEK_DAYS.indexOf(d));
      const consecutive = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
      const daysLabel =
        consecutive && days.length >= 3
          ? `${labels[days[0]]}–${labels[days[days.length - 1]]}`
          : days.map((d) => labels[d]).join(', ');
      return { days: daysLabel, hours };
    });
}

// Comma-separated "HH:MM-HH:MM" pairs (the format staff type into the Tower
// hours fields) → the [["HHMM","HHMM"], ...] shape the timeline widget on
// pilots.astro already expects.
export function parseHourBlocks(str: string): [string, string][] {
  return str
    .split(',')
    .map((pair) => pair.trim().split(/[-–]/).map((s) => s.replace(':', '').trim()))
    .filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1]);
}
