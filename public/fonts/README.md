# Fonts

This folder is for self-hosted font files. Anything dropped here is
served at `/fonts/<filename>` and referenced from `src/styles/global.css`.

## PP Editorial New — to install

PP Editorial New (Pangram Pangram) is our **display** typeface. Free for
personal use; paid licence required for commercial deployment. While
the site lives on the vercel.app preview domain we are pre-firma, so
personal use is fine. Buy a licence before going live on the real
domain.

1. Download from <https://pangrampangram.com/products/editorial-new>.
2. Unzip the bundle. You'll get several weights — we need at least:
   - `PPEditorialNew-Regular.woff2`
   - `PPEditorialNew-Italic.woff2`
   - `PPEditorialNew-Ultralight.woff2`
   - `PPEditorialNew-UltralightItalic.woff2`
3. Drop those four `.woff2` files into THIS folder (`web/public/fonts/`).
4. Run `npm run dev` and refresh — the `@font-face` declarations in
   `global.css` will pick them up automatically. Headings switch from
   the Bricolage Grotesque fallback to PP Editorial New.

If you skip this step the site still works — Bricolage Grotesque is a
solid free fallback declared in the same `font-family` cascade.

## Switzer

Loaded over the Fontshare CDN for now. Self-host post-firma:

1. Download from <https://www.fontshare.com/fonts/switzer>.
2. Drop the variable `.woff2` here as `Switzer-Variable.woff2`.
3. Remove the `@import` line for Fontshare in `global.css` and
   uncomment the `@font-face` block below it.
