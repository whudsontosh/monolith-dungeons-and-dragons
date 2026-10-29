# Dungeons and Dragons for Monolith

A D&D 2024 rules (5.5e) game for [Monolith](https://github.com/whudsontosh/monolith): a character
creator, a full character sheet with rolls, and the GM's party screens. Beta.

Players don't download anything from here: once the game is on Monolith's approved list, Monolith
installs it from **More games** and keeps it up to date.

## What's here

| Path | What it is |
|---|---|
| `game.json` | The game's manifest: id, version, the Monolith it needs, its rulesets and files |
| `src/rules.js` | The rules: abilities, skills, classes, proficiency, spell slots, and every number the sheet works out |
| `src/data.js` | What the creator offers: class details, backgrounds, species, origin feats, weapons and armor |
| `src/sheet.js` | The character sheet (Sheet, Spells, Inventory and Details tabs) and the panel beside the map |
| `src/builder.js` | The character creator: Class, Background, Species, Abilities, Equipment, Name & finish |
| `src/gm.js` | The GM's party table, the GM's view of a sheet, and health rings on map tokens |
| `src/game.js` | How the game registers with Monolith, the example character and roster cards |
| `src/skin.css`, `src/fonts/` | The look: parchment, oxblood and gold, Cinzel and Crimson Pro |
| `src/build.py` | Builds `dist/game/` (what Monolith loads) and `dist/release/` (the zip and `release.json`) |
| `tests/` | The game's tests, run against a Monolith checkout |

`build.py` joins the source files into one `game.js` in the order listed in `BUNDLES`. Add a new
source file to that list or it won't be included.

## Working on it

```sh
python3 src/build.py
# run a developer copy of Monolith with this game loaded from the folder (PowerShell):
#   cd ..\monolith; $env:MONOLITH_DEV_GAMES = "..\monolith-dungeons-and-dragons\dist\game"; npm start
# tests (need ../monolith built: python3 src/build.py && npm install there, and Playwright)
python3 tests/run_all.py
```

See [DEVELOPING.md](https://github.com/whudsontosh/monolith/blob/main/DEVELOPING.md) in the Monolith
repository for the full set-up.

## Releasing

Bump `version` in `game.json`, add a section to `CHANGELOG.md` and push to `main`. The workflow
tests the game against the latest Monolith, signs `release.json` with the Monolith signing key (the
`MONOLITH_SIGNING_KEY` secret) and publishes the release. To make the game appear in Monolith, add it
to `games.json` in the Monolith repository.

## Licences

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, https://creativecommons.org/licenses/by/4.0/legalcode.

Cinzel and Crimson Pro: SIL Open Font License 1.1 (licence texts in `src/fonts/`).

Dungeons & Dragons is a trademark of Wizards of the Coast. This is an unofficial fan tool.
