// Where resume data comes from and which build this is.
// CVCRAFT_DATA: data folder (default ../cvcraft-data, the private repo).
// CVCRAFT_BUILD: "public" (default; no private fields) or "send" (adds them; never published).
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const dataDir = resolve(projectRoot, process.env.CVCRAFT_DATA ?? "../cvcraft-data");
export const buildKind = process.env.CVCRAFT_BUILD === "send" ? "send" : "public";
