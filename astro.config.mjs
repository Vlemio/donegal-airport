// @ts-check
import { defineConfig } from 'astro/config';
import fs   from 'node:fs';
import path from 'node:path';

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
    plugins: [
      tailwindcss(),

      // ── Dev-only trim API ──────────────────────────────────────────────
      // Exposes GET /api/trim  → returns current video-trim.json
      //          POST /api/trim → writes new {start, end} to the JSON.
      // index.astro imports the JSON so Vite HMR picks up the change and
      // the page reloads automatically. Production builds ignore this.
      {
        name: 'cfn-trim-api',
        apply: 'serve',   // dev server only
        configureServer(server) {
          const trimJson = path.join(process.cwd(), 'src', 'data', 'video-trim.json');

          server.middlewares.use('/api/trim', (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'OPTIONS') { res.end('{}'); return; }

            if (req.method === 'GET') {
              try { res.end(fs.readFileSync(trimJson, 'utf-8')); }
              catch { res.end('{"start":0,"end":5}'); }
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', (c) => { body += c.toString(); });
              req.on('end', () => {
                try {
                  const { start, end } = JSON.parse(body);
                  const data = { start: +start, end: +end };
                  fs.writeFileSync(trimJson, JSON.stringify(data, null, 2) + '\n');
                  res.end(JSON.stringify({ ok: true, ...data }));
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ ok: false, error: String(e) }));
                }
              });
              return;
            }

            res.statusCode = 405;
            res.end('{"error":"Method not allowed"}');
          });
        },
      },
    ],
  },
});
