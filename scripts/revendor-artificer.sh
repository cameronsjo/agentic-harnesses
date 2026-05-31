#!/usr/bin/env bash
# Re-vendor Artificer design-system files from the canonical repo into the SPA.
#
# Pulls the text source files (CSS/JS/JSON) from
#   cameronsjo/artificer-design-system @ main:/src/
# into site/public/artificer/. Fonts and other binary assets under
# assets/ are intentionally NOT touched — their @font-face url() paths are
# unchanged across versions, so the existing files stay.
#
# Usage: scripts/revendor-artificer.sh
set -euo pipefail

REPO="cameronsjo/artificer-design-system"
REF="main"
DEST="$(cd "$(dirname "$0")/.." && pwd)/site/public/artificer"

FILES=(
  artificer.css
  artificer-whimsy.css
  artificer-whimsy.js
  artificer-theme.js
  artificer-icons.js
  artificer-focus.js
  print.css
  tokens.json
)

echo "Re-vendoring ${#FILES[@]} files from ${REPO}@${REF}:/src/ -> ${DEST}"
for f in "${FILES[@]}"; do
  tmp="$(mktemp)"
  gh api "repos/${REPO}/contents/src/${f}?ref=${REF}" --jq '.content' \
    | base64 -d > "$tmp"
  if [[ ! -s "$tmp" ]]; then
    echo "  ! ${f}: fetched empty — aborting" >&2
    rm -f "$tmp"
    exit 1
  fi
  mv "$tmp" "${DEST}/${f}"
  echo "  ok ${f} ($(wc -c < "${DEST}/${f}" | tr -d ' ') bytes)"
done

echo "Done. --art-version in new artificer.css:"
grep -m1 -- '--art-version' "${DEST}/artificer.css" || echo "  (token not found!)"
