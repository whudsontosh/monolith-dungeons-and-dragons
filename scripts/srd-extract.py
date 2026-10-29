"""Turns the Foundry dnd5e SRD 5.2 class data into dnd-classes.json for the Monolith D&D game."""
import yaml, glob, json, re, html, os, sys
SRC = sys.argv[1]; OUT = sys.argv[2]
os.chdir(SRC)
idx = {}; byname = {}
def walk(o):
    if isinstance(o, dict):
        if o.get("_id") and o.get("name"): idx[o["_id"]] = o
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in glob.glob("**/*.yml", recursive=True):
    if f.endswith("_folder.yml"): continue
    try: d = yaml.safe_load(open(f))
    except Exception: continue
    walk(d)

AB = {"str": "Strength", "dex": "Dexterity", "con": "Constitution", "int": "Intelligence", "wis": "Wisdom", "cha": "Charisma"}
def lookup(expr):
    m = re.search(r"@abilities\.(\w+)\.mod", expr)
    if m: return f"your {AB.get(m.group(1), m.group(1))} modifier"
    if "@prof" in expr: return "your Proficiency Bonus"
    m = re.search(r"@classes\.(\w+)\.levels", expr)
    if m: return f"your {m.group(1).title()} level"
    m = re.search(r"@scale\.(\w+)\.([\w-]+)", expr)
    if m: return f"the {m.group(2).replace('-', ' ').replace('lands aid', 'Land\'s Aid')} value in your class table"
    return expr.strip()
def clean(h):
    if not h: return ""
    s = html.unescape(h)
    # Foundry's own notes about its app are not SRD text: drop them
    s = re.sub(r'<section class="(secret|fvtt[^"]*)"[^>]*>.*?</section>', "", s, flags=re.S)
    s = re.sub(r"<p><strong>Foundry Note</strong></p>\s*<p>.*?</p>", "", s, flags=re.S)
    s = re.sub(r'<span class="hide-in-embed">.*?</span>', "", s, flags=re.S)
    s = re.sub(r"<p><strong>(Current [^<]*|Combined Level Available):?</strong>.*?</p>", "", s, flags=re.S)
    s = re.sub(r"\s*\(currently,? \[\[[^\]]*\]\]\)", "", s)
    s = re.sub(r",? currently,? \[\[[^\]]*\]\]", "", s)
    s = re.sub(r'\s*\(change the Grouping mode[^)]*\)', "", s)
    s = re.sub(r"@Embed\[[^\]]*\](\{[^}]*\})?", "", s)
    def uuid(m):
        if m.group(2): return m.group(2)
        i = m.group(1).split(".")[-1]
        return idx[i]["name"] if i in idx else ""
    s = re.sub(r"@UUID\[([^\]]*)\](?:\{([^}]*)\})?", uuid, s)
    s = re.sub(r"&Reference\[([^\]]*)\](?:\{([^}]*)\})?", lambda m: m.group(2) or re.sub(r" apply=\w+", "", m.group(1)), s)
    def inline(m):
        body, label = m.group(1), m.group(2)
        if label: return label
        b = body.strip()
        if b.startswith("lookup"): return lookup(b[6:])
        if b.startswith("/item"): return b[5:].strip()
        if b.startswith("/damage") or b.startswith("/healing"):
            parts = b.split(" ")[1:]; f = [p for p in parts if "=" not in p]; t = [p.split("=")[1] for p in parts if p.startswith("type=")]
            return " ".join(f + t)
        if b.startswith("/r"): return b[2:].strip()
        if b.startswith("/check") or b.startswith("/skill"): return b.split(" ", 1)[1] if " " in b else ""
        if b.startswith("/award"): return b.split(" ", 1)[1] if " " in b else ""
        return lookup(b)
    s = re.sub(r"\[\[(.*?)\]\](?:\{([^}]*)\})?", inline, s)
    s = re.sub(r"<li[^>]*>", "\n• ", s); s = re.sub(r"</(p|h\d|li|ul|ol|div|table|tr)>", "\n", s); s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<(td|th)[^>]*>", " | ", s)
    s = re.sub(r"<[^>]+>", "", s); s = html.unescape(s).replace("­", "").replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s); s = re.sub(r"\n\s*\n+", "\n\n", s); s = re.sub(r" *\n *", "\n", s)
    return s.strip()

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
