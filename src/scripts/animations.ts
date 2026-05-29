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

  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
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
  const text = el.textContent ?? "";
  const words = text.split(/\s+/).filter(Boolean);
  el.textContent = "";
  el.setAttribute("aria-label", text);
  words.forEach((word, wi) => {
    const wordSpan = document.createElement("span");
    wordSpan.style.display = "inline-block";
    wordSpan.setAttribute("aria-hidden", "true");
    [...word].forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.style.display = "inline-block";
      charSpan.style.willChange = "transform, opacity";
      charSpan.textContent = char;
      wordSpan.appendChild(charSpan);
    });
    el.appendChild(wordSpan);
    if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
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

/* ---------- Header reveal on scroll up ----------
   The header starts off-screen above (CSS sets translateY(-100%)).
   It reveals when:
   (a) the user has scrolled past one viewport AND is scrolling up, or
   (b) the user has reached very near the top of the page.
   This is the deliberate break from Errigal's translucent fixed bar.
*/
function setupHeaderReveal(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  if (!header) return;

  const ALWAYS_SHOW_PX = 80;   // always visible this close to the top
  const HIDE_AFTER_PX  = 80;   // px scrolled DOWN before hiding
  const SHOW_AFTER_PX  = 40;   // px scrolled UP  before revealing

  let lastY = window.scrollY;
  let accumulated = 0;
  let ticking = false;

  const apply = (): void => {
    const y = window.scrollY;
    const delta = y - lastY;
    lastY = y;

    if (y < ALWAYS_SHOW_PX) {
      // Near the top — always show, clear accumulator
      header.classList.add("is-revealed");
      accumulated = 0;
    } else {
      accumulated += delta;
      if (accumulated > HIDE_AFTER_PX) {
        // Scrolled down enough — hide and reset so next up-gesture
        // is measured fresh.
        header.classList.remove("is-revealed");
        accumulated = 0;
      } else if (accumulated < -SHOW_AFTER_PX) {
        // Scrolled up enough — reveal and reset.
        header.classList.add("is-revealed");
        accumulated = 0;
      }
      // If neither threshold is crossed, do nothing — prevents jitter
      // from micro-movements or momentum-scroll wobble.
    }

    header.classList.toggle("is-scrolled", y > ALWAYS_SHOW_PX);
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { apply(); ticking = false; });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("astro:page-load", () => { lastY = window.scrollY; apply(); });
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

/* ---------- Scroll-driven scrub videos (desktop only) ----------
   The drone hero video lives here. Each video's currentTime is tied
   to scroll progress through its nearest [data-scrub-trigger]
   ancestor. The .mp4 must be encoded with a keyframe at every frame
   (ffmpeg -g 1 -keyint_min 1 -sc_threshold 0 -movflags +faststart
   -an) or the scrub stutters as the decoder reconstructs frames.
   Mobile keeps the poster image; videos are never loaded there. */
function setupScrubVideo(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>("[data-scrub-video]");
  if (!videos.length) return;
  if (!window.matchMedia("(min-width: 768px)").matches) return;

  videos.forEach((video) => {
    const section =
      video.closest<HTMLElement>("[data-scrub-trigger]") ??
      video.closest<HTMLElement>("[data-hero-scroll]");
    if (!section) return;

    const src = video.dataset.src;
    if (src && !video.getAttribute("src")) {
      video.setAttribute("src", src);
      video.load();
    }

    const wire = (): void => {
      const duration = video.duration || 5;
      video.classList.add("is-playing");

      // Coalesce seeks: never start a new seek while one is still
      // in flight. Scrolling fast otherwise queues dozens of seeks
      // and saturates the decoder, stuttering the whole page.
      let target = 0;
      let seeking = false;
      const applySeek = (): void => {
        if (seeking || Math.abs(video.currentTime - target) < 1 / 24) return;
        seeking = true;
        video.currentTime = target;
      };
      video.addEventListener("seeked", () => {
        seeking = false;
        applySeek();
      });

      const startPos = video.dataset.scrubStart ?? "top top";
      const endPos = video.dataset.scrubEnd ?? "bottom bottom";

      ScrollTrigger.create({
        trigger: section,
        start: startPos,
        end: endPos,
        scrub: 0.4,
        onUpdate: (self) => {
          target = self.progress * duration;
          if (Number.isFinite(target)) applySeek();
        },
      });

      const panRaw = parseFloat(video.dataset.scrubPan ?? "0");
      const pan = Math.min(0.5, Math.max(0, panRaw));
      if (pan > 0) {
        gsap.fromTo(
          video,
          { yPercent: -pan * 100 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: startPos,
              end: endPos,
              scrub: 0.4,
            },
          },
        );
      }
    };

    if (video.readyState >= 1) wire();
    else video.addEventListener("loadedmetadata", wire, { once: true });
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

      const pinEl = wrapper.querySelector<HTMLElement>(".h-pin");

      // Track translation tied to scroll
      const trackTween = gsap.to(track, {
        x: -distance,
        ease: "none",
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: () => `+=${distance}`,
          pin: pinEl,
          scrub: 0.4,
          invalidateOnRefresh: true,
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
function build(): void {
  setupReveals();
  setupSplitText();
  setupParallax();
  setupKenBurns();
  setupScrubVideo();
  setupStickyHorizontal(); // no-op if [data-horizontal] absent
  setupStoryPath();        // no-op if [data-story-section] absent
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
watchNav();
setupHeaderReveal();
setupCursor();

// First load and every View Transitions navigation.
document.addEventListener("astro:page-load", () => {
  // Triple-reset of scroll: defensive against the "land mid-page"
  // bug that bit Errigal. window.scrollTo before Lenis exists;
  // Lenis constructor reads scrollY; then immediate lenis.scrollTo
  // pins it at 0 in case anything intermediate moved it.
  window.scrollTo(0, 0);
  initSmoothScroll();
  lenis?.scrollTo(0, { immediate: true, force: true });
  build();
});

document.addEventListener("astro:before-swap", destroy);

document.addEventListener("astro:after-swap", () => {
  window.scrollTo(0, 0);
});
