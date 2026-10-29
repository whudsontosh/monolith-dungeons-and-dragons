"""Builds this game for Monolith.
   dist/game/      the game as Monolith loads it (point MONOLITH_DEV_GAMES here)
   dist/release/   <id>-<version>.zip and release.json, ready to sign and publish

   To add a source file, put it in src/ and add its name to the right list in BUNDLES.
   Files are joined in the order listed, so put shared rules first."""
import os, json, hashlib, shutil, zipfile, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
M = json.load(open(os.path.join(ROOT, "game.json"), encoding="utf-8"))

# which source files make up each script Monolith loads (the names in game.json "entry")
SHARED = []                          # e.g. ["rules.js"] once you split rules out
BUNDLES = {"game.js": SHARED + ["rules.js", "data.js", "classdata.js", "sheet.js", "builder.js", "levelup.js", "gm.js", "game.js"]}
COPY = [f for f in M.get("css", [])]  # stylesheets listed in game.json, copied as they are
FOLDERS = ["fonts", "images"]        # copied whole if they exist in src/

OUT = os.path.join(ROOT, "dist", "game"); REL = os.path.join(ROOT, "dist", "release")
shutil.rmtree(os.path.join(ROOT, "dist"), ignore_errors=True); os.makedirs(OUT); os.makedirs(REL)
rd = lambda p: open(os.path.join(HERE, p), encoding="utf-8").read()
head = f"/* {M['name']} {M['version']} for Monolith */\n\"use strict\";\n"
for name, files in BUNDLES.items():
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(head + "\n".join(f"/* ---- {s} ---- */\n" + rd(s) for s in files))
for f in COPY: shutil.copy(os.path.join(HERE, f), os.path.join(OUT, f))
for d in FOLDERS:
    if os.path.isdir(os.path.join(HERE, d)): shutil.copytree(os.path.join(HERE, d), os.path.join(OUT, d))
json.dump(M, open(os.path.join(OUT, "game.json"), "w", encoding="utf-8"), indent=2)

# the release: a zip plus release.json listing the SHA-256 of the zip and of every file
files = {}
for dp, dn, fn in os.walk(OUT):
    for f in sorted(fn):
        p = os.path.join(dp, f); files[os.path.relpath(p, OUT).replace(os.sep, "/")] = hashlib.sha256(open(p, "rb").read()).hexdigest()
zname = f"{M['id']}-{M['version']}.zip"; zpath = os.path.join(REL, zname)
with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
    for rel in sorted(files):
        zi = zipfile.ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, open(os.path.join(OUT, rel), "rb").read())
data = open(zpath, "rb").read()
release = {"format": "monolith-game-release", "id": M["id"], "name": M["name"], "version": M["version"], "api": M["api"],
           "minMonolith": M["minMonolith"], "file": zname, "size": len(data), "sha256": hashlib.sha256(data).hexdigest(),
           "files": files, "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
open(os.path.join(REL, "release.json"), "w").write(json.dumps(release, indent=1))
print("built", zname, len(data), "bytes,", len(files), "files")
