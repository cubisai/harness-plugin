# harness-plugin

Extra design resources for CubiQ, downloaded by the app instead of shipped in the installer. The app asks once, at launch, whether to download them. You can also get them later from Settings → Design resources.

| Pack | Kind | What it is |
|---|---|---|
| `shadcn-ui`, `mui`, `ant-design`, `chakra-ui`, `mantine`, `varelyo-ui` | kit | HTML and CSS components an agent composes pages from. Each kit's blocks are its page templates. |
| `fonts` | fonts | Open Font License faces that styles and references use. |
| `legacy-styles` | styles | The 32 original CubiQ styles, kept so older designs still open. New designs no longer pick from them. |

Foundation, the default kit, still ships with the app, so design mode works offline without any of these.

Every kit is written from scratch. It follows a library's look, but it is unofficial and not affiliated with or endorsed by that library. `components.json` records the real package import of each component, for handoff only; nothing here imports it. Fonts carry their license text in `fonts/LICENSES.md`.

## Layout

```
catalog.json               every pack: id, kind, folder, name
registry.json              kits, versions, themes, card tokens
kits/<kit-id>/             index.md DESIGN.md tokens.css ui.css ui.js components.json blocks/ themes/
fonts/                     pack.json LICENSES.md *.woff2
styles/<style>/            index.md DESIGN.md tokens.css (styles/pack.json for the pack)
scripts/validate.mjs       kits: schema, size limits, no remote URLs
scripts/validate-packs.mjs catalog, fonts and styles
scripts/pack.mjs           one zip per pack, plus dist/catalog.lock.json
```

## How the app gets a pack

Each release carries one zip per pack. The app has each zip's URL and SHA-256 built in, and refuses any download that doesn't match. A changed pack therefore reaches people with the next app version, never on its own. The app also checks each archive's paths, sizes and file types before unpacking it, and checks the folder after unpacking.

## Check and pack

```
node scripts/validate.mjs
node scripts/validate-packs.mjs
node scripts/pack.mjs --release packs-v1
```

Each exits 0 when everything passes.
