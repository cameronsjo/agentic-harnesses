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

# Preflight: this script fetches source via the GitHub CLI.
command -v gh >/dev/null 2>&1 || {
  echo "error: GitHub CLI (gh) is required but was not found — install it from https://cli.github.com" >&2
  exit 1
}

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

# Smallest real source file is ~1.9 KB; a floor well under that rejects an
# empty fetch *and* the JSON-null / error-body case that decodes to a few
# garbage bytes (gh's own HTTP failures are already caught by pipefail).
MIN_BYTES=200
tmp=""
trap 'rm -f "${tmp:-}"' EXIT

echo "Re-vendoring ${#FILES[@]} files from ${REPO}@${REF}:/src/ -> ${DEST}"
for f in "${FILES[@]}"; do
  tmp="$(mktemp)"
  gh api "repos/${REPO}/contents/src/${f}?ref=${REF}" --jq '.content' \
    | base64 -d > "$tmp"
  size=$(wc -c < "$tmp" | tr -d ' ')
  if (( size < MIN_BYTES )); then
    echo "  ! ${f}: fetched ${size}b (< ${MIN_BYTES}b floor) — aborting" >&2
    exit 1
  fi
  mv "$tmp" "${DEST}/${f}"
  echo "  ok ${f} (${size} bytes)"
done

echo "Done. --art-version in new artificer.css:"
grep -m1 -- '--art-version' "${DEST}/artificer.css" || echo "  (token not found!)"
