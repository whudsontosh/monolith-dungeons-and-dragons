/* ============================== D&D 2024: THE ACTIONS TAB ==============================
   Everything a character can do on a turn, sorted the way the rules sort it: Actions, Bonus Actions,
   Reactions and Other. It gathers weapon attacks, spells by casting time, class features and feats
   whose text says how they're used (with their limited uses), species traits, item charges and
   actions you write in yourself. */

const DND_ACT_TYPES = [["action", "Actions"], ["bonus", "Bonus actions"], ["reaction", "Reactions"], ["other", "Other"]];
/* the turn's basic options (2024 rules, in brief) */
const DND_BASIC_ACTIONS = [
  ["Attack", "Make one attack with a weapon or an Unarmed Strike (more with Extra Attack)."], ["Dash", "Gain extra movement equal to your Speed this turn."],
  ["Disengage", "Your movement doesn't provoke Opportunity Attacks this turn."], ["Dodge", "Attacks against you have Disadvantage; you have Advantage on Dexterity saves."],
  ["Help", "Give an ally Advantage on a check, or on an attack against a creature near you."], ["Hide", "Make a DC 15 Dexterity (Stealth) check while out of sight."],
  ["Influence", "Make a Charisma or Wisdom check to change a creature's attitude."], ["Magic", "Cast a spell, use a magic item, or use a magical feature."],
  ["Ready", "Choose a trigger and an action or spell to take with your Reaction."], ["Search", "Make a Wisdom check to notice something."],
  ["Study", "Make an Intelligence check to recall or work out something."], ["Utilize", "Use an object that needs an action."],
];
/* species traits you use, and how */
const DND_SPECIES_ACTS = { breath: "action", stone: "bonus", giant: "other", large: "bonus", adren: "bonus", relent: "other", luck: "other" };

/* how a feature is used, from its text: the earliest of "Bonus Action", "Reaction" or an action */
function dndActType(t) {
  const s = String(t || "").split("\n\n")[0] + " " + String(t || "").split("\n\n").slice(1, 2).join(" ");
  const hits = [["bonus", s.search(/\bBonus Action\b/)], ["reaction", s.search(/\b(take a|use your|as a|expend your) Reaction\b|\bReaction to\b/i)],
    ["action", s.search(/\b(take|use|as|takes?) (a|an|the) (Magic|Utilize|Attack) action\b|\btake an? action\b|\bas an? action\b/i)]].filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
  return hits.length ? hits[0][0] : "";
}
function dndActionList(c, k) {
  const out = []; const res = dndResources(c);
  const resFor = n => res.find(r => r.n === n || r.n.startsWith(n + " (") || (n.startsWith("Channel Divinity") && r.n.startsWith("Channel Divinity")));
  // weapon attacks
  const extra = dndClassList(c).some(e => { const v = dndAs(c, e); for (let l = 1; l <= e.level; l++) if (dndGainsAt(v, l).some(g => /^Extra Attack|^Two Extra Attacks|^Three Extra Attacks/.test(g.f.n))) return true; return false; });
  [...c.attacks.map((a, i) => [a, i]), [dndUnarmed(c), "u"]].forEach(([a, i]) => out.push({ type: "action", kind: "attack", i, a, n: a.name || "Attack", sub: extra ? "Attack action · you can attack more than once" : "Attack action" }));
  // spells you can cast now (cantrips and prepared spells)
  c.spells.forEach((s, i) => { if (s.lvl && !s.prep) return; const ref = dndSpellRef(s.name); const ct = ref ? ref.ct : (s.notes || "").split(" · ")[0];
    const type = /^Bonus Action/i.test(ct) ? "bonus" : /^Reaction/i.test(ct) ? "reaction" : /^Action/i.test(ct) ? "action" : "other";
    out.push({ type, kind: "spell", i, s, ref, n: s.name, sub: [s.lvl ? dndOrdinal(s.lvl) + " level" : "Cantrip", ct, ref && ref.rg].filter(Boolean).join(" · ") }); });
  // class and subclass features
  dndClassList(c).filter(e => e.cls).forEach(e => { const v = dndAs(c, e); const seen = new Set();
    for (let l = 1; l <= e.level; l++) dndGainsAt(v, l).forEach(({ f, src }) => { if (f.sub || f.asi || f.choose || seen.has(f.n)) return; seen.add(f.n);
      const r = resFor(f.n); const type = dndActType(f.t) || (r ? "other" : ""); if (!type) return;
      out.push({ type, kind: "feature", f, r, n: f.n, sub: `${src === "sub" ? v.subclass : e.cls} ${l}` }); });
    // picks such as Eldritch Invocations or Metamagic that are used
    const L = dndLv(v); Object.entries(c.choices || {}).forEach(([pool, picks]) => { const opts = L && L.pools[pool]; if (!opts) return;
      picks.forEach(p => { const o = opts.find(x => x.n === p); if (!o || seen.has(o.n)) return; const type = dndActType(o.t); if (!type) return; seen.add(o.n); out.push({ type, kind: "feature", f: o, n: o.n, sub: pool }); }); }); });
  // feats
  c.feats.forEach(ft => { const d = DND_FEAT_LIST.find(x => x.n === ft.n); if (!d) return; const r = resFor(ft.n === "Lucky" ? "Luck Points" : ft.n); const type = dndActType(d.t) || (r ? "other" : ""); if (!type) return;
    out.push({ type, kind: "feature", f: d, r, n: d.n, sub: "Feat" }); });
  // species traits with uses
  res.filter(r => DND_SPECIES_ACTS[r.k]).forEach(r => { if (out.some(x => x.r === r)) return; out.push({ type: DND_SPECIES_ACTS[r.k], kind: "res", r, n: r.n, sub: c.species }); });
  // items with charges, and equipped magic items you activate
  c.inv.forEach((it, i) => { if (!it.ch) return; out.push({ type: "action", kind: "item", it, i, n: it.name, sub: `Magic item · ${it.ch - it.chUsed} of ${it.ch} charges` }); });
  // written in
  (c.acts || []).forEach((a, i) => out.push({ type: a.type, kind: "custom", a, i, n: a.n || "Untitled", sub: "Your own" }));
  return out;
}
Object.assign(ui, { dndActOpen: {}, dndActBasic: false, dndActFilter: "all" });
function dndActionsTab(c, k) {
  const list = dndActionList(c, k); const f = ui.dndActFilter;
  const row = x => {
    const key = `${c.id}:${x.kind}:${x.n}`; const open = !!ui.dndActOpen[key]; let btns = "", body = "";
    if (x.kind === "attack") { const n = dndAttackNums(c, k, x.a); btns = `<button class="btn sm dnd-hit" data-act="dnd-attack" data-i="${x.i}">${sgn(n.hit)} to hit</button>
        <button class="btn sm" data-act="dnd-dmgroll" data-i="${x.i}" ${n.dmg || x.a.unarmed ? "" : "disabled"}>${esc(n.dmg ? [n.dmg, n.dmgMod ? sgn(n.dmgMod) : ""].join(" ").trim() : String(Math.max(1, n.dmgMod)))}${x.a.type ? " " + esc(x.a.type) : ""}</button>`;
      body = `${x.a.notes || n.notes.length ? `<p class="faint dnd-small" style="margin:0">${esc([x.a.notes, ...n.notes].filter(Boolean).join(" · "))}</p>` : ""}${n.riders.length || n.mast ? `<div class="row dnd-riders">${dndRiderBtns(c, n, x.i)}</div>` : ""}`; }
    if (x.kind === "spell") { const dice = x.ref ? dndSpellDice(c, k, x.ref, x.s) : null; const cs = dndSpellCaster(k, x.s);
      btns = `${x.ref && x.ref.dmg && x.ref.dmg.kind === "save" ? `<span class="chip amber">DC ${cs.dc}</span>` : x.ref && /spell attack/i.test(x.ref.t) ? `<button class="btn sm dnd-hit" data-act="dnd-spellatk" data-c="${esc(cs.cls || "")}">${sgn(cs.atk)} to hit</button>` : ""}
        ${dice ? `<button class="btn sm" data-act="dnd-sproll" data-i="${x.i}">${esc(dice.d)}</button>` : ""}${x.s.lvl ? `<button class="btn sm ghost" data-act="dnd-cast" data-i="${x.i}" ${dndDis(c)}>Cast</button>` : ""}`;
      body = open && x.ref ? `<div class="dnd-ftext">${dndParas(x.ref.t)}</div>` : ""; }
    if (x.kind === "feature" || x.kind === "res") { if (x.r) btns = dndActResCtl(c, x.r);
      if (x.f) body = open ? `<div class="dnd-ftext">${dndParas(x.f.t)}</div>` : `<p class="dnd-fsum">${esc(dndFirstRule(x.f.t).slice(0, 200))}${dndFirstRule(x.f.t).length > 200 ? "…" : ""}</p>`; }
    if (x.kind === "item") { const left = x.it.ch - x.it.chUsed; btns = `<button class="btn sm" data-act="dnd-charge" data-i="${x.i}" data-j="${x.it.ch > 12 ? 0 : left - 1}" ${left && dndCanEdit(c) ? "" : "disabled"}>Use a charge</button>`;
      const ref = dndItemRef(x.it.name); body = open && ref ? `<div class="dnd-ftext">${dndParas(ref.t)}</div>` : ""; }
    if (x.kind === "custom") { const editing = ui.dndEdit === x.a.id;
      btns = dndCanEdit(c) ? `<button class="btn sm ghost" data-act="dnd-edit" data-id="${esc(x.a.id)}">${editing ? "Done" : "Edit"}</button>` : "";
      body = editing ? `<div class="dnd-form" style="grid-template-columns:2fr 1fr auto;margin-top:8px">
          <div class="field"><label class="label">Name</label>${dndText(c, `acts.${x.i}.n`, x.a.n, `placeholder="Shove"`)}</div>
          <div class="field"><label class="label">Uses</label><select data-dnd="acts.${x.i}.type" ${dndDis(c)}>${DND_ACT_TYPES.map(([v, l]) => `<option value="${v}" ${x.a.type === v ? "selected" : ""}>${l.replace(/s$/, "")}</option>`).join("")}</select></div>
          <button class="btn sm danger" data-act="dnd-del" data-l="acts" data-i="${x.i}" style="align-self:end">Remove</button>
          <div class="field" style="grid-column:1/-1"><label class="label">What it does</label><textarea data-dnd="acts.${x.i}.t" rows="3" ${dndDis(c)}>${esc(x.a.t)}</textarea></div></div>`
        : x.a.t ? `<p class="dnd-fsum">${esc(x.a.t)}</p>` : ""; }
    const more = (x.kind === "feature" && x.f && (x.f.t || "").length > 200) || (x.kind === "spell" && x.ref) || (x.kind === "item" && dndItemRef(x.it.name));
    return `<div class="dnd-actrow"><div class="dnd-actmain"><div style="min-width:0"><b>${esc(x.n)}</b><span class="faint dnd-small">${esc(x.sub || "")}</span></div><span class="row dnd-actbtns">${btns}</span></div>
      ${body}${more ? `<button class="linkish dnd-more" data-act="dnd-actopen" data-k="${esc(key)}">${open ? "Show less" : "Read more"}</button>` : ""}</div>`;
  };
  const groups = DND_ACT_TYPES.filter(([t]) => f === "all" || f === t).map(([t, l]) => { const xs = list.filter(x => x.type === t);
    const basics = t === "action" ? DND_BASIC_ACTIONS : t === "bonus" ? [["Two-Weapon Fighting", "After attacking with a Light weapon, attack with a different Light weapon in your other hand (no ability modifier to damage)."]] : t === "reaction" ? [["Opportunity Attack", "When a creature you can see leaves your reach, make one melee attack against it."]] : [];
    return `<section class="panel"><div class="panel-h"><h3>${l}</h3><span class="faint dnd-small">${xs.length}</span></div><div class="panel-b dnd-actlist">
      ${xs.map(row).join("") || `<p class="faint dnd-small" style="margin:0">Nothing of yours yet.</p>`}
      ${basics.length ? `<details class="dnd-basic" ${ui.dndActBasic ? "open" : ""}><summary class="faint dnd-small">Anyone can: ${esc(basics.map(b => b[0]).join(", "))}</summary>
        ${basics.map(([n, t2]) => `<div class="dnd-small"><b>${esc(n)}.</b> ${esc(t2)}</div>`).join("")}</details>` : ""}
    </div></section>`; }).join("");
  return `<div class="dnd-acttop row"><div class="seg">${[["all", "All"], ...DND_ACT_TYPES].map(([v, l]) => `<button class="${f === v ? "on" : ""}" data-act="dnd-actfilter" data-v="${v}">${l}</button>`).join("")}</div>
      ${dndCanEdit(c) ? `<button class="btn sm" data-act="dnd-actadd">+ Write in an action</button>` : ""}</div>
    <div class="dnd-actgrid">${groups}</div>`;
}
/* the pips for a resource, right on its feature */
function dndActResCtl(c, r) {
  const left = r.max - r.used;
  return r.max <= 12 ? `<span class="row" style="gap:5px" title="${esc(r.n)}: ${left} of ${r.max}">${Array.from({ length: r.max }, (_, i) => dndPip(i < left, "dnd-res", `data-k="${r.k}" data-i="${i}"`, `${r.n} ${i + 1}`)).join("")}</span>`
    : `<span class="chip ink">${left} / ${r.max}</span><button class="icon-btn" data-act="dnd-resstep" data-k="${r.k}" data-d="1" ${left ? "" : "disabled"} ${dndDis(c)} aria-label="Spend one">−</button>`;
}
Object.assign(A, {
  "dnd-actfilter": el => { ui.dndActFilter = el.dataset.v; render(); },
  "dnd-actopen": el => { ui.dndActOpen[el.dataset.k] = !ui.dndActOpen[el.dataset.k]; render(); },
  "dnd-actadd": dndAct(c => { const a = { id: uid(), n: "", type: "action", t: "" }; c.acts.push(a); ui.dndEdit = a.id;
    setTimeout(() => document.querySelector(`[data-dnd="acts.${c.acts.length - 1}.n"]`)?.focus(), 60); }),
});
