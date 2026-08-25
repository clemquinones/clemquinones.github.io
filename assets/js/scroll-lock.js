/**
 * Freezes the page behind an overlay.
 *
 * `overflow: hidden` on its own is unreliable on iOS Safari, which keeps
 * scrolling the body anyway, so the page is pinned with `position: fixed` and
 * the scroll offset is restored on release.
 */

let savedY = 0;
let depth = 0;

export function lockScroll() {
  if (depth++ > 0) return;

  savedY = window.scrollY;
  const body = document.body;
  body.style.position = 'fixed';
  body.style.top = `-${savedY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  // Holding the gutter open stops the layout jumping sideways when the
  // scrollbar disappears on desktop.
  document.documentElement.style.scrollbarGutter = 'stable';
}

export function unlockScroll() {
  if (depth === 0 || --depth > 0) return;

  const body = document.body;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  document.documentElement.style.scrollbarGutter = '';

  // Jump straight back, without the smooth-scroll behaviour animating it.
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, savedY);
  html.style.scrollBehavior = previous;
}
