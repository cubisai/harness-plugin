#!/usr/bin/env node
// Builds one zip per catalog pack into dist/, and dist/catalog.lock.json with each zip's size and SHA-256.
// The app pins those hashes, so a pack only changes when a new app version says so.
// Usage: node scripts/pack.mjs [--release <tag>]   (needs the zip command)
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST = join(ROOT, "dist");
const at = process.argv.indexOf("--release");
const TAG = at >= 0 ? process.argv[at + 1] : "packs-v1";
const REPO = "cubisai/harness-plugin";

for (const script of ["validate.mjs", "validate-packs.mjs"]) execFileSync(process.execPath, [join(ROOT, "scripts", script), "--root", ROOT], { stdio: "inherit" });

const catalog = JSON.parse(readFileSync(join(ROOT, "catalog.json"), "utf8"));
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const versionOf = (entry) => {
  const file = entry.kind === "kit" ? "components.json" : "pack.json";
  return JSON.parse(readFileSync(join(ROOT, entry.path, file), "utf8")).version;
};

const lock = { repo: REPO, release: TAG, packs: [] };
for (const entry of catalog.packs) {
  const version = versionOf(entry);
  const file = `${entry.id}-${version}.zip`;
  // -X drops extra file attributes, -D skips folder entries; dotfiles stay out.
  execFileSync("zip", ["-X", "-D", "-q", "-r", join(DIST, file), ".", "-x", ".*", "-x", "*/.*"], { cwd: join(ROOT, entry.path) });
  const bytes = readFileSync(join(DIST, file));
  lock.packs.push({
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    description: entry.description,
    version,
    url: `https://github.com/${REPO}/releases/download/${TAG}/${file}`,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  console.log(`${file}  ${bytes.byteLength} bytes`);
}
writeFileSync(join(DIST, "catalog.lock.json"), JSON.stringify(lock, null, 2) + "\n");
console.log(`Wrote dist/catalog.lock.json for release ${TAG}.`);
