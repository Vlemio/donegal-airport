import { defineMiddleware } from "astro:middleware";

// Gates the internal /tools/* pages (currently just /tools/image-position)
// behind a single shared HTTP Basic Auth login. These tools hold no site
// content or credentials of their own — this exists only so the URL isn't
// wide open to anyone who finds it, now that Keystatic's own field
// descriptions link straight to it.
//
// Credentials live in Vercel env vars (TOOLS_AUTH_USER / TOOLS_AUTH_PASS),
// never hardcoded here. If they're not set (e.g. local dev), the gate is
// skipped so nobody gets locked out of their own machine by accident.
export const onRequest = defineMiddleware((context, next) => {
  if (!context.url.pathname.startsWith("/tools/")) return next();

  const user = import.meta.env.TOOLS_AUTH_USER;
  const pass = import.meta.env.TOOLS_AUTH_PASS;
  if (!user || !pass) return next();

  const expected = "Basic " + btoa(`${user}:${pass}`);
  if (context.request.headers.get("authorization") === expected) return next();

  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Internal tools"' },
  });
});
