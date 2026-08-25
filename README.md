# clemquinones.github.io

Personal portfolio. Hand-written HTML, CSS and vanilla JS — no framework, no
build step, no dependencies to install. What is in the repo is what ships.

## Running it locally

The scripts are ES modules, so opening `index.html` from the filesystem will
fail with a CORS error. Serve it over HTTP:

```sh
python3 -m http.server 4321
# http://localhost:4321
```

## Layout

```
index.html                 the whole page — all content lives here
404.html
assets/
  css/main.css             single stylesheet, sectioned with a contents list at the top
  js/
    main.js                entry point; initialises the four features below
    nav.js                 mobile menu + scroll spy
    lightbox.js            project detail dialog
    reveal.js              scroll-triggered fade-in
    contact.js             contact form submission
    scroll-lock.js         shared body scroll freeze
  fonts/                   latin subset, self-hosted, variable:
                             Inter        — body
                             Inter Tight  — hero name + section titles
                             JetBrains Mono — eyebrows, chips, domain labels
  img/                     generated — see below
tools/optimize-assets.sh   regenerates assets/img/ from the original screenshots
```

## Images

`assets/img/` is generated. The originals are 3–5 MB PNG screenshots that live
**outside this repo**, in `../materials/`, and are not published.

```sh
./tools/optimize-assets.sh              # rebuild what is out of date
./tools/optimize-assets.sh --force      # rebuild everything
./tools/optimize-assets.sh --dry-run    # show what would happen
SRC=/path/to/materials ./tools/optimize-assets.sh
```

Needs ImageMagick with a WebP delegate (`brew install imagemagick`).

Each project produces a 720px card image and a 1600px file that serves as both
the retina card source and the image the lightbox opens. Everything is WebP
except `og-cover.jpg`, because social unfurlers still handle WebP inconsistently.

Which screenshot represents each project, and how it is cropped, is an editorial
decision and lives in the `PROJECTS` manifest at the top of the script. If a
thumbnail looks badly framed, change the crop there and re-run.

## Editing content

All copy is in `index.html`. Each project is one `<li class="project">`
containing two things:

- the card `<button>`, carrying `data-detail` (the id of its detail block) and
  `data-full` / `data-full-w` / `data-full-h` for the large image
- a hidden `<div class="detail">` holding the title, role, description, stack
  chips and live link

The detail block **is** the source of truth. The lightbox clones it on open, so
there is no second copy of the text to keep in sync. Do not put `id` attributes
inside a detail block — the lightbox assigns them after cloning, and a duplicate
id would break `aria-labelledby`.

Adding a project means adding one `<li>` and one entry in the image manifest.

## Contact form

Posts to Formspree (`meajyaae`). The `action` and `method` are in the markup, so
it works with JavaScript disabled; `contact.js` upgrades it to submit in place.

Formspree's free tier is 50 submissions a month. A `_gotcha` honeypot field is
included. Note that `fetch` only rejects on network failure — a 404 or a
validation error still resolves, so `contact.js` branches on `response.ok`
rather than assuming success.

## Deploying

Push to the default branch of the `clemquinones.github.io` repository. GitHub
Pages serves it from the root. `.nojekyll` stops Jekyll from processing the
files. Expect a minute or two before changes appear.

Asset paths are relative, so the site also works from a subdirectory if the repo
is ever renamed. There is no way to set cache headers on Pages, so the width
suffix in an image filename is the only cache-busting lever: changing an
image's *content* means changing its *name*.

## Before pushing a change

Nothing here is enforced automatically, so run through it by hand:

- Serve locally and click every nav link; the underline should follow the
  section you are actually reading.
- Tab through the page with the keyboard only. Every focused element must show
  a gold ring. Open a project with Enter, close it with Escape, and confirm
  focus lands back on the card you opened.
- Open the menu at a narrow width. It must close on Escape, on a link click,
  and on an outside click, and the page behind it must not scroll.
- Check a project card on a real touch device: the "View detail" pill should be
  visible without tapping first.
- Turn on Reduce Motion in the OS and reload. Everything must be visible
  immediately, with no scrolling animation.
- Throttle to Fast 3G in DevTools and confirm the page is readable before the
  screenshots finish loading.
