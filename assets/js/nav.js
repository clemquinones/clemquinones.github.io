/**
 * Mobile menu and scroll spy.
 */

import { lockScroll, unlockScroll } from './scroll-lock.js';

const MOBILE = '(max-width: 900px)';

export function initNav() {
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('primary-nav');
  const links = [...document.querySelectorAll('[data-spy]')];
  if (!burger || !nav) return;

  /* -- menu ------------------------------------------------------------- */

  const isOpen = () => burger.getAttribute('aria-expanded') === 'true';

  function setOpen(open) {
    // aria-expanded is the state, not a side effect of it. Set it first so it
    // can never drift from what is on screen.
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) lockScroll(); else unlockScroll();
  }

  function close({ restoreFocus = false } = {}) {
    if (!isOpen()) return;
    setOpen(false);
    if (restoreFocus) burger.focus();
  }

  burger.addEventListener('click', () => setOpen(!isOpen()));

  // Any of the usual ways out.
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close({ restoreFocus: true });
  });

  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    if (!nav.contains(e.target) && !burger.contains(e.target)) close();
  });

  // Resizing past the breakpoint leaves the menu markup visible but the
  // burger hidden, so drop the state rather than stranding it.
  matchMedia(MOBILE).addEventListener('change', (e) => { if (!e.matches) close(); });

  /* -- scroll spy -------------------------------------------------------- */

  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const linkFor = new Map(sections.map((s, i) => [s, links[i]]));

  function markActive(section) {
    for (const link of links) link.removeAttribute('aria-current');
    const link = linkFor.get(section);
    if (link) link.setAttribute('aria-current', 'true');
  }

  // Clicking a link scrolls through every section in between, which would
  // otherwise strobe the highlight. Set it optimistically and ignore the
  // observer until the scroll settles.
  let holdUntil = 0;
  for (const link of links) {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      markActive(target);
      holdUntil = Date.now() + 900;
    });
  }

  const visible = new Set();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    if (Date.now() < holdUntil) return;

    if (visible.size) {
      // Topmost of whatever is crossing the band.
      const current = [...visible].sort(
        (a, b) => sections.indexOf(a) - sections.indexOf(b),
      )[0];
      markActive(current);
    }
  }, {
    // A thin band across the middle of the viewport: a section counts as
    // "current" only while it occupies the reader's actual line of sight.
    rootMargin: '-45% 0px -50% 0px',
    threshold: 0,
  });

  for (const section of sections) observer.observe(section);

  // The last section is often shorter than the viewport and may never reach
  // the band, so at the very bottom of the page it wins outright.
  //
  // Reading scrollHeight forces a synchronous layout, so it is read once per
  // animation frame at most, and re-measured only when the page can actually
  // have changed height. Doing it inline in the scroll handler thrashes layout
  // on every wheel tick and visibly janks the whole page.
  let docHeight = document.documentElement.scrollHeight;
  const remeasure = () => { docHeight = document.documentElement.scrollHeight; };
  addEventListener('resize', remeasure, { passive: true });
  addEventListener('load', remeasure);

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (Date.now() < holdUntil) return;
      if (window.scrollY + window.innerHeight >= docHeight - 2) {
        markActive(sections[sections.length - 1]);
      }
    });
  }, { passive: true });
}
