# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Decisions are in [docs/decision-log.md](docs/decision-log.md).

## [Unreleased]

### 2026-11-24 — Headline wording
- Design Leadership headline is now "Principal Product Designer • Design Engineer, Design Systems • AI-first • Enterprise SaaS" (the Doc reads "Principal Product Design • Design Engineer on Design Systems • …"). Decision log: D-056.

### 2026-11-24 — Synced with the updated Google Doc
- Design Leadership headline is now "Principal Product Design • Design Engineer on Design Systems • AI-first • Enterprise SaaS" (from the Doc, as written); Design Systems keeps its own.
- Both variants: Experience, Education, Professional Development, Tools, Skills & Expertise, Summary (the Doc's move of Areas of Expertise to the end, with Education kept after Experience).
- Kept CVCraft's parser wording where the Doc still has the older text (headings, titles, degrees, school), and "workflows".
- Decision log: added D-055.

### 2026-11-24 — ATS layout for sent files (Workday round 2)
- Brian re-tested Workday with the revised send PDF and the .docx. Both misread the name the same way and still paired each job title with the next company; degrees now mapped.
- Sent files (send build) now use an ATS layout of the same template: name, contact line, headline; each role title first with dates, company on the next line, one entry per role; full link addresses. Web page and public downloads unchanged.
- OpenResume on the new send PDFs: all four Stitch Fix roles read separately with correct titles and dates; full LinkedIn address read as the URL. Its page-joining quirk still merges Built with Modern Health and loses Education.
- All output checks pass: 78/78 blocks in sent files, 81/81 in public files.
- Decision log: added D-054. Parse-test write-up has a round 2 table.

### 2026-11-24 — Workday upload fixes
- Brian's Workday test of the send PDF misread the name, shifted every job by one, put three sections into the last job, found no degrees, and invented "Mission College". Details in `docs/parse-tests.md`.
- Send files no longer include company descriptions (D-051); the web page and public downloads keep them.
- Section order is now Skills & Expertise, Experience, Education, Professional Development, Tools, Summary; "Mission" renamed "Summary"; degrees spelled out (D-052).
- Print keeps Education, Professional Development and Tools on one page each (D-053).
- Checked: the name's font maps to text correctly, so the Workday name failure isn't an encoding problem; cause still unknown.
- OpenResume still reads name, contact, sections, titles and skills correctly; its page-joining quirk now merges Built with Modern Health and loses Education, both because they start a new page.
- Decision log: added D-051 to D-053; D-052 replaces D-031.

### 2026-11-24 — Fix: .docx dates ran into company names in Google Docs
- Brian opened a .docx in Google Drive and saw "Tive12/2024–Present". Cause: the renderer put a tab *character* inside the text, which isn't a tab in .docx (Word shows a space, Google Docs drops it). Dates now follow a real `<w:tab/>` element, aligned by the existing right tab stop at the margin.
- `pnpm check` now fails any .docx with a tab character inside text. It flagged 12 in each old file and passes the new ones.
- Confirmed in Google Docs: uploaded the public Design Systems .docx (no phone) to Drive, converted it to a Google Doc, exported a PDF and rendered it. All 12 dates sit at the right margin. The test file was then moved to trash.
- Also fixed: employer and role dates came out bold in Google Docs (inherited from the heading style); date runs now turn bold off.
- Word itself still not checked.

### 2026-11-24 — Title punctuation for parsers
- Team qualifiers now follow an en dash instead of a comma (Built and Modern Health "Staff Product Designer – Platform", and the three Stitch Fix titles); Anomalie unchanged. Brian found OpenResume dropping the Built and Modern Health titles from the send PDFs; it now reads a title for all 7 employers.
- Tested an en dash, parentheses and a pipe on scratch copies first; all three fixed it.
- Decision log: added D-050. Parse-test write-up updated.

### 2026-11-24 — M3: third-party parser test (OpenResume)
- Added `scripts/openresume-parse.mjs`, which runs the open-source OpenResume parser locally on our PDFs. Upstream code unmodified except for a Node PDF reader and one stubbed constant; the code was read before running (no network, file or eval calls).
- First run misread the name ("AREAS"), location, phone, two headings, most job titles, bullets and education. After the fixes below: name, email, phone (send only, exact), location and URL correct; 5 of 6 sections; skills found; 5 of 7 job titles; exact bullet counts for single-role employers; both degrees with schools. Write-up with before/after table in `docs/parse-tests.md`.
- Fonts: switched Archivo to the Archivo project's own static files (bundled, SIL OFL 1.1). Fontsource's files, variable and static, are named "ArchivoSemiBold" at every weight inside PDFs, so parsers read all text as bold.
- Template: section headings and contact line moved from Space Mono to Archivo (Space Mono splits into one PDF text item per word); bullets are now a real "•" character in raspberry; contact details no longer wrap mid-item (the phone number was splitting across lines); education puts the school on its own line under the degree (web page and .docx).
- Content (Brian's calls): "Areas of Expertise" → "Skills & Expertise"; MS school → "California University of Pennsylvania (now PennWest California)". The Google Doc has not been updated to match.
- Known parser limits left as is: titles followed by a comma, several roles under one employer (Stitch Fix), a section starting at the top of a page.
- Decision log: added D-047 to D-049; D-037 refined by D-048.

### 2026-11-24 — M3: PDF and .docx outputs
- Added the .docx renderer (`templates/single-column/docx.ts`), built from the render model with Word's Title and Heading 1–3 styles, a real bulleted list, right-aligned date tabs and the template's tokens. Served at `/<variant>/<name>-resume-<variant>.docx`; works in `pnpm dev` too.
- Added `pnpm export`: validate, public build with PDFs printed by headless Chrome into `dist/`, send build with PDFs and .docx in `send/`, then checks. Takes about 8 seconds.
- Added `pnpm check` (`scripts/check-outputs.mjs`): content and order of every PDF and .docx against the page (79/79 blocks for both variants), letter-spacing detection, privacy scan of the public build, private fields required in send files, page counts. Shown to catch a planted send PDF in `dist/` and spaced-out heading text.
- Fixed two parser problems the checks found (D-045): bullets were positioned, which put every bullet after the page's headings in the PDF text stream (27/79 in order before the fix); section headings were letter-spaced and extracted as "E X P E R I E N C E". Both PDFs look the same after the fix.
- Fixed: the .docx body fell back to Times 12pt in macOS Quick Look; every run now carries its font, size and color (D-043).
- Fixed: the first export hung because Chrome was started with a blocking call while the same process served the pages.
- Send builds now render files-only variants (for their files); the public build still skips them. Verified with the sample's files-only one-off.
- Download buttons on the published pages now resolve to real files.
- Decision log: added D-043 to D-046.
- Not done yet: OpenResume parser run and a real ATS upload; .docx not yet opened in Word or Google Docs (Quick Look ignores right tabs and restyles links).

### 2026-11-24 — Template revision 1: no page limit, more whitespace
- Removed the 2-page limit. `page.maxPages` is now an optional per-variant target; both real variants have none.
- Increased whitespace: line height, gaps between sections, employers, positions and bullets, and page margins. Body text back to 9.5pt. Both variants now print about 2½ pages.
- Fixed: phone-layout rules also applied to print (a printed page is narrower than 900px), which stacked the contact line and education rows in the PDF. Those rules now apply to screens only. Earlier PDFs in this changelog had this bug.
- Decision log: D-041 replaces D-008d; D-042 replaces D-039.

### 2026-11-24 — M1: template proposal and renderer
- Added the Astro renderer: loads the library and a variant, resolves every ref into a render model, and builds one static page per published variant (files-only variants are skipped; dev shows them for preview).
- Added the single-column template (`templates/single-column/`) in the portfolio's type and color, with all visual values in `tokens.json` (W3C Design Tokens) and a small transform that turns tokens into CSS variables.
- Two reading modes from one stylesheet: a US Letter sheet on wide screens and in print, and a flowing phone layout.
- Semantic, parser-friendly markup: one `h1`, `h2` sections, `article` per employer, real list bullets, `<time>` dates, real-text separators, schema.org Person JSON-LD; unlisted variants and send builds get `noindex`.
- Public and send builds: verified the phone number is absent from the public build and present only in the send build.
- Download PDF / .docx buttons (screen only). The files themselves arrive in M3, so the links 404 until then.
- Print fit: both variants first printed 3 pages. After tightening spacing and moving body text to 9.25pt, both print 2 pages with page 2 about 96% full.
- Mobile: checked at 375px with no sideways scrolling; fixed contact separators wrapping to line starts by stacking contact details on phones.
- Added a `cvcraft-dev` entry to the workspace's preview launch config (port 4330).
- Decision log: added D-035 to D-040.

### 2026-11-24 — M0: schema and content
- Added JSON Schemas for the library, variants and private contact details (`schemas/`).
- Added `pnpm validate`: schema checks plus cross-file checks (refs resolve to the right kind of item, bullets belong to their role, unique ids, stale rewordings, unused bullets). Tested by breaking a copy of the data on purpose: all six planted problems were caught.
- Added fictional sample data (`sample-data/`) with a listed variant and a files-only one-off that rewords a bullet.
- Set up the private data repo (`cvcraft-data`, sibling folder) with the real library from the resume Google Doc and two variants, Design Leadership and Design Systems. Both pass validation: 10 roles, 24 bullets, about 740 words each.
- Initialized git in both folders (nothing committed yet).
- Decision log: added D-026 to D-034; D-030 replaces D-022.
- Brief: updated the architecture and data model to match what was built; M0 marked done.

### 2026-11-24 — Open questions answered
- Named the project CVCraft; published URL will be `yorthehunter.github.io/cvcraft/`.
- Set the pilot target to 2026-12-08 and reordered the build: schema and content, template, outputs, publish, then the structured editor.
- Split the repo setup: public code with a fictional sample resume, real resume data in a private repo.
- Added PDF/.docx download buttons, a Tools section, and a per-variant sharing setting (listed, unlisted, files only).
- Resolved a conflict between download buttons and keeping the phone number off the web with two builds: public (no phone) and send (with phone).
- Decision log: added D-016 to D-025; D-021 replaces D-011; D-006 refined by D-024.
- Brief: rewrote scope, architecture diagram, milestones with dates, risks, and what's still needed.

### 2026-11-24 — Project scoped
- Added the pilot brief: problem, scope, success criteria, proposed architecture, data model sketch, milestones, risks and open questions.
- Added the decision log with 12 stated decisions (D-001 to D-008d) from the kickoff Q&A and 7 proposed defaults (D-009 to D-015) awaiting review.
- Added this changelog.
