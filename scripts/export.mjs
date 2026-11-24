#!/usr/bin/env node
// Produces every output, then checks them.
//
//   public build → dist/          web pages + downloadable PDF/.docx, no private fields (deployable)
//   send build   → send/<variant>/ PDF/.docx with private fields, for sending directly (never published)
//
// PDFs are printed by headless Chrome from the built pages, so a PDF is exactly
// what the browser's Print gives (D-015). Set CHROME_PATH if Chrome isn't in the
// default macOS location.
//
// Usage: node scripts/export.mjs [--data <folder>] [--skip-send]

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dataArg = args.includes("--data") ? resolve(args[args.indexOf("--data") + 1]) : undefined;
const skipSend = args.includes("--skip-send");
const env = { ...process.env, ...(dataArg && { CVCRAFT_DATA: dataArg }) };
const astro = join(root, "node_modules", ".bin", "astro");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "/cvcraft";

const step = (msg) => console.log(`\n▸ ${msg}`);
function run(cmd, cmdArgs, extraEnv = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, env: { ...env, ...extraEnv }, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n✗ ${cmd} ${cmdArgs.join(" ")} failed`);
    process.exit(r.status ?? 1);
  }
}

if (!existsSync(chrome)) {
  console.error(`Chrome not found at ${chrome}. Set CHROME_PATH.`);
  process.exit(1);
}

// ---------- static server for printing ----------
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json", ".svg": "image/svg+xml" };
function serve(dir) {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (!url.startsWith(BASE)) return res.writeHead(404).end();
      let file = join(dir, url.slice(BASE.length));
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!file.startsWith(dir) || !existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => ok({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

/** Each built variant folder and its file base name (taken from the .docx the build wrote). */
function builtVariants(dir) {
  return readdirSync(dir)
    .filter((d) => !d.startsWith("_") && statSync(join(dir, d)).isDirectory())
    .map((id) => {
      const docx = readdirSync(join(dir, id)).find((f) => f.endsWith(".docx"));
      return docx && { id, docx, pdf: docx.replace(/\.docx$/, ".pdf") };
    })
    .filter(Boolean);
}

// Async on purpose: the pages are served from this same process, so a blocking
// spawn would stop the server from answering Chrome.
function printPdf(url, out) {
  return new Promise((ok, fail) => {
    const child = spawn(
      chrome,
      ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000", "--generate-pdf-document-outline", `--print-to-pdf=${out}`, url],
      { stdio: "ignore" },
    );
    const timer = setTimeout(() => child.kill(), 60_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      code === 0 && existsSync(out) ? ok() : fail(new Error(`Chrome couldn't print ${url}`));
    });
  });
}

async function printAll(dir, outFor) {
  const { server, origin } = await serve(dir);
  try {
    for (const v of builtVariants(dir)) {
      const out = outFor(v);
      mkdirSync(dirname(out), { recursive: true });
      await printPdf(`${origin}${BASE}/${v.id}/`, out);
      console.log(`  ✓ ${v.id} → ${out.replace(root + "/", "")}`);
    }
  } finally {
    server.close();
  }
}

// ---------- 1. validate ----------
step("Validate data");
run("node", [join(root, "scripts", "validate.mjs"), ...(dataArg ? ["--data", dataArg] : [])]);

// ---------- 2. public build ----------
step("Public build → dist/");
run(astro, ["build", "--silent"], { CVCRAFT_BUILD: "public" });
step("Print public PDFs");
const dist = join(root, "dist");
await printAll(dist, (v) => join(dist, v.id, v.pdf));

// ---------- 3. send build ----------
if (!skipSend) {
  const sendBuild = join(root, ".send-build");
  const sendOut = join(root, "send");
  rmSync(sendBuild, { recursive: true, force: true });
  rmSync(sendOut, { recursive: true, force: true });
  step("Send build (private fields included; never published)");
  run(astro, ["build", "--silent", "--outDir", sendBuild], { CVCRAFT_BUILD: "send" });
  step("Print send PDFs → send/");
  await printAll(sendBuild, (v) => join(sendOut, v.id, v.pdf));
  for (const v of builtVariants(sendBuild)) cpSync(join(sendBuild, v.id, v.docx), join(sendOut, v.id, v.docx));
}

// ---------- 4. check ----------
// The send build's pages stay until the check has compared against them, then go.
step("Check outputs");
const check = spawnSync("node", [join(root, "scripts", "check-outputs.mjs"), ...(dataArg ? ["--data", dataArg] : []), ...(skipSend ? ["--skip-send"] : [])], { cwd: root, env, stdio: "inherit" });
rmSync(join(root, ".send-build"), { recursive: true, force: true });
process.exit(check.status ?? 1);
