#!/usr/bin/env node
// Publishes the public build to GitHub Pages (D-021, D-057).
//
//  1. Runs the full export (validate → public build + PDFs → send files → checks).
//     Any failed check stops here, so nothing private or broken is published.
//  2. Copies dist/ into a fresh temporary git repo, adds .nojekyll (GitHub's
//     Jekyll step would otherwise drop Astro's _astro/ folder), commits, and
//     force-pushes it as the `gh-pages` branch of this repo's origin.
//
// Only dist/ is published: never send/, the private data, or the source.
//
// Usage: pnpm run publish-site

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const SITE = "https://yorthehunter.github.io/cvcraft";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (r.status !== 0) {
    console.error(`\n✗ ${cmd} ${args.join(" ")} failed; nothing was published.`);
    process.exit(r.status ?? 1);
  }
  return r;
}
const out = (cmd, args, cwd = root) => spawnSync(cmd, args, { cwd, encoding: "utf8" }).stdout.trim();

const origin = out("git", ["remote", "get-url", "origin"]);
if (!origin) {
  console.error("No git remote 'origin'. Add the GitHub repo first.");
  process.exit(1);
}
const source = out("git", ["rev-parse", "--short", "HEAD"]) || "uncommitted";
const dirty = out("git", ["status", "--porcelain"]) !== "";

console.log("▸ Export and check");
run("node", [join(root, "scripts", "export.mjs")]);

console.log("\n▸ Publish dist/ to gh-pages");
const tmp = mkdtempSync(join(tmpdir(), "cvcraft-pages-"));
try {
  cpSync(dist, tmp, { recursive: true });
  writeFileSync(join(tmp, ".nojekyll"), "");
  const git = (...args) => run("git", args, { cwd: tmp });
  git("init", "-q", "-b", "gh-pages");
  git("add", "-A");
  git("commit", "-q", "-m", `Publish from ${source}${dirty ? " (with uncommitted changes)" : ""}`);
  git("push", "-q", "--force", origin, "gh-pages");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const pages = readdirSync(dist).filter((d) => !d.startsWith("_") && statSync(join(dist, d)).isDirectory());
console.log(`\n✓ Published. GitHub Pages usually updates within a minute or two:`);
console.log(`  ${SITE}/`);
for (const p of pages) console.log(`  ${SITE}/${p}/`);
