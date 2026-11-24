# Parse tests

How CVCraft's PDFs read to a resume parser, and what changed because of it. Evidence for the case study.

## Method

- **Parser**: [OpenResume](https://github.com/xitanggg/open-resume) (commit `4f8255a`, Oct 2024), an open-source, ATS-style parser for single-column English resumes. It reads PDF text items with pdf.js, groups them into lines and sections, and scores candidate text for each field (name, email, job title, school…).
- **How it ran**: locally, with `scripts/openresume-parse.mjs`. Upstream parser code ran unmodified, except for two swaps: a Node version of its PDF reader (same steps) and a stub for one Redux constant.
- **Files**: the Design Systems and Design Leadership PDFs, public (no phone) and send (with phone) builds. Both variants produced the same results; Design Systems is shown.
- **Date**: 2026-11-24.

## Results

| Field | First run | After fixes |
|---|---|---|
| Name | "AREAS" ✗ | Brian Cleveland ✓ |
| Email | ✓ | ✓ |
| Phone (send build) | not found ✗ | found, exact ✓ |
| Phone (public build) | absent ✓ | absent ✓ |
| Location | "WCAG accessibility, AI" ✗ | Pittsburgh, PA ✓ |
| URL | ✓ | ✓ |
| Sections recognized | 4 of 6 | 5 of 6 |
| Skills | 0 lines ✗ | found ✓ |
| Job titles | 2 of 7 employers | 7 of 7 (after the en dash change, D-050) |
| Bullets per role | wrapped lines counted as bullets ✗ | exact for every single-role employer ✓ |
| Education | 1 entry, no school ✗ | 2 entries, degree + school ✓ |

## What was wrong, and the fix

Every cause was in how the PDF was built, not the words. All of it looked fine to a person.

1. **Space Mono splits into one text item per word.** Headings ("AREAS", "OF", "EXPERTISE"), the phone number ("(412)", "848-…") and "Pittsburgh," / "PA" each became several items, and the parser matches each of those as a single item. No CSS setting changed this (tested). → Headings and contact details moved to Archivo; Space Mono stays only on dates, which are one word each.
2. **The Archivo files called every weight "ArchivoSemiBold".** Both the variable font and Fontsource's static files are named this way inside, so parsers that read font names saw all text as bold. That defeated name scoring and splitting entries by weight. → Switched to the unmodified static files from the Archivo project, which are named Archivo-Regular, -Medium, -SemiBold and -Bold.
3. **Bullets were drawn shapes, not characters.** The parser finds a role's bullets by looking for characters like "•". With none, it couldn't tell title/company/date lines from bullets, and it counted every wrapped line as a bullet. → Bullets are a real "•" character.
4. **The phone number wrapped mid-number** once it was added to the contact line. → Contact details wrap only as whole units.
5. **Degree and school shared one bold-led line**, so the parser couldn't see where the second degree started, and "Cal U" has no school keyword. → School on its own line under each degree; the school written as "California University of Pennsylvania (now PennWest California)" (Brian's call).
6. **"Areas of Expertise"** has no "skill" keyword. → "Skills & Expertise" (Brian's call).
7. **Titles followed by a comma**: it matches job-title words exactly after splitting on spaces, so "Staff Product Designer, Platform" (Built, Modern Health) wasn't recognized: "Designer," ≠ "Designer". Brian confirmed this on the send PDFs. → Team qualifiers now follow an en dash: "Staff Product Designer – Platform" (Brian's call, applied to every title with a team qualifier).

An earlier round, caught by CVCraft's own output checks before this test, fixed bullets painting out of reading order and letter-spaced headings (D-045).

## Known limits of this parser (not changed)

- **Several roles under one employer**: in the designed layout, Stitch Fix's four roles come out as one entry with the first title and all 8 bullets. The ATS layout used for sent files (D-054) writes one block per role, which OpenResume reads correctly.
- **A section starting at the top of a page**: it joins pages without an end-of-line marker, so the first line of page 3 ("PROFESSIONAL DEVELOPMENT") is glued to the last line of page 2 and isn't seen as a heading.

## Workday (real ATS upload)

Brian uploaded the send PDF (Design Leadership) to a Workday application on 2026-11-24.

| Field | Result | Cause | Change |
|---|---|---|---|
| Name | "Player-Coach" / "Product" ✗ (first words of the headline) | Unknown. The name's font maps to text correctly, and pdf.js and macOS extract it. Likely Workday skips the large name line as a header. | None yet; test the .docx |
| Work entries | shifted by one ✗ (job 1 = "Tive" with no title, job 2 = Tive's title + "Built Technologies") | Company description line between company and title | Dropped from send files (D-051) |
| Last job's description | swallowed the LinkedIn note, Professional Development and Tools ✗ | Unrecognized headings | Education moved right after Experience (D-052) |
| Education | both schools ✓, no degrees ✗, phantom "Mission College" ✗ | "MS"/"BA" not mapped; MISSION heading read as a school | Degrees spelled out; Mission renamed Summary (D-052) |
| LinkedIn, websites | empty ✗ | Not known; the PDF shows `linkedin.com/in/borudesign` and links to the full URL | None yet |

### Round 2: revised send files, PDF and .docx

The .docx did no better than the PDF, which pointed at structure rather than file format.

| Field | Result | Change |
|---|---|---|
| Name | still "Player-Coach" / "Product", in both formats | Contact line moved directly under the name; headline after it (D-054) |
| Work entries | still shifted by one: each title paired with the next company; "Staff Product Designer – Platform" cut at the dash; the bullet "First designer at Stitch Fix" read as a job | Title first, company on the next line, one entry per role (D-054) |
| Degrees | Master of Science ✓, Bachelor of Arts ✓ | (D-052 worked) |
| Schools | Penn State ✓; California University of Pennsylvania (now PennWest California) not matched in the .docx | Kept as is (Brian's call) |
| LinkedIn | still empty | Full address in sent files (D-054), as an experiment |

Round 3 pending: the ATS-layout send files.

OpenResume after these changes: name, contact, sections, titles and skills still correct. Two merges come from its page-joining quirk: Built and Modern Health (Modern Health now starts page 2), and Education (now starts page 3).

## Still to do

- Workday round 3 with the ATS-layout send files (PDF and .docx).
- Open a .docx in Word. (Google Docs checked 2026-11-24: layout correct after the tab fix.)
