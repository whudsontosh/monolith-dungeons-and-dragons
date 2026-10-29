/* ============================== D&D 2024: THE CHARACTER CREATOR ==============================
   A step-by-step builder in the spirit of D&D Beyond: Class, Background, Species, Abilities,
   Equipment, then Name & finish. Each step starts as a grid of cards; picking one opens its
   details with the choices it asks for, and each step's tab counts the choices still open.

   While a character is being built, every choice lives in c.build (nothing else changes). Finish
   turns those choices into the real sheet (dndFinishBuild) and clears c.build. */

const DND_STEPS = [["class", "Class"], ["bg", "Background"], ["species", "Species"], ["abilities", "Abilities"], ["equip", "Equipment"], ["review", "Name & finish"]];
const DND_SKILL_NAME = Object.fromEntries(DND_SKILLS.map(([k, n]) => [k, n]));

function dndNewBuild() {
  return { step: "class", level: 1, cls: "", clsSkills: [], expertise: [],
    bg: "", cAbs: [], cSkills: [], cFeat: "", cTool: "", bgMode: "21", plus2: "", plus1: "",
    species: "", lineage: "", keen: "", skillful: "", versatile: "", skilled: [],
    method: "array", arr: {}, pb: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, rolls: [], man: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    choices: {}, armor: "", shield: false, weapons: [], gear: "", gp: 0,
    name: "", alignment: "", player: "", appearance: "", notes: "", color: "" };
}
function dndB(c) { const b = { ...dndNewBuild(), ...(c.build || {}) }; c.build = b; return b; }

/* ---------- what the choices add up to ---------- */
function dndBgOf(b) {
  if (b.bg === "Custom") return { abs: b.cAbs, skills: b.cSkills, tool: b.cTool, feat: b.cFeat, custom: true };
  return DND_BG_INFO[b.bg] || null;
}
function dndFeatsOf(b) { const bg = dndBgOf(b); return [bg && bg.feat, b.species === "Human" && b.versatile].filter(Boolean); }
function dndSkilledCount(b) { return dndFeatsOf(b).filter(f => f === "Skilled").length * 3; }
/* every skill the character has, and where it came from */
function dndSkillSources(b) {
  const src = {}; const bg = dndBgOf(b);
  const add = (list, from) => (list || []).forEach(s => { if (s && !src[s]) src[s] = from; });
  add(bg && bg.skills, "background"); add([b.keen, b.skillful].filter(Boolean), "species"); add(b.skilled, "Skilled feat"); add(b.clsSkills, "class");
  return src;
}
function dndPool(b) { return b.method === "roll" ? b.rolls.map(r => r.total) : DND_STANDARD_ARRAY; }
function dndBase(b) {
  const out = {}; const pool = dndPool(b);
  DND_ABILITIES.forEach(([a]) => {
    if (b.method === "point") out[a] = b.pb[a];
    else if (b.method === "manual") out[a] = b.man[a];
    else { const i = b.arr[a]; out[a] = i == null || i === "" || pool[i] == null ? null : pool[i]; } });
  return out;
}
function dndBonus(b) {
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }; const bg = dndBgOf(b); if (!bg) return out;
  if (b.bgMode === "111") (bg.abs || []).forEach(a => { out[a] += 1; });
  else { if (b.plus2) out[b.plus2] += 2; if (b.plus1 && b.plus1 !== b.plus2) out[b.plus1] += 1; }
  return out;
}
function dndTotals(b) { const base = dndBase(b), bon = dndBonus(b); const out = {}; DND_ABILITIES.forEach(([a]) => { out[a] = base[a] == null ? null : Math.min(20, base[a] + bon[a]); }); return out; }
function dndPointsLeft(b) { return 27 - DND_ABILITIES.reduce((s, [a]) => s + (DND_POINT_COST[b.pb[a]] ?? 99), 0); }
function dndArmorAc(b, tot) {
  const dex = dndMod(tot.dex ?? 10); const ar = DND_ARMOR.find(x => x[0] === b.armor);
  let ac;
  if (ar) ac = ar[2] + (ar[3] === 0 ? 0 : ar[3] == null ? dex : Math.min(dex, ar[3]));
  else if (b.cls === "Barbarian") ac = 10 + dex + dndMod(tot.con ?? 10);
  else if (b.cls === "Monk" && !b.shield) ac = 10 + dex + dndMod(tot.wis ?? 10);
  else ac = 10 + dex;
  return ac + (b.shield ? 2 : 0);
}

/* how many choices each step still needs */
function dndOpen(b) {
  const ci = DND_CLASS_INFO[b.cls]; const bg = dndBgOf(b); const sp = DND_SPECIES_INFO[b.species];
  const o = { class: 0, bg: 0, species: 0, abilities: 0, equip: 0, review: 0 };
  if (!ci) o.class = 1; else { o.class += Math.max(0, ci.pick - b.clsSkills.length); if (ci.expertise) o.class += Math.max(0, ci.expertise - b.expertise.length);
    dndL1Picks(b).forEach(p => { o.class += Math.max(0, p.count - ((b.choices || {})[p.pool] || []).length); }); }
  if (!bg) o.bg = 1; else {
    if (bg.custom) { o.bg += Math.max(0, 3 - b.cAbs.length) + Math.max(0, 2 - b.cSkills.length) + (b.cFeat ? 0 : 1); }
    if (b.bgMode === "21") o.bg += (b.plus2 ? 0 : 1) + (b.plus1 && b.plus1 !== b.plus2 ? 0 : 1);
    if (bg.feat === "Skilled") o.bg += Math.max(0, 3 - b.skilled.length); }
  if (!sp) o.species = 1; else {
    if (sp.choice && !b.lineage) o.species++;
    if (sp.skill && !b[sp.skill.key]) o.species++;
    if (sp.feat) { if (!b.versatile) o.species++; else if (b.versatile === "Skilled" && !(bg && bg.feat === "Skilled")) o.species += Math.max(0, dndSkilledCount(b) - b.skilled.length); } }
  const base = dndBase(b); o.abilities = DND_ABILITIES.filter(([a]) => base[a] == null).length + (b.method === "point" && dndPointsLeft(b) < 0 ? 1 : 0);
  if (!b.name.trim()) o.review = 1;
  return o;
}

/* level 1 choices some classes have: a fighting style, a primal order, an invocation */
function dndL1Picks(b) { const L = DND_LEVELS[b.cls]; if (!L) return []; return (L.levels[1] || []).filter(f => f.choose).map(f => ({ pool: f.pool, count: f.choose, options: (L.pools[f.pool] || []).filter(o => dndPrereqLevel(o) <= 1) })); }

/* ---------- the creator page ---------- */
function dndBuilderView(c) {
  const b = dndB(c); const open = dndOpen(b); const step = b.step;
  const left = Object.values(open).reduce((a, n) => a + n, 0);
  const idx = DND_STEPS.findIndex(s => s[0] === step);
  const body = step === "bg" ? dndStepBg(c, b) : step === "species" ? dndStepSpecies(c, b) : step === "abilities" ? dndStepAbilities(c, b)
    : step === "equip" ? dndStepEquip(c, b) : step === "review" ? dndStepReview(c, b, open, left) : dndStepClass(c, b);
  const summary = [b.level > 1 ? `Level ${b.level}` : "", b.lineage && b.species !== "Human" ? b.lineage : b.species, b.cls].filter(Boolean).join(" ");
  return `<div class="dnd dnd-b" data-cid="${esc(c.id)}">
    <div class="roster-head dnd-head">
      <h1><small>Character creator${summary ? " · " + esc(summary) : ""}</small>${esc(b.name || "New character")}</h1>
      <div class="dnd-headtools"><span class="faint dnd-small">${left ? `${left} choice${left === 1 ? "" : "s"} left` : "Ready to finish"}</span>
        <button class="btn sm ghost" data-act="dnd-b-skip" title="Fill in the sheet by hand instead">Skip to the sheet</button></div>
    </div>
    <nav class="dnd-steps" aria-label="Creator steps">${DND_STEPS.map(([id, l], i) => `<button class="${step === id ? "on" : ""} ${open[id] ? "" : "done"}" data-act="dnd-b-step" data-s="${id}">
      <span class="dnd-stepn">${open[id] ? i + 1 : "✓"}</span><span>${l}</span>${open[id] && id !== "equip" ? `<span class="dnd-badge" title="${open[id]} choice${open[id] === 1 ? "" : "s"} left">${open[id]}</span>` : ""}</button>`).join("")}</nav>
    ${body}
    <div class="dnd-b-nav">
      ${idx > 0 ? `<button class="btn" data-act="dnd-b-step" data-s="${DND_STEPS[idx - 1][0]}">← ${DND_STEPS[idx - 1][1]}</button>` : "<span></span>"}
      ${idx < DND_STEPS.length - 1 ? `<button class="btn primary" data-act="dnd-b-step" data-s="${DND_STEPS[idx + 1][0]}">${DND_STEPS[idx + 1][1]} →</button>` : ""}
    </div>
  </div>`;
}

/* a grid of cards to pick from */
function dndCards(key, items, current) {
  return `<div class="dnd-b-cards">${items.map(it => `<button class="dnd-b-card ${current === it.id ? "on" : ""}" data-act="dnd-b-pick" data-k="${key}" data-v="${esc(it.id)}">
    <span class="dnd-emblem" style="background:${esc(it.color || "var(--accent)")}">${esc(it.id.charAt(0))}</span>
    <span class="dnd-b-card-t"><b>${esc(it.name || it.id)}</b><span class="dnd-b-meta">${esc(it.meta || "")}</span><span class="dnd-b-blurb">${esc(it.blurb || "")}</span></span></button>`).join("")}</div>`;
}
/* the header of a chosen card, with a way back to the grid */
function dndChosen(key, title, color, meta, blurb) {
  return `<div class="dnd-b-chosen"><span class="dnd-emblem lg" style="background:${esc(color)}">${esc(title.charAt(0))}</span>
    <div style="min-width:0"><h2>${esc(title)}</h2><div class="dnd-b-meta">${esc(meta)}</div><p>${esc(blurb)}</p></div>
    <button class="btn sm" data-act="dnd-b-pick" data-k="${key}" data-v="">Change</button></div>`;
}
/* a block that asks for some choices, with a counter */
function dndChoice(title, need, have, inner, hint) {
  const left = Math.max(0, need - have);
  return `<section class="dnd-b-choice ${left ? "open" : "done"}"><div class="dnd-b-choice-h"><h3>${esc(title)}</h3>
    <span class="chip ${left ? "red" : "green"}">${left ? `${left} choice${left === 1 ? "" : "s"} left` : "Done"}</span></div>
    ${hint ? `<p class="faint dnd-small" style="margin:0 0 10px">${hint}</p>` : ""}${inner}</section>`;
}
/* skill chips: pick up to max from options; skills from elsewhere show where they came from */
function dndSkillChips(b, key, options, max) {
  const src = dndSkillSources(b); const chosen = b[key];
  return `<div class="dnd-chips">${options.map(s => {
    const on = chosen.includes(s); const elsewhere = !on && src[s];
    const full = !on && chosen.length >= max;
    return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-b-toggle" data-k="${key}" data-v="${s}" data-max="${max}" ${elsewhere || full ? "disabled" : ""} aria-pressed="${on}">
      ${esc(DND_SKILL_NAME[s])}${elsewhere ? `<small>from ${esc(elsewhere)}</small>` : ""}</button>`; }).join("")}</div>`;
}
function dndFacts(rows) { return `<dl class="dnd-facts">${rows.filter(r => r[1]).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>`; }
function dndFeatureList(list) { return `<div class="dnd-feats">${list.map(([n, t]) => `<div class="dnd-feat"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join("")}</div>`; }
const dndArmorText = list => list.length ? list.map(a => a === "shield" ? "shields" : a + " armor").join(", ").replace(/^./, x => x.toUpperCase()) : "None";
const dndWeaponText = k => ({ simple: "Simple weapons", martial: "Simple and martial weapons", monk: "Simple weapons, and martial weapons with the Light property", rogue: "Simple weapons, and martial weapons with the Finesse or Light property" })[k] || "";

/* ----- 1. Class ----- */
function dndStepClass(c, b) {
  const ci = DND_CLASS_INFO[b.cls];
  if (!ci) return `<p class="dnd-b-lead">Your class is your adventurer's calling: how they fight, what they're good at, and whether they cast spells. Pick one to see what it gives you.</p>
    ${dndCards("cls", Object.keys(DND_CLASS_INFO).map(n => ({ id: n, color: DND_CLASSES[n].color, meta: `d${DND_CLASSES[n].hd} hit die · ${DND_CLASS_INFO[n].primary}`, blurb: DND_CLASS_INFO[n].blurb })), b.cls)}`;
  const cl = DND_CLASSES[b.cls]; const opts = ci.skills === "any" ? DND_SKILLS.map(s => s[0]) : ci.skills;
  const profSkills = Object.keys(dndSkillSources(b));
  return `${dndChosen("cls", b.cls, cl.color, `d${cl.hd} hit die · Primary: ${ci.primary}`, ci.blurb)}
    <div class="dnd-b-cols">
      <div style="display:grid;gap:14px;align-content:start">
        <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Starting level</h3></div>
          <div class="row"><select data-dnd="build.level" data-num aria-label="Starting level">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}" ${b.level === i + 1 ? "selected" : ""}>Level ${i + 1}</option>`).join("")}</select>
          <span class="faint dnd-small">Most campaigns start at level 1. ${b.level > 1 ? `After Finish you'll make the choices for levels 2 to ${b.level} one level at a time: hit points, subclass, ability increases and feats.` : ""}</span></div></section>
        ${dndChoice(`Skill proficiencies: choose ${ci.pick}`, ci.pick, b.clsSkills.length, dndSkillChips(b, "clsSkills", opts, ci.pick), ci.skills === "any" ? "Bards can pick any skills." : "")}
        ${ci.expertise ? dndChoice(`Expertise: choose ${ci.expertise}`, ci.expertise, b.expertise.length,
          profSkills.length ? `<div class="dnd-chips">${profSkills.map(s => { const on = b.expertise.includes(s); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-b-toggle" data-k="expertise" data-v="${s}" data-max="${ci.expertise}" ${!on && b.expertise.length >= ci.expertise ? "disabled" : ""}>${esc(DND_SKILL_NAME[s])}</button>`; }).join("")}</div>` : `<p class="faint dnd-small" style="margin:0">Choose your skill proficiencies first.</p>`,
          "Double your proficiency bonus with two skills you're proficient in.") : ""}
        ${dndL1Picks(b).map(p => { const have = (b.choices || {})[p.pool] || []; return dndChoice(`${p.pool}: choose ${p.count}`, p.count, have.length,
          `<div class="dnd-chips">${p.options.map(o => { const on = have.includes(o.n); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-b-choice" data-pool="${esc(p.pool)}" data-v="${esc(o.n)}" data-max="${p.count}" ${!on && have.length >= p.count ? "disabled" : ""}>${esc(o.n)}</button>`; }).join("")}</div>
          ${have.map(h => { const o = p.options.find(x => x.n === h); return o ? `<p class="dnd-small" style="margin:10px 0 0"><b>${esc(o.n)}.</b> ${esc(dndFirstRule(o.t).slice(0, 360))}</p>` : ""; }).join("")}`); }).join("")}
        <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Level 1 features</h3></div>${dndFeatureList(ci.features)}
          ${ci.spells ? `<p class="faint dnd-small" style="margin:10px 0 0">At level 1 you know ${ci.spells[0] ? `${ci.spells[0]} cantrips and ` : ""}prepare ${ci.spells[1]} spells. Add them on the sheet's Spells tab once you finish.</p>` : ""}</section>
      </div>
      <div style="display:grid;gap:14px;align-content:start">
      <section class="panel"><div class="panel-h"><h3>Proficiencies</h3></div><div class="panel-b">${dndFacts([
        ["Saving throws", cl.saves.map(a => DND_AB_NAME[a]).join(", ")], ["Armor", esc(dndArmorText(ci.armor))], ["Weapons", esc(dndWeaponText(ci.weapons))], ["Tools", esc(ci.tools)],
        ["Hit points at level 1", `${cl.hd} + your Constitution modifier`], ["Spellcasting", cl.caster === "none" ? "" : esc(DND_CASTERS[cl.caster] + " · " + DND_AB_NAME[cl.spell])]])}</div></section>
      ${dndLevelTable(b.cls, b.level)}
      </div>
    </div>`;
}

/* the class's 20 levels at a glance, like the table in the book */
function dndLevelTable(cls, upTo) {
  const L = DND_LEVELS[cls]; if (!L) return "";
  const rows = []; for (let l = 1; l <= 20; l++) { const fs = (L.levels[l] || []).filter(f => !f.choose).map(f => f.sub ? "Subclass" : f.n);
    const own = esc([...new Set(fs)].join(", "));
    const sub = L.sub && (L.sub.levels[l] || []).length ? `<span class="faint">${own ? " · " : ""}${esc(L.sub.n)}: ${esc(L.sub.levels[l].map(f => f.n).join(", "))}</span>` : "";
    rows.push(`<tr class="${l <= upTo ? "now" : ""}"><td class="dnd-n">${l}</td><td class="dnd-n">${sgn(dndProf(l))}</td><td>${own || sub ? own + sub : `<span class="faint">Class table improvements</span>`}</td></tr>`); }
  return `<section class="panel"><div class="panel-h"><h3>${esc(cls)} levels</h3><span class="faint dnd-small">${esc(L.sub ? "Subclass in the free rules: " + L.sub.n : "")}</span></div>
    <div class="tbl-wrap dnd-lvtable"><table><thead><tr><th>Level</th><th>Prof.</th><th>Features</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></section>`;
}

/* ----- 2. Background ----- */
function dndStepBg(c, b) {
  const bg = dndBgOf(b);
  if (!bg) return `<p class="dnd-b-lead">Your background is what you did before adventuring. It gives you two skills, a tool, an origin feat, and raises three of your ability scores.</p>
    ${dndCards("bg", Object.keys(DND_BG_INFO).map(n => { const x = DND_BG_INFO[n]; return { id: n, name: n === "Custom" ? "Custom background" : n, color: n === "Custom" ? "#8a745b" : "#7a1f12",
      meta: x.custom ? "Your own choices" : `${x.skills.map(s => DND_SKILL_NAME[s]).join(", ")} · ${x.feat}`, blurb: x.blurb }; }), b.bg)}`;
  const info = DND_BG_INFO[b.bg];
  const abs = bg.abs || [];
  const abChips = (key, cur, other) => `<select data-dnd="build.${key}" aria-label="${key === "plus2" ? "+2 to" : "+1 to"}"><option value="">Choose…</option>${abs.map(a => `<option value="${a}" ${cur === a ? "selected" : ""} ${other === a ? "disabled" : ""}>${DND_AB_NAME[a]}</option>`).join("")}</select>`;
  const increase = abs.length === 3 ? `<div class="seg" style="margin-bottom:10px">${[["21", "+2 and +1"], ["111", "+1 to all three"]].map(([m, l]) => `<button class="${b.bgMode === m ? "on" : ""}" data-act="dnd-b-set" data-k="bgMode" data-v="${m}">${l}</button>`).join("")}</div>
    ${b.bgMode === "21" ? `<div class="row"><label class="row" style="gap:6px"><b>+2</b> ${abChips("plus2", b.plus2, b.plus1)}</label><label class="row" style="gap:6px"><b>+1</b> ${abChips("plus1", b.plus1, b.plus2)}</label></div>`
      : `<p style="margin:0">+1 to ${abs.map(a => DND_AB_NAME[a]).join(", ")}.</p>`}` : `<p class="faint dnd-small" style="margin:0">Pick the three abilities above first.</p>`;
  const custom = bg.custom ? `
    ${dndChoice("Abilities: choose 3", 3, b.cAbs.length, `<div class="dnd-chips">${DND_ABILITIES.map(([a, n]) => { const on = b.cAbs.includes(a); return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-b-toggle" data-k="cAbs" data-v="${a}" data-max="3" ${!on && b.cAbs.length >= 3 ? "disabled" : ""}>${n}</button>`; }).join("")}</div>`)}
    ${dndChoice("Skill proficiencies: choose 2", 2, b.cSkills.length, dndSkillChips(b, "cSkills", DND_SKILLS.map(s => s[0]), 2))}
    ${dndChoice("Origin feat", 1, b.cFeat ? 1 : 0, `<select data-dnd="build.cFeat"><option value="">Choose a feat…</option>${Object.keys(DND_FEATS).map(f => `<option ${b.cFeat === f ? "selected" : ""}>${f}</option>`).join("")}</select>${b.cFeat ? `<p class="faint dnd-small" style="margin:8px 0 0">${esc(DND_FEATS[b.cFeat])}</p>` : ""}`)}
    <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Tool proficiency</h3></div>${dndText(c, "build.cTool", b.cTool, `placeholder="e.g. Smith's Tools"`)}</section>` : "";
  return `${dndChosen("bg", b.bg === "Custom" ? "Custom background" : b.bg, b.bg === "Custom" ? "#8a745b" : "#7a1f12", bg.custom ? "Your own choices" : `${info.skills.map(s => DND_SKILL_NAME[s]).join(", ")} · ${info.tool}`, info.blurb)}
    <div class="dnd-b-cols"><div style="display:grid;gap:14px;align-content:start">
      ${custom}
      ${dndChoice("Ability score increases", b.bgMode === "21" ? 2 : 0, (b.plus2 ? 1 : 0) + (b.plus1 && b.plus1 !== b.plus2 ? 1 : 0), increase, abs.length === 3 ? `Raise ${abs.map(a => DND_AB_NAME[a]).join(", ")}: +2 to one and +1 to another, or +1 to all three. No score can go above 20.` : "")}
      ${bg.feat === "Skilled" ? dndChoice("Skilled: choose 3 skills", 3, b.skilled.length, dndSkillChips(b, "skilled", DND_SKILLS.map(s => s[0]), 3)) : ""}
    </div>
    ${!bg.custom ? `<section class="panel"><div class="panel-h"><h3>What it gives you</h3></div><div class="panel-b">${dndFacts([
      ["Skill proficiencies", info.skills.map(s => DND_SKILL_NAME[s]).join(", ")], ["Tool proficiency", esc(info.tool)],
      ["Origin feat", `<b>${esc(info.feat)}${info.featNote ? ` (${esc(info.featNote)})` : ""}</b><br><span class="faint">${esc(DND_FEATS[info.feat])}</span>`],
      ["Abilities", abs.map(a => DND_AB_NAME[a]).join(", ")]])}</div></section>` : "<span></span>"}</div>`;
}

/* ----- 3. Species ----- */
function dndStepSpecies(c, b) {
  const sp = DND_SPECIES_INFO[b.species];
  if (!sp) return `<p class="dnd-b-lead">Your species shapes your body and some of your gifts: darkvision, resistances, speed and special traits.</p>
    ${dndCards("species", Object.keys(DND_SPECIES_INFO).map(n => ({ id: n, color: "#5b4636", meta: `${DND_SPECIES_INFO[n].size || "Medium"} · ${DND_SPECIES_INFO[n].speed} ft`, blurb: DND_SPECIES_INFO[n].blurb })), b.species)}`;
  const bg = dndBgOf(b);
  const choice = sp.choice ? dndChoice(sp.choice.label, 1, b.lineage ? 1 : 0, `<select data-dnd="build.lineage"><option value="">Choose…</option>${sp.choice.options.map(o => `<option ${b.lineage === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`) : "";
  const skill = sp.skill ? dndChoice(`${sp.skill.label}: choose 1 skill`, 1, b[sp.skill.key] ? 1 : 0,
    `<div class="dnd-chips">${(sp.skill.options === "any" ? DND_SKILLS.map(s => s[0]) : sp.skill.options).map(s => { const src = dndSkillSources(b); const on = b[sp.skill.key] === s; const elsewhere = !on && src[s];
      return `<button class="dnd-chip ${on ? "on" : ""}" data-act="dnd-b-set" data-k="${sp.skill.key}" data-v="${on ? "" : s}" ${elsewhere ? "disabled" : ""}>${esc(DND_SKILL_NAME[s])}${elsewhere ? `<small>from ${esc(elsewhere)}</small>` : ""}</button>`; }).join("")}</div>`) : "";
  const feat = sp.feat ? dndChoice("Versatile: an origin feat", 1, b.versatile ? 1 : 0, `<select data-dnd="build.versatile"><option value="">Choose a feat…</option>${Object.keys(DND_FEATS).map(f => `<option ${b.versatile === f ? "selected" : ""}>${f}</option>`).join("")}</select>
      ${b.versatile ? `<p class="faint dnd-small" style="margin:8px 0 0">${esc(DND_FEATS[b.versatile])}${bg && bg.feat === b.versatile && b.versatile !== "Skilled" ? " <b>Your background already gives you this feat; most feats can only be taken once.</b>" : ""}</p>` : ""}`) : "";
  const skilled = sp.feat && b.versatile === "Skilled" ? dndChoice(`Skilled: choose ${dndSkilledCount(b)} skills`, dndSkilledCount(b), b.skilled.length, dndSkillChips(b, "skilled", DND_SKILLS.map(s => s[0]), dndSkilledCount(b))) : "";
  return `${dndChosen("species", b.species, "#5b4636", `${sp.size || "Medium"} · Speed ${b.lineage === "Wood Elf" ? 35 : sp.speed} ft`, sp.blurb)}
    <div class="dnd-b-cols"><div style="display:grid;gap:14px;align-content:start">${choice}${skill}${feat}${skilled}
      ${!choice && !skill && !feat ? `<section class="dnd-b-choice done"><div class="dnd-b-choice-h"><h3>No choices to make</h3><span class="chip green">Done</span></div><p class="faint dnd-small" style="margin:0">${esc(b.species)} traits are all fixed.</p></section>` : ""}</div>
      <section class="panel"><div class="panel-h"><h3>Traits</h3></div><div class="panel-b">${dndFeatureList(sp.traits)}</div></section></div>`;
}

/* ----- 4. Abilities ----- */
function dndRoll4d6() { const r = [d(6), d(6), d(6), d(6)]; const low = Math.min(...r); const i = r.indexOf(low); return { dice: r, drop: i, total: r.reduce((a, n) => a + n, 0) - low }; }
function dndStepAbilities(c, b) {
  const base = dndBase(b), bon = dndBonus(b), tot = dndTotals(b); const pool = dndPool(b);
  const used = Object.entries(b.arr).filter(([, v]) => v !== null && v !== "").map(([a, v]) => [a, Number(v)]);
  const methods = [["array", "Standard array"], ["point", "Point buy"], ["roll", "Roll 4d6"], ["manual", "Enter scores"]];
  const card = ([a, n]) => {
    let input;
    if (b.method === "point") input = `<div class="row dnd-pb" style="gap:6px;justify-content:center"><button class="icon-btn" data-act="dnd-b-pb" data-a="${a}" data-d="-1" ${b.pb[a] <= 8 ? "disabled" : ""} aria-label="Lower ${n}">−</button><b>${b.pb[a]}</b>
      <button class="icon-btn" data-act="dnd-b-pb" data-a="${a}" data-d="1" ${b.pb[a] >= 15 || (DND_POINT_COST[b.pb[a] + 1] - DND_POINT_COST[b.pb[a]]) > dndPointsLeft(b) ? "disabled" : ""} aria-label="Raise ${n}">+</button></div>`;
    else if (b.method === "manual") input = dndNum(c, `build.man.${a}`, b.man[a], `min="1" max="20" aria-label="${n} base score"`);
    else input = `<select data-dnd="build.arr.${a}" data-num aria-label="${n} base score" ${b.method === "roll" && !pool.length ? "disabled" : ""}><option value="">—</option>${pool.map((v, i) => `<option value="${i}" ${String(b.arr[a]) === String(i) ? "selected" : ""} ${used.some(([x, j]) => x !== a && j === i) ? "disabled" : ""}>${v}</option>`).join("")}</select>`;
    return `<div class="dnd-b-ab ${tot[a] == null ? "empty" : ""}"><span class="label">${n}</span>
      <b class="dnd-b-tot">${tot[a] == null ? "—" : tot[a]}</b><span class="dnd-b-mod">${tot[a] == null ? "" : sgn(dndMod(tot[a]))}</span>
      ${input}<span class="faint dnd-small">${bon[a] ? `+${bon[a]} background` : "&nbsp;"}</span></div>`; };
  const ci = DND_CLASS_INFO[b.cls];
  return `<p class="dnd-b-lead">Six scores describe your character's body and mind. Choose a way to set them; your background's increases are added on top.</p>
    <div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div class="seg">${methods.map(([m, l]) => `<button class="${b.method === m ? "on" : ""}" data-act="dnd-b-method" data-v="${m}">${l}</button>`).join("")}</div>
      <div class="row" style="gap:8px">
        ${b.method === "point" ? `<span class="chip ${dndPointsLeft(b) < 0 ? "red" : dndPointsLeft(b) ? "amber" : "green"}">${dndPointsLeft(b)} of 27 points left</span>` : ""}
        ${b.method === "roll" ? `<button class="btn sm primary" data-act="dnd-b-roll">${b.rolls.length ? "Roll again" : "Roll six scores"}</button>` : ""}
        ${ci && b.method === "array" ? `<button class="btn sm" data-act="dnd-b-suggest">Use the suggested ${esc(b.cls)} scores</button>` : ""}
      </div></div>
    ${b.method === "roll" && b.rolls.length ? `<div class="dnd-rolls">${b.rolls.map(r => `<span class="dnd-rollchip"><b>${r.total}</b><span class="faint">${r.dice.map((x, i) => i === r.drop ? `<s>${x}</s>` : x).join(" ")}</span></span>`).join("")}</div>` : ""}
    <p class="faint dnd-small" style="margin:0 0 12px">${b.method === "array" ? "Give each number (15, 14, 13, 12, 10, 8) to one ability." : b.method === "point" ? "Every score starts at 8. Spend 27 points; higher scores cost more, and 15 is the most you can buy." : b.method === "roll" ? "Each score is four six-sided dice, dropping the lowest. Then give each result to an ability." : "Type in scores you rolled at the table or your DM gave you."}
      ${ci ? ` ${esc(b.cls)}s rely most on ${esc(ci.primary)}.` : ""}</p>
    <div class="dnd-b-abs">${DND_ABILITIES.map(card).join("")}</div>`;
}

/* ----- 5. Equipment ----- */
function dndStepEquip(c, b) {
  const ci = DND_CLASS_INFO[b.cls] || { armor: [], weapons: "" }; const tot = dndTotals(b);
  const arProf = t => ci.armor.includes(t);
  const ac = dndArmorAc(b, tot); const ar = DND_ARMOR.find(x => x[0] === b.armor);
  const weaponRow = (w, chosen) => { const prof = dndWeaponProf(b.cls, w); const n = b.weapons.filter(x => x === w[0]).length;
    return `<div class="dnd-wpn ${prof ? "" : "noprof"}"><div style="min-width:0"><b>${esc(w[0])}</b> <span class="faint">${esc(w[1])} ${esc(w[2])}</span>
      <div class="faint dnd-small">${esc([w[3], "Mastery: " + w[4]].filter(Boolean).join(" · "))}${prof ? "" : " · not proficient"}</div></div>
      ${chosen ? `<span class="row" style="gap:4px">${n > 1 ? `<span class="chip ink">×${n}</span>` : ""}<button class="icon-btn" data-act="dnd-b-wpn" data-v="${esc(w[0])}" data-d="-1" aria-label="Remove ${esc(w[0])}">−</button></span>`
        : `<button class="btn sm" data-act="dnd-b-wpn" data-v="${esc(w[0])}" data-d="1">Add</button>`}</div>`; };
  const chosen = [...new Set(b.weapons)].map(n => DND_WEAPONS.find(w => w[0] === n)).filter(Boolean);
  const groups = [["simple", "melee", "Simple melee"], ["simple", "ranged", "Simple ranged"], ["martial", "melee", "Martial melee"], ["martial", "ranged", "Martial ranged"]];
  return `<p class="dnd-b-lead">Pick the armor and weapons from your class and background's starting equipment (or what you buy with your starting gold). The sheet makes an attack for each weapon.</p>
    <div class="dnd-b-cols">
      <div style="display:grid;gap:14px;align-content:start">
        <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Armor</h3><span class="chip ink">AC ${ac}</span></div>
          <div class="row"><select data-dnd="build.armor" aria-label="Armor"><option value="">No armor${b.cls === "Barbarian" ? " (Unarmored Defense: 10 + DEX + CON)" : b.cls === "Monk" ? " (Unarmored Defense: 10 + DEX + WIS)" : " (10 + DEX)"}</option>
            ${["light", "medium", "heavy"].map(t => `<optgroup label="${t[0].toUpperCase() + t.slice(1)} armor${arProf(t) ? "" : " (not proficient)"}">${DND_ARMOR.filter(x => x[1] === t).map(x => `<option value="${esc(x[0])}" ${b.armor === x[0] ? "selected" : ""}>${esc(x[0])}: AC ${x[2]}${x[3] === 0 ? "" : x[3] ? " + DEX (max 2)" : " + DEX"}</option>`).join("")}</optgroup>`).join("")}</select>
          <label class="row dnd-small" style="gap:6px"><input type="checkbox" data-dnd="build.shield" ${b.shield ? "checked" : ""}>Shield (+2 AC)${arProf("shield") ? "" : " · not proficient"}</label></div>
          ${ar && !arProf(ar[1]) ? `<p class="dnd-small" style="margin:8px 0 0;color:var(--bad)">You aren't proficient with ${ar[1]} armor: disadvantage on Strength and Dexterity rolls, and you can't cast spells in it.</p>` : ""}
          ${ar && ar[4] && (tot.str ?? 0) < ar[4] ? `<p class="dnd-small" style="margin:8px 0 0;color:var(--warn)">Needs Strength ${ar[4]}, or your speed drops by 10 ft.</p>` : ""}
          ${ar && ar[5] ? `<p class="faint dnd-small" style="margin:8px 0 0">Disadvantage on Dexterity (Stealth) checks.</p>` : ""}</section>
        <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Your weapons</h3><span class="faint dnd-small">${b.weapons.length} chosen</span></div>
          ${chosen.length ? chosen.map(w => weaponRow(w, true)).join("") : `<p class="faint dnd-small" style="margin:0">None yet. Add them from the list.</p>`}</section>
        <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>Other gear and gold</h3></div>
          <div class="field"><label class="label">Gear, one item per line</label><textarea data-dnd="build.gear" rows="6" placeholder="Explorer's Pack\nRope (50 ft)\nTorch ×10">${esc(b.gear)}</textarea></div>
          <div class="field" style="max-width:180px;margin-top:10px"><label class="label">Gold pieces</label>${dndNum(c, "build.gp", b.gp || "", `min="0" placeholder="0"`)}</div></section>
      </div>
      <section class="panel"><div class="panel-h"><h3>Weapons</h3><span class="faint dnd-small">${esc(dndWeaponText(ci.weapons) || "Pick a class to see your proficiencies")}</span></div>
        <div class="panel-b dnd-wpnlist">${groups.map(([cat, kind, title]) => `<h3 class="dnd-sph">${title}</h3>${DND_WEAPONS.filter(w => w[5] === cat && w[6] === kind).map(w => weaponRow(w, false)).join("")}`).join("")}</div></section>
    </div>`;
}

/* ----- 6. Name & finish ----- */
function dndStepReview(c, b, open, left) {
  const tot = dndTotals(b); const ci = DND_CLASS_INFO[b.cls]; const cl = DND_CLASSES[b.cls]; const bg = dndBgOf(b);
  const conMod = dndMod(tot.con ?? 10); const sp = DND_SPECIES_INFO[b.species];
  const hp = cl ? Math.max(1, cl.hd + conMod + (b.level - 1) * (cl.hd / 2 + 1 + conMod) + (sp && sp.hpPerLvl ? b.level : 0)) : "—";
  const skills = Object.keys(dndSkillSources(b)).sort().map(s => DND_SKILL_NAME[s] + (b.expertise.includes(s) ? " (expertise)" : ""));
  const swatches = ["", "#8a2d1c", "#b08a2e", "#4f6b2f", "#2f6b6b", "#2f4a7a", "#4a2f6b", "#7a3a6e", "#5b4636", "#3a3f4a"];
  const missing = DND_STEPS.filter(([id]) => open[id] && id !== "equip").map(([id, l]) => `<button class="btn sm" data-act="dnd-b-step" data-s="${id}">${l}: ${open[id]} left</button>`).join("");
  return `<div class="dnd-b-cols">
    <div style="display:grid;gap:14px;align-content:start">
      ${dndChoice("Name", 1, b.name.trim() ? 1 : 0, dndText(c, "build.name", b.name, `placeholder="What do people call you?" aria-label="Character name"`))}
      <section class="dnd-b-choice"><div class="dnd-b-choice-h"><h3>About them</h3></div><div class="dnd-form">
        <div class="field"><label class="label">Alignment</label><select data-dnd="build.alignment"><option value="">—</option>${DND_ALIGNMENTS.map(a => `<option ${b.alignment === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
        <div class="field"><label class="label">Player</label>${dndText(c, "build.player", b.player, `placeholder="Your name"`)}</div>
        <div class="field dnd-wide"><label class="label">Appearance & personality</label><textarea data-dnd="build.appearance" rows="3" placeholder="What people notice, how they act">${esc(b.appearance)}</textarea></div>
        <div class="field dnd-wide"><label class="label">Backstory</label><textarea data-dnd="build.notes" rows="4" placeholder="Where they come from, what they want">${esc(b.notes)}</textarea></div>
        <div class="field dnd-wide"><label class="label">Token & card colour</label><div class="swatches">${swatches.map(s => `<button class="swatch ${b.color === s ? "on" : ""}" data-act="dnd-b-set" data-k="color" data-v="${s}" style="background:${s || (cl ? cl.color : "#556070")}" aria-label="${s ? "Colour " + s : "Class colour"}"></button>`).join("")}</div></div>
      </div></section>
    </div>
    <section class="panel dnd-b-review"><div class="panel-h"><h3>Your character</h3></div><div class="panel-b" style="display:grid;gap:14px">
      <div class="dnd-b-revhead"><span class="dnd-emblem lg" style="background:${esc(b.color || (cl ? cl.color : "#556070"))}">${esc((b.name || "?").charAt(0).toUpperCase())}</span>
        <div><h2>${esc(b.name || "Unnamed")}</h2><div class="dnd-b-meta">${esc([`Level ${b.level}`, b.species && (b.lineage && b.species !== "Dragonborn" && b.species !== "Goliath" ? b.lineage : b.species), b.cls].filter(Boolean).join(" ") || "—")}${bg ? " · " + esc(b.bg === "Custom" ? "Custom background" : b.bg) : ""}</div></div></div>
      <div class="dnd-b-revabs">${DND_ABILITIES.map(([a]) => `<div><span class="label">${a.toUpperCase()}</span><b>${tot[a] ?? "—"}</b><span class="faint">${tot[a] == null ? "" : sgn(dndMod(tot[a]))}</span></div>`).join("")}</div>
      ${dndFacts([["Hit points", String(hp)], ["Armor Class", String(dndArmorAc(b, tot))], ["Saving throws", cl ? cl.saves.map(a => DND_AB_NAME[a]).join(", ") : ""],
        ["Skills", esc(skills.join(", "))], ["Feats", esc(dndFeatsOf(b).join(", "))], ["Weapons", esc([...new Set(b.weapons)].join(", "))]])}
      ${left ? `<div class="banner warnb" style="display:grid;gap:8px"><b>A few choices are still open:</b><div class="row" style="gap:6px">${missing}</div></div>` : ""}
      <button class="btn primary dnd-finish" data-act="dnd-b-finish" ${left ? "disabled" : ""}>Finish and open the sheet</button>
    </div></section>
  </div>`;
}

/* ---------- Finish: turn the choices into the sheet ---------- */
function dndFinishBuild(c) {
  const b = dndB(c); const ci = DND_CLASS_INFO[b.cls]; const cl = DND_CLASSES[b.cls]; const bg = dndBgOf(b); const sp = DND_SPECIES_INFO[b.species]; const tot = dndTotals(b);
  c.name = b.name.trim(); c.cls = b.cls; c.level = 1; c.pendingLevel = b.level > 1 ? b.level : 0; c.species = b.species; c.background = b.bg === "Custom" ? "" : b.bg;
  c.alignment = b.alignment; c.player = b.player; c.appearance = b.appearance; c.notes = b.notes; c.color = b.color;
  DND_ABILITIES.forEach(([a]) => { c.ab[a] = tot[a] ?? 10; c.saveProf[a] = cl.saves.includes(a); });
  c.skills = {}; Object.keys(dndSkillSources(b)).forEach(s => { c.skills[s] = b.expertise.includes(s) ? 2 : 1; });
  const feats = dndFeatsOf(b);
  c.alert = feats.includes("Alert"); c.hpPerLvl = sp && sp.hpPerLvl ? sp.hpPerLvl : 0; c.speed = b.lineage === "Wood Elf" ? 35 : 0;
  c.hpMax = 0; c.hp = null; c.hpTemp = 0; c.hdSpent = 0; c.insp = b.species === "Human";
  c.ac = dndArmorAc(b, tot);
  // attacks for each weapon (melee weapons use Strength unless they're finesse; ranged use Dexterity)
  c.attacks = [...new Set(b.weapons)].map(n => { const w = DND_WEAPONS.find(x => x[0] === n); if (!w) return null;
    return { id: uid(), name: w[0], ab: /Finesse/.test(w[3]) ? "fin" : w[6] === "ranged" ? "dex" : "str", prof: dndWeaponProf(b.cls, w), dmg: w[1], type: w[2], bonus: 0, dmgBonus: 0,
      notes: [w[3], `Mastery: ${w[4]}`].filter(Boolean).join(" · ") }; }).filter(Boolean);
  // equipment
  const ar = DND_ARMOR.find(x => x[0] === b.armor);
  c.inv = [];
  if (ar) c.inv.push({ id: uid(), name: ar[0], qty: 1, wt: ar[6], notes: `AC ${ar[2]}${ar[3] === 0 ? "" : ar[3] ? " + DEX (max 2)" : " + DEX"}${ar[4] ? ` · needs STR ${ar[4]}` : ""}${ar[5] ? " · Stealth disadvantage" : ""}` });
  if (b.shield) c.inv.push({ id: uid(), name: "Shield", qty: 1, wt: 6, notes: "+2 AC" });
  const counts = {}; b.weapons.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
  Object.entries(counts).forEach(([n, q]) => c.inv.push({ id: uid(), name: n, qty: q, wt: 0, notes: "" }));
  b.gear.split("\n").map(s => s.trim()).filter(Boolean).forEach(line => { const m = line.match(/^(.*?)\s*[×x]\s*(\d+)$/); c.inv.push({ id: uid(), name: (m ? m[1] : line).slice(0, 80), qty: m ? Number(m[2]) : 1, wt: 0, notes: "" }); });
  c.coins = { cp: 0, sp: 0, ep: 0, gp: Number(b.gp) || 0, pp: 0 };
  // proficiencies and features as text the player can edit
  const tools = [ci.tools, bg.tool].filter(Boolean);
  c.profs = [`Armor: ${dndArmorText(ci.armor)}`, `Weapons: ${dndWeaponText(ci.weapons)}`, tools.length ? `Tools: ${tools.join(", ")}` : "", "Languages: Common, plus two more of your choice"].filter(Boolean).join("\n");
  // class features and feats are listed on the Features tab; the species traits go here
  const lines = [`${b.species}${b.lineage ? ` (${b.lineage})` : ""}`]; sp.traits.forEach(([n, t]) => lines.push(`• ${n}: ${t}`));
  c.features = lines.join("\n");
  c.feats = [];
  if (bg.feat) c.feats.push({ n: bg.feat + (bg.feat === "Magic Initiate" && bg.featNote ? ` (${bg.featNote})` : ""), lvl: 1, src: "Background" });
  if (b.species === "Human" && b.versatile) c.feats.push({ n: b.versatile, lvl: 1, src: "Species" });
  c.choices = {}; Object.entries(b.choices || {}).forEach(([k, v]) => { if (v.length) c.choices[k] = v.slice(); });
  c.hpRolls = {};
  c.done = true; c.build = null;
}

/* ---------- what the creator's buttons do ---------- */
Object.assign(A, {
  "dnd-b-step": dndAct((c, el) => { dndB(c).step = el.dataset.s; setTimeout(() => window.scrollTo(0, 0), 0); }),
  "dnd-b-pick": dndAct((c, el) => {
    const b = dndB(c); const k = el.dataset.k; const v = el.dataset.v;
    if (k === "cls") { b.cls = v; const ci = DND_CLASS_INFO[v]; const ok = ci ? (ci.skills === "any" ? DND_SKILLS.map(s => s[0]) : ci.skills) : [];
      b.clsSkills = b.clsSkills.filter(s => ok.includes(s)).slice(0, ci ? ci.pick : 0); b.expertise = ci && ci.expertise ? b.expertise : []; }
    if (k === "bg") { b.bg = v; const bg = dndBgOf(b); if (!bg || !(bg.abs || []).includes(b.plus2)) b.plus2 = ""; if (!bg || !(bg.abs || []).includes(b.plus1)) b.plus1 = "";
      b.clsSkills = b.clsSkills.filter(s => !(bg && (bg.skills || []).includes(s))); }
    if (k === "species") { b.species = v; b.lineage = ""; b.keen = ""; b.skillful = ""; b.versatile = ""; }
    if (dndSkilledCount(b) < b.skilled.length) b.skilled = b.skilled.slice(0, dndSkilledCount(b));
    b.expertise = b.expertise.filter(s => dndSkillSources(b)[s]);
    if (v) setTimeout(() => window.scrollTo(0, 0), 0); }),
  "dnd-b-toggle": dndAct((c, el) => {
    const b = dndB(c); const k = el.dataset.k; const v = el.dataset.v; const max = Number(el.dataset.max) || 99; const list = b[k];
    if (list.includes(v)) b[k] = list.filter(x => x !== v); else if (list.length < max) b[k] = [...list, v];
    if (k === "cAbs") { if (!b.cAbs.includes(b.plus2)) b.plus2 = ""; if (!b.cAbs.includes(b.plus1)) b.plus1 = ""; }
    b.expertise = b.expertise.filter(s => dndSkillSources(b)[s]); }),
  "dnd-b-set": dndAct((c, el) => { const b = dndB(c); b[el.dataset.k] = el.dataset.v; b.expertise = b.expertise.filter(s => dndSkillSources(b)[s]); }),
  "dnd-b-method": dndAct((c, el) => { const b = dndB(c); if (b.method !== el.dataset.v) { b.method = el.dataset.v; b.arr = {}; } }),
  "dnd-b-suggest": dndAct(c => { const b = dndB(c); const ci = DND_CLASS_INFO[b.cls]; if (!ci) return false; b.method = "array"; b.arr = {};
    const taken = new Set(); DND_ABILITIES.forEach(([a]) => { const i = DND_STANDARD_ARRAY.findIndex((v, j) => v === ci.array[a] && !taken.has(j)); if (i >= 0) { taken.add(i); b.arr[a] = i; } }); }),
  "dnd-b-roll": dndAct(c => { const b = dndB(c); b.rolls = Array.from({ length: 6 }, dndRoll4d6); b.arr = {}; }),
  "dnd-b-pb": dndAct((c, el) => { const b = dndB(c); const a = el.dataset.a; const n = clamp(b.pb[a] + Number(el.dataset.d), 8, 15);
    if (DND_POINT_COST[n] - DND_POINT_COST[b.pb[a]] > dndPointsLeft(b)) return false; b.pb[a] = n; }),
  "dnd-b-wpn": dndAct((c, el) => { const b = dndB(c); const v = el.dataset.v;
    if (Number(el.dataset.d) > 0) { if (b.weapons.length < 30) b.weapons = [...b.weapons, v]; } else { const i = b.weapons.lastIndexOf(v); if (i >= 0) b.weapons = b.weapons.filter((_, j) => j !== i); } }),
  "dnd-b-finish": dndAct(c => { const b = dndB(c); const left = Object.values(dndOpen(b)).reduce((a, n) => a + n, 0); if (left) return false;
    const name = b.name; dndFinishBuild(c); ui.view = "sheet"; ui.dndTab = "sheet"; setTimeout(() => window.scrollTo(0, 0), 0);
    if (c.pendingLevel > 1) setTimeout(() => dndLvStart(c), 0);
    else showNotice(`${name} is ready. Everything's on the sheet now, and you can change any of it.`); }),
  "dnd-b-choice": dndAct((c, el) => { const b = dndB(c); b.choices = b.choices || {}; const p = el.dataset.pool, v = el.dataset.v, max = Number(el.dataset.max) || 1; const l = b.choices[p] || [];
    b.choices[p] = l.includes(v) ? l.filter(x => x !== v) : l.length < max ? [...l, v] : l; }),
  "dnd-b-skip": dndAct(c => { const b = dndB(c);
    if (b.name) c.name = b.name; if (b.cls) { c.cls = b.cls; DND_ABILITIES.forEach(([a]) => { c.saveProf[a] = DND_CLASSES[b.cls].saves.includes(a); }); } if (b.species) c.species = b.species;
    c.level = b.level || 1; c.build = null; ui.view = "sheet"; ui.dndTab = "details"; }),
});
