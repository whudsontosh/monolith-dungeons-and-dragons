"""Writes src/monsters.js from monsters.json (the SRD 5.2 monsters, made by srd-monsters.py)."""
import json, sys
d = json.load(open(sys.argv[1]))
js = """/* ============================== D&D 2024: THE SRD MONSTERS (GENERATED) ==============================
   330 stat blocks from the SRD 5.2, by way of the Foundry VTT dnd5e system's data, with attack
   bonuses, damage and save DCs worked out by scripts/srd-monsters.py. Loaded on the GM's page only.

   This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
   Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
   Commons Attribution 4.0 International License, https://creativecommons.org/licenses/by/4.0/legalcode. */
const DND_MONSTERS = %s;
""" % json.dumps(d, ensure_ascii=False, separators=(",", ":"))
open(sys.argv[2], "w", encoding="utf-8").write(js)
print(len(js) // 1024, "KB")
