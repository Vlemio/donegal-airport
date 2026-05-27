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
  let lastY = window.scrollY;
  let ticking = false;

  const apply = (): void => {
    const y = window.scrollY;
    const goingUp = y < lastY;
    const nearTop = y < 40;
    const pastHero = y > window.innerHeight * 0.85;
    const shouldReveal = nearTop || (goingUp && pastHero);
    header.classList.toggle("is-revealed", shouldReveal);
    header.classList.toggle("is-scrolled", y > 80);
    lastY = y;
    ticking = false;
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("astro:page-load", apply);
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
  setupStickyHorizontal();
  ScrollTrigger.refresh();
}

function destroy(): void {
  revealObserver?.disconnect();
  revealObserver = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
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
