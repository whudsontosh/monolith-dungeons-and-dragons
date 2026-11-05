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
const DND_REST_TEXT = { short: "All back on a short or long rest", short1: "One back on a short rest, all on a long rest", long: "All back on a long rest" };

/* the character's resources now: [{k, n, max, used, rest, note}] */
function dndResources(c) {
  const list = DND_RES[c.cls] || []; if (!list.length) return [];
  const k = dndCalc(c); const table = Object.fromEntries(dndTableAt(c, c.level));
  return list.map(r => {
    if (r.from && c.level < r.from) return null;
    const max = r.col ? Number(table[r.col]) || 0 : r.max(c, k);
    if (!max) return null;
    const rest = typeof r.rest === "function" ? r.rest(c) : r.rest;
    return { k: r.k, n: r.n, max, used: Math.min(max, (c.res || {})[r.k] || 0), rest, note: r.note ? r.note(c) : "" };
  }).filter(Boolean);
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
  const list = dndResources(c); if (!list.length) return "";
  return `<section class="panel"><div class="panel-h"><h3>Class resources</h3></div><div class="panel-b dnd-res">${list.map(r => {
    const left = r.max - r.used;
    const ctl = r.max <= 12
      ? `<span class="row" style="gap:5px">${Array.from({ length: r.max }, (_, i) => dndPip(i < left, "dnd-res", `data-k="${r.k}" data-i="${i}"`, `${r.n} ${i + 1}`)).join("")}</span>`
      : `<span class="row" style="gap:4px;flex-wrap:nowrap"><button class="icon-btn" data-act="dnd-resstep" data-k="${r.k}" data-d="1" aria-label="Spend one" ${left ? "" : "disabled"} ${dndDis(c)}>−</button>
          <input type="number" class="dnd-respool" data-act-change="dnd-respool" data-k="${r.k}" min="0" max="${r.max}" value="${left}" aria-label="${esc(r.n)} left" ${dndDis(c)}>
          <button class="icon-btn" data-act="dnd-resstep" data-k="${r.k}" data-d="-1" aria-label="Get one back" ${r.used ? "" : "disabled"} ${dndDis(c)}>+</button></span>`;
    return `<div class="dnd-resrow"><div style="min-width:0"><b>${esc(r.n)}</b> <span class="faint dnd-small">${left} of ${r.max}</span>
        <div class="faint dnd-small">${esc([r.note, DND_REST_TEXT[r.rest]].filter(Boolean).join(" · "))}</div></div>${ctl}</div>`; }).join("")}</div></section>`;
}
Object.assign(A, {
  "dnd-res": dndAct((c, el) => { const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return false; const i = Number(el.dataset.i); const left = r.max - r.used;
    c.res = c.res || {}; c.res[r.k] = i < left ? r.used + 1 : Math.max(0, r.used - 1); }),
  "dnd-resstep": dndAct((c, el) => { const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return false; c.res = c.res || {}; c.res[r.k] = clamp(r.used + Number(el.dataset.d), 0, r.max); }),
});
CHANGE["dnd-respool"] = el => { const c = dndFind(el); if (!c || !dndCanEdit(c)) return; const r = dndResources(c).find(x => x.k === el.dataset.k); if (!r) return;
  c.res = c.res || {}; c.res[r.k] = clamp(r.max - (Math.round(Number(el.value)) || 0), 0, r.max); dndCommit(c, true); };
