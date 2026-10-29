"""Turns the Foundry dnd5e SRD 5.2 spells, equipment and starting kits into catalog.json for the
Monolith D&D game.   python3 scripts/srd-catalog.py <fvtt>/packs/_source catalog.json"""
import yaml, glob, json, re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import srd_common as C
SRC = sys.argv[1]; OUT = os.path.abspath(sys.argv[2])
C.load_index(SRC); os.chdir(SRC)
def y(f): return yaml.safe_load(open(f))
def files(pat): return sorted(f for f in glob.glob(pat, recursive=True) if not f.endswith("_folder.yml"))
SCHOOL = {"abj": "Abjuration", "con": "Conjuration", "div": "Divination", "enc": "Enchantment", "evo": "Evocation", "ill": "Illusion", "nec": "Necromancy", "trs": "Transmutation"}
UNIT = {"ft": "feet", "mi": "miles", "self": "Self", "touch": "Touch", "spec": "Special", "any": "Unlimited", "sight": "Sight"}
def plural(n, w): return f"{n} {w}{'' if str(n) == '1' else 's'}"

# ---------- class spell lists ----------
lists = {}
for f in files("content24/chapter-7/*.yml"):
    for p in (y(f).get("pages") or []):
        m = re.match(r"(\w+) Spell List", p["name"])
        if m: lists[m.group(1)] = {u.split(".")[-1] for u in (p.get("system") or {}).get("spells", [])}

# ---------- spells ----------
def ctime(a, props):
    t = a.get("type"); v = a.get("value"); cond = a.get("condition") or ""
    s = {"action": "Action", "bonus": "Bonus Action", "reaction": "Reaction", "minute": plural(v or 1, "minute"), "hour": plural(v or 1, "hour"), "day": plural(v or 1, "day"), "special": "Special"}.get(t, t or "")
    if t == "reaction" and cond: s += ", " + cond
    if "ritual" in props: s += " or Ritual"
    return s
def rng(r, tgt):
    u = r.get("units"); v = r.get("value")
    tp = (tgt or {}).get("template") or {}
    area = ""
    if tp.get("type") and tp.get("size"):
        sz, ty = tp["size"], tp["type"]
        area = {"sphere": f"{sz}-foot-radius Sphere", "cone": f"{sz}-foot Cone", "cube": f"{sz}-foot Cube", "line": f"{sz}-foot Line", "cylinder": f"{sz}-foot-radius Cylinder",
                "radius": f"{sz}-foot Emanation", "emanation": f"{sz}-foot Emanation", "square": f"{sz}-foot Square", "wall": f"{sz}-foot Wall"}.get(ty, f"{sz}-foot {ty}")
    base = f"{v} {UNIT.get(u, u)}" if v and u in ("ft", "mi") else UNIT.get(u, u or "")
    if base == "Self" and area: return f"Self ({area})", area
    return base, area
def dur(dd, props):
    u = dd.get("units"); v = dd.get("value")
    s = {"inst": "Instantaneous", "perm": "Until dispelled", "spec": "Special", "round": plural(v or 1, "round"), "minute": plural(v or 1, "minute"), "hour": plural(v or 1, "hour"), "day": plural(v or 1, "day"), "disp": "Until dispelled", "dstr": "Until dispelled or triggered"}.get(u, u or "")
    if "concentration" in props: s = "Concentration, up to " + s
    return s
def damage(sysd):
    """the spell's main damage or healing roll: {d: '8d6', type: 'Fire', kind: 'save'|'attack'|'heal'|'damage', save: 'dex', scale: [n, die]}"""
    acts = sysd.get("activities") or {}; acts = list(acts.values()) if isinstance(acts, dict) else acts
    for a in acts:
        t = a.get("type")
        parts = ((a.get("damage") or {}).get("parts") or []) if t in ("attack", "save", "damage") else ([(a.get("healing") or {})] if t == "heal" else [])
        for p in parts:
            if not p: continue
            n, den, bonus = p.get("number"), p.get("denomination"), (p.get("bonus") or "").strip()
            custom = (p.get("custom") or {})
            if custom.get("enabled") and custom.get("formula"): dice = custom["formula"]
            elif n and den: dice = f"{n}d{den}" + (f" + {bonus}" if bonus else "")
            else: continue
            dice = dice.replace("@mod", "mod")
            sc = p.get("scaling") or {}
            out = {"d": dice, "type": ", ".join(x.title() for x in (p.get("types") or []) if x != "healing") , "kind": "heal" if t == "heal" else t}
            if t == "save": out["save"] = ((a.get("save") or {}).get("ability") or [""])
            if isinstance(out.get("save"), list): out["save"] = out["save"][0] if out["save"] else ""
            if sc.get("mode") == "whole" and (sc.get("number") or 0): out["up"] = [sc["number"], den]
            return out
    return None
spells = []
for f in files("spells24/**/*.yml"):
    d = y(f); s = d["system"]; props = s.get("properties") or []
    r, area = rng(s.get("range") or {}, s.get("target"))
    tgt = (s.get("target") or {}).get("affects") or {}
    C.EXTRA.clear(); C.EXTRA["affects"] = "Each creature" if tgt.get("type") in ("creature", "", None) else "Each " + tgt.get("type"); C.EXTRA["template"] = area or "area"
    dm = damage(s)
    if dm: C.EXTRA["damage"] = (dm["d"] + " " + dm["type"]).strip()
    comp = [x for x, k in (("V", "vocal"), ("S", "somatic"), ("M", "material")) if k in props]
    mat = ((s.get("materials") or {}).get("value") or "").strip()
    sp = {"n": d["name"], "l": s.get("level", 0), "sch": SCHOOL.get(s.get("school"), s.get("school") or ""), "ct": ctime(s.get("activation") or {}, props), "rg": r,
          "cmp": ", ".join(comp) + (f" ({mat})" if "M" in comp and mat else ""), "dur": dur(s.get("duration") or {}, props),
          "cls": sorted(c for c, ids in lists.items() if d["_id"] in ids), "t": C.clean(s["description"]["value"])}
    if "concentration" in props: sp["conc"] = 1
    if "ritual" in props: sp["rit"] = 1
    if dm: sp["dmg"] = dm
    spells.append(sp)

# ---------- equipment ----------
CAT = {"weapon": "Weapon", "tool": "Tools", "container": "Container"}
def category(f, d):
    s = d["system"]; t = (s.get("type") or {}).get("value") or ""; kind = d["type"]; folder = f.split("/")[1]
    if kind == "weapon": return "Weapon"
    if folder == "armor" or t in ("light", "medium", "heavy", "shield"): return "Armor"
    if kind == "tool": return "Tools"
    if kind == "consumable": return {"potion": "Potion", "scroll": "Scroll", "ammo": "Ammunition", "poison": "Poison", "food": "Food & drink", "wand": "Wand", "rod": "Rod"}.get(t, "Adventuring gear" if folder == "adventuring-gear" else "Wondrous item")
    if kind == "container": return "Container"
    if t in ("ring", "rod", "wand", "staff"): return t.title()
    if t == "wondrous": return "Wondrous item"
    if t == "clothing": return "Clothing"
    return "Adventuring gear" if folder in ("adventuring-gear",) else "Wondrous item" if "mgc" in (s.get("properties") or []) else "Adventuring gear"
RAR = {"common": "Common", "uncommon": "Uncommon", "rare": "Rare", "veryRare": "Very rare", "legendary": "Legendary", "artifact": "Artifact"}
WPROP = {"amm": "Ammunition", "fin": "Finesse", "hvy": "Heavy", "lgt": "Light", "lod": "Loading", "rch": "Reach", "thr": "Thrown", "two": "Two-Handed", "ver": "Versatile"}
items = []; names = {}
for f in files("equipment24/**/*.yml"):
    if f.split("/")[1] in ("traps", "supplemental"): continue
    d = y(f); s = d["system"]
    if d["name"].startswith("Activate ") or d["type"] not in ("weapon", "equipment", "consumable", "tool", "loot", "container"): continue
    pr = s.get("price") or {}; wt = (s.get("weight") or {}).get("value") or 0
    it = {"n": d["name"], "cat": category(f, d), "cost": f"{pr.get('value')} {pr.get('denomination')}" if pr.get("value") else "", "wt": round(float(wt), 3)}
    props = s.get("properties") or []
    if "mgc" in props or s.get("rarity"): it["mag"] = 1
    if s.get("rarity") in RAR: it["rar"] = RAR[s["rarity"]]
    if s.get("attunement") == "required": it["att"] = 1
    if d["type"] == "weapon":
        dmg = (s.get("damage") or {}).get("base") or {}
        if dmg.get("number") and dmg.get("denomination"):
            it["wpn"] = {"d": f"{dmg['number']}d{dmg['denomination']}", "type": ", ".join(x.title() for x in dmg.get("types") or []), "p": [WPROP[p] for p in props if p in WPROP],
                         "r": (s.get("type") or {}).get("value", "").endswith("R"), "k": "martial" if (s.get("type") or {}).get("value", "").startswith("martial") else "simple", "b": s.get("magicalBonus") or 0, "mast": (s.get("mastery") or "").title()}
    if (s.get("type") or {}).get("value") in ("light", "medium", "heavy", "shield"):
        a = s.get("armor") or {}; it["arm"] = {"t": s["type"]["value"], "ac": a.get("value") or 0, "dex": a.get("dex"), "b": s.get("magicalBonus") or 0}
    C.EXTRA.clear(); it["t"] = C.clean(s["description"]["value"])
    items.append(it); names[d["_id"]] = d["name"]

# ---------- starting equipment ----------
FOCUS = {"holy": "Holy symbol of your choice", "arcane": "Arcane focus of your choice", "druidic": "Druidic focus of your choice"}
TOOLK = {"music": "Musical instrument of your choice", "art": "Artisan's tools of your choice", "game": "Gaming set of your choice"}
def kit(d):
    se = d["system"].get("startingEquipment") or []; wealth = d["system"].get("wealth")
    by = {}; [by.setdefault(e.get("group") or "", []).append(e) for e in sorted(se, key=lambda e: e.get("sort", 0))]
    def flat(group):
        out = {"items": [], "gp": 0}
        for e in by.get(group, []):
            t = e["type"]
            if t in ("AND",): sub = flat(e["_id"]); out["items"] += sub["items"]; out["gp"] += sub["gp"]
            elif t == "linked": i = e["key"].split(".")[-1]; out["items"].append([names.get(i) or (C.idx.get(i) or {}).get("name", "?"), e.get("count") or 1])
            elif t == "currency": out["gp"] += e.get("count") or 0
            elif t == "focus": out["items"].append([FOCUS.get(e.get("key"), "Spellcasting focus"), 1])
            elif t == "tool": out["items"].append([TOOLK.get(e.get("key"), "Tool of your choice"), e.get("count") or 1])
            elif t == "OR": out.setdefault("or", []).append([flat(x["_id"]) if x["type"] == "AND" else flat_one(x) for x in by.get(e["_id"], [])])
        return out
    def flat_one(e):
        g = {"items": [], "gp": 0}; by.setdefault("__one", []); by["__one"] = [e]; return flat("__one")
    root = flat("")
    opts = root.get("or", [[]])[0] if root.get("or") else [root]
    opts = [o for o in opts if o["items"] or o["gp"]]
    if wealth and not any(not o["items"] for o in opts): opts.append({"items": [], "gp": wealth})
    return [{"items": o["items"], "gp": o["gp"]} for o in opts]
kits = {"class": {}, "bg": {}}
for f in files("classes24/*/*.yml"):
    d = y(f)
    if d.get("type") == "class": kits["class"][d["name"]] = kit(d)
for f in files("origins24/backgrounds/*.yml"):
    d = y(f)
    if d.get("type") == "background": kits["bg"][d["name"]] = kit(d)
json.dump({"spells": spells, "items": items, "kits": kits}, open(OUT, "w"), ensure_ascii=False, indent=0)
print(len(spells), "spells,", len(items), "items,", len(kits["class"]), "class kits,", len(kits["bg"]), "background kits")
