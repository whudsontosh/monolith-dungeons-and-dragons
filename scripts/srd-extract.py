"""Turns the Foundry dnd5e SRD 5.2 class data into classes.json for the Monolith D&D game.
   python3 scripts/srd-extract.py <fvtt>/packs/_source classes.json"""
import yaml, glob, json, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from srd_common import clean, idx, load_index
SRC = sys.argv[1]; OUT = os.path.abspath(sys.argv[2])
load_index(SRC); os.chdir(SRC)
def adv_of(d):
    a = d["system"].get("advancement", {}); return list(a.values()) if isinstance(a, dict) else list(a)
SCALE_NAMES = {("barbarian", ""): "Rages", ("monk", ""): "Unarmored Movement", ("ranger", ""): "Favored Enemy",
  ("monk", "die"): "Martial Arts", ("monk", "focus"): "Focus Points", ("barbarian", "rage-damage"): "Rage Damage", ("barbarian", "mastery"): "Weapon Mastery",
  ("paladin", "aura"): "Aura range", ("sorcerer", "points"): "Sorcery Points"}
def scale_value(cfg, lvl):
    ks = [int(k) for k in cfg["scale"] if int(k) <= lvl]
    if not ks: return ""
    best = (max(ks), cfg["scale"][str(max(ks))])
    v = best[1]; t = cfg["type"]
    if t == "dice": return f"{v.get('number') or 1}d{v['faces']}" if v.get("number") else f"d{v['faces']}"
    if t == "distance": return f"+{v['value']} ft"
    if t == "cr": return {0.25: "1/4", 0.5: "1/2"}.get(v["value"], str(v["value"]))
    return v.get("value", "")
def scales(d, ident):
    out = []
    for a in adv_of(d):
        if a["type"] != "ScaleValue": continue
        c = a["configuration"]; key = (ident, c.get("identifier") or "")
        name = a.get("title") or SCALE_NAMES.get(key) or (c.get("identifier") or "").replace("-", " ").title()
        name = {"Max Prepared": "Prepared Spells", "Max Prepared Spells": "Prepared Spells", "Cantrips Known": "Cantrips", "Channel Divinity": "Channel Divinity"}.get(name, name)
        if (ident, c.get("identifier")) == ("warlock", "max-prepared"): name = "Prepared Spells"
        out.append({"n": name, "v": [scale_value(c, l) for l in range(1, 21)]})
    return out
def item(uuid):
    i = uuid.split(".")[-1]; return idx.get(i)
def feature(it):
    return {"n": it["name"], "t": clean(it["system"].get("description", {}).get("value", ""))}
def levels(d):
    lv = {}
    for a in adv_of(d):
        L = a.get("level")
        if a["type"] == "ItemGrant" and L:
            for g in a["configuration"].get("items", []):
                it = item(g["uuid"])
                if it and it.get("type") == "feat": lv.setdefault(L, []).append(feature(it))
        if a["type"] == "ItemChoice":
            c = a["configuration"]; pool = [item(p["uuid"]) for p in c.get("pool", [])]; pool = [feature(p) for p in pool if p]
            for k, v in sorted(c.get("choices", {}).items(), key=lambda x: int(x[0])):
                if v.get("count"):
                    lv.setdefault(int(k), []).append({"n": a.get("title") or "Choice", "choose": v["count"], "pool": a.get("title"), "t": ""})
            yield_pool[a.get("title")] = pool
        if a["type"] == "AbilityScoreImprovement" and L:
            lv.setdefault(L, []).append({"n": "Epic Boon" if L == 19 else "Ability Score Improvement", "asi": True, "t": ""})
        if a["type"] == "Subclass" and L:
            lv.setdefault(L, []).insert(0, {"n": "Subclass", "sub": True, "t": ""})
    return {str(k): v for k, v in sorted(lv.items())}

classes = {}
for f in sorted(glob.glob("classes24/*/*.yml")):
    if f.endswith("_folder.yml"): continue
    d = yaml.safe_load(open(f))
    if d["type"] != "class": continue
    ident = d["system"]["identifier"]; yield_pool = {}
    lv = levels(d)
    # the class's own subclass
    subs = []
    for g in sorted(glob.glob(os.path.dirname(f) + "/*.yml")):
        s = yaml.safe_load(open(g))
        if isinstance(s, dict) and s.get("type") == "subclass":
            subs.append({"n": s["name"], "t": clean(s["system"].get("description", {}).get("value", "")), "levels": levels(s), "table": scales(s, ident)})
    classes[d["name"]] = {"hd": d["system"]["hd"]["denomination"], "table": scales(d, ident), "levels": lv, "pools": yield_pool, "subs": subs,
                          "intro": clean(d["system"].get("description", {}).get("value", ""))[:600]}

feats = []
for f in sorted(glob.glob("feats24/*/*.yml")):
    if f.endswith("_folder.yml"): continue
    d = yaml.safe_load(open(f)); sysd = d["system"]
    cat = os.path.basename(os.path.dirname(f)).replace("-feats", "")
    pre = sysd.get("prerequisites", {}) or {}
    feats.append({"n": d["name"], "cat": cat, "lvl": pre.get("level") or 0, "rep": bool(pre.get("repeatable")), "t": clean(sysd.get("description", {}).get("value", ""))})
json.dump({"classes": classes, "feats": feats}, open(OUT, "w"), indent=1, ensure_ascii=False)
print(len(classes), "classes,", sum(len(c["levels"]) for c in classes.values()), "class levels with features,", len(feats), "feats")
