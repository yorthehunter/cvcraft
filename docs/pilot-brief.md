# CVCraft — Pilot Brief

Started 2026-11-24. Status: **M0, M1 done; M3 outputs built, auto-checked and run through the OpenResume parser 2026-11-24; real ATS upload pending**. Pilot target: **usable by 2026-12-08**. See [decision-log.md](decision-log.md) for why each choice was made and [../CHANGELOG.md](../CHANGELOG.md) for what has shipped.

## Problem

Google Docs is the current home for my resume, and it fails in two ways:

1. **Structure drifts.** Headings, dates and bullets are styled text, not data. Applicant tracking systems (ATS) read them inconsistently, and every edit risks breaking what a parser relies on.
2. **Layout is painful.** Getting a pleasant, consistent hierarchy takes fiddling, and it has to be redone for every version.

On top of that I keep two role-specific resumes (design leadership, design systems) plus one-off tailored copies, and they drift apart because each is a separate document.

## Goal

A tool where resume content is entered once as structured data, rendered through a designed template, and published as a web page that prints as a clean document and reads well on a phone. Variants pick from one shared library, so a fix in one place fixes every version.

## Pilot scope

### In

- **Structured editor** for one master library: profile, summary, roles, bullets, education, skills, tools. (Lands after the first application; see build order.)
- **Variants** that pick, reorder and reword library items without copying them.
- **Two previews** side by side: print (US Letter, paged, no page limit, with page-break markers and a page count; a variant may set an optional page target) and mobile (phone-width, responsive).
- **One single-column template**, designed by Claude from the portfolio's type (Archivo, Literata) and refined by Brian, with its visual values in a token file.
- **Outputs**: published web page per variant, PDF, and .docx, in two builds: a public build (no phone) and a send build (with phone).
- **Download buttons** for PDF and .docx on the web page, hidden when printed.
- **Per-variant sharing**: listed, unlisted (`noindex`, not linked) or files only (never published).
- **Publishing** at `yorthehunter.github.io/cvcraft/`.
- **Parse testing** of PDF and .docx outputs.

### Out (for now)

- Figma import (the token-driven template keeps the door open; see D-004, D-013).
- AI features: importing, tailoring to a posting, ATS keyword checks (D-007).
- Accounts, other users, hosted database (designed not to block them; D-001, D-012).
- Two-column layouts, A4.
- Plain-text export.
- Web-only content such as case-study links or expandable detail.

## Success criteria

The pilot works when all three are true:

1. **Real variants rebuilt.** The Design Leadership and Design Systems resumes live in the tool, and one is sent in a real application.
2. **Parses cleanly.** The PDF and .docx for both variants go through ATS-style parsers with name, contact, role titles, companies, dates and bullets extracted correctly (method below).
3. **Looks portfolio-grade.** Print and mobile versions are polished enough to feature in a case study.

## How it fits together (proposed)

```
CVCraft repo (public)                         cvcraft-data (separate private repo)
  schemas/      library, variant, private       library.json    all content: profile, summaries, roles,
  scripts/      validate (more to come)                         bullets, education, skills, tools, courses
  app/          editor + renderer (M1, M2)      variants/       one file per variant
  templates/    single-column + tokens.json     contact.private.json   phone and anything never published
  sample-data/  fictional resume for demos
  docs/         brief, decision log
        │                                              │
        └──────────────── build (local) ───────────────┘
                              │
          public build ──► web pages + downloadable PDF/.docx (no phone)
                              └──► pushed to the CVCraft repo's gh-pages branch
                                   → yorthehunter.github.io/cvcraft/<variant>
          send build   ──► PDF/.docx with phone, saved locally, never published
```

- **Editor runs locally** (a dev server that reads and writes the JSON files). Publishing is a static build, so nothing about editing is exposed online. (D-010)
- **Code is public, real data is private.** The public repo carries a fictional sample resume for demos and the article; only finished, published pages of the real resume reach the public site. (D-018, D-021)
- **Storage sits behind a small interface** so files can be swapped for a database when others use it. (D-012)

### Data model

The schemas in [`schemas/`](../schemas) are the contract: `library.schema.json`, `variant.schema.json`, `contact-private.schema.json`. In short:

```jsonc
// library.json (excerpt): employers hold positions, positions hold bullets
{
  "id": "work.stitch-fix", "name": "Stitch Fix", "startDate": "2012", "endDate": "2020",
  "positions": [
    { "id": "pos.sf.lead-platform", "position": "Lead Product Designer, Platform",
      "startDate": "2019", "endDate": "2020",
      "highlights": [ { "id": "hl.sf.mode", "text": "…" } ] }
  ]
}

// variants/design-systems.json (excerpt)
{
  "id": "design-systems",
  "sharing": "listed",                 // "listed" | "unlisted" | "files-only"
  "page": { "size": "letter" },     // optional "maxPages" target; no limit by default
  "label": "…",                        // headline override; falls back to the library
  "sections": [
    { "type": "work", "heading": "Experience", "items": [
      { "ref": "work.tive" },          // no positions listed = everything, library order
      { "ref": "work.modern-health", "positions": [
        { "ref": "pos.mh.staff", "highlights": [
          { "ref": "hl.mh.vita" },
          { "ref": "hl.mh.global-nav", "text": "Reworded…", "overrideOf": "Original text…" }
        ]}
      ]}
    ]}
  ]
}
```

`pnpm validate` checks the data against the schemas, then checks what a schema can't: every ref points at the right kind of item, bullets belong to the role they're listed under, ids are unique, and rewordings whose original text has since changed are flagged.

- Field names follow the open [JSON Resume](https://jsonresume.org/schema) vocabulary where it fits, so import/export with other tools stays possible. The library/variant layer is our addition. (D-009)
- A reworded bullet stores only the override. If the master text later changes, the editor flags the override as possibly stale.
- Sections, in order: experience, education, professional development, tools, skills ("Skills & Expertise"), summary ("Summary"). (D-030, D-052, D-055)
- Contact fields carry a visibility setting per build: phone appears only in the send build. (D-006, D-024)

### Making it readable by machines

- Semantic HTML: name as the only `h1`, standard section headings as `h2` ("Experience", "Education", "Skills", "Tools"), one `article` per role, bullets as real list items, dates in `<time datetime>`.
- Single column, reading order equals visual order, no tables or text in images. (D-005)
- schema.org `Person` JSON-LD on the web page.
- PDF from the print stylesheet with embedded fonts, so extracted text is real text in the right order. (D-015)
- .docx built from the data, not converted from HTML, using Word's Heading 1/2 and list styles. It follows the template's type and spacing but is not a pixel match. (D-014)

### Parse-testing method

For each variant, PDF and .docx:

1. Automated, on every `pnpm export` (D-044): extract text from each PDF (pdf.js) and .docx (mammoth) and require every block of the web page, in order; fail on letter-spaced text and on private fields in public files.
2. Run the PDF through the OpenResume parser locally (`scripts/openresume-parse.mjs`, D-047) and check the extracted fields. Done 2026-11-24: see [parse-tests.md](parse-tests.md).
3. Test-upload to at least one real ATS application form (Greenhouse, Lever or Workday) and compare the auto-filled fields.

Results go in the changelog with screenshots, since they double as case-study evidence.

## Build order and dates

The two-week target means the structured editor comes after the first real application. Until then, content is edited in the JSON files directly, checked against the schema. (D-016, D-017)

| # | Milestone | Done when | Target |
|---|---|---|---|
| M0 | Schema and content | Library and variant schemas exist; both resumes entered from the Google Doc (the current source of truth, not the older .docx files); fact conflicts resolved | 2026-11-27 · **Done 2026-11-24** |
| M1 | Template and renderer | Template proposed and refined; both variants render as web pages with working print and mobile layouts and download buttons | 2026-12-02 · **Done 2026-11-24** (revised: no page limit, more whitespace) |
| M3 | Outputs | Public and send builds of PDF and .docx; parse tests pass | 2026-12-05 · **Built, auto-checked and OpenResume-tested 2026-11-24 ([results](parse-tests.md)); real ATS upload pending** |
| M4 | Publish and use | Variants live at `/cvcraft/`; one used in a real application | 2026-12-08 |
| M2 | Editor | Structured editing, variant picking/reordering/rewording, print + mobile preview, page count and page-break markers | After 2026-12-08 |

Milestone numbers keep their original meaning; only the order changed.

## Risks and spikes

- ~~PDF text order at page tops~~ resolved: caused by positioned bullet markers; fixed and now checked automatically (D-045).
- **.docx in real Word.** Google Docs checked and correct (2026-11-24, after fixing tabs). Word itself not yet opened.
- ~~Print pagination preview~~ resolved: measure the sheet and print with headless Chrome; no polyfill (D-040).
- **.docx fidelity.** Word's layout model differs from CSS; expect a simpler look. Acceptable because parsing matters more there (D-014).
- **Leaking private data.** The public build must never include the phone number or unpublished variants. M3 adds an automated check of the built output before anything is pushed.
- **URL root.** `yorthehunter.github.io/cvcraft/` itself needs something: a CVCraft project page (good for the article) or a redirect to the main variant. Decide in M4.

## Still needed from Brian

1. **M0 content review**: the `notes` in each variant file list three calls to confirm: the Design Systems headline, Modern Health bullet order in both variants, and the Anomalie rewording in Design Leadership.
2. **Template review** (M1): mark up the proposed design.
3. **Proposed defaults**: accept or change D-009 to D-015, D-017, the publishing mechanics in D-021, and D-026 to D-028 and D-034 in the decision log.
