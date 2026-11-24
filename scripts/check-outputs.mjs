#!/usr/bin/env node
// Checks every output the way a parser would see it (D-044):
//  1. Content and order: the text pulled out of each PDF and .docx contains every
//     block of the web page (name, headline, contact, headings, employers, dates,
//     titles, bullets, rows, paragraphs) in the same order.
//  2. Privacy: no value from contact.private.json appears anywhere in the public
//     build (HTML raw, PDF and .docx extracted text). Send files must contain them.
//  3. Page count, reported per PDF.
//
// Usage: node scripts/check-outputs.mjs [--data <folder>] [--skip-send]

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dataDir = resolve(args.includes("--data") ? args[args.indexOf("--data") + 1] : process.env.CVCRAFT_DATA ?? join(root, "..", "cvcraft-data"));
const skipSend = args.includes("--skip-send");
const dist = join(root, "dist");
const sendBuild = join(root, ".send-build");
const sendOut = join(root, "send");

const errors = [];
const lines = [];
const rel = (p) => relative(root, p);

// ---------- text extraction ----------
const unescape = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const stripTags = (s) => unescape(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
// Case-insensitive: CSS uppercases section headings, so the PDF holds "EXPERIENCE".
const squash = (s) => s.replace(/\s+/g, "").toLowerCase();

async function pdfText(file) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0, useSystemFonts: true, disableFontFace: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => it.str + (it.hasEOL ? "\n" : "")).join(""));
  }
  return { text: pages.join("\n"), pages: doc.numPages };
}
const docxText = async (file) => (await mammoth.extractRawText({ path: file })).value;

/** The page's text blocks in document order: what every other output must contain. */
function expectedBlocks(html) {
  const main = html.slice(html.indexOf('<main class="cv"'));
  const re = /<(h1|h2|h3|h4|li|p)\b[^>]*>([\s\S]*?)<\/\1>|<span class="cv-dates"[^>]*>([\s\S]*?)<\/span>/g;
  return [...main.matchAll(re)].map((m) => stripTags(m[2] ?? m[3])).filter(Boolean);
}

/** Finds each block in order. Reports blocks that are missing or out of order. */
function checkOrder(blocks, text) {
  const hay = squash(text);
  let cursor = 0;
  const missing = [];
  const outOfOrder = [];
  for (const b of blocks) {
    const needle = squash(b);
    const at = hay.indexOf(needle, cursor);
    if (at >= 0) cursor = at + needle.length;
    else if (hay.includes(needle)) outOfOrder.push(b);
    else missing.push(b);
  }
  return { missing, outOfOrder };
}

// ---------- private values ----------
const privatePath = join(dataDir, "contact.private.json");
const privateValues = existsSync(privatePath)
  ? Object.entries(JSON.parse(readFileSync(privatePath, "utf8"))).filter(([k, v]) => !k.startsWith("$") && typeof v === "string").map(([k, v]) => ({ field: k, value: v }))
  : [];
const containsPrivate = (text) =>
  privateValues.filter(({ value }) => {
    if (text.includes(value)) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && text.replace(/\D/g, "").includes(digits);
  });

// ---------- walk ----------
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const variantDirs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((d) => !d.startsWith("_") && statSync(join(dir, d)).isDirectory()) : []);

// A tab character inside .docx text isn't a tab: Word shows a space and Google
// Docs drops it. Tabs must be <w:tab/> elements.
function checkDocxXml(file, label) {
  const r = spawnSync("unzip", ["-p", file, "word/document.xml"], { encoding: "utf8" });
  if (r.status !== 0) return errors.push(`${label}: couldn't read word/document.xml (${r.stderr.trim()})`);
  const literalTabs = (r.stdout.match(/<w:t(?:\s[^>]*)?>[^<]*\t[^<]*<\/w:t>/g) ?? []).length;
  if (literalTabs) errors.push(`${label}: ${literalTabs} literal tab character(s) inside text; use <w:tab/>`);
  return literalTabs === 0;
}

async function checkFile(file, blocks, label) {
  const isPdf = file.endsWith(".pdf");
  const xmlOk = isPdf || checkDocxXml(file, label);
  const { text, pages } = isPdf ? await pdfText(file) : { text: await docxText(file) };
  const { missing, outOfOrder } = checkOrder(blocks, text);
  // Letter-spaced text ("E X P E R I E N C E") reads as separate letters to parsers.
  const spaced = [...new Set(text.match(/(?:\b\p{L} ){3,}\p{L}\b/gu) ?? [])];
  for (const s of spaced) errors.push(`${label}: letter-spaced text "${s}"`);
  const ok = !missing.length && !outOfOrder.length && !spaced.length && xmlOk;
  lines.push(`  ${ok ? "✓" : "✗"} ${rel(file)}${isPdf ? ` · ${pages} page${pages === 1 ? "" : "s"}` : ""} · ${blocks.length - missing.length - outOfOrder.length}/${blocks.length} blocks in order`);
  for (const b of missing) errors.push(`${label}: missing "${b.slice(0, 70)}"`);
  for (const b of outOfOrder) errors.push(`${label}: out of order "${b.slice(0, 70)}"`);
  return text;
}

if (!existsSync(dist)) {
  console.error("No dist/ folder. Run the export first.");
  process.exit(1);
}

// 1 + 2: public outputs
lines.push("Public build (dist/):");
for (const id of variantDirs(dist)) {
  const dir = join(dist, id);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const blocks = expectedBlocks(html);
  for (const f of readdirSync(dir).filter((f) => /\.(pdf|docx)$/.test(f))) await checkFile(join(dir, f), blocks, rel(join(dir, f)));
  if (!readdirSync(dir).some((f) => f.endsWith(".pdf"))) errors.push(`${id}: no PDF in dist/`);
  if (!readdirSync(dir).some((f) => f.endsWith(".docx"))) errors.push(`${id}: no .docx in dist/`);
}
let scanned = 0;
for (const file of walk(dist)) {
  const ext = extname(file);
  let text;
  if (ext === ".pdf") text = (await pdfText(file)).text;
  else if (ext === ".docx") text = await docxText(file);
  else if ([".html", ".css", ".js", ".json", ".txt", ".xml", ".svg"].includes(ext)) text = readFileSync(file, "utf8");
  else continue;
  scanned++;
  for (const { field } of containsPrivate(text)) errors.push(`PRIVATE "${field}" found in public file ${rel(file)}`);
}
lines.push(`  ${errors.some((e) => e.startsWith("PRIVATE")) ? "✗" : "✓"} privacy: ${privateValues.length} private field(s) absent from ${scanned} public files`);

// send outputs
if (!skipSend) {
  lines.push("\nSend files (send/):");
  for (const id of variantDirs(sendOut)) {
    const htmlPath = join(sendBuild, id, "index.html");
    if (!existsSync(htmlPath)) {
      errors.push(`send/${id}: no send build page to compare against`);
      continue;
    }
    const blocks = expectedBlocks(readFileSync(htmlPath, "utf8"));
    for (const f of readdirSync(join(sendOut, id)).filter((f) => /\.(pdf|docx)$/.test(f))) {
      const file = join(sendOut, id, f);
      const text = await checkFile(file, blocks, rel(file));
      const found = containsPrivate(text).map((p) => p.field);
      for (const { field } of privateValues) if (!found.includes(field)) errors.push(`${rel(file)}: private "${field}" missing from send file`);
    }
  }
}

console.log(lines.join("\n"));
if (errors.length) {
  console.log(`\nProblems:\n${errors.map((e) => `  ✗ ${e}`).join("\n")}`);
  process.exit(1);
}
console.log("\nAll output checks passed.");
