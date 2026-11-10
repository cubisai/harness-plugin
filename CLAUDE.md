# harness-plugin

Downloadable resources for CubiQ (the app lives next to this checkout, in `../aiharness`). The app ships Foundation and core agent files; everything here is downloaded on first launch and updated from signed releases.

## Packs

- A pack is one folder named in `catalog.json` with an `id`, `kind`, `path`, `name` and `description`. Kinds today: `kit` (folder per kit, checked by `scripts/validate.mjs` and `registry.json`), `fonts` and `styles` (each with `pack.json`: id, kind, version; checked by `scripts/validate-packs.mjs`).
- Planned kinds: built-in skills, experts and teams, and other assets now in `../aiharness/resources/`. A new kind needs, in this order: a validator here, a validator in the app (`src/main/design/pack-schema.ts`) and the app code that reads it, then a release. Older apps skip packs whose kind they don't know, so adding a kind never breaks them.
- Bump a pack's version (`components.json` for a kit, `pack.json` otherwise) whenever its files change. The app never downgrades a pack.
- Kit UI is written by Claude from real library values, never copied source; no NOTICE file. Fonts are OFL only, with their text in `fonts/LICENSES.md`. Never add GradientDeck reference text here: the app fetches it from GradientDeck on the user's machine.

## Release (Claude may push and release; ask first only for a key change)

1. `node scripts/validate.mjs && node scripts/validate-packs.mjs`, then commit and push `main`.
2. `node scripts/release.mjs --release packs-vN --serial N`, with N one above the last release's serial. It packs, signs `dist/catalog.lock.json` with the key at `~/.config/cubiq/harness-plugin-signing.pem` (never commit it, never print it), and publishes the zips, the catalog and its `.sig` as the latest release.
3. Apps already installed see it at their next launch: the signed catalog's serial is newer, so they offer the update. To make it the built-in floor for new installs too, copy `dist/catalog.lock.json` into `../aiharness/src/main/design/resource-catalog.json` and set `commit` there to the release's commit (tests check that tree out).
