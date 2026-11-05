/* ============================== D&D 2024: THE GM'S HOMEBREW TAB ==============================
   The GM's library of homebrew packs (kept in this app, shared by every campaign), the editor,
   "In this campaign" (the packs players get when they join), saving pack files and opening them.
   Only the GM's page loads this file. The pack format and the rules registry are in homebrew.js. */

const HB_GM_KEY = "gm-homebrew";
let HLIB = (() => { const o = Monolith.store.get(HB_GM_KEY, {}) || {}; const out = {}; Object.entries(o).forEach(([id, p]) => { if (p && typeof p === "object") out[id] = p; }); return out; })();
const hbCache = {}; let hbT = null; const hbDirty = new Set();
function hbClean(p) { const k = p.id + ":" + p.rev; if (!(k in hbCache)) { try { hbCache[k] = hbSanitize(p).pack; } catch (e) { hbCache[k] = null; } } return hbCache[k]; }
function hbTouch(id) { hbDirty.add(id); clearTimeout(hbT); hbT = setTimeout(hbPersist, 500); Object.keys(hbCache).forEach(k => { if (k.startsWith(id + ":")) delete hbCache[k]; }); HB_KEY = null; }
function hbPersist() { clearTimeout(hbT); hbT = null; const changed = [...hbDirty]; hbDirty.clear();
  changed.forEach(id => { const p = HLIB[id]; if (p) { p.rev = (Number(p.rev) || 1) + 1; p.updated = Date.now(); } });
  if (!Monolith.store.set(HB_GM_KEY, HLIB)) showNotice("Browser storage is full, so homebrew changes couldn't be saved.");
  HB_KEY = null; if (changed.some(id => (st.packs || []).includes(id))) hbBroadcastSoon(); requestRender(); }
window.addEventListener("beforeunload", () => { if (hbT) hbPersist(); });
function hbCampaignPacks() { return (st && st.packs || []).map(id => HLIB[id]).filter(Boolean).map(hbClean).filter(Boolean); }
function hbGmActivate() { if (!st) return; hbActivate([...hbCampaignPacks(), ...(st.party || []).map(hbCarried)]); }

/* ---------- sending the campaign's homebrew to players ---------- */
function hbSendRules(conn, peek) { if (typeof gameSendTo !== "function") return; const from = st.campaign.name || "your GM";
  hbCampaignPacks().forEach(p => gameSendTo(conn, "hbpack", { pack: p, from }));
  gameSendTo(conn, "hbrules", { peek: !!peek, campaign: { id: st.campaign.uid, name: st.campaign.name || "Campaign" }, packIds: hbCampaignPacks().map(p => p.id) }); }
let hbBT = null;
function hbBroadcastSoon() { clearTimeout(hbBT); hbBT = setTimeout(() => { if (typeof Host === "undefined" || Host.status !== "online") return; for (const conn of Host.conns.keys()) hbSendRules(conn, false); }, 400); }
function hbUse(id, on) { const s = new Set(st.packs || []); if (on) s.add(id); else s.delete(id); st.packs = [...s]; save(); HB_KEY = null; hbBroadcastSoon(); requestRender(); }

/* ---------- the editor ---------- */
const HB_NEW = {
  subclasses: () => ({ cls: "Fighter", n: "New subclass", t: "", caster: "", features: [{ lvl: 3, n: "", t: "", uses: "", rest: "long" }] }),
  species: () => ({ n: "New species", blurb: "", size: "Medium", speed: 30, dv: 0, res: [], hpPerLvl: 0, traits: [{ n: "", t: "" }], uses: [] }),
  backgrounds: () => ({ n: "New background", blurb: "", abs: ["str", "dex", "con"], skills: ["athletics", "perception"], tool: "", feat: "", gp: 50 }),
  feats: () => ({ n: "New feat", cat: "general", lvl: 4, rep: false, ab: true, t: "" }),
  spells: () => ({ n: "New spell", l: 1, sch: "Evocation", cls: ["Wizard"], ct: "Action", rg: "60 feet", cmp: "V, S", dur: "Instantaneous", conc: false, rit: false, t: "", dmg: null }),
  items: () => ({ n: "New item", cat: "Wondrous item", rar: "Uncommon", att: false, wt: 0, cost: "", t: "", wpn: null, arm: null, fx: {}, ch: 0, chRest: "dawn" }),
  monsters: () => ({ n: "New monster", size: "Medium", type: "Monstrosity", al: "Unaligned", ac: 12, hp: 22, hpf: "4d8 + 4", speed: "30 ft.", cr: 1, init: 1, ab: { str: 12, dex: 12, con: 12, int: 6, wis: 10, cha: 6 },
    senses: "Passive Perception 10", lang: "", res: [], imm: [], vul: [], traits: [], actions: [{ n: "Bite", t: "Melee Attack Roll: +3, reach 5 ft. Hit: 5 (1d8 + 1) Piercing damage.", hit: 3, dmg: "1d8+1 piercing", dc: "", sv: "" }], bonus: [], reactions: [] }),
};
Object.assign(ui, { hbSel: null, hbSec: "subclasses", hbIdx: null });
const hbPack = () => HLIB[ui.hbSel] || null;
const hbEntry = () => { const p = hbPack(); return p && ui.hbIdx != null ? (p[ui.hbSec] || [])[ui.hbIdx] || null : null; };
function hbBaseClash(sec, e) { const n = String(e.n || "").trim().toLowerCase(); if (!n) return "";
  const has = { subclasses: () => (DND_LEVELS[e.cls] && DND_LEVELS[e.cls].sub && DND_LEVELS[e.cls].sub.n.toLowerCase() === n), species: () => HB_BASE.species.some(x => x.toLowerCase() === n),
    backgrounds: () => HB_BASE.bgs.some(x => x.toLowerCase() === n), feats: () => DND_FEAT_LIST.slice(0, HB_BASE.feats).some(x => x.n.toLowerCase() === n),
    spells: () => DND_SPELLS.slice(0, HB_BASE.spells).some(x => x.n.toLowerCase() === n), items: () => DND_ITEMS.slice(0, HB_BASE.items).some(x => x.n.toLowerCase() === n),
    monsters: () => (typeof DND_MONSTERS !== "undefined" ? DND_MONSTERS.slice(0, HB_BASE.monsters ?? DND_MONSTERS.length) : []).some(x => x.n.toLowerCase() === n) }[sec];
  return has && has() ? "This has the same name as one in the free rules, so it won't be added. Rename it." : ""; }
function hbSummary(sec, e) {
  if (sec === "subclasses") return `${e.cls} · ${(e.features || []).filter(f => f.n).length} features`;
  if (sec === "species") return `${e.size} · ${e.speed} ft${e.dv ? ` · darkvision ${e.dv} ft` : ""}`;
  if (sec === "backgrounds") return `${(e.abs || []).map(a => String(a).toUpperCase()).join(", ")}${e.feat ? " · " + e.feat : ""}`;
  if (sec === "feats") return (HB_FEAT_CATS.find(c => c[0] === e.cat) || [, ""])[1];
  if (sec === "spells") return `${Number(e.l) ? dndOrdinal(Number(e.l)) + " level" : "Cantrip"} · ${e.sch}`;
  if (sec === "items") return [e.cat, e.rar].filter(Boolean).join(" · ");
  if (sec === "monsters") return `CR ${dndCr(Number(e.cr))} · ${e.type} · AC ${e.ac} · HP ${e.hp}`;
  return ""; }
/* form fields: data-hbe is the path inside the entry; data-t says how to read it (num, bool, list) */
function hbF(label, path, val, o = {}) {
  const span = o.span ? ` style="grid-column:span ${o.span}"` : ""; const t = o.t ? ` data-t="${o.t}"` : ""; const ph = o.ph ? ` placeholder="${esc(o.ph)}"` : "";
  let ctl;
  if (o.ta) ctl = `<textarea data-hbe="${path}" rows="${o.rows || 3}"${ph}>${esc(val ?? "")}</textarea>`;
  else if (o.sel) ctl = `<select data-hbe="${path}"${t}>${o.sel.map(x => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(val ?? "") === String(v) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  else if (o.t === "bool") return `<label class="row dnd-small" style="gap:6px;align-self:end;padding-bottom:9px"${span}><input type="checkbox" data-hbe="${path}" data-t="bool" ${val ? "checked" : ""}>${esc(label)}</label>`;
  else ctl = `<input data-hbe="${path}"${t} ${o.t === "num" ? `type="number"${o.min != null ? ` min="${o.min}"` : ""}${o.max != null ? ` max="${o.max}"` : ""}${o.step ? ` step="${o.step}"` : ""}` : ""} value="${esc(Array.isArray(val) ? val.join(", ") : val ?? "")}"${ph}${o.list ? ` list="${o.list}"` : ""}>`;
  return `<div class="field"${span}><label class="label">${esc(label)}</label>${ctl}${o.help ? `<span class="faint dnd-small">${esc(o.help)}</span>` : ""}</div>`;
}
const hbChecks = (label, path, opts, cur) => `<div class="field" style="grid-column:1/-1"><span class="label">${esc(label)}</span><div class="dnd-chips">${opts.map(([v, l]) => `<label class="dnd-chip ${(cur || []).includes(v) ? "on" : ""}"><input type="checkbox" data-hbck="${path}" value="${esc(v)}" ${(cur || []).includes(v) ? "checked" : ""} hidden>${esc(l)}</label>`).join("")}</div></div>`;
const hbRows = (label, path, rows, f, addLabel) => `<div class="field" style="grid-column:1/-1"><span class="label">${esc(label)}</span><div class="dnd-hbrows">${(rows || []).map((r, i) => `<div class="dnd-hbrowed">${f(r, i)}<button class="icon-btn" data-act="hbg-rowdel" data-path="${path}" data-i="${i}" aria-label="Remove">×</button></div>`).join("")}
  <button class="btn sm" data-act="hbg-rowadd" data-path="${path}">+ ${esc(addLabel)}</button></div></div>`;
const HB_USES_HELP = "A number, PB (proficiency bonus) or an ability, like CHA for your Charisma modifier";
const HB_REST_OPTS = [["long", "Long rest"], ["short", "Short or long rest"], ["dawn", "At dawn"], ["none", "Never"]];
function hbForm(sec, e) {
  const clash = hbBaseClash(sec, e); const warn = clash ? `<div class="banner" style="margin:0;border-left-color:var(--bad)">${esc(clash)}</div>` : "";
  const name = hbF("Name", "n", e.n, { span: 2 }); const abOpts = DND_ABILITIES.map(([a, n]) => [a, n]);
  if (sec === "subclasses") return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Class", "cls", e.cls, { sel: Object.keys(DND_CLASSES) })}${hbF("Spellcasting", "caster", e.caster, { sel: [["", "Uses the class's own"], ["third", "Casts like an Eldritch Knight (third caster)"]] })}
    ${hbF("Description", "t", e.t, { ta: 1, span: 4, ph: "Shown when players pick a subclass" })}
    ${hbRows("Features", "features", e.features, (f, i) => `<div class="dnd-form" style="grid-template-columns:70px 1fr 1fr 1fr">${hbF("Level", `features.${i}.lvl`, f.lvl, { t: "num", min: 1, max: 20 })}${hbF("Name", `features.${i}.n`, f.n)}
      ${hbF("Uses", `features.${i}.uses`, f.uses, { ph: "None", help: i === 0 ? HB_USES_HELP : "" })}${hbF("Uses come back", `features.${i}.rest`, f.rest, { sel: HB_REST_OPTS })}${hbF("What it does", `features.${i}.t`, f.t, { ta: 1, span: 4 })}</div>`, "Add a feature")}</div>`;
  if (sec === "species") return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Size", "size", e.size, { sel: HB_SIZES })}${hbF("Speed (ft)", "speed", e.speed, { t: "num", min: 0, max: 120 })}
    ${hbF("Darkvision (ft)", "dv", e.dv, { t: "num", min: 0, max: 300 })}${hbF("Extra HP per level", "hpPerLvl", e.hpPerLvl, { t: "num", min: 0, max: 5 })}${hbF("One-line description", "blurb", e.blurb, { span: 2 })}
    ${hbChecks("Damage resistances", "res", DND_DAMAGE.map(t => [t, t]), e.res)}
    ${hbRows("Traits", "traits", e.traits, (t, i) => `<div class="dnd-form" style="grid-template-columns:1fr 2fr">${hbF("Trait", `traits.${i}.n`, t.n)}${hbF("What it does", `traits.${i}.t`, t.t, { ta: 1, rows: 2 })}</div>`, "Add a trait")}
    ${hbRows("Limited uses", "uses", e.uses, (u, i) => `<div class="dnd-form" style="grid-template-columns:2fr 1fr 1fr">${hbF("Name", `uses.${i}.n`, u.n)}${hbF("Uses", `uses.${i}.max`, u.max, { ph: "PB", help: HB_USES_HELP })}${hbF("Come back", `uses.${i}.rest`, u.rest, { sel: HB_REST_OPTS })}</div>`, "Add a limited use")}</div>`;
  if (sec === "backgrounds") return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("One-line description", "blurb", e.blurb, { span: 2 })}
    ${[0, 1, 2].map(i => hbF(`Ability ${i + 1}`, `abs.${i}`, (e.abs || [])[i], { sel: abOpts })).join("")}<div></div>
    ${[0, 1].map(i => hbF(`Skill ${i + 1}`, `skills.${i}`, (e.skills || [])[i], { sel: DND_SKILLS.map(([s, n]) => [s, n]) })).join("")}
    ${hbF("Tool", "tool", e.tool, { ph: "e.g. Thieves' Tools" })}${hbF("Starting gold (GP)", "gp", e.gp, { t: "num", min: 0, max: 1000 })}
    ${hbF("Origin feat", "feat", e.feat, { list: "hb-origin-feats", span: 2, ph: "An origin feat" })}</div>`;
  if (sec === "feats") return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Kind", "cat", e.cat, { sel: HB_FEAT_CATS })}${hbF("From level", "lvl", e.lvl, { t: "num", min: 0, max: 20 })}
    ${hbF("Raises an ability score by 1", "ab", e.ab, { t: "bool", span: 2 })}${hbF("Can be taken more than once", "rep", e.rep, { t: "bool", span: 2 })}${hbF("What it does", "t", e.t, { ta: 1, rows: 6, span: 4 })}</div>`;
  if (sec === "spells") { const dm = e.dmg || {}; return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Level", "l", e.l, { t: "num", sel: Array.from({ length: 10 }, (_, l) => [l, l ? dndOrdinal(l) : "Cantrip"]) })}${hbF("School", "sch", e.sch, { sel: DND_SCHOOLS })}
    ${hbF("Casting time", "ct", e.ct, { ph: "Action" })}${hbF("Range", "rg", e.rg)}${hbF("Components", "cmp", e.cmp)}${hbF("Duration", "dur", e.dur)}
    ${hbF("Concentration", "conc", e.conc, { t: "bool" })}${hbF("Ritual", "rit", e.rit, { t: "bool" })}
    ${hbChecks("Class lists", "cls", Object.keys(DND_CLASSES).filter(n => DND_CLASSES[n].spell && DND_CLASSES[n].caster !== "none" || ["Fighter", "Rogue"].includes(n)).map(n => [n, n]), e.cls)}
    ${hbF("Damage or healing dice", "dmg.d", dm.d, { ph: "e.g. 3d6, or 2d4+mod" })}${hbF("Damage type", "dmg.type", dm.type, { sel: [["", "—"], ...DND_DAMAGE.map(t => [t, t])] })}${hbF("Kind", "dmg.kind", dm.kind || "auto", { sel: [["attack", "Spell attack"], ["save", "Saving throw"], ["heal", "Healing"], ["auto", "Always hits"]] })}${hbF("Save", "dmg.save", dm.save, { sel: [["", "—"], ...abOpts] })}
    ${hbF("What it does", "t", e.t, { ta: 1, rows: 6, span: 4 })}</div>`; }
  if (sec === "items") { const w = e.wpn, a = e.arm, fx = e.fx || {}; const set = Object.entries(fx.set || {})[0] || ["", ""];
    return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Kind", "cat", e.cat, { sel: HB_ITEM_CATS })}${hbF("Rarity", "rar", e.rar, { sel: [["", "Not magical"], ...DND_RARITIES.map(r => [r, r])] })}
    ${hbF("Weight (lb)", "wt", e.wt, { t: "num", min: 0, step: "0.1" })}${hbF("Cost", "cost", e.cost, { ph: "e.g. 500 gp" })}${hbF("Needs attunement", "att", e.att, { t: "bool" })}
    ${hbF("Charges", "ch", e.ch, { t: "num", min: 0, max: 99 })}${e.ch ? hbF("Charges come back", "chRest", e.chRest, { sel: [["dawn", "At dawn"], ["long", "Long rest"], ["short", "Short rest"], ["", "Never"]] }) : "<div></div>"}
    <div class="row" style="grid-column:1/-1;gap:6px"><button class="btn sm ${w ? "primary" : ""}" data-act="hbg-toggle" data-path="wpn">${w ? "It's a weapon ✓" : "It's a weapon"}</button><button class="btn sm ${a ? "primary" : ""}" data-act="hbg-toggle" data-path="arm">${a ? "It's armor or a shield ✓" : "It's armor or a shield"}</button></div>
    ${w ? `${hbF("Damage dice", "wpn.d", w.d, { ph: "1d8" })}${hbF("Damage type", "wpn.type", w.type, { sel: DND_DAMAGE })}${hbF("Simple or martial", "wpn.k", w.k, { sel: [["simple", "Simple"], ["martial", "Martial"]] })}${hbF("Ranged", "wpn.r", w.r, { t: "bool" })}
      ${hbF("Properties", "wpn.p", w.p, { t: "list", span: 2, ph: "Finesse, Light, Thrown (20/60)" })}${hbF("Mastery", "wpn.mast", w.mast, { sel: [["", "None"], ...Object.keys(DND_MASTERY).map(m => [m, m])] })}${hbF("Magic bonus", "wpn.b", w.b, { t: "num", sel: [[0, "None"], [1, "+1"], [2, "+2"], [3, "+3"]] })}` : ""}
    ${a ? `${hbF("Armor type", "arm.t", a.t, { sel: [["light", "Light"], ["medium", "Medium"], ["heavy", "Heavy"], ["shield", "Shield"]] })}${hbF(a.t === "shield" ? "AC bonus" : "Base AC", "arm.ac", a.ac, { t: "num", min: 0, max: 30 })}${hbF("Magic bonus", "arm.b", a.b, { t: "num", sel: [[0, "None"], [1, "+1"], [2, "+2"], [3, "+3"]] })}<div></div>` : ""}
    <div class="field" style="grid-column:1/-1"><span class="label">While equipped${e.att ? " and attuned" : ""}</span></div>
    ${hbF("AC", "fx.ac", fx.ac, { t: "num", min: -10, max: 10 })}${hbF("Saving throws", "fx.save", fx.save, { t: "num", min: -10, max: 10 })}${hbF("Ability checks", "fx.check", fx.check, { t: "num", min: -10, max: 10 })}${hbF("Darkvision (ft)", "fx.dv", fx.dv, { t: "num", min: 0, max: 300 })}
    ${hbF("Spell attacks", "fx.spAtk", fx.spAtk, { t: "num", min: -10, max: 10 })}${hbF("Spell save DC", "fx.spDc", fx.spDc, { t: "num", min: -10, max: 10 })}${hbF("Fly speed (ft)", "fx.fly", fx.fly, { t: "num", min: 0, max: 120 })}${hbF("Swim speed (ft)", "fx.swim", fx.swim, { t: "num", min: 0, max: 120 })}
    <div class="field"><label class="label">Sets an ability to</label><select data-act-change="hbg-setab"><option value="">—</option>${abOpts.map(([v, l]) => `<option value="${v}" ${set[0] === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    ${set[0] ? hbF("Score", `fx.set.${set[0]}`, set[1], { t: "num", min: 1, max: 30 }) : "<div></div>"}
    ${hbChecks("Gives resistance to", "fx.res", DND_DAMAGE.map(t => [t, t]), fx.res)}
    ${hbF("What it does", "t", e.t, { ta: 1, rows: 6, span: 4 })}</div>`; }
  if (sec === "monsters") { const acts = (key, label) => hbRows(label, key, e[key], (x, i) => `<div class="dnd-form" style="grid-template-columns:2fr 80px 2fr 70px 1fr">${hbF("Name", `${key}.${i}.n`, x.n)}${hbF("To hit", `${key}.${i}.hit`, x.hit, { t: "num", min: -5, max: 30, ph: "—" })}
      ${hbF("Damage", `${key}.${i}.dmg`, x.dmg, { ph: "2d6+3 slashing; 1d6 fire" })}${hbF("Save DC", `${key}.${i}.dc`, x.dc, { t: "num", min: 0, max: 30, ph: "—" })}${hbF("Save", `${key}.${i}.sv`, x.sv, { sel: [["", "—"], ...abOpts] })}
      ${hbF("Text", `${key}.${i}.t`, x.t, { ta: 1, rows: 2, span: 5 })}</div>`, `Add ${label.toLowerCase().replace(/s$/, "")}`);
    return `${warn}<div class="dnd-form dnd-hbform">${name}${hbF("Size", "size", e.size, { sel: HB_SIZES })}${hbF("Type", "type", e.type, { ph: "Beast, Fiend (Devil)…" })}
    ${hbF("AC", "ac", e.ac, { t: "num", min: 1, max: 40 })}${hbF("Hit points", "hp", e.hp, { t: "num", min: 1, max: 2000 })}${hbF("HP dice", "hpf", e.hpf, { ph: "4d8 + 4" })}${hbF("Speed", "speed", e.speed)}
    ${hbF("Challenge rating", "cr", e.cr, { t: "num", sel: Object.keys(HB_CR_XP).map(Number).sort((a, b) => a - b).map(v => [v, `CR ${dndCr(v)} (${HB_CR_XP[v].toLocaleString()} XP)`]) })}${hbF("Initiative", "init", e.init, { t: "num", min: -5, max: 20 })}${hbF("Alignment", "al", e.al)}<div></div>
    ${DND_ABILITIES.map(([ab]) => hbF(ab.toUpperCase(), `ab.${ab}`, (e.ab || {})[ab], { t: "num", min: 1, max: 30 })).join("")}<div></div><div></div>
    ${hbF("Senses", "senses", e.senses, { span: 2 })}${hbF("Languages", "lang", e.lang, { span: 2 })}
    ${hbF("Resistances", "res", e.res, { t: "list", span: 2, ph: "Fire, Cold" })}${hbF("Immunities", "imm", e.imm, { t: "list", span: 2 })}
    ${hbRows("Traits", "traits", e.traits, (t, i) => `<div class="dnd-form" style="grid-template-columns:1fr 2fr">${hbF("Trait", `traits.${i}.n`, t.n)}${hbF("Text", `traits.${i}.t`, t.t, { ta: 1, rows: 2 })}</div>`, "Add a trait")}
    ${acts("actions", "Actions")}${acts("bonus", "Bonus actions")}${acts("reactions", "Reactions")}</div>`; }
  return "";
}
function hbView() {
  const packs = Object.values(HLIB).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  if (ui.hbSel && !HLIB[ui.hbSel]) ui.hbSel = null; if (!ui.hbSel && packs.length) ui.hbSel = packs[0].id;
  const p = hbPack(); const sec = ui.hbSec || "subclasses"; const list = p ? (p[sec] || []) : []; const e = hbEntry();
  const lib = `<section class="panel"><div class="panel-h"><h3>Homebrew packs</h3></div><div class="panel-b" style="display:grid;gap:8px">
    <div class="row" style="gap:6px"><button class="btn sm primary" data-act="hbg-new">+ New pack</button><label class="btn sm">Open a pack file…<input type="file" accept=".${HB_EXT},.json,application/json" multiple data-act-change="hb-install" hidden></label></div>
    ${packs.length ? packs.map(x => { const on = (st.packs || []).includes(x.id); const cl = hbClean(x);
      return `<div class="dnd-hbpack ${x.id === ui.hbSel ? "on" : ""}"><button class="linkish dnd-hbpackn" data-act="hbg-sel" data-id="${esc(x.id)}"><b>${esc(x.name || "Untitled")}</b><span class="faint dnd-small">${esc(cl ? hbCounts(cl) : "Has a problem")}</span></button>
        <label class="row dnd-small" style="gap:6px" title="Players in ${esc(st.campaign.name || "this campaign")} get this pack"><input type="checkbox" data-act-change="hbg-use" value="${esc(x.id)}" ${on ? "checked" : ""}>In this campaign</label></div>`; }).join("")
      : `<p class="faint dnd-small" style="margin:0">Write your own subclasses, species, backgrounds, feats, spells, items and monsters, then use the pack in a campaign: players get it when they join.</p>`}
    </div></section>`;
  const ed = p ? `<section class="panel"><div class="panel-h"><input class="dnd-hbname" data-hbf="name" value="${esc(p.name)}" maxlength="80" aria-label="Pack name">
      <span class="row" style="gap:6px"><button class="btn sm primary" data-act="hbg-export">Save pack file…</button><button class="btn sm ghost" data-act="hbg-dup">Duplicate</button><button class="btn sm ghost danger" data-act="hbg-del">${ui.confirm === "hbgdel-" + p.id ? "Confirm delete" : "Delete"}</button></span></div>
    <div class="panel-b" style="display:grid;gap:12px">
      <div class="dnd-form" style="grid-template-columns:1fr 1fr"><div class="field"><label class="label">Author</label><input data-hbf="author" value="${esc(p.author || "")}" maxlength="80"></div>
        <div class="field"><label class="label">Version</label><span class="faint" style="padding:8px 0">v${p.rev || 1} · goes up as you edit</span></div>
        <div class="field" style="grid-column:1/-1"><label class="label">Description</label><textarea data-hbf="description" rows="2" maxlength="600" placeholder="What's in this pack, for players and other GMs">${esc(p.description || "")}</textarea></div></div>
      <div class="seg dnd-hbsecs" role="group" aria-label="Section">${HB_SECS.map(([k, l]) => `<button class="${sec === k ? "on" : ""}" data-act="hbg-sec" data-v="${k}">${l}${(p[k] || []).length ? ` · ${p[k].length}` : ""}</button>`).join("")}</div>
      <div class="dnd-hbsplit"><div class="dnd-hbitems">${list.map((x, i) => `<button class="dnd-hbitem ${ui.hbIdx === i ? "on" : ""}" data-act="hbg-edit" data-i="${i}"><b>${esc(x.n || "Untitled")}</b><span class="faint dnd-small">${esc(hbSummary(sec, x))}</span>${hbBaseClash(sec, x) ? `<span class="chip red">Name clash</span>` : ""}</button>`).join("")}
          <button class="btn sm" data-act="hbg-add">+ Add ${HB_ONE[sec]}</button></div>
        <div class="dnd-hbedit">${e ? `<div style="display:grid;gap:10px">${hbForm(sec, e)}<div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-act="hbg-copy">Duplicate</button><button class="btn sm ghost danger" data-act="hbg-rm">${ui.confirm === "hbgrm" ? "Confirm remove" : "Remove"}</button></div></div>`
          : `<p class="faint" style="margin:0">Pick something on the left to edit it, or add a new one.</p>`}</div></div>
    </div></section>` : `<div class="empty"><h3>No homebrew yet</h3><p class="muted" style="margin:0">Make a pack for your own subclasses, species, backgrounds, feats, spells, magic items and monsters. Packs you use in a campaign install on your players' apps when they join, and every character keeps a copy of what it uses.</p></div>`;
  return `<div class="dnd dnd-hb"><div class="roster-head dnd-head"><h1><small>Homebrew</small>Your own rules</h1></div>
    <datalist id="hb-origin-feats">${DND_FEAT_LIST.filter(f => f.cat === "origin").map(f => `<option value="${esc(f.n)}">`).join("")}</datalist>
    <div class="dnd-hblayout">${lib}<div style="min-width:0">${ed}</div></div></div>`;
}
function hbSetPath(obj, path, val) { const ks = path.split("."); let o = obj; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; } o[ks[ks.length - 1]] = val; }
const hbGetPath = (obj, path) => path.split(".").reduce((o, k) => o == null ? o : o[k], obj);
function hbRead(el) { const t = el.dataset.t; if (t === "bool") return el.checked; if (t === "num") return el.value === "" ? "" : Number(el.value); if (t === "list") return el.value.split(",").map(s => s.trim()).filter(Boolean); return el.value; }
document.addEventListener("input", ev => { const el = ev.target; if (!el.dataset || ROLE !== "gm") return;
  if (el.dataset.hbf !== undefined) { const p = hbPack(); if (!p) return; p[el.dataset.hbf] = el.value; hbTouch(p.id); return; }
  if (el.dataset.hbe && el.tagName !== "SELECT" && el.type !== "checkbox") { const p = hbPack(), e = hbEntry(); if (!p || !e) return; hbSetPath(e, el.dataset.hbe, hbRead(el));
    hbTouch(p.id); } });
document.addEventListener("change", ev => { const el = ev.target; if (!el.dataset || ROLE !== "gm") return;
  const p = hbPack(), e = hbEntry(); if (!p || !e) return;
  if (el.dataset.hbe && (el.tagName === "SELECT" || el.type === "checkbox")) { hbSetPath(e, el.dataset.hbe, hbRead(el)); hbTouch(p.id); render(); return; }
  if (el.dataset.hbe) { render(); return; }
  if (el.dataset.hbck) { const cur = hbGetPath(e, el.dataset.hbck); const s = new Set(Array.isArray(cur) ? cur : []); if (el.checked) s.add(el.value); else s.delete(el.value); hbSetPath(e, el.dataset.hbck, [...s]); hbTouch(p.id); render(); } });
async function hbGmInstallFiles(files) { const msgs = [];
  for (const f of files) { try { const r = await hbReadFile(f); const old = HLIB[r.pack.id];
    if (old && Number(old.rev) >= r.pack.rev) msgs.push(`You already have ${old.rev === r.pack.rev ? "" : "a newer copy of "}"${r.pack.name}".`);
    else { HLIB[r.pack.id] = clone(r.pack); Monolith.store.set(HB_GM_KEY, HLIB); HB_KEY = null; msgs.push(`${old ? "Updated" : "Added"} "${r.pack.name}" and turned it on for this campaign.${r.problems.length ? ` ${r.problems.length} entries were skipped.` : ""}`); }
    hbUse(r.pack.id, true); ui.hbSel = r.pack.id; } catch (e) { msgs.push(`${f.name}: ${e.message || e}`); } }
  if (msgs.length) showNotice(msgs.join(" ")); render(); }
Object.assign(A, {
  "hbg-new": () => { const p = { format: HB_FORMAT, kind: "homebrew", game: HB_GAME, ruleset: HB_RULESET, id: "hb" + uid(), name: "New homebrew pack", author: "", description: "", rev: 1, updated: Date.now(), subclasses: [], species: [], backgrounds: [], feats: [], spells: [], items: [], monsters: [] };
    HLIB[p.id] = p; hbTouch(p.id); ui.hbSel = p.id; ui.hbSec = "subclasses"; ui.hbIdx = null; render(); setTimeout(() => { const i = document.querySelector('[data-hbf="name"]'); if (i) { i.focus(); i.select(); } }, 40); },
  "hbg-sel": el => { ui.hbSel = el.dataset.id; ui.hbIdx = null; ui.confirm = null; render(); },
  "hbg-sec": el => { ui.hbSec = el.dataset.v; ui.hbIdx = null; ui.confirm = null; render(); },
  "hbg-edit": el => { ui.hbIdx = Number(el.dataset.i); ui.confirm = null; render(); },
  "hbg-add": () => { const p = hbPack(); if (!p) return; const sec = ui.hbSec; p[sec] = p[sec] || []; const e = HB_NEW[sec](); const names = new Set(p[sec].map(x => x.n)); let n = e.n, i = 2; while (names.has(n)) n = `${e.n} ${i++}`; e.n = n;
    p[sec].push(e); ui.hbIdx = p[sec].length - 1; hbTouch(p.id); render(); setTimeout(() => { const i0 = document.querySelector('.dnd-hbedit [data-hbe="n"]'); if (i0) { i0.focus(); i0.select(); } }, 40); },
  "hbg-copy": () => { const p = hbPack(), e = hbEntry(); if (!p || !e) return; const c = clone(e); c.n = e.n + " (copy)"; p[ui.hbSec].splice(ui.hbIdx + 1, 0, c); ui.hbIdx++; hbTouch(p.id); render(); },
  "hbg-rm": () => { const p = hbPack(); if (!p || ui.hbIdx == null) return; if (ui.confirm !== "hbgrm") { ui.confirm = "hbgrm"; render(); return; } ui.confirm = null; p[ui.hbSec].splice(ui.hbIdx, 1); ui.hbIdx = null; hbTouch(p.id); render(); },
  "hbg-dup": () => { const p = hbPack(); if (!p) return; const c = clone(p); c.id = "hb" + uid(); c.name = p.name + " (copy)"; c.rev = 1; HLIB[c.id] = c; hbTouch(c.id); ui.hbSel = c.id; render(); },
  "hbg-del": () => { const p = hbPack(); if (!p) return; if (ui.confirm !== "hbgdel-" + p.id) { ui.confirm = "hbgdel-" + p.id; render(); return; } ui.confirm = null; delete HLIB[p.id]; hbUse(p.id, false);
    Monolith.store.set(HB_GM_KEY, HLIB); HB_KEY = null; ui.hbSel = null; showNotice(`Deleted "${p.name}". Characters built with it keep working.`); render(); },
  "hbg-export": () => { const p = hbPack(); if (!p) return; if (hbT) hbPersist(); const s = hbClean(HLIB[p.id]); if (!s) { showNotice("This pack has a problem and couldn't be saved."); return; }
    if (downloadText(hbFileName(s), hbFileText(s))) showNotice(`Saved ${hbFileName(s)}. Send it to your players, or let it install when they join.`); },
  "hbg-rowadd": el => { const p = hbPack(), e = hbEntry(); if (!p || !e) return; const path = el.dataset.path; const l = hbGetPath(e, path) || [];
    const blank = { features: { lvl: 3, n: "", t: "", uses: "", rest: "long" }, traits: { n: "", t: "" }, uses: { n: "", max: "pb", rest: "long" } }[path] || { n: "", t: "", hit: "", dmg: "", dc: "", sv: "" };
    l.push(blank); hbSetPath(e, path, l); hbTouch(p.id); render(); },
  "hbg-rowdel": el => { const p = hbPack(), e = hbEntry(); if (!p || !e) return; const l = hbGetPath(e, el.dataset.path) || []; l.splice(Number(el.dataset.i), 1); hbTouch(p.id); render(); },
  "hbg-toggle": el => { const p = hbPack(), e = hbEntry(); if (!p || !e) return; const k = el.dataset.path;
    e[k] = e[k] ? null : k === "wpn" ? { d: "1d8", type: "Slashing", k: "martial", r: false, p: [], mast: "", b: 0 } : { t: "medium", ac: 14, b: 0 }; if (e[k] && k === "wpn") e.cat = "Weapon"; if (e[k] && k === "arm") e.cat = "Armor"; hbTouch(p.id); render(); },
});
Object.assign(CHANGE, {
  "hbg-use": el => hbUse(el.value, el.checked),
  "hbg-setab": el => { const p = hbPack(), e = hbEntry(); if (!p || !e) return; e.fx = e.fx || {}; e.fx.set = el.value ? { [el.value]: 19 } : {}; hbTouch(p.id); render(); },
});
