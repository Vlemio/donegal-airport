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

  // gsap.ticker is global to the page; only add the lenis.raf
  // callback once across the session. Without this, every view-
  // transition rebuild would queue another callback and lenis would
  // run multiple times per frame.
  if (!lenisTickerAdded) {
    gsap.ticker.add((time: number) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenisTickerAdded = true;
  }
}

/* ---------- Scroll-reveal (IntersectionObserver) ----------
   IntersectionObserver fires for elements already on screen at
   load time, so above-the-fold content reveals correctly too. */
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
// Tracks elements whose reveal tween has already fired. Prevents the
// callback from animating the same element twice when a fast scroll
// crosses several thresholds in a single frame — that would call
// fromTo() again, snap the element back to its hidden start and
// re-animate (the visible "jump back and replay" stutter).
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
        // Big full-bleed panels set data-animate-at so they reveal
        // once properly on screen, not when they first peek in.
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
    // Late-revealing elements are hidden up front so they don't
    // flash visible before their animation has a chance to run.
    if (el.dataset.animateAt) {
      gsap.set(el, revealTween(el.dataset.animate || "fade-up").from);
    }
    revealObserver?.observe(el);
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

/* ---------- Header background on scroll ---------- */
function watchHeader(): void {
  const apply = (): void => {
    const header = document.querySelector<HTMLElement>("[data-header]");
    header?.classList.toggle("is-scrolled", window.scrollY > 90);
  };
  window.addEventListener("scroll", apply, { passive: true });
  document.addEventListener("astro:page-load", apply);
}

/* ---------- Mobile navigation (event delegation) ---------- */
function watchNav(): void {
  // Centralised close so the aria state, body-scroll lock and the
  // translate class always travel together. Used by the hamburger
  // toggle, by link clicks inside the panel and by the Escape key.
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
      // Move focus inside the drawer for keyboard users when opening
      // so Tab cycles through nav links instead of the page underneath.
      if (willOpen) panel.querySelector<HTMLElement>("a")?.focus();
      return;
    }

    if (target.closest("[data-mobile-nav] a")) closeMobileNav();
  });

  // Escape closes the open drawer — minimum-viable modal a11y for
  // a fullscreen overlay.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileNav();
  });
}

/* ---------- Scroll-driven scrub videos (desktop only) ----------
   Each video's currentTime is tied to scroll progress through its
   nearest [data-scrub-trigger] ancestor. Mobile keeps the poster. */
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

      // Coalesce seeks: never start a new seek while one is still in
      // flight. Scrolling fast otherwise queues dozens of seeks and
      // saturates the video decoder, which stutters the whole page.
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

      // Optional vertical pan in addition to the time scrub.
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

/* ---------- Language toggle hover preview ----------
   No behaviour beyond the link itself; the toggle is a plain <a>
   that the i18n helper has already pointed at the equivalent route.
   This stub is here so future logic (cookie set, hreflang prefetch)
   has an obvious home. */
function watchLanguageToggle(): void {
  // Intentionally empty. See comment above.
}

/* ---------- Lifecycle ---------- */
function build(): void {
  setupReveals();
  setupParallax();
  setupScrubVideo();
  ScrollTrigger.refresh();
}

function destroy(): void {
  revealObserver?.disconnect();
  revealObserver = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  // Tear Lenis down so the new page gets a fresh instance with
  // accurate scroll bounds. Keeping Lenis alive across view
  // transitions was hanging on to the previous page's height and
  // caused the "scroll snaps back to the start" stutter on the
  // first scroll after navigating.
  lenis?.destroy();
  lenis = null;
  // Reset any body locks left by an open mobile drawer or modal so
  // the next page doesn't load with scroll disabled.
  document.documentElement.classList.remove("overflow-hidden");
}

// Registered once.
watchNav();
watchHeader();
watchLanguageToggle();

// First load and every View Transitions navigation.
document.addEventListener("astro:page-load", () => {
  // Defensive scroll reset BEFORE Lenis is created. On slow swaps
  // the new Lenis instance would otherwise read a non-zero scrollY
  // in its constructor and "travel" there, leaving the user mid-
  // page on the new route.
  window.scrollTo(0, 0);
  initSmoothScroll();
  // Pin Lenis's internal target to 0 too, in case its proxy read
  // an intermediate scrollY between the reset above and the
  // constructor call. Three-layer reset.
  lenis?.scrollTo(0, { immediate: true, force: true });
  build();
});

// Clean up before navigating away.
document.addEventListener("astro:before-swap", destroy);

// Early scroll reset — runs the instant the new page's DOM lands,
// before page-load fires. Pairs with the page-load reset so neither
// a slow page-load nor a fast first paint can leave the user on the
// previous page's scroll Y.
document.addEventListener("astro:after-swap", () => {
  window.scrollTo(0, 0);
});
