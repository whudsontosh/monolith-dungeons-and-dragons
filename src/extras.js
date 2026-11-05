/* ============================== D&D 2024: GEAR, DEFENSES, STORY AND CLASSES ON THE SHEET ==============================
   Equipping and attuning items (and what magic items do while you use them), item charges,
   defenses and senses, the Proficiencies & training panel, characteristics and backstory,
   a portrait, and the multiclass rows on the Details tab. The numbers are worked out in rules.js. */

const DND_SPEED_NAME = { fly: "Fly", swim: "Swim", climb: "Climb", burrow: "Burrow" };
const DND_SENSE_NAME = { dv: "Darkvision", bs: "Blindsight", ts: "Tremorsense", tr: "Truesight" };
function dndSpeedsText(k) { return Object.entries(k.speeds || {}).filter(([, v]) => v).map(([n, v]) => `${DND_SPEED_NAME[n]} ${v}`).join(" · "); }

/* ---------- the Sheet tab's Defenses & senses and Proficiencies panels ---------- */
function dndDefensesPanel(c, k) {
  const d = k.defs; const senses = Object.entries(k.senses).filter(([, v]) => v);
  const rows = [["Resistant", d.res, "blue"], ["Immune", [...d.imm, ...d.cimm], "green"], ["Vulnerable", d.vuln, "red"]].filter(r => r[1].length);
  if (!rows.length && !senses.length) return "";
  return `<section class="panel"><div class="panel-h"><h3>Defenses & senses</h3></div><div class="panel-b dnd-defs">
    ${rows.map(([l, list, tone]) => `<div class="row" style="gap:6px"><span class="label">${l}</span>${list.map(x => `<span class="chip ${tone}">${esc(x)}</span>`).join("")}</div>`).join("")}
    ${senses.length ? `<div class="row" style="gap:6px"><span class="label">Senses</span>${senses.map(([s, v]) => `<span class="chip ink">${DND_SENSE_NAME[s]} ${v} ft</span>`).join("")}</div>` : ""}
  </div></section>`;
}
/* "Armor: Light, Medium" lines from the proficiencies box */
function dndProfLines(c) {
  return String(c.profs || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^([A-Za-z' ]{3,24}):\s*(.*)$/); return m ? [m[1], m[2]] : ["", l]; });
}
function dndProfsPanel(c) {
  const lines = dndProfLines(c); if (!lines.length) return "";
  return `<section class="panel"><div class="panel-h"><h3>Proficiencies & training</h3><button class="btn sm ghost" data-act="dnd-tab" data-t="details">Edit</button></div>
    <div class="panel-b dnd-profs">${lines.map(([l, t]) => `<div>${l ? `<span class="label">${esc(l)}</span>` : ""}<span>${esc(t)}</span></div>`).join("")}</div></section>`;
}

/* ---------- items ---------- */
function dndItemFxText(info) {
  const fx = info.fx; const out = []; const ref = info.ref; const p = info.plus;
  if (p && ref && ref.arm) out.push(`+${p} AC`);
  if (p && ref && ref.wpn) out.push(`+${p} to hit and damage`);
  if (fx.ac) out.push(`${sgn(fx.ac)} AC`); if (fx.acNoArmor) out.push(`+${fx.acNoArmor} AC with no armor or shield`); if (fx.acBase) out.push(`AC ${fx.acBase} + Dex with no armor`);
  if (fx.save) out.push(`${sgn(fx.save)} saving throws`); if (fx.check) out.push(`${sgn(fx.check)} ability checks`);
  Object.entries(fx.set || {}).forEach(([a, v]) => out.push(`${DND_AB_NAME[a]} ${v}`));
  Object.entries(fx.abPlus || {}).forEach(([a, v]) => out.push(`+${v} ${DND_AB_NAME[a]} (max 20)`));
  if (fx.spAtk) out.push(`${sgn(fx.spAtk)} spell attacks`); if (fx.spDc) out.push(`${sgn(fx.spDc)} spell save DC`);
  if (fx.dv) out.push(`Darkvision ${fx.dv} ft`); if (fx.swim) out.push(`Swim ${fx.swim} ft`); if (fx.fly) out.push(`Fly ${fx.fly} ft`);
  (fx.imm || []).forEach(t => out.push(`Immune to ${t.toLowerCase()}`)); (fx.res || []).forEach(t => out.push(`Resist ${t.toLowerCase()}`));
  return out.join(" · ");
}
function dndItemBtns(c, it, i, info) {
  const wearable = !!(info.ref && (info.ref.arm || info.ref.wpn)) || !!dndItemFxText(info) || info.needsAtt || !!(info.ref && info.ref.mag);
  if (!dndCanEdit(c)) return [it.eq ? `<span class="chip green">Equipped</span>` : "", it.att ? `<span class="chip blue">Attuned</span>` : ""].join("");
  return `${wearable || it.eq ? `<button class="btn sm ${it.eq ? "primary" : "ghost"}" data-act="dnd-equip" data-i="${i}" aria-pressed="${it.eq}">${it.eq ? "Equipped" : info.ref && info.ref.arm ? "Wear" : "Equip"}</button>` : ""}
    ${info.needsAtt || it.att ? `<button class="btn sm ${it.att ? "primary" : "ghost"}" data-act="dnd-attune" data-i="${i}" aria-pressed="${it.att}">${it.att ? "Attuned" : "Attune"}</button>` : ""}`;
}
function dndItemDetail(c, it, i, info) {
  const ref = info.ref; const dis = dndDis(c); const fx = it.fx || {};
  const num = (path, v, ph, extra = "") => `<input type="number" data-dnd="${path}" value="${v || ""}" placeholder="${ph}" ${extra} ${dis}>`;
  return `<div class="dnd-itdetail">
    ${ref ? `<span class="faint dnd-small">${esc([ref.cat, ref.rar, ref.att ? "requires attunement" : "", ref.cost, ref.wt ? ref.wt + " lb" : ""].filter(Boolean).join(" · "))}</span><div class="dnd-ftext">${dndParas(ref.t || "")}</div>` : `<span class="faint dnd-small">Not in the free rules, so the sheet doesn't know what it does. Set its bonuses here.</span>`}
    <div class="dnd-itfx">
      ${ref && (ref.arm || ref.wpn || /\+1, \+2, or \+3/.test(ref.n)) ? `<label class="field"><span class="label">Magic bonus</span><select data-dnd="inv.${i}.plus" ${dis}>${[0, 1, 2, 3].map(n => `<option value="${n}" ${(it.plus || 0) === n ? "selected" : ""}>${n ? "+" + n : "None"}</option>`).join("")}</select></label>` : ""}
      <label class="field"><span class="label">AC</span>${num(`inv.${i}.fx.ac`, fx.ac, "0", `min="-10" max="10"`)}</label>
      <label class="field"><span class="label">Saves</span>${num(`inv.${i}.fx.save`, fx.save, "0", `min="-10" max="10"`)}</label>
      <label class="field"><span class="label">Checks</span>${num(`inv.${i}.fx.check`, fx.check, "0", `min="-10" max="10"`)}</label>
      <label class="field"><span class="label">Spell attack</span>${num(`inv.${i}.fx.spAtk`, fx.spAtk, "0", `min="-10" max="10"`)}</label>
      <label class="field"><span class="label">Spell DC</span>${num(`inv.${i}.fx.spDc`, fx.spDc, "0", `min="-10" max="10"`)}</label>
      <label class="field"><span class="label">Charges</span>${num(`inv.${i}.ch`, it.ch, "0", `min="0" max="99"`)}</label>
      ${it.ch ? `<label class="field"><span class="label">Charges come back</span><select data-dnd="inv.${i}.chRest" ${dis}>${[["dawn", "At dawn"], ["long", "Long rest"], ["short", "Short rest"], ["", "Never"]].map(([v, l]) => `<option value="${v}" ${it.chRest === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : ""}
    </div>
    <p class="faint dnd-small" style="margin:0">Bonuses here count while the item is equipped${info.needsAtt ? " and attuned" : ""}, on top of anything the sheet already knows the item does.</p>
  </div>`;
}
function dndCheckAttune() {}
/* "This ring has 3 charges" */
const dndChargesIn = t => { const m = String(t || "").match(/\bhas (\d+) charges\b/i); return m ? Math.min(99, Number(m[1])) : 0; };
Object.assign(A, {
  "dnd-equip": dndAct((c, el) => { const it = c.inv[Number(el.dataset.i)]; if (!it) return false; const info = dndItemInfo(it); it.eq = !it.eq;
    if (it.eq && info.ref && info.ref.arm) { const shield = info.ref.arm.t === "shield";
      c.inv.forEach(x => { if (x === it || !x.eq) return; const r = dndItemInfo(x).ref; if (r && r.arm && (r.arm.t === "shield") === shield) x.eq = false; });
      if (!c.acAuto) { c.acAuto = true; showNotice(`Armor Class now worked out from what you wear: ${dndCalc(c).ac}.`); } }
    else if (it.eq && !c.acAuto && (info.fx.ac || info.fx.acNoArmor || info.fx.acBase)) showNotice(`Your AC is set by hand, so this item's bonus isn't added. Click "Set by hand" under Armor Class to have the sheet work it out.`);
    if (it.eq && info.needsAtt && !it.att) showNotice(`${it.name} needs attunement before it works. Attune to it on a short rest.`); }),
  "dnd-wear": el => A["dnd-equip"](el),
  "dnd-attune": dndAct((c, el) => { const it = c.inv[Number(el.dataset.i)]; if (!it) return false;
    if (!it.att && c.inv.filter(x => x.att).length >= 3) { showNotice("You can be attuned to 3 items at most. Stop attuning to one first."); return false; }
    it.att = !it.att; if (it.att && !it.eq) it.eq = true; }),
  "dnd-charge": dndAct((c, el) => { const it = c.inv[Number(el.dataset.i)]; if (!it || !it.ch) return false; const j = Number(el.dataset.j); const left = it.ch - it.chUsed;
    it.chUsed = it.ch > 12 ? Math.min(it.ch, it.chUsed + 1) : j < left ? it.chUsed + 1 : Math.max(0, it.chUsed - 1); }),
});

/* what a rest gives back besides class resources: other limited uses and item charges */
function dndRestOther(c, kind) {
  (c.trackers || []).forEach(t => { if (t.rest === "short" || (kind === "long" && (t.rest === "long" || t.rest === "dawn"))) t.used = 0; });
  (c.inv || []).forEach(it => { if (it.ch && (it.chRest === "short" || (kind === "long" && (it.chRest === "long" || it.chRest === "dawn")))) it.chUsed = 0; });
  if (typeof dndRestSpecies === "function") dndRestSpecies(c, kind);
}

/* ---------- Details tab: other classes ---------- */
function dndMultiRows(c) {
  const dis = dndDis(c); const first = dndClassList(c)[0];
  const rows = (c.multi || []).map((m, j) => `
      <div class="field"><label class="label">Class ${j + 2}</label><select data-dnd="multi.${j}.cls" ${dis}>${Object.keys(DND_CLASSES).filter(n => n === m.cls || (n !== c.cls && !c.multi.some(x => x.cls === n))).map(n => `<option ${m.cls === n ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field"><label class="label">${esc(m.cls)} subclass</label>${dndText(c, `multi.${j}.subclass`, m.subclass, `placeholder="From level 3"`)}</div>
      <div class="field"><label class="label">${esc(m.cls)} level</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input type="number" min="1" max="${m.level + 20 - c.level}" value="${m.level}" data-act-change="dnd-mclvl" data-j="${j}" ${dis}>
        ${dndCanEdit(c) ? `<button class="icon-btn" data-act="dnd-mcdel" data-j="${j}" aria-label="Remove ${esc(m.cls)}">×</button>` : ""}</div>
        ${dndMcOk(c, m.cls) ? "" : `<span class="dnd-small" style="color:var(--bad)">Multiclassing into ${esc(m.cls)} needs ${esc(dndMcReqText(m.cls))}.</span>`}</div>`).join("");
  const can = dndCanEdit(c) && c.cls && c.level < 20 && Object.keys(DND_CLASSES).some(n => n !== c.cls && !(c.multi || []).some(x => x.cls === n));
  return `${rows}<div class="field dnd-wide"><div class="row" style="gap:8px">${can ? `<button class="btn sm" data-act="dnd-mcadd">+ Add another class</button>` : ""}
    <span class="faint dnd-small">${(c.multi || []).length ? `${esc(dndClassLine(c))}. ` : ""}To multiclass with all the choices (hit points, features, subclass), use Level up and pick the new class there.${first.cls && !dndMcOk(c, first.cls) && (c.multi || []).length ? ` Multiclassing also needs ${esc(dndMcReqText(first.cls))} for ${esc(first.cls)}.` : ""}</span></div></div>`;
}
function dndSetLevels(c) { const others = (c.multi || []).reduce((a, m) => a + m.level, 0); c.level = clamp(c.level, others + 1, 20); c.hdSpent = Math.min(c.hdSpent, c.level); }
Object.assign(A, {
  "dnd-mcadd": dndAct(c => { if (c.level >= 20) return false; const n = Object.keys(DND_CLASSES).find(x => x !== c.cls && !(c.multi || []).some(m => m.cls === x) && dndMcOk(c, x))
      || Object.keys(DND_CLASSES).find(x => x !== c.cls && !(c.multi || []).some(m => m.cls === x)); if (!n) return false;
    c.multi.push({ cls: n, subclass: "", level: 1 }); c.level++; c.lvlCls[c.level] = n; }),
  "dnd-mcdel": dndAct((c, el) => { const j = Number(el.dataset.j); const m = c.multi[j]; if (!m) return false; c.multi.splice(j, 1); c.level -= m.level; dndSetLevels(c);
    Object.keys(c.lvlCls).forEach(L => { if (c.lvlCls[L] === m.cls || Number(L) > c.level) delete c.lvlCls[L]; }); delete c.hdBy[m.cls]; }),
});
Object.assign(CHANGE, {
  "dnd-lvl1": el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; const others = c.multi.reduce((a, m) => a + m.level, 0);
    c.level = clamp((Math.round(Number(el.value)) || 1) + others, others + 1, 20); dndSetLevels(c); dndCommit(c, true); },
  "dnd-mclvl": el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; const m = c.multi[Number(el.dataset.j)]; if (!m) return;
    const first = dndClassList(c)[0].level; m.level = clamp(Math.round(Number(el.value)) || 1, 1, 20 - first); c.level = first + c.multi.reduce((a, x) => a + x.level, 0); dndSetLevels(c); dndCommit(c, true); },
});

/* ---------- Details tab: defenses, senses, speeds and bonuses ---------- */
function dndDefensesEdit(c, k) {
  const dis = dndDis(c); const d = c.defs;
  const chips = (key, list) => `<div class="dnd-chips">${list.map(t => `<button class="dnd-chip ${d[key].includes(t) ? "on" : ""}" data-act="dnd-def" data-k="${key}" data-v="${esc(t)}" ${dis}>${esc(t)}</button>`).join("")}</div>`;
  return `<section class="panel dnd-span"><div class="panel-h"><h3>Defenses, senses & bonuses</h3></div><div class="panel-b" style="display:grid;gap:14px">
    <div><span class="label">Resistances</span>${chips("res", DND_DAMAGE)}</div>
    <div><span class="label">Immunities</span>${chips("imm", DND_DAMAGE)}</div>
    <div><span class="label">Vulnerabilities</span>${chips("vuln", DND_DAMAGE)}</div>
    <div><span class="label">Condition immunities</span>${chips("cimm", [...DND_CONDITIONS, "Exhaustion"])}</div>
    <div class="dnd-form" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${Object.entries(DND_SENSE_NAME).map(([s, n]) => `<div class="field"><label class="label">${n} (ft)</label>${dndNum(c, `senses.${s}`, c.senses[s] || "", `min="0" placeholder="${s === "dv" && DND_SPECIES_DV[c.species] ? DND_SPECIES_DV[c.species] + " (species)" : "0"}"`)}</div>`).join("")}
      ${Object.entries(DND_SPEED_NAME).map(([s, n]) => `<div class="field"><label class="label">${n} speed (ft)</label>${dndNum(c, `speeds.${s}`, c.speeds[s] || "", `min="0" placeholder="0"`)}</div>`).join("")}
      <div class="field"><label class="label">Extra AC</label>${dndNum(c, "acBonus", c.acBonus || "", `placeholder="0"`)}</div>
      <div class="field"><label class="label">Extra on all saves</label>${dndNum(c, "saveBonus", c.saveBonus || "", `placeholder="0"`)}</div>
      <div class="field"><label class="label">Extra max HP</label>${dndNum(c, "hpBonus", c.hpBonus || "", `placeholder="0"`)}</div>
      <label class="row dnd-small" style="gap:8px;align-self:end;padding-bottom:9px"><input type="checkbox" data-dnd="acAuto" ${c.acAuto ? "checked" : ""} ${dis}>Work out AC from equipment</label>
    </div></div></section>`;
}
A["dnd-def"] = dndAct((c, el) => { const key = el.dataset.k, v = el.dataset.v; const l = c.defs[key]; if (!l) return false; c.defs[key] = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; });

/* ---------- Details tab: characteristics, story and portrait ---------- */
function dndStoryEdit(c, k) {
  const dis = dndDis(c);
  const area = (path, v, label, hint, rows = 3) => `<div class="field"><label class="label">${label}</label><textarea data-dnd="${path}" rows="${rows}" placeholder="${esc(hint)}" ${dis}>${esc(v)}</textarea></div>`;
  const phys = [["gender", "Gender"], ["age", "Age"], ["height", "Height"], ["weight", "Weight"], ["size", "Size"], ["eyes", "Eyes"], ["hair", "Hair"], ["skin", "Skin"], ["faith", "Faith"]];
  return `<section class="panel dnd-span"><div class="panel-h"><h3>Characteristics & story</h3></div><div class="panel-b dnd-story">
    <div class="dnd-portrait-edit">
      <div class="dnd-portrait ${c.portrait ? "" : "empty"}" style="${c.portrait ? `background-image:url('${esc(c.portrait)}')` : `background:${dndColor(c)}`}">${c.portrait ? "" : esc((dndName(c) || "?")[0])}</div>
      ${dndCanEdit(c) ? `<label class="btn sm">Upload a picture<input type="file" accept="image/png,image/jpeg,image/webp" data-act-change="dnd-portrait" hidden></label>
      <input data-dnd="portrait" value="${esc(/^data:/.test(c.portrait) ? "" : c.portrait)}" placeholder="…or paste a link to one" aria-label="Portrait link">
      ${c.portrait ? `<button class="btn sm ghost" data-act="dnd-portraitdel">Remove</button>` : ""}` : ""}
    </div>
    <div class="dnd-form" style="grid-template-columns:repeat(3,minmax(0,1fr))">${phys.map(([key, l]) => `<div class="field"><label class="label">${l}</label>${dndText(c, `phys.${key}`, c.phys[key], "")}</div>`).join("")}</div>
    <div class="dnd-form dnd-areas" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${area("traits.pers", c.traits.pers, "Personality traits", "How they act and talk")}
      ${area("traits.ideals", c.traits.ideals, "Ideals", "What they believe in")}
      ${area("traits.bonds", c.traits.bonds, "Bonds", "Who and what they care about")}
      ${area("traits.flaws", c.traits.flaws, "Flaws", "What gets them into trouble")}
      ${area("appearance", c.appearance, "Appearance", "What people notice", 4)}
      ${area("allies", c.allies, "Allies & organizations", "Friends, contacts, factions", 4)}
      ${area("backstory", c.backstory, "Backstory", "Where they come from", 6)}
      ${area("notes", c.notes, "Notes", "Quest notes, people met, loot to sell", 6)}
    </div>
  </div></section>`;
}
/* a picture is shrunk to 256 px so it stays small enough to share with the table */
CHANGE["dnd-portrait"] = el => { const c = dndFind(el); const f = el.files && el.files[0]; if (!c || !f || !dndCanEdit(c)) return;
  const img = new Image(); const url = URL.createObjectURL(f);
  img.onload = () => { const s = 256; const cv = document.createElement("canvas"); cv.width = cv.height = s; const g = cv.getContext("2d");
    const m = Math.min(img.width, img.height); g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s); URL.revokeObjectURL(url);
    c.portrait = cv.toDataURL("image/jpeg", 0.85); dndCommit(c, true); };
  img.onerror = () => { URL.revokeObjectURL(url); showNotice("That picture couldn't be read. Try a PNG or JPEG."); };
  img.src = url; };
A["dnd-portraitdel"] = dndAct(c => { c.portrait = ""; });
