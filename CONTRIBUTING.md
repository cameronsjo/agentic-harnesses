# Contributing

This is a research repo: deep source-grounded comparison of four agentic coding harnesses, plus an interactive loop visualizer.

## Ground rules

- **Every loop claim traces to source.** Each node in a loop spec (`site/src/data/loops/<harness>.json`) carries a `sourceRef` of the form `path:line` pointing at the real harness source. If you can't cite it, don't claim it.
- **Harness sources are analyzed in place, never vendored.** They live in `sources/` (gitignored), pinned to the SHAs recorded in [`docs/methodology.md`](docs/methodology.md). Re-clone with the SHAs there to reproduce.
- **The loop spec is the single source of truth.** Both the prose docs and the visualizer read from it. Update the JSON first, then the prose.
- **Keep the node vocabulary fixed** (`input | llm | tool | approval | execute | decision | terminal`). If a harness genuinely doesn't fit, extend the schema deliberately and note it — don't overload an existing kind.
- **Scenario IDs must stay in parity** across all four harnesses (`edit-file`, `denied-tool`, `multi-tool`, `plain-answer`). The side-by-side comparison depends on it.
- **Anchor scan-words in `note` / `title` prose with `**…**`.** The visualizer renders `**bolded**` spans in loop-spec `note` and `title` strings as Artificer anchor words — bold 3–5 per note so the bolded path reads on its own. Only paired `**` is parsed; no other Markdown. The marker is the *only* formatting allowed in these fields, so the prose stays byte-identical with the markers stripped.

## Workflow

1. Pin/refresh a source in `sources/` and record its SHA in `docs/methodology.md`.
2. Read the loop, write/update `site/src/data/loops/<harness>.json` (validate against `schema.json`).
3. Update the matching `docs/harnesses/<harness>.md` profile.
4. Run the visualizer (`cd site && npm run dev`) and the schema validation before opening a PR.

## Updating for a new harness version

Bump the SHA in `docs/methodology.md`, re-read the loop, and reconcile the spec + profile. Note version-specific behavior rather than silently overwriting.
