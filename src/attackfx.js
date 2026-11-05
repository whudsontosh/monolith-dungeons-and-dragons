/* ============================== D&D 2024: WHAT CLASS FEATURES DO TO ATTACKS ==============================
   dndAtkInfo works out an attack's numbers with the features that change them:
     Rage (damage while raging), Martial Arts (Dexterity and the Martial Arts die for monk weapons
     and Unarmed Strikes), Archery (+2 with ranged weapons), Improved and Superior Critical.
   It also lists "riders", extra damage rolled after a hit: Sneak Attack, Divine Smite (spends a
   spell slot), Hunter's Mark and Hex (while concentrating on them); and the weapon's mastery
   property when the character can use masteries. Every character also gets an Unarmed Strike. */

const DND_MASTERY = {
  Cleave: "Hit a creature with a melee attack and you can attack a second creature within 5 ft of it (once per turn); don't add your ability modifier to that damage unless it's negative.",
  Graze: "If you miss, the target still takes damage equal to your ability modifier, of the weapon's type.",
  Nick: "Make the extra attack of the Light property as part of the Attack action instead of as a Bonus Action (once per turn).",
  Push: "On a hit, push a Large or smaller creature up to 10 ft straight away from you.",
  Sap: "On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.",
  Slow: "On a hit that deals damage, the target's Speed drops by 10 ft until the start of your next turn (it doesn't stack).",
  Topple: "On a hit, the target makes a Constitution saving throw or has the Prone condition.",
  Vex: "On a hit that deals damage, you have Advantage on your next attack roll against that target before the end of your next turn.",
};
/* your level in one class (0 if you don't have it) */
const dndClassLevel = (c, cls) => (dndClassList(c).find(e => e.cls === cls) || { level: 0 }).level;
/* whether any of your classes (and subclasses) has given you a feature by now */
function dndHasFeature(c, name) {
  return dndClassList(c).some(e => { const v = dndAs(c, e); for (let l = 1; l <= e.level; l++) if (dndGainsAt(v, l).some(g => g.f.n === name)) return true; return false; });
}
/* a class table value at your level in that class, e.g. dndTableVal(c, "Rogue", "Sneak Attack") = "3d6" */
function dndTableVal(c, cls, col) { const e = dndClassList(c).find(x => x.cls === cls); if (!e) return ""; const row = dndTableAt(dndAs(c, e), e.level).find(x => x[0] === col); return row ? row[1] : ""; }
const dndBiggerDie = (a, b) => { const n = s => { const m = String(s || "").match(/d(\d+)/); return m ? Number(m[1]) : 0; }; return n(b) > n(a) ? b : a; };
/* everyone's Unarmed Strike (not stored; data-i="u") */
function dndUnarmed(c) { return { id: "__unarmed", name: "Unarmed Strike", ab: "str", prof: true, dmg: "", type: "bludgeoning", bonus: 0, dmgBonus: 0, notes: "", unarmed: true }; }
const dndAtkAt = (c, i) => i === "u" ? dndUnarmed(c) : c.attacks[Number(i)];

function dndAtkInfo(c, k, a) {
  const ref = typeof dndItemInfo === "function" ? dndItemInfo({ name: a.name }).ref : null; const w = ref && ref.wpn ? ref.wpn : null;
  const props = w ? w.p : []; const ranged = a.rng != null ? !!a.rng : w ? !!w.r : false;
  const finesse = a.ab === "fin" || props.includes("Finesse"); const unarmed = !!a.unarmed;
  const monk = dndClassLevel(c, "Monk"); const ma = monk && !k.body && !k.shield ? dndTableVal(c, "Monk", "Martial Arts") : "";
  const monkWeapon = unarmed || (w && !w.r && (w.k === "simple" || (w.k === "martial" && props.includes("Light"))));
  let ab = a.ab; let dmg = a.dmg || "";
  if (ma && monkWeapon) { if (k.mod.dex > k.mod.str && (ab === "str" || ab === "fin")) ab = "dex"; dmg = unarmed ? "1" + ma : dndBiggerDie(dmg, "1" + ma); }
  const abMod = ab === "fin" ? Math.max(k.mod.str, k.mod.dex) : ab === "spell" ? (k.spellAb ? k.mod[k.spellAb] : 0) : ab === "none" ? 0 : k.mod[ab];
  const usesStr = ab === "str" || (ab === "fin" && k.mod.str >= k.mod.dex);
  const notes = []; let hit = abMod + (a.prof ? k.pb : 0) + (a.bonus || 0);
  if (ranged && (c.feats || []).some(f => f.n === "Archery")) { hit += 2; notes.push("Archery +2"); }
  let dmgMod = (ab === "spell" || ab === "none" ? 0 : abMod) + (a.dmgBonus || 0);
  if (unarmed && !ma) dmgMod += 1;   // an Unarmed Strike deals 1 + your Strength modifier
  const rage = c.raging && dndClassLevel(c, "Barbarian") && usesStr ? Number(dndTableVal(c, "Barbarian", "Rage Damage")) || 0 : 0;
  if (rage) { dmgMod += rage; notes.push(`Rage +${rage}`); }
  const critMin = dndHasFeature(c, "Superior Critical") ? 18 : dndHasFeature(c, "Improved Critical") ? 19 : 20;
  const riders = [];
  const sneak = dndClassLevel(c, "Rogue") && (finesse || ranged) && !unarmed ? dndTableVal(c, "Rogue", "Sneak Attack") : "";
  if (sneak) riders.push({ k: "sneak", n: "Sneak Attack", d: sneak, type: a.type || "", note: "Once per turn, with Advantage or an ally next to the target" });
  if (dndClassLevel(c, "Paladin") >= 2 && !ranged) riders.push({ k: "smite", n: "Divine Smite", slot: true, type: "radiant" });
  if (/hunter'?s mark/i.test(c.conc || "")) riders.push({ k: "mark", n: "Hunter's Mark", d: "1d6", type: "force" });
  if (/^\s*hex\b/i.test(c.conc || "")) riders.push({ k: "hex", n: "Hex", d: "1d6", type: "necrotic" });
  const mast = w && w.mast && dndHasFeature(c, "Weapon Mastery") ? { n: w.mast, t: DND_MASTERY[w.mast] || "", dc: w.mast === "Topple" ? 8 + abMod + k.pb : 0, graze: w.mast === "Graze" ? abMod : 0 } : null;
  return { hit, dmgMod, dmg, ab, abMod, ranged, finesse, critMin, riders, mast, notes, ma: !!(ma && monkWeapon), rage };
}

/* ---------- the buttons after a weapon's damage ---------- */
Object.assign(ui, { dndLastHit: null });
function dndRiderBtns(c, n, i) {
  const out = n.riders.map(r => `<button class="btn sm ghost dnd-rider" data-act="dnd-rider" data-i="${i}" data-k="${r.k}" title="${esc(r.note || (r.slot ? "Spend a spell slot for radiant damage after you hit" : `Extra ${r.type} damage on a hit`))}" ${dndDis(c)}>+ ${esc(r.slot ? r.n : `${r.n} ${r.d}`)}</button>`);
  if (n.mast) out.push(`<span class="chip ink dnd-mast" title="${esc(n.mast.t)}">${esc(n.mast.n)}${n.mast.dc ? ` · DC ${n.mast.dc}` : ""}</span>${n.mast.graze > 0 ? `<button class="btn sm ghost" data-act="dnd-graze" data-i="${i}" title="Damage on a miss">Graze ${n.mast.graze}</button>` : ""}`);
  return out.join("");
}
/* after a to-hit roll, remember whether it was a critical so riders double their dice */
function dndRememberHit(c, i, nat, critMin) { const a = dndAtkAt(c, i); ui.dndLastHit = { cid: c.id, aid: a ? a.id : "", crit: nat >= critMin, t: Date.now() }; }
const dndWasCrit = (c, i) => { const h = ui.dndLastHit; const a = dndAtkAt(c, i); return !!(h && a && h.cid === c.id && h.aid === a.id && h.crit && Date.now() - h.t < 120000); };
function dndRollRider(c, i, key) {
  const a = dndAtkAt(c, i); if (!a) return; const k = dndCalc(c); const n = dndAttackNums(c, k, a); const r = n.riders.find(x => x.k === key); if (!r) return;
  if (r.slot) { ui.dndSmite = { cid: c.id, i: String(i), undead: false }; ui.modal = "dndsmite"; renderModal(); return; }
  const crit = dndWasCrit(c, i); const x = dndRollExpr(r.d, 0, crit); if (!x) return;
  Dice.raw(`${a.name || "Attack"}: ${r.n}`, x.text, x.total, dndName(c), [r.type ? { t: r.type, c: "ink" } : null, crit ? { t: "Critical", c: "amber" } : null].filter(Boolean));
}
/* Divine Smite: pick the slot */
Object.assign(ui, { dndSmite: null });
function dndSmiteBody() {
  const s = ui.dndSmite; const c = dndSmiteChar(); if (!c) return "";
  const k = dndCalc(c); const crit = dndWasCrit(c, s.i); const opts = [];
  for (let l = 1; l <= 9; l++) { const max = k.slots[l] || 0; if (max) opts.push({ l, left: max - Math.min(c.slotsUsed[l], max), pact: false }); }
  if (k.pact[0]) opts.push({ l: k.pact[1], left: k.pact[0] - Math.min(c.pactUsed, k.pact[0]), pact: true });
  const dice = l => `${(1 + l + (s.undead ? 1 : 0)) * (crit ? 2 : 1)}d8`;
  return `<div style="display:grid;gap:12px"><p style="margin:0">Spend a spell slot after hitting with a melee weapon or an Unarmed Strike: 2d8 radiant damage, plus 1d8 for each slot level above 1st.${crit ? " <b>Critical hit: the dice are doubled.</b>" : ""}</p>
    <label class="row" style="gap:8px"><input type="checkbox" data-act-change="dnd-smiteund" ${s.undead ? "checked" : ""}>The target is a Fiend or Undead (+1d8)</label>
    <div class="dnd-chips">${opts.map(o => `<button class="dnd-chip" data-act="dnd-smitego" data-l="${o.l}" data-p="${o.pact ? 1 : ""}" ${o.left ? "" : "disabled"}>${dndOrdinal(o.l)}-level${o.pact ? " pact" : ""} slot · ${dice(o.l)} <span class="faint">(${o.left} left)</span></button>`).join("") || `<span class="faint">No spell slots.</span>`}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-act="close-modal">Cancel</button></div></div>`;
}
MODALS.dndsmite = () => ui.dndSmite ? { title: "Divine Smite", body: dndSmiteBody() } : null;
const dndSmiteChar = () => { const s = ui.dndSmite; return s ? (ROLE === "gm" ? pc(s.cid) : S.chars.get(s.cid)) : null; };
Object.assign(A, {
  "dnd-rider": dndAct((c, el) => { dndRollRider(c, el.dataset.i, el.dataset.k); return false; }, false),
  "dnd-graze": dndAct((c, el) => { const a = dndAtkAt(c, el.dataset.i); if (!a) return false; const n = dndAttackNums(c, dndCalc(c), a); if (!n.mast || n.mast.graze <= 0) return false;
    Dice.raw(`${a.name}: Graze`, "missed: ability modifier", n.mast.graze, dndName(c), [{ t: a.type || "damage", c: "ink" }]); return false; }, false),
  "dnd-smitego": el => { const c = dndSmiteChar(); const s = ui.dndSmite; if (!c || !dndCanEdit(c)) return; const l = Number(el.dataset.l); const k = dndCalc(c);
    if (el.dataset.p) { if (c.pactUsed >= k.pact[0]) return; c.pactUsed++; } else { if (c.slotsUsed[l] >= (k.slots[l] || 0)) return; c.slotsUsed[l]++; }
    const crit = dndWasCrit(c, s.i); const x = dndRollExpr(`${1 + l + (s.undead ? 1 : 0)}d8`, 0, crit); const a = dndAtkAt(c, s.i);
    Dice.raw(`${a ? a.name + ": " : ""}Divine Smite`, x.text, x.total, dndName(c), [{ t: "radiant", c: "ink" }, { t: `${dndOrdinal(l)}-level slot`, c: "blue" }, crit ? { t: "Critical", c: "amber" } : null].filter(Boolean));
    ui.dndSmite = null; ui.modal = null; renderModal(); dndCommit(c, true); },
  "dnd-rage": dndAct(c => { if (c.raging) { c.raging = false; showNotice("Rage ends."); return; }
    const r = dndResources(c).find(x => x.k === "rage"); if (!r || r.used >= r.max) { showNotice("No Rages left. A long rest restores them."); return false; }
    c.res.rage = r.used + 1; c.raging = true; showNotice(`${dndName(c)} rages: +${dndTableVal(c, "Barbarian", "Rage Damage")} damage with Strength attacks, Resistance to bludgeoning, piercing and slashing, Advantage on Strength checks and saves.`); }),
});
CHANGE["dnd-smiteund"] = el => { if (ui.dndSmite) { ui.dndSmite.undead = el.checked; renderModal(); } };
