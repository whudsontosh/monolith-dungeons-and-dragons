/* ============================== D&D 2024: THE GM'S COMBAT TAB ==============================
   Initiative and turns, the SRD monsters (stat blocks, attack and damage rolls), hit points for
   monsters and party members, encounter difficulty from the XP budget, and monster tokens on the
   map. Only the GM's page loads this file (with monsters.js); game.js reaches it through small
   wrappers. The fight lives in the campaign: st.combat = {round, turn, list:[entries]}.
   An entry: {cid, kind: "pc"|"mon", ref (party member id), m (monster name), name, init, mod,
   ac, hp, max, temp, cond: [], out, note}. */

dndMonIndex();   // the GM's page has the whole bestiary
/* a combat entry's roll buttons say which monster in the fight is rolling */
DND_MON_CTX.push(el => { if (!el.dataset.cidE) return null; const e = dndCombat().list.find(x => x.cid === el.dataset.cidE); return e ? { mon: dndMon(e.m), who: e.name } : null; });
/* 2024 rules, Combat Encounters: XP budget per character [Low, Moderate, High] by level */
const DND_XP_BUDGET = [null, [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100],
  [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800],
  [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];
Object.assign(ui, { dndMonPick: null, dndCbOpen: {}, dndCbAmt: {} });

function dndCombat() { if (!st.combat || !Array.isArray(st.combat.list)) st.combat = { round: 1, turn: 0, list: [] }; return st.combat; }
function dndCbHp(e) { if (e.kind === "pc") { const c = pc(e.ref); if (!c) return { hp: 0, max: 0, temp: 0 }; const k = dndCalc(c); return { hp: k.hp, max: k.hpMax, temp: c.hpTemp || 0, c }; } return { hp: e.hp, max: e.max, temp: e.temp || 0 }; }
function dndCbAc(e) { if (e.kind === "pc") { const c = pc(e.ref); return c ? dndCalc(c).ac : 10; } return e.ac; }
const dndCbOut = e => e.kind === "mon" && e.hp <= 0;
function dndCbSort() { const cb = dndCombat(); const cur = cb.list[cb.turn];
  cb.list.sort((a, b) => (b.init ?? -99) - (a.init ?? -99) || (b.mod || 0) - (a.mod || 0) || a.name.localeCompare(b.name));
  cb.turn = cur ? Math.max(0, cb.list.indexOf(cur)) : 0; }
function dndCbAddMonster(m, count = 1, hpMode = "avg") {
  const cb = dndCombat(); const same = cb.list.filter(e => e.m === m.n).length;
  for (let i = 0; i < count; i++) {
    let hp = m.hp; if (hpMode === "roll" && m.hpf) { const r = dndRollExpr(m.hpf, 0, false); if (r) hp = Math.max(1, r.total); }
    cb.list.push({ cid: uid(), kind: "mon", m: m.n, name: count + same > 1 ? `${m.n} ${same + i + 1}` : m.n, init: null, mod: m.init, ac: m.ac, hp, max: hp, temp: 0, cond: [], note: "" });
  }
  // the first copy keeps the plain name until there's a second one
  if (same === 1) { const first = cb.list.find(e => e.m === m.n && e.name === m.n); if (first) first.name = `${m.n} 1`; }
}
function dndCbAddParty() { const cb = dndCombat(); let n = 0;
  st.party.forEach(c => { if (!cb.list.some(e => e.kind === "pc" && e.ref === c.id)) { cb.list.push({ cid: uid(), kind: "pc", ref: c.id, name: dndName(c), init: null, mod: dndCalc(c).init, cond: [] }); n++; } }); return n; }
function dndCbRollInit(which) {
  const cb = dndCombat(); const rolled = [];
  cb.list.forEach(e => { if (which === "mon" && e.kind !== "mon") return; if (which === "empty" && e.init != null) return;
    const mod = e.kind === "pc" ? (pc(e.ref) ? dndCalc(pc(e.ref)).init : 0) : e.mod || 0; e.mod = mod; const r = d(20); e.init = r + mod; rolled.push(`${e.name} ${e.init}`); });
  if (rolled.length) Dice.raw("Initiative", rolled.join(", "), rolled.length, "GM", [{ t: `${rolled.length} rolled`, c: "ink" }]);
  dndCbSort(); cb.turn = 0;
}
function dndCbNext(dir) {
  const cb = dndCombat(); const n = cb.list.length; if (!n) return;
  for (let step = 0; step < n; step++) {
    cb.turn += dir; if (cb.turn >= n) { cb.turn = 0; cb.round++; try { if (Monolith.map && Monolith.map.endRound) Monolith.map.endRound(); } catch (e) { console.error(e); } } // a new round: timed conditions on map tokens count down (Monolith 1.4) if (cb.turn < 0) { cb.turn = n - 1; cb.round = Math.max(1, cb.round - 1); }
    if (!dndCbOut(cb.list[cb.turn])) break;
  }
}
/* damage or healing for an entry (party members go through their own sheet) */
function dndCbHit(e, n, heal) {
  if (e.kind === "pc") { const c = pc(e.ref); if (!c) return; if (heal) dndHeal(c, n); else dndDamage(c, n); c.updatedAt = Date.now(); return; }
  if (heal) { e.hp = Math.min(e.max, e.hp + n); return; }
  const fromTemp = Math.min(e.temp || 0, n); e.temp = (e.temp || 0) - fromTemp; e.hp = Math.max(0, e.hp - (n - fromTemp));
  if (e.hp === 0) showNotice(`${e.name} is down.`);
}
function dndXpSummary() {
  const cb = dndCombat(); const party = st.party.filter(c => c.cls);
  const xp = cb.list.filter(e => e.kind === "mon").reduce((a, e) => a + ((dndMon(e.m) || {}).xp || 0), 0);
  const budget = [0, 0, 0]; party.forEach(c => { const b = DND_XP_BUDGET[clamp(c.level, 1, 20)]; budget[0] += b[0]; budget[1] += b[1]; budget[2] += b[2]; });
  const label = !party.length || !xp ? "" : xp > budget[2] ? "Beyond High" : xp > budget[1] ? "High" : xp > budget[0] ? "Moderate" : "Low";
  return { xp, budget, label, party: party.length };
}

/* ---------- the Combat tab ---------- */
function dndCombatTab() {
  const cb = dndCombat(); const x = dndXpSummary(); const cur = cb.list[cb.turn];
  const rows = cb.list.map((e, i) => {
    const h = dndCbHp(e); const ac = dndCbAc(e); const on = i === cb.turn && cb.list.length; const out = dndCbOut(e) || (e.kind === "pc" && h.c && dndCalc(h.c).dead);
    const m = e.kind === "mon" ? dndMon(e.m) : null; const open = !!ui.dndCbOpen[e.cid]; const frac = h.max ? h.hp / h.max : 0;
    const conds = e.kind === "pc" ? (h.c ? h.c.conditions : []) : e.cond;
    return `<div class="dnd-cbrow ${on ? "on" : ""} ${out ? "out" : ""} ${e.kind}" data-cid-row="${esc(e.cid)}">
      <input type="number" class="dnd-cbinit" data-act-change="dnd-cbinit" data-c="${esc(e.cid)}" value="${e.init ?? ""}" placeholder="—" aria-label="Initiative for ${esc(e.name)}">
      <div class="dnd-cbname"><b>${esc(e.name)}</b><span class="faint dnd-small">${e.kind === "pc" ? esc([h.c && dndClassLine(h.c), h.c && `level ${h.c.level}`].filter(Boolean).join(" ")) : m ? `CR ${dndCr(m.cr)} · ${esc(m.type)}` : "Custom"}${e.mod != null ? ` · init ${sgn(e.mod)}` : ""}</span>
        ${conds && conds.length ? `<span class="row" style="gap:4px">${conds.map(c => `<span class="chip red">${esc(c)}</span>`).join("")}</span>` : ""}</div>
      <span class="dnd-cbac" title="Armor Class"><b>${ac}</b><span class="label">AC</span></span>
      <div class="dnd-cbhp"><b>${h.hp}</b><span class="faint"> / ${h.max}</span>${h.temp ? ` <span class="chip blue">+${h.temp}</span>` : ""}${out ? ` <span class="chip red">${e.kind === "pc" ? "Dead" : "Down"}</span>` : ""}
        <div class="meter"><i style="width:${clamp(frac, 0, 1) * 100}%;background:${dndRingColor(frac)}"></i></div></div>
      <div class="row dnd-cbdmg"><input type="number" min="0" class="dnd-cbamt" data-cbamt="${esc(e.cid)}" value="${esc(ui.dndCbAmt[e.cid] || "")}" placeholder="0" aria-label="Amount for ${esc(e.name)}">
        <button class="btn sm danger" data-act="dnd-cbhit" data-c="${esc(e.cid)}">Dmg</button><button class="btn sm" data-act="dnd-cbheal" data-c="${esc(e.cid)}">Heal</button></div>
      <div class="row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap">
        ${m ? `<button class="btn sm ${open ? "primary" : "ghost"}" data-act="dnd-cbopen" data-c="${esc(e.cid)}">Stat block</button>` : e.kind === "pc" ? `<button class="btn sm ghost" data-act="dnd-gm-open" data-id="${esc(e.ref)}">Sheet</button>` : ""}
        <button class="icon-btn" data-act="dnd-cbremove" data-c="${esc(e.cid)}" aria-label="Remove ${esc(e.name)}">×</button></div>
      ${open && m ? `<div class="dnd-cbblock">${dndStatBlock(m, e)}</div>` : ""}
    </div>`; }).join("");
  return `<div class="dnd dnd-combat">
    <div class="roster-head dnd-head"><h1><small>${cb.list.length ? `Round ${cb.round}${cur ? ` · ${esc(cur.name)}'s turn` : ""}` : "No fight yet"}</small>Combat</h1>
      <div class="dnd-headtools">
        <button class="btn sm" data-act="dnd-cbparty">Add the party</button>
        <button class="btn sm primary" data-act="dnd-monpick">+ Add monsters</button>
        <button class="btn sm" data-act="dnd-cbcustom">+ Custom</button>
      </div></div>
    <div class="row dnd-cbbar">
      <button class="btn" data-act="dnd-cbinitroll" data-w="all" ${cb.list.length ? "" : "disabled"}>Roll initiative for everyone</button>
      <button class="btn" data-act="dnd-cbinitroll" data-w="mon" ${cb.list.some(e => e.kind === "mon") ? "" : "disabled"}>Roll for monsters only</button>
      <span style="flex:1"></span>
      <button class="btn" data-act="dnd-cbturn" data-d="-1" ${cb.list.length ? "" : "disabled"}>← Previous</button>
      <button class="btn primary" data-act="dnd-cbturn" data-d="1" ${cb.list.length ? "" : "disabled"}>Next turn →</button>
      <button class="btn ghost" data-act="dnd-cbplace" ${cb.list.some(e => e.kind === "mon") ? "" : "disabled"} title="Put the monsters on the current map">Place on map</button>
      <button class="btn ghost danger" data-act="dnd-cbend" ${cb.list.length ? "" : "disabled"}>End fight</button>
    </div>
    ${x.xp ? `<div class="banner dnd-xpbar"><b>${x.label ? `${x.label} difficulty` : "Encounter"}</b>: ${x.xp.toLocaleString()} XP of monsters${x.party ? ` against a budget of ${x.budget[0].toLocaleString()} Low · ${x.budget[1].toLocaleString()} Moderate · ${x.budget[2].toLocaleString()} High for ${x.party} character${x.party === 1 ? "" : "s"}` : ". Add party members with a class to see the difficulty."}</div>` : ""}
    <section class="panel"><div class="panel-b dnd-cblist">${rows || `<div class="empty" style="margin:0"><h3>Set up a fight</h3><p class="muted" style="margin:0">Add the party and some monsters, roll initiative, then step through the turns. Damage to party members goes straight onto their sheets.</p></div>`}</div></section>
  </div>`;
}

/* ---------- the monster picker ---------- */
function dndMonPickBody() {
  const p = ui.dndMonPick; if (!p) return null; const q = (p.q || "").toLowerCase();
  const types = [...new Set(DND_MONSTERS.map(m => m.type.split(" (")[0]))].sort();
  const crs = [...new Set(DND_MONSTERS.map(m => m.cr))].sort((a, b) => a - b);
  const list = DND_MONSTERS.filter(m => (!q || m.n.toLowerCase().includes(q)) && (!p.type || m.type.startsWith(p.type)) && (p.min === "" || m.cr >= Number(p.min)) && (p.max === "" || m.cr <= Number(p.max)))
    .sort((a, b) => a.cr - b.cr || a.n.localeCompare(b.n));
  const crSel = (k, cur, lbl) => `<select data-act-change="dnd-monpick" data-k="${k}" aria-label="${lbl}"><option value="">${lbl}</option>${crs.map(c => `<option value="${c}" ${String(cur) === String(c) ? "selected" : ""}>CR ${dndCr(c)}</option>`).join("")}</select>`;
  const x = dndXpSummary();
  return `<div class="dnd-pick">
    <div class="row dnd-pickfilters"><input id="dnd-mon-q" data-monq="1" value="${esc(p.q || "")}" placeholder="Search monsters, e.g. goblin or dragon" aria-label="Search">
      <select data-act-change="dnd-monpick" data-k="type" aria-label="Type"><option value="">Any type</option>${types.map(t => `<option ${p.type === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      ${crSel("min", p.min, "Lowest CR")}${crSel("max", p.max, "Highest CR")}
      <label class="row dnd-small" style="gap:6px">Hit points <select data-act-change="dnd-monpick" data-k="hp"><option value="avg" ${p.hp !== "roll" ? "selected" : ""}>Average</option><option value="roll" ${p.hp === "roll" ? "selected" : ""}>Rolled</option></select></label></div>
    <p class="faint dnd-small" style="margin:0">${list.length} monster${list.length === 1 ? "" : "s"} from the free rules. ${x.xp ? `This fight so far: ${x.xp.toLocaleString()} XP${x.label ? `, ${x.label}` : ""}.` : ""}</p>
    <div class="dnd-picklist">${list.slice(0, 150).map(m => { const open = !!(p.open || {})[m.n]; const n = Number((p.count || {})[m.n]) || 1;
      return `<div class="dnd-pickrow ${open ? "open" : ""}"><button class="linkish dnd-pickname" data-act="dnd-monopen" data-v="${esc(m.n)}"><b>${esc(m.n)}</b>
          <span class="faint dnd-small">CR ${dndCr(m.cr)} · ${m.xp.toLocaleString()} XP · ${esc(m.size)} ${esc(m.type)} · AC ${m.ac} · HP ${m.hp}</span></button>
        <span class="row" style="gap:4px;flex-wrap:nowrap"><input type="number" min="1" max="20" class="dnd-moncount" data-moncount="${esc(m.n)}" value="${n}" aria-label="How many">
          <button class="btn sm primary" data-act="dnd-monadd" data-v="${esc(m.n)}">Add</button></span>
        ${open ? `<div class="dnd-pickdetail">${dndStatBlock(m, null)}</div>` : ""}</div>`; }).join("") || `<p class="faint">Nothing matches.</p>`}</div>
  </div>`;
}
MODALS.dndmon = () => ui.dndMonPick ? { title: "Add monsters", body: dndMonPickBody(), wide: true } : null;
MODALS.dndcustom = () => ({ title: "Add a custom combatant", body: `<div class="dnd-form" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div class="field dnd-wide"><label class="label">Name</label><input id="dnd-cu-name" placeholder="Bandit captain"></div>
    <div class="field"><label class="label">Initiative bonus</label><input id="dnd-cu-init" type="number" value="0"></div>
    <div class="field"><label class="label">Armor Class</label><input id="dnd-cu-ac" type="number" value="12"></div>
    <div class="field"><label class="label">Hit points</label><input id="dnd-cu-hp" type="number" value="10" min="1"></div>
    <div class="field"><label class="label">How many</label><input id="dnd-cu-n" type="number" value="1" min="1" max="20"></div></div>
  <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn primary" data-act="dnd-cuadd">Add</button></div>` });

Object.assign(A, {
  "dnd-cbparty": () => { const n = dndCbAddParty(); save(); render(); showNotice(n ? `${n} party member${n === 1 ? "" : "s"} added.` : "Everyone in the party is already in the fight."); },
  "dnd-monpick": () => { ui.dndMonPick = ui.dndMonPick || { q: "", type: "", min: "", max: "", hp: "avg", open: {}, count: {} }; ui.modal = "dndmon"; renderModal(); setTimeout(() => document.getElementById("dnd-mon-q")?.focus(), 40); },
  "dnd-monopen": el => { const p = ui.dndMonPick; p.open = p.open || {}; p.open[el.dataset.v] = !p.open[el.dataset.v]; renderModal(); },
  "dnd-monadd": el => { const m = dndMon(el.dataset.v); if (!m) return; const p = ui.dndMonPick; const n = clamp(Number((p.count || {})[m.n]) || 1, 1, 20);
    dndCbAddMonster(m, n, p.hp); save(); render(); renderModal(); showNotice(`${n > 1 ? n + " × " : ""}${m.n} added to the fight.`); },
  "dnd-cbcustom": () => { ui.modal = "dndcustom"; renderModal(); setTimeout(() => document.getElementById("dnd-cu-name")?.focus(), 40); },
  "dnd-cuadd": () => { const v = id => document.getElementById(id)?.value || ""; const name = v("dnd-cu-name").trim() || "Foe"; const n = clamp(Number(v("dnd-cu-n")) || 1, 1, 20); const cb = dndCombat();
    for (let i = 0; i < n; i++) { const hp = Math.max(1, Number(v("dnd-cu-hp")) || 1); cb.list.push({ cid: uid(), kind: "mon", m: "", name: n > 1 ? `${name} ${i + 1}` : name, init: null, mod: Number(v("dnd-cu-init")) || 0, ac: Number(v("dnd-cu-ac")) || 10, hp, max: hp, temp: 0, cond: [], note: "" }); }
    ui.modal = null; save(); render(); renderModal(); },
  "dnd-cbinitroll": el => { dndCbRollInit(el.dataset.w === "mon" ? "mon" : "all"); save(); render(); },
  "dnd-cbturn": el => { dndCbNext(Number(el.dataset.d)); save(); render(); if (typeof MapV !== "undefined") MapV.invalidate(); if (typeof scheduleSync === "function") scheduleSync(); },
  "dnd-cbopen": el => { ui.dndCbOpen[el.dataset.c] = !ui.dndCbOpen[el.dataset.c]; render(); },
  "dnd-cbremove": el => { const cb = dndCombat(); const i = cb.list.findIndex(e => e.cid === el.dataset.c); if (i < 0) return; cb.list.splice(i, 1);
    if (cb.turn >= cb.list.length) cb.turn = 0; else if (i < cb.turn) cb.turn--;
    (st.maps || []).forEach(m => { m.tokens = m.tokens.filter(t => !(t.kind === "npc" && t.ref === el.dataset.c)); }); save(); render(); },
  "dnd-cbhit": el => dndCbAmount(el, false), "dnd-cbheal": el => dndCbAmount(el, true),
  "dnd-cbend": () => { const cb = dndCombat(); const ids = new Set(cb.list.filter(e => e.kind === "mon").map(e => e.cid));
    (st.maps || []).forEach(m => { m.tokens = m.tokens.filter(t => !(t.kind === "npc" && ids.has(t.ref))); });
    st.combat = { round: 1, turn: 0, list: [] }; save(); render(); if (typeof MapV !== "undefined") MapV.invalidate(); showNotice("The fight is over. Monsters are off the map."); },
  "dnd-cbplace": () => { const m = typeof curMap === "function" ? curMap() : null; if (!m) { showNotice("Make a map on the Map tab first."); return; }
    const cb = dndCombat(); let n = 0; const c0 = typeof viewCenter === "function" ? viewCenter(m) : { x: m.w / 2, y: m.h / 2 };
    cb.list.filter(e => e.kind === "mon" && !m.tokens.some(t => t.kind === "npc" && t.ref === e.cid)).forEach(e => { const mon = dndMon(e.m); const p = freeSpot(m, c0.x, c0.y);
      m.tokens.push({ id: uid(), kind: "npc", ref: e.cid, label: e.name, color: "#5a2a1a", size: mon ? mon.sq : 1, x: p.x, y: p.y, hidden: false }); n++; });
    save(); render(); if (typeof MapV !== "undefined") MapV.invalidate(); showNotice(n ? `${n} monster${n === 1 ? "" : "s"} placed on ${m.name || "the map"}.` : "They're all on the map already."); },
});
function dndCbAmount(el, heal) {
  const cb = dndCombat(); const e = cb.list.find(x => x.cid === el.dataset.c); if (!e) return; const n = Math.max(0, Math.floor(Number(ui.dndCbAmt[e.cid]) || 0)); if (!n) return;
  dndCbHit(e, n, heal); ui.dndCbAmt[e.cid] = ""; save(); render(); if (typeof MapV !== "undefined") MapV.invalidate(); if (typeof scheduleSync === "function") scheduleSync();
}
Object.assign(CHANGE, {
  "dnd-cbinit": el => { const cb = dndCombat(); const e = cb.list.find(x => x.cid === el.dataset.c); if (!e) return; e.init = el.value === "" ? null : Number(el.value); dndCbSort(); save(); render(); },
  "dnd-monpick": el => { const p = ui.dndMonPick; if (!p) return; p[el.dataset.k] = el.value; renderModal(); },
});
document.addEventListener("input", ev => { const el = ev.target; if (!el.dataset) return;
  if (el.dataset.monq && ui.dndMonPick) { ui.dndMonPick.q = el.value; renderModal(); }
  if (el.dataset.moncount && ui.dndMonPick) { ui.dndMonPick.count = ui.dndMonPick.count || {}; ui.dndMonPick.count[el.dataset.moncount] = el.value; }
  if (el.dataset.cbamt) ui.dndCbAmt[el.dataset.cbamt] = el.value; });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.cbamt) { ev.preventDefault(); document.querySelector(`[data-act="dnd-cbhit"][data-c="${ev.target.dataset.cbamt}"]`)?.click(); } });

/* ---------- map hooks (called from game.js) ---------- */
function dndCbActiveTurn() { const cb = dndCombat(); const e = cb.list[cb.turn]; if (!e || !cb.list.length) return null; return e.kind === "pc" ? { kind: "pc", ref: e.ref } : { kind: "npc", ref: e.cid }; }
function dndCbTokenRing(t) { if (t.kind !== "npc") return null; const e = dndCombat().list.find(x => x.cid === t.ref); if (!e) return null; const f = e.max ? e.hp / e.max : 0; return { color: dndRingColor(f), frac: Math.max(f, 0.05), dead: e.hp <= 0 }; }
function dndCbTokenInfo(t) { if (t.kind !== "npc") return ""; const e = dndCombat().list.find(x => x.cid === t.ref); if (!e) return "";
  return `<div class="row" style="justify-content:space-between;gap:8px"><span>HP <b>${e.hp}</b>/${e.max} · AC <b>${e.ac}</b>${e.init != null ? ` · init ${e.init}` : ""}</span>
    <span class="row" style="gap:4px"><input type="number" min="0" class="dnd-cbamt" data-cbamt="${esc(e.cid)}" value="${esc(ui.dndCbAmt[e.cid] || "")}" placeholder="0" aria-label="Amount" style="width:64px">
    <button class="btn sm danger" data-act="dnd-cbhit" data-c="${esc(e.cid)}">Dmg</button><button class="btn sm" data-act="dnd-cbheal" data-c="${esc(e.cid)}">Heal</button></span></div>`; }
function dndCbTokenButtons() { const n = dndCombat().list.filter(e => e.kind === "mon").length; return `<button class="btn sm" data-act="dnd-cbplace" ${n ? "" : "disabled"} title="${n ? "" : "Add monsters on the Combat tab first"}">Place the fight's monsters</button>`; }
function dndCbRemoveCharacter(id) { const cb = dndCombat(); const cur = cb.list[cb.turn]; cb.list = cb.list.filter(e => !(e.kind === "pc" && e.ref === id)); const i = cur ? cb.list.indexOf(cur) : -1; cb.turn = i >= 0 ? i : 0; }
