// Newsletter signup — upserts the subscriber into Mailchimp server-side, so
// the API key never reaches the browser and no third-party script/cookie
// needs to be loaded on the page (nothing to add to the cookie banner).
//
// Uses PUT .../members/{md5(email)} with status_if_new: "pending" (not
// status) — this creates new subscribers into Mailchimp's own double
// opt-in flow (it sends the confirmation email; that confirmation is what
// actually creates a GDPR-valid, timestamped consent record) while never
// touching the status of someone who already exists — e.g. silently
// re-subscribing a person who'd previously unsubscribed, which "status"
// (instead of "status_if_new") would do on every repeat signup.
import type { APIRoute } from "astro";
import crypto from "node:crypto";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const consent = payload.consent === true;
  // Honeypot: a hidden field real visitors never fill in. Any value here
  // means a bot filled the form — pretend success and do nothing, rather
  // than telling the bot its request was rejected.
  const honeypot = String(payload.company || "").trim();
  if (honeypot) return json({ ok: true });

  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid_email" }, 400);
  if (!consent) return json({ ok: false, error: "consent_required" }, 400);

  const apiKey = import.meta.env.MAILCHIMP_API_KEY;
  const audienceId = import.meta.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    console.error("[newsletter] MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID not configured");
    return json({ ok: false, error: "server_error" }, 500);
  }

  // Mailchimp API keys end in "-<datacenter>", e.g. "abc123...-us21" — the
  // datacenter is part of the API host, not a separate config value.
  const dc = apiKey.split("-").pop();
  const subscriberHash = crypto.createHash("md5").update(email).digest("hex");

  try {
    const res = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        },
        body: JSON.stringify({
          email_address: email,
          status_if_new: "pending",
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      console.error("[newsletter] Mailchimp error", res.status, detail?.detail || detail);
      return json({ ok: false, error: "server_error" }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[newsletter] Mailchimp request failed:", (err as Error).message);
    return json({ ok: false, error: "server_error" }, 502);
  }
};
