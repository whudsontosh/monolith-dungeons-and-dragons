/* ============================== D&D 2024: THE CHARACTER SHEET ==============================
   One sheet, used by the player (their own characters) and by the GM (party members).
   Tabs: Sheet (abilities, skills, combat, attacks), Spells, Inventory, Details.

   How editing works: an input with data-dnd="path" (for example "ab.str" or "attacks.0.name")
   writes straight into the character, then the sheet saves and redraws. Buttons use
   data-act="dnd-..." (the handlers are in A[...] further down). Everything sits inside an
   element with data-cid="<character id>", so handlers know which character they act on. */

/* ---------- which character, and saving it (player page or GM page) ---------- */
function dndFind(el) {
  const id = el && el.closest && el.closest("[data-cid]")?.dataset.cid; if (!id) return null;
  if (ROLE === "gm") return typeof pc === "function" ? pc(id) : null;
  const sm = sample(); if (sm && sm.id === id) return sm;
  return S.chars.get(id) || null;
}
function dndCanEdit(c) { return ROLE === "gm" ? !!c : canEditChar(c); }
function dndCommit(c, now) {
  if (!c) return;
  if (ROLE === "gm") { c.updatedAt = Date.now(); save(now); } else saveChar(c, now);
  requestRender();
}
const dndOrdinal = n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const dndName = c => c.name || "Unnamed";
Object.assign(ui, { dndTab: "sheet", dndAdv: "normal", dndEdit: null, dndAmt: "" });

/* ---------- rolling ---------- */
// The next d20 roll uses the Normal / Advantage / Disadvantage switch (it resets after one roll).
// Shift+click rolls with advantage and Ctrl+click with disadvantage, whatever the switch says.
function dndD20(c, label, mod, ev, more) {
  const k = dndCalc(c);
  const mode = ev && ev.shiftKey ? "adv" : ev && (ev.ctrlKey || ev.metaKey) ? "dis" : ui.dndAdv;
  const a = d(20), b = mode === "normal" ? null : d(20);
  const nat = b == null ? a : mode === "adv" ? Math.max(a, b) : Math.min(a, b);
  const pen = k.ex * 2; const total = nat + mod - pen;
  const dice = b == null ? `d20 (${a})` : `d20 ${mode === "adv" ? "advantage" : "disadvantage"} (${a}, ${b})`;
  const detail = `${dice} ${sgn(mod)}${pen ? ` −${pen} exhaustion` : ""}`;
  const tags = [];
  if (nat === 20) tags.push({ t: "Natural 20", c: "green" });
  if (nat === 1) tags.push({ t: "Natural 1", c: "red" });
  (more || []).forEach(t => tags.push(t));
  Dice.raw(label, detail, total, dndName(c), tags);
  if (ui.dndAdv !== "normal") { ui.dndAdv = "normal"; requestRender(); }
  return { nat, total };
}

/* ---------- hit points ---------- */
function dndDamage(c, n) {
  const k = dndCalc(c); let hp = k.hp; let left = n;
  const fromTemp = Math.min(c.hpTemp, left); c.hpTemp -= fromTemp; left -= fromTemp;
  const msgs = [];
  if (left > 0) {
    if (hp === 0) { c.death.f = Math.min(3, c.death.f + 1); msgs.push("Damage at 0 HP: one failed death save."); }
    const after = hp - left;
    if (after <= 0 && -after >= k.hpMax) { c.death.f = 3; msgs.push("Massive damage: the remaining damage equals your hit point maximum, so you die."); }
    hp = Math.max(0, after);
    if (hp === 0 && !c.conditions.includes("Unconscious")) { c.conditions.push("Unconscious"); c.death = { s: 0, f: c.death.f }; }
  }
  c.hp = hp;
  if (c.conc && n > 0) msgs.push(`Concentrating on ${c.conc}: make a Constitution save, DC ${Math.min(30, Math.max(10, Math.floor(n / 2)))}.`);
  showNotice(`${dndName(c)} takes ${n} damage${fromTemp ? ` (${fromTemp} from temporary HP)` : ""}. ${msgs.join(" ")}`.trim());
}
function dndHeal(c, n) {
  const k = dndCalc(c); const was = k.hp;
  c.hp = Math.min(k.hpMax, was + n);
  if (was === 0 && c.hp > 0) { c.death = { s: 0, f: 0 }; c.conditions = c.conditions.filter(x => x !== "Unconscious"); }
  if (c.hp >= k.hpMax) c.hp = null;
}

/* ---------- small pieces ---------- */
const dndDis = c => dndCanEdit(c) ? "" : "disabled";
function dndNum(c, path, v, attrs = "") {
  return `<input type="number" inputmode="numeric" data-dnd="${path}" value="${v === "" || v == null ? "" : esc(v)}" ${attrs} ${dndDis(c)}>`;
}
function dndText(c, path, v, attrs = "") { return `<input data-dnd="${path}" value="${esc(v)}" ${attrs} ${dndDis(c)}>`; }
function dndPip(on, act, data, label, tri) {
  const state = tri ? (on === 2 ? "exp" : on ? "on" : "") : on ? "on" : "";
  return `<button class="dnd-pip ${state}" data-act="${act}" ${data} aria-pressed="${!!on}" aria-label="${esc(label)}" title="${esc(label)}"></button>`;
}
function dndTile(label, value, extra = "") { return `<div class="dnd-tile">${value}<span class="label">${label}</span>${extra}</div>`; }

/* ---------- the sheet ---------- */
function dndSheetView(c) {
  const k = dndCalc(c); const tab = ui.dndTab;
  const sub = [`Level ${c.level}`, c.species, [c.cls, c.subclass && `(${c.subclass})`].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "New character";
  const tabs = [["sheet", "Sheet"], ["features", "Features"], ["spells", "Spells"], ["inv", "Inventory"], ["details", "Details"]];
  const back = ROLE === "gm" ? `<button class="btn sm ghost" data-act="close-pc">← The party</button>` : "";
  const sm = ROLE !== "gm" ? sample() : null; const isSample = !!(sm && sm.id === c.id);
  return `<div class="dnd" data-cid="${esc(c.id)}">
    ${back ? `<div class="row" style="margin-bottom:12px">${back}</div>` : ""}
    ${isSample ? `<div class="banner" style="margin-bottom:16px"><b>This is the example character.</b> Copy it to your characters to edit it. <button class="btn sm primary" data-act="copy-sample">Copy to my characters</button></div>` : ""}
    <div class="roster-head dnd-head">
      <h1><small>${esc(sub)}</small>${esc(dndName(c))}</h1>
      <div class="dnd-headtools">
        <div class="seg" role="group" aria-label="Next d20 roll" title="Applies to your next d20 roll. Or Shift+click a roll for advantage, Ctrl+click for disadvantage.">
          ${[["normal", "Normal"], ["adv", "Advantage"], ["dis", "Disadvantage"]].map(([m, l]) => `<button class="${ui.dndAdv === m ? "on" : ""}" data-act="dnd-adv" data-m="${m}">${l}</button>`).join("")}
        </div>
        <button class="btn sm ${c.insp ? "primary" : ""}" data-act="dnd-insp" aria-pressed="${c.insp}" ${dndDis(c)}>${c.insp ? "★" : "☆"} Heroic Inspiration</button>
        ${c.level < 20 && dndCanEdit(c) && DND_LEVELS[c.cls] ? `<button class="btn sm primary" data-act="dnd-levelup">Level up</button>` : ""}
        <button class="btn sm" data-act="dnd-short" ${dndDis(c)}>Short rest</button>
        <button class="btn sm" data-act="dnd-long" ${dndDis(c)}>Long rest</button>
      </div>
    </div>
    <nav class="dnd-tabs" aria-label="Sheet sections">${tabs.map(([id, l]) => `<button class="${tab === id ? "on" : ""}" data-act="dnd-tab" data-t="${id}">${l}</button>`).join("")}</nav>
    ${tab === "features" ? dndFeaturesTab(c, k) : tab === "spells" ? dndSpellsTab(c, k) : tab === "inv" ? dndInvTab(c, k) : tab === "details" ? dndDetailsTab(c, k) : dndMainTab(c, k)}
  </div>`;
}

/* ----- Sheet tab ----- */
function dndMainTab(c, k) {
  const abil = DND_ABILITIES.map(([a, n]) => `<div class="dnd-ab">
      <span class="label">${n}</span>
      <button class="dnd-mod" data-act="dnd-check" data-a="${a}" title="Roll a ${n} check">${sgn(k.mod[a])}</button>
      ${dndNum(c, `ab.${a}`, c.ab[a], `min="1" max="30" aria-label="${n} score"`)}
    </div>`).join("");
  const saves = DND_ABILITIES.map(([a, n]) => `<div class="dnd-li">
      ${dndPip(c.saveProf[a], "dnd-saveprof", `data-a="${a}"`, `Proficient in ${n} saves`)}
      <span class="dnd-li-n">${n}</span>
      <button class="dnd-roll" data-act="dnd-save" data-a="${a}" title="Roll a ${n} saving throw">${sgn(k.save[a])}</button>
    </div>`).join("");
  const skills = DND_SKILLS.map(([s, n, a]) => { const p = c.skills[s] || 0; return `<div class="dnd-li">
      ${dndPip(p, "dnd-skillprof", `data-s="${s}"`, p === 2 ? `${n}: expertise` : p ? `${n}: proficient` : `${n}: not proficient`, true)}
      <span class="dnd-li-n">${n} <span class="faint dnd-abbr">${a.toUpperCase()}</span></span>
      <button class="dnd-roll" data-act="dnd-skill" data-s="${s}" title="Roll ${n}">${sgn(k.skill[s])}</button>
    </div>`; }).join("");
  return `<div class="dnd-grid">
    <div class="dnd-col">
      <div class="dnd-abs">${abil}</div>
      <section class="panel"><div class="panel-h"><h3>Saving throws</h3></div><div class="panel-b dnd-list">${saves}</div></section>
    </div>
    <section class="panel"><div class="panel-h"><h3>Skills</h3>
        <label class="row dnd-small" style="gap:6px" title="Bards: add half your proficiency bonus to checks you aren't proficient in"><input type="checkbox" data-dnd="jack" ${c.jack ? "checked" : ""} ${dndDis(c)}>Jack of All Trades</label></div>
      <div class="panel-b dnd-list">${skills}
        <p class="dnd-legend faint">Click the dot: <span class="dnd-pip on"></span> proficient, <span class="dnd-pip exp"></span> expertise.</p></div>
      <div class="dnd-passives">${[["Passive Perception", k.passive.perception], ["Passive Insight", k.passive.insight], ["Passive Investigation", k.passive.investigation]].map(([l, v]) => `<div><b>${v}</b><span class="label">${l}</span></div>`).join("")}</div>
    </section>
    <div class="dnd-col">
      <div class="dnd-tiles">
        ${dndTile("Armor Class", dndNum(c, "ac", c.ac, `min="0" max="50" class="dnd-big" aria-label="Armor Class"`))}
        ${dndTile("Initiative", `<button class="dnd-big dnd-roll" data-act="dnd-init" title="Roll initiative">${sgn(k.init)}</button>`)}
        ${dndTile("Speed", `<b class="dnd-big">${k.speed}<small> ft</small></b>`, k.ex ? `<span class="dnd-tile-note">−${k.ex * 5} exhaustion</span>` : "")}
        ${dndTile("Proficiency", `<b class="dnd-big">${sgn(k.pb)}</b>`)}
      </div>
      ${dndHpPanel(c, k)}
      ${dndConditionsPanel(c, k)}
    </div>
  </div>
  ${dndAttacksPanel(c, k)}`;
}

function dndHpPanel(c, k) {
  const frac = k.hpMax ? k.hp / k.hpMax : 0;
  const tone = k.dead ? "dead" : k.hp === 0 ? "down" : frac <= 0.25 ? "low" : frac <= 0.5 ? "mid" : "";
  const deathRow = (k.hp === 0 || c.death.s || c.death.f) ? `<div class="dnd-death ${k.hp === 0 ? "now" : ""}">
      <span class="label">Death saves</span>
      <span class="row" style="gap:4px" aria-label="Successes">${[0, 1, 2].map(i => dndPip(i < c.death.s, "dnd-death", `data-k="s" data-i="${i}"`, `Success ${i + 1}`)).join("")}</span><span class="faint dnd-small">successes</span>
      <span class="row dnd-fails" style="gap:4px" aria-label="Failures">${[0, 1, 2].map(i => dndPip(i < c.death.f, "dnd-death", `data-k="f" data-i="${i}"`, `Failure ${i + 1}`)).join("")}</span><span class="faint dnd-small">failures</span>
      <button class="btn sm ${k.hp === 0 ? "primary" : ""}" data-act="dnd-deathroll" ${k.dead || !dndCanEdit(c) ? "disabled" : ""}>Roll death save</button>
    </div>` : "";
  return `<section class="panel dnd-hp ${tone}">
    <div class="panel-h"><h3>Hit points</h3>${k.dead ? `<span class="chip red">Dead</span>` : k.hp === 0 ? `<span class="chip red">Dying</span>` : ""}</div>
    <div class="panel-b" style="display:grid;gap:12px">
      <div class="dnd-hprow">
        <div class="dnd-hpnow">${dndNum(c, "hp", k.hp, `min="0" max="${k.hpMax}" aria-label="Current hit points"`)}<span class="dnd-of">/ ${k.hpMax}</span></div>
        <div class="field dnd-temp"><label class="label">Temporary</label>${dndNum(c, "hpTemp", c.hpTemp || "", `min="0" placeholder="0" aria-label="Temporary hit points"`)}</div>
      </div>
      <div class="meter dnd-hpbar"><i style="width:${clamp(frac, 0, 1) * 100}%"></i></div>
      <div class="row dnd-dmg">
        <input type="number" inputmode="numeric" min="0" id="dnd-amt-${esc(c.id)}" data-ui="dndAmt" value="${esc(ui.dndAmt)}" placeholder="Amount" aria-label="Amount of damage or healing" ${dndDis(c)}>
        <button class="btn sm danger" data-act="dnd-dmg" ${dndDis(c)}>Damage</button>
        <button class="btn sm" data-act="dnd-heal" ${dndDis(c)}>Heal</button>
      </div>
      <div class="row dnd-hd">
        <span><span class="label">Hit dice</span> <b>${c.level - c.hdSpent}</b><span class="faint"> / ${c.level} d${k.hd}</span></span>
        <button class="btn sm" data-act="dnd-spendhd" ${c.hdSpent >= c.level || !dndCanEdit(c) ? "disabled" : ""} title="Roll a hit die and add your Constitution modifier">Spend a hit die</button>
      </div>
      ${deathRow}
    </div>
  </section>`;
}

function dndConditionsPanel(c, k) {
  return `<section class="panel"><div class="panel-h"><h3>Conditions</h3>
      <span class="row dnd-small" style="gap:6px"><span class="label">Exhaustion</span>
        <button class="icon-btn" data-act="dnd-exh" data-d="-1" aria-label="Less exhaustion" ${c.exhaustion ? "" : "disabled"} ${dndDis(c)}>−</button>
        <b class="dnd-exh ${c.exhaustion ? "on" : ""}">${c.exhaustion}</b>
        <button class="icon-btn" data-act="dnd-exh" data-d="1" aria-label="More exhaustion" ${c.exhaustion >= 6 ? "disabled" : ""} ${dndDis(c)}>+</button></span></div>
    <div class="panel-b" style="display:grid;gap:10px">
      <div class="dnd-conds">${DND_CONDITIONS.map(x => `<button class="chip ${c.conditions.includes(x) ? "red" : "ink"} dnd-cond" data-act="dnd-cond" data-x="${x}" aria-pressed="${c.conditions.includes(x)}" ${dndDis(c)}>${x}</button>`).join("")}</div>
      ${c.exhaustion ? `<p class="dnd-small muted" style="margin:0">Exhaustion ${c.exhaustion}: −${c.exhaustion * 2} to every d20 roll (already counted), −${c.exhaustion * 5} ft speed.${c.exhaustion >= 6 ? " <b>At 6, the character dies.</b>" : ""}</p>` : ""}
      <div class="field"><label class="label">Concentrating on</label>${dndText(c, "conc", c.conc, `placeholder="Nothing" aria-label="Spell you're concentrating on"`)}</div>
    </div></section>`;
}

function dndAttacksPanel(c, k) {
  const rows = c.attacks.map((a, i) => {
    const n = dndAttackNums(c, k, a);
    const dmg = [a.dmg || "—", n.dmgMod ? sgn(n.dmgMod) : ""].join(" ").trim();
    const editing = ui.dndEdit === a.id;
    return `<div class="dnd-atk ${editing ? "editing" : ""}">
      <div class="dnd-atk-main">
        <div class="dnd-atk-name"><b>${esc(a.name || "Unnamed attack")}</b>${a.notes ? `<span class="faint">${esc(a.notes)}</span>` : ""}</div>
        <button class="btn sm dnd-hit" data-act="dnd-attack" data-i="${i}" title="Roll to hit">${sgn(n.hit)} to hit</button>
        <button class="btn sm" data-act="dnd-dmgroll" data-i="${i}" ${a.dmg ? "" : "disabled"} title="Roll damage">${esc(dmg)}${a.type ? " " + esc(a.type) : ""}</button>
        <button class="btn sm ghost" data-act="dnd-crit" data-i="${i}" ${a.dmg ? "" : "disabled"} title="Roll critical damage (dice doubled)">Crit</button>
        ${dndCanEdit(c) ? `<button class="btn sm ghost" data-act="dnd-edit" data-id="${esc(a.id)}">${editing ? "Done" : "Edit"}</button>` : ""}
      </div>
      ${editing ? `<div class="dnd-atk-edit">
        <div class="field"><label class="label">Name</label>${dndText(c, `attacks.${i}.name`, a.name, `placeholder="Longsword"`)}</div>
        <div class="field"><label class="label">Uses</label><select data-dnd="attacks.${i}.ab">${[["str", "Strength"], ["dex", "Dexterity"], ["fin", "Finesse (best of STR/DEX)"], ["spell", "Spellcasting ability"], ["none", "Nothing"]].map(([v, l]) => `<option value="${v}" ${a.ab === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <label class="row dnd-small" style="gap:6px;align-self:end;padding-bottom:9px"><input type="checkbox" data-dnd="attacks.${i}.prof" ${a.prof ? "checked" : ""}>Proficient</label>
        <div class="field"><label class="label">Damage dice</label>${dndText(c, `attacks.${i}.dmg`, a.dmg, `placeholder="1d8"`)}</div>
        <div class="field"><label class="label">Damage type</label>${dndText(c, `attacks.${i}.type`, a.type, `placeholder="slashing" list="dnd-dmgtypes"`)}</div>
        <div class="field"><label class="label">Extra to hit</label>${dndNum(c, `attacks.${i}.bonus`, a.bonus || "", `placeholder="0"`)}</div>
        <div class="field"><label class="label">Extra damage</label>${dndNum(c, `attacks.${i}.dmgBonus`, a.dmgBonus || "", `placeholder="0"`)}</div>
        <div class="field dnd-wide"><label class="label">Notes (range, properties, mastery)</label>${dndText(c, `attacks.${i}.notes`, a.notes, `placeholder="Versatile (1d10) · Mastery: Sap"`)}</div>
        <button class="btn sm danger" data-act="dnd-del" data-l="attacks" data-i="${i}" style="align-self:end">Remove</button>
      </div>` : ""}
    </div>`; }).join("");
  return `<section class="panel dnd-attacks"><div class="panel-h"><h3>Weapons & attacks</h3>
      ${dndCanEdit(c) ? `<button class="btn sm" data-act="dnd-addatk">+ Add attack</button>` : ""}</div>
    <div class="panel-b">${rows || `<p class="faint" style="margin:0">No attacks yet. Add your weapons and attack cantrips here; the sheet works out the numbers.</p>`}</div>
    <datalist id="dnd-dmgtypes">${["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"].map(t => `<option value="${t}">`).join("")}</datalist>
  </section>`;
}

/* ----- Spells tab ----- */
function dndSpellsTab(c, k) {
  const slotRows = [];
  for (let l = 1; l <= 9; l++) { const max = k.slots[l] || 0; if (!max) continue; const used = Math.min(c.slotsUsed[l], max);
    slotRows.push(`<div class="dnd-slot"><span class="label">${dndOrdinal(l)}</span><span class="row" style="gap:5px">${Array.from({ length: max }, (_, i) => dndPip(i < max - used, "dnd-slot", `data-l="${l}" data-i="${i}"`, `${dndOrdinal(l)}-level slot ${i + 1}`)).join("")}</span><span class="faint dnd-small">${max - used} of ${max}</span></div>`); }
  if (k.pact[0]) { const used = Math.min(c.pactUsed, k.pact[0]);
    slotRows.push(`<div class="dnd-slot"><span class="label">Pact (${dndOrdinal(k.pact[1])})</span><span class="row" style="gap:5px">${Array.from({ length: k.pact[0] }, (_, i) => dndPip(i < k.pact[0] - used, "dnd-slot", `data-l="pact" data-i="${i}"`, `Pact slot ${i + 1}`)).join("")}</span><span class="faint dnd-small">${k.pact[0] - used} of ${k.pact[0]} · back on a short rest</span></div>`); }
  const groups = DND_SPELL_LEVELS.map((title, l) => {
    const list = c.spells.map((s, i) => [s, i]).filter(([s]) => s.lvl === l); if (!list.length) return "";
    return `<div class="dnd-spgroup"><h3 class="dnd-sph">${title}</h3>${list.map(([s, i]) => `<div class="dnd-spell">
        ${l ? `<label class="dnd-prep" title="Prepared"><input type="checkbox" data-dnd="spells.${i}.prep" ${s.prep ? "checked" : ""} ${dndDis(c)} aria-label="Prepared"></label>` : `<span class="dnd-prep"></span>`}
        ${dndText(c, `spells.${i}.name`, s.name, `placeholder="Spell name" aria-label="Spell name" class="dnd-spname"`)}
        ${dndText(c, `spells.${i}.notes`, s.notes, `placeholder="Casting time · range · effect" aria-label="Notes"`)}
        ${l ? `<button class="btn sm" data-act="dnd-cast" data-i="${i}" ${dndDis(c)} title="Spend a spell slot">Cast</button>` : `<span></span>`}
        ${dndCanEdit(c) ? `<button class="icon-btn" data-act="dnd-del" data-l="spells" data-i="${i}" aria-label="Remove ${esc(s.name || "spell")}">×</button>` : ""}
      </div>`).join("")}</div>`; }).join("");
  return `<div class="dnd-spelltop">
      <div class="dnd-tiles">
        ${dndTile("Spellcasting", `<select data-dnd="spellAb" aria-label="Spellcasting ability" ${dndDis(c)}><option value="">${k.spellAb ? DND_AB_NAME[k.spellAb] + " (class)" : "None"}</option>${DND_ABILITIES.map(([a, n]) => `<option value="${a}" ${c.spellAb === a ? "selected" : ""}>${n}</option>`).join("")}</select>`)}
        ${dndTile("Spell save DC", `<b class="dnd-big">${k.spellAb ? k.spellDc : "—"}</b>`)}
        ${dndTile("Spell attack", k.spellAb ? `<button class="dnd-big dnd-roll" data-act="dnd-spellatk">${sgn(k.spellAtk)}</button>` : `<b class="dnd-big">—</b>`)}
        ${dndTile("Caster type", `<select data-dnd="caster" aria-label="Caster type" ${dndDis(c)}>${Object.entries(DND_CASTERS).map(([v, l]) => `<option value="${v}" ${c.caster === v ? "selected" : ""}>${v === "auto" ? `From class (${k.cl ? DND_CASTERS[k.cl.caster].split(" (")[0] : "none"})` : l}</option>`).join("")}</select>`)}
      </div>
    </div>
    <div class="dnd-spellgrid">
      <section class="panel"><div class="panel-h"><h3>Spell slots</h3>${slotRows.length ? `<button class="btn sm ghost" data-act="dnd-slotsreset" ${dndDis(c)}>Restore all</button>` : ""}</div>
        <div class="panel-b" style="display:grid;gap:10px">${slotRows.join("") || `<p class="faint" style="margin:0">No spell slots at this level. Pick your class on the Details tab, or set a caster type above.</p>`}
        <p class="faint dnd-small" style="margin:0">Lit dots are slots you still have. Click one to spend or restore it, or use Cast on a spell.</p></div></section>
      <section class="panel"><div class="panel-h"><h3>Spells</h3><span class="faint dnd-small">${c.spells.filter(s => s.lvl && s.prep).length} prepared</span></div>
        <div class="panel-b">${groups || `<p class="faint" style="margin:0 0 12px">No spells yet.</p>`}
          ${dndCanEdit(c) ? `<div class="row dnd-addspell">
            <select id="dnd-newlvl" aria-label="Spell level">${DND_SPELL_LEVELS.map((t, l) => `<option value="${l}">${l ? dndOrdinal(l) : "Cantrip"}</option>`).join("")}</select>
            <input id="dnd-newspell" placeholder="Add a spell, e.g. Magic Missile" aria-label="New spell name">
            <button class="btn sm primary" data-act="dnd-addspell">Add</button></div>` : ""}
        </div></section>
    </div>`;
}

/* ----- Inventory tab ----- */
function dndInvTab(c, k) {
  const coins = [["cp", "Copper"], ["sp", "Silver"], ["ep", "Electrum"], ["gp", "Gold"], ["pp", "Platinum"]];
  const rows = c.inv.map((it, i) => `<tr>
      <td>${dndText(c, `inv.${i}.name`, it.name, `placeholder="Item" aria-label="Item name"`)}</td>
      <td class="dnd-n">${dndNum(c, `inv.${i}.qty`, it.qty, `min="0" aria-label="Quantity"`)}</td>
      <td class="dnd-n"><input type="number" step="0.1" min="0" data-dnd="inv.${i}.wt" value="${it.wt || ""}" placeholder="0" aria-label="Weight each" ${dndDis(c)}></td>
      <td>${dndText(c, `inv.${i}.notes`, it.notes, `placeholder="Notes" aria-label="Notes"`)}</td>
      <td>${dndCanEdit(c) ? `<button class="icon-btn" data-act="dnd-del" data-l="inv" data-i="${i}" aria-label="Remove ${esc(it.name || "item")}">×</button>` : ""}</td></tr>`).join("");
  const over = k.weight > k.carry;
  return `<section class="panel" style="margin-bottom:16px"><div class="panel-h"><h3>Coins</h3><span class="faint dnd-small">${(c.coins.cp / 100 + c.coins.sp / 10 + c.coins.ep / 2 + c.coins.gp + c.coins.pp * 10).toFixed(2).replace(/\.00$/, "")} gp in all</span></div>
      <div class="panel-b dnd-coins">${coins.map(([kk, l]) => `<div class="field"><label class="label">${l} (${kk.toUpperCase()})</label>${dndNum(c, `coins.${kk}`, c.coins[kk] || "", `min="0" placeholder="0"`)}</div>`).join("")}</div></section>
    <section class="panel"><div class="panel-h"><h3>Equipment</h3>
        <span class="row dnd-small" style="gap:10px"><span class="${over ? "chip red" : "faint"}">${k.weight} / ${k.carry} lb carried</span>${dndCanEdit(c) ? `<button class="btn sm" data-act="dnd-additem">+ Add item</button>` : ""}</span></div>
      <div class="tbl-wrap"><table class="dnd-inv"><thead><tr><th>Item</th><th>Qty</th><th>Weight (lb)</th><th>Notes</th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5" class="faint">Nothing carried yet.</td></tr>`}</tbody></table></div>
      ${over ? `<p class="dnd-small" style="margin:0;padding:0 16px 14px;color:var(--bad)">Over your carrying capacity (Strength × 15). Your speed drops to 5 ft.</p>` : ""}
    </section>`;
}

/* ----- Details tab ----- */
function dndDetailsTab(c, k) {
  const next = c.level < 20 ? DND_XP[c.level] : null;
  const swatches = ["", "#8a2d1c", "#b08a2e", "#4f6b2f", "#2f6b6b", "#2f4a7a", "#4a2f6b", "#7a3a6e", "#5b4636", "#3a3f4a"];
  const area = (path, label, hint, rows = 5) => `<div class="field"><label class="label">${label}</label><textarea data-dnd="${path}" rows="${rows}" placeholder="${esc(hint)}" ${dndDis(c)}>${esc(c[path])}</textarea></div>`;
  return `<div class="dnd-details">
    <section class="panel"><div class="panel-h"><h3>Character</h3></div><div class="panel-b dnd-form">
      <div class="field dnd-wide"><label class="label">Name</label>${dndText(c, "name", c.name, `placeholder="Character name"`)}</div>
      <div class="field"><label class="label">Class</label><select data-dnd="cls" ${dndDis(c)}><option value="">Choose a class…</option>${Object.keys(DND_CLASSES).map(n => `<option ${c.cls === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field"><label class="label">Subclass</label>${dndText(c, "subclass", c.subclass, `placeholder="From level 3"`)}</div>
      <div class="field"><label class="label">Level</label>${dndNum(c, "level", c.level, `min="1" max="20"`)}</div>
      <div class="field"><label class="label">Experience points</label>${dndNum(c, "xp", c.xp || "", `min="0" placeholder="0"`)}
        <span class="faint dnd-small">${next == null ? "Highest level." : c.xp >= next ? `<b style="color:var(--ok)">Enough for level ${c.level + 1}!</b>` : `Level ${c.level + 1} at ${next.toLocaleString()} XP.`}</span></div>
      <div class="field"><label class="label">Species</label>${dndText(c, "species", c.species, `list="dnd-species" placeholder="Human"`)}</div>
      <div class="field"><label class="label">Background</label>${dndText(c, "background", c.background, `list="dnd-bgs" placeholder="Sage"`)}</div>
      <div class="field"><label class="label">Alignment</label><select data-dnd="alignment" ${dndDis(c)}><option value="">—</option>${DND_ALIGNMENTS.map(a => `<option ${c.alignment === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
      <div class="field"><label class="label">Player</label>${dndText(c, "player", c.player, `placeholder="Your name"`)}</div>
      <datalist id="dnd-species">${Object.keys(DND_SPECIES).map(s => `<option value="${s}">`).join("")}</datalist>
      <datalist id="dnd-bgs">${DND_BACKGROUNDS.map(s => `<option value="${s}">`).join("")}</datalist>
    </div></section>
    <section class="panel"><div class="panel-h"><h3>Numbers the sheet can't work out</h3></div><div class="panel-b dnd-form">
      <div class="field"><label class="label">Hit point maximum</label>${dndNum(c, "hpMax", c.hpMax || "", `min="0" placeholder="${k.hpSuggest} (average)"`)}
        <span class="faint dnd-small">Leave empty to use the average for your class, level and Constitution (${k.hpSuggest}). Fill it in if you rolled.</span></div>
      <div class="field"><label class="label">Base speed (ft)</label>${dndNum(c, "speed", c.speed || "", `min="0" placeholder="${DND_SPECIES[c.species] || 30}"`)}
        <span class="faint dnd-small">Empty uses your species' speed.</span></div>
      <div class="field"><label class="label">Initiative bonus</label>${dndNum(c, "initBonus", c.initBonus || "", `placeholder="0"`)}
        <span class="faint dnd-small">Anything else that adds to initiative.</span></div>
      <div class="field"><label class="label">Extra hit points per level</label>${dndNum(c, "hpPerLvl", c.hpPerLvl || "", `min="0" max="5" placeholder="0"`)}
        <span class="faint dnd-small">Dwarven Toughness gives 1, the Tough feat 2.</span></div>
      <label class="row dnd-small" style="gap:8px;align-self:center"><input type="checkbox" data-dnd="alert" ${c.alert ? "checked" : ""} ${dndDis(c)}>Alert feat: add your proficiency bonus to initiative</label>
      <div class="field"><label class="label">Token & card colour</label><div class="swatches">${swatches.map(s => `<button class="swatch ${c.color === s ? "on" : ""}" data-act="dnd-color" data-v="${s}" style="background:${s || (k.cl ? k.cl.color : "#556070")}" aria-label="${s ? "Colour " + s : "Class colour"}" ${dndDis(c)}></button>`).join("")}</div></div>
      <p class="faint dnd-small dnd-wide" style="margin:0">Ability scores go on the Sheet tab as the final numbers, with your background's increases already added.</p>
    </div></section>
    <section class="panel dnd-span"><div class="panel-h"><h3>Proficiencies, features & story</h3></div><div class="panel-b dnd-form dnd-areas">
      ${area("profs", "Proficiencies & languages", "Armor: light, medium\nWeapons: simple, martial\nTools: smith's tools\nLanguages: Common, Dwarvish")}
      ${area("features", "Features & traits", "Class features, species traits, feats, weapon masteries…")}
      ${area("appearance", "Appearance & personality", "What people notice, how they act")}
      ${area("notes", "Backstory & notes", "Where they come from, allies, quest notes")}
    </div></section>
  </div>`;
}

/* ---------- what the buttons do ---------- */
function dndAct(fn, needEdit = true) {
  return (el, ev) => { const c = dndFind(el); if (!c) return; if (needEdit && !dndCanEdit(c)) return; const r = fn(c, el, ev); if (r !== false && needEdit) dndCommit(c, true); else requestRender(); };
}
Object.assign(A, {
  "dnd-tab": el => { ui.dndTab = el.dataset.t; ui.dndEdit = null; render(); },
  "dnd-adv": el => { ui.dndAdv = el.dataset.m; render(); },
  "dnd-insp": dndAct(c => { c.insp = !c.insp; }),
  "dnd-check": dndAct((c, el, ev) => { const a = el.dataset.a; dndD20(c, `${DND_AB_NAME[a]} check`, dndCalc(c).mod[a] + (c.jack ? Math.floor(dndCalc(c).pb / 2) : 0), ev); return false; }, false),
  "dnd-save": dndAct((c, el, ev) => { const a = el.dataset.a; dndD20(c, `${DND_AB_NAME[a]} save`, dndCalc(c).save[a], ev); return false; }, false),
  "dnd-skill": dndAct((c, el, ev) => { const s = DND_SKILLS.find(x => x[0] === el.dataset.s); dndD20(c, s[1], dndCalc(c).skill[s[0]], ev); return false; }, false),
  "dnd-init": dndAct((c, el, ev) => { dndD20(c, "Initiative", dndCalc(c).init, ev); return false; }, false),
  "dnd-spellatk": dndAct((c, el, ev) => { dndD20(c, "Spell attack", dndCalc(c).spellAtk, ev); return false; }, false),
  "dnd-saveprof": dndAct((c, el) => { c.saveProf[el.dataset.a] = !c.saveProf[el.dataset.a]; }),
  "dnd-skillprof": dndAct((c, el) => { const s = el.dataset.s; const v = ((c.skills[s] || 0) + 1) % 3; if (v) c.skills[s] = v; else delete c.skills[s]; }),
  "dnd-attack": dndAct((c, el, ev) => {
    const a = c.attacks[Number(el.dataset.i)]; if (!a) return false; const k = dndCalc(c); const n = dndAttackNums(c, k, a);
    const r = dndD20(c, `${a.name || "Attack"}: to hit`, n.hit, ev);
    if (r.nat === 20) showNotice(`Critical hit! Use Crit to roll ${a.name || "the"} damage with the dice doubled.`);
    return false; }, false),
  "dnd-dmgroll": dndAct((c, el) => dndRollDamage(c, Number(el.dataset.i), false), false),
  "dnd-crit": dndAct((c, el) => dndRollDamage(c, Number(el.dataset.i), true), false),
  "dnd-edit": el => { ui.dndEdit = ui.dndEdit === el.dataset.id ? null : el.dataset.id; render(); },
  "dnd-addatk": dndAct(c => { const a = { id: uid(), name: "", ab: "str", prof: true, dmg: "", type: "", bonus: 0, dmgBonus: 0, notes: "" }; c.attacks.push(a); ui.dndEdit = a.id;
    setTimeout(() => document.querySelector(`[data-dnd="attacks.${c.attacks.length - 1}.name"]`)?.focus(), 60); }),
  "dnd-del": dndAct((c, el) => { const l = el.dataset.l; const i = Number(el.dataset.i); if (!Array.isArray(c[l]) || !c[l][i]) return false; c[l].splice(i, 1); ui.dndEdit = null; }),
  "dnd-additem": dndAct(c => { c.inv.push({ id: uid(), name: "", qty: 1, wt: 0, notes: "" }); setTimeout(() => document.querySelector(`[data-dnd="inv.${c.inv.length - 1}.name"]`)?.focus(), 60); }),
  "dnd-addspell": dndAct(c => {
    const n = document.getElementById("dnd-newspell"); const l = document.getElementById("dnd-newlvl"); const name = (n && n.value || "").trim(); if (!name) { n && n.focus(); return false; }
    c.spells.push({ id: uid(), lvl: clamp(Number(l.value) || 0, 0, 9), name, prep: true, notes: "" }); n.value = ""; setTimeout(() => document.getElementById("dnd-newspell")?.focus(), 60); }),
  "dnd-slot": dndAct((c, el) => {
    const k = dndCalc(c); const i = Number(el.dataset.i);
    if (el.dataset.l === "pact") { const max = k.pact[0]; c.pactUsed = i < max - c.pactUsed ? c.pactUsed + 1 : Math.max(0, c.pactUsed - 1); return; }
    const l = Number(el.dataset.l); const max = k.slots[l] || 0; const used = Math.min(c.slotsUsed[l], max);
    c.slotsUsed[l] = i < max - used ? used + 1 : Math.max(0, used - 1); }),
  "dnd-slotsreset": dndAct(c => { c.slotsUsed = c.slotsUsed.map(() => 0); c.pactUsed = 0; }),
  "dnd-cond": dndAct((c, el) => { const x = el.dataset.x; c.conditions = c.conditions.includes(x) ? c.conditions.filter(y => y !== x) : [...c.conditions, x]; }),
  "dnd-exh": dndAct((c, el) => { c.exhaustion = clamp(c.exhaustion + Number(el.dataset.d), 0, 6); if (c.exhaustion >= 6) showNotice(`${dndName(c)} reaches exhaustion level 6 and dies.`); }),
  "dnd-color": dndAct((c, el) => { c.color = el.dataset.v || ""; }),
  "dnd-dmg": dndAct(c => { const n = Math.max(0, Math.floor(Number(ui.dndAmt) || 0)); if (!n) return false; dndDamage(c, n); ui.dndAmt = ""; }),
  "dnd-heal": dndAct(c => { const n = Math.max(0, Math.floor(Number(ui.dndAmt) || 0)); if (!n) return false; dndHeal(c, n); ui.dndAmt = ""; showNotice(`${dndName(c)} regains ${n} hit points.`); }),
  "dnd-spendhd": dndAct(c => {
    const k = dndCalc(c); if (c.hdSpent >= c.level) return false; const r = d(k.hd); const n = Math.max(1, r + k.mod.con);
    c.hdSpent++; dndHeal(c, n); Dice.raw("Hit die", `d${k.hd} (${r}) ${sgn(k.mod.con)}`, n, dndName(c), [{ t: `+${n} HP`, c: "green" }]); }),
  "dnd-death": dndAct((c, el) => { const key = el.dataset.k; const i = Number(el.dataset.i); c.death[key] = c.death[key] > i ? i : i + 1; }),
  "dnd-deathroll": dndAct((c, el, ev) => {
    const r = dndD20(c, "Death save", 0, ev); const tags = [];
    if (r.nat === 20) { c.hp = 1; c.death = { s: 0, f: 0 }; c.conditions = c.conditions.filter(x => x !== "Unconscious"); showNotice(`Natural 20! ${dndName(c)} is back up with 1 hit point.`); return; }
    if (r.nat === 1) c.death.f = Math.min(3, c.death.f + 2); else if (r.total >= 10) c.death.s = Math.min(3, c.death.s + 1); else c.death.f = Math.min(3, c.death.f + 1);
    if (c.death.f >= 3) showNotice(`${dndName(c)} has failed three death saves and dies.`);
    else if (c.death.s >= 3) { c.death = { s: 0, f: 0 }; showNotice(`${dndName(c)} is stable: still at 0 HP and unconscious, but no longer dying.`); } }),
  "dnd-short": dndAct(c => { c.pactUsed = 0; showNotice(`Short rest: spend hit dice to heal.${dndCalc(c).pact[0] ? " Pact slots are back." : ""}`); }),
  "dnd-long": dndAct(c => {
    c.hp = null; c.hpTemp = 0; c.hdSpent = 0; c.slotsUsed = c.slotsUsed.map(() => 0); c.pactUsed = 0; c.death = { s: 0, f: 0 };
    c.exhaustion = Math.max(0, c.exhaustion - 1); c.conditions = c.conditions.filter(x => x !== "Unconscious");
    showNotice(`Long rest: ${dndName(c)} is back to full hit points, with every hit die and spell slot restored${c.exhaustion ? " and one level of exhaustion gone" : ""}.`); }),
});
A["dnd-cast"] = dndAct((c, el) => dndCast(c, c.spells[Number(el.dataset.i)]));

function dndRollDamage(c, i, crit) {
  const a = c.attacks[i]; if (!a) return false; const k = dndCalc(c); const n = dndAttackNums(c, k, a);
  const r = dndRollExpr(a.dmg, n.dmgMod, crit); if (!r) { showNotice(`"${a.dmg}" isn't a dice expression. Try 1d8 or 2d6+1d4.`); return false; }
  Dice.raw(`${a.name || "Attack"}: ${crit ? "critical damage" : "damage"}`, r.text, r.total, dndName(c), [a.type ? { t: a.type, c: "ink" } : null, crit ? { t: "Critical", c: "amber" } : null].filter(Boolean));
  return false;
}
function dndCast(c, s) {
  if (!s) return false; const k = dndCalc(c);
  const hasPact = k.pact[0] && c.pactUsed < k.pact[0] && k.pact[1] >= s.lvl;
  if (hasPact) { c.pactUsed++; showNotice(`${s.name || "Spell"} cast with a pact slot (${dndOrdinal(k.pact[1])} level).`); return; }
  for (let l = s.lvl; l <= 9; l++) { const max = k.slots[l] || 0; if (c.slotsUsed[l] < max) { c.slotsUsed[l]++;
    showNotice(`${s.name || "Spell"} cast with a ${dndOrdinal(l)}-level slot${l > s.lvl ? " (upcast)" : ""}. ${max - c.slotsUsed[l]} left at that level.`); return; } }
  showNotice(`No spell slots of ${dndOrdinal(s.lvl)} level or higher left. A long rest restores them.`); return false;
}

/* ---------- typing into the sheet ---------- */
function dndInput(ev) {
  const el = ev.target; if (!el.dataset || el.dataset.dnd == null) return;
  const c = dndFind(el); if (!c || !dndCanEdit(c)) return;
  const path = el.dataset.dnd; let v;
  if (el.type === "checkbox") v = el.checked;
  else if (el.type === "number") {
    if (el.value === "") { if (path === "hp") return; v = el.min !== "" ? Math.max(0, Number(el.min)) : 0; }
    else { v = Number(el.value); if (!Number.isFinite(v)) return; if (el.min !== "") v = Math.max(Number(el.min), v); if (el.max !== "") v = Math.min(Number(el.max), v); if (el.step !== "0.1") v = Math.round(v); }
  } else if (el.dataset.num !== undefined) v = el.value === "" ? null : Number(el.value);
  else v = el.value;
  setPath(c, path, v);
  if (path === "hp") { const k = dndCalc(c); if (v >= k.hpMax) c.hp = null; else if (v > 0 && c.conditions.includes("Unconscious")) { c.conditions = c.conditions.filter(x => x !== "Unconscious"); c.death = { s: 0, f: 0 }; } }
  if (path === "cls" && DND_CLASSES[v]) { DND_ABILITIES.forEach(([a]) => { c.saveProf[a] = DND_CLASSES[v].saves.includes(a); });
    showNotice(`${v}: saving throw proficiencies set to ${DND_CLASSES[v].saves.map(a => DND_AB_NAME[a]).join(" and ")}.`); }
  if (path === "level") c.hdSpent = Math.min(c.hdSpent, c.level);
  dndCommit(c, el.type === "checkbox" || el.tagName === "SELECT");
}
document.addEventListener("input", ev => { if (ev.target.type !== "checkbox") dndInput(ev); });
document.addEventListener("change", ev => { if (ev.target.type === "checkbox") dndInput(ev); });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.id === "dnd-newspell") { ev.preventDefault(); document.querySelector('[data-act="dnd-addspell"]')?.click(); }
  if (ev.key === "Enter" && ev.target.id && ev.target.id.startsWith("dnd-amt-")) { ev.preventDefault(); ev.target.closest(".dnd-dmg")?.querySelector('[data-act="dnd-dmg"]')?.click(); } });

/* ---------- the panel beside the map at a table (player) ---------- */
function dndTablePanel(c) {
  const k = dndCalc(c);
  return `<div class="dnd dnd-mini" data-cid="${esc(c.id)}" style="display:grid;gap:10px">
    <div class="row" style="justify-content:space-between"><b>${esc(dndName(c))}</b><span class="faint dnd-small">AC ${c.ac} · ${k.speed} ft · PP ${k.passive.perception}</span></div>
    <div class="row"><b class="dnd-minihp">${k.hp}<span class="faint"> / ${k.hpMax}</span></b>${c.hpTemp ? `<span class="chip blue">+${c.hpTemp} temp</span>` : ""}${k.hp === 0 ? `<span class="chip red">${k.dead ? "Dead" : "Dying"}</span>` : ""}
      ${c.conditions.map(x => `<span class="chip red">${x}</span>`).join("")}${c.exhaustion ? `<span class="chip amber">Exhaustion ${c.exhaustion}</span>` : ""}</div>
    <div class="row dnd-dmg">
      <input type="number" inputmode="numeric" min="0" id="dnd-amt-${esc(c.id)}" data-ui="dndAmt" value="${esc(ui.dndAmt)}" placeholder="Amount" aria-label="Amount of damage or healing">
      <button class="btn sm danger" data-act="dnd-dmg">Damage</button><button class="btn sm" data-act="dnd-heal">Heal</button></div>
    <div class="row" style="gap:6px">
      <button class="btn sm" data-act="dnd-init">Initiative ${sgn(k.init)}</button>
      <button class="btn sm" data-act="dnd-skill" data-s="perception">Perception ${sgn(k.skill.perception)}</button>
      ${k.hp === 0 && !k.dead ? `<button class="btn sm primary" data-act="dnd-deathroll">Death save</button>` : ""}
    </div>
    ${c.attacks.length ? `<div style="display:grid;gap:4px">${c.attacks.map((a, i) => { const n = dndAttackNums(c, k, a); return `<div class="row" style="gap:6px;flex-wrap:nowrap"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name || "Attack")}</span><button class="btn sm" data-act="dnd-attack" data-i="${i}">${sgn(n.hit)}</button><button class="btn sm ghost" data-act="dnd-dmgroll" data-i="${i}" ${a.dmg ? "" : "disabled"}>${esc(a.dmg || "—")}${n.dmgMod ? sgn(n.dmgMod) : ""}</button></div>`; }).join("")}</div>` : ""}
    <span class="faint dnd-small">Shift+click a roll for advantage, Ctrl+click for disadvantage.</span>
  </div>`;
}
