#!/usr/bin/env bash
# Strip exact line numbers from Claude Code source refs only.
# Claude Code's source is an old leaked/recovered snapshot, so we cite it at
# file level (and frame it as leak + speculation). The other three harnesses are
# live repos pinned to SHAs, so their path:line refs stay — they're reproducible.
#
# CC refs look like  src/query.ts:1382  (path starts with src/).
# Live refs look like packages/opencode/src/...:1252  or  code_puppy/...:601
# The negative lookbehind (?<![\w/]) ensures the src/ must be token-initial,
# so the src/ inside packages/.../src/ is never matched.
set -euo pipefail
cd "$(dirname "$0")/.."

files=(
  docs/*.md
  docs/harnesses/*.md
  site/src/data/loops/claude-code.json
  site/src/data/hooks/claude-code-events.json
  site/src/data/wire/claude-code.json
  site/src/data/wire/curl-walkthrough.json
)

perl -i -pe 's{(?<![\w/])(src/[\w./-]+\.tsx?):\d+}{$1}g' "${files[@]}"

echo "Stripped CC line numbers. Remaining src/...:N refs (should be 0):"
grep -rhoE '(^|[^/[:alnum:]])src/[A-Za-z0-9._/-]+\.tsx?:[0-9]+' "${files[@]}" 2>/dev/null | wc -l | tr -d ' '
