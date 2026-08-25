/**
 * Entry point. Each feature is independent and guards its own markup, so a
 * missing section never takes the rest of the page down with it.
 */

import { initNav } from './nav.js';
import { initLightbox } from './lightbox.js';
import { initReveal } from './reveal.js';
import { initContact } from './contact.js';

for (const init of [initNav, initLightbox, initReveal, initContact]) {
  try {
    init();
  } catch (error) {
    // A broken enhancement should never leave the page unreadable.
    console.error(`${init.name} failed:`, error);
  }
}

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
