"""Shared by the SRD extractors: loading the Foundry dnd5e packs and turning their HTML into plain rules text."""
import yaml, glob, json, re, html, os, sys

idx = {}
def load_index(src):
    """reads every item in the Foundry packs so references can be resolved by id"""
    def walk(o):
        if isinstance(o, dict):
            if o.get("_id") and o.get("name"): idx[o["_id"]] = o
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    for f in glob.glob(os.path.join(src, "**/*.yml"), recursive=True):
        if f.endswith("_folder.yml"): continue
        try: d = yaml.safe_load(open(f))
        except Exception: continue
        walk(d)
AB = {"str": "Strength", "dex": "Dexterity", "con": "Constitution", "int": "Intelligence", "wis": "Wisdom", "cha": "Charisma"}
def lookup(expr):
    if "@labels.description.affects" in expr: return EXTRA.get("affects", "Each creature")
    if "@labels.description.template" in expr: return EXTRA.get("template", "area")
    if "@item.level" in expr: return "the spell's level"
    m = re.search(r"@abilities\.(\w+)\.mod", expr)
    if m: return f"your {AB.get(m.group(1), m.group(1))} modifier"
    if "@prof" in expr: return "your Proficiency Bonus"
    m = re.search(r"@classes\.(\w+)\.levels", expr)
    if m: return f"your {m.group(1).title()} level"
    m = re.search(r"@scale\.(\w+)\.([\w-]+)", expr)
    if m: return f"the {m.group(2).replace('-', ' ').replace('lands aid', 'Land\'s Aid')} value in your class table"
    return expr.strip()
SKILL = {"acr": ("dex", "Acrobatics"), "ani": ("wis", "Animal Handling"), "arc": ("int", "Arcana"), "ath": ("str", "Athletics"), "dec": ("cha", "Deception"),
  "his": ("int", "History"), "ins": ("wis", "Insight"), "itm": ("cha", "Intimidation"), "inv": ("int", "Investigation"), "med": ("wis", "Medicine"), "nat": ("int", "Nature"),
  "prc": ("wis", "Perception"), "prf": ("cha", "Performance"), "per": ("cha", "Persuasion"), "rel": ("int", "Religion"), "slt": ("dex", "Sleight of Hand"), "ste": ("dex", "Stealth"), "sur": ("wis", "Survival")}
TOOL = {"thief": "Thieves' Tools"}
EXTRA = {}   # per-item fill-ins, e.g. the damage a bare [[/damage]] refers to
def check(b):
    """[[/check ability=wis skill=prc dc=15]] and friends, as words: 'DC 15 Wisdom (Perception)'"""
    kind, _, rest = b.partition(" "); kv = {}; pos = []
    for p in rest.split():
        if "=" in p: k, v = p.split("=", 1); kv[k] = v
        else: pos.append(p)
    for p in pos:
        if p.isdigit(): kv.setdefault("dc", p)
        elif p in SKILL: kv.setdefault("skill", p)
        elif p in AB: kv.setdefault("ability", p)
        elif p in TOOL: kv.setdefault("tool", p)
    sk = SKILL.get(kv.get("skill", ""))
    ab = AB.get(kv.get("ability") or (sk[0] if sk else ""), "")
    what = ab + (f" ({sk[1]})" if sk else f" ({TOOL[kv['tool']]})" if kv.get("tool") in TOOL else "")
    dc = kv.get("dc", "")
    pre = f"DC {dc} " if dc.isdigit() else ""
    tail = (" saving throw" if kind == "/save" else " check") if kv.get("format") == "long" else ""
    return (pre + what + tail).strip()
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
            parts = b.split(" ")[1:]; f = [p for p in parts if "=" not in p]; t = [p.split("=")[1].title() for p in parts if p.startswith("type=")]
            out = " ".join(f + [x for x in t if x != "Healing"]).replace("@item.level", "spell level")
            return out or EXTRA.get("damage", "")
        if b.startswith("/r") or b.startswith("/gmr"): return b.split(" ", 1)[1] if " " in b else ""
        if b.startswith("/check") or b.startswith("/save") or b.startswith("/tool") or b.startswith("/skill"): return check(b)
        if b.startswith("/award"): return b.split(" ", 1)[1] if " " in b else ""
        return lookup(b)
    s = re.sub(r"\[\[(.*?)\]\](?:\{([^}]*)\})?", inline, s)
    s = re.sub(r"<li[^>]*>", "\n• ", s); s = re.sub(r"</(p|h\d|li|ul|ol|div|table|tr)>", "\n", s); s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<(td|th)[^>]*>", " | ", s)
    s = re.sub(r"<[^>]+>", "", s); s = html.unescape(s).replace("­", "").replace("\xa0", " ")
    s = re.sub(r"[ \t]+", " ", s); s = re.sub(r"\n\s*\n+", "\n\n", s); s = re.sub(r" *\n *", "\n", s)
    return s.strip()

