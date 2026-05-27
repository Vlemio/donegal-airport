// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Absolute URL of the deployed site. Used by Astro.site so OG /
  // canonical / sitemap tags can output fully-qualified URLs. Update
  // when the airport's real domain is wired up.
  site: 'https://donegal-airport-git-master-errigal.vercel.app',

  // English is the default locale and renders WITHOUT a /en/ prefix
  // so the URL the average traveller types stays clean. Irish lives
  // under /ga/. Sitemap will emit hreflang pairs automatically.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ga'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    // Emits /sitemap-index.xml + /sitemap-0.xml at build time. The
    // 404 page is excluded because it shouldn't be indexed. While
    // the site is on the vercel.app preview domain, robots.txt also
    // blocks crawlers — see public/robots.txt.
    sitemap({
      filter: (page) => !page.endsWith('/404'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
