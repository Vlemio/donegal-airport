# Fonts

This folder is for self-hosted font files. Anything dropped here is
served at `/fonts/<filename>` and referenced from `src/styles/global.css`.

## Display face — Bricolage Grotesque

Decided (Aug 2026): sticking with Bricolage Grotesque Variable as the
permanent display face — no need for a paid font here. It's loaded via
the `@fontsource-variable/bricolage-grotesque` package, already a project
dependency, so there's nothing to install.

## Switzer

Loaded over the Fontshare CDN for now. Self-host post-firma:

1. Download from <https://www.fontshare.com/fonts/switzer>.
2. Drop the variable `.woff2` here as `Switzer-Variable.woff2`.
3. Remove the `@import` line for Fontshare in `global.css` and
   uncomment the `@font-face` block below it.
