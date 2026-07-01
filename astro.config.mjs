// @ts-check
import { defineConfig } from 'astro/config';
import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Absolute path of this config file's directory (= project root).
// Used instead of process.cwd() so the path is correct regardless of
// which directory the dev server / build is invoked from.
const __projectRoot = fileURLToPath(new URL('.', import.meta.url));

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  // Absolute URL of the deployed site. Used by Astro.site so OG /
  // canonical / sitemap tags can output fully-qualified URLs. Update
  // when the airport's real domain is wired up.
  site: 'https://donegal-airport-git-master-errigal.vercel.app',

  // static (default in Astro 6): all pages pre-rendered. Individual routes
  // can opt out with `export const prerender = false` — Keystatic uses this
  // for its admin API. Vercel adapter handles the SSR routes in production.
  adapter: vercel(),

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

    // React — required by Keystatic admin UI (its panel is a React app).
    react(),

    // Keystatic CMS — admin panel at /keystatic (server-rendered only).
    // In dev: login via Keystatic Cloud (Allow local development is on).
    // In prod: same login at /keystatic.
    keystatic(),
  ],

  vite: {
    optimizeDeps: {
      include: [
        '@keystatic/core',
        '@keystatic/core/ui',
        '@keystatic/astro/ui',
      ],
    },

    plugins: [
      // Keystatic's virtual:keystatic-config doesn't resolve in Astro 6's
      // Environment API client context. This plugin uses Rollup's null-byte
      // convention to provide it in ALL environments (client + ssr).
      {
        name: 'keystatic-config-resolver',
        resolveId(id) {
          if (id === 'virtual:keystatic-config') {
            return '\0virtual:keystatic-config';
          }
          return null;
        },
        load(id) {
          if (id === '\0virtual:keystatic-config') {
            const cfgPath = path.resolve(__projectRoot, 'keystatic.config.ts').replace(/\\/g, '/');
            return `export { default } from '${cfgPath}';`;
          }
          return null;
        },
      },

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
