/// <reference types="astro/client" />

// Google Consent Mode v2 / gtag.js — declared globally since gtag.js loads
// as a plain <script> tag (not an npm import), and multiple inline scripts
// across the app (BaseLayout, CookieConsent) call window.gtag directly.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
