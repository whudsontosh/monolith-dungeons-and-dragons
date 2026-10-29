/* ============================== D&D 2024: RULES AND NUMBERS ==============================
   The data and arithmetic behind the sheet: classes, skills, proficiency, spell slots, and
   every number the sheet works out for itself. No screens here.

   This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of
   the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the
   Creative Commons Attribution 4.0 International License,
   https://creativecommons.org/licenses/by/4.0/legalcode. */

const DND_ABILITIES = [
  ["str", "Strength"], ["dex", "Dexterity"], ["con", "Constitution"],
  ["int", "Intelligence"], ["wis", "Wisdom"], ["cha", "Charisma"],
];
const DND_AB_NAME = Object.fromEntries(DND_ABILITIES);

const DND_SKILLS = [
  ["acrobatics", "Acrobatics", "dex"], ["animal", "Animal Handling", "wis"], ["arcana", "Arcana", "int"],
  ["athletics", "Athletics", "str"], ["deception", "Deception", "cha"], ["history", "History", "int"],
  ["insight", "Insight", "wis"], ["intimidation", "Intimidation", "cha"], ["investigation", "Investigation", "int"],
  ["medicine", "Medicine", "wis"], ["nature", "Nature", "int"], ["perception", "Perception", "wis"],
  ["performance", "Performance", "cha"], ["persuasion", "Persuasion", "cha"], ["religion", "Religion", "int"],
  ["sleight", "Sleight of Hand", "dex"], ["stealth", "Stealth", "dex"], ["survival", "Survival", "wis"],
];

/* hit die, saving throws, how the class casts (full / half / pact / none) and with what */
const DND_CLASSES = {
  Barbarian: { hd: 12, saves: ["str", "con"], caster: "none", color: "#8a2d1c" },
  Bard:      { hd: 8,  saves: ["dex", "cha"], caster: "full", spell: "cha", color: "#7a3a6e" },
  Cleric:    { hd: 8,  saves: ["wis", "cha"], caster: "full", spell: "wis", color: "#8c7a3a" },
  Druid:     { hd: 8,  saves: ["int", "wis"], caster: "full", spell: "wis", color: "#4f6b2f" },
  Fighter:   { hd: 10, saves: ["str", "con"], caster: "none", spell: "int", color: "#5b4636" },
  Monk:      { hd: 8,  saves: ["str", "dex"], caster: "none", color: "#2f6b6b" },
  Paladin:   { hd: 10, saves: ["wis", "cha"], caster: "half", spell: "cha", color: "#b08a2e" },
  Ranger:    { hd: 10, saves: ["str", "dex"], caster: "half", spell: "wis", color: "#3e5a2a" },
  Rogue:     { hd: 8,  saves: ["dex", "int"], caster: "none", spell: "int", color: "#3a3f4a" },
  Sorcerer:  { hd: 6,  saves: ["con", "cha"], caster: "full", spell: "cha", color: "#a33a2a" },
  Warlock:   { hd: 8,  saves: ["wis", "cha"], caster: "pact", spell: "cha", color: "#4a2f6b" },
  Wizard:    { hd: 6,  saves: ["int", "wis"], caster: "full", spell: "int", color: "#2f4a7a" },
};
const DND_SPECIES = { Dragonborn: 30, Dwarf: 30, Elf: 30, Gnome: 30, Goliath: 35, Halfling: 30, Human: 30, Orc: 30, Tiefling: 30 };
const DND_BACKGROUNDS = ["Acolyte", "Criminal", "Sage", "Soldier"];
const DND_ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil", "Unaligned"];
const DND_CONDITIONS = ["Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible",
  "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"];
const DND_XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const DND_CASTERS = { auto: "From class", none: "None", full: "Full caster", half: "Half caster", third: "Third caster (Eldritch Knight, Arcane Trickster)", pact: "Pact magic (Warlock)" };

/* spell slots by caster level, 1st to 9th */
const DND_FULL_SLOTS = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
/* warlock pact magic by level: [slots, slot level] */
const DND_PACT = [[0, 0], [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];
const DND_SPELL_LEVELS = ["Cantrips", "1st level", "2nd level", "3rd level", "4th level", "5th level", "6th level", "7th level", "8th level", "9th level"];

/* ---------- small helpers ---------- */
const dndMod = score => Math.floor(((Number(score) || 0) - 10) / 2);
const dndProf = level => 2 + Math.floor((clamp(Number(level) || 1, 1, 20) - 1) / 4);
const dndCls = c => DND_CLASSES[c.cls] || null;
function dndLevelForXp(xp) { let l = 1; DND_XP.forEach((t, i) => { if ((Number(xp) || 0) >= t) l = i + 1; }); return l; }

/* ---------- a blank character ---------- */
function dndBlank() {
  const now = Date.now();
  return {
    id: uid(), name: "", player: "", cls: "", subclass: "", level: 1, species: "", background: "", alignment: "", xp: 0,
    ab: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saveProf: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    skills: {},                 // skill id -> 1 proficient, 2 expertise
    jack: false,                // half proficiency on checks you aren't proficient in (Bard)
    ac: 10, speed: 0, initBonus: 0, alert: false, hpPerLvl: 0,
    hpMax: 0, hp: null, hpTemp: 0, hdSpent: 0,
    death: { s: 0, f: 0 }, insp: false, exhaustion: 0, conditions: [], conc: "",
    attacks: [], caster: "auto", spellAb: "", slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pactUsed: 0, spells: [],
    inv: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    profs: "", features: "", appearance: "", notes: "",
    color: "", done: false, build: null, createdAt: now, updatedAt: now,
  };
}

/* every character passes through here when it's loaded, so missing or odd values get fixed */
function dndNormalize(x) {
  const b = dndBlank(); const c = { ...b, ...clone(x || {}) };
  const num = (v, lo, hi, def) => { const n = Number(v); return Number.isFinite(n) ? clamp(Math.round(n), lo, hi) : def; };
  const str = (v, n) => String(v ?? "").slice(0, n);
  c.id = str(c.id, 40) || uid();
  ["name", "player", "cls", "subclass", "species", "background", "alignment", "conc", "spellAb", "color"].forEach(k => { c[k] = str(c[k], 80); });
  ["profs", "features", "appearance", "notes"].forEach(k => { c[k] = str(c[k], 20000); });
  c.level = num(c.level, 1, 20, 1); c.xp = num(c.xp, 0, 1e7, 0);
  c.ab = { ...b.ab, ...(c.ab || {}) }; DND_ABILITIES.forEach(([k]) => { c.ab[k] = num(c.ab[k], 1, 30, 10); });
  c.saveProf = { ...b.saveProf, ...(c.saveProf || {}) }; DND_ABILITIES.forEach(([k]) => { c.saveProf[k] = !!c.saveProf[k]; });
  const sk = {}; DND_SKILLS.forEach(([k]) => { const v = num((c.skills || {})[k], 0, 2, 0); if (v) sk[k] = v; }); c.skills = sk;
  c.jack = !!c.jack; c.insp = !!c.insp; c.done = !!c.done; c.alert = !!c.alert; c.hpPerLvl = num(c.hpPerLvl, 0, 5, 0);
  // a character still in the creator keeps its choices here (see builder.js)
  c.build = x && x.build && typeof x.build === "object" ? clone(x.build) : null;
  c.ac = num(c.ac, 0, 50, 10); c.speed = num(c.speed, 0, 300, 0); c.initBonus = num(c.initBonus, -20, 20, 0);
  c.hpMax = num(c.hpMax, 0, 9999, 0); c.hp = c.hp == null || c.hp === "" ? null : num(c.hp, 0, 9999, 0);
  c.hpTemp = num(c.hpTemp, 0, 9999, 0); c.hdSpent = num(c.hdSpent, 0, 20, 0);
  c.death = { s: num((c.death || {}).s, 0, 3, 0), f: num((c.death || {}).f, 0, 3, 0) };
  c.exhaustion = num(c.exhaustion, 0, 6, 0);
  c.conditions = (Array.isArray(c.conditions) ? c.conditions : []).filter(k => DND_CONDITIONS.includes(k));
  c.caster = DND_CASTERS[c.caster] ? c.caster : "auto";
  if (c.spellAb && !DND_AB_NAME[c.spellAb]) c.spellAb = "";
  c.slotsUsed = Array.from({ length: 10 }, (_, i) => num((c.slotsUsed || [])[i], 0, 9, 0)); c.pactUsed = num(c.pactUsed, 0, 9, 0);
  const list = (v, max, f) => (Array.isArray(v) ? v : []).slice(0, max).map(f);
  c.attacks = list(c.attacks, 40, a => ({ id: str(a.id, 40) || uid(), name: str(a.name, 80), ab: ["str", "dex", "fin", "spell", "none"].includes(a.ab) ? a.ab : "str",
    prof: a.prof !== false, dmg: str(a.dmg, 40), type: str(a.type, 40), bonus: num(a.bonus, -20, 20, 0), dmgBonus: num(a.dmgBonus, -20, 40, 0), notes: str(a.notes, 300) }));
  c.spells = list(c.spells, 300, s => ({ id: str(s.id, 40) || uid(), lvl: num(s.lvl, 0, 9, 0), name: str(s.name, 80), prep: !!s.prep, notes: str(s.notes, 300) }));
  c.inv = list(c.inv, 300, it => ({ id: str(it.id, 40) || uid(), name: str(it.name, 80), qty: num(it.qty, 0, 99999, 1), wt: Math.max(0, Number(it.wt) || 0), notes: str(it.notes, 300) }));
  c.coins = { ...b.coins, ...(c.coins || {}) }; Object.keys(b.coins).forEach(k => { c.coins[k] = num(c.coins[k], 0, 1e9, 0); });
  // keep only what the sheet knows about
  Object.keys(c).forEach(k => { if (!(k in b) && !["game", "ruleset", "gameVersion"].includes(k)) delete c[k]; });
  return c;
}

/* ---------- everything the sheet works out ---------- */
function dndCalc(c) {
  const cl = dndCls(c); const pb = dndProf(c.level); const ex = c.exhaustion || 0;
  const mod = {}; DND_ABILITIES.forEach(([k]) => { mod[k] = dndMod(c.ab[k]); });
  const save = {}; DND_ABILITIES.forEach(([k]) => { save[k] = mod[k] + (c.saveProf[k] ? pb : 0); });
  const skill = {}; DND_SKILLS.forEach(([k, , a]) => {
    const p = c.skills[k] || 0; skill[k] = mod[a] + (p === 2 ? pb * 2 : p === 1 ? pb : c.jack ? Math.floor(pb / 2) : 0); });
  const init = mod.dex + (c.jack ? Math.floor(pb / 2) : 0) + (c.alert ? pb : 0) + (c.initBonus || 0);
  const hd = cl ? cl.hd : 8;
  const hpSuggest = Math.max(1, hd + mod.con + (c.level - 1) * (hd / 2 + 1 + mod.con) + (c.hpPerLvl || 0) * c.level);
  const hpMax = c.hpMax || hpSuggest;
  const hp = c.hp == null ? hpMax : Math.min(c.hp, hpMax);
  const baseSpeed = c.speed || DND_SPECIES[c.species] || 30;
  const speed = Math.max(0, baseSpeed - ex * 5);
  // spellcasting
  const kind = c.caster === "auto" ? (cl ? cl.caster : "none") : c.caster;
  const spellAb = c.spellAb || (cl && cl.spell) || (kind === "third" ? "int" : "");
  let slots = [];
  if (kind === "full") slots = DND_FULL_SLOTS[c.level];
  if (kind === "half") slots = DND_FULL_SLOTS[Math.ceil(c.level / 2)];
  if (kind === "third") slots = c.level < 3 ? [] : DND_FULL_SLOTS[Math.ceil(c.level / 3)];
  const pact = kind === "pact" ? DND_PACT[c.level] : [0, 0];
  const casts = kind !== "none" || c.spells.length > 0;
  const spellMod = spellAb ? mod[spellAb] : 0;
  const carry = c.ab.str * 15;
  const weight = c.inv.reduce((a, it) => a + (it.wt || 0) * (it.qty || 0), 0) + Object.values(c.coins).reduce((a, n) => a + n, 0) / 50;
  return {
    cl, pb, mod, save, skill, init, hd, hpSuggest, hpMax, hp, speed, baseSpeed, ex,
    passive: { perception: 10 + skill.perception, insight: 10 + skill.insight, investigation: 10 + skill.investigation },
    kind, spellAb, slots: [0, ...slots], pact, casts,
    spellDc: 8 + pb + spellMod, spellAtk: pb + spellMod,
    carry, weight: Math.round(weight * 10) / 10,
    dying: hp <= 0 && c.death.f < 3, dead: c.death.f >= 3,
  };
}
function dndAttackNums(c, k, a) {
  const abMod = a.ab === "fin" ? Math.max(k.mod.str, k.mod.dex) : a.ab === "spell" ? (k.spellAb ? k.mod[k.spellAb] : 0) : a.ab === "none" ? 0 : k.mod[a.ab];
  const hit = abMod + (a.prof ? k.pb : 0) + (a.bonus || 0);
  // weapons add their ability to damage; spell attacks don't unless the spell says so (use the bonus)
  const dmgMod = (a.ab === "spell" || a.ab === "none" ? 0 : abMod) + (a.dmgBonus || 0);
  return { hit, dmgMod };
}

/* ---------- dice: "2d6+1d4+3" and the like ---------- */
function dndParse(expr) {
  const s = String(expr || "").replace(/\s+/g, "").toLowerCase(); if (!s) return null;
  const terms = []; const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gy; let m, pos = 0;
  while (pos < s.length) { re.lastIndex = pos; m = re.exec(s); if (!m || m.index !== pos) return null; pos = re.lastIndex;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3]) terms.push({ sign, n: clamp(Number(m[2] || 1), 1, 60), sides: clamp(Number(m[3]), 1, 1000) }); else terms.push({ sign, flat: Number(m[4]) }); }
  return terms.length ? terms : null;
}
function dndRollExpr(expr, extra, crit) {
  const t = dndParse(expr); if (!t && !extra) return null;
  let total = 0; const parts = [];
  (t || []).forEach(x => {
    if (x.flat != null) { total += x.sign * x.flat; parts.push((x.sign < 0 ? "−" : "+") + x.flat); return; }
    const n = crit ? x.n * 2 : x.n; const r = Array.from({ length: n }, () => d(x.sides)); const sum = r.reduce((a, b) => a + b, 0);
    total += x.sign * sum; parts.push(`${x.sign < 0 ? "−" : "+"}${n}d${x.sides} [${r.join(",")}]`); });
  if (extra) { total += extra; parts.push((extra < 0 ? "−" : "+") + Math.abs(extra)); }
  return { total: Math.max(0, total), text: parts.join(" ").replace(/^\+/, "") };
}
