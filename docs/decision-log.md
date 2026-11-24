# Decision Log

Every meaningful choice, with its reasoning, so the project can be explained later (portfolio case study, article).

**Source** says where a decision came from:
- **Stated** — Brian decided it.
- **Defaulted** — Claude recommended it and it stands until Brian accepts or changes it. Defaulted decisions start as *proposed*.

**Status**: proposed, accepted, replaced, rejected. Decisions are never deleted; a changed decision gets a new entry that replaces the old one and points back to it.

---

## D-001 · Built for me now, others later
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The pilot is single-user with no accounts, but avoids choices that would block other users later.
- **Why**: Fastest path to a working tool, while keeping the option to turn it into a product.
- **Affects**: data model (no hard-coded owner), storage interface (D-012).

## D-002 · Structured editor, not free text
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Content is edited as separate fields (role, company, dates, bullets), not as a free-form document or Markdown.
- **Why**: The core failure of Google Docs is structure that drifts. Fields make the structure impossible to break and give parsers consistent data.
- **Alternatives considered**: Markdown with conventions (fast, easy to break); paste and AI-structure (deferred with AI, D-007); raw JSON editing.

## D-003 · One master library; variants pick from it
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: All roles and bullets live once in a master library. Each variant selects items, orders them, and may reword a bullet as a variant-only override.
- **Why**: Separate copies drift. A typo fixed in the master is fixed everywhere; a rewording stays local to the variant that needs it.
- **Alternatives considered**: independent copies; forks that pull master updates like a git merge.

## D-004 · Figma import deferred
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: No Figma import in the pilot. Templates are hand-built first.
- **Why**: Get the core (structure, variants, output) right before automating the look.
- **Follow-up**: D-013 keeps templates token-driven so Figma variables can map onto them later.

## D-005 · Single-column first template
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The pilot template is one column; hierarchy comes from type and spacing, not columns.
- **Why**: Most reliably parsed by ATS (reading order equals visual order) and reflows to mobile without rearranging.

## D-006 · Phone number only in sent files
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The public web page shows email, LinkedIn, portfolio and city. Phone appears only in PDF and .docx.
- **Why**: Keeps a personal number off a public, indexable page while still giving recruiters it in the files they receive.
- **Affects**: contact fields carry per-output visibility; repo visibility (resolved by D-018).
- **Refined by**: D-024, after download buttons (D-023) made some files public.

## D-007 · No AI features in the pilot
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: No AI importing, tailoring or ATS checking in the pilot.
- **Why**: Keep the pilot about structure, layout and output quality. AI tailoring is a natural next phase once the library exists to pick from.

## D-008 · Outputs: web page, PDF, .docx
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Each variant produces a published web page, a PDF and a .docx. Plain text is out for now.
- **Why**: The web page is the primary artifact; PDF covers most uploads; .docx covers ATS and forms that parse Word best or require it.

## D-008a · Data in files under git
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Library and variants are JSON files in a git repo, validated by a schema.
- **Why**: Free version history, diffable changes, no infrastructure; easy to move into a database later.

## D-008b · Published under the portfolio domain
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Published variants live under the portfolio site; one-off variants are unlisted (not linked, `noindex`).

## D-008c · Pilot success criteria
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The pilot succeeds when (1) both real variants are rebuilt and one is used in an application, (2) PDF and .docx parse cleanly, (3) print and mobile look portfolio-grade. A sub-15-minute one-off was not chosen as a criterion.

## D-008d · US Letter, up to two pages
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Replaced by D-041
- **Decision**: Print targets US Letter, maximum two pages, with page-break markers and an overflow warning in the editor.

---

## D-009 · Build on the JSON Resume vocabulary
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Use JSON Resume field names where they fit, adding our own library/variant layer on top.
- **Why**: An open, widely used schema makes import/export with other tools possible and avoids inventing names for solved problems.
- **Alternatives**: fully custom schema (more freedom, no interoperability).

## D-010 · Editor runs locally; publishing is a static build
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The editor is a local dev server that reads and writes the JSON files. Published pages are static files.
- **Why**: Follows from file storage (D-008a) and single-user (D-001): no login, no server to secure, nothing editable online.

## D-011 · Publish as a GitHub Pages project site at `/resume/`
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Replaced by D-021
- **Decision**: A separate repo deployed with GitHub Pages, which serves it at `yorthehunter.github.io/<repo-name>/`, i.e. under the portfolio domain.
- **Why**: Meets D-008b without coupling the resume build to the portfolio's Astro build or touching the portfolio repo.
- **Note**: The repo name sets the URL path, so it's tied to the naming question.

## D-012 · Storage behind an interface
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The editor talks to storage through a small load/save interface; the pilot implements it with files.
- **Why**: Satisfies "others later" (D-001) at almost no cost now.

## D-013 · Templates take their look from a token file
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Each template reads type scale, color, spacing and page margins from a `tokens.json` in W3C Design Tokens format, the same format as the headless design system project.
- **Why**: Separates layout from look, makes new themes cheap, and gives future Figma import (D-004) a clear target: Figma variables map to tokens.

## D-014 · .docx is generated from data, not converted from HTML
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The .docx is built directly from the library/variant data using Word's built-in heading and list styles. It follows the template's type and spacing but is not a pixel match to the web/PDF version.
- **Why**: HTML-to-Word conversion produces fragile, oddly styled documents that parse badly. Word's native styles are what parsers expect; parsing matters more than visual parity in this format.

## D-015 · PDF is printed from the published page
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The PDF is produced by headless Chromium printing the web page with its print stylesheet.
- **Why**: One layout source: the PDF is exactly what "Print" in a browser gives, so the print preview, the browser print and the PDF never disagree.

---

## D-016 · Pilot usable within two weeks
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The pilot must be usable for a real application by 2026-12-08.
- **Why**: There's an application coming up that should go out with the new resume.
- **Affects**: build order (D-017).

## D-017 · Editor comes after the first application
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Build in the order M0 (schema, content) → M1 (template, renderer) → M3 (outputs) → M4 (publish), then M2 (structured editor). Until the editor exists, content is edited in the JSON files directly, checked against the schema.
- **Why**: Two weeks (D-016) isn't enough for everything. The application needs good output, not a good editor; the editor is the bigger build and benefits from using the renderer first.
- **Note**: This delays D-002 rather than replacing it. The structured editor is still part of the pilot.

## D-018 · Public code, private data
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The CVCraft repo (code, templates, docs, logs) is public. The real library and variants live in a separate private repo. The public repo ships a fictional sample resume.
- **Why**: The article and portfolio can link to real code and the decision log, while personal data and unpublished variants stay private.

## D-019 · Claude proposes the template; Brian refines
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Claude designs the first single-column template as a live page, based on the portfolio's type (Archivo, Literata). Brian marks it up and Claude revises.
- **Why**: Fastest route to a good design inside two weeks, and it keeps the resume visually tied to the portfolio.

## D-020 · Name: CVCraft
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The project is called CVCraft. The working folder is still `resume-designer` until the repo is created.

## D-021 · Publish at `yorthehunter.github.io/cvcraft/`
- **Date**: 2026-11-24 · **Source**: Stated (URL) + Defaulted (mechanics) · **Status**: Accepted (URL), Proposed (mechanics)
- **Replaces**: D-011.
- **Decision**: Published variants live at `yorthehunter.github.io/cvcraft/<variant>`. A local build combines the public code with the private data and pushes only the finished public pages to the CVCraft repo's `gh-pages` branch.
- **Why**: Brian chose the URL over a plainer `/resume/`, so one repo serves the code and the site. Pushing built pages keeps private data out of the public repo (D-018) and avoids needing a paid GitHub plan, which publishing Pages from a private repo requires.
- **Open**: what the root `/cvcraft/` shows (project page or redirect), decided in M4.

## D-022 · Sections: summary, experience, education, skills, tools
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Replaced by D-030
- **Decision**: The pilot supports five sections. Tools is separate from skills (e.g. Figma, Claude, React).
- **Alternatives considered**: selected work, speaking/writing.

## D-023 · Web page has PDF and .docx download buttons
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Each published page has PDF and .docx download links, hidden when printed. No other web-only content in the pilot.
- **Alternatives considered**: case-study links per role, expandable extra detail.
- **Conflict raised**: public downloads would expose the phone number (D-006). Resolved by D-024.

## D-024 · Two builds: public and send
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The public build (web page and its downloadable files) leaves the phone out. The send build (PDF/.docx exported for sending directly) includes it and is never published.
- **Why**: Keeps both D-006 (no phone on the web) and D-023 (download buttons).
- **Affects**: build pipeline; an automated check that no public output contains private fields.

## D-025 · One-off variants choose how they're shared
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Each variant has a sharing setting: listed, unlisted (`noindex`, not linked), or files only (never published).
- **Why**: Some tailored versions are worth a link to send; others should only ever go out as an attachment.

---

## D-026 · One library file
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: All library content lives in one `library.json` (about 200 lines), not one file per section as first sketched.
- **Why**: Until the editor exists (D-017), content is edited by hand. One file with one schema is easier to edit, search and validate. The editor can split it later if needed.

## D-027 · Employers hold positions
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: An employer has one or more positions, and each position has its own bullets. This differs from JSON Resume, which repeats the company for every position.
- **Why**: The Stitch Fix tenure is 8 years and 4 titles under one company heading. Nesting matches how the resume reads, and an exporter can flatten it to JSON Resume.

## D-028 · Leaving out a list means "everything, in library order"
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: In a variant, a section, employer or position with no list of picks includes every item from the library in library order. A list, when present, is exact.
- **Why**: Keeps variant files short and only as detailed as they need to be. The trade-off: a new bullet added to the library shows up in every variant that doesn't list bullets for that role. Validation reports unused bullets so nothing slips in or out unnoticed.

## D-029 · Two variants: Design Leadership and Design Systems
- **Date**: 2026-11-24 · **Source**: Stated (which variants) + Defaulted (how) · **Status**: Accepted (which), Proposed (how)
- **Decision**: M0 sets up Design Leadership and Design Systems only. The combined Player-Coach Google Doc isn't kept as its own variant. Both use the Google Doc's current wording. Bullet order comes from the older track-specific .docx files. Leadership keeps the Doc's headline; Systems reorders the Doc's three headline phrases to lead with systems.
- **Open**: three calls listed in each variant's `notes` (Systems headline, Modern Health bullet order, one Anomalie rewording taken from the old Leadership .docx).

## D-030 · Six sections, adding Professional Development
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Replaces**: D-022.
- **Decision**: Sections are summary, skills, experience, professional development, tools and education.
- **Why**: The Google Doc lists the Maven AI course, and recent AI training supports the positioning.

## D-031 · Mission stays at the end
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Replaced by D-052 (renamed Summary; still at the end)
- **Decision**: The first-person Mission text is stored as a summary and shown as the last section, under the heading "Mission", as in the Google Doc.
- **Alternatives considered**: summary at the top (where parsers and readers usually expect it); stored but hidden.

## D-032 · No team size for Tive
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The Tive role keeps "a distributed product design team of senior designers" with no number.
- **Why**: Team-size figures elsewhere don't agree ("hired two designers", "four senior designers"); the resume avoids the conflict.

## D-033 · The Google Doc is the content source
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Library text is taken word for word from the resume Google Doc, not the older .docx files. The Doc already settles the degree (BA, Telecommunications, Penn State), MS school ("Cal U (now PennWest California)"), the personalized home result, and "first designer at Stitch Fix".
- **Normalizations made while structuring** (review):
  - Stitch Fix titles drop text that repeated the company: "Senior UX Designer, Expert-Use at Stitch Fix" → "Senior UX Designer, Expert-Use"; "Interaction Designer, Stitch Fix early-stage startup" → "Interaction Designer". The startup detail moved into the bullet, using the old .docx wording: "First designer at Stitch Fix, then an early-stage startup."
  - Added missing end periods to three company descriptions and the WMS bullet.
  - The phone number comes from the old .docx (the Doc no longer lists one) and lives only in `contact.private.json`.

## D-034 · Rewordings remember the original; validation checks links
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: A reworded bullet stores the library text it replaced (`overrideOf`). `pnpm validate` warns when the library text has changed since, and fails on broken refs, bullets listed under the wrong role, duplicate ids and schema errors.
- **Why**: Delivers the "possibly stale" warning from the brief without needing an editor, and makes hand-editing JSON safe enough for the two-week window.

---

## D-035 · Contact links show the address, not a label
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: LinkedIn and portfolio links show their short address (`linkedin.com/in/borudesign`, `yorthehunter.github.io`) instead of the Google Doc's "LinkedIn" and "Portfolio" labels. A profile can still set its own label.
- **Why**: Some parsers and plain-text pastes drop link targets. A visible address survives every output.

## D-036 · Renderer: Astro static site
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Pages are rendered by Astro 5 into static HTML. The dev server reloads the browser when files in the private data folder change, so hand edits show up immediately.
- **Why**: Same framework as the portfolio; its dev server is the natural base for the M2 editor, and static output deploys straight to GitHub Pages (D-021).

## D-037 · Template look: the portfolio's identity
- **Date**: 2026-11-24 · **Source**: Defaulted (Claude's proposal under D-019) · **Status**: Accepted, refined by D-048
- **Decision**: Name in Archivo Black; body in Archivo; section labels, contact line and dates in Space Mono; raspberry (#c4005c) only for section labels, separators and bullet squares; ink text on a white sheet. Fonts are self-hosted, so PDFs embed them.
- **Why**: Ties the resume to the portfolio a recruiter likely saw first, while keeping the page quiet: one accent color, hierarchy from weight and size.

## D-038 · One stylesheet, two reading modes
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Wide screens (900px and up) and print show a US Letter sheet with print sizes, zoomed 1.25× on screens 1200px and wider. Phones get a flowing layout with 16px text, dates under titles, and contact details stacked.
- **Why**: The desktop view is a faithful print preview with no separate code path, and the phone view is built for reading rather than shrinking a page.

## D-039 · Print body text at 9.25pt
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Replaced by D-042
- **Decision**: Print and sheet body text is 9.25pt with 1.3 line height and margins of about 0.44in top/bottom and 0.56in sides.
- **Why**: At 9.5pt both variants printed 3 pages, with only part of the Mission section on page 3. Tightening spacing first still left 5 lines over. At 9.25pt both fit on 2 pages, with page 2 about 96% full.
- **Alternatives**: shorten content, move Mission into the library only (D-031 keeps it), smaller margins.
- **Watch**: about two lines spare. Adding a bullet will likely push to page 3 until something else is trimmed.

## D-040 · Pagination: measure, don't polyfill
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: No paged-media polyfill (Paged.js). The on-screen sheet uses print sizes and width, so its height predicts page count, and real page count is checked by printing with headless Chrome. Page-break markers in the editor (M2) will come from that measurement.
- **Why**: Resolves the M1 spike. A polyfill rewrites the DOM and would make the editor preview differ from the published page; measuring keeps one rendering path.

---

## D-041 · No page limit
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Replaces**: D-008d.
- **Decision**: Printed resumes are US Letter with no page limit. A variant may set an optional page target (`page.maxPages`); the editor (M2) shows the page count and warns only when a variant runs past its own target.
- **Why**: Readability matters more than squeezing onto two pages. Fitting two pages had forced 9.25pt text and tight spacing (D-039).

## D-042 · More whitespace, 9.5pt body
- **Date**: 2026-11-24 · **Source**: Stated (more whitespace) + Defaulted (values) · **Status**: Proposed, awaiting review
- **Replaces**: D-039.
- **Decision**: Body text back to 9.5pt (D-039's only reason for 9.25pt was fit). Line height 1.3 → 1.45; space between sections 1.3 → 2.0em, between employers 0.85 → 1.35em, between positions 0.6 → 0.8em, between bullets 0.12 → 0.3em; page margins about 0.6in top/bottom and 0.65in sides. Small gaps under company lines and above bullet lists also grew.
- **Result**: both variants print about 2½ pages, with page breaks falling between employers or between bullets.

---

## D-043 · .docx uses Arial, set on every run
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The .docx uses Arial for text and Arial Black for the name instead of Archivo, and every text run carries its own font, size and color.
- **Why**: Recipients won't have Archivo installed, and Word substitutes unpredictably; Arial and Arial Black ship with Windows and macOS. Document-level defaults were ignored by macOS Quick Look (and can be by Pages and Google Docs), which fell back to Times at 12pt, so nothing is left to defaults.

## D-044 · Every export checks its own outputs
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: `pnpm export` builds everything, then `check-outputs` extracts the text of every PDF (pdf.js) and .docx (mammoth) and requires every text block of the web page, in order. It also fails on letter-spaced text, on any private field found in a public file, and on any private field missing from a send file. Page counts are reported.
- **Why**: Turns "parses cleanly" into something checked on every change, not once. Uses cross-platform libraries rather than macOS-only tools.
- **Verified**: the checks were shown to fail on a planted send PDF in the public folder and on spaced-out heading text, and they caught two real problems on their first run (D-045).

## D-045 · Parser-safe CSS: no positioned text, no letter spacing
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: Templates must not position elements that hold text (or their markers) and must not letter-space text.
- **Why**: Both broke the PDF for parsers while looking fine:
  - Bullets used `position: relative` for their square markers. Chrome paints positioned boxes after everything else, so in the PDF's text stream every bullet on a page came after that page's headings. A parser reading in order would have attached Tive's last bullets to Built. Only 27 of 79 blocks were in order. Markers are now inline boxes.
  - Section headings had 0.12em letter spacing. Text extractors read them as "E X P E R I E N C E", which a parser can't match to a section. Tracking is now 0.
- **Note**: the M1 oddity where Anomalie's dates appeared after its description in extracted text was the first problem.

## D-046 · Send files live in `send/`, files-only variants render only there
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: The send build renders every variant, including files-only ones, prints PDFs, and keeps only the PDF and .docx in `send/<variant>/` (git-ignored). Its intermediate pages are deleted after the checks run. The public build skips files-only variants entirely.
- **Why**: Files-only variants need files but must never get a page (D-025); keeping send files out of `dist/` means a deploy can't pick them up.

---

## D-047 · Third-party parser test: OpenResume, run locally
- **Date**: 2026-11-24 · **Source**: Stated (run locally) + Defaulted (method) · **Status**: Accepted
- **Decision**: Test PDFs with the open-source OpenResume parser, run on this machine with `scripts/openresume-parse.mjs`. The upstream code runs unmodified except for a Node version of its PDF reader and a stub for one Redux constant. It's not part of `pnpm export`, because it needs a checkout of the OpenResume repo.
- **Why**: A parser written by someone else catches what our own checks can't. Running locally means the resume never leaves the machine. Full results in [parse-tests.md](parse-tests.md).

## D-048 · Parser-safe type and markers
- **Date**: 2026-11-24 · **Source**: Defaulted (fonts: Stated, official Archivo files) · **Status**: Proposed
- **Refines**: D-037.
- **Decision**:
  - Archivo comes from the Archivo project's own static files (Regular, Medium, SemiBold, Bold; SIL OFL 1.1, bundled in `templates/single-column/fonts/`). The variable font and Fontsource's files are named "ArchivoSemiBold" at every weight inside the PDF.
  - Section headings and the contact line use Archivo Bold and Archivo Regular. Space Mono is kept only for dates, because pdf.js splits Space Mono into one item per word whatever the CSS.
  - Bullets are a real "•" character in raspberry, drawn inline.
  - Contact details wrap only as whole units.
  - Education shows the school on its own line under the degree, on the web page and in the .docx.
- **Why**: Each fixed a field the OpenResume parser misread (name, phone, location, headings, job titles, bullets, education). The look changes slightly: round bullets instead of squares; sans-serif headings and contact line instead of mono.

## D-049 · Two wording changes for parsers
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The skills heading is "Skills & Expertise" (was "Areas of Expertise"). The MS school is "California University of Pennsylvania (now PennWest California)" (was "Cal U (now PennWest California)").
- **Why**: Parsers find a skills section by the word "skill" and a school by words like "University". These are the first wording changes to the Google Doc's text (D-033).
- **Google Doc**: left as is on purpose (Brian, 2026-11-24). CVCraft's library is now the more parser-friendly source; the Doc keeps the original wording.

---

## D-050 · Team qualifiers use an en dash
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: A title's team qualifier follows an en dash, not a comma: "Staff Product Designer – Platform" (Built, Modern Health), "Lead Product Designer – Platform", "Lead Front End Engineer – Client Experience", "Senior UX Designer – Expert-Use" (Stitch Fix). Anomalie keeps "Principal Design Engineer, Head of Design", where the comma joins two roles.
- **Why**: OpenResume matches job-title words exactly after splitting on spaces, so "Designer," never matched and Built and Modern Health had no title (Brian confirmed this on the send PDFs). An en dash, parentheses and a pipe all fixed it on test copies; the en dash reads most like a team qualifier. Stitch Fix's titles already parsed and changed only for consistency.
- **Trade-off**: LinkedIn and Wellfound still use ", Platform". Same titles, different punctuation.

---

## D-051 · Sent files leave out company descriptions
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The send build (PDF and .docx you send directly) omits the one-line company descriptions. The web page and its public downloads keep them.
- **Why**: In Workday, the description line between the company and the job title ended each entry early. Every job shifted by one (job 1 = "Tive" with no title; job 2 = Tive's title paired with "Built Technologies"). Only Kemists and ModCloth, which have no description, were paired correctly.

## D-052 · Section order, Summary heading, spelled-out degrees
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Replaces**: D-031.
- **Decision**: Sections run Skills & Expertise, Experience, Education, Professional Development, Tools, Summary. "Mission" is renamed "Summary" and stays last. Degrees read "Master of Science" and "Bachelor of Arts" instead of "MS" and "BA".
- **Why**: Workday didn't recognize Professional Development or Tools as headings and put them in the last job's description; with Education right after Experience, anything it misses lands after Education instead. It turned the MISSION heading after Education into a school ("Mission College"). It found both schools but no degrees, and maps spelled-out degrees more reliably.

## D-053 · Short sections stay on one page
- **Date**: 2026-11-24 · **Source**: Defaulted · **Status**: Proposed
- **Decision**: In print, Education, Professional Development and Tools don't split across pages.
- **Why**: Easier to read. It doesn't fix OpenResume's page-joining quirk (whatever starts a page merges into what came before; currently that's Education). That's accepted as a limit of that parser, since layout changes only move the problem.

---

## D-054 · Sent files use an ATS layout
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: The send build renders the same template in an "ATS layout": name, then contact line, then headline; each role written title first with its dates, the company on the next line, then its bullets (Stitch Fix's four roles each repeat "Stitch Fix"); profile links shown as full addresses (`https://www.linkedin.com/in/borudesign`). The web page and its public downloads keep the designed layout. Together with D-051 (no company descriptions in sent files), sent files now differ from the web page on purpose.
- **Why**: Workday round 2, with both the PDF and the .docx:
  - It took the headline as the name in both formats, which rules out the PDF itself. Most likely it takes the line just above the contact details as the name.
  - It paired each job title with the company on the line after it, even without company descriptions. Company-first order shifts every job by one.
  - It left LinkedIn empty with the short address. The full address is an experiment, since Workday's rule isn't documented.
- **Kept**: the MS school stays "California University of Pennsylvania (now PennWest California)" (Brian's call), although Workday couldn't match it to its school list in the .docx.
- **Side effect**: OpenResume now reads all four Stitch Fix roles separately, with correct titles and dates.

---

## D-055 · Synced from the updated Google Doc
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Decision**: Brian updated the resume Google Doc and asked for CVCraft to match it. Taken from the Doc:
  - **Headline**, for Design Leadership only: "Principal Product Design • Design Engineer on Design Systems • AI-first • Enterprise SaaS", written as in the Doc. It is now the library default; Design Systems keeps its own headline.
  - **Section order**: the Doc moved Areas of Expertise near the end. Both variants now run Experience, Education, Professional Development, Tools, Skills & Expertise, Summary. Education stays right after Experience for Workday (D-052); the Doc itself has it after Tools.
- **Not taken**, by Brian's choice: the Doc's pre-parser wording (Areas of Expertise and Mission headings, comma titles, MS/BA, "Cal U", "Expert-Use at Stitch Fix") and its one-word edit "AI-assisted review workflow" (CVCraft keeps "workflows").
- **Result**: all output checks pass. OpenResume reads both degrees with schools again; its page-joining quirk now merges Anomalie into Modern Health in the send PDF, where Anomalie starts page 2.

---

## D-056 · Headline reads "Principal Product Designer"
- **Date**: 2026-11-24 · **Source**: Stated · **Status**: Accepted
- **Refines**: D-055.
- **Decision**: The Design Leadership headline reads "Principal Product Designer • Design Engineer, Design Systems • AI-first • Enterprise SaaS". The Google Doc still says "Principal Product Design • Design Engineer on Design Systems • …".
