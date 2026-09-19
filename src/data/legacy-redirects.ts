// 301s from the old WordPress site (donegalairport.ie, hosted on Bigwetfish
// today) to this site's routes — built from a full crawl of the old site's
// own sitemap.xml (127 URLs) plus its category/tag archives, reviewed and
// confirmed page-by-page with JM starting 2026-09-19. Full mapping
// notes/reasoning in docs/url-migration-map.csv.
//
// This used to be Astro's own `redirects` config in astro.config.mjs, which
// looks like the obviously "correct" place for this — but Astro's redirects
// feature has a real, reproducible build bug (confirmed locally with
// `npm run build`, not a Vercel caching fluke) whenever two or more
// different source paths redirect to the exact same destination page: the
// SSR entrypoint build step throws
// `[vite:load-fallback] Could not load virtual:astro:page:<dest>@_@astro —
// argument 'path' must be a string ... without null bytes`. This mapping
// has 5-10 old URLs collapsing onto the same handful of new pages (e.g.
// seven different old URLs all landing on /contact), which reliably
// triggers it. Handling it ourselves via a plain page (see
// src/pages/[...oldPath].astro and src/pages/ga/[...oldPath].astro) sends
// the exact same 301s without going through that code path at all.
//
// These take effect the day donegalairport.ie's DNS is switched to point
// at wherever this site actually lives (still Vercel for now, Cloudflare
// Workers when it goes live for real) — until then they're inert, since
// nothing browses this site by its old paths.
export const legacyRedirects: Record<string, string> = {
  // ── Structural pages ─────────────────────────────────────────────────
  "/about-us/": "/story",
  "/about-irish/": "/ga/story",
  "/contact/": "/contact",
  "/contact-irish/": "/ga/contact",
  "/services/": "/plan",
  "/seirbhisi/": "/ga/plan",
  "/parking-fees/": "/plan",
  "/parking-fees-irish/": "/ga/plan",
  "/car-hire-airport-transfers/": "/plan",
  "/car-hire-irish/": "/ga/plan",
  "/taxis-airport-transfers/": "/plan",
  "/check-in-information/": "/plan",
  "/check-in-information-irish/": "/ga/plan",
  "/customs-immigration/": "/pilots#ppr",
  "/customs-immigration-2/": "/pilots#ppr",
  "/custaim-agus-inimirce/": "/ga/pilots#ppr",
  "/paisineiri-le-soghluaisteacht-laghdaithe-prm/": "/ga/plan",
  "/prm-assist/": "/plan",
  "/lost-property/": "/contact",
  "/lost-property-2/": "/contact",
  "/maoin-caillte/": "/ga/contact",
  "/help-support/": "/contact",
  "/cabhair-agus-tacaiocht/": "/ga/contact",
  "/travellers-information/": "/plan#checkin",
  "/exploring-donegal/": "/discover",
  "/places-to-see/": "/discover",
  "/places-to-see-irish/": "/ga/discover",
  "/activities/": "/discover",
  "/sports-activities/": "/discover",
  "/destination/": "/discover",
  "/golf-in-donegal/": "/discover#golf-panel",
  "/galf-i-ndun-na-ngall/": "/ga/discover",
  "/angling-fishing/": "/discover",
  "/angling-and-fishing-irish/": "/ga/discover",
  "/family-fun/": "/discover",
  "/family-fun-irish/": "/ga/discover",
  "/islands/": "/discover",
  "/islands-irish/": "/ga/discover",
  "/drones/": "/pilots",
  "/drones-irish/": "/ga/pilots",
  "/aerodrome-technical-details/": "/pilots",
  "/aerodrome-technical-details-irish/": "/ga/pilots",
  "/bealai-bus/": "/ga/plan",
  "/news/": "/news",
  "/news-main-page/": "/news",
  "/news-gae/": "/ga/news",
  "/careers-at-the-airport/": "/contact",
  "/jobs/": "/contact",
  "/terms-and-conditions/": "/terms",
  "/terms-conditions/": "/terms",
  "/privacy-policy/": "/privacy",
  "/privacy-policy-irish/": "/ga/privacy",
  "/security-policy/": "/security",
  "/safety-policy/": "/safety",
  "/environmental-policy/": "/environmental",
  "/environmental-policy-irish/": "/ga/environmental",
  "/quality-policy/": "/quality",
  "/quality-policy-irish/": "/ga/quality",
  "/raiteas-beartas-teanga-2/": "/language-policy",
  "/fees-and-charges/": "/pilots#fees",
  "/fees-charges-irish/": "/ga/pilots#fees",
  "/new-10kg-carry-on-baggage-policy/": "/plan#checkin",
  "/magazine-takeoff/": "/",
  "/✈️-cafe-carraigfhinne-logo/": "/news/cafe-logo-competition",
  "/cafe-carraigfhinne-logo-design-competition-2/": "/news/cafe-logo-competition",
  "/the-season-opener-golf-in-donegal/": "/discover#golf-panel",
  "/elementor-11741/": "/",
  "/adventure-centres-irish/": "/ga/discover#activities",

  // TODO: reads more like a news announcement than a structural page —
  // confirm there's really no matching article before launch.
  "/new-year-new-career-we-are-hiring/": "/news",

  // ── Dead WP Travel Engine booking-plugin pages (never a real feature) ──
  "/my-account/": "/",
  "/my-account-2/": "/",
  "/wp-travel-engine-checkout/": "/",
  "/wp-travel-engine-cart/": "/",
  "/checkout/": "/",
  "/wishlist/": "/",
  "/enquiry-thank-you-page/": "/contact",
  "/thank-you/": "/",
  "/book-now-uk-europe/": "/flights#book",
  "/trip-types/": "/discover",
  "/trip-search-result/": "/discover",

  // ── News articles (old flat WP slug -> new /news/<slug>) ──────────────
  "/local-students-winning-design-becomes-the-face-of-cafe-carraigfhinne-at-donegal-airport/": "/news/cafe-logo-competition",
  "/sustainability-at-donegal-airport/": "/news/sustainability-2025",
  "/press-release-regional-airport-programme/": "/news/regional-airport-programme",
  "/regional-airport-programme/": "/news/regional-airport-programme",
  "/donegal-dublin-route-restored-may-2026/": "/news/dublin-route-restored",
  "/donegal-airport-statement-9th-march-2026/": "/news/statement-march-2026",
  "/donegal-⇄-dublin-pso/": "/news/pso-statement-february-2026",
  "/raiteas-pso-dhun-na-ngall-⇄-bhaile-atha-cliath/": "/ga/news/pso-statement-february-2026",
  "/tbex-coming-to-donegal/": "/news/tbex-coming-2025",
  "/meet-our-new-team-member-eimear-walsh/": "/news/eimear-walsh",
  "/ar-mball-foirne-nua-a-chur-in-aithne/": "/ga/news/eimear-walsh",
  "/ar-mball-foirne-nua-a-chur-in-aithne-2/": "/ga/news/eimear-walsh",
  "/scoil-gheimhridh-ghaoth-dobhair/": "/news/scoil-gheimhridh",
  "/tbex-travel-bloggers-exchange-2025/": "/news/tbex-2025-recap",
  "/tbex-travel-bloggers-exchange-2025-2/": "/news/tbex-2025-recap",
  "/car-rentals-made-easy/": "/news/car-rentals",
  "/tfi-local-link-donegal-sligo-leitrim-updates/": "/news/local-link-updates",
  "/loganair-year-round-service-to-donegal-takes-flight/": "/news/loganair-year-round-2024",
  "/connectionscorridor/": "/news/connections-corridor",
  "/conair-na-nasceitilti-2022/": "/ga/news/connections-corridor",
  "/changes-to-liquids-aerosols-rules/": "/news/lags-rules-2024",
  "/loganair-to-deliver-year-round-connectivity-for-donegal/": "/news/loganair-announcement-2024",
  "/lonely-planets-top-places-to-visit-in-2024/": "/news/lonely-planet-2024",
  "/first-in-ireland-to-install-ecac-eds-cb-c3-screening/": "/news/ecac-screening",
  "/bucketlist/": "/news/bucket-list-landings-2018",
  "/donegal-voted-one-of-worlds-top10-scenic-airports-2016/": "/news/scenic-airport-2016",
  "/news/donegal-voted-one-of-worlds-top-10-scenic-airports-2016/": "/news/scenic-airport-2016",
  "/news-gae/donegal-voted-one-of-worlds-top-10-scenic-airports-2016-irish/": "/ga/news/scenic-airport-2016",
  "/2020-most-scenic-airports-worldwide/": "/news/scenic-airport-2020",
  "/news/2020s-most-scenic-airports-worldwide/": "/news/scenic-airport-2020",
  "/new-pso-2022/": "/news/pso-contract-emerald-2022",
  "/news/bucket-list/": "/news/bucket-list-landings-2018",
  "/news-gae/bucket-list-irish/": "/ga/news/bucket-list-landings-2018",
  "/news/covid-19-coronavirus/": "/news",
  "/news-gae/covid-19-coronavirus-irish/": "/ga/news",
  "/ga/category/events-ga/": "/ga/news",

  // Confirmed by JM 2026-09-19: same article as sustainability-2025
  // (image filename news-aca-level4.jpg matches), not a separate one.
  "/level-4-transformation-in-airport-carbon-accreditation/": "/news/sustainability-2025",

  // Translated by Claude: "sceideal an tsamhraidh agus an gheimhridh" =
  // "summer and winter schedule" — this is the entered-service/schedule
  // article, not the original announcement.
  "/loganair-sceideal-an-tsamhraidh-agus-an-gheimhridh/": "/ga/news/loganair-year-round-2024",

  // All 4 checked directly (fetched each live page): every one uses
  // future tense ("will air on Thursday 30th"), matching
  // tg4-documentary-announcement (2023-11-17), not tg4-documentary
  // (2023-11-30, the "began airing" piece) — my first guess had these
  // split across both, which was wrong.
  "/aerfort-dhun-na-ngall-on-tg4/": "/news/tg4-documentary-announcement",
  "/tg4-documentary-series-aerfort-dhun-na-ngall/": "/news/tg4-documentary-announcement",
  "/sraith-ar-tg4-faoi-aerfort-dhun-na-ngall/": "/ga/news/tg4-documentary-announcement",
  "/tg4-aerfort-dhun-na-ngall/": "/ga/news/tg4-documentary-announcement",

  // TODO: these 3 are still LIVE on the old site (checked directly,
  // 200 OK, real content — not dead links) but have no article on the
  // new site at all. JM to decide whether to migrate them as new
  // articles (like cafe-logo-competition.yaml) or leave them retired;
  // pointed at the news listing for now so nothing 404s meanwhile.
  "/earagail-arts-festival/": "/news",
  "/ga/theatre-breaks-to-dublin/": "/ga/news",
  "/donegal-tourism-branding/": "/news",
};
