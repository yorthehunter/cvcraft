#!/usr/bin/env node
// Runs the open-source OpenResume parser (github.com/xitanggg/open-resume) on our
// PDFs, as a third-party check of how an ATS-style parser reads them (D-047).
//
// The parser code is used as downloaded, with two substitutions:
//  - read-pdf: theirs targets the browser; ours does the same steps in Node with
//    this repo's pdf.js (text items, x/y, original font names).
//  - lib/redux/resumeSlice: stubbed to the one constant the parser imports, so no
//    Redux code runs.
//
// Usage:
//   git clone --depth 1 https://github.com/xitanggg/open-resume.git <somewhere>
//   node scripts/openresume-parse.mjs --parser <somewhere>/open-resume [--json] file.pdf ...

import { build } from "esbuild";
import { mkdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const parserRoot = args.includes("--parser") ? resolve(args[args.indexOf("--parser") + 1]) : null;
const asJson = args.includes("--json");
const pdfs = args.filter((a, i) => a.endsWith(".pdf") && args[i - 1] !== "--parser").map((p) => resolve(p));
if (!parserRoot || !existsSync(join(parserRoot, "src/app/lib/parse-resume-from-pdf"))) {
  console.error("Pass --parser <path to an open-resume checkout>.");
  process.exit(1);
}
const libDir = join(parserRoot, "src/app/lib");

const readPdfNode = `
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
export const readPdf = async (path) => {
  const pdfFile = await getDocument({ data: new Uint8Array(readFileSync(path)), verbosity: 0 }).promise;
  let textItems = [];
  for (let i = 1; i <= pdfFile.numPages; i++) {
    const page = await pdfFile.getPage(i);
    const textContent = await page.getTextContent();
    await page.getOperatorList(); // wait for font data, as upstream does
    const pageTextItems = textContent.items.map((item) => {
      const { str: text, dir, transform, fontName: pdfFontName, ...otherProps } = item;
      const fontName = page.commonObjs.get(pdfFontName).name;
      return { ...otherProps, fontName, text: text.replace(/-\\u00AD‐/g, "-"), x: transform[4], y: transform[5] };
    });
    textItems.push(...pageTextItems);
  }
  return textItems.filter((t) => !(!t.hasEOL && t.text.trim() === ""));
};`;

const entry = `
import { readPdf } from "lib/parse-resume-from-pdf/read-pdf";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
export async function parse(path) {
  const lines = groupTextItemsIntoLines(await readPdf(path));
  const sections = groupLinesIntoSections(lines);
  return { sections: Object.keys(sections), resume: extractResumeFromSections(sections) };
}`;

const outDir = join(root, "node_modules", ".cache", "openresume");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "parser.mjs");

await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: outFile,
  external: ["pdfjs-dist", "pdfjs-dist/*"],
  logLevel: "error",
  plugins: [
    {
      name: "openresume-paths",
      setup(b) {
        b.onResolve({ filter: /^lib\/parse-resume-from-pdf\/read-pdf$/ }, () => ({ path: "read-pdf", namespace: "cvcraft" }));
        b.onResolve({ filter: /^lib\/redux\/resumeSlice$/ }, () => ({ path: "resumeSlice", namespace: "cvcraft" }));
        b.onLoad({ filter: /^read-pdf$/, namespace: "cvcraft" }, () => ({ contents: readPdfNode, loader: "js", resolveDir: root }));
        b.onLoad({ filter: /^resumeSlice$/, namespace: "cvcraft" }, () => ({
          contents: `export const initialFeaturedSkills = Array(6).fill({ skill: "", rating: 4 });`,
          loader: "js",
        }));
        b.onResolve({ filter: /^lib\// }, (a) => {
          const base = join(libDir, a.path.slice(4));
          for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(base + ext)) return { path: base + ext };
          return { errors: [{ text: `Can't resolve ${a.path}` }] };
        });
      },
    },
  ],
});

const { parse } = await import(pathToFileURL(outFile).href);
const results = [];
for (const pdf of pdfs) results.push({ pdf, ...(await parse(pdf)) });

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const { pdf, sections, resume } of results) {
    const p = resume.profile;
    console.log(`\n=== ${pdf.replace(root + "/", "")}`);
    console.log(`sections found: ${sections.join(", ")}`);
    console.log(`profile: name="${p.name}" email="${p.email}" phone="${p.phone}" location="${p.location}" url="${p.url}"`);
    console.log(`summary: ${p.summary ? `"${p.summary.slice(0, 80)}…"` : "(none)"}`);
    console.log(`work (${resume.workExperiences.length}):`);
    for (const w of resume.workExperiences)
      console.log(`  - company="${w.company}" title="${w.jobTitle}" date="${w.date}" bullets=${w.descriptions.length}`);
    console.log(`education (${resume.educations.length}):`);
    for (const e of resume.educations) console.log(`  - school="${e.school}" degree="${e.degree}" date="${e.date}"`);
    console.log(`skills: ${resume.skills.descriptions.length} lines; projects: ${resume.projects.length}`);
  }
}
