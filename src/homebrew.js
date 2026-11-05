/* ============================== D&D 2024: HOMEBREW PACKS ==============================
   A homebrew pack (.dndhomebrew, JSON) adds subclasses, species, backgrounds, feats, spells,
   magic items and equipment, and monsters. The GM writes packs on the Homebrew tab (hbgm.js) and
   turns them on for a campaign; players get those packs automatically when they join, or install
   pack files themselves from the Homebrew window. Packs are data only: everything in one is
   checked and clamped when it's read, and nothing in a pack is ever run.

   The rules registry (hbActivate) adds the active packs to the built-in lists (DND_SPELLS,
   DND_ITEMS, DND_FEAT_LIST, the species and backgrounds, subclasses, monsters) and takes them out
   again, so the built-in data is never changed. Each character also keeps a copy of the homebrew
   it uses (c.homebrew), so it still works where that pack isn't installed. */

const HB_FORMAT = "monolith-pack", HB_GAME = "dnd", HB_RULESET = "dnd5.5e", HB_EXT = "dndhomebrew";
const HB_SECS = [["subclasses", "Subclasses"], ["species", "Species"], ["backgrounds", "Backgrounds"], ["feats", "Feats"], ["spells", "Spells"], ["items", "Magic items & equipment"], ["monsters", "Monsters"]];
const HB_ONE = { subclasses: "subclass", species: "species", backgrounds: "background", feats: "feat", spells: "spell", items: "item", monsters: "monster" };
const HB_FEAT_CATS = [["origin", "Origin feat"], ["general", "General feat"], ["fighting-style", "Fighting style"], ["epic-boon", "Epic boon"]];
const HB_ITEM_CATS = ["Weapon", "Armor", "Adventuring gear", "Tools", "Potion", "Scroll", "Ring", "Rod", "Staff", "Wand", "Wondrous item"];
const HB_RESTS = ["short", "long", "dawn", "none"];
const HB_SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const HB_SQ = { Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 };
const HB_CR_XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
  16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
const HB_LIMIT = { list: 400, text: 4000, name: 80 };

/* ---------- checking ---------- */
const hbStr = (v, max = HB_LIMIT.name) => String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const hbText = (v, max = HB_LIMIT.text) => String(v == null ? "" : v).replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[<>]/g, "").trim().slice(0, max);
const hbNum = (v, lo, hi, def = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.round(clamp(n, lo, hi)) : def; };
const hbOne = (v, list, def) => list.includes(v) ? v : def;
const hbId = v => String(v || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "hb" + uid();
const hbArr = (v, max) => (Array.isArray(v) ? v : []).slice(0, max);
const hbAbs = v => [...new Set(hbArr(v, 6).filter(a => DND_AB_NAME[a]))];
const hbDice = v => { const s = hbStr(v, 30).toLowerCase().replace(/\s+/g, ""); return s && dndParse(s) ? s : ""; };
const hbDmgTypes = v => [...new Set(hbArr(v, 13).map(t => DND_DAMAGE.find(x => x.toLowerCase() === String(t).toLowerCase())).filter(Boolean))];
/* "3", "pb" or "mod:cha" */
const hbUses = v => { const s = String(v == null ? "" : v).trim().toLowerCase().replace(/^proficiency( bonus)?$/, "pb").replace(/ mod(ifier)?$/, ""); if (s === "pb") return "pb";
  const full = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" }; const ab = full[s] || s.replace(/^mod:/, "");
  if (/^(str|dex|con|int|wis|cha)$/.test(ab)) return "mod:" + ab; const n = hbNum(s, 0, 99, 0); return n ? String(n) : ""; };
const hbUsesMax = (u, c, k) => u === "pb" ? k.pb : /^mod:/.test(u) ? Math.max(1, k.mod[u.slice(4)]) : Number(u) || 0;
const hbUsesText = u => u === "pb" ? "proficiency bonus" : /^mod:/.test(u) ? `${DND_AB_NAME[u.slice(4)]} modifier` : u;

function hbSanitize(raw, lenient) {
  if (!raw || typeof raw !== "object" || raw.format !== HB_FORMAT || raw.kind !== "homebrew") throw new Error("That isn't a homebrew pack.");
  if ((raw.game && raw.game !== HB_GAME) || (raw.ruleset && raw.ruleset !== HB_RULESET)) throw new Error("That homebrew pack is for another game.");
  const problems = []; const seen = new Set();
  const uniq = (sec, name, extra = "") => { const key = sec + "|" + extra + "|" + name.toLowerCase(); if (!name) { if (!lenient) problems.push(`A ${HB_ONE[sec]} without a name was skipped.`); return false; }
    if (seen.has(key)) { problems.push(`A second ${HB_ONE[sec]} called "${name}" was skipped.`); return false; } seen.add(key); return true; };
  const p = { format: HB_FORMAT, kind: "homebrew", game: HB_GAME, ruleset: HB_RULESET, id: hbId(raw.id), name: hbStr(raw.name) || "Homebrew pack", author: hbStr(raw.author), description: hbText(raw.description, 600),
    rev: hbNum(raw.rev, 1, 1e6, 1), updated: hbNum(raw.updated, 0, 9e15, Date.now()), subclasses: [], species: [], backgrounds: [], feats: [], spells: [], items: [], monsters: [] };
  hbArr(raw.subclasses, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); const cls = hbOne(x && x.cls, Object.keys(DND_CLASSES), "Fighter"); if (!uniq("subclasses", n, cls)) return;
    p.subclasses.push({ cls, n, t: hbText(x.t, 1200), caster: x.caster === "third" ? "third" : "",
      features: hbArr(x.features, 40).map(f => ({ lvl: hbNum(f && f.lvl, 1, 20, 3), n: hbStr(f && f.n), t: hbText(f && f.t), uses: hbUses(f && f.uses), rest: hbOne(f && f.rest, HB_RESTS, "long") })).filter(f => f.n).sort((a, b) => a.lvl - b.lvl) }); });
  hbArr(raw.species, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("species", n)) return;
    p.species.push({ n, blurb: hbText(x.blurb, 200), size: hbOne(x.size, HB_SIZES, "Medium"), speed: hbNum(x.speed, 0, 120, 30), dv: hbNum(x.dv, 0, 300, 0), res: hbDmgTypes(x.res), hpPerLvl: hbNum(x.hpPerLvl, 0, 5, 0),
      traits: hbArr(x.traits, 20).map(t => ({ n: hbStr(t && t.n), t: hbText(t && t.t, 1200) })).filter(t => t.n),
      uses: hbArr(x.uses, 8).map(u => ({ n: hbStr(u && u.n), max: hbUses(u && u.max), rest: hbOne(u && u.rest, HB_RESTS, "long") })).filter(u => u.n && u.max) }); });
  hbArr(raw.backgrounds, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("backgrounds", n)) return;
    const abs = hbAbs(x.abs); const skills = [...new Set(hbArr(x.skills, 4).filter(s => DND_SKILL_NAME[s]))];
    p.backgrounds.push({ n, blurb: hbText(x.blurb, 200), abs: abs.length === 3 ? abs : ["str", "dex", "con"], skills: skills.length ? skills.slice(0, 2) : ["athletics", "perception"], tool: hbStr(x.tool, 80), feat: hbStr(x.feat), gp: hbNum(x.gp, 0, 1000, 50) }); });
  hbArr(raw.feats, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("feats", n)) return;
    p.feats.push({ n, cat: hbOne(x.cat, HB_FEAT_CATS.map(c => c[0]), "general"), lvl: hbNum(x.lvl, 0, 20, x.cat === "general" ? 4 : x.cat === "epic-boon" ? 19 : 0), rep: !!x.rep, ab: !!x.ab, t: hbText(x.t) }); });
  hbArr(raw.spells, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("spells", n)) return; const d0 = x.dmg || {}; const dd = hbDice(d0.d);
    p.spells.push({ n, l: hbNum(x.l, 0, 9, 1), sch: hbOne(x.sch, DND_SCHOOLS, "Evocation"), cls: [...new Set(hbArr(x.cls, 12).filter(cl => DND_CLASSES[cl]))], ct: hbStr(x.ct, 60) || "Action", rg: hbStr(x.rg, 60), cmp: hbStr(x.cmp, 120), dur: hbStr(x.dur, 60),
      conc: !!x.conc, rit: !!x.rit, t: hbText(x.t), dmg: dd ? { d: dd, type: hbStr(d0.type, 20), kind: hbOne(d0.kind, ["attack", "save", "heal", "auto"], "auto"), save: DND_AB_NAME[d0.save] ? d0.save : "" } : null }); });
  hbArr(raw.items, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("items", n)) return; const w = x.wpn, a = x.arm, f = x.fx || {};
    const fx = {}; ["ac", "save", "check", "spAtk", "spDc"].forEach(k => { const v = hbNum(f[k], -10, 10, 0); if (v) fx[k] = v; });
    const set = {}; Object.entries(f.set || {}).forEach(([ab, v]) => { if (DND_AB_NAME[ab] && hbNum(v, 0, 30, 0)) set[ab] = hbNum(v, 1, 30, 10); }); if (Object.keys(set).length) fx.set = set;
    if (hbNum(f.dv, 0, 300, 0)) fx.dv = hbNum(f.dv, 0, 300, 0); if (hbNum(f.swim, 0, 120, 0)) fx.swim = hbNum(f.swim, 0, 120, 0); if (hbNum(f.fly, 0, 120, 0)) fx.fly = hbNum(f.fly, 0, 120, 0);
    if (hbDmgTypes(f.res).length) fx.res = hbDmgTypes(f.res); if (hbDmgTypes(f.imm).length) fx.imm = hbDmgTypes(f.imm);
    p.items.push({ n, cat: hbOne(x.cat, HB_ITEM_CATS, "Wondrous item"), rar: hbOne(x.rar, ["", ...DND_RARITIES], "Uncommon"), att: !!x.att, wt: Math.max(0, Math.min(999, Number(x.wt) || 0)), cost: hbStr(x.cost, 30), t: hbText(x.t),
      wpn: w && typeof w === "object" ? { d: hbDice(w.d) || "1d6", type: hbOne(w.type, DND_DAMAGE, "Slashing"), k: w.k === "martial" ? "martial" : "simple", r: !!w.r, p: hbArr(w.p, 10).map(s => hbStr(s, 30)).filter(Boolean), mast: hbOne(w.mast, ["", ...Object.keys(DND_MASTERY)], ""), b: hbNum(w.b, 0, 3, 0) } : null,
      arm: a && typeof a === "object" ? { t: hbOne(a.t, ["light", "medium", "heavy", "shield"], "light"), ac: hbNum(a.ac, 0, 30, a.t === "shield" ? 2 : 11), dex: a.t === "heavy" || a.t === "shield" ? (a.t === "heavy" ? 0 : null) : a.t === "medium" ? 2 : null, b: hbNum(a.b, 0, 3, 0) } : null,
      fx, ch: hbNum(x.ch, 0, 99, 0), chRest: hbOne(x.chRest, ["dawn", "long", "short", ""], "dawn") }); });
  hbArr(raw.monsters, HB_LIMIT.list).forEach(x => { const n = hbStr(x && x.n); if (!uniq("monsters", n)) return; const ab = {};
    DND_ABILITIES.forEach(([k]) => { ab[k] = hbNum((x.ab || {})[k], 1, 30, 10); }); const crs = Object.keys(HB_CR_XP).map(Number); const cr = crs.includes(Number(x.cr)) ? Number(x.cr) : 1;
    const pb = cr < 5 ? 2 : Math.min(9, 2 + Math.floor((Math.ceil(cr) - 1) / 4)); const size = hbOne(x.size, HB_SIZES, "Medium");
    const acts = l => hbArr(l, 20).map(a => ({ n: hbStr(a && a.n), t: hbText(a && a.t, 1200), hit: a && a.hit !== "" && a.hit != null && Number.isFinite(Number(a.hit)) ? hbNum(a.hit, -5, 30, 0) : null,
      dmg: String((a && a.dmg) || "").split(/[;,]| plus /).map(s => s.trim()).filter(Boolean).slice(0, 4).map(s => { const m = s.match(/^([0-9d+\-\s]+)\s*([A-Za-z]*)/); const dd = m && hbDice(m[1]); return dd ? [dd, (DND_DAMAGE.find(t => t.toLowerCase() === (m[2] || "").toLowerCase()) || "")] : null; }).filter(Boolean),
      dc: hbNum(a && a.dc, 0, 30, 0) || null, sv: DND_AB_NAME[a && a.sv] ? a.sv : "" })).filter(a => a.n).map(a => { if (!a.dmg.length) a.dmg = null; return a; });
    p.monsters.push({ n, size, sq: HB_SQ[size], type: hbStr(x.type, 40) || "Monstrosity", al: hbStr(x.al, 40), ac: hbNum(x.ac, 1, 40, 12), hp: hbNum(x.hp, 1, 2000, 10), hpf: hbStr(x.hpf, 30), speed: hbStr(x.speed, 80) || "30 ft.",
      init: hbNum(x.init, -5, 20, dndMod(ab.dex)), ab, sv: {}, sk: {}, senses: hbStr(x.senses, 120), lang: hbStr(x.lang, 120), cr, xp: HB_CR_XP[cr], pb, vul: hbDmgTypes(x.vul), res: hbDmgTypes(x.res), imm: hbDmgTypes(x.imm), legN: 0,
      traits: hbArr(x.traits, 20).map(t => ({ n: hbStr(t && t.n), t: hbText(t && t.t, 1200) })).filter(t => t.n), actions: acts(x.actions), bonus: acts(x.bonus), reactions: acts(x.reactions), legendary: [] }); });
  return { pack: p, problems };
}
function hbCounts(p) { const parts = HB_SECS.map(([k, l]) => (p[k] || []).length ? `${p[k].length} ${(p[k].length === 1 ? HB_ONE[k] : l.toLowerCase()).replace("magic items & equipment", "items")}` : "").filter(Boolean); return parts.join(" · ") || "Empty"; }

/* ---------- the rules registry ---------- */
const HB_SRC = { subclasses: {}, species: {}, backgrounds: {}, feats: {}, spells: {}, items: {}, monsters: {} };   // name -> pack name
const DND_HB_SUBS = {};     // class -> homebrew subclasses, shaped like the SRD's: {n, t, table, levels, hb}
const HB_BASE = { spells: DND_SPELLS.length, items: DND_ITEMS.length, feats: DND_FEAT_LIST.length, beasts: DND_BEASTS.length, monsters: null,
  species: Object.keys(DND_SPECIES_INFO), bgs: Object.keys(DND_BG_INFO), bgList: DND_BACKGROUNDS.slice(), fx: Object.keys(DND_ITEM_FX), resSp: Object.keys(DND_RES_SPECIES), kitsBg: Object.keys(DND_KITS.bg) };
let HB_KEY = null;
function hbActivate(packs) {
  packs = (packs || []).filter(Boolean); const key = packs.map(p => `${p.id}:${p.rev}:${p.__sum || ""}`).join(",");
  if (key === HB_KEY) return false; HB_KEY = key;
  if (typeof DND_MONSTERS !== "undefined" && HB_BASE.monsters == null) HB_BASE.monsters = DND_MONSTERS.length;
  // back to the built-in rules
  DND_SPELLS.length = HB_BASE.spells; DND_ITEMS.length = HB_BASE.items; DND_FEAT_LIST.length = HB_BASE.feats; DND_BEASTS.length = HB_BASE.beasts;
  if (HB_BASE.monsters != null) DND_MONSTERS.length = HB_BASE.monsters;
  Object.keys(DND_SPECIES_INFO).forEach(n => { if (!HB_BASE.species.includes(n)) { delete DND_SPECIES_INFO[n]; delete DND_SPECIES[n]; delete DND_SPECIES_DV[n]; } });
  Object.keys(DND_BG_INFO).forEach(n => { if (!HB_BASE.bgs.includes(n)) delete DND_BG_INFO[n]; }); DND_BACKGROUNDS.length = 0; DND_BACKGROUNDS.push(...HB_BASE.bgList);
  Object.keys(DND_ITEM_FX).forEach(n => { if (!HB_BASE.fx.includes(n)) delete DND_ITEM_FX[n]; });
  Object.keys(DND_RES_SPECIES).forEach(n => { if (!HB_BASE.resSp.includes(n)) delete DND_RES_SPECIES[n]; });
  Object.keys(DND_KITS.bg).forEach(n => { if (!HB_BASE.kitsBg.includes(n)) delete DND_KITS.bg[n]; });
  Object.keys(DND_HB_SUBS).forEach(k => delete DND_HB_SUBS[k]); Object.values(HB_SRC).forEach(o => Object.keys(o).forEach(k => delete o[k]));
  const taken = { spells: new Set(DND_SPELLS.map(s => s.n.toLowerCase())), items: new Set(DND_ITEMS.map(s => s.n.toLowerCase())), feats: new Set(DND_FEAT_LIST.map(s => s.n.toLowerCase())),
    monsters: new Set(dndMonList().map(m => m.n.toLowerCase())), species: new Set(Object.keys(DND_SPECIES_INFO).map(s => s.toLowerCase())), backgrounds: new Set(Object.keys(DND_BG_INFO).map(s => s.toLowerCase())), subclasses: new Set() };
  Object.entries(DND_LEVELS).forEach(([cls, L]) => { if (L.sub) taken.subclasses.add(cls + "|" + L.sub.n.toLowerCase()); });
  const add = (sec, name, fn, keyName) => { const k = (keyName || name).toLowerCase(); if (taken[sec].has(k)) return; taken[sec].add(k); fn(); };
  for (const p of packs) {
    (p.subclasses || []).forEach(x => add("subclasses", x.n, () => { const levels = {}; x.features.forEach(f => { (levels[f.lvl] = levels[f.lvl] || []).push({ n: f.n, t: f.t, uses: f.uses, rest: f.rest }); });
      (DND_HB_SUBS[x.cls] = DND_HB_SUBS[x.cls] || []).push({ n: x.n, t: x.t || `${x.n}: a homebrew ${x.cls} subclass.`, table: [], levels, caster: x.caster, hb: p.name }); HB_SRC.subclasses[x.cls + "|" + x.n] = p.name; }, x.cls + "|" + x.n));
    (p.species || []).forEach(x => add("species", x.n, () => {
      DND_SPECIES_INFO[x.n] = { blurb: x.blurb || "A homebrew species.", speed: x.speed, size: x.size === "Medium" ? undefined : x.size, hpPerLvl: x.hpPerLvl || undefined, res: x.res, hb: p.name,
        traits: [...(x.dv ? [["Darkvision", `${x.dv} ft.`]] : []), ...x.traits.map(t => [t.n, t.t])] };
      DND_SPECIES[x.n] = x.speed; if (x.dv) DND_SPECIES_DV[x.n] = x.dv;
      if (x.uses.length) DND_RES_SPECIES[x.n] = x.uses.map((u, i) => ({ k: `hbsp${i}-${x.n.toLowerCase().replace(/[^a-z0-9]+/g, "")}`.slice(0, 20), n: u.n, max: (c, k) => hbUsesMax(u.max, c, k), rest: u.rest === "none" ? "long" : u.rest }));
      HB_SRC.species[x.n] = p.name; }));
    (p.backgrounds || []).forEach(x => add("backgrounds", x.n, () => { DND_BG_INFO[x.n] = { blurb: x.blurb || "A homebrew background.", abs: x.abs, skills: x.skills, tool: x.tool, feat: x.feat, hb: p.name };
      DND_BACKGROUNDS.push(x.n); DND_KITS.bg[x.n] = [{ items: [], gp: x.gp }]; HB_SRC.backgrounds[x.n] = p.name; }));
    (p.feats || []).forEach(x => add("feats", x.n, () => { DND_FEAT_LIST.push({ ...x, hb: p.name }); HB_SRC.feats[x.n] = p.name; }));
    (p.spells || []).forEach(x => add("spells", x.n, () => { DND_SPELLS.push({ ...x, hb: p.name }); HB_SRC.spells[x.n] = p.name; }));
    (p.items || []).forEach(x => add("items", x.n, () => { const it = { n: x.n, cat: x.cat, cost: x.cost, wt: x.wt, t: x.t, hb: p.name, ch: x.ch, chRest: x.chRest };
      if (x.rar) { it.rar = x.rar; it.mag = 1; } if (x.att) it.att = 1; if (x.wpn) it.wpn = { ...x.wpn }; if (x.arm) it.arm = { ...x.arm };
      DND_ITEMS.push(it); if (Object.keys(x.fx || {}).length) DND_ITEM_FX[x.n] = clone(x.fx); HB_SRC.items[x.n] = p.name; }));
    (p.monsters || []).forEach(x => add("monsters", x.n, () => { dndMonList().push({ ...clone(x), hb: p.name }); HB_SRC.monsters[x.n] = p.name; }));
  }
  Object.keys(DND_SPELL_BY).forEach(k => delete DND_SPELL_BY[k]); DND_SPELLS.forEach(s => { DND_SPELL_BY[dndKey(s.n)] = s; });
  Object.keys(DND_ITEM_BY).forEach(k => delete DND_ITEM_BY[k]); DND_ITEMS.forEach(i => { DND_ITEM_BY[dndKey(i.n)] = i; });
  dndMonIndex();
  return true;
}
/* a homebrew subclass by class and name */
const hbSub = (cls, name) => (DND_HB_SUBS[cls] || []).find(s => s.n.toLowerCase() === String(name || "").trim().toLowerCase()) || null;
const hbChip = (sec, name) => HB_SRC[sec] && HB_SRC[sec][name] ? `<span class="chip amber dnd-hbchip" title="Homebrew: ${esc(HB_SRC[sec][name])}">Homebrew</span>` : "";

/* ---------- what a character carries ---------- */
/* the homebrew this character uses, copied out of the active packs (or what it already carried) */
function hbStamp(c, packs) {
  if (!c || c.id === "sample") return; const all = [...(packs || []), c.homebrew].filter(Boolean);
  const find = (sec, test) => { for (const p of all) { const x = (p[sec] || []).find(test); if (x) return clone(x); } return null; };
  const lc = s => String(s || "").trim().toLowerCase();
  const out = { format: HB_FORMAT, kind: "homebrew", id: "char-" + c.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30), name: `Carried by ${c.name || "this character"}`, rev: 1, subclasses: [], species: [], backgrounds: [], feats: [], spells: [], items: [], monsters: [] };
  const push = (sec, x) => { if (x && !out[sec].some(y => y.n === x.n && y.cls === x.cls)) out[sec].push(x); };
  dndClassList(c).forEach(e => { if (e.subclass) push("subclasses", find("subclasses", x => x.cls === e.cls && lc(x.n) === lc(e.subclass))); });
  push("species", find("species", x => lc(x.n) === lc(c.species))); push("backgrounds", find("backgrounds", x => lc(x.n) === lc(c.background)));
  (c.feats || []).forEach(f => push("feats", find("feats", x => lc(x.n) === lc(f.n))));
  (c.spells || []).forEach(s => push("spells", find("spells", x => lc(x.n) === lc(s.name))));
  (c.inv || []).forEach(it => { push("items", find("items", x => lc(x.n) === lc(it.name) || lc(x.n) === lc(it.base) || lc(x.n) === lc(String(it.name).replace(/[ ,]*\+\d$/, "")))); });
  (c.attacks || []).forEach(a => push("items", find("items", x => lc(x.n) === lc(a.name))));
  (c.comps || []).forEach(x => push("monsters", find("monsters", y => lc(y.n) === lc(x.m))));
  c.homebrew = HB_SECS.some(([k]) => out[k].length) ? out : null;
}
/* a short fingerprint so a character's carried homebrew counts as a change when it changes */
function hbSum(p) { const s = JSON.stringify(p); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function hbCarried(c) { if (!c || !c.homebrew) return null; try { const p = hbSanitize(c.homebrew, true).pack; p.__sum = hbSum(c.homebrew); return p; } catch (e) { return null; } }

/* ---------- files ---------- */
function hbFileText(p) { const o = clone(p); delete o.__sum; return JSON.stringify({ ...o, game: HB_GAME, ruleset: HB_RULESET, app: "Monolith · Dungeons and Dragons", exported: new Date().toISOString() }, null, 1); }
const hbFileName = p => (String(p.name || "homebrew").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "homebrew") + "." + HB_EXT;
async function hbReadFile(f) { let raw; try { raw = JSON.parse(await f.text()); } catch (e) { throw new Error("That file isn't a homebrew pack."); } return hbSanitize(raw); }
const hbIsFile = async f => /\.dndhomebrew$/i.test(f.name) || (/\.json$/i.test(f.name) && /"kind"\s*:\s*"homebrew"/.test(await f.slice(0, 2000).text().catch(() => "")) && /"game"\s*:\s*"dnd"/.test(await f.slice(0, 2000).text().catch(() => "")));

/* ---------- players: installed packs ---------- */
const HB_PLAYER_KEY = "player-homebrew";
let HB_PLIB = (() => { const o = Monolith.store.get(HB_PLAYER_KEY, {}) || {}; const out = {}; Object.entries(o).forEach(([id, p]) => { try { out[id] = hbSanitize(p).pack; if (p.__from) out[id].__from = String(p.__from).slice(0, 60); } catch (e) {} }); return out; })();
function hbPlayerSave() { if (!Monolith.store.set(HB_PLAYER_KEY, HB_PLIB)) showNotice("Browser storage is full, so the homebrew couldn't be saved."); }
const hbInstalled = () => Object.values(HB_PLIB).sort((a, b) => a.name.localeCompare(b.name));
function hbInstall(p, from) { const old = HB_PLIB[p.id]; if (old && old.rev >= p.rev) return old.rev === p.rev ? "same" : "older"; HB_PLIB[p.id] = { ...clone(p), __from: from || (old && old.__from) || "file" }; hbPlayerSave(); HB_KEY = null; return old ? "updated" : "new"; }
/* the packs a character uses: its own choice (all installed, until it picks), and its campaign's */
function hbPacksFor(c) {
  if (!c) return hbInstalled(); const camp = (c.campaign && c.campaign.packs) || [];
  const ids = c.packs == null ? Object.keys(HB_PLIB) : [...new Set([...c.packs, ...camp])]; return [...new Set([...ids, ...camp])].map(id => HB_PLIB[id]).filter(Boolean);
}
function hbPlayerChar() { return typeof ui !== "undefined" && ui.view === "table" && typeof myChar === "function" && myChar() ? myChar() : typeof curChar === "function" ? curChar() : null; }
BEFORE_RENDER.push(() => { try {
  if (ROLE === "gm") { if (typeof hbGmActivate === "function") hbGmActivate(); return; }
  const c = hbPlayerChar(); hbActivate([...hbPacksFor(c), hbCarried(c)]);
} catch (e) { console.error(e); } });
function hbBeforeSave(c) { try { hbStamp(c, ROLE === "gm" ? (typeof hbCampaignPacks === "function" ? hbCampaignPacks() : []) : hbPacksFor(c)); } catch (e) { console.error(e); } }

function hbContentsHTML(p) {
  const sec = (title, list, f) => list && list.length ? `<div><span class="label">${title}</span><div class="dnd-hbc">${list.map(f).join("")}</div></div>` : "";
  return `<div style="display:grid;gap:8px;margin-top:8px">
    ${sec("Subclasses", p.subclasses, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${esc(x.cls)} · ${x.features.length} feature${x.features.length === 1 ? "" : "s"}</span></div>`)}
    ${sec("Species", p.species, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${esc(x.size)} · ${x.speed} ft</span></div>`)}
    ${sec("Backgrounds", p.backgrounds, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${x.abs.map(a => a.toUpperCase()).join(", ")}${x.feat ? " · " + esc(x.feat) : ""}</span></div>`)}
    ${sec("Feats", p.feats, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${esc((HB_FEAT_CATS.find(c => c[0] === x.cat) || [, ""])[1])}</span></div>`)}
    ${sec("Spells", p.spells, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${x.l ? dndOrdinal(x.l) + " level" : "Cantrip"} ${esc(x.sch)}</span></div>`)}
    ${sec("Items", p.items, x => `<div><b>${esc(x.n)}</b> <span class="faint">· ${esc([x.cat, x.rar].filter(Boolean).join(", "))}</span></div>`)}
    ${sec("Monsters", p.monsters, x => `<div><b>${esc(x.n)}</b> <span class="faint">· CR ${dndCr(x.cr)} ${esc(x.type)}</span></div>`)}</div>`;
}
Object.assign(ui, { hbView: null });
function hbPlayerBody() {
  const packs = hbInstalled(); const c = typeof curChar === "function" ? curChar() : null; const ed = c && dndCanEdit(c) && c.id !== "sample" && ui.view !== "roster"; const camp = c && c.campaign;
  const mine = ed ? `<section style="display:grid;gap:8px"><h3>${esc(dndName(c))} uses</h3>
      ${packs.length ? packs.map(p => { const fromC = camp && (camp.packs || []).includes(p.id); const on = fromC || c.packs == null || c.packs.includes(p.id);
        return `<label class="row" style="gap:8px"><input type="checkbox" data-act-change="hb-charpack" value="${esc(p.id)}" ${on ? "checked" : ""} ${fromC ? "disabled" : ""}> <b>${esc(p.name)}</b>${fromC ? ` <span class="faint dnd-small">from ${esc(camp.name)}</span>` : ""}</label>`; }).join("") : `<p class="faint" style="margin:0">No homebrew installed yet.</p>`}
      ${c.homebrew ? `<p class="faint dnd-small" style="margin:0">This character carries a copy of the homebrew it uses (${esc(hbCounts(c.homebrew))}), so it works anywhere.</p>` : ""}</section>` : "";
  const list = packs.length ? `<div class="dnd-hblist">${packs.map(p => { const open = ui.hbView === p.id;
      return `<div class="dnd-hbrow"><div class="row" style="justify-content:space-between;align-items:flex-start;flex-wrap:nowrap;gap:10px"><div style="min-width:0"><b>${esc(p.name)}</b> <span class="faint dnd-small">v${p.rev}</span>
          <div class="faint dnd-small">${esc(hbCounts(p))}${p.author ? " · by " + esc(p.author) : ""}${p.__from && p.__from !== "file" ? " · from " + esc(p.__from) : ""}</div>${p.description ? `<div class="dnd-small">${esc(p.description)}</div>` : ""}</div>
        <span class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ghost" data-act="hb-view" data-id="${esc(p.id)}">${open ? "Hide" : "What's in it"}</button><button class="btn sm ghost danger" data-act="hb-remove" data-id="${esc(p.id)}">${ui.confirm === "hbrm-" + p.id ? "Confirm remove" : "Remove"}</button></span></div>
        ${open ? hbContentsHTML(p) : ""}</div>`; }).join("")}</div>`
    : `<p class="faint" style="margin:0">Homebrew packs add subclasses, species, backgrounds, feats, spells, items and monsters made by your GM or your group. Get a <b>.${HB_EXT}</b> file from your GM, or join their game: the homebrew it uses installs by itself.</p>`;
  return `<div style="display:grid;gap:18px">${mine}
    <section style="display:grid;gap:8px"><div class="row" style="justify-content:space-between"><h3>Installed homebrew</h3><label class="btn sm primary">Install a homebrew pack…<input type="file" accept=".${HB_EXT},.json,application/json" multiple data-act-change="hb-install" hidden></label></div>${list}
      <p class="faint dnd-small" style="margin:0">Removing a pack keeps every character that uses it working: each one keeps a copy of the homebrew it uses.</p></section></div>`;
}
MODALS.dndhb = () => ({ title: "Homebrew", body: hbPlayerBody(), wide: true });
async function hbInstallFiles(files) { const msgs = [];
  for (const f of files) { try { const r = await hbReadFile(f); const s = hbInstall(r.pack, "file");
    msgs.push(`${s === "same" ? "Already installed" : s === "older" ? "You already have a newer copy of" : s === "updated" ? "Updated" : "Installed"} "${r.pack.name}".${r.problems.length ? ` ${r.problems.length} entries were skipped.` : ""}`); }
    catch (e) { msgs.push(`${f.name}: ${e.message || e}`); } }
  if (msgs.length) showNotice(msgs.join(" ")); render(); if (ui.modal) renderModal(); }
Object.assign(A, {
  "hb-open": () => { ui.modal = "dndhb"; renderModal(); },
  "hb-view": el => { ui.hbView = ui.hbView === el.dataset.id ? null : el.dataset.id; renderModal(); },
  "hb-remove": el => { const id = el.dataset.id; if (ui.confirm !== "hbrm-" + id) { ui.confirm = "hbrm-" + id; renderModal(); return; } ui.confirm = null; const p = HB_PLIB[id]; delete HB_PLIB[id]; hbPlayerSave(); HB_KEY = null;
    showNotice(`Removed "${p ? p.name : "pack"}".`); render(); renderModal(); },
});
Object.assign(CHANGE, {
  "hb-install": el => { const fs = [...(el.files || [])]; el.value = ""; if (ROLE === "gm" && typeof hbGmInstallFiles === "function") hbGmInstallFiles(fs); else hbInstallFiles(fs); },
  "hb-charpack": el => { const c = curChar(); if (!c || !dndCanEdit(c)) return; const s = new Set(c.packs == null ? Object.keys(HB_PLIB) : c.packs); if (el.checked) s.add(el.value); else s.delete(el.value);
    c.packs = [...s]; HB_KEY = null; saveChar(c, true); render(); renderModal(); },
});
/* drop .dndhomebrew files anywhere */
FILE_HANDLERS.push(async list => { const pk = [], rest = []; for (const f of list) ((await hbIsFile(f)) ? pk : rest).push(f);
  if (pk.length) { if (ROLE === "gm" && typeof hbGmInstallFiles === "function") hbGmInstallFiles(pk); else hbInstallFiles(pk); } return rest; });

/* ---------- campaign rules from the GM's table ---------- */
Object.assign(ui, { hbPendingCamp: null });
function hbCampInfo(m) { const ids = hbArr(m.packIds, 40).map(x => hbId(x)).filter(id => HB_PLIB[id]); return { id: hbId(m.campaign && m.campaign.id), name: hbStr(m.campaign && m.campaign.name, 60) || "Campaign", packs: ids }; }
function hbPlayerMessage(type, m) {
  if (type === "hbpack") { try { const r = hbSanitize(m.pack); hbInstall(r.pack, hbStr(m.from, 60) || "your GM"); requestRender(); } catch (e) {} return; }
  if (type === "hbrules") { const info = hbCampInfo(m); if (m.peek) { ui.hbPendingCamp = info; return; }
    const c = typeof myChar === "function" ? myChar() : null; if (!c) return; const was = JSON.stringify(c.campaign || null); c.campaign = info;
    if (JSON.stringify(info) !== was) { S.chars.set(c.id, c); persist(); HB_KEY = null; requestRender(); } }
}
