#!/usr/bin/env node
// Signs dist/catalog.lock.json with the Ed25519 key, writing dist/catalog.lock.json.sig (base64).
// The key lives outside every repo: HARNESS_PLUGIN_KEY, or ~/.config/cubiq/harness-plugin-signing.pem.
// The app holds the public half, so only a catalog signed here can update the packs people have.
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const keyPath = process.env.HARNESS_PLUGIN_KEY ?? join(homedir(), ".config", "cubiq", "harness-plugin-signing.pem");
const key = createPrivateKey(readFileSync(keyPath));
const lock = readFileSync(join(ROOT, "dist", "catalog.lock.json"));
writeFileSync(join(ROOT, "dist", "catalog.lock.json.sig"), sign(null, lock, key).toString("base64") + "\n");
const pub = createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64");
console.log(`Signed dist/catalog.lock.json. Public key: ${pub}`);
