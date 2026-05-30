#!/usr/bin/env bash
# One-shot: rewrite the wrong author/committer email on existing commits.
# Safe because nothing is pushed (no remote). Preserves messages and dates.
set -euo pipefail

WRONG="csjo00@gmail.com"
RIGHT="cameronsjo@users.noreply.github.com"
NAME="Cameron Sjo"

# Make future commits in this repo use the right identity.
git config user.name "$NAME"
git config user.email "$RIGHT"

FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter "
if [ \"\$GIT_AUTHOR_EMAIL\" = \"$WRONG\" ]; then export GIT_AUTHOR_EMAIL=$RIGHT; fi
if [ \"\$GIT_COMMITTER_EMAIL\" = \"$WRONG\" ]; then export GIT_COMMITTER_EMAIL=$RIGHT; fi
" -- --all
