import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Smooth scrolling (Lenis) ---------- */
let lenis: Lenis | null = null;
let lenisTickerAdded = false;

function initSmoothScroll(): void {
  if (lenis || prefersReducedMotion()) return;

  // Lenis momentum is the real source of the hero scrub stutter: after
  // the wheel stops, Lenis keeps animating the scroll position for the
  // duration, decelerating — and during that slow tail the frame
  // sequence advances in visible discrete steps. A short duration (0.4)
  // makes the scroll settle quickly so there's almost no coast tail.
  lenis = new Lenis({ duration: 0.4, smoothWheel: true });
  lenis.on("scroll", () => ScrollTrigger.update());

  // gsap.ticker is global to the page; only add the lenis.raf callback
  // once across the session. Without this, every view-transition rebuild
  // would queue another callback and lenis would run multiple times per
  // frame.
  if (!lenisTickerAdded) {
    gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenisTickerAdded = true;
  }
}

/* ---------- Scroll-reveal (IntersectionObserver) ---------- */
function revealTween(type: string): { from: gsap.TweenVars; to: gsap.TweenVars } {
  switch (type) {
    case "fade":
      return { from: { opacity: 0 }, to: { opacity: 1 } };
    case "fade-right":
      return { from: { opacity: 0, x: -56 }, to: { opacity: 1, x: 0 } };
    case "fade-left":
      return { from: { opacity: 0, x: 56 }, to: { opacity: 1, x: 0 } };
    case "zoom":
      return { from: { opacity: 0, scale: 1.06 }, to: { opacity: 1, scale: 1 } };
    default:
      return { from: { opacity: 0, y: 48 }, to: { opacity: 1, y: 0 } };
  }
}

let revealObserver: IntersectionObserver | null = null;
const animatedReveals = new WeakSet<Element>();

function setupReveals(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-animate]");
  if (!els.length) return;

  if (prefersReducedMotion()) {
    els.forEach((el) => gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 }));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (animatedReveals.has(el)) return;
        const minRatio = parseFloat(el.dataset.animateAt ?? "0.1");
        if (!entry.isIntersecting || entry.intersectionRatio < minRatio) return;
        animatedReveals.add(el);
        const { from, to } = revealTween(el.dataset.animate || "fade-up");
        gsap.fromTo(el, from, {
          ...to,
          duration: 1,
          delay: parseFloat(el.dataset.animateDelay ?? "0"),
          ease: "power3.out",
        });
        observer.unobserve(el);
      });
    },
    { threshold: [0.1, 0.4, 0.7], rootMargin: "0px 0px -8% 0px" },
  );

  els.forEach((el) => {
    if (el.dataset.animateAt) {
      gsap.set(el, revealTween(el.dataset.animate || "fade-up").from);
    }
    revealObserver?.observe(el);
  });
}

/* ---------- Split-text reveal ----------
   Elements with [data-split] are split into word+char spans on
   load and animated with a stagger when they cross the viewport.
   This is the headline-construction pattern that breaks visually
   from Errigal's flat fade-ups. */
const splitObservers = new WeakSet<Element>();

function splitIntoChars(el: HTMLElement): void {
  if (splitObservers.has(el)) return;
  splitObservers.add(el);
  const childNodes = Array.from(el.childNodes);
  const fullText = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  el.textContent = "";
  // A bare element (e.g. <p>, <span>, <div>) doesn't have a role that
  // formally supports aria-label per the ARIA spec — Lighthouse/axe flag
  // aria-label-without-a-role as "aria-prohibited-attr". role="text" is the
  // Safari-originated, now widely-supported convention for exactly this
  // "visually split into pieces, but read as one opaque text node" case.
  // Headings already have an implicit role that supports aria-label, and
  // setting role="text" on one would strip its heading semantics entirely
  // (axe flags THAT as aria-allowed-role) — only non-heading elements need it.
  if (!/^H[1-6]$/.test(el.tagName)) el.setAttribute("role", "text");
  el.setAttribute("aria-label", fullText);
  childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "BR") {
      el.appendChild(document.createElement("br"));
      return;
    }
    const words = (node.textContent ?? "").split(/\s+/).filter(Boolean);
    words.forEach((word, wi) => {
      const wordSpan = document.createElement("span");
      wordSpan.style.display = "inline-block";
      wordSpan.setAttribute("aria-hidden", "true");
      [...word].forEach((char) => {
        const charSpan = document.createElement("span");
        charSpan.style.display = "inline-block";
        charSpan.style.willChange = "transform, opacity";
        if (char === "F" || char === "f") charSpan.className = "f-fix";
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);
      });
      el.appendChild(wordSpan);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });
}

function setupSplitText(): void {
  const els = gsap.utils.toArray<HTMLElement>("[data-split]");
  if (!els.length) return;
  if (prefersReducedMotion()) return;

  els.forEach((el) => {
    splitIntoChars(el);
    const chars = el.querySelectorAll<HTMLElement>("span span");
    if (!chars.length) return;
    gsap.set(chars, { y: "0.9em", opacity: 0 });

    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(chars, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.018,
          delay: parseFloat(el.dataset.splitDelay ?? "0"),
        });
      },
    });
  });
}

/* ---------- Parallax (GSAP ScrollTrigger) ---------- */
function setupParallax(): void {
  if (prefersReducedMotion()) return;

  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    const amount = parseFloat(el.dataset.parallax || "12");
    gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: {
          trigger: el.parentElement ?? el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

/* ---------- Ken Burns ----------
   Slow scale + slight pan on photos with [data-ken-burns]. Runs
   forever, paused if user prefers reduced motion. Used on the
   hero crossfade carousel and on big editorial photographs. */
function setupKenBurns(): void {
  if (prefersReducedMotion()) return;
  gsap.utils.toArray<HTMLElement>("[data-ken-burns]").forEach((el) => {
    const dur = parseFloat(el.dataset.kenBurnsDuration ?? "14");
    gsap.fromTo(
      el,
      { scale: 1.0, xPercent: 0, yPercent: 0 },
      {
        scale: 1.09,
        xPercent: -1.5,
        yPercent: -1.5,
        duration: dur,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      },
    );
  });
}

/* ---------- Header transparency mode ----------
   Explicit per-page rule (not scroll-based, not left over from whichever
   page you last visited): these paths always get the solid frosted header;
   every other page gets the transparent-over-hero-photo treatment. Recomputed
   fresh from location.pathname on every astro:page-load — no captured
   state, so it can't go stale after a client-side navigation. */
const SOLID_HEADER_PATHS = [
  "/flights", "/plan", "/contact", "/news",
  "/ga/flights", "/ga/plan", "/ga/contact", "/ga/news",
  "/privacy", "/safety", "/security", "/quality", "/environmental", "/language-policy", "/terms",
  "/ga/privacy", "/ga/safety", "/ga/security", "/ga/quality", "/ga/environmental", "/ga/language-policy", "/ga/terms",
];

function applyHeaderMode(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  // The 404 page can't be listed by path — it renders at whatever broken
  // URL the visitor actually hit, never literally "/404" in the browser's
  // address bar — so it marks itself with data-solid-header instead. It has
  // no hero photo/video, so the default transparent-over-hero white text
  // was unreadable against its plain page background (axe: color-contrast).
  const solid = SOLID_HEADER_PATHS.includes(path) || document.body.hasAttribute("data-solid-header");
  document.documentElement.toggleAttribute("data-transparent-header", !solid);
}

/* ---------- Header scrolled-state ----------
   The header is always visible (no slide-in/out — CSS doesn't hide it).
   The only job here is toggling .is-scrolled so the frosted-glass
   background appears once the user has scrolled past the hero edge. */
function setupHeaderReveal(): void {
  let ticking = false;

  const apply = (): void => {
    // Both re-queried on every call (not captured once) — after a
    // client-side nav, stale references to elements detached from a
    // previous page must not leak in here (the header itself included,
    // since View Transitions can swap it for a new node).
    const header = document.querySelector<HTMLElement>("[data-header]");
    if (!header) return;
    const heroSection = document.querySelector<HTMLElement>("[data-hero-scroll]");
    const threshold = heroSection
      ? Math.max(
          60,
          heroSection.offsetTop + heroSection.offsetHeight - window.innerHeight - 20,
        )
      : 60;
    header.classList.toggle("is-scrolled", window.scrollY > threshold);
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { apply(); ticking = false; });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("astro:page-load", () => apply());
  apply();
}

/* ---------- Mobile navigation (event delegation) ---------- */
function watchNav(): void {
  const closeMobileNav = (): void => {
    const panel = document.querySelector<HTMLElement>("[data-mobile-nav]");
    if (!panel || panel.classList.contains("translate-x-full")) return;
    panel.classList.add("translate-x-full");
    document
      .querySelector<HTMLElement>("[data-nav-toggle]")
      ?.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("overflow-hidden");
  };

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const panel = document.querySelector<HTMLElement>("[data-mobile-nav]");
    if (!panel) return;

    const toggle = target.closest<HTMLElement>("[data-nav-toggle]");
    if (toggle) {
      const willOpen = panel.classList.contains("translate-x-full");
      panel.classList.toggle("translate-x-full", !willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
      document.documentElement.classList.toggle("overflow-hidden", willOpen);
      if (willOpen) panel.querySelector<HTMLElement>("a")?.focus();
      return;
    }

    if (target.closest("[data-mobile-nav] a")) closeMobileNav();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileNav();
  });
}

/* ---------- Scroll-driven scrub "video" (desktop only) ----------
   The drone hero is a FRAME SEQUENCE painted to a <canvas>, not an
   <video>. Seeking an <video> via currentTime stutters whenever the
   scroll decelerates — the decoder is built for linear playback, not
   random access, so each near-stop sub-frame seek queues and arrives
   in irregular bursts. Painting a pre-decoded WebP frame to a canvas
   has no decoder in the loop: it's an instant drawImage that can never
   stutter. This is the technique Apple-style product pages use.

   Frames live in /public/video/frames/frame-0001.webp … and are
   regenerated from the source with:
     ffmpeg -i source.mp4 -vf "scale=1920:1080:flags=lanczos" \
       -c:v libwebp -quality 80 -compression_level 6 frame-%04d.webp

   data-video-start / data-video-end (seconds, written by the trim
   tool) map to frame indices via data-fps, so the trim workflow is
   unchanged. Mobile keeps the Ken Burns poster; frames never load. */
function setupScrubVideo(): void {
  const canvases = document.querySelectorAll<HTMLCanvasElement>("[data-scrub-canvas]");
  if (!canvases.length) return;
  if (!window.matchMedia("(min-width: 768px)").matches) return;

  canvases.forEach((canvas) => {
    const section =
      canvas.closest<HTMLElement>("[data-scrub-trigger]") ??
      canvas.closest<HTMLElement>("[data-hero-scroll]");
    if (!section) return;

    const total = parseInt(canvas.dataset.frames ?? "0", 10);
    const fps = parseFloat(canvas.dataset.fps ?? "24");
    const prefix = canvas.dataset.framePath ?? "";
    const pad = parseInt(canvas.dataset.framePad ?? "4", 10);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!total || !ctx) return;

    // Map trim window (seconds) → 1-indexed frame range.
    const startSec = parseFloat(canvas.dataset.videoStart ?? "0");
    const endSec = parseFloat(canvas.dataset.videoEnd ?? String(total / fps));
    const startFrame = Math.min(total, Math.max(1, Math.round(startSec * fps) || 1));
    const endFrame = Math.min(total, Math.max(startFrame + 1, Math.round(endSec * fps) || total));
    const frameRange = endFrame - startFrame;

    const frameUrl = (i: number): string => `${prefix}${String(i).padStart(pad, "0")}.webp`;
    const images: HTMLImageElement[] = new Array(total + 1);
    let lastPos = -1;       // last float frame position drawn
    let revealed = false;

    // Return frame i if decoded, else walk backwards to the last ready
    // one so the canvas never flashes blank during fast scroll.
    const ready = (i: number): HTMLImageElement | undefined => {
      const img = images[i];
      if (img?.complete && img.naturalWidth) return img;
      for (let j = i - 1; j >= startFrame; j--) {
        const c = images[j];
        if (c?.complete && c.naturalWidth) return c;
      }
      return undefined;
    };

    // Cover-fit blit (canvas CSS object-fit doesn't apply to drawn bitmaps,
    // so we compute the cover transform ourselves).
    const cover = (img: HTMLImageElement): void => {
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    // Sub-frame interpolation: `pos` is a FLOAT frame position (e.g. 34.7).
    // Paint frame 34 fully, then cross-fade frame 35 on top at alpha 0.7.
    // With drone footage (tiny motion between 24 fps frames) this reads as
    // continuous motion at any scroll speed — no discrete frame stepping
    // when the scroll slows down, which is what a hard round() shows.
    const draw = (pos: number): void => {
      const f0 = Math.floor(pos);
      const t = pos - f0;
      const imgA = ready(f0);
      if (!imgA) return;
      ctx.globalAlpha = 1;
      cover(imgA);
      if (t > 0.001 && f0 < endFrame) {
        const imgB = ready(f0 + 1);
        if (imgB && imgB !== imgA) {
          ctx.globalAlpha = t;
          cover(imgB);
          ctx.globalAlpha = 1;
        }
      }
      lastPos = pos;
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      if (lastPos >= 0) draw(lastPos);
    };

    const load = (i: number): void => {
      if (images[i]) return;
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(i);
      images[i] = img;
      // First frame ready → size the canvas, paint, fade in, drop poster.
      if (i === startFrame) {
        img.onload = (): void => {
          if (revealed) return;
          revealed = true;
          resize();
          draw(startFrame);
          canvas.classList.add("is-playing");
          const kbImg = section?.querySelector<HTMLElement>("[data-ken-burns]");
          if (kbImg) kbImg.classList.add("is-hidden");
        };
      }
    };

    // Kick the first frame, then queue the rest of the trimmed range once
    // the browser is idle. Firing the whole range (dozens of frames,
    // several MB) synchronously on page load competes for bandwidth with
    // the LCP image, fonts and API calls — measured as the dominant hit to
    // LCP. draw()/ready() already fall back to the nearest loaded frame, so
    // scrubbing plays gracefully with whatever has arrived so far while the
    // rest streams in behind it.
    load(startFrame);
    const loadRest = (): void => {
      for (let i = startFrame; i <= endFrame; i++) load(i);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadRest, { timeout: 2000 });
    } else {
      setTimeout(loadRest, 300);
    }

    window.addEventListener("resize", resize);
    document.addEventListener("astro:after-swap", () => window.removeEventListener("resize", resize));

    const startPos = canvas.dataset.scrubStart ?? "top top";
    const endPos = canvas.dataset.scrubEnd ?? "bottom bottom";

    ScrollTrigger.create({
      trigger: section,
      start: startPos,
      end: endPos,
      // scrub: true (not a number) — the canvas paints instantly, so we
      // want the frame to track the scroll position with zero added lag.
      // A numeric scrub would re-introduce a coast tail on top of Lenis.
      scrub: true,
      onUpdate: (self) => {
        // Float position (not round()) so draw() can cross-fade between
        // the two nearest frames for smooth motion at any scroll speed.
        const pos = startFrame + self.progress * frameRange;
        if (Math.abs(pos - lastPos) > 0.002) draw(Math.max(startFrame, Math.min(endFrame, pos)));
      },
    });
  });
}

/* ---------- Mobile hero loop (< 768px only, desktop untouched) ----------
   Below md, setupScrubVideo() above bails out entirely (its own
   `min-width: 768px` guard) — scroll-tied scrubbing is what felt "stuck"
   on touch, since mobile momentum-scrolling doesn't feed JS a smooth,
   continuous stream of scroll positions the way a desktop wheel/trackpad
   does. This paints the SAME frame sequence instead, driven by a
   self-running clock (not scroll), so there's nothing for a touch gesture
   to fight with: play forward to the last frame, then back to the first,
   forever — a "boomerang" loop, since a real <video> can't play in
   reverse reliably across browsers. */
let mobileHeroLoopId = 0;
function setupMobileHeroLoop(): void {
  // Cancel whichever page's loop (if any) is still running before
  // possibly starting a fresh one — same cross-page-leak class of bug as
  // the hero panel's clock/weather timers.
  if (mobileHeroLoopId) cancelAnimationFrame(mobileHeroLoopId);
  if (prefersReducedMotion()) return;
  if (window.matchMedia("(min-width: 768px)").matches) return;

  const canvases = document.querySelectorAll<HTMLCanvasElement>("[data-scrub-canvas]");
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const section =
      canvas.closest<HTMLElement>("[data-scrub-trigger]") ??
      canvas.closest<HTMLElement>("[data-hero-scroll]");

    const total = parseInt(canvas.dataset.frames ?? "0", 10);
    const fps = parseFloat(canvas.dataset.fps ?? "24");
    const prefix = canvas.dataset.framePath ?? "";
    const pad = parseInt(canvas.dataset.framePad ?? "4", 10);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!total || !ctx) return;

    // Deliberately NOT the same startFrame/endFrame as setupScrubVideo above:
    // desktop trims to data-video-start/-end (the scroll-scrub's chosen
    // window), but this loop isn't scroll-gated — it plays on its own, so it
    // covers the full clip from the first frame to the last.
    const startFrame = 1;
    const endFrame = total;

    const frameUrl = (i: number): string => `${prefix}${String(i).padStart(pad, "0")}.webp`;
    const images: HTMLImageElement[] = new Array(total + 1);
    let revealed = false;

    const ready = (i: number): HTMLImageElement | undefined => {
      const img = images[i];
      if (img?.complete && img.naturalWidth) return img;
      for (let j = i - 1; j >= startFrame; j--) {
        const c = images[j];
        if (c?.complete && c.naturalWidth) return c;
      }
      return undefined;
    };

    const cover = (img: HTMLImageElement): void => {
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    const draw = (pos: number): void => {
      const f0 = Math.floor(pos);
      const t = pos - f0;
      const imgA = ready(f0);
      if (!imgA) return;
      ctx.globalAlpha = 1;
      cover(imgA);
      if (t > 0.001 && f0 < endFrame) {
        const imgB = ready(f0 + 1);
        if (imgB && imgB !== imgA) {
          ctx.globalAlpha = t;
          cover(imgB);
          ctx.globalAlpha = 1;
        }
      }
    };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("astro:after-swap", () => window.removeEventListener("resize", resize));

    const load = (i: number): void => {
      if (images[i]) return;
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(i);
      images[i] = img;
      if (i === startFrame) {
        img.onload = (): void => {
          if (revealed) return;
          revealed = true;
          draw(startFrame);
          canvas.classList.add("is-playing");
          const kbImg = section?.querySelector<HTMLElement>("[data-ken-burns]");
          if (kbImg) kbImg.classList.add("is-hidden");
        };
      }
    };
    // Firing all 121 frame requests (several MB) in one synchronous loop
    // right on page load competes for mobile bandwidth with the actual LCP
    // image, fonts and API calls — measured as the dominant hit to mobile
    // LCP (PageSpeed). Only the poster frame is needed immediately; the
    // rest of the boomerang sequence can start arriving once the browser
    // is idle (or after a timeout on Safari, which lacks
    // requestIdleCallback) — draw()/ready() already fall back to the
    // nearest loaded frame, so the loop plays gracefully with whatever
    // has arrived so far.
    load(startFrame);
    const loadRest = (): void => {
      for (let i = startFrame + 1; i <= endFrame; i++) load(i);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadRest, { timeout: 2000 });
    } else {
      setTimeout(loadRest, 300);
    }

    // Boomerang clock — advances by real elapsed time (not a fixed
    // per-frame step), so playback speed stays correct regardless of the
    // device's screen refresh rate. SPEED < 1 plays slower than the
    // source footage's native pace (requested: "un poco más lento").
    const SPEED = 0.6;
    let pos = startFrame;
    let dir = 1;
    let last = 0;
    const tick = (now: number): void => {
      if (!last) last = now;
      const dt = (now - last) / 1000;
      last = now;
      pos += dir * fps * SPEED * dt;
      if (pos >= endFrame) { pos = endFrame; dir = -1; }
      else if (pos <= startFrame) { pos = startFrame; dir = 1; }
      draw(pos);
      mobileHeroLoopId = requestAnimationFrame(tick);
    };
    mobileHeroLoopId = requestAnimationFrame(tick);
  });
}

/* ---------- Story path — /about curved timeline ----------
   Reads the [data-waypoint] elements inside [data-story-section],
   generates a smooth Catmull-Rom SVG path through their positions,
   and drives stroke-dashoffset via ScrollTrigger so the path draws
   itself as the user scrolls. Also slides each chapter card in from
   its side.

   Desktop-only (≥1024 px). The SVG and waypoints are hidden on mobile
   via CSS, and this function early-returns on narrow viewports so no
   GSAP overhead runs on touch devices.
*/

interface Pt { x: number; y: number }

function catmullRomPath(pts: Pt[], tension = 0.45): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + tension * (p2.x - p0.x) / 2;
    const cp1y = p1.y + tension * (p2.y - p0.y) / 2;
    const cp2x = p2.x - tension * (p3.x - p1.x) / 2;
    const cp2y = p2.y - tension * (p3.y - p1.y) / 2;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

let storyPathST: ReturnType<typeof ScrollTrigger.create> | null = null;

function setupStoryPath(): void {
  if (prefersReducedMotion()) return;
  if (!window.matchMedia("(min-width: 1024px)").matches) return;

  const section = document.querySelector<HTMLElement>("[data-story-section]");
  const svg = section?.querySelector<SVGSVGElement>("[data-story-svg]");
  const pathEl = svg?.querySelector<SVGPathElement>("[data-story-path]");
  const trackEl = svg?.querySelector<SVGPathElement>("[data-story-track]");
  const waypoints = section?.querySelectorAll<HTMLElement>("[data-waypoint]");

  if (!section || !svg || !pathEl || !waypoints?.length) return;

  // Find the plane group once — it lives inside the same SVG element
  const planeEl = svg?.querySelector<SVGGElement>("[data-story-plane]") ?? null;

  function build(): void {
    const sRect = section!.getBoundingClientRect();
    const W = section!.offsetWidth;
    const H = section!.offsetHeight;

    // Update SVG viewBox to match section pixel dimensions
    svg!.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // Build point list:
    //   • fixed start at center-top of section
    //   • one point per [data-waypoint] — position relative to section
    //   • fixed end at center-bottom of section
    const pts: Pt[] = [{ x: W / 2, y: 0 }];

    waypoints!.forEach((wp) => {
      const r = wp.getBoundingClientRect();
      pts.push({
        x: r.left + r.width / 2 - sRect.left,
        y: r.top + r.height / 2 - sRect.top,
      });
    });

    pts.push({ x: W / 2, y: H });

    const d = catmullRomPath(pts);
    pathEl!.setAttribute("d", d);
    if (trackEl) trackEl.setAttribute("d", d);

    // Reset plane to hidden at path start
    if (planeEl) {
      gsap.set(planeEl, { opacity: 0, attr: { transform: `translate(${W / 2},0) rotate(0)` } });
    }

    // Set up dash animation
    const len = pathEl!.getTotalLength();
    pathEl!.style.strokeDasharray = String(len);
    pathEl!.style.strokeDashoffset = String(len);

    storyPathST?.kill();
    storyPathST = ScrollTrigger.create({
      trigger: section,
      start: "top 80%",
      end: "bottom 20%",
      scrub: 1.2,
      onUpdate(self) {
        // Draw path
        pathEl!.style.strokeDashoffset = String(len * (1 - self.progress));

        // Move ATR 72 to the current path tip
        if (planeEl && self.progress > 0.004) {
          const dist = Math.max(2, self.progress * len);
          const pt      = pathEl!.getPointAtLength(dist);
          const ptPrev  = pathEl!.getPointAtLength(Math.max(0, dist - 3));
          // Tangent angle in degrees (screen coords: y increases downward)
          const angle   = Math.atan2(pt.y - ptPrev.y, pt.x - ptPrev.x) * (180 / Math.PI);
          // +90 because the plane SVG has nose pointing UP (−y) at rotation=0
          const heading = angle + 90;
          const opacity = Math.min(1, (self.progress - 0.004) * 40);

          gsap.set(planeEl, {
            opacity,
            attr: {
              transform: `translate(${pt.x.toFixed(2)},${pt.y.toFixed(2)}) rotate(${heading.toFixed(2)})`,
            },
          });
        } else if (planeEl) {
          gsap.set(planeEl, { opacity: 0 });
        }
      },
    });
  }

  // Run after fonts + layout are stable (two rAF cycles)
  requestAnimationFrame(() => requestAnimationFrame(build));

  // Rebuild on resize so path stays aligned with content
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 220);
  });

  // Reveal each chapter in two beats: the heading slides in from its
  // side first, then — as the reader keeps scrolling — the explanatory
  // text (and photo) slides in after it. Separate ScrollTriggers mean
  // the body copy keeps its own entrance instead of arriving already
  // on screen alongside the title.
  section!.querySelectorAll<HTMLElement>("[data-story-chapter]").forEach((ch, idx) => {
    const card = ch.querySelector<HTMLElement>(".story-card");
    if (!card) return;
    const dx = ch.dataset.side === "right" ? 90 : -90;

    // First three chapters need an earlier trigger — the scroll hasn't
    // built up momentum yet and the plane reaches those waypoints sooner.
    const early = idx < 3;
    const headStart  = early ? "center 76%" : "center 67%";
    const bodyStart  = early ? "center 57%" : "center 48%";

    const head = [
      card.querySelector<HTMLElement>(":scope > p"),
      card.querySelector<HTMLElement>(":scope > h2"),
    ].filter(Boolean) as HTMLElement[];

    const body = card.querySelectorAll<HTMLElement>(
      ":scope > h2 ~ p, :scope > figure, :scope > [data-photo]",
    );

    if (head.length) {
      gsap.fromTo(
        head,
        { opacity: 0, x: dx },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ch, start: headStart, once: true },
        },
      );
    }

    if (body.length) {
      gsap.fromTo(
        body,
        { opacity: 0, x: dx },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.16,
          scrollTrigger: { trigger: ch, start: bodyStart, once: true },
        },
      );
    }
  });
}

/* ---------- Story chapter text reveal — mobile only ----------
   setupStoryPath() above drives the chapter text's slide-in on desktop as
   part of its scroll-synced SVG path, but bails out entirely below
   1024px (the alternating left/right path layout doesn't exist on the
   single-column mobile view). That left the mobile chapter text with no
   entrance animation at all — it was just present the moment its section
   scrolled into place.

   This gives mobile its own reveal, independent of the desktop path
   system so neither one can double-fire or fight the other — and unlike
   a single fade on the whole card, each chapter reveals piece by piece in
   reading order: the range/year line, then the title, then the lead
   paragraph, then each body paragraph. The big background year (.story-
   year-bg) is deliberately left out — it's a static 18%-opacity watermark
   (see global.css), and animating it to opacity:1 turned it into a
   jarring full-colour flash that buried the actual text animation. */
function setupStoryMobileReveal(): void {
  if (prefersReducedMotion()) return;
  if (window.matchMedia("(min-width: 1024px)").matches) return;

  document.querySelectorAll<HTMLElement>("[data-story-chapter] .story-card").forEach((card) => {
    // :scope > p, > h2 in one query returns them in DOM order — range/year
    // line, then title, then the lead paragraph, then each body paragraph.
    const sequence = Array.from(
      card.querySelectorAll<HTMLElement>(":scope > p, :scope > h2"),
    );
    if (!sequence.length) return;

    gsap.fromTo(
      sequence,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        ease: "power3.out",
        stagger: 0.18,
        scrollTrigger: { trigger: card, start: "top 85%", once: true },
      },
    );
  });
}

/* ---------- Sticky horizontal scroll ----------
   The wrapper provides vertical scroll distance; the inner .h-track
   translates -X as the user scrolls down. Disabled on small
   viewports because horizontal-scroll-on-vertical-scroll is
   unintuitive on touch.

   Also wires:
   - [data-h-progress] / [data-h-dot]: the year-dot strip that
     marks the currently-centered panel and accepts click-to-jump.
   - [data-h-panel]: a panel within the track that the progress
     watcher uses as a checkpoint. */
function setupStickyHorizontal(): void {
  if (prefersReducedMotion()) return;
  if (!window.matchMedia("(min-width: 1024px)").matches) return;

  document
    .querySelectorAll<HTMLElement>("[data-horizontal]")
    .forEach((wrapper) => {
      const track = wrapper.querySelector<HTMLElement>(".h-track");
      if (!track) return;
      const distance = track.scrollWidth - window.innerWidth;
      if (distance <= 0) return;

      // .h-pin already has position:sticky in CSS — no GSAP pin needed.
      // Setting height here gives the wrapper enough vertical scroll space
      // so the sticky element stays fixed for the full horizontal travel.
      const setHeight = (): void => {
        const d = track.scrollWidth - window.innerWidth;
        wrapper.style.height = `${window.innerHeight + d}px`;
      };
      setHeight();

      // Track translation tied to scroll — CSS sticky handles pinning,
      // GSAP only drives the X offset. No pin/anticipatePin avoids the
      // position:fixed flip that caused the entry/exit jolt.
      const trackTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          scrub: 0.4,
          invalidateOnRefresh: true,
          onRefresh: setHeight,
        },
      });

      // ---- Progress dots ----
      const panels = Array.from(
        track.querySelectorAll<HTMLElement>("[data-h-panel]"),
      );
      const dots = Array.from(
        document.querySelectorAll<HTMLElement>("[data-h-dot]"),
      );
      if (!panels.length || !dots.length) return;

      // For each panel, compute the vertical scrollY where its
      // centre crosses the viewport centre during the horizontal
      // animation, and create a ScrollTrigger that toggles the
      // matching dot active in a small range around it.
      const computeTargets = (): number[] => {
        const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
        const verticalDistance = distance; // pinned + scrub means 1:1
        return panels.map((panel) => {
          const panelCentre = panel.offsetLeft + panel.offsetWidth / 2;
          const progress = (panelCentre - window.innerWidth / 2) / distance;
          const clamped = Math.max(0, Math.min(1, progress));
          return wrapperTop + clamped * verticalDistance;
        });
      };

      let targets = computeTargets();
      const setActive = (i: number): void => {
        dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
      };

      // One ScrollTrigger per panel that flips the active dot when
      // the user is within a quarter-viewport of the panel centre.
      const triggers = panels.map((_, i) =>
        ScrollTrigger.create({
          start: () => targets[i] - window.innerHeight / 4,
          end: () => targets[i] + window.innerHeight / 4,
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        }),
      );

      // Recompute on resize so dots stay accurate on viewport change.
      ScrollTrigger.addEventListener("refreshInit", () => {
        targets = computeTargets();
      });

      // Click-to-jump on dots — uses Lenis if available, else native.
      dots.forEach((dot, i) => {
        dot.addEventListener("click", (event) => {
          event.preventDefault();
          targets = computeTargets();
          const y = targets[i];
          if (lenis) {
            lenis.scrollTo(y, { duration: 1.2 });
          } else {
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        });
      });

      // First-paint sync
      setTimeout(() => {
        targets = computeTargets();
        ScrollTrigger.refresh();
      }, 30);

      // Suppress noisy unused-variable warnings — these are kept for
      // future debugging/teardown.
      void trackTween;
      void triggers;
    });
}

/* ---------- Custom cursor ----------
   A small circle that follows the pointer; grows into a labelled
   disc on hover over [data-photo]. Skipped on touch and on
   prefers-reduced-motion. Lives in a single DOM node attached
   to <body> on first init. */
let cursorEl: HTMLElement | null = null;

function setupCursor(): void {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (prefersReducedMotion()) return;

  if (!cursorEl) {
    cursorEl = document.createElement("div");
    cursorEl.className = "cfn-cursor";
    cursorEl.textContent = "VIEW";
    document.body.appendChild(cursorEl);
  }

  let mouseX = 0;
  let mouseY = 0;
  let frameRequested = false;
  const apply = (): void => {
    if (!cursorEl) return;
    cursorEl.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    frameRequested = false;
  };

  window.addEventListener("mousemove", (e: MouseEvent) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(apply);
  });

  document.addEventListener("mouseover", (e) => {
    if (!cursorEl) return;
    const target = e.target as HTMLElement;
    cursorEl.classList.toggle(
      "is-photo",
      Boolean(target.closest("[data-photo]")),
    );
  });
}

/* ---------- Lifecycle ---------- */
// Any lazy-loaded image sitting in normal document flow (not absolutely
// positioned, so it affects layout height) can push everything below it
// further down the page once it finishes loading. ScrollTrigger caches
// pixel positions from the measurement at build() time — before those
// images have loaded — so a [data-split]/[data-animate] trigger further
// down the page stays locked to the wrong (too-early, already-passed)
// spot once the images above it load and shift the real layout down. The
// deeper down the page, the more that drift compounds, which is why it
// showed up as headings with seemingly no entrance animation ("Fees &
// charges", "Drones", ...) rather than the ones near the top. Refreshing
// once every lazy image on the page has loaded corrects it before any
// trigger below that point has had a chance to fire.
function refreshAfterImagesLoad(): void {
  const pending = [...document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')]
    .filter((img) => !img.complete); // already-loaded (cached) images have no drift to correct
  if (!pending.length) return;

  // One refresh after everything has settled, not one per image — lazy
  // photos finish loading spread out over the whole scroll session, so a
  // refresh-per-image was calling ScrollTrigger.refresh() (a full-page
  // layout read) repeatedly WHILE the user was mid-scroll, which is heavy
  // enough on mobile to visibly stall a touch-scroll gesture. A single
  // batched refresh (capped so one slow/broken image can't block it
  // forever) fixes the drift just as well without the repeated jank.
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    ScrollTrigger.refresh();
  };
  const settled = pending.map(
    (img) => new Promise<void>((resolve) => img.addEventListener("load", () => resolve(), { once: true })),
  );
  Promise.all(settled).then(finish);
  setTimeout(finish, 4000); // fallback in case an image never fires load (e.g. 404)
}

function build(): void {
  setupReveals();
  setupSplitText();
  setupParallax();
  setupKenBurns();
  setupScrubVideo();
  setupMobileHeroLoop();
  setupStickyHorizontal(); // no-op if [data-horizontal] absent
  setupStoryPath();        // no-op if [data-story-section] absent
  setupStoryMobileReveal(); // no-op on desktop / if no story chapters
  refreshAfterImagesLoad(); // no-op if no lazy images left to load
  ScrollTrigger.refresh();
}

function destroy(): void {
  revealObserver?.disconnect();
  revealObserver = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  storyPathST = null;
  // Tear Lenis down so the new page gets a fresh instance with
  // accurate scroll bounds.
  lenis?.destroy();
  lenis = null;
  document.documentElement.classList.remove("overflow-hidden");
}

// Registered once.
// The browser's own scroll-restoration on a hard reload can re-apply the
// old scroll offset *after* our own scrollTo(0,0) below runs, which makes
// ScrollTrigger think a below-the-fold reveal's trigger point was already
// passed — it snaps straight to the end state instead of animating. Taking
// manual control avoids that race entirely.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
watchNav();
setupHeaderReveal();
// Custom pointer circle disabled per request — native cursor only.
// setupCursor();

// First load and every View Transitions navigation.
document.addEventListener("astro:page-load", () => {
  applyHeaderMode();
  window.scrollTo(0, 0);
  initSmoothScroll();
  lenis?.scrollTo(0, { immediate: true, force: true });
  // build() ends with ScrollTrigger.refresh(), which forces a full-page
  // layout read across every registered trigger (682+ DOM elements on the
  // homepage) — a real, measured contributor to LCP "element render delay"
  // (PageSpeed: the hero poster's bytes were ready in ~160ms, but it wasn't
  // actually painted for another ~410ms). The poster <img> loads and decodes
  // independently of any of this JS, so there's nothing lost by giving the
  // browser one paint frame to show it before running the heavier setup —
  // double rAF (one alone doesn't reliably land after a paint) is the
  // standard "wait until after next paint" pattern.
  requestAnimationFrame(() => requestAnimationFrame(build));
  // Hash anchor (e.g. /#news) — jump shortly after layouts settle.
  // immediate:true avoids the visible scroll journey through the whole page.
  //
  // setTimeout, not requestAnimationFrame: rAF callbacks are paused by the
  // browser whenever the tab isn't actively compositing (backgrounded,
  // switched away from, or — the case that actually bit this once —
  // whatever transient state a tab can be in right after a fast click
  // during a live demo). A stalled rAF chain here means the hash target is
  // never scrolled to AND the "did we already land on a hash" guard below
  // never runs, so the page can be left wherever the browser's own
  // scroll-restoration happened to clamp it — which on a shorter new page
  // is the bottom. setTimeout fires regardless of paint/visibility state,
  // and 80ms is imperceptible for an immediate (non-animated) jump.
  const hash = window.location.hash;
  if (hash) {
    setTimeout(() => {
      const target = document.querySelector<HTMLElement>(hash);
      if (target) lenis?.scrollTo(target, { offset: -80, immediate: true, force: true });
    }, 80);
  } else {
    // Safety net for a slow-paint race: on a slow connection/device the
    // browser can still clamp scroll to the new document's bottom (it's
    // often shorter than whatever page you scrolled deep into before
    // navigating) after the synchronous reset above already ran — re-assert
    // it once more, shortly after the new page has actually painted.
    setTimeout(() => {
      if (window.location.hash) return; // a hash link may have been clicked since
      window.scrollTo(0, 0);
      lenis?.scrollTo(0, { immediate: true, force: true });
    }, 80);
  }
});

document.addEventListener("astro:before-swap", destroy);

document.addEventListener("astro:after-swap", () => {
  window.scrollTo(0, 0);
});
