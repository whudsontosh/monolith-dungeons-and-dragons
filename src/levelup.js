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
  if (!dndLv(c)) return `<div class="empty"><h3>Pick a class first</h3><p class="muted" style="margin:0">Choose your class on the Details tab, and its features for every level appear here.</p><button class="btn" data-act="dnd-tab" data-t="details">Details</button></div>`;
  const ents = dndClassList(c).filter(e => e.cls); const multi = ents.length > 1;
  const blocks = ents.map(e => dndClassFeatures(c, e, multi));
  const next = blocks[0].next; const nextLvl = next.length ? next[0].lvl : null;
  const featSrc = f => f.src === "level" ? `Level ${f.lvl}` : /^level:/.test(f.src) ? `${f.src.slice(6)} level ${f.lvl}` : esc(f.src || "");
  return `<div class="dnd-ftop">
      ${multi ? `<div class="row" style="gap:6px">${ents.map(e => `<span class="chip ink">${esc(e.cls)} ${e.level}${e.subclass ? " · " + esc(e.subclass) : ""}</span>`).join("")}<span class="faint dnd-small">Character level ${c.level}</span></div>` : blocks[0].tiles}
      <div class="row" style="gap:8px">${multi ? "" : blocks[0].subPick}
        ${c.level < 20 && dndCanEdit(c) ? `<button class="btn primary" data-act="dnd-levelup">Level up to ${c.level + 1}</button>` : ""}
      </div></div>
    <div class="dnd-fgrid">
      <div style="display:grid;gap:16px;align-content:start">${blocks.map(x => `<section class="panel"><div class="panel-h"><h3>${esc(x.e.cls)} features</h3><span class="faint dnd-small">${multi ? `${esc(x.e.cls)} levels 1 to ${x.e.level}` : `Levels 1 to ${x.e.level}`}</span></div>
        ${multi ? `<div class="panel-b" style="display:grid;gap:10px;padding-bottom:0"><div class="dnd-tiles dnd-ctable">${x.tilesInner}</div><div class="row">${x.subPick}</div></div>` : ""}
        <div class="panel-b dnd-flist">${x.shown}</div></section>`).join("")}</div>
      <div style="display:grid;gap:16px;align-content:start">
        <section class="panel"><div class="panel-h"><h3>Feats</h3></div><div class="panel-b">${c.feats.length ? `<div class="dnd-feats">${c.feats.map(f => { const d = DND_FEAT_LIST.find(x => x.n === f.n); return `<div class="dnd-feat"><b>${esc(f.n)}</b><span class="faint dnd-small">${featSrc(f)}</span>${d ? `<span class="dnd-small">${esc(dndFirstRule(d.t).slice(0, 220))}${dndFirstRule(d.t).length > 220 ? "…" : ""}</span>` : ""}</div>`; }).join("")}</div>` : `<p class="faint" style="margin:0">No feats recorded yet.</p>`}</div></section>
        ${nextLvl && !multi ? `<section class="panel"><div class="panel-h"><h3>Coming at level ${nextLvl}</h3></div><div class="panel-b"><ul class="dnd-next">${next.filter(r => r.lvl === nextLvl).map(r => `<li>${esc(r.name)}</li>`).join("")}</ul>
          <p class="faint dnd-small" style="margin:8px 0 0">${next.length > 1 ? `Then: ${[...new Set(next.filter(r => r.lvl > nextLvl).map(r => r.lvl))].slice(0, 6).map(l => "level " + l).join(", ")}…` : ""}</p></div></section>` : ""}
        ${multi ? `<section class="panel"><div class="panel-h"><h3>Next in each class</h3></div><div class="panel-b"><ul class="dnd-next">${blocks.map(x => { const n1 = x.next.length ? x.next[0].lvl : null;
          return `<li><b>${esc(x.e.cls)} ${n1 || "—"}</b>: ${n1 ? esc(x.next.filter(r => r.lvl === n1).map(r => r.name).join(", ")) : "nothing more"}</li>`; }).join("")}</ul></div></section>` : ""}
      </div>
    </div>`;
}
/* one class's features, table and subclass picker */
function dndClassFeatures(c, e, multi) {
  const v = dndAs(c, e); const L = dndLv(v); if (!L) return { e, tiles: "", tilesInner: "", subPick: "", shown: `<p class="faint" style="margin:0">No class data for ${esc(e.cls)}.</p>`, next: [] };
  const subLvl = dndSubLevel(v.cls); const sub = dndSubData(v); const table = dndTableAt(v, v.level); const rows = [];
  const tookSrc = e.i === 0 ? "level" : `level:${e.cls}`;
  for (let lvl = 1; lvl <= 20; lvl++) {
    const gains = dndGainsAt(v, lvl); if (!gains.length) continue;
    const future = lvl > v.level; const key = i => `${e.cls}-${lvl}-${i}`;
    gains.forEach(({ f, src }, i) => {
      if (f.sub && !future) { rows.push(dndFeatRow(v, lvl, src, { n: v.subclass ? `Subclass: ${v.subclass}` : "Subclass", t: sub ? sub.t : v.subclass ? "Write this subclass's features in Features & traits on the Details tab, or pick the SRD subclass to have them listed here." : "Choose a subclass below." }, future, key(i))); return; }
      if (f.asi && !future) { const took = c.feats.filter(x => x.lvl === lvl && (x.src === tookSrc || (!multi && x.src === "level"))); rows.push(dndFeatRow(v, lvl, src, { n: f.n, t: took.length ? took.map(x => x.n).join(", ") : "Not recorded. Use Level up to make this choice, or note it in Features & traits." }, future, key(i))); return; }
      if (f.choose) { let picked = c.choices[f.pool] || []; if (future) return;
        if (dndIsFightingStyle(f.pool) && !picked.length) picked = c.feats.filter(x => (DND_FEAT_LIST.find(y => y.n === x.n) || {}).cat === "fighting-style").map(x => x.n);
        rows.push(dndFeatRow(v, lvl, src, { n: `${f.pool}: choose ${f.choose}`, t: picked.length ? "" : "Not chosen yet.", picks: picked.map(p => (L.pools[f.pool] || []).find(x => x.n === p) || DND_FEAT_LIST.find(x => x.n === p) || { n: p, t: "" }) }, future, key(i))); return; }
      rows.push(dndFeatRow(v, lvl, src, f, future, key(i)));
    });
  }
  const tilesInner = table.map(([n, val]) => dndTile(esc(n), `<b class="dnd-big">${esc(val)}</b>`)).join("") || dndTile("Class", `<b class="dnd-big">${esc(v.cls)}</b>`);
  const subPick = v.level >= subLvl ? `<label class="row dnd-small" style="gap:6px"><span class="label">${multi ? esc(e.cls) + " subclass" : "Subclass"}</span>
      <select data-act-change="dnd-subpick" data-ci="${e.i}" aria-label="${esc(e.cls)} subclass" ${dndDis(c)}><option value="">—</option>${L.sub ? `<option ${sub ? "selected" : ""}>${esc(L.sub.n)}</option>` : ""}<option value="__other" ${v.subclass && !sub ? "selected" : ""}>Another subclass…</option></select>
      ${v.subclass && !sub ? dndText(c, e.i === 0 ? "subclass" : `multi.${e.i - 1}.subclass`, v.subclass, `placeholder="Subclass name" style="width:180px"`) : ""}</label>` : `<span class="faint dnd-small">${multi ? esc(e.cls) + " subclass" : "Subclass"} at level ${subLvl}.</span>`;
  return { e, tiles: `<div class="dnd-tiles dnd-ctable">${tilesInner}</div>`, tilesInner, subPick, shown: rows.filter(r => !r.future).map(r => r.html).join(""), next: rows.filter(r => r.future) };
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

/* ---------- levelling up: the choices for one level ----------
   The same choices are made in two places: the Level up dialog (state in ui.lvl) and the creator's
   Levels step (state in c.build.levels[n]). Everything below takes the character as it is *before*
   the level (c) and that level's choices (st). Buttons carry data-w="dlg" or data-w="b:<level>" so
   the handlers know which set of choices they change. */
function dndLvBlank() { return { cls: "", hp: "avg", roll: null, sub: "", subOther: "", asi: "asi", asiMode: "21", a2: "", a1: "", b1: "", feat: "", featAb: "", picks: {}, exp: [] }; }
/* which class takes this level: st.cls is empty for the first class, or names another (new or not) */
function dndLvTarget(c, st) {
  const ents = dndClassList(c); const want = (st && st.cls) || "";
  const e = !want ? ents[0] : ents.find(x => x.cls === want) || { cls: want, subclass: "", level: 0, i: ents.length, isNew: true };
  return { e, v: dndAs(c, e) };
}
function dndLvFind() { const id = ui.lvl && ui.lvl.cid; if (!id) return null; return ROLE === "gm" ? pc(id) : S.chars.get(id) || null; }
function dndLvStart(c) { ui.lvl = { cid: c.id, ...dndLvBlank() }; ui.modal = "dndlevel"; renderModal(); }
/* what level c.level + 1 asks for */
function dndLvNeeds(c, st) {
  const t = dndLvTarget(c, st); const v = t.v; const N = c.level + 1; const n = v.level + 1; const L = dndLv(v) || { pools: {}, levels: {} }; const gains = dndGainsAt(v, n);
  const needSub = gains.some(g => g.f.sub) || (n > dndSubLevel(v.cls) && !v.subclass && !(c.__subAsked || {})[v.cls]);
  const asi = gains.find(g => g.f.asi);
  const picks = gains.filter(g => g.f.choose).map(g => ({ pool: g.f.pool, count: g.f.choose, options: (L.pools[g.f.pool] || []).filter(o => !(c.choices[g.f.pool] || []).includes(o.n) && dndPrereqLevel(o) <= n) }));
  // a subclass picked at this level can add its own features and picks at this level
  const subNew = st.sub && st.sub !== "__other" && L.sub && st.sub === L.sub.n && !dndSubData(v) ? (L.sub.levels[n] || []) : [];
  const allNames = [...gains.map(g => g.f.n), ...subNew.map(f => f.n)];
  const styles = allNames.filter(dndIsFightingStyle).length && !gains.some(g => g.f.choose && g.f.pool === "Fighting Style") ? 1 : 0;
  const expertise = allNames.includes("Expertise") || (DND_EXTRA_EXPERTISE[v.cls] || []).includes(n) ? 2 : 0;
  return { n, N, e: t.e, v, isNew: !!t.e.isNew, needSub, asi, picks, styles, expertise, subNew, gains };
}
function dndLvMissing(c, st) {
  const need = dndLvNeeds(c, st); const miss = [];
  if (st.hp === "roll" && !st.roll) miss.push("roll your hit points");
  if (need.needSub && !(st.sub && (st.sub !== "__other" || (st.subOther || "").trim()))) miss.push("choose a subclass");
  if (need.asi) {
    if (st.asi === "asi") { if (st.asiMode === "21" ? !st.a2 : !(st.a1 && st.b1 && st.a1 !== st.b1)) miss.push("choose your ability increases"); }
    else if (!st.feat) miss.push("choose a feat");
    else { const f = DND_FEAT_LIST.find(x => x.n === st.feat); if (f && dndFeatGivesAb(f) && !st.featAb) miss.push("choose the ability the feat raises"); }
  }
  need.picks.forEach(p => { if (((st.picks || {})[p.pool] || []).length < Math.min(p.count, p.options.length)) miss.push(`choose ${p.count} ${p.pool}`); });
  if (need.styles && !((st.picks || {}).__style || []).length) miss.push("choose a fighting style");
  if (need.expertise && (st.exp || []).length < Math.min(need.expertise, Object.keys(c.skills).filter(s => c.skills[s] === 1).length)) miss.push("choose 2 skills for expertise");
  return miss;
}
/* feats that also raise an ability score by 1 (general feats and epic boons) */
const dndFeatGivesAb = f => (f.cat === "general" && f.n !== "Ability Score Improvement") || f.cat === "epic-boon";
/* the choice blocks for one level; w says where the choices live */
function dndLvSections(c, st, w) {
  const k = dndCalc(c); const need = dndLvNeeds(c, st); const v = need.v; const L = dndLv(v) || { pools: {}, levels: {} }; const n = need.n; const N = need.N; const W = `data-w="${w}"`;
  const hd = (DND_CLASSES[v.cls] || { hd: 8 }).hd; const avg = hd / 2 + 1; const gain = Math.max(1, (st.hp === "roll" && st.roll ? st.roll : avg) + k.mod.con) + (c.hpPerLvl || 0);
  const abSel = (key, cur, cap) => `<select data-act-change="dnd-lv" ${W} data-k="${key}"><option value="">Choose…</option>${DND_ABILITIES.map(([a, nm]) => `<option value="${a}" ${cur === a ? "selected" : ""} ${c.ab[a] >= cap ? "disabled" : ""}>${nm} (${c.ab[a]})</option>`).join("")}</select>`;
  const feats = DND_FEAT_LIST.filter(f => (f.cat === "general" || f.cat === "epic-boon" || f.cat === "origin" || f.cat === "fighting-style") && f.n !== "Ability Score Improvement" && (f.lvl || 0) <= N && (f.cat !== "epic-boon" || N >= 19) && (f.rep || !c.feats.some(x => x.n === f.n)));
  const chosenFeat = DND_FEAT_LIST.find(x => x.n === st.feat);
  const picks = st.picks || {}; const exp = st.exp || [];
  const out = []; let clsSec = "";
  if (c.cls) { const ents = dndClassList(c); const others = Object.keys(DND_LEVELS).filter(x => !ents.some(e => e.cls === x));
    clsSec = (`<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Class</h3>${need.isNew ? `<span class="chip blue">Multiclass</span>` : ""}</div>
      <div class="dnd-chips">${ents.map(e => `<button class="dnd-chip ${v.cls === e.cls ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="cls" data-v="${e.i === 0 ? "" : esc(e.cls)}">${esc(e.cls)} ${e.level} → ${e.level + 1}</button>`).join("")}
        <select class="dnd-mcsel" data-act-change="dnd-lv" ${W} data-k="cls" aria-label="Multiclass into"><option value="${need.isNew ? "" : esc(st.cls || "")}">${need.isNew ? "Back to " + esc(ents[0].cls) : "Multiclass into…"}</option>${others.map(x => `<option value="${x}" ${need.isNew && v.cls === x ? "selected" : ""}>${x}${dndMcOk(c, x) ? "" : " (needs " + dndMcReqText(x) + ")"}</option>`).join("")}</select></div>
      ${need.isNew ? `<p class="dnd-small" style="margin:10px 0 0">You gain: ${esc(DND_MC_PROFS[v.cls] || "")}. No new saving throws.${dndMcOk(c, v.cls) && dndMcOk(c, ents[0].cls) ? "" : ` <b style="color:var(--bad)">The rules need ${esc(dndMcReqText(v.cls))}${dndMcOk(c, ents[0].cls) ? "" : ` and ${esc(dndMcReqText(ents[0].cls))}`} to multiclass.</b>`}</p>` : ""}</section>`); }
  out.push(`<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Hit points</h3><span class="chip green">+${gain} HP</span></div>
    <div class="row"><div class="seg">${[["avg", `Take the average (${avg})`], ["roll", `Roll a d${hd}`]].map(([m, l]) => `<button class="${st.hp === m ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="hp" data-v="${m}">${l}</button>`).join("")}</div>
      ${st.hp === "roll" ? `<button class="btn sm primary" data-act="dnd-lv-roll" ${W} ${st.roll ? "disabled" : ""}>${st.roll ? `Rolled ${st.roll}` : "Roll"}</button>` : ""}
      <span class="faint dnd-small">${k.mod.con ? `${sgn(k.mod.con)} Constitution` : ""}${c.hpPerLvl ? ` +${c.hpPerLvl} per level` : ""}. New maximum: ${k.hpMax + gain}.</span></div></section>`);
  if (need.needSub) out.push(`<section class="dnd-b-choice ${st.sub ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Subclass</h3></div>
    <div class="dnd-chips">${L.sub ? `<button class="dnd-chip ${st.sub === L.sub.n ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="sub" data-v="${esc(L.sub.n)}">${esc(L.sub.n)}</button>` : ""}<button class="dnd-chip ${st.sub === "__other" ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="sub" data-v="__other">Another subclass from your book</button></div>
    ${st.sub === "__other" ? `<input class="dnd-lv-other" data-lv="subOther" ${W} value="${esc(st.subOther || "")}" placeholder="Subclass name" style="margin-top:10px">` : st.sub && L.sub ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas(L.sub.t.split("\n\n")[0])}</div>` : ""}</section>`);
  if (need.asi) {
    const isEpic = n === 19;
    out.push(`<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>${isEpic ? "Epic Boon (or another feat)" : "Ability Score Improvement or a feat"}</h3></div>
      <div class="seg" style="margin-bottom:10px">${[["asi", "Ability Score Improvement"], ["feat", isEpic ? "Epic Boon or feat" : "A feat instead"]].map(([m, l]) => `<button class="${st.asi === m ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="asi" data-v="${m}">${l}</button>`).join("")}</div>
      ${st.asi === "asi" ? `<div class="seg" style="margin-bottom:10px">${[["21", "+2 to one"], ["11", "+1 to two"]].map(([m, l]) => `<button class="${st.asiMode === m ? "on" : ""}" data-act="dnd-lv-set" ${W} data-k="asiMode" data-v="${m}">${l}</button>`).join("")}</div>
        <div class="row">${st.asiMode === "21" ? `<label class="row" style="gap:6px"><b>+2</b> ${abSel("a2", st.a2, 19)}</label>` : `<label class="row" style="gap:6px"><b>+1</b> ${abSel("a1", st.a1, 20)}</label><label class="row" style="gap:6px"><b>+1</b> ${abSel("b1", st.b1, 20)}</label>`}</div>
        <p class="faint dnd-small" style="margin:8px 0 0">No score can go above 20.</p>`
      : `<select data-act-change="dnd-lv" ${W} data-k="feat"><option value="">Choose a feat…</option>${["epic-boon", "general", "fighting-style", "origin"].map(cat => { const l = feats.filter(f => f.cat === cat); return l.length ? `<optgroup label="${{ "epic-boon": "Epic Boons", general: "General feats", "fighting-style": "Fighting styles", origin: "Origin feats" }[cat]}">${l.map(f => `<option ${st.feat === f.n ? "selected" : ""}>${esc(f.n)}</option>`).join("")}</optgroup>` : ""; }).join("")}</select>
        ${chosenFeat ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas(chosenFeat.t)}</div>${dndFeatGivesAb(chosenFeat) ? `<label class="row" style="gap:6px;margin-top:8px"><b>+1</b> ${abSel("featAb", st.featAb, chosenFeat.cat === "epic-boon" ? 30 : 20)}<span class="faint dnd-small">Pick one the feat allows.</span></label>` : ""}` : ""}
        <p class="faint dnd-small" style="margin:8px 0 0">Only the SRD feats are listed. For one from your book, take the Ability Score Improvement here and note the feat in Features & traits.</p>`}
    </section>`);
  }
  need.picks.forEach(p => { const have = picks[p.pool] || [];
    out.push(`<section class="dnd-b-choice ${have.length >= p.count ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>${esc(p.pool)}: choose ${p.count}</h3><span class="chip ${have.length >= p.count ? "green" : "red"}">${have.length}/${p.count}</span></div>
      <div class="dnd-chips">${p.options.map(o => { const on = have.includes(o.n); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-lv-pick" ${W} data-pool="${esc(p.pool)}" data-v="${esc(o.n)}" data-max="${p.count}" ${!on && have.length >= p.count ? "disabled" : ""} title="${esc(dndFirstRule(o.t).slice(0, 300))}">${esc(o.n)}</button>`; }).join("")}</div>
      ${have.length ? `<div class="dnd-ftext" style="margin-top:10px">${have.map(h => { const o = p.options.find(x => x.n === h); return o ? `<p><b>${esc(o.n)}.</b> ${esc(dndFirstRule(o.t).slice(0, 400))}</p>` : ""; }).join("")}</div>` : ""}</section>`); });
  if (need.styles) { const have = picks.__style || []; const opts = DND_FEAT_LIST.filter(f => f.cat === "fighting-style" && !c.feats.some(x => x.n === f.n));
    out.push(`<section class="dnd-b-choice ${have.length ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Fighting style: choose 1</h3></div>
      <div class="dnd-chips">${opts.map(o => `<button class="dnd-chip ${have.includes(o.n) ? "on" : ""}" data-act="dnd-lv-pick" ${W} data-pool="__style" data-v="${esc(o.n)}" data-max="1" ${!have.includes(o.n) && have.length ? "disabled" : ""}>${esc(o.n)}</button>`).join("")}</div>
      ${have.length ? `<div class="dnd-ftext" style="margin-top:10px">${dndParas((opts.find(o => o.n === have[0]) || {}).t || "")}</div>` : ""}</section>`); }
  if (need.expertise) { const prof = Object.keys(c.skills).filter(s => c.skills[s] === 1);
    out.push(`<section class="dnd-b-choice ${exp.length >= 2 ? "done" : "open"}"><div class="dnd-b-choice-h"><h3>Expertise: choose 2 skills</h3></div>
      <div class="dnd-chips">${prof.map(s => { const on = exp.includes(s); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-lv-exp" ${W} data-v="${s}" ${!on && exp.length >= 2 ? "disabled" : ""}>${esc(DND_SKILL_NAME[s])}</button>`; }).join("") || `<span class="faint">No proficient skills without expertise.</span>`}</div></section>`); }
  const newFeats = [...need.gains.filter(g => !g.f.sub && !g.f.asi && !g.f.choose).map(g => g.f), ...need.subNew.filter(f => !f.choose)];
  const tableNow = need.isNew ? [] : dndTableAt(v, v.level), tableNext = dndTableAt(v, n);
  const changes = tableNext.filter(([nm, v]) => { const was = tableNow.find(x => x[0] === nm); return !was || String(was[1]) !== String(v); });
  const news = newFeats.length || changes.length ? `<section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>New at ${esc(v.cls)} level ${n}</h3></div>
      ${changes.length ? `<div class="row" style="gap:6px;margin-bottom:10px">${changes.map(([nm, v]) => `<span class="chip ink">${esc(nm)}: ${esc(v)}</span>`).join("")}</div>` : ""}
      <div class="dnd-feats">${newFeats.filter(f => !(need.isNew && /^Proficiencies$|^Hit Points$/.test(f.n))).map(f => `<div class="dnd-feat"><b>${esc(f.n)}</b><span class="dnd-small">${esc((f.t || "").split("\n")[0].slice(0, 320))}${(f.t || "").split("\n")[0].length > 320 ? "…" : ""}</span></div>`).join("")}</div></section>` : "";
  return { clsSec, news, choices: out.join(""), need, newNames: [...newFeats.map(f => f.n), need.needSub ? "Subclass" : "", need.asi ? need.asi.f.n : ""].filter(Boolean) };
}
function dndLvBody() {
  const c = dndLvFind(); if (!c) return null; const st = ui.lvl; const k = dndCalc(c); const n = c.level + 1;
  const sec = dndLvSections(c, st, "dlg"); const miss = dndLvMissing(c, st); const v = sec.need.v;
  return `<div class="dnd-lv">
    <div class="dnd-lv-head"><div><span class="label">${esc(v.cls)} ${v.level} → ${v.level + 1}</span><h3>Level ${c.level} → ${n}</h3></div>
      ${k.pb !== dndProf(n) ? `<span class="chip green">Proficiency bonus ${sgn(dndProf(n))}</span>` : ""}</div>
    ${sec.clsSec}${sec.news}${sec.choices}
    <div class="row" style="justify-content:flex-end;gap:8px">
      ${miss.length ? `<span class="faint dnd-small">Still to do: ${esc(miss.join(", "))}.</span>` : ""}
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn primary" data-act="dnd-lv-apply" ${miss.length ? "disabled" : ""}>Reach level ${n}</button></div>
  </div>`;
}
MODALS.dndlevel = () => { const c = dndLvFind(); if (!c || c.level >= 20 || !dndLv(c)) return null; return { title: `Level up: ${dndName(c)}`, body: dndLvBody(), wide: true }; };

/* applies one level's choices to c (c.level goes up by one); choices left unmade are skipped */
function dndLvApplyTo(c, st) {
  const need = dndLvNeeds(c, st); const n = need.n; const N = need.N; const e = need.e; const before = dndCalc(c).hpMax; const picks = st.picks || {};
  const src = e.i === 0 ? "level" : `level:${e.cls}`;
  if (st.hp === "roll" && st.roll) c.hpRolls[N] = st.roll; else delete c.hpRolls[N];
  let m = null;
  if (need.isNew) { m = { cls: e.cls, subclass: "", level: 0 }; c.multi.push(m); c.profs = [c.profs, `${e.cls} (multiclass): ${DND_MC_PROFS[e.cls] || ""}`].filter(Boolean).join("\n"); }
  else if (e.i > 0) m = c.multi[e.i - 1];
  const setSub = v => { if (m) m.subclass = v; else c.subclass = v; };
  if (need.needSub && st.sub) setSub(st.sub === "__other" ? (st.subOther || "").trim() : st.sub);
  else if (need.needSub) c.__subAsked = { ...(c.__subAsked || {}), [e.cls]: true };   /* a build still being made: ask for the subclass once, at its level */
  if (need.asi) {
    if (st.asi === "asi") {
      if (st.asiMode === "21" && st.a2) { c.ab[st.a2] = Math.min(20, c.ab[st.a2] + 2); c.feats.push({ n: `Ability Score Improvement (+2 ${DND_AB_NAME[st.a2]})`, lvl: n, src }); }
      if (st.asiMode === "11" && st.a1 && st.b1 && st.a1 !== st.b1) { c.ab[st.a1] = Math.min(20, c.ab[st.a1] + 1); c.ab[st.b1] = Math.min(20, c.ab[st.b1] + 1);
        c.feats.push({ n: `Ability Score Improvement (+1 ${DND_AB_NAME[st.a1]}, +1 ${DND_AB_NAME[st.b1]})`, lvl: n, src }); }
    } else if (st.feat) { const f = DND_FEAT_LIST.find(x => x.n === st.feat); if (f && dndFeatGivesAb(f) && st.featAb) c.ab[st.featAb] = Math.min(f.cat === "epic-boon" ? 30 : 20, c.ab[st.featAb] + 1);
      c.feats.push({ n: st.feat, lvl: n, src }); if (st.feat === "Alert") c.alert = true; }
  }
  need.picks.forEach(p => { const add = (picks[p.pool] || []).filter(x => p.options.some(o => o.n === x)); if (add.length) c.choices[p.pool] = [...(c.choices[p.pool] || []), ...add]; });
  (picks.__style || []).forEach(s => c.feats.push({ n: s, lvl: n, src: "Fighting Style" }));
  (st.exp || []).forEach(s => { if (c.skills[s] === 1) c.skills[s] = 2; });
  if (need.gains.some(g => g.f.n === "Jack of All Trades")) c.jack = true;
  if (m) m.level++;
  c.level = N; c.hdSpent = Math.min(c.hdSpent, c.level);
  if (dndIsMulti(c)) { c.lvlCls[N] = e.cls; if (!Object.keys(c.hdBy || {}).length && c.hdSpent) c.hdBy = { [c.cls]: c.hdSpent }; }
  // keep current HP the same distance below the new maximum
  if (c.hp != null) c.hp = Math.max(0, c.hp + (dndCalc(c).hpMax - before));
}
function dndLvApply() {
  const c = dndLvFind(); const st = ui.lvl; if (!c || !dndCanEdit(c) || dndLvMissing(c, st).length) return;
  dndLvApplyTo(c, st); c.pendingLevel = 0; dndCommit(c, true);
  ui.modal = null; ui.lvl = null; renderModal(); showNotice(`${dndName(c)} is now level ${c.level}.`);
}
/* which choices a button changes, the character as it stands before that level, and how to redraw */
function dndLvCtx(el) {
  const w = el.dataset.w || "dlg";
  if (w === "dlg") { const c = dndLvFind(); return c && ui.lvl ? { c, st: ui.lvl, done: () => renderModal() } : null; }
  const n = Number(w.slice(2)); const real = dndFind(el); if (!real || !dndCanEdit(real) || !real.build) return null; const b = dndB(real);
  b.levels = b.levels || {}; const st = b.levels[n] = { ...dndLvBlank(), ...(b.levels[n] || {}) };
  return { c: dndBuildSim(real, n - 1), st, done: () => dndCommit(real, true) };
}
Object.assign(A, {
  "dnd-levelup": dndAct(c => { if (!dndLv(c)) { showNotice("Pick a class on the Details tab first."); return false; } dndLvStart(c); return false; }, false),
  "dnd-featopen": dndAct((c, el) => { const key = c.id + ":" + el.dataset.k; ui.dndOpenFeat[key] = !ui.dndOpenFeat[key]; return false; }, false),
  "dnd-lv-set": el => { const x = dndLvCtx(el); if (!x) return; if (el.dataset.k === "cls") { const hp = x.st.hp, roll = x.st.roll; Object.assign(x.st, dndLvBlank(), { cls: el.dataset.v, hp, roll }); x.done(); return; } x.st[el.dataset.k] = el.dataset.v; if (el.dataset.k === "sub") x.st.picks = {}; if (el.dataset.k === "hp" && el.dataset.v === "avg") x.st.roll = null; x.done(); },
  "dnd-lv-roll": el => { const x = dndLvCtx(el); if (!x || x.st.roll) return; const k = dndCalc(x.c); const hd = (DND_CLASSES[dndLvTarget(x.c, x.st).e.cls] || { hd: 8 }).hd; x.st.roll = d(hd);
    Dice.raw(`Hit points for level ${x.c.level + 1}`, `d${hd} (${x.st.roll}) ${sgn(k.mod.con)}`, Math.max(1, x.st.roll + k.mod.con), dndName(x.c), [{ t: "Level up", c: "green" }]); x.done(); },
  "dnd-lv-pick": el => { const x = dndLvCtx(el); if (!x) return; const st = x.st; st.picks = st.picks || {}; const p = el.dataset.pool, v = el.dataset.v, max = Number(el.dataset.max) || 1; const l = st.picks[p] || [];
    st.picks[p] = l.includes(v) ? l.filter(y => y !== v) : l.length < max ? [...l, v] : l; x.done(); },
  "dnd-lv-exp": el => { const x = dndLvCtx(el); if (!x) return; const st = x.st; const v = el.dataset.v; st.exp = st.exp || []; st.exp = st.exp.includes(v) ? st.exp.filter(y => y !== v) : st.exp.length < 2 ? [...st.exp, v] : st.exp; x.done(); },
  "dnd-lv-apply": () => dndLvApply(),
});
Object.assign(CHANGE, {
  "dnd-lv": el => { const x = dndLvCtx(el); if (!x) return; if (el.dataset.k === "cls") { const hp = x.st.hp, roll = x.st.roll; Object.assign(x.st, dndLvBlank(), { cls: el.value, hp, roll }); x.done(); return; } x.st[el.dataset.k] = el.value; if (el.dataset.k === "feat") x.st.featAb = ""; x.done(); },
  "dnd-subpick": el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; const i = Number(el.dataset.ci) || 0; const e = dndClassList(c)[i]; if (!e) return; const v = dndAs(c, e);
    const val = el.value === "__other" ? (dndSubData(v) ? "" : v.subclass) || "Custom" : el.value; if (i === 0) c.subclass = val; else c.multi[i - 1].subclass = val; dndCommit(c, true); },
});
document.addEventListener("input", ev => { const el = ev.target; if (!el.dataset || !el.dataset.lv) return; const x = dndLvCtx(el); if (!x) return; x.st[el.dataset.lv] = el.value;
  if ((el.dataset.w || "dlg") === "dlg") { const b = document.querySelector('[data-act="dnd-lv-apply"]'); if (b) b.disabled = dndLvMissing(x.c, x.st).length > 0; } else x.done(); });
document.addEventListener("change", ev => { const el = ev.target; if (el.dataset && el.dataset.lv && (el.dataset.w || "dlg") === "dlg" && ui.lvl) renderModal(); });
