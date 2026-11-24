// Loads the library and variants and resolves a variant into a render model:
// every ref replaced by its library item, rewordings applied, private fields
// included only in the send build. Templates only ever see the render model.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { dataDir, buildKind } from "./paths.mjs";

// ---------- library and variant shapes (mirror schemas/*.json) ----------
type Highlight = { id: string; text: string; tags?: string[] };
type Position = { id: string; position: string; startDate: string; endDate?: string; summary?: string; highlights?: Highlight[] };
type Work = { id: string; name: string; description?: string; url?: string; startDate: string; endDate?: string; positions: Position[] };
type Keyworded = { id: string; name?: string; keywords: string[] };
type Education = { id: string; institution: string; studyType: string; area: string; startDate?: string; endDate?: string };
type Course = { id: string; name: string; issuer: string; instructor?: string; date?: string; url?: string };
type Summary = { id: string; paragraphs: string[] };
type Profile = { id: string; network: string; label?: string; url: string };
export type Library = {
  basics: { name: string; label: string; email: string; location?: { city: string; region: string }; profiles?: Profile[] };
  summaries?: Summary[];
  work: Work[];
  education?: Education[];
  skills?: Keyworded[];
  tools?: Keyworded[];
  development?: Course[];
};

type Pick = { ref: string };
type HighlightPick = Pick & { text?: string };
type PositionPick = Pick & { highlights?: HighlightPick[] };
type WorkPick = Pick & { positions?: PositionPick[] };
type Note = { text: string; url?: string };
type VariantSection =
  | { type: "summary"; heading: string; ref: string; note?: Note }
  | { type: "work"; heading: string; items?: WorkPick[]; note?: Note }
  | { type: "skills" | "tools" | "education" | "development"; heading: string; items?: Pick[]; note?: Note };
export type Variant = {
  id: string;
  title: string;
  sharing: "listed" | "unlisted" | "files-only";
  page: { size: "letter"; maxPages: number };
  label?: string;
  sections: VariantSection[];
};

// ---------- render model ----------
export type Contact = { kind: "location" | "email" | "phone" | "link"; text: string; href?: string };
export type RenderedPosition = { id: string; title: string; startDate: string; endDate?: string; summary?: string; highlights: { id: string; text: string }[] };
export type RenderedWork = { id: string; name: string; description?: string; startDate: string; endDate?: string; positions: RenderedPosition[] };
export type RenderedSection =
  | { type: "summary"; heading: string; note?: Note; paragraphs: string[] }
  | { type: "work"; heading: string; note?: Note; items: RenderedWork[] }
  | { type: "skills" | "tools"; heading: string; note?: Note; items: Keyworded[] }
  | { type: "education"; heading: string; note?: Note; items: Education[] }
  | { type: "development"; heading: string; note?: Note; items: Course[] };
export type Resume = {
  variant: Pick & { title: string; sharing: Variant["sharing"]; page: Variant["page"] };
  build: "public" | "send";
  /**
   * "designed": the web page and its downloads (company first, headline under the name).
   * "ats": sent files, arranged for applicant tracking systems (D-054): name, contact,
   * headline; each role title first with its company on the next line; full link addresses.
   */
  layout: "designed" | "ats";
  name: string;
  label: string;
  contact: Contact[];
  sections: RenderedSection[];
  files: { pdf: string; docx: string };
  jsonLd: Record<string, unknown>;
};

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

export function loadLibrary(): Library {
  return readJson<Library>(join(dataDir, "library.json"));
}

export function loadVariants(): Variant[] {
  const dir = join(dataDir, "variants");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson<Variant>(join(dir, f)));
}

/**
 * Variants rendered in this build. The public build skips files-only variants.
 * Dev shows everything for preview, and the send build renders everything
 * because files-only variants still need their PDF and .docx (D-025).
 */
export function publishedVariants(dev: boolean): Variant[] {
  return loadVariants().filter((v) => dev || buildKind === "send" || v.sharing !== "files-only");
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function byId<T extends { id: string }>(list: T[] | undefined, id: string, what: string): T {
  const found = list?.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown ${what} "${id}". Run pnpm validate.`);
  return found;
}

function readPrivate(): { phone?: string } {
  const path = join(dataDir, "contact.private.json");
  return buildKind === "send" && existsSync(path) ? readJson(path) : {};
}

export function resolveVariant(lib: Library, v: Variant): Resume {
  const b = lib.basics;
  const priv = readPrivate();

  // Contact: profiles show their address as text so it survives parsers that
  // drop link targets (D-035): short in the designed layout, full in the ATS
  // layout, since Workday ignored the short form (D-054).
  const layout: Resume["layout"] = buildKind === "send" ? "ats" : "designed";
  const linkText = (url: string) => (layout === "ats" ? url.replace(/\/$/, "") : shortUrl(url));
  const contact: Contact[] = [];
  if (b.location) contact.push({ kind: "location", text: `${b.location.city}, ${b.location.region}` });
  if (priv.phone) contact.push({ kind: "phone", text: priv.phone, href: `tel:${priv.phone.replace(/[^0-9+]/g, "")}` });
  contact.push({ kind: "email", text: b.email, href: `mailto:${b.email}` });
  for (const p of b.profiles ?? []) contact.push({ kind: "link", text: p.label ?? linkText(p.url), href: p.url });

  const sections: RenderedSection[] = v.sections.map((s): RenderedSection => {
    const base = { heading: s.heading, note: s.note };
    switch (s.type) {
      case "summary":
        return { type: "summary", ...base, paragraphs: byId(lib.summaries, s.ref, "summary").paragraphs };
      case "work": {
        const workPicks = s.items ?? lib.work.map((w) => ({ ref: w.id }));
        const items = workPicks.map((wp): RenderedWork => {
          const w = byId(lib.work, wp.ref, "employer");
          const posPicks = wp.positions ?? w.positions.map((p) => ({ ref: p.id }));
          return {
            id: w.id,
            name: w.name,
            // Sent files leave company descriptions out: between the company and the
            // job title, Workday read them as the end of the entry and shifted every
            // job by one (D-051). The web page and its downloads keep them.
            description: buildKind === "send" ? undefined : w.description,
            startDate: w.startDate,
            endDate: w.endDate,
            positions: posPicks.map((pp: PositionPick): RenderedPosition => {
              const p = byId(w.positions, pp.ref, "position");
              const hlPicks = pp.highlights ?? (p.highlights ?? []).map((h) => ({ ref: h.id }));
              return {
                id: p.id,
                title: p.position,
                startDate: p.startDate,
                endDate: p.endDate,
                summary: p.summary,
                highlights: hlPicks.map((hp: HighlightPick) => {
                  const h = byId(p.highlights, hp.ref, "bullet");
                  return { id: h.id, text: hp.text ?? h.text };
                }),
              };
            }),
          };
        });
        return { type: "work", ...base, items };
      }
      case "skills":
      case "tools": {
        const list = lib[s.type];
        const items = (s.items ?? (list ?? []).map((i) => ({ ref: i.id }))).map((p) => byId(list, p.ref, s.type));
        return { type: s.type, ...base, items };
      }
      case "education": {
        const items = (s.items ?? (lib.education ?? []).map((i) => ({ ref: i.id }))).map((p) => byId(lib.education, p.ref, "education"));
        return { type: "education", ...base, items };
      }
      case "development": {
        const items = (s.items ?? (lib.development ?? []).map((i) => ({ ref: i.id }))).map((p) => byId(lib.development, p.ref, "course"));
        return { type: "development", ...base, items };
      }
    }
  });

  const fileBase = `${slug(b.name)}-resume-${v.id}`;
  const current = lib.work.find((w) => !w.endDate);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: b.name,
    jobTitle: current?.positions.find((p) => !p.endDate)?.position,
    email: `mailto:${b.email}`,
    ...(b.location && { address: { "@type": "PostalAddress", addressLocality: b.location.city, addressRegion: b.location.region } }),
    ...(current && { worksFor: { "@type": "Organization", name: current.name } }),
    sameAs: (b.profiles ?? []).map((p) => p.url),
  };
  if (priv.phone) jsonLd.telephone = priv.phone;

  return {
    variant: { ref: v.id, title: v.title, sharing: v.sharing, page: v.page },
    build: buildKind,
    layout,
    name: b.name,
    label: v.label ?? b.label,
    contact,
    sections,
    files: { pdf: `${fileBase}.pdf`, docx: `${fileBase}.docx` },
    jsonLd,
  };
}
