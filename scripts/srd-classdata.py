"""Writes src/classdata.js from classes.json (the extracted SRD 5.2 class data)."""
import json, sys, re
d = json.load(open(sys.argv[1]))
def fix(t):
    t = t.replace("[[lookup @scale.land.lands-aid]]", "the Land's Aid amount from your table")
    # lines about Foundry "activities" are notes on that app, not rules text
    return "\n".join(l for l in t.split("\n") if not re.search(r"\bactivit(y|ies)\b", l)).strip()
def feat(f):
    o = {"n": f["n"]}
    if f.get("t"): o["t"] = fix(f["t"])
    for k in ("asi", "sub"):
        if f.get(k): o[k] = 1
    if f.get("choose"): o["choose"] = f["choose"]; o["pool"] = f["pool"]
    return o
out = {}
for n, c in d["classes"].items():
    sub = c["subs"][0] if c["subs"] else None
    out[n] = {"table": c["table"], "levels": {L: [feat(f) for f in fs] for L, fs in c["levels"].items()},
              "pools": {p: [{"n": f["n"].replace(p + ": ", ""), "t": fix(f["t"])} for f in l] for p, l in c["pools"].items()},
              "sub": {"n": sub["n"], "t": fix(sub["t"]), "table": sub["table"], "levels": {L: [feat(f) for f in fs] for L, fs in sub["levels"].items()}} if sub else None}
feats = [{"n": f["n"], "cat": f["cat"], "lvl": f["lvl"], "rep": f["rep"], "t": fix(f["t"])} for f in d["feats"]]
js = """/* ============================== D&D 2024: EVERY CLASS LEVEL (GENERATED) ==============================
   Each class's features for levels 1 to 20, its table (Rages, Sneak Attack and so on), its
   subclass from the SRD, the choices some features ask for, and the SRD feats.

   Generated from the System Reference Document 5.2, by way of the open data in the Foundry VTT
   dnd5e system (github.com/foundryvtt/dnd5e, packs/_source/classes24 and feats24). Don't edit
   this by hand; regenerate it. See the licence note in rules.js.

   This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the
   Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
   Commons Attribution 4.0 International License, https://creativecommons.org/licenses/by/4.0/legalcode. */
const DND_LEVELS = %s;
const DND_FEAT_LIST = %s;
""" % (json.dumps(out, ensure_ascii=False, separators=(",", ":")), json.dumps(feats, ensure_ascii=False, separators=(",", ":")))
open(sys.argv[2], "w", encoding="utf-8").write(js)
print(len(js) // 1024, "KB")
