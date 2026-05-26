import en from "./en.json";
import ga from "./ga.json";

export const locales = ["en", "ga"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const strings = { en, ga } as const;

/**
 * Returns the active locale for a given URL pathname.
 *
 * EN is the default and lives at "/" with no prefix. GA lives under
 * "/ga/...". Anything that doesn't start with a known locale prefix
 * falls back to the default — important so that /404, /robots.txt,
 * etc. still resolve a sensible language for OG / JSON-LD.
 */
export function getLocale(pathname: string): Locale {
  if (pathname === "/ga" || pathname.startsWith("/ga/")) return "ga";
  return defaultLocale;
}

/**
 * Returns the matching path on the other locale, so the EN/GA toggle
 * in the header can link the user to the same page in the other
 * language. /flights ⇄ /ga/flights, / ⇄ /ga/.
 */
export function altLocalePath(pathname: string, current: Locale): string {
  if (current === "ga") {
    if (pathname === "/ga" || pathname === "/ga/") return "/";
    return pathname.replace(/^\/ga/, "") || "/";
  }
  return pathname === "/" ? "/ga/" : `/ga${pathname}`;
}

type Dict = typeof en;
type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${P}${P extends "" ? "" : "."}${K}`>
    : `${P}${P extends "" ? "" : "."}${K}`;
}[keyof T & string];

/**
 * `t("nav.flights", "en")` returns the translated string. Throws
 * loudly in dev if a key is missing so untranslated strings can't
 * silently ship.
 */
export function t(key: Path<Dict>, locale: Locale = defaultLocale): string {
  const dict = strings[locale] as Record<string, unknown>;
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);

  if (typeof value !== "string") {
    // Hard fail in dev, soft fallback to the key in production so a
    // missing translation never blows up a live page.
    if (import.meta.env.DEV) {
      throw new Error(`i18n: missing key "${key}" for locale "${locale}"`);
    }
    return key;
  }
  return value;
}
