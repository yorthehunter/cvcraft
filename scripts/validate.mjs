#!/usr/bin/env node
// Validates a CVCraft data folder: schema checks, then the cross-file checks
// a schema can't express (every ref resolves to the right kind of item, ids are
// unique, rewordings aren't stale).
//
// Usage:
//   node scripts/validate.mjs                  # uses $CVCRAFT_DATA or ../cvcraft-data
//   node scripts/validate.mjs --data sample-data

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argIndex = process.argv.indexOf("--data");
const dataDir = resolve(
  argIndex > -1 ? process.argv[argIndex + 1] : process.env.CVCRAFT_DATA ?? join(root, "..", "cvcraft-data"),
);

const errors = [];
const warnings = [];
const info = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(basename(path), `can't read JSON (${e.message})`);
    return null;
  }
};

// ---------- schemas ----------
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
for (const name of ["library", "variant", "contact-private"]) {
  ajv.addSchema(readJson(join(root, "schemas", `${name}.schema.json`)));
}
const validator = (name) => ajv.getSchema(`https://cvcraft.local/schemas/${name}.schema.json`);
const checkSchema = (name, data, file) => {
  const validate = validator(name);
  if (!validate(data)) {
    for (const e of validate.errors) err(file, `${e.instancePath || "(root)"} ${e.message}`);
    return false;
  }
  return true;
};

if (!existsSync(dataDir)) {
  console.error(`Data folder not found: ${dataDir}`);
  process.exit(1);
}

// ---------- library ----------
const library = readJson(join(dataDir, "library.json"));
const libraryOk = library && checkSchema("library", library, "library.json");

// Index every item by id with its kind and parent.
const items = new Map();
const index = (id, kind, value, parent) => {
  if (items.has(id)) err("library.json", `duplicate id "${id}"`);
  items.set(id, { kind, value, parent });
};
if (libraryOk) {
  for (const p of library.basics.profiles ?? []) index(p.id, "profile", p);
  for (const s of library.summaries ?? []) index(s.id, "summary", s);
  for (const w of library.work ?? []) {
    index(w.id, "work", w);
    for (const pos of w.positions) {
      index(pos.id, "position", pos, w.id);
      for (const h of pos.highlights ?? []) index(h.id, "highlight", h, pos.id);
    }
  }
  for (const e of library.education ?? []) index(e.id, "education", e);
  for (const s of library.skills ?? []) index(s.id, "skill", s);
  for (const t of library.tools ?? []) index(t.id, "tools", t);
  for (const d of library.development ?? []) index(d.id, "development", d);

  for (const w of library.work ?? []) {
    for (const pos of w.positions) {
      if (pos.endDate && pos.endDate < pos.startDate) err("library.json", `${pos.id} ends before it starts`);
    }
    if (w.endDate && w.endDate < w.startDate) err("library.json", `${w.id} ends before it starts`);
  }
}

// ---------- private contact ----------
const contactPath = join(dataDir, "contact.private.json");
if (existsSync(contactPath)) {
  const contact = readJson(contactPath);
  if (contact) checkSchema("contact-private", contact, "contact.private.json");
} else {
  info.push("No contact.private.json: the send build will have no phone number.");
}

// ---------- variants ----------
const sectionKind = { skills: "skill", tools: "tools", education: "education", development: "development" };
const usedHighlights = new Set();
const variantDir = join(dataDir, "variants");
const variantFiles = existsSync(variantDir) ? readdirSync(variantDir).filter((f) => f.endsWith(".json")).sort() : [];
if (variantFiles.length === 0) warn("variants/", "no variants found");
const variantIds = new Set();
const summaries = [];

const expectRef = (file, ref, kind, where) => {
  const item = items.get(ref);
  if (!item) return err(file, `${where}: "${ref}" isn't in the library`), null;
  if (item.kind !== kind) return err(file, `${where}: "${ref}" is a ${item.kind}, expected a ${kind}`), null;
  return item;
};
const noDupes = (file, refs, where) => {
  const seen = new Set();
  for (const r of refs) {
    if (seen.has(r)) err(file, `${where}: "${r}" is picked twice`);
    seen.add(r);
  }
};

for (const f of variantFiles) {
  const file = `variants/${f}`;
  const v = readJson(join(variantDir, f));
  if (!v || !checkSchema("variant", v, file) || !libraryOk) continue;
  const errorsBefore = errors.length;

  if (v.id !== basename(f, ".json")) err(file, `id "${v.id}" should match the file name`);
  if (variantIds.has(v.id)) err(file, `duplicate variant id "${v.id}"`);
  variantIds.add(v.id);
  noDupes(file, v.sections.map((s) => s.type), "sections");

  let roles = 0;
  let bullets = 0;
  let words = 0;
  const countWords = (s) => s.split(/\s+/).filter(Boolean).length;

  for (const section of v.sections) {
    const where = `section "${section.heading}"`;
    if (section.type === "summary") {
      const item = expectRef(file, section.ref, "summary", where);
      if (item) words += item.value.paragraphs.reduce((n, p) => n + countWords(p), 0);
      continue;
    }
    if (section.type === "work") {
      const workPicks = section.items ?? library.work.map((w) => ({ ref: w.id }));
      noDupes(file, workPicks.map((p) => p.ref), where);
      for (const wp of workPicks) {
        const work = expectRef(file, wp.ref, "work", where);
        if (!work) continue;
        const posPicks = wp.positions ?? work.value.positions.map((p) => ({ ref: p.id }));
        noDupes(file, posPicks.map((p) => p.ref), `${where} › ${wp.ref}`);
        for (const pp of posPicks) {
          const pos = expectRef(file, pp.ref, "position", `${where} › ${wp.ref}`);
          if (!pos) continue;
          if (pos.parent !== wp.ref) err(file, `${where}: position "${pp.ref}" belongs to "${pos.parent}", not "${wp.ref}"`);
          roles++;
          if (pos.value.summary) words += countWords(pos.value.summary);
          const hlPicks = pp.highlights ?? (pos.value.highlights ?? []).map((h) => ({ ref: h.id }));
          noDupes(file, hlPicks.map((h) => h.ref), `${where} › ${pp.ref}`);
          for (const hp of hlPicks) {
            const hl = expectRef(file, hp.ref, "highlight", `${where} › ${pp.ref}`);
            if (!hl) continue;
            if (hl.parent !== pp.ref) err(file, `${where}: bullet "${hp.ref}" belongs to "${hl.parent}", not "${pp.ref}"`);
            if (hp.text && hp.overrideOf !== hl.value.text) {
              warn(file, `rewording of "${hp.ref}" may be stale: the library text changed since it was reworded`);
            }
            usedHighlights.add(hp.ref);
            bullets++;
            words += countWords(hp.text ?? hl.value.text);
          }
        }
      }
      continue;
    }
    const kind = sectionKind[section.type];
    const picks = section.items ?? (library[section.type] ?? []).map((i) => ({ ref: i.id }));
    noDupes(file, picks.map((p) => p.ref), where);
    for (const p of picks) {
      const item = expectRef(file, p.ref, kind, where);
      if (item?.value.keywords) words += item.value.keywords.reduce((n, k) => n + countWords(k), 0);
    }
  }
  const mark = errors.slice(errorsBefore).some((e) => e.startsWith(file)) ? "✗" : "✓";
  summaries.push(`${mark} ${v.id} (${v.sharing}): ${v.sections.length} sections, ${roles} roles, ${bullets} bullets, ~${words} words`);
}

if (libraryOk) {
  for (const [id, item] of items) {
    if (item.kind === "highlight" && !usedHighlights.has(id)) info.push(`Bullet "${id}" isn't used by any variant.`);
  }
}

// ---------- report ----------
console.log(`CVCraft validate — ${dataDir}\n`);
for (const s of summaries) console.log(`  ${s}`);
if (info.length) console.log(`\nNotes:\n${info.map((m) => `  · ${m}`).join("\n")}`);
if (warnings.length) console.log(`\nWarnings:\n${warnings.map((m) => `  ! ${m}`).join("\n")}`);
if (errors.length) {
  console.log(`\nErrors:\n${errors.map((m) => `  ✗ ${m}`).join("\n")}`);
  console.log(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`\nAll checks passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
