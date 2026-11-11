import { useEffect } from "react";

/**
 * Fades elements in as they scroll into view.
 *
 * Any element with `data-reveal` inside the document is picked up, and
 * revealed once its top edge comes within the viewport. A rAF-throttled
 * scroll sweep is used rather than an IntersectionObserver, because an
 * observer never reports an element that was scrolled past between two
 * frames — which left content invisible whenever the reader jumped
 * straight to a section.
 *
 * A MutationObserver picks up elements that arrive later: the blog home
 * loads its posts over the network, so most of the cards do not exist
 * yet when the page first mounts.
 *
 * Under `prefers-reduced-motion` everything is shown immediately.
 *
 * `key` should change when the route changes, because the tactics pages
 * are loaded lazily and arrive after the layout has already mounted.
 *
 * The CSS owns the visual part — this hook only adds `is-in`.
 */
export function useReveal(key) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = null;

    const sweep = () => {
      frame = null;
      const limit = window.innerHeight * 0.9;
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((node) => {
        if (node.getBoundingClientRect().top < limit) node.classList.add("is-in");
      });
    };

    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(sweep);
    };

    if (reduced) {
      document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-in"));
    } else {
      sweep();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule, { passive: true });

      const mutations = new MutationObserver(schedule);
      mutations.observe(document.body, { childList: true, subtree: true });

      return () => {
        mutations.disconnect();
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        if (frame !== null) cancelAnimationFrame(frame);
      };
    }
    return undefined;
  }, [key]);
}
