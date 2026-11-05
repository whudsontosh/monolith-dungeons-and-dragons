/* ============================== IMPORTING A CHARACTER FROM D&D BEYOND ==============================
   D&D Beyond serves a public character's sheet as JSON at character-service.dndbeyond.com (an
   unofficial address that D&D Beyond doesn't document, so it may change). The importer tries to
   fetch it; if the browser blocks that, the player opens the link themselves and pastes what it
   shows, or loads a saved .json file. ddbConvert turns that JSON into a character for this sheet.
   Nothing is ever sent to D&D Beyond. */

const DDB_URL = id => `https://character-service.dndbeyond.com/character/v5/character/${id}`;
const DDB_AB = ["", "str", "dex", "con", "int", "wis", "cha"];
const DDB_AB_FULL = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
const DDB_SKILL = { acrobatics: "acrobatics", "animal-handling": "animal", arcana: "arcana", athletics: "athletics", deception: "deception", history: "history", insight: "insight",
  intimidation: "intimidation", investigation: "investigation", medicine: "medicine", nature: "nature", perception: "perception", performance: "performance", persuasion: "persuasion",
  religion: "religion", "sleight-of-hand": "sleight", stealth: "stealth", survival: "survival" };
const DDB_ALIGN = ["", "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];
const DDB_COND = ["", "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"];
const DDB_RESET = { 1: "short", 2: "long", 3: "dawn" };
const DDB_SIZE = { 2: "Tiny", 3: "Small", 4: "Medium", 5: "Large", 6: "Huge", 7: "Gargantuan" };
const DDB_SENSE = { 1: "bs", 2: "dv", 3: "ts", 4: "tr" };
const DDB_MOVE = { 1: "walk", 2: "burrow", 3: "climb", 4: "fly", 5: "swim" };
const DDB_ACT = { 1: "action", 3: "bonus", 4: "reaction" };
/* "https://www.dndbeyond.com/characters/12345678" (or the number on its own) → "12345678" */
function ddbId(s) { const t = String(s || "").trim(); const m = t.match(/characters\/(\d{3,})/) || t.match(/\/character\/(\d{3,})/) || t.match(/^(\d{3,})$/); return m ? m[1] : ""; }
function ddbText(html) {
  const div = document.createElement("div"); div.innerHTML = String(html || "").replace(/<\/(p|li|h\d|tr|div)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  return (div.textContent || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const ddbTitle = s => String(s || "").replace(/-/g, " ").replace(/\b\w/g, x => x.toUpperCase());

/* the JSON D&D Beyond gives → { c: a character, notes: [what to check], summary } */
function ddbConvert(raw) {
  const d = raw && raw.data && Array.isArray(raw.data.classes) ? raw.data : raw;
  if (!d || typeof d !== "object" || !Array.isArray(d.classes) || !Array.isArray(d.stats)) throw new Error("That doesn't look like a D&D Beyond character. Copy everything the link shows, starting with {\"id\"");
  const notes = []; const c = dndBlank(); c.build = null; c.acAuto = true; c.ddb = String(d.id || "").slice(0, 20);
  const mods = Object.entries(d.modifiers || {}).flatMap(([src, l]) => (Array.isArray(l) ? l : []).map(m => ({ ...m, src })));
  const own = mods.filter(m => m.src !== "item");
  const val = m => Number(m.value ?? m.fixedValue ?? 0) || 0;
  const has = (type, sub) => own.some(m => m.type === type && m.subType === sub);
  // who they are
  c.name = String(d.name || "").slice(0, 80); c.player = String(d.username || "").slice(0, 80);
  const nm = x => String((x && x.definition && x.definition.name) || "");
  const classes = [...d.classes].sort((a, b) => (b.isStartingClass ? 1 : 0) - (a.isStartingClass ? 1 : 0)).filter(x => nm(x));
  if (!classes.length) throw new Error("This character has no class yet. Finish it on D&D Beyond first.");
  c.cls = nm(classes[0]); c.subclass = nm({ definition: classes[0].subclassDefinition });
  c.multi = classes.slice(1).map(x => ({ cls: nm(x), subclass: nm({ definition: x.subclassDefinition }), level: Number(x.level) || 1 }));
  c.level = clamp(classes.reduce((a, x) => a + (Number(x.level) || 0), 0), 1, 20);
  if (classes.length > 1) c.hdBy = Object.fromEntries(classes.map(x => [nm(x), Number(x.hitDiceUsed) || 0]).filter(([, n]) => n)); else c.hdSpent = Number(classes[0].hitDiceUsed) || 0;
  classes.filter(x => !DND_CLASSES[nm(x)]).forEach(x => notes.push(`${nm(x)} isn't one of the 2024 classes, so its features, hit dice and spell slots need filling in by hand.`));
  const race = d.race || {}; c.species = String(race.fullName || race.baseRaceName || "").slice(0, 80);
  const bg = d.background || {}; c.background = String((bg.definition && bg.definition.name) || (bg.customBackground && bg.customBackground.name) || "").slice(0, 80);
  c.alignment = DDB_ALIGN[d.alignmentId] || ""; c.xp = Number(d.currentXp) || 0; c.insp = !!d.inspiration;
  // the 2014 Player's Handbook and Basic Rules are sources 1 and 2; the 2024 books are 145 and up
  const legacy = !!race.isLegacy || classes.some(x => ((x.definition || {}).sources || []).some(s => s.sourceId === 1 || s.sourceId === 2));
  if (legacy) notes.push("This is a 2014-rules character. It comes across as it is, but this sheet follows the 2024 rules, so some features and numbers may read a little differently.");
  // ability scores: base + chosen bonuses + species, background, class and feat increases (items are worked out by the sheet)
  const pick = (list, id) => { const x = (list || []).find(s => s.id === id); return x && x.value != null ? Number(x.value) : null; };
  for (let id = 1; id <= 6; id++) { const a = DDB_AB[id]; const ov = pick(d.overrideStats, id);
    const v = (pick(d.stats, id) ?? 10) + (pick(d.bonusStats, id) || 0) + own.filter(m => m.type === "bonus" && m.subType === `${DDB_AB_FULL[a]}-score`).reduce((t, m) => t + val(m), 0);
    c.ab[a] = clamp(ov ?? v, 1, 30); }
  // saving throws: a second class gives none, so with several classes take the first class's two plus any from feats, species and the like
  const firstSaves = (DND_CLASSES[c.cls] || {}).saves;
  DND_ABILITIES.forEach(([a]) => { const sub = `${DDB_AB_FULL[a]}-saving-throws`;
    c.saveProf[a] = classes.length > 1 && firstSaves ? firstSaves.includes(a) || own.some(m => m.type === "proficiency" && m.subType === sub && m.src !== "class") || (Number(classes[0].level) >= 14 && c.cls === "Monk")
      : has("proficiency", sub); });
  Object.entries(DDB_SKILL).forEach(([slug, s]) => { if (has("expertise", slug)) c.skills[s] = 2; else if (has("proficiency", slug)) c.skills[s] = 1; });
  c.jack = own.some(m => m.type === "half-proficiency" && m.subType === "ability-checks");
  c.feats = (d.feats || []).map(f => nm(f)).filter(Boolean).map(n => ({ n, lvl: 0, src: "Feat" }));
  c.alert = c.feats.some(f => f.n === "Alert");
  c.initBonus = clamp(own.filter(m => m.type === "bonus" && m.subType === "initiative" && !(c.alert && m.src === "feat")).reduce((t, m) => t + val(m), 0), -20, 20);
  c.hpPerLvl = clamp(own.filter(m => m.type === "bonus" && m.subType === "hit-points-per-level").reduce((t, m) => t + val(m), 0), 0, 5);
  // options (fighting styles, invocations…) become feats or feature choices where this sheet knows them
  const optNames = Object.values(d.options || {}).flatMap(l => (l || []).map(o => nm(o))).filter(Boolean); const unplaced = [];
  optNames.forEach(o => { const fs = DND_FEAT_LIST.find(f => f.cat === "fighting-style" && f.n.toLowerCase() === o.toLowerCase());
    if (fs) { if (!c.feats.some(f => f.n === fs.n)) c.feats.push({ n: fs.n, lvl: 0, src: "Fighting Style" }); return; }
    const pool = dndClassList(c).map(e => DND_LEVELS[e.cls]).filter(Boolean).flatMap(L => Object.entries(L.pools || {})).find(([, opts]) => opts.some(x => x.n.toLowerCase() === o.toLowerCase()));
    if (pool) { const x = pool[1].find(y => y.n.toLowerCase() === o.toLowerCase()); c.choices[pool[0]] = [...new Set([...(c.choices[pool[0]] || []), x.n])]; return; }
    if (/^Increase |^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)$|Score|\((Push|Topple|Sap|Slow|Vex|Nick|Cleave|Graze)\)$/.test(o)) return;
    unplaced.push(o); });
  // proficiencies and training
  const profs = own.filter(m => m.type === "proficiency" && !Object.keys(DDB_SKILL).includes(m.subType) && !/saving-throws$|^choose-/.test(m.subType));
  const label = m => m.friendlySubtypeName || ddbTitle(m.subType);
  const armor = [...new Set(profs.filter(m => /-armor$|^shields$/.test(m.subType)).map(label))];
  const weaponSlugs = new Set((typeof DND_ITEMS !== "undefined" ? DND_ITEMS : []).filter(i => i.wpn).map(i => i.n.toLowerCase().replace(/[^a-z]+/g, "-")));
  const weapons = [...new Set(profs.filter(m => /-weapons$/.test(m.subType) || weaponSlugs.has(m.subType) || /^crossbow|^light-crossbow|^hand-crossbow/.test(m.subType)).map(label))];
  const tools = [...new Set(profs.filter(m => !/-armor$|^shields$|-weapons$/.test(m.subType) && !weaponSlugs.has(m.subType) && !/^crossbow/.test(m.subType)).map(label))];
  const langs = [...new Set(own.filter(m => m.type === "language").map(label))];
  const mastery = [...new Set(own.filter(m => m.type === "weapon-mastery").map(m => { const [p, ...w] = String(m.subType).split("-"); return `${ddbTitle(p)} (${ddbTitle(w.join("-"))})`; }))];
  c.profs = [armor.length && `Armor: ${armor.join(", ")}`, weapons.length && `Weapons: ${weapons.join(", ")}`, tools.length && `Tools: ${tools.join(", ")}`,
    langs.length && `Languages: ${langs.join(", ")}`, mastery.length && `Weapon Mastery: ${mastery.join(", ")}`].filter(Boolean).join("\n");
  // defenses, senses and speeds
  const dmg = t => DND_DAMAGE.find(x => x.toLowerCase() === String(t).toLowerCase());
  const cond = t => [...DND_CONDITIONS, "Exhaustion"].find(x => x.toLowerCase() === String(t).toLowerCase());
  own.forEach(m => { const t = dmg(m.subType);
    if (m.type === "resistance" && t) c.defs.res.push(t); if (m.type === "vulnerability" && t) c.defs.vuln.push(t);
    if (m.type === "immunity") { if (t) c.defs.imm.push(t); else if (cond(m.subType)) c.defs.cimm.push(cond(m.subType)); } });
  ["res", "imm", "vuln", "cimm"].forEach(k => { c.defs[k] = [...new Set(c.defs[k])]; });
  const senseKey = { darkvision: "dv", blindsight: "bs", tremorsense: "ts", truesight: "tr" };
  own.forEach(m => { const k = senseKey[m.subType]; if (k && (m.type === "set-base" || m.type === "sense" || m.type === "set")) c.senses[k] = Math.max(c.senses[k], val(m)); });
  (d.customSenses || []).forEach(s => { const k = DDB_SENSE[s.senseId]; if (k && s.distance) c.senses[k] = Math.max(c.senses[k], Number(s.distance) || 0); });
  const ws = ((race.weightSpeeds || {}).normal) || {}; let walk = Number(ws.walk) || 30;
  walk += own.filter(m => m.type === "bonus" && /^(speed|speed-walking|unarmored-movement)$/.test(m.subType)).reduce((t, m) => t + val(m), 0);
  ["fly", "swim", "climb", "burrow"].forEach(k => { c.speeds[k] = Number(ws[k]) || 0; });
  own.forEach(m => { const x = String(m.subType).match(/^innate-speed-(walking|flying|swimming|climbing|burrowing)$/); if (!x) return; const k = { walking: "walk", flying: "fly", swimming: "swim", climbing: "climb", burrowing: "burrow" }[x[1]];
    const v = val(m) || walk; if (k === "walk") walk = Math.max(walk, v); else c.speeds[k] = Math.max(c.speeds[k], v); });
  (d.customSpeeds || []).forEach(s => { const k = DDB_MOVE[s.movementId]; if (!k || !s.distance) return; if (k === "walk") walk = Number(s.distance) || walk; else c.speeds[k] = Number(s.distance) || 0; });
  c.speed = walk;
  // equipment
  const inv = Array.isArray(d.inventory) ? d.inventory : []; const ids = new Set(inv.map(it => it.id));
  const armorRef = df => { const t = { 1: "light", 2: "medium", 3: "heavy" }[df.armorTypeId]; if (df.armorTypeId === 4) return dndItemRef("Shield");
    return t ? DND_ITEMS.find(i => i.arm && i.arm.t === t && i.arm.ac === Number(df.armorClass) && !i.mag) || null : null; };
  const weaponProf = df => { if (df.categoryId === 1 && has("proficiency", "simple-weapons")) return true; if (df.categoryId === 2 && has("proficiency", "martial-weapons")) return true;
    const slug = String(df.type || df.name || "").toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, ""); return has("proficiency", slug) || has("proficiency", slug + "s"); };
  const weaponsHeld = inv.filter(it => it.definition && it.definition.filterType === "Weapon"); const anyEq = weaponsHeld.some(it => it.equipped);
  inv.forEach(it => { const df = it.definition || {}; let name = String(df.name || "Item").slice(0, 80);
    const g = df.grantedModifiers || [];
    const magic = Math.max(0, ...g.filter(m => m.type === "bonus" && (m.subType === "magic" || (df.filterType === "Armor" && m.subType === "armor-class"))).map(val));
    let ref = dndItemRef(name);
    if (!ref) { const base = [df.baseArmorName, df.filterType === "Weapon" ? df.type : "", name.replace(/,?\s*\+\d$/, "").replace(/^\+\d\s+/, ""), name + " Armor"].filter(Boolean).map(dndItemRef).find(Boolean)
        || (df.filterType === "Armor" ? armorRef(df) : null);
      if (base) { ref = base; if (magic) name = `${base.n} +${magic}`; else if (!df.magic) name = base.n; } }
    const fx = {};
    if (!(ref && (DND_ITEM_FX[ref.n] || ref.arm || ref.wpn))) g.filter(m => m.type === "bonus").forEach(m => { const k = { "armor-class": "ac", "saving-throws": "save", "ability-checks": "check", "spell-attacks": "spAtk", "spell-save-dc": "spDc" }[m.subType]; if (k) fx[k] = (fx[k] || 0) + val(m); });
    const lu = it.limitedUse || null; const ammo = /ammunition/i.test(`${df.filterType} ${df.type} ${df.subType}`) && Number(df.bundleSize) > 1;
    c.inv.push({ id: uid(), name, qty: Math.max(0, Number(it.quantity) || 1), wt: Math.max(0, (Number(df.weight) || 0) / (ammo ? Number(df.bundleSize) : 1)),
      notes: [df.rarity && df.rarity !== "Common" ? df.rarity : "", df.canAttune ? "requires attunement" : "", it.containerEntityId && ids.has(it.containerEntityId) ? "in " + (nm(inv.find(x => x.id === it.containerEntityId)) || "a container") : ""].filter(Boolean).join(" · "),
      eq: !!it.equipped, att: !!it.isAttuned, plus: 0, fx, base: ref && ref.n !== name && !/ \+\d$/.test(name) ? ref.n : "", ch: lu && lu.maxUses ? Math.min(99, Number(lu.maxUses)) : 0, chUsed: lu ? Math.min(99, Number(lu.numberUsed) || 0) : 0, chRest: (lu && DDB_RESET[lu.resetType]) || "dawn" });
    if (df.filterType === "Weapon" && (it.equipped || !anyEq) && !c.attacks.some(a => a.name === name)) {
      const props = (df.properties || []).map(p => p.name).filter(Boolean); const fin = props.includes("Finesse"); const ranged = df.attackType === 2;
      const w = ref && ref.wpn;
      c.attacks.push({ id: uid(), name, ab: fin ? "fin" : ranged ? "dex" : "str", prof: weaponProf(df), dmg: (df.damage && df.damage.diceString) || (w && w.d) || "",
        type: String(df.damageType || (w && w.type) || "").toLowerCase(), bonus: magic, dmgBonus: magic,
        notes: [props.join(", "), w && w.mast ? `Mastery: ${w.mast}` : "", df.range ? `${df.range}${df.longRange ? "/" + df.longRange : ""} ft` : ""].filter(Boolean).join(" · ") }); }
  });
  (d.customItems || []).forEach(it => c.inv.push({ id: uid(), name: String(it.name || "Item").slice(0, 80), qty: Number(it.quantity) || 1, wt: Number(it.weight) || 0, notes: String(it.notes || it.description || "").slice(0, 300) }));
  const cur = d.currencies || {}; ["cp", "sp", "ep", "gp", "pp"].forEach(k => { c.coins[k] = Math.max(0, Number(cur[k]) || 0); });
  // spells
  const clsById = Object.fromEntries(d.classes.map(x => [x.id, nm(x)])); const multi = classes.length > 1; const seen = new Set();
  const prepCaster = n => ["Cleric", "Druid", "Paladin", "Wizard"].includes(n);
  const addSpell = (def, prep, cls, extra) => { if (!def || !def.name) return; const key = def.name.toLowerCase(); if (seen.has(key)) return; seen.add(key);
    const ref = dndSpellRef(def.name); c.spells.push({ id: uid(), lvl: clamp(Number(def.level) || 0, 0, 9), name: def.name.slice(0, 80), prep: !!prep || !def.level,
      notes: [ref ? dndSpellLine(ref) : "", extra].filter(Boolean).join(" · ").slice(0, 300), cls: multi ? cls || "" : "" }); };
  (d.classSpells || []).forEach(cs => { const cls = clsById[cs.characterClassId] || "";
    (cs.spells || []).forEach(s => addSpell(s.definition, s.prepared || s.alwaysPrepared || !prepCaster(cls), cls, s.alwaysPrepared ? "always prepared" : "")); });
  Object.entries(d.spells || {}).forEach(([src, l]) => (l || []).forEach(s => { const lu = s.limitedUse; const per = lu && lu.resetType ? `${lu.maxUses || 1}/${DDB_RESET[lu.resetType] === "short" ? "short rest" : "long rest"}` : "";
    addSpell(s.definition, true, "", [`from ${src === "race" ? "species" : src}`, per].filter(Boolean).join(", ")); }));
  (d.spellSlots || []).forEach(s => { const l = Number(s.level); if (l >= 1 && l <= 9) c.slotsUsed[l] = clamp(Number(s.used) || 0, 0, 9); });
  c.pactUsed = clamp(Math.max(0, ...(d.pactMagic || []).map(s => Number(s.used) || 0)), 0, 9);
  // condition, death saves, exhaustion
  (d.conditions || []).forEach(x => { const n = DDB_COND[x.id]; if (n === "Exhaustion") c.exhaustion = clamp(Number(x.level) || 1, 0, 6); else if (n) c.conditions.push(n); });
  const ds = d.deathSaves || {}; c.death = { s: clamp(Number(ds.successCount) || 0, 0, 3), f: clamp(Number(ds.failCount) || 0, 0, 3) };
  // written-in actions
  (d.customActions || []).forEach(a => c.acts.push({ id: uid(), n: String(a.name || "Action").slice(0, 80), type: DDB_ACT[(a.activation && a.activation.activationType) || a.actionType] || "other", t: ddbText(a.description || a.snippet || "").slice(0, 2000) }));
  // story
  const tr = d.traits || {}; const nt = d.notes || {};
  c.traits = { pers: tr.personalityTraits || "", ideals: tr.ideals || "", bonds: tr.bonds || "", flaws: tr.flaws || "" };
  c.appearance = tr.appearance || ""; c.backstory = nt.backstory || "";
  c.allies = [nt.allies, nt.organizations && `Organizations: ${nt.organizations}`, nt.enemies && `Enemies: ${nt.enemies}`].filter(Boolean).join("\n\n");
  c.notes = [nt.personalPossessions && `Possessions: ${nt.personalPossessions}`, nt.otherHoldings && `Holdings: ${nt.otherHoldings}`, nt.otherNotes].filter(Boolean).join("\n\n");
  c.phys = { gender: d.gender || "", age: d.age != null ? String(d.age) : "", height: d.height || "", weight: d.weight != null ? String(d.weight) : "", eyes: d.eyes || "", hair: d.hair || "", skin: d.skin || "",
    faith: d.faith || "", size: DDB_SIZE[race.sizeId] || "" };
  const av = d.decorations && d.decorations.avatarUrl; if (av && /^https:\/\//.test(av)) c.portrait = av;
  // features this sheet can't list itself: species traits, subclasses outside the free rules, and other picks
  const lines = [];
  const skipTrait = /^(Languages|Age|Size|Speed|Skills|Ability Score Increases?|Creature Type|Alignment|Feat|Darkvision)$/;
  const traits = [...new Set((race.racialTraits || []).map(t => nm(t)).filter(n => n && !skipTrait.test(n)))];
  if (traits.length) lines.push(`${c.species}: ${traits.join(", ")}`);
  classes.forEach(x => { const n = nm(x); const L = DND_LEVELS[n]; const sub = x.subclassDefinition; const lvl = Number(x.level) || 1;
    if (sub && !(L && L.sub && L.sub.n.toLowerCase() === String(sub.name || "").toLowerCase())) {
      // D&D Beyond lists the class's own features with the subclass's, so keep the ones the class doesn't have
      const base = new Set(((x.definition || {}).classFeatures || []).map(f => f.name));
      const fs = (sub.classFeatures || []).filter(f => f && !base.has(f.name) && (f.requiredLevel || 0) <= lvl).sort((a, b) => (a.requiredLevel || 0) - (b.requiredLevel || 0));
      if (fs.length) lines.push(`${sub.name}: ${[...new Set(fs.map(f => `${f.name} (${f.requiredLevel})`))].join(", ")}`); }
    if (!L) { const fs = (x.classFeatures || []).map(f => f.definition).filter(f => f && (f.requiredLevel || 0) <= lvl && !/^(Proficiencies|Hit Points|Equipment)$/.test(f.name));
      if (fs.length) lines.push(`${n}: ${[...new Set(fs.map(f => f.name))].join(", ")}`); } });
  if (unplaced.length) lines.push(`Choices: ${unplaced.join(", ")}`);
  c.features = lines.join("\n");
  // limited uses: class resources this sheet tracks, the rest as trackers
  let out = dndNormalize(c); const k = dndCalc(out); const ours = dndResources(out);
  const plain = s => String(s || "").toLowerCase().replace(/\s*\((enter|pool)\)$|\s+pool$/, "").replace(/^ki( points)?$/, "focus points").trim();
  Object.entries(d.actions || {}).forEach(([src, l]) => (l || []).forEach(a => { const lu = a.limitedUse; if (!lu || !a.name) return;
    const r = ours.find(x => plain(x.n) === plain(a.name) || plain(x.n.replace(/ \(.+\)$/, "")) === plain(a.name));
    if (r) { out.res[r.k] = clamp(Number(lu.numberUsed) || 0, 0, r.max); return; }
    let max = Number(lu.maxUses) || 0; if (lu.statModifierUsesId) max += k.mod[DDB_AB[lu.statModifierUsesId]] || 0; if (lu.useProficiencyBonus) max += k.pb; max = Math.max(1, max);
    if (out.trackers.some(t => t.n === a.name)) return;
    out.trackers.push({ id: uid(), n: String(a.name).slice(0, 80), max, used: clamp(Number(lu.numberUsed) || 0, 0, max), rest: DDB_RESET[lu.resetType] || "none", note: `From D&D Beyond (${src === "race" ? "species" : src})` }); }));
  // hit points: D&D Beyond keeps the dice total without Constitution, we keep the average and add the difference
  const ddbMax = Number(d.overrideHitPoints) || ((Number(d.baseHitPoints) || 0) + (Number(d.bonusHitPoints) || 0) + (k.mod.con + out.hpPerLvl) * out.level);
  if (d.overrideHitPoints) out.hpMax = Number(d.overrideHitPoints); else { out.hpBonus = 0; out.hpBonus = clamp(ddbMax - dndCalc(out).hpMax, -999, 999); }
  const removed = Number(d.removedHitPoints) || 0; out.hp = removed ? Math.max(0, ddbMax - removed) : null; out.hpTemp = Number(d.temporaryHitPoints) || 0;
  out = dndNormalize(out);
  const kk = dndCalc(out);
  if (inv.some(it => (it.definition || {}).filterType === "Armor" && it.equipped && !dndItemInfo(out.inv.find(x => x.eq && x.name.startsWith(String((it.definition || {}).name).split(",")[0])) || { name: "" }).ref))
    notes.push("Some worn armor isn't in the free rules, so check the Armor Class.");
  return { c: out, notes, summary: { name: dndName(out), line: [`Level ${out.level}`, out.species, dndClassList(out).map(e => `${e.cls} ${e.level}${e.subclass ? ` (${e.subclass})` : ""}`).join(" / ")].filter(Boolean).join(" · "),
    hp: kk.hpMax, ac: kk.ac, items: out.inv.length, spells: out.spells.length, feats: out.feats.length, trackers: out.trackers.length } };
}

/* ---------- the import window ---------- */
Object.assign(ui, { ddb: null });
function ddbOpen() { ui.ddb = { step: "start", link: "", id: "", text: "", err: "", res: null }; ui.modal = "dndddb"; renderModal(); setTimeout(() => document.getElementById("ddb-link")?.focus(), 60); }
function ddbTry(text) {
  const st = ui.ddb; let raw;
  try { raw = JSON.parse(String(text || "").trim()); } catch (e) { st.err = "That isn't the whole page. On the D&D Beyond page press Ctrl+A, then Ctrl+C, and paste again."; renderModal(); return; }
  try { st.res = ddbConvert(raw); st.step = "preview"; st.err = ""; } catch (e) { st.err = e.message || String(e); }
  renderModal();
}
async function ddbFetch() {
  const st = ui.ddb; const id = ddbId(st.link); if (!id) { st.err = "Paste your character's D&D Beyond link, like https://www.dndbeyond.com/characters/12345678"; renderModal(); return; }
  st.id = id; st.err = ""; st.step = "fetching"; renderModal();
  try {
    const ctl = typeof AbortController === "function" ? new AbortController() : null; const t = setTimeout(() => ctl && ctl.abort(), 12000);
    const r = await fetch(DDB_URL(id), { signal: ctl ? ctl.signal : undefined, credentials: "omit" }); clearTimeout(t);
    if (ui.ddb !== st) return;
    if (r.status === 403 || r.status === 404) { st.step = "start"; st.err = "D&D Beyond won't share that character. On D&D Beyond, open it, go to Character Settings, and set Character Privacy to Public. Then try again."; renderModal(); return; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); if (j && j.success === false) { st.step = "start"; st.err = (j.message || "D&D Beyond said no.") + " Is the character set to Public?"; renderModal(); return; }
    st.res = ddbConvert(j); st.step = "preview"; renderModal();
  } catch (e) { if (ui.ddb !== st) return; st.step = "paste"; st.err = ""; renderModal(); }
}
function ddbBody() {
  const st = ui.ddb; if (!st) return "";
  const err = st.err ? `<div class="banner" style="border-left-color:var(--bad)">${esc(st.err)}</div>` : "";
  if (st.step === "start" || st.step === "fetching") return `<div class="dnd-ddb">
    <p style="margin:0">Bring a character over from D&D Beyond: ability scores, classes and levels, hit points, proficiencies, equipment, spells, feats, limited uses and backstory.</p>
    <div class="field"><label class="label" for="ddb-link">Your character's link or number</label><input id="ddb-link" data-ddb="link" value="${esc(st.link)}" placeholder="https://www.dndbeyond.com/characters/12345678"></div>
    <p class="faint dnd-small" style="margin:0">The character has to be public on D&D Beyond (Character Settings → Character Privacy → Public). Nothing is sent to D&D Beyond; it's only read.</p>
    ${err}
    <div class="row" style="justify-content:space-between;gap:8px"><span class="row" style="gap:8px"><button class="btn ghost" data-act="ddb-paste">Paste or load the data instead</button></span>
      <span class="row" style="gap:8px"><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn primary" data-act="ddb-fetch" ${st.step === "fetching" ? "disabled" : ""}>${st.step === "fetching" ? "Fetching…" : "Import"}</button></span></div></div>`;
  if (st.step === "paste") { const url = st.id ? DDB_URL(st.id) : ""; return `<div class="dnd-ddb">
    ${st.id ? `<p style="margin:0"><b>Monolith couldn't reach D&D Beyond directly</b>, so bring the data over by hand. It takes a few seconds:</p>
    <ol><li>Open <a href="${esc(url)}" target="_blank" rel="noopener">your character's data on D&D Beyond</a> in your browser${typeof Desk !== "undefined" && Desk ? "" : " (or copy this link into a new tab)"}.
        <div class="row" style="gap:6px;margin-top:4px;flex-wrap:nowrap"><input readonly value="${esc(url)}" onfocus="this.select()" aria-label="Data link"><button class="btn sm" data-act="ddb-copy">Copy link</button></div></li>
      <li>Press Ctrl+A to select it all, then Ctrl+C to copy it.</li><li>Paste it below.</li></ol>` : `<p style="margin:0">Paste the character data from D&D Beyond (everything its data link shows), or load a .json file you saved.</p>`}
    <textarea id="ddb-text" data-ddb="text" placeholder='{"id":12345678,"success":true,"data":{ …' aria-label="Character data">${esc(st.text)}</textarea>
    ${err}
    <div class="row" style="justify-content:space-between;gap:8px"><label class="btn ghost">Load a .json file<input type="file" accept=".json,application/json,text/plain" data-act-change="ddb-file" hidden></label>
      <span class="row" style="gap:8px"><button class="btn ghost" data-act="ddb-back">Back</button><button class="btn primary" data-act="ddb-read" ${st.text.trim() ? "" : "disabled"}>Read it</button></span></div></div>`; }
  if (st.step === "preview") { const r = st.res; const s = r.summary; const same = [...S.chars.values()].find(x => x.ddb && x.ddb === r.c.ddb);
    return `<div class="dnd-ddb">
    <div class="dnd-ddb-preview"><div class="row" style="gap:12px;flex-wrap:nowrap">${r.c.portrait ? `<div class="dnd-portrait" style="width:64px;height:64px;background-image:url('${esc(r.c.portrait)}')"></div>` : ""}
      <div><h3 style="margin:0">${esc(s.name)}</h3><span class="muted">${esc(s.line)}</span></div></div>
      <div class="row" style="gap:6px">${[["HP", s.hp], ["AC", s.ac], ["Items", s.items], ["Spells", s.spells], ["Feats", s.feats], ["Other limited uses", s.trackers]].map(([l, v]) => `<span class="chip ink">${l} ${v}</span>`).join("")}</div>
      ${r.notes.length ? `<ul>${r.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>
    <p class="faint dnd-small" style="margin:0">Check the sheet once it's in: anything D&D Beyond works out from content outside the free rules may need a tweak.</p>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn ghost" data-act="ddb-back">Back</button>
      ${same ? `<button class="btn" data-act="ddb-save" data-id="${esc(same.id)}">Update ${esc(dndName(same))}</button>` : ""}
      <button class="btn primary" data-act="ddb-save">${same ? "Import as a new character" : "Import character"}</button></div></div>`; }
  return "";
}
MODALS.dndddb = () => ui.ddb ? { title: "Import from D&D Beyond", body: ddbBody(), wide: true } : null;
function ddbSave(el) {
  const st = ui.ddb; if (!st || !st.res) return; const c = clone(st.res.c); const into = el.dataset.id && S.chars.get(el.dataset.id);
  if (into) { if (typeof snapshot === "function") snapshot(into, "Before D&D Beyond update", true); c.id = into.id; c.createdAt = into.createdAt || Date.now(); c.color = into.color || c.color;
    S.chars.set(c.id, c); saveChar(c, true); }
  else { c.id = uid(); c.createdAt = Date.now(); addChar(c); }
  ui.ddb = null; ui.modal = null; renderModal(); openCharacter(c); showNotice(`${dndName(c)} ${into ? "updated" : "imported"} from D&D Beyond.`);
}
Object.assign(A, {
  "ddb-open": () => ddbOpen(),
  "ddb-fetch": () => ddbFetch(),
  "ddb-paste": () => { const st = ui.ddb; if (!st) return; st.id = ddbId(st.link); st.step = "paste"; st.err = ""; renderModal(); },
  "ddb-back": () => { const st = ui.ddb; if (!st) return; st.step = st.step === "preview" ? (st.text ? "paste" : "start") : "start"; st.err = ""; renderModal(); },
  "ddb-read": () => { const st = ui.ddb; if (st) ddbTry(st.text); },
  "ddb-copy": () => { const st = ui.ddb; if (!st || !st.id) return; const u = DDB_URL(st.id);
    try { if (typeof Desk !== "undefined" && Desk && Desk.copy) Desk.copy(u); else navigator.clipboard.writeText(u); showNotice("Link copied."); } catch (e) { showNotice("Select the link and copy it."); } },
  "ddb-save": el => ddbSave(el),
});
CHANGE["ddb-file"] = el => { const f = el.files && el.files[0]; if (!f || !ui.ddb) return; const rd = new FileReader();
  rd.onload = () => { ui.ddb.text = String(rd.result || ""); ddbTry(ui.ddb.text); }; rd.readAsText(f); };
document.addEventListener("input", ev => { const el = ev.target; if (!el.dataset || !el.dataset.ddb || !ui.ddb) return; ui.ddb[el.dataset.ddb] = el.value;
  if (el.dataset.ddb === "text") { const b = document.querySelector('[data-act="ddb-read"]'); if (b) b.disabled = !el.value.trim(); } });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.id === "ddb-link") { ev.preventDefault(); ddbFetch(); } });
