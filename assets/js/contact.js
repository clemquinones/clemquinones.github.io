/**
 * Contact form.
 *
 * The form posts to Formspree natively without this file — the action and
 * method are in the markup — which is the fallback if scripts fail. This only
 * upgrades it so a visitor is not thrown onto Formspree's own thank-you page
 * and back.
 */

const ENDPOINT_STATUS = {
  ok: 'Thanks — that reached me. I usually reply within a couple of days.',
  offline: 'That did not send. Check your connection and try again.',
  failed: 'That did not send. The links beside this form are another way to reach me.',
  tooFast: 'That submitted faster than a person types. Press send again and it will go through.',
};

/**
 * Shortest time a human could plausibly take to land on the page and finish
 * writing a message. Nobody types a name, an address and a paragraph in three
 * seconds; a script does it in milliseconds.
 */
const MIN_FILL_MS = 3000;

/**
 * Puts the email address on the page only when a visitor asks for it.
 *
 * The address is assembled at runtime from fragments, so the served HTML never
 * contains it in a form an address harvester can lift. This is obfuscation, not
 * security — a scraper that executes JavaScript will still get it. It is aimed
 * at the large majority that do not.
 */
function initEmailReveal() {
  const slot = document.querySelector('[data-email-slot]');
  const button = slot?.querySelector('[data-reveal-email]');
  if (!slot || !button) return;

  const address = ['clemquinones', '@', 'gmail', '.', 'com'].join('');

  button.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = `mailto:${address}`;
    link.textContent = address;
    slot.replaceChildren(link);
    link.focus();
  });
}

export function initContact() {
  initEmailReveal();

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;

  const submit = form.querySelector('[type="submit"]');
  const fields = [...form.querySelectorAll('input, textarea')];

  /* -- submit-time trap --------------------------------------------------
     Two signals a script does not produce: a plausible amount of elapsed
     time, and evidence that a human touched the form at all. Setting
     .value directly and calling submit() fires neither of the events below.

     This only stops bots that drive the form. It does nothing about a POST
     sent straight to the Formspree endpoint, which is public in the page —
     that has to be handled by domain restriction and CAPTCHA in the
     Formspree dashboard. */
  const readyAt = Date.now();
  let interacted = false;
  const noteInteraction = () => { interacted = true; };
  for (const type of ['keydown', 'pointerdown', 'focusin', 'paste']) {
    form.addEventListener(type, noteInteraction, { once: true, passive: true });
  }

  function say(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function clearFieldErrors() {
    for (const field of fields) field.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();

    // Deliberately does NOT mark the form as interacted. A human who trips
    // this presses send again, and that click is itself a pointerdown, so the
    // flag sets on its own. Setting it here only ever helped a script get in
    // on its second attempt.
    if (!interacted || Date.now() - readyAt < MIN_FILL_MS) {
      say(ENDPOINT_STATUS.tooFast, 'error');
      return;
    }

    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Sending…';
    say('', '');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      // fetch only rejects on a network failure. A 422 from validation or a
      // 404 from a wrong endpoint both resolve, so the status has to be
      // checked or every submission would look like a success.
      if (response.ok) {
        form.reset();
        say(ENDPOINT_STATUS.ok, 'ok');
        return;
      }

      const data = await response.json().catch(() => null);
      const errors = data?.errors ?? [];

      if (errors.length) {
        for (const error of errors) {
          const field = error.field && form.elements[error.field];
          if (field) field.setAttribute('aria-invalid', 'true');
        }
        say(errors.map((e) => e.message).join(' '), 'error');
        errors[0]?.field && form.elements[errors[0].field]?.focus();
        return;
      }

      say(ENDPOINT_STATUS.failed, 'error');
    } catch {
      say(ENDPOINT_STATUS.offline, 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}
