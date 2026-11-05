/* ============================== D&D 2024: COMPANIONS AND WILD SHAPE ==============================
   The Companions tab: familiars, animal companions, mounts, summons and a Druid's Wild Shape forms,
   each with its own hit points and a stat block that rolls its attacks. A Druid can assume a known
   form: it spends a Wild Shape use and gives temporary hit points equal to the Druid level.
   c.comps: [{id, kind, n, m (stat block name), ac, hp, max, temp, speed, notes}], c.form: the form worn. */

const DND_COMP_KINDS = [["companion", "Companion"], ["familiar", "Familiar"], ["mount", "Mount"], ["summon", "Summon"], ["form", "Wild Shape form"], ["other", "Other"]];
const DND_COMP_KIND = Object.fromEntries(DND_COMP_KINDS);
const dndCrNum = v => { const s = String(v || ""); if (s.includes("/")) { const [a, b] = s.split("/").map(Number); return a / b; } return Number(s) || 0; };
/* what Wild Shape allows now: {cr, fly, known, level} or null */
function dndWildShape(c) {
  const lvl = dndClassLevel(c, "Druid"); if (lvl < 2) return null;
  return { level: lvl, cr: dndCrNum(dndTableVal(c, "Druid", "Wild Shape CR")), fly: lvl >= 8, known: Number(dndTableVal(c, "Druid", "Known Forms")) || 0 };
}
const dndFlies = m => /\bfly\b/i.test(m.speed || "");
const dndCompMon = x => x && x.m ? dndMon(x.m) : null;
Object.assign(ui, { dndCompPick: null, dndCompOpen: {}, dndCompAmt: {} });

function dndCompanionsTab(c, k) {
  const ws = dndWildShape(c); const comps = c.comps || []; const forms = comps.filter(x => x.kind === "form"); const others = comps.filter(x => x.kind !== "form");
  const card = x => {
    const m = dndCompMon(x); const i = comps.indexOf(x); const open = !!ui.dndCompOpen[x.id]; const on = c.form === x.id; const frac = x.max ? x.hp / x.max : 0;
    return `<section class="panel dnd-comp ${on ? "on" : ""}"><div class="panel-b" style="display:grid;gap:10px">
      <div class="row" style="justify-content:space-between;gap:10px;flex-wrap:nowrap">
        <div style="min-width:0;display:grid;gap:2px">${dndText(c, `comps.${i}.n`, x.n, `class="dnd-compname" aria-label="Name"`)}
          <span class="faint dnd-small">${esc([DND_COMP_KIND[x.kind], m ? `${m.size} ${m.type}${m.n !== x.n ? " · " + m.n : ""} · CR ${dndCr(m.cr)}` : "Written in"].filter(Boolean).join(" · "))}</span></div>
        <span class="row" style="gap:6px;flex-wrap:nowrap">${x.kind === "form" && ws ? (on ? `<button class="btn sm danger" data-act="dnd-formoff" ${dndDis(c)}>Return to your form</button>` : `<button class="btn sm primary" data-act="dnd-formon" data-id="${esc(x.id)}" ${dndDis(c)}>Assume form</button>`) : ""}
          ${dndCanEdit(c) ? `<button class="icon-btn" data-act="dnd-del" data-l="comps" data-i="${i}" aria-label="Remove ${esc(x.n)}">×</button>` : ""}</span></div>
      <div class="dnd-compstats">
        <div class="field"><label class="label">AC</label>${dndNum(c, `comps.${i}.ac`, x.ac, `min="0" max="40"`)}</div>
        <div class="field"><label class="label">Hit points</label><div class="row" style="gap:4px;flex-wrap:nowrap">${dndNum(c, `comps.${i}.hp`, x.hp, `min="0" max="${x.max}" aria-label="Current hit points"`)}<span class="faint">/ ${x.max}</span></div>
          <div class="meter"><i style="width:${clamp(frac, 0, 1) * 100}%;background:${typeof dndRingColor === "function" ? dndRingColor(frac) : "var(--ok)"}"></i></div></div>
        <div class="field"><label class="label">Max HP</label>${dndNum(c, `comps.${i}.max`, x.max, `min="1" max="9999"`)}</div>
        <div class="field"><label class="label">Speed</label>${dndText(c, `comps.${i}.speed`, x.speed, `placeholder="30 ft."`)}</div>
        <div class="row dnd-cbdmg" style="align-self:end"><input type="number" min="0" class="dnd-cbamt" data-compamt="${esc(x.id)}" value="${esc(ui.dndCompAmt[x.id] || "")}" placeholder="0" aria-label="Amount for ${esc(x.n)}" ${dndDis(c)}>
          <button class="btn sm danger" data-act="dnd-comphit" data-id="${esc(x.id)}" ${dndDis(c)}>Dmg</button><button class="btn sm" data-act="dnd-compheal" data-id="${esc(x.id)}" ${dndDis(c)}>Heal</button></div>
      </div>
      <div class="field"><label class="label">Notes</label>${dndText(c, `comps.${i}.notes`, x.notes, `placeholder="Tricks it knows, what it's carrying"`)}</div>
      ${m ? `<button class="linkish dnd-more" data-act="dnd-compopen" data-id="${esc(x.id)}">${open ? "Hide the stat block" : "Stat block and attacks"}</button>${open ? dndStatBlock(m, null, { attr: `data-comp="${esc(x.id)}"`, who: x.n }) : ""}` : ""}
    </div></section>`; };
  const formHead = ws ? `<section class="panel"><div class="panel-h"><h3>Wild Shape</h3><span class="row" style="gap:6px">
      <span class="chip ${forms.length > ws.known ? "red" : "ink"}">Known forms ${forms.length} / ${ws.known}</span><span class="chip ink">Up to CR ${dndCr(ws.cr)}</span><span class="chip ink">${ws.fly ? "Flying forms allowed" : "No flying forms yet"}</span>
      ${dndCanEdit(c) ? `<button class="btn sm primary" data-act="dnd-comppick" data-k="form">+ Learn a form</button>` : ""}</span></div>
    <div class="panel-b"><p class="faint dnd-small" style="margin:0">Assuming a form spends a use of Wild Shape and gives you ${ws.level} temporary hit points. You use the beast's AC, speed, Strength, Dexterity, Constitution and attacks, and keep your own hit points, mind and features.</p></div></section>
    <div class="dnd-comps">${forms.map(card).join("")}</div>` : "";
  return `<div class="dnd-acttop row"><span class="faint dnd-small">Familiars, animal companions, mounts and summons, with their own hit points and attacks.</span>
      ${dndCanEdit(c) ? `<span class="row" style="gap:6px"><button class="btn sm primary" data-act="dnd-comppick" data-k="companion">+ Add from the bestiary</button><button class="btn sm" data-act="dnd-compcustom">+ Write one in</button></span>` : ""}</div>
    ${formHead}
    <div class="dnd-comps">${others.map(card).join("") || (ws ? "" : `<div class="empty" style="margin:0"><h3>No companions yet</h3><p class="muted" style="margin:0">Add a familiar from Find Familiar, a steed, an animal companion or a summoned creature. The bestiary here has the beasts up to Challenge Rating 2${ROLE === "gm" ? " and every monster" : ""}, plus homebrew.</p></div>`)}</div>`;
}
/* the banner on the Sheet tab while in a Wild Shape form */
function dndFormBanner(c) {
  const x = (c.comps || []).find(y => y.id === c.form); if (!x) return ""; const m = dndCompMon(x);
  return `<div class="banner dnd-formbanner"><b>In ${esc(x.n)} form</b> (Wild Shape): AC ${x.ac} · Speed ${esc(x.speed || (m && m.speed) || "—")}${m ? ` · STR ${m.ab.str} DEX ${m.ab.dex} CON ${m.ab.con}` : ""}.
    <button class="btn sm" data-act="dnd-tab" data-t="comps">Its attacks</button> <button class="btn sm danger" data-act="dnd-formoff" ${dndDis(c)}>Return to your form</button></div>`;
}

/* ---------- adding from the bestiary ---------- */
function dndCompPickBody() {
  const p = ui.dndCompPick; const c = p && (ROLE === "gm" ? pc(p.cid) : S.chars.get(p.cid)); if (!c) return "";
  const ws = dndWildShape(c); const q = (p.q || "").toLowerCase();
  let list = dndMonList().filter(m => !q || m.n.toLowerCase().includes(q));
  if (p.k === "form") list = list.filter(m => /^Beast/.test(m.type) && (p.any || (ws && m.cr <= ws.cr && (ws.fly || !dndFlies(m)))));
  else if (p.filter === "familiar") list = list.filter(m => /^Beast/.test(m.type) && m.cr === 0);
  else if (p.filter === "beast") list = list.filter(m => /^Beast/.test(m.type));
  list = list.slice().sort((a, b) => a.cr - b.cr || a.n.localeCompare(b.n));
  return `<div class="dnd-pick">
    <div class="row dnd-pickfilters"><input id="dnd-comp-q" data-compq="1" value="${esc(p.q || "")}" placeholder="Search, e.g. wolf or owl" aria-label="Search">
      ${p.k === "form" ? `<label class="row dnd-small" style="gap:6px"><input type="checkbox" data-act-change="dnd-company" ${p.any ? "checked" : ""}>Show every beast (your GM allows it)</label>`
        : `<select data-act-change="dnd-compfilter" aria-label="Show"><option value="">Everything</option><option value="beast" ${p.filter === "beast" ? "selected" : ""}>Beasts</option><option value="familiar" ${p.filter === "familiar" ? "selected" : ""}>Familiars (CR 0 beasts)</option></select>
          <select data-act-change="dnd-compkind" aria-label="Kind">${DND_COMP_KINDS.filter(([v]) => v !== "form").map(([v, l]) => `<option value="${v}" ${p.kind === v ? "selected" : ""}>${l}</option>`).join("")}</select>`}</div>
    ${p.k === "form" && ws ? `<p class="faint dnd-small" style="margin:0">Beasts up to CR ${dndCr(ws.cr)}${ws.fly ? "" : " without a Fly Speed"}.</p>` : ""}
    <div class="dnd-picklist">${list.slice(0, 150).map(m => { const open = !!(p.open || {})[m.n];
      return `<div class="dnd-pickrow ${open ? "open" : ""}"><button class="linkish dnd-pickname" data-act="dnd-compview" data-v="${esc(m.n)}"><b>${esc(m.n)}</b>
          <span class="faint dnd-small">CR ${dndCr(m.cr)} · ${esc(m.size)} ${esc(m.type)} · AC ${m.ac} · HP ${m.hp} · ${esc(m.speed)}</span></button>
        <button class="btn sm primary" data-act="dnd-compadd" data-v="${esc(m.n)}">Add</button>
        ${open ? `<div class="dnd-pickdetail">${dndStatBlock(m, null)}</div>` : ""}</div>`; }).join("") || `<p class="faint">Nothing matches.</p>`}</div></div>`;
}
MODALS.dndcomp = () => ui.dndCompPick ? { title: ui.dndCompPick.k === "form" ? "Learn a Wild Shape form" : "Add a companion", body: dndCompPickBody(), wide: true } : null;
const dndCompChar = () => { const p = ui.dndCompPick; return p ? (ROLE === "gm" ? pc(p.cid) : S.chars.get(p.cid)) : null; };
function dndCompFind(el) { const c = dndFind(el); const x = c && (c.comps || []).find(y => y.id === el.dataset.id); return { c, x }; }
DND_MON_CTX.push(el => { if (!el.dataset.comp) return null; const c = dndFind(el); const x = c && (c.comps || []).find(y => y.id === el.dataset.comp); return x ? { mon: dndCompMon(x), who: x.n } : null; });
Object.assign(A, {
  "dnd-comppick": dndAct((c, el) => { ui.dndCompPick = { cid: c.id, k: el.dataset.k, kind: "companion", q: "", filter: "", any: false, open: {} }; ui.modal = "dndcomp"; renderModal(); return false; }),
  "dnd-compview": el => { const p = ui.dndCompPick; if (!p) return; p.open[el.dataset.v] = !p.open[el.dataset.v]; renderModal(); },
  "dnd-compadd": el => { const c = dndCompChar(); const p = ui.dndCompPick; const m = dndMon(el.dataset.v); if (!c || !m || !dndCanEdit(c)) return;
    c.comps.push({ id: uid(), kind: p.k === "form" ? "form" : p.kind || "companion", n: m.n, m: m.n, ac: m.ac, hp: m.hp, max: m.hp, temp: 0, speed: m.speed, notes: "" });
    dndCommit(c, true); renderModal(); showNotice(`${m.n} added${p.k === "form" ? " to your Wild Shape forms" : ""}.`); },
  "dnd-compcustom": dndAct(c => { const x = { id: uid(), kind: "other", n: "", m: "", ac: 10, hp: 10, max: 10, temp: 0, speed: "30 ft.", notes: "" }; c.comps.push(x);
    setTimeout(() => document.querySelector(`[data-dnd="comps.${c.comps.length - 1}.n"]`)?.focus(), 60); }),
  "dnd-compopen": el => { ui.dndCompOpen[el.dataset.id] = !ui.dndCompOpen[el.dataset.id]; render(); },
  "dnd-comphit": el => dndCompAmount(el, false), "dnd-compheal": el => dndCompAmount(el, true),
  "dnd-formon": dndAct((c, el) => { const x = (c.comps || []).find(y => y.id === el.dataset.id); const ws = dndWildShape(c); if (!x || !ws) return false;
    const r = dndResources(c).find(y => y.k === "ws"); if (!r || r.used >= r.max) { showNotice("No uses of Wild Shape left. You get one back on a short rest."); return false; }
    c.res.ws = r.used + 1; c.form = x.id; c.hpTemp = Math.max(c.hpTemp || 0, ws.level); x.hp = x.max;
    showNotice(`${dndName(c)} becomes a ${x.n}, with ${ws.level} temporary hit points.`); }),
  "dnd-formoff": dndAct(c => { if (!c.form) return false; c.form = ""; showNotice(`${dndName(c)} returns to their own form.`); }),
});
function dndCompAmount(el, heal) { const { c, x } = dndCompFind(el); if (!c || !x || !dndCanEdit(c)) return; const n = Math.max(0, Math.floor(Number(ui.dndCompAmt[x.id]) || 0)); if (!n) return;
  if (heal) x.hp = Math.min(x.max, x.hp + n); else { const t = Math.min(x.temp || 0, n); x.temp -= t; x.hp = Math.max(0, x.hp - (n - t)); if (!x.hp && c.form === x.id) { c.form = ""; showNotice(`The ${x.n} form drops to 0 hit points and ${dndName(c)} returns to their own form.`); } }
  ui.dndCompAmt[x.id] = ""; dndCommit(c, true); }
Object.assign(CHANGE, {
  "dnd-compfilter": el => { if (ui.dndCompPick) { ui.dndCompPick.filter = el.value; renderModal(); } },
  "dnd-compkind": el => { if (ui.dndCompPick) ui.dndCompPick.kind = el.value; },
  "dnd-company": el => { if (ui.dndCompPick) { ui.dndCompPick.any = el.checked; renderModal(); } },
});
document.addEventListener("input", ev => { const el = ev.target; if (!el.dataset) return;
  if (el.dataset.compq && ui.dndCompPick) { ui.dndCompPick.q = el.value; renderModal(); }
  if (el.dataset.compamt) ui.dndCompAmt[el.dataset.compamt] = el.value; });
document.addEventListener("keydown", ev => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.compamt) { ev.preventDefault(); document.querySelector(`[data-act="dnd-comphit"][data-id="${ev.target.dataset.compamt}"]`)?.click(); } });
