// .docx renderer for the single-column template (D-014).
// Built from the render model, not converted from HTML, using Word's own
// Title / Heading 1-3 styles and a real bulleted list, which is what parsers
// expect. Sizes, colors and spacing come from the same tokens.json as the web
// page. Fonts fall back to ones every Word install has (D-043).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
  UnderlineType,
  type ParagraphChild,
} from "docx";
import type { Resume, RenderedSection } from "../../src/lib/resume";
import { formatDate, formatRange, showPositionDates } from "../../src/lib/format";
import { projectRoot } from "../../src/lib/paths.mjs";

// ---------- tokens → Word units ----------
type Tokens = Record<string, any>;
const tokens: Tokens = JSON.parse(readFileSync(join(projectRoot, "templates", "single-column", "tokens.json"), "utf8"));

function value(path: string): any {
  let node = path.split(".").reduce((n, k) => n?.[k], tokens);
  for (let i = 0; typeof node?.$value === "string" && node.$value.startsWith("{") && i < 10; i++) {
    node = node.$value.slice(1, -1).split(".").reduce((n: any, k: string) => n?.[k], tokens);
  }
  if (node?.$value === undefined) throw new Error(`Unknown token ${path}`);
  return node.$value;
}
const hex = (path: string) => (value(path).hex as string).replace("#", "").toUpperCase();
const pxToPt = (px: number) => px * 0.75;
const pxToTwip = (px: number) => Math.round(px * 15); // 1px = 1/96in = 15 twips

const basePt = pxToPt(value("font.base.print").value); // 9.5pt
const halfPoints = (scale: string) => Math.round(basePt * value(`font.scale.${scale}`) * 2);
const spaceTwips = (name: string) => Math.round(basePt * value(`space.${name}`) * 20);
// Word's "single" line height is about 1.15× the font size for Arial.
const lineSpacing = Math.round((240 * value("font.leading.body")) / 1.15);

const C = { ink: hex("color.text.default"), muted: hex("color.text.muted"), accent: hex("color.text.accent"), rule: hex("color.rule") };
const FONT = { body: "Arial", display: "Arial Black" };

const marginBlock = pxToTwip(value("page.margin-block").value);
const marginInline = pxToTwip(value("page.margin-inline").value);
const pageWidth = pxToTwip(value("page.width").value);
const textWidth = pageWidth - 2 * marginInline;
const rightTab = [{ type: TabStopType.RIGHT, position: textWidth }];

// ---------- small builders ----------
// Every run carries its font, size and color. Word honors document defaults,
// but Pages, Google Docs and macOS Quick Look don't always, and fell back to Times.
const run = (text: string, opts: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {}) =>
  new TextRun({ text, font: FONT.body, size: halfPoints("body"), color: C.ink, ...(opts as object) });
const sep = (text: string) => run(text, { color: C.accent });
const meta = (text: string) => run(text, { color: C.muted, size: halfPoints("meta") });
// A real <w:tab/> before right-aligned dates. A "\t" character inside the text
// isn't a tab in .docx: Word shows it as a space and Google Docs drops it, which
// ran dates into the company name ("Tive12/2024–Present").
const tabbedMeta = (text: string) =>
  new TextRun({ children: [new Tab(), text], font: FONT.body, color: C.muted, size: halfPoints("meta"), bold: false }); // not bold even inside headings
const link = (text: string, href: string, opts: object = {}) =>
  new ExternalHyperlink({ link: href, children: [run(text, { underline: { type: UnderlineType.NONE }, ...opts })] });

function sectionParagraphs(section: RenderedSection, ats: boolean): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [run(section.heading, { size: halfPoints("section"), bold: true, allCaps: true, color: C.accent })],
    }),
  ];
  const gap = spaceTwips("bullet") * 1.6;

  switch (section.type) {
    case "summary":
      section.paragraphs.forEach((p, i) => out.push(new Paragraph({ spacing: { before: i ? gap : 0 }, children: [run(p)] })));
      break;
    case "skills":
      section.items.forEach((s, i) =>
        out.push(new Paragraph({ spacing: { before: i ? gap : 0 }, children: [run(`${s.name}: `, { bold: true }), run(s.keywords.join(", "))] })),
      );
      break;
    case "tools":
      out.push(new Paragraph({ children: section.items.flatMap((g, i) => [...(i ? [sep(" • ")] : []), run(g.keywords.join(", "))]) }));
      break;
    case "education":
      // Degree, then school on its own line, as on the web page.
      section.items.forEach((e, i) =>
        out.push(
          new Paragraph({
            spacing: { before: i ? spaceTwips("position") : 0 },
            tabStops: rightTab,
            keepNext: true,
            children: [run(`${e.studyType}, ${e.area}`, { bold: true }), ...(e.endDate ? [tabbedMeta(formatDate(e.endDate))] : [])],
          }),
          new Paragraph({ children: [run(e.institution, { color: C.muted })] }),
        ),
      );
      break;
    case "development":
      section.items.forEach((c, i) =>
        out.push(
          new Paragraph({
            spacing: { before: i ? gap : 0 },
            tabStops: rightTab,
            children: [
              run(c.name, { bold: true }),
              sep(" — "),
              run(`${c.issuer}${c.instructor ? `, taught by ${c.instructor}` : ""}`),
              ...(c.date ? [tabbedMeta(formatDate(c.date))] : []),
            ],
          }),
        ),
      );
      break;
    case "work":
      // ATS layout (sent files, D-054): each role title first with its dates,
      // the company on the next line, then the bullets.
      if (ats) {
        section.items.flatMap((w) => w.positions.map((p) => ({ w, p }))).forEach(({ w, p }, i) => {
          out.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: i ? spaceTwips("job") : 0 },
              tabStops: rightTab,
              children: [run(p.title, { size: halfPoints("company"), bold: true }), tabbedMeta(formatRange(p.startDate, p.endDate))],
            }),
            new Paragraph({ keepNext: true, spacing: { before: 30 }, children: [run(w.name)] }),
          );
          if (p.summary) out.push(new Paragraph({ spacing: { before: 60 }, children: [run(p.summary)] }));
          p.highlights.forEach((h, hi) =>
            out.push(
              new Paragraph({
                numbering: { reference: "cv-bullets", level: 0 },
                spacing: { before: hi ? spaceTwips("bullet") : 90 },
                children: [run(h.text)],
              }),
            ),
          );
        });
        break;
      }
      section.items.forEach((w, wi) => {
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: wi ? spaceTwips("job") : 0 },
            tabStops: rightTab,
            children: [run(w.name, { size: halfPoints("company"), bold: true }), tabbedMeta(formatRange(w.startDate, w.endDate))],
          }),
        );
        if (w.description) out.push(new Paragraph({ children: [run(w.description, { color: C.muted, size: halfPoints("description") })] }));
        const dated = showPositionDates(w);
        w.positions.forEach((p, pi) => {
          out.push(
            new Paragraph({
              heading: HeadingLevel.HEADING_3,
              spacing: { before: pi ? spaceTwips("position") : Math.round(spaceTwips("position") * 0.6) },
              tabStops: rightTab,
              children: [run(p.title, { size: halfPoints("title"), bold: true }), ...(dated ? [tabbedMeta(formatRange(p.startDate, p.endDate))] : [])],
            }),
          );
          if (p.summary) out.push(new Paragraph({ spacing: { before: 60 }, children: [run(p.summary)] }));
          p.highlights.forEach((h, hi) =>
            out.push(
              new Paragraph({
                numbering: { reference: "cv-bullets", level: 0 },
                spacing: { before: hi ? spaceTwips("bullet") : 90 },
                children: [run(h.text)],
              }),
            ),
          );
        });
      });
      break;
  }

  if (section.note) {
    const opts = { color: C.muted, size: halfPoints("description") };
    out.push(
      new Paragraph({
        spacing: { before: spaceTwips("job") },
        children: [section.note.url ? link(section.note.text, section.note.url, opts) : run(section.note.text, opts)],
      }),
    );
  }
  return out;
}

export async function renderDocx(resume: Resume): Promise<Uint8Array> {
  const ats = resume.layout === "ats";
  const headlineSize = halfPoints("headline");
  const headline = resume.label
    .split(/\s+•\s+/)
    .flatMap((part, i) => [...(i ? [run(" • ", { color: C.accent, size: headlineSize })] : []), run(part, { size: headlineSize })]);
  const contact: ParagraphChild[] = resume.contact.flatMap((c, i) => {
    const opts = { color: C.muted, size: halfPoints("meta") };
    return [...(i ? [run(" | ", { ...opts, color: C.accent })] : []), c.href ? link(c.text, c.href, opts) : run(c.text, opts)];
  });

  const doc = new Document({
    creator: resume.name,
    title: `${resume.name} — Resume`,
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: FONT.body, size: halfPoints("body"), color: C.ink },
          paragraph: { spacing: { line: lineSpacing, after: 0 } },
        },
      ],
      default: {
        document: {
          run: { font: FONT.body, size: halfPoints("body"), color: C.ink },
          paragraph: { spacing: { line: lineSpacing, after: 0 } },
        },
        title: {
          run: { font: FONT.display, size: halfPoints("name"), color: C.ink, bold: false },
          paragraph: { spacing: { after: 60, line: 240 } },
        },
        heading1: {
          run: { font: FONT.body, size: halfPoints("section"), bold: true, allCaps: true, color: C.accent, characterSpacing: 24 },
          paragraph: {
            spacing: { before: spaceTwips("section"), after: Math.round(spaceTwips("section-head") * 1.4), line: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule, space: 3 } },
            keepNext: true,
          },
        },
        heading2: {
          run: { font: FONT.body, size: halfPoints("company"), bold: true, color: C.ink },
          paragraph: { keepNext: true, spacing: { line: 240 } },
        },
        heading3: {
          run: { font: FONT.body, size: halfPoints("title"), bold: true, color: C.ink },
          paragraph: { keepNext: true, spacing: { line: 240 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: Math.round(basePt * value("space.bullet-indent") * 20), hanging: 180 } },
                run: { color: C.accent },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: pageWidth, height: pxToTwip(value("page.height").value) },
            margin: { top: marginBlock, bottom: marginBlock, left: marginInline, right: marginInline },
          },
        },
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [run(resume.name, { font: FONT.display, size: halfPoints("name") })] }),
          // ATS layout: contact right under the name, then the headline (D-054).
          ...(ats
            ? [new Paragraph({ spacing: { before: 40 }, children: contact }), new Paragraph({ spacing: { before: 100 }, children: headline })]
            : [new Paragraph({ spacing: { before: 40 }, children: headline }), new Paragraph({ spacing: { before: 100 }, children: contact })]),
          ...resume.sections.flatMap((section) => sectionParagraphs(section, ats)),
        ],
      },
    ],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}
