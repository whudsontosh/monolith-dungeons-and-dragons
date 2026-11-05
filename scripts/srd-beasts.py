"""Makes src/beasts.js: the SRD's Beasts up to CR 2 (familiars, Wild Shape forms, steeds and
companions), taken from src/monsters.js so players have them without the GM's whole bestiary.
    python3 scripts/srd-beasts.py src/monsters.js src/beasts.js"""
import json, re, sys
src, out = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf8").read()
data = json.loads(text[text.index("const DND_MONSTERS = ") + len("const DND_MONSTERS = "):].rstrip().rstrip(";"))
beasts = [m for m in data if m["type"].startswith("Beast") and m["cr"] <= 2]
head = text[:text.index("const DND_MONSTERS")].replace("THE SRD MONSTERS (GENERATED)", "THE SRD BEASTS (GENERATED)")
head = re.sub(r"330 stat blocks.*?Loaded on the GM's page only\.", f"The {len(beasts)} Beasts up to Challenge Rating 2, for companions, familiars and Wild Shape,\n   made from monsters.js by scripts/srd-beasts.py. Loaded on every page.", head, flags=re.S)
open(out, "w", encoding="utf8").write(head + "const DND_BEASTS = " + json.dumps(beasts, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(beasts), "beasts")
