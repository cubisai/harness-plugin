#!/usr/bin/env node
// Packs, signs and publishes one release: every pack zip plus the signed catalog.
// Usage: node scripts/release.mjs --release packs-v2 --serial 2
// Push main first: the catalog records the commit the packs were built from.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
};
const tag = arg("--release");
const serial = arg("--serial");
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: "inherit" });

if (execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).trim()) throw new Error("Commit everything first.");
execFileSync("git", ["fetch", "-q", "origin", "main"], { cwd: ROOT });
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const remote = execFileSync("git", ["rev-parse", "origin/main"], { cwd: ROOT, encoding: "utf8" }).trim();
if (head !== remote) throw new Error("Push main first, so the release's commit is public.");

run(process.execPath, ["scripts/pack.mjs", "--release", tag, "--serial", serial]);
run(process.execPath, ["scripts/sign.mjs"]);
const assets = readdirSync(join(ROOT, "dist")).map((f) => join("dist", f));
run("gh", ["release", "create", tag, ...assets, "--repo", "cubisai/harness-plugin", "--target", head, "--title", `Design packs ${tag}`, "--notes", `Serial ${serial}, built from ${head.slice(0, 7)}.`, "--latest"]);
console.log(`Released ${tag}. Apps already out pick it up at their next launch; copy dist/catalog.lock.json into the app's resource-catalog.json to make it the built-in floor.`);
