/* ============================== D&D 2024: FEATURES AND LEVELLING UP ==============================
   The sheet's Features tab (what the class and subclass give at each level, the class table's
   numbers, feats and the choices features asked for) and the Level up dialog, which walks through
   one level's choices: hit points, subclass, ability score increase or feat, and picks such as
   fighting styles, invocations and expertise. The class data itself is in classdata.js. */

const dndLv = c => DND_LEVELS[c.cls] || null;
const dndSubLevel = cls => { const L = DND_LEVELS[cls]; if (!L) return 3; for (const [lvl, fs] of Object.entries(L.levels)) if (fs.some(f => f.sub)) return Number(lvl); return 3; };
/* the SRD subclass, if that's the one the character has */
function dndSubData(c) { const L = dndLv(c); return L && L.sub && c.subclass && c.subclass.trim().toLowerCase() === L.sub.n.toLowerCase() ? L.sub : null; }
/* class table values at a level, e.g. [["Rages", 3], ["Rage Damage", 2]] */
function dndTableAt(c, lvl) {
  const L = dndLv(c); if (!L) return []; const sub = dndSubData(c);
  return [...L.table, ...((sub && sub.table) || [])].map(t => [t.n, t.v[lvl - 1]]).filter(([, v]) => v !== "" && v != null);
}
/* everything gained at one level: [{f, src}] */
function dndGainsAt(c, lvl) {
  const L = dndLv(c); if (!L) return []; const sub = dndSubData(c); const out = [];
  (L.levels[lvl] || []).forEach(f => out.push({ f, src: "class" }));
  if (sub) (sub.levels[lvl] || []).forEach(f => out.push({ f, src: "sub" }));
  return out;
}
/* expertise the class table gives again later without a separate feature */
const DND_EXTRA_EXPERTISE = { Rogue: [6], Bard: [9] };
/* the first line of a feature or feat that says what it does (skipping "Prerequisite:" and "General Feat" lines) */
function dndFirstRule(t) { const ls = String(t || "").split("\n").map(l => l.trim()).filter(Boolean);
  const keep = ls.filter(x => !/^\(?Prerequisite/.test(x) && !/^(General|Origin|Epic Boon|Fighting Style) Feat\b/.test(x) && !/^You gain the following benefits\.?$/.test(x));
  const l = keep.length ? keep.slice(0, keep[0].length < 140 ? 2 : 1).join(" ") : ls[0] || "";
  return l.replace(/^\(Prerequisite:[^)]*\)\s*/, "").replace(/^Prerequisite: Level \d+\+ \w+\s*/, ""); }
/* an option's "Prerequisite: Level 5+ Warlock" line, as a number */
const dndPrereqLevel = o => { const m = (o.t || "").match(/Prerequisite: Level (\d+)\+/); return m ? Number(m[1]) : 0; };
const dndIsFightingStyle = n => /^(Additional )?Fighting Style$/.test(n);
const dndParas = t => esc(t || "").split(/\n\n+/).map(p => `<p>${p.replace(/\n• /g, "<br>• ").replace(/^• /, "• ").replace(/\n/g, "<br>").replace(/^([A-Z][^.<]{2,60}\.)\s/, "<b>$1</b> ")}</p>`).join("");

/* ---------- the Features tab ---------- */
Object.assign(ui, { dndOpenFeat: {}, lvl: null });
function dndFeaturesTab(c, k) {
  const L = dndLv(c);
  if (!L) return `<div class="empty"><h3>Pick a class first</h3><p class="muted" style="margin:0">Choose your class on the Details tab, and its features for every level appear here.</p><button class="btn" data-act="dnd-tab" data-t="details">Details</button></div>`;
  const subLvl = dndSubLevel(c.cls); const sub = dndSubData(c);
  const table = dndTableAt(c, c.level);
  const rows = [];
  for (let lvl = 1; lvl <= 20; lvl++) {
    const gains = dndGainsAt(c, lvl); if (!gains.length) continue;
    const future = lvl > c.level;
    gains.forEach(({ f, src }, i) => {
      if (f.sub && !future) { rows.push(dndFeatRow(c, lvl, src, { n: c.subclass ? `Subclass: ${c.subclass}` : "Subclass", t: sub ? sub.t : c.subclass ? "Write this subclass's features in Features & traits on the Details tab, or pick the SRD subclass to have them listed here." : "Choose a subclass below." }, future, `${lvl}-${src}-${i}`)); return; }
      if (f.asi && !future) { const took = c.feats.filter(x => x.lvl === lvl && x.src === "level"); rows.push(dndFeatRow(c, lvl, src, { n: f.n, t: took.length ? took.map(x => x.n).join(", ") : "Not recorded. Use Level up to make this choice, or note it in Features & traits." }, future, `${lvl}-${src}-${i}`)); return; }
      if (f.choose) { const picked = c.choices[f.pool] || []; if (future) return;
        rows.push(dndFeatRow(c, lvl, src, { n: `${f.pool}: choose ${f.choose}`, t: picked.length ? "" : "Not chosen yet." , picks: picked.map(p => (L.pools[f.pool] || []).find(x => x.n === p) || { n: p, t: "" }) }, future, `${lvl}-${src}-${i}`)); return; }
      rows.push(dndFeatRow(c, lvl, src, f, future, `${lvl}-${src}-${i}`));
    });
  }
  const shown = rows.filter(r => !r.future).map(r => r.html).join("");
  const next = rows.filter(r => r.future);
  const nextLvl = next.length ? next[0].lvl : null;
  return `<div class="dnd-ftop">
      <div class="dnd-tiles dnd-ctable">${table.map(([n, v]) => dndTile(esc(n), `<b class="dnd-big">${esc(v)}</b>`)).join("") || dndTile("Class", `<b class="dnd-big">${esc(c.cls)}</b>`)}</div>
      <div class="row" style="gap:8px">
        ${c.level >= subLvl ? `<label class="row dnd-small" style="gap:6px"><span class="label">Subclass</span>
          <select data-act-change="dnd-subpick" aria-label="Subclass" ${dndDis(c)}><option value="">—</option>${L.sub ? `<option ${sub ? "selected" : ""}>${esc(L.sub.n)}</option>` : ""}<option value="__other" ${c.subclass && !sub ? "selected" : ""}>Another subclass…</option></select>
          ${c.subclass && !sub ? dndText(c, "subclass", c.subclass, `placeholder="Subclass name" style="width:180px"`) : ""}</label>` : `<span class="faint dnd-small">Subclass at level ${subLvl}.</span>`}
        ${c.level < 20 && dndCanEdit(c) ? `<button class="btn primary" data-act="dnd-levelup">Level up to ${c.level + 1}</button>` : ""}
      </div></div>
    <div class="dnd-fgrid">
      <section class="panel"><div class="panel-h"><h3>${esc(c.cls)} features</h3><span class="faint dnd-small">Levels 1 to ${c.level}</span></div><div class="panel-b dnd-flist">${shown}</div></section>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="panel"><div class="panel-h"><h3>Feats</h3></div><div class="panel-b">${c.feats.length ? `<div class="dnd-feats">${c.feats.map(f => { const d = DND_FEAT_LIST.find(x => x.n === f.n); return `<div class="dnd-feat"><b>${esc(f.n)}</b><span class="faint dnd-small">${f.src === "level" ? `Level ${f.lvl}` : esc(f.src || "")}</span>${d ? `<span class="dnd-small">${esc(dndFirstRule(d.t).slice(0, 220))}${dndFirstRule(d.t).length > 220 ? "…" : ""}</span>` : ""}</div>`; }).join("")}</div>` : `<p class="faint" style="margin:0">No feats recorded yet.</p>`}</div></section>
        ${nextLvl ? `<section class="panel"><div class="panel-h"><h3>Coming at level ${nextLvl}</h3></div><div class="panel-b"><ul class="dnd-next">${next.filter(r => r.lvl === nextLvl).map(r => `<li>${esc(r.name)}</li>`).join("")}</ul>
          <p class="faint dnd-small" style="margin:8px 0 0">${next.length > 1 ? `Then: ${[...new Set(next.filter(r => r.lvl > nextLvl).map(r => r.lvl))].slice(0, 6).map(l => "level " + l).join(", ")}…` : ""}</p></div></section>` : ""}
      </div>
    </div>`;
}
function dndFeatRow(c, lvl, src, f, future, key) {
  const open = !!ui.dndOpenFeat[c.id + ":" + key];
  const body = f.picks ? f.picks.map(p => `<div class="dnd-pick"><b>${esc(p.n)}</b>${open && p.t ? dndParas(p.t) : ""}</div>`).join("") + (f.t ? `<p class="faint">${esc(f.t)}</p>` : "") : (open ? dndParas(f.t) : `<p class="dnd-fsum">${esc((f.t || "").split("\n")[0].slice(0, 180))}${(f.t || "").length > 180 ? "…" : ""}</p>`);
  const html = `<div class="dnd-frow ${src === "sub" ? "sub" : ""}"><span class="dnd-flvl">${lvl}</span><div style="min-width:0">
      <div class="row" style="justify-content:space-between;gap:8px"><b class="dnd-fname">${esc(f.n)}</b>${src === "sub" ? `<span class="chip ink">${esc(c.subclass)}</span>` : ""}</div>
      <div class="dnd-ftext">${body}</div>
      ${(f.t && f.t.length > 180) || (f.picks && f.picks.some(p => p.t)) ? `<button class="linkish dnd-more" data-act="dnd-featopen" data-k="${esc(key)}">${open ? "Show less" : "Read more"}</button>` : ""}
    </div></div>`;
  return { html, future, lvl, name: f.n };
}

/* ---------- the Level up dialog ---------- */
function dndLvFind() { const id = ui.lvl && ui.lvl.cid; if (!id) return null; return ROLE === "gm" ? pc(id) : S.chars.get(id) || null; }
function dndLvStart(c) { ui.lvl = { cid: c.id, hp: "avg", roll: null, sub: "", subOther: "", asi: "asi", asiMode: "21", a2: "", a1: "", b1: "", feat: "", featAb: "", picks: {}, exp: [] }; ui.modal = "dndlevel"; renderModal(); }
/* what this level asks for */
function dndLvNeeds(c) {
  const n = c.level + 1; const L = dndLv(c); const st = ui.lvl; const gains = dndGainsAt(c, n);
  const needSub = gains.some(g => g.f.sub) || (n > dndSubLevel(c.cls) && !c.subclass);
  const asi = gains.find(g => g.f.asi);
  const picks = gains.filter(g => g.f.choose).map(g => ({ pool: g.f.pool, count: g.f.choose, options: (L.pools[g.f.pool] || []).filter(o => !(c.choices[g.f.pool] || []).includes(o.n) && dndPrereqLevel(o) <= n) }));
  // a subclass picked in this dialog can add its own features and picks at this level
  const subNew = st.sub && st.sub !== "__other" && L.sub && st.sub === L.sub.n && !dndSubData(c) ? (L.sub.levels[n] || []) : [];
  const allNames = [...gains.map(g => g.f.n), ...subNew.map(f => f.n)];
  const styles = allNames.filter(dndIsFightingStyle).length && !gains.some(g => g.f.choose && g.f.pool === "Fighting Style") ? 1 : 0;
  const expertise = allNames.includes("Expertise") || (DND_EXTRA_EXPERTISE[c.cls] || []).includes(n) ? 2 : 0;
  return { n, needSub, asi, picks, styles, expertise, subNew, gains };
}
function dndLvMissing(c) {
  const need = dndLvNeeds(c); const st = ui.lvl; const miss = [];
  if (st.hp === "roll" && !st.roll) miss.push("roll your hit points");
  if (need.needSub && !(st.sub && (st.sub !== "__other" || st.subOther.trim()))) miss.push("choose a subclass");
  if (need.asi) {
    if (st.asi === "asi") { if (st.asiMode === "21" ? !st.a2 : !(st.a1 && st.b1 && st.a1 !== st.b1)) miss.push("choose your ability increases"); }
    else if (!st.feat) miss.push("choose a feat");
    else { const f = DND_FEAT_LIST.find(x => x.n === st.feat); if (f && dndFeatGivesAb(f) && !st.featAb) miss.push("choose the ability the feat raises"); }
  }
  need.picks.forEach(p => { if ((st.picks[p.pool] || []).length < Math.min(p.count, p.options.length)) miss.push(`choose ${p.count} ${p.pool}`); });
  if (need.styles && !(st.picks.__style || []).length) miss.push("choose a fighting style");
  if (need.expertise && st.exp.length < Math.min(need.expertise, Object.keys(c.skills).filter(s => c.skills[s] === 1).length)) miss.push("choose 2 skills for expertise");
  return miss;
}
/* feats that also raise an ability score by 1 (general feats and epic boons) */
const dndFeatGivesAb = f => (f.cat === "general" && f.n !== "Ability Score Improvement") || f.cat === "epic-boon";
function dndLvBody() {
  const c = dndLvFind(); if (!c) return null; const k = dndCalc(c); const L = dndLv(c); const st = ui.lvl; const need = dndLvNeeds(c); const n = need.n;
  const avg = k.hd / 2 + 1; const gain = Math.max(1, (st.hp === "roll" && st.roll ? st.roll : avg) + k.mod.con) + (c.hpPerLvl || 0);
  const abSel = (key, cur, cap) => `<select data-act-change="dnd-lv" data-k="${key}"><option value="">Choose…</option>${DND_ABILITIES.map(([a, nm]) => `<option value="${a}" ${cur === a ? "selected" : ""} ${c.ab[a] >= cap ? "disabled" : ""}>${nm} (${c.ab[a]})</option>`).join("")}</select>`;
  const feats = DND_FEAT_LIST.filter(f => (f.cat === "general" || f.cat === "epic-boon" || f.cat === "origin" || f.cat === "fighting-style") && f.n !== "Ability Score Improvement" && (f.lvl || 0) <= n && (f.cat !== "epic-boon" || n >= 19) && (f.rep || !c.feats.some(x => x.n === f.n)));
  const chosenFeat = DND_FEAT_LIST.find(x => x.n === st.feat);
  const sections = [];
  // hit points
  sections.push(`<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Hit points</h3><span class="chip green">+${gain} HP</span></div>
    <div class="row"><div class="seg">${[["avg", `Take the average (${avg})`], ["roll", `Roll a d${k.hd}`]].map(([m, l]) => `<button class="${st.hp === m ? "on" : ""}" data-act="dnd-lv-set" data-k="hp" data-v="${m}">${l}</button>`).join("")}</div>
      ${st.hp === "roll" ? `<button class="btn sm primary" data-act="dnd-lv-roll">${st.roll ? `Rolled ${st.roll}` : "Roll"}</button>` : ""}
      <span class="faint dnd-small">${k.mod.con ? `${sgn(k.mod.con)} Constitution` : ""}${c.hpPerLvl ? ` +${c.hpPerLvl} per level` : ""}. New maximum: ${k.hpMax + gain}.</span></div></section>`);
  // subclass
  if (need.needSub) sections.push(`<section class="dnd-b-choice ${st.sub ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Subclass</h3></div>
    <div class="dnd-chips">${L.sub ? `<button class="dnd-chip ${st.sub === L.sub.n ? "on" : ""}" data-act="dnd-lv-set" data-k="sub" data-v="${esc(L.sub.n)}">${esc(L.sub.n)}</button>` : ""}<button class="dnd-chip ${st.sub === "__other" ? "on" : ""}" data-act="dnd-lv-set" data-k="sub" data-v="__other">Another subclass from your book</button></div>
    ${st.sub === "__other" ? `<input class="dnd-lv-other" data-lv="subOther" value="${esc(st.subOther)}" placeholder="Subclass name" style="margin-top:10px">` : st.sub && L.sub ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas(L.sub.t.split("\n\n")[0])}</div>` : ""}</section>`);
  // ability score improvement or feat
  if (need.asi) {
    const isEpic = n === 19;
    sections.push(`<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>${isEpic ? "Epic Boon (or another feat)" : "Ability Score Improvement or a feat"}</h3></div>
      <div class="seg" style="margin-bottom:10px">${[["asi", "Ability Score Improvement"], ["feat", isEpic ? "Epic Boon or feat" : "A feat instead"]].map(([m, l]) => `<button class="${st.asi === m ? "on" : ""}" data-act="dnd-lv-set" data-k="asi" data-v="${m}">${l}</button>`).join("")}</div>
      ${st.asi === "asi" ? `<div class="seg" style="margin-bottom:10px">${[["21", "+2 to one"], ["11", "+1 to two"]].map(([m, l]) => `<button class="${st.asiMode === m ? "on" : ""}" data-act="dnd-lv-set" data-k="asiMode" data-v="${m}">${l}</button>`).join("")}</div>
        <div class="row">${st.asiMode === "21" ? `<label class="row" style="gap:6px"><b>+2</b> ${abSel("a2", st.a2, 19)}</label>` : `<label class="row" style="gap:6px"><b>+1</b> ${abSel("a1", st.a1, 20)}</label><label class="row" style="gap:6px"><b>+1</b> ${abSel("b1", st.b1, 20)}</label>`}</div>
        <p class="faint dnd-small" style="margin:8px 0 0">No score can go above 20.</p>`
      : `<select data-act-change="dnd-lv" data-k="feat"><option value="">Choose a feat…</option>${["epic-boon", "general", "fighting-style", "origin"].map(cat => { const l = feats.filter(f => f.cat === cat); return l.length ? `<optgroup label="${{ "epic-boon": "Epic Boons", general: "General feats", "fighting-style": "Fighting styles", origin: "Origin feats" }[cat]}">${l.map(f => `<option ${st.feat === f.n ? "selected" : ""}>${esc(f.n)}</option>`).join("")}</optgroup>` : ""; }).join("")}</select>
        ${chosenFeat ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas(chosenFeat.t)}</div>${dndFeatGivesAb(chosenFeat) ? `<label class="row" style="gap:6px;margin-top:8px"><b>+1</b> ${abSel("featAb", st.featAb, chosenFeat.cat === "epic-boon" ? 30 : 20)}<span class="faint dnd-small">Pick one the feat allows.</span></label>` : ""}` : ""}
        <p class="faint dnd-small" style="margin:8px 0 0">Only the SRD feats are listed. For one from your book, take the Ability Score Improvement here and note the feat in Features & traits.</p>`}
    </section>`);
  }
  // picks such as invocations, fighting styles, primal order
  need.picks.forEach(p => { const have = st.picks[p.pool] || [];
    sections.push(`<section class="dnd-b-choice ${have.length >= p.count ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>${esc(p.pool)}: choose ${p.count}</h3><span class="chip ${have.length >= p.count ? "green" : "red"}">${have.length}/${p.count}</span></div>
      <div class="dnd-chips">${p.options.map(o => { const on = have.includes(o.n); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-lv-pick" data-pool="${esc(p.pool)}" data-v="${esc(o.n)}" data-max="${p.count}" ${!on && have.length >= p.count ? "disabled" : ""} title="${esc(dndFirstRule(o.t).slice(0, 300))}">${esc(o.n)}</button>`; }).join("")}</div>
      ${have.length ? `<div class="dnd-ftext" style="margin-top:10px">${have.map(h => { const o = p.options.find(x => x.n === h); return o ? `<p><b>${esc(o.n)}.</b> ${esc(dndFirstRule(o.t).slice(0, 400))}</p>` : ""; }).join("")}</div>` : ""}</section>`); });
  if (need.styles) { const have = st.picks.__style || []; const opts = DND_FEAT_LIST.filter(f => f.cat === "fighting-style" && !c.feats.some(x => x.n === f.n));
    sections.push(`<section class="dnd-b-choice ${have.length ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Fighting style: choose 1</h3></div>
      <div class="dnd-chips">${opts.map(o => `<button class="dnd-chip ${have.includes(o.n) ? "on" : ""}" data-act="dnd-lv-pick" data-pool="__style" data-v="${esc(o.n)}" data-max="1" ${!have.includes(o.n) && have.length ? "disabled" : ""}>${esc(o.n)}</button>`).join("")}</div>
      ${have.length ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas((opts.find(o => o.n === have[0]) || {}).t || "")}</div>` : ""}</section>`); }
  if (need.expertise) { const prof = Object.keys(c.skills).filter(s => c.skills[s] === 1);
    sections.push(`<section class="dnd-b-choice ${st.exp.length >= 2 ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Expertise: choose 2 skills</h3></div>
      <div class="dnd-chips">${prof.map(s => { const on = st.exp.includes(s); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-lv-exp" data-v="${s}" ${!on && st.exp.length >= 2 ? "disabled" : ""}>${esc(DND_SKILL_NAME[s])}</button>`; }).join("") || `<span class="faint">No proficient skills without expertise.</span>`}</div></section>`); }
  // the new features themselves
  const newFeats = [...need.gains.filter(g => !g.f.sub && !g.f.asi && !g.f.choose).map(g => g.f), ...need.subNew.filter(f => !f.choose)];
  const tableNow = dndTableAt(c, c.level), tableNext = dndTableAt(c, n);
  const changes = tableNext.filter(([nm, v]) => { const was = tableNow.find(x => x[0] === nm); return !was || String(was[1]) !== String(v); });
  const miss = dndLvMissing(c);
  return `<div class="dnd-lv">
    <div class="dnd-lv-head"><div><span class="label">${esc(c.cls)}</span><h3>Level ${c.level} → ${n}</h3></div>
      ${c.pendingLevel > c.level + 1 ? `<span class="chip blue">Building to level ${c.pendingLevel}: ${c.pendingLevel - c.level - 1} more after this</span>` : ""}
      ${k.pb !== dndProf(n) ? `<span class="chip green">Proficiency bonus ${sgn(dndProf(n))}</span>` : ""}</div>
    ${newFeats.length || changes.length ? `<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>New at level ${n}</h3></div>
      ${changes.length ? `<div class="row" style="gap:6px;margin-bottom:10px">${changes.map(([nm, v]) => `<span class="chip ink">${esc(nm)}: ${esc(v)}</span>`).join("")}</div>` : ""}
      <div class="dnd-feats">${newFeats.map(f => `<div class="dnd-feat"><b>${esc(f.n)}</b><span class="dnd-small">${esc((f.t || "").split("\n")[0].slice(0, 320))}${(f.t || "").split("\n")[0].length > 320 ? "…" : ""}</span></div>`).join("")}</div></section>` : ""}
    ${sections.join("")}
    <div class="row" style="justify-content:flex-end;gap:8px">
      ${miss.length ? `<span class="faint dnd-small">Still to do: ${esc(miss.join(", "))}.</span>` : ""}
      <button class="btn ghost" data-act="close-modal">${c.pendingLevel > c.level ? "Stop here" : "Cancel"}</button>
      <button class="btn primary" data-act="dnd-lv-apply" ${miss.length ? "disabled" : ""}>Reach level ${n}</button></div>
  </div>`;
}
MODALS.dndlevel = () => { const c = dndLvFind(); if (!c || c.level >= 20 || !dndLv(c)) return null; return { title: `Level up: ${dndName(c)}`, body: dndLvBody(), wide: true }; };

function dndLvApply() {
  const c = dndLvFind(); if (!c || !dndCanEdit(c) || dndLvMissing(c).length) return; const st = ui.lvl; const need = dndLvNeeds(c); const n = need.n; const k = dndCalc(c);
  const before = k.hpMax;
  if (st.hp === "roll" && st.roll) c.hpRolls[n] = st.roll; else delete c.hpRolls[n];
  if (need.needSub) c.subclass = st.sub === "__other" ? st.subOther.trim() : st.sub;
  if (need.asi) {
    if (st.asi === "asi") { if (st.asiMode === "21") c.ab[st.a2] = Math.min(20, c.ab[st.a2] + 2); else { c.ab[st.a1] = Math.min(20, c.ab[st.a1] + 1); c.ab[st.b1] = Math.min(20, c.ab[st.b1] + 1); }
      c.feats.push({ n: "Ability Score Improvement" + (st.asiMode === "21" ? ` (+2 ${DND_AB_NAME[st.a2]})` : ` (+1 ${DND_AB_NAME[st.a1]}, +1 ${DND_AB_NAME[st.b1]})`), lvl: n, src: "level" }); }
    else { const f = DND_FEAT_LIST.find(x => x.n === st.feat); if (f && dndFeatGivesAb(f) && st.featAb) c.ab[st.featAb] = Math.min(f.cat === "epic-boon" ? 30 : 20, c.ab[st.featAb] + 1);
      c.feats.push({ n: st.feat, lvl: n, src: "level" }); if (st.feat === "Alert") c.alert = true; }
  }
  need.picks.forEach(p => { c.choices[p.pool] = [...(c.choices[p.pool] || []), ...(st.picks[p.pool] || [])]; });
  (st.picks.__style || []).forEach(s => c.feats.push({ n: s, lvl: n, src: "Fighting Style" }));
  st.exp.forEach(s => { c.skills[s] = 2; });
  if (need.gains.some(g => g.f.n === "Jack of All Trades")) c.jack = true;
  c.level = n; c.hdSpent = Math.min(c.hdSpent, c.level);
  // keep current HP the same distance below the new maximum
  if (c.hp != null) c.hp = Math.max(0, c.hp + (dndCalc(c).hpMax - before));
  const goOn = c.pendingLevel > c.level;
  if (!goOn) c.pendingLevel = 0;
  dndCommit(c, true);
  if (goOn) dndLvStart(c); else { ui.modal = null; ui.lvl = null; renderModal(); showNotice(`${dndName(c)} is now level ${c.level}.`); }
}
Object.assign(A, {
  "dnd-levelup": dndAct(c => { if (!dndLv(c)) { showNotice("Pick a class on the Details tab first."); return false; } dndLvStart(c); return false; }, false),
  "dnd-featopen": dndAct((c, el) => { const key = c.id + ":" + el.dataset.k; ui.dndOpenFeat[key] = !ui.dndOpenFeat[key]; return false; }, false),
  "dnd-lv-set": el => { const st = ui.lvl; if (!st) return; st[el.dataset.k] = el.dataset.v; if (el.dataset.k === "sub") st.picks = {}; renderModal(); },
  "dnd-lv-roll": () => { const c = dndLvFind(); const st = ui.lvl; if (!c || !st || st.roll) return; const k = dndCalc(c); st.roll = d(k.hd);
    Dice.raw(`Hit points for level ${c.level + 1}`, `d${k.hd} (${st.roll}) ${sgn(k.mod.con)}`, Math.max(1, st.roll + k.mod.con), dndName(c), [{ t: "Level up", c: "green" }]); renderModal(); },
  "dnd-lv-pick": el => { const st = ui.lvl; if (!st) return; const p = el.dataset.pool, v = el.dataset.v, max = Number(el.dataset.max) || 1; const l = st.picks[p] || [];
    st.picks[p] = l.includes(v) ? l.filter(x => x !== v) : l.length < max ? [...l, v] : l; renderModal(); },
  "dnd-lv-exp": el => { const st = ui.lvl; if (!st) return; const v = el.dataset.v; st.exp = st.exp.includes(v) ? st.exp.filter(x => x !== v) : st.exp.length < 2 ? [...st.exp, v] : st.exp; renderModal(); },
  "dnd-lv-apply": () => dndLvApply(),
});
Object.assign(CHANGE, {
  "dnd-lv": el => { const st = ui.lvl; if (!st) return; st[el.dataset.k] = el.value; if (el.dataset.k === "feat") st.featAb = ""; renderModal(); },
  "dnd-subpick": el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; c.subclass = el.value === "__other" ? (dndSubData(c) ? "" : c.subclass) || "Custom" : el.value; dndCommit(c, true); },
});
document.addEventListener("input", ev => { const el = ev.target; if (el.dataset && el.dataset.lv && ui.lvl) { ui.lvl[el.dataset.lv] = el.value; const b = document.querySelector('[data-act="dnd-lv-apply"]'); if (b) { const c = dndLvFind(); b.disabled = !c || dndLvMissing(c).length > 0; } } });
document.addEventListener("change", ev => { const el = ev.target; if (el.dataset && el.dataset.lv && ui.lvl) renderModal(); });
