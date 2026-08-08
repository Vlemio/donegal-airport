import { config, collection, singleton, fields } from '@keystatic/core';

// A single value that must be filled in in BOTH languages before the entry
// can be saved. Used throughout the singletons below for rows whose LABEL
// is fixed in the page code (e.g. "IATA / ICAO", "Single engine") and only
// the value on the right ever changes — keeps staff from accidentally
// restructuring a table, while still requiring both languages stay in sync.
function bilingualValue(label: string, opts: { multiline?: boolean; description?: string } = {}) {
  return fields.object(
    {
      en: fields.text({
        label: 'English',
        multiline: opts.multiline,
        validation: { isRequired: true },
      }),
      ga: fields.text({
        label: 'Gaeilge',
        multiline: opts.multiline,
        validation: { isRequired: true },
      }),
    },
    { label, description: opts.description },
  );
}

export default config({
  storage: process.env.NODE_ENV === 'production'
    ? { kind: 'cloud' }
    : { kind: 'local' },
  cloud: { project: 'news-donegal-airport/donegal-airport' },

  ui: {
    brand: { name: 'Donegal Airport · CFN' },
    // Grouped so the dashboard stays organised as more editable sections
    // get added page by page — each new collection/singleton slots into
    // an existing group here, or starts a new one.
    navigation: {
      Content: ['news'],
      'Pilots & Aerodrome': ['towerHours', 'aerodromeData', 'fees'],
      Terminal: ['hours'],
    },
  },

  collections: {
    news: collection({
      label: 'News',
      slugField: 'title',
      path: 'src/content/news/*',
      // Shown as sortable columns in the News list — click a column header
      // to sort by Date or by Title (name).
      columns: ['title', 'date', 'kind'],
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({
          label: 'Date',
          validation: { isRequired: true },
        }),
        kind: fields.text({
          label: 'Category',
          description: 'e.g. Operations, Sustainability, Community, Awards…',
          validation: { isRequired: true },
        }),
        image: fields.image({
          label: 'Hero image',
          description: 'Upload a photo for the article hero.',
          directory: 'public/photos',
          publicPath: '/photos/',
          validation: { isRequired: false },
        }),
        imagePosition: fields.text({
          label: 'Image position',
          description: 'How the photo is framed (e.g. "30% 70%"). Use the picker at /tools/image-position — paste the photo\'s path, pick "News hero", drag to frame it, then copy the value here. Default: 50% 50%.',
          defaultValue: '50% 50%',
          validation: { isRequired: false },
        }),
        lead: fields.text({
          label: 'Opening line',
          description: 'One strong sentence shown large at the top of the article.',
          validation: { isRequired: true },
        }),
        body: fields.text({
          label: 'Body',
          description: 'Full article text. Separate paragraphs with a blank line.',
          multiline: true,
          validation: { isRequired: true },
        }),
        // Irish translations — required for every new article so the
        // Gaeilge site is never left showing untranslated English news.
        // (Existing articles saved before this was added will prompt for
        // these the next time they're opened and saved.)
        titleGa: fields.text({
          label: 'Title (Gaeilge)',
          description: 'Irish translation of the title above.',
          validation: { isRequired: true },
        }),
        kindGa: fields.text({
          label: 'Category (Gaeilge)',
          description: 'Irish translation of the category above.',
          validation: { isRequired: true },
        }),
        leadGa: fields.text({
          label: 'Opening line (Gaeilge)',
          description: 'Irish translation of the opening line above.',
          validation: { isRequired: true },
        }),
        bodyGa: fields.text({
          label: 'Body (Gaeilge)',
          description: 'Irish translation of the full article text. Separate paragraphs with a blank line.',
          multiline: true,
          validation: { isRequired: true },
        }),
      },
    }),
  },

  singletons: {
    // Tower opening hours (pilots.astro / ga/pilots.astro) — a live timeline
    // widget, not a table, so it needs raw time blocks rather than the
    // label+value row pattern the singletons below use. Times are UTC and
    // read the same in both languages, so there's nothing to translate here.
    towerHours: singleton({
      label: 'Tower opening hours',
      path: 'src/content/site/tower-hours',
      schema: {
        winter: fields.text({
          label: 'Winter hours',
          description: 'Open/close pairs, 24h time, comma-separated. Example: 07:40-08:30, 09:00-13:00, 13:30-17:00, 18:00-20:10',
          validation: { isRequired: true },
        }),
        summer: fields.text({
          label: 'Summer hours',
          description: 'Same format as Winter above. Example: 06:40-07:30, 08:00-12:00, 12:30-16:00, 17:00-19:10',
          validation: { isRequired: true },
        }),
      },
    }),

    // Aerodrome reference data — all 8 boxes on pilots.astro's "Aerodrome
    // data" section (the 7 accordions plus the Cautions card), everything
    // before the PPR section. Every row's LABEL is fixed in the page code
    // (they're standard AIP field names and shouldn't change) — only the
    // value on the right is editable here, in both languages.
    aerodromeData: singleton({
      label: 'Aerodrome data (8 boxes: Identifiers → Cautions)',
      path: 'src/content/site/aerodrome-data',
      schema: {
        identifiers: fields.object(
          {
            iataIcao: bilingualValue('IATA / ICAO'),
            aerodromeType: bilingualValue('Aerodrome type'),
            arp: bilingualValue('ARP (reference point)'),
            position: bilingualValue('Position'),
            refTemp: bilingualValue('Reference temperature'),
            magVar: bilingualValue('Magnetic variation'),
            trafficPermitted: bilingualValue('Traffic permitted'),
          },
          { label: '1. Identifiers & Location' },
        ),
        runway: fields.object(
          {
            bearing: bilingualValue('Bearing'),
            surface: bilingualValue('Surface'),
            displacedThr: bilingualValue('Displaced threshold'),
            stripResa: bilingualValue('Strip / RESA'),
            papi: bilingualValue('PAPI'),
            approachLgt: bilingualValue('Approach lighting', {
              multiline: true,
              description: 'Two lines, one per runway end — keep the same line break pattern, e.g. "02: LIH 420 m" then a new line "20: LIH 455 m · LED".',
            }),
          },
          { label: '2. Runway — Full Detail' },
        ),
        airspace: fields.object(
          {
            designation: bilingualValue('Designation'),
            lateralLimits: bilingualValue('Lateral limits'),
            verticalLimits: bilingualValue('Vertical limits'),
            airspaceClass: bilingualValue('Class'),
            transitionAltitude: bilingualValue('Transition altitude'),
            flightPlan: bilingualValue('Flight plan'),
          },
          { label: '3. Airspace · Donegal CTR' },
        ),
        approaches: fields.object(
          {
            rwy02: bilingualValue('RWY 02'),
            rwy20: bilingualValue('RWY 20'),
          },
          { label: '4. Instrument Approaches' },
        ),
        navaids: fields.object(
          {
            ndb: bilingualValue('NDB'),
            dme: bilingualValue('DME', {
              multiline: true,
              description: 'Two lines — e.g. "IFN · 110.3 MHz (Ch 40X)" then a new line "zero at DTHR · DOC 20 NM".',
            }),
            loc20: bilingualValue('LOC 20'),
          },
          { label: '5. Navigation Aids' },
        ),
        comms: fields.object(
          {
            tower: bilingualValue('Tower'),
            ground: bilingualValue('Ground'),
            afis: bilingualValue('AFIS'),
            atis: bilingualValue('ATIS'),
          },
          { label: '6. Communications' },
        ),
        ops: fields.object(
          {
            rffs: bilingualValue('RFFS'),
            northApron: bilingualValue('North apron'),
            southApron: bilingualValue('South apron'),
            taxiwayA: bilingualValue('Taxiway A'),
            taxiwayB: bilingualValue('Taxiway B'),
            fuel: bilingualValue('Fuel'),
            security: bilingualValue('Security'),
            ppr: bilingualValue('PPR'),
            customsImm: bilingualValue('Customs / Imm.', {
              multiline: true,
              description: 'Two lines — e.g. "24 HR PN non-EU" then a new line "12 HR PN EU".',
            }),
          },
          { label: '7. Operational' },
        ),
        cautions: bilingualValue('8. Cautions', {
          multiline: true,
          description: 'One caution per line — every non-blank line becomes its own bullet on the page.',
        }),
      },
    }),

    // Fees & charges (pilots.astro "What it costs"). Same pattern as
    // aerodromeData above — group/row labels are fixed in the page code,
    // only the amounts on the right are editable, in both languages
    // (Gaeilge rows like "No charge" → "Saor in aisce" aren't just numbers).
    fees: singleton({
      label: 'Fees & charges (What it costs)',
      path: 'src/content/site/fees',
      schema: {
        landing: fields.object(
          {
            singleEngine: bilingualValue('Single engine'),
            twinEngine: bilingualValue('Twin engine (< 4 t)'),
            over4t: bilingualValue('Over 4 t'),
          },
          { label: 'Landing (per landing)' },
        ),
        parking: fields.object(
          {
            first2h: bilingualValue('First 2 hours'),
            under3t: bilingualValue('Not over 3 t'),
            under10t: bilingualValue('Not over 10 t'),
            under20t: bilingualValue('Not over 20 t'),
            over20t: bilingualValue('Over 20 t'),
          },
          { label: 'Aircraft Parking (per 24 h)' },
        ),
        handling: fields.object(
          {
            paxSupplement: bilingualValue('Passenger load supplement'),
            handlingFee: bilingualValue('Handling fee'),
            exempt: bilingualValue('Exempt'),
          },
          { label: 'Handling (per outbound pax)' },
        ),
        groundServices: fields.object(
          {
            gpu: bilingualValue('Ground power unit'),
            hotWater: bilingualValue('Hot water'),
            cleaning: bilingualValue('Cleaning catering dishes'),
            towing: bilingualValue('Aircraft towing'),
            special: bilingualValue('Special services'),
          },
          { label: 'Ground Services (as used)' },
        ),
        outOfHours: fields.object(
          {
            extension: bilingualValue('Airport extension'),
          },
          { label: 'Out-of-Hours (48 h notice)' },
        ),
        hangarage: fields.object(
          {
            privateSingle: bilingualValue('Private single engine'),
            privateTwin: bilingualValue('Private twin engine'),
            commercial: bilingualValue('Commercial'),
            pushInOut: bilingualValue('Push in / out'),
          },
          { label: 'Hangarage (+ 23% VAT)' },
        ),
      },
    }),

    // Terminal and café opening hours (contact.astro + plan.astro). One
    // field per day for the café — the page groups matching days together
    // automatically (see groupCafeHours in src/lib/siteContent.ts), so a
    // schedule that changes shape (a different day opens later, a shift
    // moves) never needs a code change, just this data. Day NAMES aren't
    // editable text here — they're a fixed, always-complete translation
    // table in code (same pattern as SEASON_GA/DAY_GA in pilots.astro),
    // so there's nothing that can be typo'd or left untranslated.
    hours: singleton({
      label: 'Terminal & café hours',
      path: 'src/content/site/hours',
      schema: {
        terminal: fields.text({
          label: 'Terminal hours',
          description: 'Same every day. Example: 06:30–20:15',
          validation: { isRequired: true },
        }),
        cafeHours: fields.object(
          {
            monday: fields.text({ label: 'Monday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            tuesday: fields.text({ label: 'Tuesday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            wednesday: fields.text({ label: 'Wednesday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            thursday: fields.text({ label: 'Thursday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            friday: fields.text({ label: 'Friday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            saturday: fields.text({ label: 'Saturday', description: 'e.g. 06:30–13:30. Leave blank if closed.' }),
            sunday: fields.text({
              label: 'Sunday',
              description: 'For more than one shift the same day, separate with a comma — e.g. "06:30–13:30, 17:00–19:00". Leave blank if closed.',
            }),
          },
          { label: 'Café hours — one row per day' },
        ),
      },
    }),
  },
});
