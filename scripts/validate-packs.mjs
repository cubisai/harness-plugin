#!/usr/bin/env node
// Checks catalog.json and the non-kit packs (fonts, styles). Kits are checked by validate.mjs.
// Usage: node scripts/validate-packs.mjs [--root <folder>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const at = args.indexOf("--root");
const ROOT = resolve(at >= 0 ? args[at + 1] : join(import.meta.dirname, ".."));
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const KINDS = new Set(["kit", "fonts", "styles"]);
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, "\n"));
  const out = new Map();
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) out.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  return out;
}

function readPack(dir, where) {
  try {
    return JSON.parse(readFileSync(join(dir, "pack.json"), "utf8"));
  } catch {
    fail(where, "pack.json is missing or not JSON");
    return null;
  }
}

/** No remote fetches: a pack is read from disk into a canvas with no network. */
function noRemote(file, where) {
  const text = readFileSync(file, "utf8");
  if (/url\(\s*['"]?(https?:)?\/\//i.test(text) || /@import\s+['"]?(https?:)?\/\//i.test(text)) fail(where, "loads something remote");
}

function checkFonts(dir, entry) {
  const pack = readPack(dir, entry.id);
  if (pack && (pack.id !== entry.id || pack.kind !== "fonts" || !VERSION.test(pack.version ?? ""))) fail(entry.id, "pack.json id, kind or version is wrong");
  const files = readdirSync(dir);
  if (!files.includes("LICENSES.md")) fail(entry.id, "LICENSES.md is missing");
  const licenses = existsSync(join(dir, "LICENSES.md")) ? readFileSync(join(dir, "LICENSES.md"), "utf8") : "";
  for (const f of files) {
    if (f === "LICENSES.md" || f === "pack.json") continue;
    if (extname(f) !== ".woff2") fail(`${entry.id}/${f}`, "only .woff2 faces belong here");
    else if (statSync(join(dir, f)).size > 512 * 1024) fail(`${entry.id}/${f}`, "a face over 512 KB");
  }
  if (!/Open Font License/i.test(licenses)) fail(entry.id, "LICENSES.md does not carry the OFL text");
  return new Set(files.filter((f) => f.endsWith(".woff2")));
}

function checkStyles(dir, entry, faces) {
  const pack = readPack(dir, entry.id);
  if (pack && (pack.id !== entry.id || pack.kind !== "styles" || !VERSION.test(pack.version ?? ""))) fail(entry.id, "pack.json id, kind or version is wrong");
  const folders = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
  if (!folders.length) fail(entry.id, "no styles");
  for (const d of folders) {
    const where = `${entry.id}/${d.name}`;
    if (!SLUG.test(d.name)) fail(where, "folder name is not a slug");
    const base = join(dir, d.name);
    for (const req of ["index.md", "DESIGN.md", "tokens.css"]) if (!existsSync(join(base, req))) fail(where, `${req} is missing`);
    if (!existsSync(join(base, "index.md"))) continue;
    const fm = frontmatter(readFileSync(join(base, "index.md"), "utf8"));
    if (fm.get("type") !== "design-style") fail(where, "index.md must have type: design-style");
    for (const font of (fm.get("fonts") ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      if (faces && !faces.has(font)) fail(where, `uses ${font}, which the font pack does not have`);
    }
    for (const f of readdirSync(base)) {
      if (![".md", ".css"].includes(extname(f))) fail(`${where}/${f}`, "only .md and .css belong in a style");
      else noRemote(join(base, f), `${where}/${f}`);
    }
  }
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
} catch {
  console.log("catalog.json is missing or not JSON");
  process.exit(1);
}
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const seen = new Set();
let faces = null;
const ordered = [...catalog.packs].sort((a, b) => (a.kind === "fonts" ? -1 : b.kind === "fonts" ? 1 : 0));
for (const entry of ordered) {
  if (!SLUG.test(entry.id ?? "")) fail(String(entry.id), "id is not a slug");
  if (seen.has(entry.id)) fail(entry.id, "listed twice");
  seen.add(entry.id);
  if (!KINDS.has(entry.kind)) fail(entry.id, `unknown kind ${entry.kind}`);
  if (!entry.name || !entry.description) fail(entry.id, "needs a name and a description");
  const dir = join(ROOT, entry.path ?? "");
  if (!entry.path || !existsSync(dir)) {
    fail(entry.id, `path ${entry.path} is missing`);
    continue;
  }
  if (entry.kind === "kit" && !registry.kits.some((k) => k.id === entry.id)) fail(entry.id, "kit is not in registry.json");
  if (entry.kind === "fonts") faces = checkFonts(dir, entry);
  if (entry.kind === "styles") checkStyles(dir, entry, faces);
}
for (const k of registry.kits) if (!seen.has(k.id)) fail(k.id, "registry kit is not in catalog.json");

if (errors.length) {
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log(`packs: ok (${catalog.packs.length})`);
