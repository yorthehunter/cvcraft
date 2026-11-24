// Turns a W3C Design Tokens (DTCG 2025.10) file into CSS custom properties.
// Handles what the templates use: color, dimension, number, fontFamily,
// fontWeight, and {alias} references. Group-level $type is inherited.
import { readFileSync } from "node:fs";

type Token = { $value: unknown; $type?: string; $description?: string };
type Group = { [key: string]: Group | Token | string | undefined; $type?: string };

const isToken = (n: unknown): n is Token => typeof n === "object" && n !== null && "$value" in n;

function flatten(group: Group, path: string[] = [], inherited?: string, out = new Map<string, Token>()) {
  const type = (group.$type as string | undefined) ?? inherited;
  for (const [key, node] of Object.entries(group)) {
    if (key.startsWith("$")) continue;
    if (isToken(node)) out.set([...path, key].join("."), { ...node, $type: node.$type ?? type });
    else if (node && typeof node === "object") flatten(node as Group, [...path, key], type, out);
  }
  return out;
}

function toCss(token: Token, all: Map<string, Token>, seen = new Set<string>()): string {
  const v = token.$value;
  if (typeof v === "string" && /^\{.+\}$/.test(v)) {
    const ref = v.slice(1, -1);
    if (seen.has(ref)) throw new Error(`Token alias loop at ${ref}`);
    const target = all.get(ref);
    if (!target) throw new Error(`Unknown token alias ${v}`);
    return `var(--${ref.replaceAll(".", "-")})`;
  }
  switch (token.$type) {
    case "color": {
      const c = v as { hex?: string; components?: number[]; alpha?: number };
      if (c.hex) return c.hex;
      const [r, g, b] = (c.components ?? []).map((x) => Math.round(x * 255));
      return `rgb(${r} ${g} ${b} / ${c.alpha ?? 1})`;
    }
    case "dimension": {
      const d = v as { value: number; unit: string };
      return `${d.value}${d.unit}`;
    }
    case "fontFamily":
      return (Array.isArray(v) ? v : [v]).map((f) => (/[\s\d]/.test(String(f)) ? `"${f}"` : f)).join(", ");
    case "number":
    case "fontWeight":
      return String(v);
    default:
      throw new Error(`Unsupported token type "${token.$type}"`);
  }
}

/** A token's final CSS value with aliases followed, for places var() can't go (e.g. @page). */
export function tokenLiteral(file: string, path: string): string {
  const all = flatten(JSON.parse(readFileSync(file, "utf8")));
  let token = all.get(path);
  const seen = new Set<string>();
  while (token && typeof token.$value === "string" && /^\{.+\}$/.test(token.$value)) {
    const ref = token.$value.slice(1, -1);
    if (seen.has(ref)) throw new Error(`Token alias loop at ${ref}`);
    seen.add(ref);
    token = all.get(ref);
  }
  if (!token) throw new Error(`Unknown token ${path}`);
  return toCss(token, all);
}

/** Returns a CSS block declaring every token as --path-to-token on :root. */
export function tokensToCss(file: string): string {
  const all = flatten(JSON.parse(readFileSync(file, "utf8")));
  const lines = [...all].map(([path, t]) => `  --${path.replaceAll(".", "-")}: ${toCss(t, all)};`);
  return `:root {\n${lines.join("\n")}\n}`;
}
