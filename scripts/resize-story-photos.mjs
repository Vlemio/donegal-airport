// One-off: downscale the oversized story photos for web.
// The SVG torn-edge filter (feDisplacementMap) is GPU-expensive and
// chokes on 17-megapixel sources, so we cap the longest edge and
// re-encode. Originals are kept elsewhere; these public/ copies are
// the web-delivery versions.
import sharp from "sharp";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "public", "photos", "story");

const jobs = [
  // chapter photos: ~1400px wide is plenty at the rendered ~600px slot
  { in: "story-ch01.png", out: "story-ch01.jpg", w: 1400, q: 82 },
  { in: "story-ch02.png", out: "story-ch02.jpg", w: 1400, q: 82 },
  // hero: full-bleed, allow more width
  { in: "story-hero.jpg", out: "story-hero.jpg", w: 2200, q: 80 },
];

for (const j of jobs) {
  const src = join(dir, j.in);
  const buf = readFileSync(src);
  const meta = await sharp(buf).metadata();
  const out = await sharp(buf)
    .resize({ width: j.w, withoutEnlargement: true })
    .jpeg({ quality: j.q, mozjpeg: true })
    .toBuffer();
  // write to a temp then move (in===out for hero)
  const tmp = join(dir, j.out + ".tmp");
  writeFileSync(tmp, out);
  renameSync(tmp, join(dir, j.out));
  console.log(
    `${j.in} ${meta.width}x${meta.height} ${(buf.length / 1e6).toFixed(2)}MB  ->  ${j.out} ${j.w}w ${(out.length / 1e6).toFixed(2)}MB`,
  );
}
console.log("done");
