/**
 * Reveals elements as they scroll into view.
 *
 * The hidden starting state lives in CSS behind both `.js` and a
 * prefers-reduced-motion query, so a visitor who asked for less motion — or
 * one whose scripts failed — sees a normal page rather than a blank one.
 */

export function initReveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (!items.length) return;

  const show = (el) => el.classList.add('is-visible');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches
      || !('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  for (const item of items) observer.observe(item);
}
