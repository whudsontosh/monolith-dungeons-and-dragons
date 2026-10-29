/* ============================== D&D 2024: SPELL AND EQUIPMENT PICKERS ==============================
   The "Add from the spell list" and "Add from the equipment list" windows, spell details and damage
   rolls on the Spells tab, item details and "Wear" for armor on the Inventory tab, and the starting
   equipment kits the creator offers. The data is in catalog.js. */

const dndKey = s => String(s || "").trim().toLowerCase();
const DND_SPELL_BY = {}; DND_SPELLS.forEach(s => { DND_SPELL_BY[dndKey(s.n)] = s; });
const DND_ITEM_BY = {}; DND_ITEMS.forEach(i => { DND_ITEM_BY[dndKey(i.n)] = i; });
const dndSpellRef = name => DND_SPELL_BY[dndKey(name)] || null;
const dndItemRef = name => DND_ITEM_BY[dndKey(name).replace(/\s*[×x]\s*\d+$/, "")] || null;
const DND_SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const DND_ITEM_CATS = ["Weapon", "Armor", "Adventuring gear", "Container", "Tools", "Clothing", "Ammunition", "Food & drink", "Potion", "Poison", "Scroll", "Ring", "Rod", "Wand", "Wondrous item"];
const DND_RARITIES = ["Common", "Uncommon", "Rare", "Very rare", "Legendary", "Artifact"];
Object.assign(ui, { pick: null, dndSpOpen: {}, dndItOpen: {} });

/* the short line under a spell: "Action · 150 feet · V, S, M · Instantaneous" */
function dndSpellLine(s) { return [s.ct, s.rg, (s.cmp || "").replace(/ \(.*\)$/, ""), s.dur].filter(Boolean).join(" · "); }
/* the highest spell level the character can cast now */
function dndMaxSpellLevel(k) { let m = 0; for (let l = 1; l <= 9; l++) if (k.slots[l]) m = l; if (k.pact[0]) m = Math.max(m, k.pact[1]); return m; }
/* the main damage or healing roll of a spell, with the spellcasting modifier and cantrip scaling filled in */
function dndSpellDice(c, k, ref) {
  if (!ref || !ref.dmg) return null;
  let d = ref.dmg.d.replace(/\bmod\b/g, String(k.spellAb ? k.mod[k.spellAb] : 0)).replace(/\s+/g, "");
  let note = "";
  if (ref.l === 0) { const tier = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
    if (tier > 1) { if (ref.n === "Eldritch Blast") note = `${tier} beams: roll each one`; else d = d.replace(/^(\d+)d(\d+)/, (_, n, s) => `${Number(n) * tier}d${s}`); } }
  return { d, note };
}
function dndSpellRoll(c, i) {
  const s = c.spells[i]; const ref = dndSpellRef(s && s.name); const k = dndCalc(c); const x = dndSpellDice(c, k, ref); if (!x) return;
  const r = dndRollExpr(x.d, 0, false); if (!r) return;
  const dm = ref.dmg; const heal = dm.kind === "heal";
  const tags = [dm.type ? { t: dm.type, c: "ink" } : null, heal ? { t: "Healing", c: "green" } : null,
    dm.kind === "save" && dm.save ? { t: `DC ${k.spellDc} ${DND_AB_NAME[dm.save]} save`, c: "amber" } : null, x.note ? { t: x.note, c: "blue" } : null].filter(Boolean);
  Dice.raw(`${ref.n}: ${heal ? "healing" : "damage"}`, r.text, r.total, dndName(c), tags);
}

/* ---------- spell details on the Spells tab ---------- */
function dndSpellExtras(c, s, i, k) {
  const ref = dndSpellRef(s.name); if (!ref) return { btns: "", body: "" };
  const open = !!ui.dndSpOpen[c.id + ":" + s.id]; const x = dndSpellDice(c, k, ref);
  const btns = `${x ? `<button class="btn sm ghost" data-act="dnd-sproll" data-i="${i}" title="Roll ${esc(x.d)}">${esc(x.d)}</button>` : ""}
    <button class="icon-btn dnd-info ${open ? "on" : ""}" data-act="dnd-spinfo" data-id="${esc(s.id)}" aria-label="About ${esc(ref.n)}" aria-pressed="${open}">i</button>`;
  const body = open ? `<div class="dnd-spdetail"><div class="row" style="gap:6px;margin-bottom:6px"><span class="chip ink">${ref.l ? dndOrdinal(ref.l) + "-level" : "Cantrip"} ${esc(ref.sch)}</span>${ref.conc ? `<span class="chip blue">Concentration</span>` : ""}${ref.rit ? `<span class="chip green">Ritual</span>` : ""}${ref.dmg && ref.dmg.kind === "save" ? `<span class="chip amber">${esc(DND_AB_NAME[ref.dmg.save] || "")} save, DC ${k.spellDc}</span>` : ""}${ref.dmg && ref.dmg.kind === "attack" ? `<span class="chip amber">Spell attack ${sgn(k.spellAtk)}</span>` : ""}</div>
    ${dndFacts([["Casting time", esc(ref.ct)], ["Range", esc(ref.rg)], ["Components", esc(ref.cmp)], ["Duration", esc(ref.dur)], ["Classes", esc(ref.cls.join(", "))]])}<div class="dnd-ftext">${dndParas(ref.t)}</div></div>` : "";
  return { btns, body };
}

/* ---------- the picker window (spells or equipment) ---------- */
function dndPickOpen(c, kind) {
  ui.pick = kind === "spell" ? { kind, cid: c.id, q: "", cls: DND_LEVELS[c.cls] && DND_SPELLS.some(s => s.cls.includes(c.cls)) ? c.cls : "", lvl: "", sch: "", castable: true }
    : { kind, cid: c.id, q: "", cat: "", rar: "", magic: "" };
  ui.pickOpen = {}; ui.modal = "dndpick"; renderModal(); setTimeout(() => document.getElementById("dnd-pick-q")?.focus(), 40);
}
function dndPickChar() { const id = ui.pick && ui.pick.cid; if (!id) return null; return ROLE === "gm" ? pc(id) : S.chars.get(id) || null; }
function dndPickBody() {
  const c = dndPickChar(); const p = ui.pick; if (!c || !p) return null; const k = dndCalc(c);
  const q = dndKey(p.q); const LIMIT = 120; let list, rows, filters;
  if (p.kind === "spell") {
    const max = dndMaxSpellLevel(k);
    list = DND_SPELLS.filter(s => (!p.cls || s.cls.includes(p.cls)) && (p.lvl === "" || s.l === Number(p.lvl)) && (!p.sch || s.sch === p.sch) && (!p.castable || s.l <= max || !max && s.l === 0)
      && (!q || dndKey(s.n).includes(q) || dndKey(s.t).includes(q) && q.length > 3)).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n));
    const have = new Set(c.spells.map(s => dndKey(s.name)));
    filters = `<select data-act-change="dnd-pick" data-k="cls" aria-label="Class list"><option value="">Every class</option>${Object.keys(DND_LEVELS).filter(n => DND_SPELLS.some(s => s.cls.includes(n))).map(n => `<option ${p.cls === n ? "selected" : ""}>${n}</option>`).join("")}</select>
      <select data-act-change="dnd-pick" data-k="lvl" aria-label="Level"><option value="">Any level</option>${DND_SPELL_LEVELS.map((t, l) => `<option value="${l}" ${String(p.lvl) === String(l) ? "selected" : ""}>${l ? dndOrdinal(l) : "Cantrips"}</option>`).join("")}</select>
      <select data-act-change="dnd-pick" data-k="sch" aria-label="School"><option value="">Any school</option>${DND_SCHOOLS.map(s => `<option ${p.sch === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <label class="row dnd-small" style="gap:6px"><input type="checkbox" data-act-change="dnd-pick" data-k="castable" ${p.castable ? "checked" : ""}>Only levels I can cast${max ? ` (up to ${dndOrdinal(max)})` : ""}</label>`;
    rows = list.slice(0, LIMIT).map(s => { const open = !!ui.pickOpen[s.n]; const added = have.has(dndKey(s.n));
      return `<div class="dnd-pickrow ${open ? "open" : ""}"><button class="linkish dnd-pickname" data-act="dnd-pickopen" data-v="${esc(s.n)}"><b>${esc(s.n)}</b>
          <span class="faint dnd-small">${s.l ? dndOrdinal(s.l) : "Cantrip"} · ${esc(s.sch)}${s.conc ? " · C" : ""}${s.rit ? " · R" : ""} · ${esc(s.ct.split(",")[0])} · ${esc(s.rg)}</span></button>
        <button class="btn sm ${added ? "ghost" : "primary"}" data-act="dnd-pickadd" data-v="${esc(s.n)}" ${added ? "disabled" : ""}>${added ? "Added" : "Add"}</button>
        ${open ? `<div class="dnd-pickdetail">${dndFacts([["Casting time", esc(s.ct)], ["Range", esc(s.rg)], ["Components", esc(s.cmp)], ["Duration", esc(s.dur)], ["Classes", esc(s.cls.join(", "))]])}<div class="dnd-ftext">${dndParas(s.t)}</div></div>` : ""}</div>`; }).join("");
  } else {
    list = DND_ITEMS.filter(i => (!p.cat || i.cat === p.cat) && (!p.rar || i.rar === p.rar) && (p.magic === "" || (p.magic === "1") === !!i.mag)
      && (!q || dndKey(i.n).includes(q))).sort((a, b) => a.n.localeCompare(b.n));
    filters = `<select data-act-change="dnd-pick" data-k="cat" aria-label="Category"><option value="">Every kind</option>${DND_ITEM_CATS.map(x => `<option ${p.cat === x ? "selected" : ""}>${x}</option>`).join("")}</select>
      <select data-act-change="dnd-pick" data-k="magic" aria-label="Magic"><option value="">Mundane and magic</option><option value="0" ${p.magic === "0" ? "selected" : ""}>Mundane only</option><option value="1" ${p.magic === "1" ? "selected" : ""}>Magic items only</option></select>
      <select data-act-change="dnd-pick" data-k="rar" aria-label="Rarity"><option value="">Any rarity</option>${DND_RARITIES.map(x => `<option ${p.rar === x ? "selected" : ""}>${x}</option>`).join("")}</select>`;
    rows = list.slice(0, LIMIT).map(i => { const open = !!ui.pickOpen[i.n]; const n = c.inv.filter(x => dndKey(x.name) === dndKey(i.n)).reduce((a, x) => a + (x.qty || 0), 0);
      return `<div class="dnd-pickrow ${open ? "open" : ""}"><button class="linkish dnd-pickname" data-act="dnd-pickopen" data-v="${esc(i.n)}"><b>${esc(i.n)}</b>
          <span class="faint dnd-small">${esc(i.cat)}${i.rar ? " · " + esc(i.rar) : ""}${i.att ? " · attunement" : ""}${i.wpn ? ` · ${esc(i.wpn.d)} ${esc(i.wpn.type)}${i.wpn.b ? ` · +${i.wpn.b}` : ""}` : ""}${i.arm ? ` · AC ${i.arm.t === "shield" ? "+" : ""}${i.arm.ac}${i.arm.b ? ` +${i.arm.b}` : ""}` : ""}${i.cost ? " · " + esc(i.cost) : ""}${i.wt ? ` · ${i.wt} lb` : ""}</span></button>
        <button class="btn sm primary" data-act="dnd-pickadd" data-v="${esc(i.n)}">${n ? `Add another (${n})` : "Add"}</button>
        ${open ? `<div class="dnd-pickdetail"><div class="dnd-ftext">${dndParas(i.t || "No description.")}</div></div>` : ""}</div>`; }).join("");
  }
  return `<div class="dnd-pick">
    <div class="row dnd-pickfilters"><input id="dnd-pick-q" data-pick="q" value="${esc(p.q)}" placeholder="${p.kind === "spell" ? "Search spells, e.g. fire" : "Search equipment, e.g. rope or potion"}" aria-label="Search">${filters}</div>
    <p class="faint dnd-small" style="margin:0">${list.length} ${p.kind === "spell" ? "spell" : "item"}${list.length === 1 ? "" : "s"}${list.length > LIMIT ? `, showing the first ${LIMIT}: search to narrow it down` : ""}. Click a name to read it.</p>
    <div class="dnd-picklist">${rows || `<p class="faint">Nothing matches.</p>`}</div>
    <p class="faint dnd-small" style="margin:0">From the free rules (SRD 5.2). For something from another book, add it by hand.</p>
  </div>`;
}
MODALS.dndpick = () => { const p = ui.pick; if (!p || !dndPickChar()) return null; return { title: p.kind === "spell" ? "Add spells" : "Add equipment", body: dndPickBody(), wide: true }; };

function dndAddSpell(c, ref) {
  if (c.spells.some(s => dndKey(s.name) === dndKey(ref.n))) return;
  c.spells.push({ id: uid(), lvl: ref.l, name: ref.n, prep: ref.l > 0, notes: dndSpellLine(ref) });
}
/* adds an item (and an attack for a weapon) */
function dndAddItem(c, ref, qty = 1) {
  const ex = c.inv.find(x => dndKey(x.name) === dndKey(ref.n));
  if (ex) ex.qty = (ex.qty || 0) + qty;
  else c.inv.push({ id: uid(), name: ref.n, qty, wt: ref.wt || 0, notes: [ref.cost, ref.rar, ref.att ? "requires attunement" : ""].filter(Boolean).join(" · ") });
  if (ref.wpn && !c.attacks.some(a => dndKey(a.name) === dndKey(ref.n))) {
    const w = ref.wpn; const fin = w.p.includes("Finesse");
    const prof = (() => { const kind = (DND_CLASS_INFO[c.cls] || {}).weapons; if (!kind) return true; if (w.k === "simple" || kind === "martial") return true;
      if (kind === "monk") return w.p.includes("Light"); if (kind === "rogue") return fin || w.p.includes("Light"); return false; })();
    c.attacks.push({ id: uid(), name: ref.n, ab: fin ? "fin" : w.r ? "dex" : "str", prof, dmg: w.d, type: w.type.toLowerCase(), bonus: w.b || 0, dmgBonus: w.b || 0,
      notes: [w.p.join(", "), w.mast ? `Mastery: ${w.mast}` : ""].filter(Boolean).join(" · ") });
  }
}
/* "Wear": sets Armor Class from a suit of armor (and a shield you carry) */
function dndWearAc(c, ref) {
  const k = dndCalc(c); const a = ref.arm; const dex = k.mod.dex;
  const shield = c.inv.map(x => dndItemRef(x.name)).filter(x => x && x.arm && x.arm.t === "shield").sort((x, y) => (y.arm.ac + y.arm.b) - (x.arm.ac + x.arm.b))[0];
  const body = a.t === "shield" ? null : a;
  const base = body ? body.ac + (body.dex === 0 ? 0 : body.dex == null ? dex : Math.min(dex, body.dex)) + (body.b || 0) : 10 + dex;
  return { ac: base + (shield ? shield.arm.ac + (shield.arm.b || 0) : 0), shield };
}

/* ---------- starting equipment kits (the creator) ---------- */
function dndKitText(o) { return [...o.items.map(([n, q]) => q > 1 ? `${q} × ${n}` : n), o.gp ? `${o.gp} GP` : ""].filter(Boolean).join(", "); }
function dndApplyKits(b) {
  const opts = [((DND_KITS.class[b.cls] || [])[b.kitCls]), ((DND_KITS.bg[b.bg] || [])[b.kitBg])].filter(Boolean);
  const items = []; let gp = 0; opts.forEach(o => { gp += o.gp; o.items.forEach(([n, q]) => items.push([n, q])); });
  b.armor = ""; b.shield = false; b.weapons = []; const gear = [];
  items.forEach(([n, q]) => {
    if (DND_ARMOR.some(a => a[0] === n)) { if (!b.armor) b.armor = n; else gear.push([n, q]); return; }
    if (n === "Shield") { b.shield = true; return; }
    if (DND_WEAPONS.some(w => w[0] === n)) { for (let i = 0; i < Math.min(q, 30); i++) b.weapons.push(n); return; }
    gear.push([n, q]); });
  b.gear = gear.map(([n, q]) => q > 1 ? `${n} ×${q}` : n).join("\n"); b.gp = gp;
}

/* ---------- buttons ---------- */
Object.assign(A, {
  "dnd-pickspells": dndAct(c => { dndPickOpen(c, "spell"); return false; }, false),
  "dnd-pickitems": dndAct(c => { dndPickOpen(c, "item"); return false; }, false),
  "dnd-pickopen": el => { const v = el.dataset.v; ui.pickOpen[v] = !ui.pickOpen[v]; renderModal(); },
  "dnd-pickadd": () => {},   // replaced below (needs the event's element)
  "dnd-sproll": dndAct((c, el) => { dndSpellRoll(c, Number(el.dataset.i)); return false; }, false),
  "dnd-spinfo": dndAct((c, el) => { const key = c.id + ":" + el.dataset.id; ui.dndSpOpen[key] = !ui.dndSpOpen[key]; return false; }, false),
  "dnd-itinfo": dndAct((c, el) => { const key = c.id + ":" + el.dataset.id; ui.dndItOpen[key] = !ui.dndItOpen[key]; return false; }, false),
  "dnd-wear": dndAct((c, el) => { const it = c.inv[Number(el.dataset.i)]; const ref = it && dndItemRef(it.name); if (!ref || !ref.arm) return false;
    const r = dndWearAc(c, ref); c.ac = r.ac; showNotice(`Armor Class set to ${r.ac}${r.shield ? `, with your ${r.shield.n}` : ""}.`); }),
  "dnd-b-kit": dndAct((c, el) => { const b = dndB(c); const k = el.dataset.k; const v = Number(el.dataset.v); b[k] = b[k] === v ? -1 : v; dndApplyKits(b); }),
});
A["dnd-pickadd"] = el => {
  const c = dndPickChar(); const p = ui.pick; if (!c || !p || !dndCanEdit(c)) return; const v = el.dataset.v;
  if (p.kind === "spell") { const ref = dndSpellRef(v); if (ref) { dndAddSpell(c, ref); showNotice(`${ref.n} added to your spells.`); } }
  else { const ref = dndItemRef(v); if (ref) { dndAddItem(c, ref); showNotice(`${ref.n} added${ref.wpn ? ", with an attack" : ""}.`); } }
  dndCommit(c, true); renderModal();
};
Object.assign(CHANGE, { "dnd-pick": el => { const p = ui.pick; if (!p) return; p[el.dataset.k] = el.type === "checkbox" ? el.checked : el.value; renderModal(); } });
document.addEventListener("input", ev => { const el = ev.target; if (el.dataset && el.dataset.pick && ui.pick) { ui.pick[el.dataset.pick] = el.value; renderModal(); } });
