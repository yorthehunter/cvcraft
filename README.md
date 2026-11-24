# CVCraft

Enter resume content once as structured data, keep role-specific variants that pick from one shared library, and publish each as a web page that prints as a clean US Letter document and reads well on a phone. Also exports PDF and .docx that applicant tracking systems parse correctly.

Status: live at https://yorthehunter.github.io/cvcraft/ — [Design Leadership](https://yorthehunter.github.io/cvcraft/design-leadership/), [Design Systems](https://yorthehunter.github.io/cvcraft/design-systems/).

- [Pilot brief](docs/pilot-brief.md) — scope, success criteria, architecture, milestones, open questions
- [Decision log](docs/decision-log.md) — every choice and why
- [Changelog](CHANGELOG.md) — what changed and when
- [Parse tests](docs/parse-tests.md) — how the PDFs read to a third-party parser, before and after fixes

## Layout

```
schemas/       JSON Schemas: library, variant, private contact details
scripts/       validate.mjs, export.mjs (builds + PDFs), check-outputs.mjs, openresume-parse.mjs, publish-site.mjs
src/           Astro renderer: data loading, token transform, pages
templates/     single-column/: Resume.astro, resume.css, docx.ts, tokens.json
sample-data/   a fictional resume, for demos and tests
docs/          brief and decision log
```

Real resume data lives in a separate private repo (by default checked out at `../cvcraft-data`), never here. Without it, use the `:sample` scripts.

## Run

```bash
pnpm install
pnpm dev                 # http://localhost:4321/cvcraft/<variant>/ — reloads when data changes
pnpm dev:sample          # same, with the fictional sample
pnpm export              # validate → public build (dist/: pages + PDF + .docx) → send files (send/) → check
pnpm export:sample       # same, with the fictional sample
pnpm check               # re-run the output checks on what's already built
pnpm run publish-site    # export + checks, then publish dist/ to GitHub Pages (gh-pages branch)
node scripts/openresume-parse.mjs --parser <open-resume checkout> dist/*/*.pdf   # third-party parser test
```

## Validate

```bash
pnpm validate            # real data: $CVCRAFT_DATA or ../cvcraft-data
pnpm validate:sample     # the fictional sample
```

`dist/` is deployable: no private fields, checked on every export. `send/` holds the PDF and .docx with your phone number for sending directly; it is git-ignored and never published. PDFs need Google Chrome (set `CHROME_PATH` if it's not in the default macOS location).
