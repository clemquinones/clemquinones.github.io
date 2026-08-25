#!/usr/bin/env bash
#
# Regenerates the web-ready images in assets/img/ from the original
# screenshots in ../materials/.
#
# The originals are 3-5 MB PNGs and are deliberately NOT part of this repo.
# Run this only when a source screenshot changes.
#
#   ./tools/optimize-assets.sh              # only rebuild what's out of date
#   ./tools/optimize-assets.sh --force      # rebuild everything
#   ./tools/optimize-assets.sh --dry-run    # show what would happen
#
# Requires: imagemagick built with a webp delegate  (brew install imagemagick)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${SRC:-$ROOT/../materials}"
OUT="$ROOT/assets/img"

FORCE=0
DRY=0
for arg in "$@"; do
  case "$arg" in
    --force)   FORCE=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 64 ;;
  esac
done

command -v magick >/dev/null || { echo "missing 'magick' — brew install imagemagick" >&2; exit 69; }
magick -list format | grep -q '^ *WEBP' || {
  echo "this imagemagick has no webp delegate — brew reinstall imagemagick" >&2; exit 69; }

if [[ ! -d "$SRC" ]]; then
  cat >&2 <<EOF
Source images not found at: $SRC

The originals live outside this repo and are not published. Set SRC to point
at them, e.g.  SRC=~/Code/clem/portfolio/materials ./tools/optimize-assets.sh
EOF
  exit 2
fi

# ---------------------------------------------------------------------------
# Manifest: which screenshot represents each project, and how to frame it.
#
#   relative source path | slug | crop
#
# The crop is an ImageMagick geometry applied before resizing, used to trim a
# screenshot down to the part worth showing. "-" means use the whole image.
# Choosing the frame is an editorial decision, so it lives here in the diff
# rather than being guessed at by a glob.
# ---------------------------------------------------------------------------
PROJECTS=(
  # Cropped to the hero and search bar. The full-page capture runs on into a
  # wall of body copy that turns to grey mush at thumbnail size.
  "projects/mystaff.online/mystaffonline-homepage.png|mystaff|2389x1344+485+0"
  "projects/ilg.com.au/ilg-homepage.png|ilg|-"
  "projects/mycrowdconnect.com/mcc-homepage.png|mycrowdconnect|-"
  "projects/forexworld.com.au/forexworld-homepage.png|forexworld|-"
  "projects/forexcargo.com.au/forexcargo-homepage.png|forexcargo|-"
  "projects/galleon.ph/galleonph-homepage.png|galleon|-"
)

# Card thumbnail, and the larger file the lightbox opens. The 1600 doubles as
# the 2x source for the card via srcset, so it is not an extra download.
PROJECT_WIDTHS=(720 1600)
PROJECT_QUALITY=80

# clem-casual-sm.jpg is the headshot worth showing. clem.jpg is larger but is
# a casual outdoor shot in sunglasses with the top of the head cropped off.
# The source is only 651px, so the portrait is displayed small enough that it
# still resolves cleanly; -resize shrinks only, so nothing gets upscaled.
PORTRAIT_SRC="me/clem-casual-sm.jpg"
PORTRAIT_WIDTHS=(420 640)
PORTRAIT_QUALITY=84

total_bytes=0
built=0
skipped=0

log_row() {
  printf '  %-34s %8s  %s\n' "$1" "$2" "$3"
}

# encode <src> <out> <width> <quality> <crop>
encode() {
  local src="$1" out="$2" w="$3" q="$4" crop="$5"

  if [[ $FORCE -eq 0 && -f "$out" && "$out" -nt "$src" ]]; then
    skipped=$((skipped + 1))
    total_bytes=$((total_bytes + $(stat -f%z "$out")))
    log_row "$(basename "$out")" "$(du -h "$out" | cut -f1)" "up to date"
    return
  fi

  if [[ $DRY -eq 1 ]]; then
    log_row "$(basename "$out")" "-" "would build from $(basename "$src")"
    return
  fi

  # Written the long way because macOS ships bash 3.2, where expanding an
  # empty array under `set -u` is an error.
  local -a crop_args
  if [[ "$crop" != "-" ]]; then
    crop_args=(-crop "$crop" +repage)
  else
    crop_args=(-set comment "")
  fi

  # -resize WxH> shrinks only, never enlarges, so a source narrower than the
  # target is left alone instead of being upscaled into a blurry mess.
  # sharp-yuv and the mild unsharp both matter here because these are
  # text-dense UI screenshots, where chroma noise on small type is obvious.
  magick "$src" \
      -strip -colorspace sRGB \
      "${crop_args[@]}" \
      -resize "${w}x>" \
      -unsharp 0x0.6+0.6+0.01 \
      -quality "$q" \
      -define webp:method=6 \
      -define webp:use-sharp-yuv=1 \
      "$out"

  built=$((built + 1))
  total_bytes=$((total_bytes + $(stat -f%z "$out")))
  log_row "$(basename "$out")" "$(du -h "$out" | cut -f1)" \
          "$(magick identify -format '%wx%h' "$out")"
}

mkdir -p "$OUT/projects" "$OUT/me"

echo "Projects"
for entry in "${PROJECTS[@]}"; do
  IFS='|' read -r rel slug crop <<<"$entry"
  src="$SRC/$rel"
  [[ -f "$src" ]] || { echo "  missing source: $src" >&2; exit 2; }
  for w in "${PROJECT_WIDTHS[@]}"; do
    encode "$src" "$OUT/projects/${slug}-${w}.webp" "$w" "$PROJECT_QUALITY" "$crop"
  done
done

echo
echo "Portrait"
psrc="$SRC/$PORTRAIT_SRC"
[[ -f "$psrc" ]] || { echo "  missing source: $psrc" >&2; exit 2; }
for w in "${PORTRAIT_WIDTHS[@]}"; do
  encode "$psrc" "$OUT/me/clem-${w}.webp" "$w" "$PORTRAIT_QUALITY" "-"
done

# Social preview stays JPG on purpose: Slack, LinkedIn and iMessage still
# render og:image WebP inconsistently.
#
# It is drawn rather than cropped from the portrait. The headshot source is
# only 651px, so filling a 1200x630 card with it would mean upscaling; a
# composed card stays sharp and says who this is at thumbnail size.
echo
echo "Social card"
og="$OUT/og-cover.jpg"
if [[ $DRY -eq 1 ]]; then
  log_row "og-cover.jpg" "-" "would build"
elif [[ $FORCE -eq 1 || ! -f "$og" || "$psrc" -nt "$og" ]]; then
  magick -size 1200x630 "xc:#070D1B" \
    \( "$psrc" -resize 360x360^ -gravity center -extent 360x360 \
       \( -size 360x360 xc:none -fill white -draw "circle 180,180 180,0" \) \
       -alpha set -compose DstIn -composite \) \
    -gravity east -geometry +90+0 -compose over -composite \
    -gravity northwest \
    -font Helvetica-Bold -fill "#FDFEFF" -pointsize 76 \
    -annotate +90+300 "Clem Quinones" \
    -font Helvetica -fill "#FEC544" -pointsize 34 \
    -annotate +92+360 "Senior Web Developer" \
    -font Helvetica -fill "#A9ADB8" -pointsize 27 \
    -annotate +92+412 "14+ years building Laravel platforms and APIs" \
    -fill "#FEC544" -draw "rectangle 90,455 190,459" \
    -quality 86 -strip "$og"
  log_row "og-cover.jpg" "$(du -h "$og" | cut -f1)" "1200x630"
  total_bytes=$((total_bytes + $(stat -f%z "$og")))
else
  log_row "og-cover.jpg" "$(du -h "$og" | cut -f1)" "up to date"
  total_bytes=$((total_bytes + $(stat -f%z "$og")))
fi

echo
printf 'built %d, skipped %d — %s total in assets/img/\n' \
  "$built" "$skipped" \
  "$(echo "$total_bytes" | awk '{printf "%.1f KB", $1/1024}')"
echo
echo "Card images are 16:9 via CSS object-fit. If a screenshot looks badly"
echo "framed on the site, adjust its crop in the PROJECTS manifest above."
