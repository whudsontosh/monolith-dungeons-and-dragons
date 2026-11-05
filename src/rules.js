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

/* ---------- multiclassing ----------
   c.cls / c.subclass are the class you started with; c.multi holds any others ({cls, subclass, level}).
   c.level is the character's total level, so the first class has c.level minus the others' levels.
   c.lvlCls says which class took each character level (for hit points); levels it doesn't say
   are filled in from the class levels. */
function dndClassList(c) {
  const multi = (c.multi || []).filter(m => m && m.cls);
  const first = Math.max(1, (c.level || 1) - multi.reduce((a, m) => a + (m.level || 0), 0));
  return [{ cls: c.cls, subclass: c.subclass, level: first, i: 0 }, ...multi.map((m, j) => ({ cls: m.cls, subclass: m.subclass || "", level: m.level, i: j + 1 }))];
}
/* the character seen as one of its classes: class tables, features and resources read c.cls,
   c.subclass and c.level, so this lets them work for any class (shares the rest of c) */
function dndAs(c, e) { return Object.assign({}, c, { cls: e.cls, subclass: e.subclass, level: e.level, multi: [], __as: e.i }); }
const dndIsMulti = c => (c.multi || []).some(m => m && m.cls);
function dndClassLine(c) { const l = dndClassList(c).filter(e => e.cls); if (!l.length) return ""; return l.length === 1 ? l[0].cls : l.map(e => `${e.cls} ${e.level}`).join(" / "); }
/* which class each character level went to: [ , "Fighter", "Fighter", "Rogue", ...] */
function dndLevelSeq(c) {
  const ents = dndClassList(c); const left = ents.map(e => e.level); const seq = [, ents[0].cls]; left[0]--;
  const idx = n => ents.findIndex(e => e.cls === n);
  for (let l = 2; l <= c.level; l++) { const want = (c.lvlCls || {})[l]; let i = want ? idx(want) : -1;
    if (i < 0 || left[i] <= 0) i = left.findIndex(x => x > 0); if (i < 0) i = 0; left[i]--; seq[l] = ents[i].cls; }
  return seq;
}
/* how a class casts: full, half, third, pact or none */
function dndCasterKind(c, e) {
  if (e.i === 0 && c.caster !== "auto") return c.caster;
  const ci = DND_CLASSES[e.cls]; if (!ci) return "none";
  if (ci.caster === "none" && /eldritch knight|arcane trickster/i.test(e.subclass || "")) return "third";
  return ci.caster;
}
/* multiclassing needs 13 in each class's main ability (2024 rules) */
const DND_MC_REQ = { Barbarian: [["str"]], Bard: [["cha"]], Cleric: [["wis"]], Druid: [["wis"]], Fighter: [["str", "dex"]], Monk: [["dex"], ["wis"]],
  Paladin: [["str"], ["cha"]], Ranger: [["dex"], ["wis"]], Rogue: [["dex"]], Sorcerer: [["cha"]], Warlock: [["cha"]], Wizard: [["int"]] };
function dndMcOk(c, cls) { const ab = dndCalc(c).ab; return (DND_MC_REQ[cls] || []).every(any => any.some(a => ab[a] >= 13)); }
const dndMcReqText = cls => (DND_MC_REQ[cls] || []).map(any => any.map(a => DND_AB_NAME[a]).join(" or ") + " 13").join(" and ");
/* what you gain when you take a class as your second (or later) class */
const DND_MC_PROFS = { Barbarian: "Shields, Martial weapons", Bard: "Light armor, one skill, one musical instrument", Cleric: "Light and Medium armor, Shields",
  Druid: "Light armor, Shields", Fighter: "Light and Medium armor, Shields, Martial weapons", Monk: "None", Paladin: "Light and Medium armor, Shields, Martial weapons",
  Ranger: "Light and Medium armor, Shields, Martial weapons, one skill", Rogue: "Light armor, one skill, Thieves' Tools", Sorcerer: "None", Warlock: "Light armor", Wizard: "None" };

/* ---------- what equipped magic items do ----------
   ac / save / check: bonuses; acNoArmor: only with no armor or shield; acBase: unarmored AC base (+Dex);
   set: an ability becomes at least this; abPlus: +n up to 20; spAtk / spDc: spell attack and save DC;
   plus: uses the item's +1/+2/+3; dv: darkvision; swim/fly: speeds; imm / res: damage types */
const DND_ITEM_FX = {
  "Cloak of Protection": { ac: 1, save: 1 }, "Ring of Protection": { ac: 1, save: 1 }, "Ioun Stone of Protection": { ac: 1 },
  "Bracers of Defense": { acNoArmor: 2 }, "Stone of Good Luck (Luckstone)": { check: 1, save: 1 },
  "Gauntlets of Ogre Power": { set: { str: 19 } }, "Amulet of Health": { set: { con: 19 } }, "Headband of Intellect": { set: { int: 19 } },
  "Belt of Giant Strength (hill)": { set: { str: 21 } }, "Belt of Giant Strength (stone)": { set: { str: 23 } }, "Belt of Giant Strength (frost)": { set: { str: 23 } },
  "Belt of Giant Strength (fire)": { set: { str: 25 } }, "Belt of Giant Strength (cloud)": { set: { str: 27 } }, "Belt of Giant Strength (storm)": { set: { str: 29 } },
  "Ioun Stone of Strength": { abPlus: { str: 2 } }, "Ioun Stone of Agility": { abPlus: { dex: 2 } }, "Ioun Stone of Fortitude": { abPlus: { con: 2 } },
  "Ioun Stone of Intellect": { abPlus: { int: 2 } }, "Ioun Stone of Insight": { abPlus: { wis: 2 } }, "Ioun Stone of Leadership": { abPlus: { cha: 2 } },
  "Robe of the Archmagi": { acBase: 15, spAtk: 2, spDc: 2 }, "Rod of the Pact Keeper, +1, +2, or +3": { plusSpell: "both" }, "Wand of the War Mage, +1, +2, or +3": { plusSpell: "atk" },
  "Goggles of Night": { dv: 60 }, "Ring of Swimming": { swim: 40 }, "Periapt of Proof against Poison": { imm: ["Poison"] },
};
const DND_DAMAGE = ["Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"];
/* species senses (2024): darkvision in feet */
const DND_SPECIES_DV = { Dragonborn: 60, Dwarf: 120, Elf: 60, Gnome: 60, Orc: 120, Tiefling: 60 };
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
    feats: [],                  // feats taken: {n, lvl, src}
    choices: {},                // a feature's picks: {"Eldritch Invocations": ["Agonizing Blast"], ...}
    hpRolls: {},                // hit point rolls by level (no entry = the average)
    pendingLevel: 0,            // (no longer used; kept so older characters load)
    res: {},                    // class resources used: {rage: 1, cd: 0, ...} (see resources.js)
    multi: [],                  // other classes: {cls, subclass, level} (c.level is the total)
    lvlCls: {},                 // which class took each character level: {2: "Fighter", 3: "Rogue"}
    hdBy: {},                   // hit dice spent by class: {Fighter: 2}
    hpBonus: 0,                 // extra maximum hit points (from D&D Beyond, or your table's rules)
    acAuto: true,               // work out AC from equipped armor, shield, items and features
    acBonus: 0, saveBonus: 0,   // other bonuses to AC and every saving throw
    trackers: [],               // other limited uses: {id, n, max, used, rest, note}
    acts: [],                   // actions written in: {id, n, type: action|bonus|reaction|other, t}
    defs: { res: [], imm: [], vuln: [], cimm: [] },   // damage resistances, immunities, vulnerabilities; condition immunities
    senses: { dv: 0, bs: 0, ts: 0, tr: 0 },          // darkvision, blindsight, tremorsense, truesight (feet)
    speeds: { fly: 0, swim: 0, climb: 0, burrow: 0 },
    traits: { pers: "", ideals: "", bonds: "", flaws: "" }, backstory: "", allies: "",
    phys: { gender: "", age: "", height: "", weight: "", eyes: "", hair: "", skin: "", faith: "", size: "" },
    portrait: "", ddb: "",      // portrait image (link or small picture); the D&D Beyond character it came from
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
  c.feats = (Array.isArray(c.feats) ? c.feats : []).slice(0, 60).map(f => ({ n: str(f && f.n, 80), lvl: num(f && f.lvl, 0, 20, 0), src: str(f && f.src, 40) })).filter(f => f.n);
  const ch = {}; Object.entries(c.choices && typeof c.choices === "object" ? c.choices : {}).slice(0, 20).forEach(([k, v]) => { if (Array.isArray(v)) ch[str(k, 60)] = v.slice(0, 20).map(x => str(x, 80)).filter(Boolean); }); c.choices = ch;
  const hr = {}; Object.entries(c.hpRolls && typeof c.hpRolls === "object" ? c.hpRolls : {}).forEach(([k, v]) => { const L = Number(k), n = Number(v); if (L >= 2 && L <= 20 && n >= 1 && n <= 12) hr[L] = Math.round(n); }); c.hpRolls = hr;
  c.pendingLevel = num(c.pendingLevel, 0, 20, 0);
  c.multi = (Array.isArray(c.multi) ? c.multi : []).slice(0, 11).map(m => ({ cls: str(m && m.cls, 40), subclass: str(m && m.subclass, 80), level: num(m && m.level, 1, 19, 1) })).filter(m => m.cls && m.cls !== c.cls)
    .filter((m, i, a) => a.findIndex(x => x.cls === m.cls) === i);
  { const others = c.multi.reduce((a, m) => a + m.level, 0); if (others) c.level = clamp(Math.max(c.level, others + 1), 2, 20);
    while (c.multi.reduce((a, m) => a + m.level, 0) >= c.level) { const m = c.multi[c.multi.length - 1]; if (m.level > 1) m.level--; else c.multi.pop(); } }
  const lc = {}; Object.entries(c.lvlCls && typeof c.lvlCls === "object" ? c.lvlCls : {}).forEach(([k, v]) => { const L = Number(k); if (L >= 2 && L <= 20 && v) lc[L] = str(v, 40); }); c.lvlCls = lc;
  const hb = {}; Object.entries(c.hdBy && typeof c.hdBy === "object" ? c.hdBy : {}).slice(0, 12).forEach(([k, v]) => { const n = num(v, 0, 20, 0); if (n) hb[str(k, 40)] = n; }); c.hdBy = hb;
  c.hpBonus = num(c.hpBonus, -999, 999, 0); c.acBonus = num(c.acBonus, -20, 20, 0); c.saveBonus = num(c.saveBonus, -20, 20, 0);
  c.acAuto = x && x.acAuto !== undefined ? !!x.acAuto : false;   // older characters keep the AC they had
  c.trackers = (Array.isArray(c.trackers) ? c.trackers : []).slice(0, 30).map(t => ({ id: str(t && t.id, 40) || uid(), n: str(t && t.n, 80), max: num(t && t.max, 0, 999, 1), used: num(t && t.used, 0, 999, 0),
    rest: ["short", "long", "dawn", "none"].includes(t && t.rest) ? t.rest : "long", note: str(t && t.note, 200) }));
  c.acts = (Array.isArray(c.acts) ? c.acts : []).slice(0, 40).map(a => ({ id: str(a && a.id, 40) || uid(), n: str(a && a.n, 80), type: ["action", "bonus", "reaction", "other"].includes(a && a.type) ? a.type : "action", t: str(a && a.t, 2000) }));
  const sl = (v, ok) => [...new Set((Array.isArray(v) ? v : []).map(x => str(x, 40)).filter(x => !ok || ok.includes(x)))];
  const df = c.defs && typeof c.defs === "object" ? c.defs : {};
  c.defs = { res: sl(df.res, DND_DAMAGE), imm: sl(df.imm, DND_DAMAGE), vuln: sl(df.vuln, DND_DAMAGE), cimm: sl(df.cimm, [...DND_CONDITIONS, "Exhaustion"]) };
  c.senses = { dv: num((c.senses || {}).dv, 0, 999, 0), bs: num((c.senses || {}).bs, 0, 999, 0), ts: num((c.senses || {}).ts, 0, 999, 0), tr: num((c.senses || {}).tr, 0, 999, 0) };
  c.speeds = { fly: num((c.speeds || {}).fly, 0, 999, 0), swim: num((c.speeds || {}).swim, 0, 999, 0), climb: num((c.speeds || {}).climb, 0, 999, 0), burrow: num((c.speeds || {}).burrow, 0, 999, 0) };
  c.traits = Object.fromEntries(Object.keys(b.traits).map(k => [k, str((c.traits || {})[k], 4000)]));
  c.phys = Object.fromEntries(Object.keys(b.phys).map(k => [k, str((c.phys || {})[k], 80)]));
  c.backstory = str(c.backstory, 40000); c.allies = str(c.allies, 20000);
  c.portrait = /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(String(c.portrait || "")) ? str(c.portrait, 200000) : "";
  c.ddb = str(c.ddb, 20);
  const rs = {}; Object.entries(c.res && typeof c.res === "object" ? c.res : {}).slice(0, 30).forEach(([k, v]) => { const n = Number(v); if (n > 0) rs[str(k, 20)] = Math.min(999, Math.round(n)); }); c.res = rs;
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
  c.spells = list(c.spells, 300, s => ({ id: str(s.id, 40) || uid(), lvl: num(s.lvl, 0, 9, 0), name: str(s.name, 80), prep: !!s.prep, notes: str(s.notes, 300), cls: str(s.cls, 40) }));
  const fxOf = f => { const o = {}; ["ac", "save", "check", "spAtk", "spDc"].forEach(k => { const n = num((f || {})[k], -10, 10, 0); if (n) o[k] = n; }); return o; };
  c.inv = list(c.inv, 300, it => ({ id: str(it.id, 40) || uid(), name: str(it.name, 80), qty: num(it.qty, 0, 99999, 1), wt: Math.max(0, Number(it.wt) || 0), notes: str(it.notes, 300),
    eq: !!it.eq, att: !!it.att, plus: num(it.plus, 0, 3, 0), base: str(it.base, 80), fx: fxOf(it.fx), ch: num(it.ch, 0, 99, 0), chUsed: num(it.chUsed, 0, 99, 0), chRest: ["dawn", "long", "short", ""].includes(it.chRest) ? it.chRest : "dawn" }));
  c.coins = { ...b.coins, ...(c.coins || {}) }; Object.keys(b.coins).forEach(k => { c.coins[k] = num(c.coins[k], 0, 1e9, 0); });
  // keep only what the sheet knows about
  Object.keys(c).forEach(k => { if (!(k in b) && !["game", "ruleset", "gameVersion"].includes(k)) delete c[k]; });
  return c;
}

/* ---------- everything the sheet works out ---------- */
/* an inventory item's catalogue entry, base armor or weapon, +N and what it does while equipped */
function dndItemInfo(it) {
  const name = String(it.name || "").trim();
  let ref = typeof dndItemRef === "function" ? dndItemRef(name) : null; let plus = Number(it.plus) || 0;
  if (!ref && typeof dndItemRef === "function") { const m = name.match(/^(.*?)[ ,]*\+([1-3])$/) || name.match(/^\+([1-3]) (.*)$/);
    if (m) { const base = /^\+/.test(name) ? m[2] : m[1]; const n = Number(/^\+/.test(name) ? m[1] : m[2]); const r = dndItemRef(base); if (r) { ref = r; plus = plus || n; } } }
  if (!ref && it.base && typeof dndItemRef === "function") ref = dndItemRef(it.base);
  const fx = { ...(DND_ITEM_FX[ref && !it.base ? ref.n : name] || {}) };
  Object.entries(it.fx || {}).forEach(([k, v]) => { fx[k] = (fx[k] || 0) + v; });
  if (fx.plusSpell && plus) { fx.spAtk = (fx.spAtk || 0) + plus; if (fx.plusSpell === "both") fx.spDc = (fx.spDc || 0) + plus; }
  const needsAtt = !!(ref && ref.att);
  return { ref, plus, fx, needsAtt, active: !!it.eq && (!needsAtt || !!it.att) };
}
function dndCalc(c) {
  const cl = dndCls(c); const pb = dndProf(c.level); const ex = c.exhaustion || 0; const ents = dndClassList(c);
  // equipped items
  const items = (c.inv || []).map(it => ({ it, ...dndItemInfo(it) }));
  const on = items.filter(x => x.active); const sum = k => on.reduce((a, x) => a + (x.fx[k] || 0), 0);
  const ab = {}; DND_ABILITIES.forEach(([k]) => { let v = c.ab[k];
    on.forEach(x => { if (x.fx.abPlus && x.fx.abPlus[k]) v = Math.max(v, Math.min(20, v + x.fx.abPlus[k])); });
    on.forEach(x => { if (x.fx.set && x.fx.set[k]) v = Math.max(v, x.fx.set[k]); }); ab[k] = v; });
  const mod = {}; DND_ABILITIES.forEach(([k]) => { mod[k] = dndMod(ab[k]); });
  const saveB = sum("save") + (c.saveBonus || 0), checkB = sum("check");
  const save = {}; DND_ABILITIES.forEach(([k]) => { save[k] = mod[k] + (c.saveProf[k] ? pb : 0) + saveB; });
  const skill = {}; DND_SKILLS.forEach(([k, , a]) => {
    const p = c.skills[k] || 0; skill[k] = mod[a] + (p === 2 ? pb * 2 : p === 1 ? pb : c.jack ? Math.floor(pb / 2) : 0) + checkB; });
  const init = mod.dex + (c.jack ? Math.floor(pb / 2) : 0) + (c.alert ? pb : 0) + (c.initBonus || 0) + checkB;
  // hit points and hit dice, class by class
  const hdOf = n => (DND_CLASSES[n] || { hd: 8 }).hd; const hd = cl ? cl.hd : 8; const seq = dndLevelSeq(c);
  let hpSuggest = Math.max(1, hdOf(seq[1]) + mod.con);
  for (let l = 2; l <= c.level; l++) hpSuggest += Math.max(1, ((c.hpRolls || {})[l] || hdOf(seq[l]) / 2 + 1) + mod.con);
  hpSuggest += (c.hpPerLvl || 0) * c.level + (c.hpBonus || 0);
  const hpMax = c.hpMax || Math.max(1, hpSuggest);
  const hp = c.hp == null ? hpMax : Math.min(c.hp, hpMax);
  const hdPools = ents.filter(e => e.cls || e.i === 0).map(e => { const spent = dndIsMulti(c) ? Math.min(e.level, (c.hdBy || {})[e.cls] || 0) : Math.min(e.level, c.hdSpent || 0);
    return { cls: e.cls, hd: hdOf(e.cls), total: e.level, spent }; });
  const baseSpeed = c.speed || DND_SPECIES[c.species] || 30;
  const speed = Math.max(0, baseSpeed - ex * 5);
  const speeds = { ...(c.speeds || {}) }; on.forEach(x => { if (x.fx.swim) speeds.swim = Math.max(speeds.swim || 0, x.fx.swim); if (x.fx.fly) speeds.fly = Math.max(speeds.fly || 0, x.fx.fly); });
  // armor class
  const body = on.filter(x => x.ref && x.ref.arm && x.ref.arm.t !== "shield").sort((a, b2) => (b2.ref.arm.ac + b2.plus) - (a.ref.arm.ac + a.plus))[0];
  const shield = on.filter(x => x.ref && x.ref.arm && x.ref.arm.t === "shield").sort((a, b2) => (b2.ref.arm.ac + b2.plus) - (a.ref.arm.ac + a.plus))[0];
  const has = n => ents.some(e => e.cls === n);
  let acBase, acHow;
  if (body) { const a = body.ref.arm; acBase = a.ac + (a.dex === 0 ? 0 : a.dex == null ? mod.dex : Math.min(mod.dex, a.dex)) + (a.b || 0) + body.plus; acHow = body.it.name; }
  else { const opts = [[10 + mod.dex, "Unarmored"]];
    if (has("Barbarian")) opts.push([10 + mod.dex + mod.con, "Unarmored Defense"]);
    if (has("Monk") && !shield) opts.push([10 + mod.dex + mod.wis, "Unarmored Defense"]);
    if (ents.some(e => e.cls === "Sorcerer" && /draconic/i.test(e.subclass || "") && e.level >= 3)) opts.push([10 + mod.dex + mod.cha, "Draconic Resilience"]);
    on.forEach(x => { if (x.fx.acBase) opts.push([x.fx.acBase + mod.dex, x.it.name]); });
    [acBase, acHow] = opts.sort((a, b2) => b2[0] - a[0])[0]; }
  const acItems = sum("ac") + (!body && !shield ? sum("acNoArmor") : 0) + (body && (c.feats || []).some(f => f.n === "Defense") ? 1 : 0);
  const acCalc = acBase + (shield ? shield.ref.arm.ac + (shield.ref.arm.b || 0) + shield.plus : 0) + acItems + (c.acBonus || 0);
  const ac = c.acAuto ? acCalc : c.ac;
  const attuned = items.filter(x => x.it.att).length;
  // spellcasting: one class uses its own table; two or more casters add up their levels
  const casters = ents.map(e => ({ e, kind: dndCasterKind(c, e) })).filter(x => x.e.cls && x.kind !== "none");
  const kind = ents.length > 1 && casters.length > 1 ? "multi" : (casters[0] ? casters[0].kind : (c.caster !== "auto" ? c.caster : "none"));
  const slotCasters = casters.filter(x => ["full", "half", "third"].includes(x.kind));
  let slots = [];
  const one = x => x.kind === "full" ? DND_FULL_SLOTS[x.e.level] : x.kind === "half" ? DND_FULL_SLOTS[Math.ceil(x.e.level / 2)] : x.e.level < 3 ? [] : DND_FULL_SLOTS[Math.ceil(x.e.level / 3)];
  if (slotCasters.length === 1) slots = one(slotCasters[0]);
  else if (slotCasters.length > 1) slots = DND_FULL_SLOTS[Math.min(20, slotCasters.reduce((a, x) => a + (x.kind === "full" ? x.e.level : x.kind === "half" ? Math.ceil(x.e.level / 2) : Math.floor(x.e.level / 3)), 0))] || [];
  const pc = casters.find(x => x.kind === "pact"); const pact = pc ? DND_PACT[pc.e.level] : [0, 0];
  const abOf = e => (e.i === 0 && c.spellAb) || (DND_CLASSES[e.cls] || {}).spell || "int";
  const spellAb = c.spellAb || (casters[0] ? abOf(casters[0].e) : (cl && cl.spell) || "");
  const casts = kind !== "none" || c.spells.length > 0;
  const spAtkB = sum("spAtk"), spDcB = sum("spDc");
  const spellMod = spellAb ? mod[spellAb] : 0;
  const casting = casters.map(x => { const a = abOf(x.e); return { cls: x.e.cls, kind: x.kind, ab: a, dc: 8 + pb + mod[a] + spDcB, atk: pb + mod[a] + spAtkB }; });
  // defenses and senses
  const defs = { res: [...(c.defs || {}).res || []], imm: [...(c.defs || {}).imm || []], vuln: [...(c.defs || {}).vuln || []], cimm: [...(c.defs || {}).cimm || []] };
  on.forEach(x => { (x.fx.imm || []).forEach(t => { if (!defs.imm.includes(t)) defs.imm.push(t); }); (x.fx.res || []).forEach(t => { if (!defs.res.includes(t)) defs.res.push(t); }); });
  let dv = Math.max((c.senses || {}).dv || 0, DND_SPECIES_DV[c.species] || 0); on.forEach(x => { if (x.fx.dv) dv = dv ? dv + x.fx.dv : x.fx.dv; });
  const senses = { dv, bs: (c.senses || {}).bs || 0, ts: (c.senses || {}).ts || 0, tr: (c.senses || {}).tr || 0 };
  const carry = ab.str * 15;
  const weight = c.inv.reduce((a, it) => a + (it.wt || 0) * (it.qty || 0), 0) + Object.values(c.coins).reduce((a, n) => a + n, 0) / 50;
  return {
    cl, pb, ab, mod, save, skill, init, hd, hdPools, hpSuggest, hpMax, hp, speed, baseSpeed, speeds, ex,
    ac, acCalc, acBase, acHow, body: body ? body.it : null, shield: shield ? shield.it : null, attuned, items,
    passive: { perception: 10 + skill.perception, insight: 10 + skill.insight, investigation: 10 + skill.investigation },
    kind, spellAb, slots: [0, ...slots], pact, casts, casting,
    spellDc: 8 + pb + spellMod + spDcB, spellAtk: pb + spellMod + spAtkB,
    defs, senses, saveB, checkB,
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
