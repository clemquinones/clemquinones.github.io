/**
 * Project detail overlay.
 *
 * Built on native <dialog>. showModal() supplies the focus trap, Escape
 * handling, top-layer stacking, background inertness and focus restore — all
 * the parts a hand-rolled modal typically gets subtly wrong.
 *
 * Each card's copy already lives in the page as a hidden `.detail` sibling, so
 * the dialog clones that block rather than keeping a second copy of the text.
 * The large screenshot is created at open time; ten of them sitting in the
 * markup would be most of a megabyte downloaded for a panel nobody opened.
 */

import { lockScroll, unlockScroll } from './scroll-lock.js';

const TITLE_ID = 'lightbox-title';

export function initLightbox() {
  const dialog = document.getElementById('lightbox');
  const body = dialog?.querySelector('.lightbox__body');
  const closeBtn = dialog?.querySelector('.lightbox__close');
  const triggers = [...document.querySelectorAll('.project__trigger')];
  if (!dialog || !body || !triggers.length) return;

  // Native <dialog> already carries the dialog role and modal semantics;
  // adding role/aria-modal by hand here would be redundant.

  const preloaded = new Set();
  function preload(trigger) {
    const src = trigger.dataset.full;
    if (!src || preloaded.has(src)) return;
    preloaded.add(src);
    new Image().src = src;
  }

  let isOpen = false;

  /**
   * Undoes everything open() did.
   *
   * Called directly from each way out rather than only from the dialog's
   * `close` event: if that event is ever missed, the page is left scroll-locked
   * and unusable, which is a far worse failure than tidying up twice. Guarded
   * so running twice is harmless.
   */
  function teardown() {
    if (!isOpen) return;
    isOpen = false;
    unlockScroll();
    // Leaving the old project in place would flash it on the next open.
    body.replaceChildren();
    dialog.removeAttribute('aria-labelledby');
  }

  function close() {
    teardown();
    if (dialog.open) dialog.close();
  }

  function open(trigger) {
    const detail = document.getElementById(trigger.dataset.detail);
    if (!detail) return;

    const clone = detail.cloneNode(true);
    clone.removeAttribute('hidden');
    clone.removeAttribute('id');

    // IDs are assigned after cloning, never authored into the source block:
    // a duplicate id would make aria-labelledby resolve to the hidden copy.
    const title = clone.querySelector('.detail__title');
    if (title) {
      title.id = TITLE_ID;
      dialog.setAttribute('aria-labelledby', TITLE_ID);
    } else {
      dialog.removeAttribute('aria-labelledby');
    }

    const shot = document.createElement('img');
    shot.src = trigger.dataset.full;
    shot.width = Number(trigger.dataset.fullW) || 1600;
    shot.height = Number(trigger.dataset.fullH) || 900;
    shot.decoding = 'async';
    // The heading immediately below names the project, so announcing the
    // screenshot as well would just say it twice.
    shot.alt = '';

    body.replaceChildren(shot, clone);
    isOpen = true;
    lockScroll();
    dialog.showModal();
  }

  for (const trigger of triggers) {
    trigger.addEventListener('click', () => open(trigger));
    trigger.addEventListener('mouseenter', () => preload(trigger));
    trigger.addEventListener('focus', () => preload(trigger));
  }

  closeBtn?.addEventListener('click', close);

  // A click that lands on the dialog element itself is a click on the
  // backdrop, because all the visible content sits inside .lightbox__inner.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  // Escape. The dialog closes itself afterwards; this is only here to run the
  // cleanup alongside it.
  dialog.addEventListener('cancel', teardown);

  // Backstop for any route that closes the dialog without going through
  // close() above.
  dialog.addEventListener('close', teardown);
}
