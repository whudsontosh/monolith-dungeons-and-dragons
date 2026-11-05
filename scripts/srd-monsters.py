"""Turns the Foundry dnd5e SRD 5.2 monsters (packs/_source/actors24) into monsters.json for the
Monolith D&D game, working out the numbers Foundry calculates live (attack bonuses, damage, save
DCs) the way the 2024 rules do: proficiency bonus from CR, plus the ability modifier.
   python3 scripts/srd-monsters.py <fvtt>/packs/_source monsters.json"""
import yaml, glob, json, re, os, sys, html, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import srd_common as C
SRC = sys.argv[1]; OUT = os.path.abspath(sys.argv[2])
C.load_index(SRC); os.chdir(os.path.join(SRC, "actors24"))
SKIP = ("premades", "vehicles", "magic-items", "conjurations", "summons", "companions")
AB = ["str", "dex", "con", "int", "wis", "cha"]
SIZE = {"tiny": "Tiny", "sm": "Small", "med": "Medium", "lg": "Large", "huge": "Huge", "grg": "Gargantuan"}
SIZE_SQ = {"tiny": 0.5, "sm": 1, "med": 1, "lg": 2, "huge": 3, "grg": 4}
XP = {0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500,
      15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000}
def pb_for(cr): return 2 + max(0, math.ceil(max(cr, 1) / 4) - 1)
def mod(v): return (int(v) - 10) // 2
def sgn(n): return f"+{n}" if n >= 0 else f"−{-n}"
def avg(formula):
    """average of '2d6 + 3' (rounded down), or None"""
    t = 0.0; ok = False
    for sign, n, dd, flat in re.findall(r"([+-]?)\s*(?:(\d*)d(\d+)|(\d+))", formula.replace(" ", "")):
        s = -1 if sign == "-" else 1
        if dd: t += s * int(n or 1) * (int(dd) + 1) / 2; ok = True
        elif flat: t += s * int(flat)
    return math.floor(t) if ok or formula.strip().isdigit() else None

def acts_of(it):
    a = it["system"].get("activities") or {}; return list(a.values()) if isinstance(a, dict) else a

class Mon:
    def __init__(s, d):
        s.d = d; sy = d["system"]; s.ab = {a: int(sy["abilities"][a]["value"]) for a in AB}; s.m = {a: mod(v) for a, v in s.ab.items()}
        s.cr = float(sy["details"].get("cr") or 0); s.pb = pb_for(s.cr); s.items = d.get("items", [])
        s.byid = {i["_id"]: i for i in s.items}; s.acts = {}
        for it in s.items:
            for a in acts_of(it): s.acts[a.get("_id")] = (it, a)
        s.spell_ab = sy["attributes"].get("spellcasting") or "int"
    def ev(s, expr):
        """a Foundry formula like '@prof', '8 + @prof + @abilities.con.mod' or '2' as a number"""
        e = str(expr or "").strip()
        if not e: return 0
        e = e.replace("@prof", str(s.pb)).replace("@attributes.prof", str(s.pb))
        e = re.sub(r"@abilities\.(\w+)\.mod", lambda m: str(s.m.get(m.group(1), 0)), e)
        e = re.sub(r"@abilities\.(\w+)\.dc", lambda m: str(8 + s.pb + s.m.get(m.group(1), 0)), e)
        e = e.replace("@attributes.spell.dc", str(8 + s.pb + s.m.get(s.spell_ab, 0))).replace("@mod", "0")
        if re.search(r"[^0-9+\-*/(). ]", e): return None
        try: return int(eval(e, {"__builtins__": {}}, {}))
        except Exception: return None
    def weapon_ab(s, it, a):
        ab = ((a.get("attack") or {}).get("ability") or "").strip()
        if ab and ab != "none": return ab if ab != "spellcasting" else s.spell_ab
        props = it["system"].get("properties") or []; kind = ((a.get("attack") or {}).get("type") or {}).get("value") or ""
        if "fin" in props: return "str" if s.m["str"] >= s.m["dex"] else "dex"
        return "dex" if kind == "ranged" else "str"
    def attack(s, it, a):
        at = a.get("attack") or {}; ab = s.weapon_ab(it, a)
        b = s.ev(at.get("bonus")) or 0
        if at.get("flat"): return b
        return s.pb + s.m[ab] + b + int(it["system"].get("magicalBonus") or 0)
    def damage_parts(s, it, a):
        out = []; dm = a.get("damage") or {}
        if a.get("type") == "attack" and dm.get("includeBase") and it["type"] == "weapon":
            base = (it["system"].get("damage") or {}).get("base") or {}
            if base.get("number") and base.get("denomination"):
                bonus = s.m[s.weapon_ab(it, a)] + int(it["system"].get("magicalBonus") or 0) + (s.ev(base.get("bonus")) or 0)
                out.append((f"{base['number']}d{base['denomination']}", bonus, ", ".join(t.title() for t in base.get("types") or [])))
        for p in (dm.get("parts") or []):
            cu = p.get("custom") or {}
            if cu.get("enabled") and cu.get("formula"):
                f = cu["formula"]; f2 = re.sub(r"@abilities\.(\w+)\.mod", lambda m: str(s.m.get(m.group(1), 0)), f).replace("@mod", "0").replace("@prof", str(s.pb))
                m = re.match(r"^\s*(\d*d\d+)\s*(?:([+-])\s*(\d+))?\s*$", f2)
                if m: out.append((m.group(1), (int(m.group(3)) * (1 if m.group(2) == "+" else -1)) if m.group(3) else 0, ", ".join(t.title() for t in p.get("types") or [])))
                elif re.fullmatch(r"\s*\d+\s*", f2): out.append(("", int(f2), ", ".join(t.title() for t in p.get("types") or [])))
                continue
            if not (p.get("number") and p.get("denomination")):
                if (p.get("bonus") or "").strip(): v = s.ev(p["bonus"]); out.append(("", v or 0, ", ".join(t.title() for t in p.get("types") or [])))
                continue
            bonus = s.ev(p.get("bonus")) or 0
            out.append((f"{p['number']}d{p['denomination']}", bonus, ", ".join(t.title() for t in p.get("types") or [])))
        return out
    def save_dc(s, a):
        dc = (a.get("save") or {}).get("dc") or {}; calc = dc.get("calculation") or ""
        if calc == "spellcasting": return 8 + s.pb + s.m.get(s.spell_ab, 0)
        if calc in AB: return 8 + s.pb + s.m[calc]
        return s.ev(dc.get("formula"))

def fmt_part(dice, bonus, typ, with_type=True):
    f = dice + (f" {'+' if bonus >= 0 else '−'} {abs(bonus)}" if dice and bonus else "") if dice else str(bonus)
    a = avg(f.replace("−", "-")) if dice else bonus
    return f"{a} ({f})" + (f" {typ}" if typ and with_type else "") if dice else f"{a}" + (f" {typ}" if typ and with_type else "")

def text_for(mon, it):
    """the item's description with Foundry's live values filled in"""
    h = html.unescape((it["system"].get("description") or {}).get("value") or "")
    h = re.sub(r"&Reference\[([^\]}]*)\}", lambda m: m.group(1).split(" ")[0], h)   # a typo in the source: [Concentration}
    acts = acts_of(it); first = {}
    for a in acts: first.setdefault(a.get("type"), a)
    def act(m_id=None, kind=None):
        if m_id and m_id in mon.acts: return mon.acts[m_id][1]
        if kind: return first.get(kind)
        return acts[0] if acts else None
    def kv(body):
        d = {}; pos = []
        for p in body.split():
            if "=" in p: k, v = p.split("=", 1); d[k] = v
            else: pos.append(p)
        return d, pos
    def attack_text(body):
        d, pos = kv(body); a = act(d.get("activity"), "attack")
        if not a: return ""
        hit = mon.attack(it, a)
        if "extended" not in pos: return sgn(hit)
        kind = ((a.get("attack") or {}).get("type") or {}).get("value") or "melee"
        rg = it["system"].get("range") or (a.get("range") or {})
        arange = a.get("range") or {}
        if arange.get("override"): rg = arange
        if kind == "melee": where = f"reach {rg.get('reach') or 5} ft."
        else: where = f"range {rg.get('value') or ''}{'/' + str(rg.get('long')) if rg.get('long') else ''} ft."
        both = "Melee or Ranged" if (it["system"].get("properties") or []) and "thr" in (it["system"].get("properties") or []) and kind == "melee" else ("Melee" if kind == "melee" else "Ranged")
        if both == "Melee or Ranged": where = f"reach {rg.get('reach') or 5} ft. or range {rg.get('value') or 20}/{rg.get('long') or 60} ft."
        return f"{both} Attack Roll: {sgn(hit)}, {where}"
    def damage_text(body):
        d, pos = kv(body)
        explicit = [p for p in pos if re.match(r"^\d*d\d+$|^\d+$", p) or re.match(r"^\d*d\d+[+-]\d+$", p)]
        if explicit:
            typ = d.get("type") or next((p for p in pos if p.isalpha() and p not in ("average", "extended")), "")
            m = re.match(r"^(\d*d\d+)(?:([+-])(\d+))?$", explicit[0])
            if m: return fmt_part(m.group(1), (int(m.group(3)) * (1 if m.group(2) == "+" else -1)) if m.group(3) else 0, typ.title())
            return explicit[0] + (" " + typ.title() if typ else "")
        a = act(d.get("activity"))
        if d.get("activity") is None:
            a = first.get("attack") or first.get("save") or first.get("damage") or (acts[0] if acts else None)
        if not a: return ""
        parts = mon.damage_parts(it, a)
        if not parts: return ""
        txt = " plus ".join(fmt_part(*p) + (" damage" if i < len(parts) - 1 else "") for i, p in enumerate(parts))
        return ("Hit: " + txt + " damage") if "extended" in pos else txt
    def lookup(body, label):
        expr = body.strip()[6:].strip(); d, pos = kv(expr); path = pos[0] if pos else ""
        a = act(d.get("activity")) if d.get("activity") else (acts[0] if acts else None)
        cap = "capitalize" in pos; low = "lowercase" in pos
        def out(v):
            v = "" if v is None else str(v)
            return v[:1].upper() + v[1:] if cap else v.lower() if low else v
        if path == "@name": return out(mon.d["name"])
        if path in ("@save.dc.value", "@save.dc.formula"): return out(mon.save_dc(a) if a else "")
        if path in ("@check.dc.value", "@check.dc.formula"):
            dc = (a.get("check") or {}).get("dc") or {} if a else {}; calc = dc.get("calculation") or ""
            return out(8 + mon.pb + mon.m[calc] if calc in AB else 8 + mon.pb + mon.m.get(mon.spell_ab, 0) if calc == "spellcasting" else mon.ev(dc.get("formula")))
        if path in ("@attributes.spell.dc",): return out(8 + mon.pb + mon.m.get(mon.spell_ab, 0))
        m = re.match(r"@abilities\.(\w+)\.dc", path)
        if m: return out(8 + mon.pb + mon.m.get(m.group(1), 0))
        m = re.match(r"@abilities\.(\w+)\.mod", path)
        if m: return out(mon.m.get(m.group(1), 0))
        m = re.match(r"@skills\.(\w+)\.passive", path)
        if m: sk = mon.d["system"]["skills"].get(m.group(1)) or {}; ab = sk.get("ability", "str"); v = int(sk.get("value") or 0); return out(10 + mon.m[ab] + v * mon.pb)
        if path == "@prof": return out(mon.pb)
        if a is None: return label or ""
        def get(obj, dotted):
            for k in dotted.split("."):
                if not isinstance(obj, dict): return None
                obj = obj.get(k)
            return obj
        if path.startswith("@item."):
            v = get(it["system"], path[6:])
            if v in (None, "") and path == "@item.range.reach": v = 5
            return out(v if v not in (None, "") else (label or ""))
        if path.startswith("@target.affects.labels"):
            af = (a.get("target") or {}).get("affects") or {}; n = af.get("count"); t = af.get("type") or "creature"
            return out(f"{n} {t}{'s' if str(n) not in ('1', '') else ''}" if n else f"each {t}")
        if path.startswith("@target.template.") or path.startswith("@target.affects.") or path.startswith("@range.") or path.startswith("@duration.") or path.startswith("@activation."):
            v = get(a, path[1:])
            if v is None and path.startswith("@range."): v = get(it["system"], path[1:])
            unit = {"ft": "ft", "mi": "miles", "minute": "minute", "hour": "hour", "day": "day", "round": "round"}
            if path.endswith(".units"): v = unit.get(v, v)
            return out(v if v not in (None, "") else (label or ""))
        if path == "@damage.onSave": v = (a.get("damage") or {}).get("onSave"); return out({"half": "half the", "none": "no"}.get(v, v or "half the"))
        if path == "@roll.formula": return out((a.get("roll") or {}).get("formula") or label or "")
        return label or ""
    def item_name(body, label):
        ref = body.strip()[5:].strip()
        if label: return label
        if ref.startswith("."): i = mon.byid.get(ref[1:]); return i["name"] if i else ""
        return ref
    def inline(m):
        body, label = m.group(1), m.group(2)
        b = body.strip()
        if b.startswith("lookup"):
            r = lookup(b, label)
            return r if r != "" else (label or "")
        if label and not b.startswith("/attack") and not b.startswith("/damage"): return label
        if b.startswith("/attack"): return attack_text(b[7:])
        if b.startswith("/damage"): return damage_text(b[7:])
        if b.startswith("/item"): return item_name(b, label)
        if b.startswith("/check") or b.startswith("/save") or b.startswith("/skill") or b.startswith("/tool"):
            b2 = b.replace("dc=@attributes.spell.dc", f"dc={8 + mon.pb + mon.m.get(mon.spell_ab, 0)}")
            b2 = re.sub(r"dc=@abilities\.(\w+)\.dc", lambda mm: f"dc={8 + mon.pb + mon.m.get(mm.group(1), 0)}", b2)
            return C.check(b2)
        if b.startswith("/r") or b.startswith("/gmr"): return b.split(" ", 1)[1] if " " in b else ""
        return label or ""
    h = re.sub(r"\[\[(.*?)\]\](?:\{([^}]*)\})?", inline, h)
    C.EXTRA.clear()
    t = C.clean(h)
    return re.sub(r"ft\.\.", "ft.", t).replace(" ft .", " ft.")

def group_of(it):
    acts = acts_of(it)
    t = next(((a.get("activation") or {}).get("type") for a in acts if (a.get("activation") or {}).get("type")), "") if acts else ""
    if it["type"] == "weapon": return "actions"
    if t in ("bonus",): return "bonus"
    if t in ("reaction",): return "reactions"
    if t in ("legendary",): return "legendary"
    if t in ("action",): return "actions"
    return "traits"
def uses_label(it):
    u = it["system"].get("uses") or {}; rec = u.get("recovery") or []
    for r in rec:
        if r.get("period") == "recharge": f = str(r.get("formula") or "6"); return f"(Recharge {f}–6)" if f != "6" else "(Recharge 6)"
    if u.get("max") and rec and rec[0].get("period") in ("day", "lr", "sr"):
        per = {"day": "Day", "lr": "Day", "sr": "Short Rest"}.get(rec[0]["period"], "Day")
        return f"({u['max']}/{per})"
    return ""
def rolls_of(mon, it):
    out = {}
    for a in acts_of(it):
        if a.get("type") == "attack" and "hit" not in out:
            out["hit"] = mon.attack(it, a); ps = mon.damage_parts(it, a)
            if ps: out["dmg"] = [[p[0] + (f"{'+' if p[1] >= 0 else '-'}{abs(p[1])}" if p[0] and p[1] else "") if p[0] else str(p[1]), p[2]] for p in ps]
        if a.get("type") == "save" and "dc" not in out:
            dc = mon.save_dc(a); ab = ((a.get("save") or {}).get("ability") or [""]); ab = ab[0] if isinstance(ab, list) and ab else ab
            if dc: out["dc"] = dc; out["sv"] = ab
            ps = mon.damage_parts(it, a)
            if ps and "dmg" not in out: out["dmg"] = [[p[0] + (f"{'+' if p[1] >= 0 else '-'}{abs(p[1])}" if p[0] and p[1] else "") if p[0] else str(p[1]), p[2]] for p in ps]
    return out

mons = []
for f in sorted(glob.glob("**/*.yml", recursive=True)):
    if f.endswith("_folder.yml") or f.split("/")[0] in SKIP: continue
    d = yaml.safe_load(open(f))
    if not isinstance(d, dict) or d.get("type") != "npc": continue
    mon = Mon(d); sy = d["system"]; at = sy["attributes"]; det = sy["details"]; tr = sy["traits"]
    # Armor Class: flat, or worked out from the armor it carries
    ac = (at.get("ac") or {}).get("flat")
    if ac is None:
        base = 10 + mon.m["dex"]; shield = 0
        for it in mon.items:
            arm = (it["system"].get("armor") or {}); t = (it["system"].get("type") or {}).get("value")
            if it["type"] == "equipment" and t in ("light", "medium", "heavy") and arm.get("value"):
                cap = arm.get("dex"); base = arm["value"] + (mon.m["dex"] if cap is None else min(mon.m["dex"], cap) if cap else 0) + int(it["system"].get("magicalBonus") or 0)
            if it["type"] == "equipment" and t == "shield": shield = (arm.get("value") or 2) + int(it["system"].get("magicalBonus") or 0)
        ac = base + shield
    hp = at.get("hp") or {}
    mv = at.get("movement") or {}; speed = []
    for k in ("walk", "burrow", "climb", "fly", "swim"):
        v = mv.get(k)
        if v: speed.append(f"{v} ft." if k == "walk" else f"{k.title()} {v} ft.{' (hover)' if k == 'fly' and mv.get('hover') else ''}")
    ib = mon.ev(((at.get("init") or {}).get("bonus") or "")) or 0
    init = mon.m["dex"] + ib
    saves = {a: mon.m[a] + mon.pb for a in AB if sy["abilities"][a].get("proficient")}
    skills = {}
    for k, v in (sy.get("skills") or {}).items():
        if int(v.get("value") or 0): sk = C.SKILL.get(k); skills[sk[1] if sk else k] = mon.m[v.get("ability") or (sk[0] if sk else "str")] + int(v["value"]) * mon.pb
    sn = (at.get("senses") or {}).get("ranges") or {}
    senses = [f"{k.title()} {v} ft." for k, v in sn.items() if v]
    if (at.get("senses") or {}).get("special"): senses.append(at["senses"]["special"])
    perc = sy["skills"].get("prc") or {}; pp = 10 + mon.m["wis"] + int(perc.get("value") or 0) * mon.pb
    lang = [x.title() for x in (tr.get("languages") or {}).get("value") or []]
    if (tr.get("languages") or {}).get("custom"): lang.append(tr["languages"]["custom"])
    def tl(k): x = tr.get(k) or {}; v = [y.title() for y in x.get("value") or []]; return v + ([x["custom"]] if x.get("custom") else [])
    typ = det.get("type") or {}
    m = {"n": d["name"], "size": SIZE.get(tr.get("size"), tr.get("size")), "sq": SIZE_SQ.get(tr.get("size"), 1),
         "type": (typ.get("value") or "").title() + (f" ({typ['subtype']})" if typ.get("subtype") else ""), "al": det.get("alignment") or "",
         "ac": ac, "hp": hp.get("max") or 0, "hpf": hp.get("formula") or "", "speed": ", ".join(speed), "init": init,
         "ab": mon.ab, "sv": saves, "sk": skills, "senses": ", ".join(senses + [f"Passive Perception {pp}"]), "lang": ", ".join(lang) or "None",
         "cr": mon.cr, "xp": XP.get(mon.cr, 0), "pb": mon.pb, "vul": tl("dv"), "res": tl("dr"), "imm": tl("di") + tl("ci")}
    leg = (sy.get("resources") or {}).get("legact") or {}
    if leg.get("max"): m["legN"] = leg["max"]
    for g in ("traits", "actions", "bonus", "reactions", "legendary"): m[g] = []
    for it in mon.items:
        if it["type"] not in ("weapon", "feat"): continue
        g = group_of(it); name = it["name"] + (" " + uses_label(it) if uses_label(it) else "")
        e = {"n": name, "t": text_for(mon, it)}; e.update(rolls_of(mon, it))
        m[g].append(e)
    for g in ("traits", "actions", "bonus", "reactions", "legendary"):
        if not m[g]: del m[g]
    mons.append(m)
mons.sort(key=lambda x: x["n"])
json.dump(mons, open(OUT, "w"), ensure_ascii=False, indent=0)
print(len(mons), "monsters")
