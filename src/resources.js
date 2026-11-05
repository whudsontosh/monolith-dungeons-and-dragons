/* ============================== D&D 2024: CLASS RESOURCES ==============================
   The things a class spends and gets back on a rest: Rage, Bardic Inspiration, Channel Divinity,
   Wild Shape, Second Wind, Action Surge, Focus Points, Lay on Hands, Sorcery Points and so on.
   How many you have comes from the class table (col) or a rule (max); rest says what a rest does:
     "short"  = all back on a short or long rest
     "short1" = one back on a short rest, all back on a long rest
     "long"   = all back on a long rest
   c.res holds how many of each have been used. */

const DND_RES = {
  Barbarian: [{ k: "rage", n: "Rage", col: "Rages", rest: "short1" }],
  Bard: [{ k: "insp", n: "Bardic Inspiration", max: (c, k) => Math.max(1, k.mod.cha), rest: c => c.level >= 5 ? "short" : "long", note: c => `Inspiration die ${(dndTableAt(c, c.level).find(x => x[0] === "Inspiration Die") || [, "d6"])[1]}` }],
  Cleric: [{ k: "cd", n: "Channel Divinity", col: "Channel Divinity", rest: "short1" }, { k: "di", n: "Divine Intervention", from: 10, max: () => 1, rest: "long" }],
  Druid: [{ k: "ws", n: "Wild Shape", col: "Wild Shape Uses", rest: "short1" }],
  Fighter: [{ k: "sw", n: "Second Wind", col: "Second Wind", rest: "short1", note: c => `Regain 1d10 + ${c.level} HP` },
    { k: "as", n: "Action Surge", col: "Action Surge", rest: "short" }, { k: "ind", n: "Indomitable", col: "Indomitable", rest: "long" }],
  Monk: [{ k: "focus", n: "Focus Points", col: "Focus Points", rest: "short" }],
  Paladin: [{ k: "loh", n: "Lay on Hands", max: c => 5 * c.level, rest: "long", note: () => "Hit points of healing in the pool" }, { k: "cd", n: "Channel Divinity", col: "Channel Divinity", rest: "short1" }],
  Ranger: [{ k: "fe", n: "Favored Enemy", col: "Favored Enemy", rest: "long", note: () => "Hunter's Mark without a spell slot" }],
  Rogue: [{ k: "luck", n: "Stroke of Luck", from: 20, max: () => 1, rest: "short" }],
  Sorcerer: [{ k: "sp", n: "Sorcery Points", col: "Sorcery Points", rest: "long" }, { k: "is", n: "Innate Sorcery", max: () => 2, rest: "long" }],
  Warlock: [{ k: "mc", n: "Magical Cunning", from: 2, max: () => 1, rest: "long", note: () => "Regain half your Pact Magic slots" }],
  Wizard: [{ k: "ar", n: "Arcane Recovery", max: () => 1, rest: "long", note: c => `Regain slots worth up to ${Math.ceil(c.level / 2)} levels after a short rest` }],
};
/* species traits and feats with limited uses (2024): pb = your proficiency bonus */
const DND_RES_SPECIES = {
  Dragonborn: [{ k: "breath", n: "Breath Weapon", max: (c, k) => k.pb, rest: "long" }],
  Dwarf: [{ k: "stone", n: "Stonecunning", max: (c, k) => k.pb, rest: "long", note: () => "Tremorsense 60 ft for 10 minutes" }],
  Goliath: [{ k: "giant", n: "Giant Ancestry", max: (c, k) => k.pb, rest: "long" }, { k: "large", n: "Large Form", from: 5, max: () => 1, rest: "long" }],
  Orc: [{ k: "adren", n: "Adrenaline Rush", max: (c, k) => k.pb, rest: "short", note: c => `Dash as a Bonus Action and gain ${dndProf(c.level)} temporary HP` }, { k: "relent", n: "Relentless Endurance", max: () => 1, rest: "long" }],
};
const DND_RES_FEATS = { Lucky: [{ k: "luck", n: "Luck Points", max: (c, k) => k.pb, rest: "long" }] };
const DND_REST_TEXT = { short: "All back on a short or long rest", short1: "One back on a short rest, all on a long rest", long: "All back on a long rest", dawn: "Back at dawn", none: "Doesn't come back on its own" };

/* the character's resources now: [{k, n, max, used, rest, note, src}], from every class, the species and feats */
function dndResources(c) {
  const k = dndCalc(c); const out = [];
  dndClassList(c).forEach(e => { const list = DND_RES[e.cls] || []; if (!list.length) return; const v = dndAs(c, e); const table = Object.fromEntries(dndTableAt(v, e.level));
    list.forEach(r => {
      if (r.from && e.level < r.from) return;
      const max = r.col ? Number(table[r.col]) || 0 : r.max(v, k); if (!max) return;
      const key = e.i === 0 || !out.some(x => x.k === r.k) ? r.k : `${e.cls.toLowerCase()}-${r.k}`;
      const rest = typeof r.rest === "function" ? r.rest(v) : r.rest;
      out.push({ k: key, n: out.some(x => x.n === r.n) ? `${r.n} (${e.cls})` : r.n, max, used: Math.min(max, (c.res || {})[key] || 0), rest, note: r.note ? r.note(v) : "", src: e.cls }); }); });
  const extra = [...Object.entries(DND_RES_SPECIES).filter(([sp]) => new RegExp(`\\b${sp}\\b`, "i").test(c.species || "")).flatMap(([, l]) => l),
    ...Object.entries(DND_RES_FEATS).filter(([f]) => (c.feats || []).some(x => x.n === f)).flatMap(([, l]) => l)];
  extra.forEach(r => { if (r.from && c.level < r.from) return; const max = r.max(c, k); if (!max || out.some(x => x.k === r.k)) return;
    out.push({ k: r.k, n: r.n, max, used: Math.min(max, (c.res || {})[r.k] || 0), rest: r.rest, note: r.note ? r.note(c) : "", src: "" }); });
  return out;
}
/* what a rest does to them */
function dndRestResources(c, kind) {
  c.res = c.res || {};
  dndResources(c).forEach(r => {
    if (kind === "long" || r.rest === "short") c.res[r.k] = 0;
    else if (r.rest === "short1") c.res[r.k] = Math.max(0, (c.res[r.k] || 0) - 1);
  });
}
function dndResourcesPanel(c) {
  const list = dndResources(c); const tr = c.trackers || [];
  if (!list.length && !tr.length && !dndCanEdit(c)) return "";
  return `<section class="panel"><div class="panel-h"><h3>${list.length ? "Class resources" : "Limited uses"}</h3>${dndCanEdit(c) ? `<button class="btn sm ghost" data-act="dnd-trkadd" title="Track something else with limited uses">+ Track</button>` : ""}</div><div class="panel-b dnd-res">${list.map(r => {
    const left = r.max - r.used;
    const ctl = r.max <= 12
      ? `<span class="row" style="gap:5px">${Array.from({ length: r.max }, (_, i) => dndPip(i < left, "dnd-res", `data-k="${r.k}" data-i="${i}"`, `${r.n} ${i + 1}`)).join("")}</span>`
      : `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="icon-btn" data-act="dnd-resstep" data-k="${r.k}" data-d="1" aria-label="Spend one" ${left ? "" : "disabled"} ${dndDis(c)}>−</button>
          <input type="number" class="dnd-respool" data-act-change="dnd-respool" data-k="${r.k}" min="0" max="${r.max}" value="${left}" aria-label="${esc(r.n)} left" ${dndDis(c)}>
          <button class="icon-btn" data-act="dnd-resstep" data-k="${r.k}" data-d="-1" aria-label="Get one back" ${r.used ? "" : "disabled"} ${dndDis(c)}>+</button></span>`;
    return `<div class="dnd-resrow"><div style="min-width:0"><b>${esc(r.n)}</b> <span class="faint dnd-small">${left} of ${r.max}</span>
        <div class="faint dnd-small">${esc([r.note, DND_REST_TEXT[r.rest]].filter(Boolean).join(" · "))}</div></div>${ctl}</div>`; }).join("")}
    ${tr.map((t, i) => dndTrackerRow(c, t, i)).join("")}
    ${!list.length && !tr.length ? `<p class="faint dnd-small" style="margin:0">Nothing to track yet. Use + Track for a feat, item or ability with limited uses.</p>` : ""}</div></section>`;
}
/* a limited use you track yourself */
function dndTrackerRow(c, t, i) {
  const left = t.max - t.used; const open = ui.dndEdit === t.id; const dis = dndDis(c);
  const ctl = t.max <= 12 ? `<span class="row" style="gap:5px">${Array.from({ length: t.max }, (_, j) => dndPip(j < left, "dnd-trk", `data-i="${i}" data-j="${j}"`, `${t.n || "Use"} ${j + 1}`)).join("")}</span>`
    : `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="icon-btn" data-act="dnd-trkstep" data-i="${i}" data-d="1" ${left ? "" : "disabled"} ${dis} aria-label="Spend one">−</button><b>${left}</b><button class="icon-btn" data-act="dnd-trkstep" data-i="${i}" data-d="-1" ${t.used ? "" : "disabled"} ${dis} aria-label="Get one back">+</button></span>`;
  return `<div class="dnd-resrow dnd-trk"><div style="min-width:0"><b>${esc(t.n || "Untitled")}</b> <span class="faint dnd-small">${left} of ${t.max}</span>
      <div class="faint dnd-small">${esc([t.note, DND_REST_TEXT[t.rest]].filter(Boolean).join(" · "))}</div></div>
      <span class="row" style="gap:6px;flex-wrap:nowrap">${ctl}${dndCanEdit(c) ? `<button class="btn sm ghost" data-act="dnd-edit" data-id="${esc(t.id)}">${open ? "Done" : "Edit"}</button>` : ""}</span></div>
    ${open ? `<div class="dnd-trkedit dnd-form" style="grid-template-columns:2fr 1fr 1.4fr auto">
      <div class="field"><label class="label">Name</label>${dndText(c, `trackers.${i}.n`, t.n, `placeholder="Lucky"`)}</div>
      <div class="field"><label class="label">Uses</label>${dndNum(c, `trackers.${i}.max`, t.max, `min="1" max="999"`)}</div>
      <div class="field"><label class="label">Comes back</label><select data-dnd="trackers.${i}.rest" ${dis}>${["short", "long", "dawn", "none"].map(r => `<option value="${r}" ${t.rest === r ? "selected" : ""}>${{ short: "Short or long rest", long: "Long rest", dawn: "At dawn", none: "Never" }[r]}</option>`).join("")}</select></div>
      <button class="btn sm danger" data-act="dnd-del" data-l="trackers" data-i="${i}" style="align-self:end">Remove</button>
      <div class="field" style="grid-column:1/-1"><label class="label">Note</label>${dndText(c, `trackers.${i}.note`, t.note, `placeholder="What it does"`)}</div></div>` : ""}`;
}
Object.assign(A, {
  "dnd-trkadd": dndAct(c => { const t = { id: uid(), n: "", max: 1, used: 0, rest: "long", note: "" }; c.trackers.push(t); ui.dndEdit = t.id;
    setTimeout(() => document.querySelector(`[data-dnd="trackers.${c.trackers.length - 1}.n"]`)?.focus(), 60); }),
  "dnd-trk": dndAct((c, el) => { const t = c.trackers[Number(el.dataset.i)]; if (!t) return false; const j = Number(el.dataset.j); const left = t.max - t.used; t.used = j < left ? t.used + 1 : Math.max(0, t.used - 1); }),
  "dnd-trkstep": dndAct((c, el) => { const t = c.trackers[Number(el.dataset.i)]; if (!t) return false; t.used = clamp(t.used + Number(el.dataset.d), 0, t.max); }),
  "dnd-res": dndAct((c, el) => { const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return false; const i = Number(el.dataset.i); const left = r.max - r.used;
    c.res = c.res || {}; c.res[r.k] = i < left ? r.used + 1 : Math.max(0, r.used - 1); }),
  "dnd-resstep": dndAct((c, el) => { const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return false; c.res = c.res || {}; c.res[r.k] = clamp(r.used + Number(el.dataset.d), 0, r.max); }),
});
CHANGE["dnd-respool"] = el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return;
  c.res = c.res || {}; c.res[r.k] = clamp(r.max - (Math.round(Number(el.value)) || 0), 0, r.max); dndCommit(c, true); };
