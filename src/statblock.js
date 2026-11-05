/* ============================== D&D 2024: STAT BLOCKS ==============================
   A monster's or beast's stat block with buttons that roll its attacks and damage, shared by the
   GM's Combat tab and the sheet's Companions tab. The GM's page knows every SRD monster
   (monsters.js); every page knows the Beasts up to CR 2 (beasts.js), plus any homebrew monsters.
   Roll buttons carry what's rolling: data-mon (a monster by name), or a context another file adds
   to DND_MON_CTX (a fighter in combat, a companion). */

const DND_MON_BY = {};
function dndMonIndex() { Object.keys(DND_MON_BY).forEach(k => delete DND_MON_BY[k]);
  [...(typeof DND_BEASTS !== "undefined" ? DND_BEASTS : []), ...(typeof DND_MONSTERS !== "undefined" ? DND_MONSTERS : [])].forEach(m => { DND_MON_BY[m.n.toLowerCase()] = m; }); }
const dndMonList = () => typeof DND_MONSTERS !== "undefined" ? DND_MONSTERS : DND_BEASTS;
const dndCr = cr => cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr);
const dndMon = name => DND_MON_BY[String(name || "").toLowerCase()] || null;
const DND_MON_CTX = [el => el.dataset.mon ? { mon: dndMon(el.dataset.mon), who: el.dataset.mon } : null];
dndMonIndex();

function dndStatBlock(m, e, ctx) {
  const who = ctx ? ctx.who : e ? e.name : m.n; const W = ctx ? ctx.attr : e ? `data-cid-e="${esc(e.cid)}"` : `data-mon="${esc(m.n)}"`;
  const abRow = DND_ABILITIES.map(([a]) => { const v = m.ab[a]; const md = dndMod(v); const sv = m.sv[a] != null ? m.sv[a] : md;
    return `<div><span class="label">${a.toUpperCase()}</span><b>${v}</b><span>${sgn(md)}</span><span class="faint" title="Saving throw">${sgn(sv)}</span></div>`; }).join("");
  const line = (k, v) => v ? `<div><b>${k}</b> ${esc(v)}</div>` : "";
  const rollBtns = a => {
    if (a.hit == null && !a.dmg) return "";
    const hit = a.hit != null ? `<button class="btn sm" data-act="dnd-monroll" ${W} data-a="${esc(a.n)}" data-r="hit">${sgn(a.hit)} to hit</button>` : "";
    const dc = a.dc ? `<span class="chip amber">DC ${a.dc} ${esc(DND_AB_NAME[a.sv] || "")}</span>` : "";
    const dmg = a.dmg ? `<button class="btn sm ghost" data-act="dnd-monroll" ${W} data-a="${esc(a.n)}" data-r="dmg">${esc(a.dmg.map(x => x[0]).join(" + "))}</button>` : "";
    const crit = a.dmg && a.hit != null ? `<button class="btn sm ghost" data-act="dnd-monroll" ${W} data-a="${esc(a.n)}" data-r="crit">Crit</button>` : "";
    return `<div class="row dnd-sbrolls">${hit}${dc}${dmg}${crit}</div>`;
  };
  const actText = t => esc(t).split("\n").filter(Boolean).join("<br>");
  const acts = (title, list, pre) => {
    if (!list || !list.length) return "";
    const body = list.map(a => `<div class="dnd-sbact"><p><b><i>${esc(a.n)}.</i></b> ${actText(a.t)}</p>${rollBtns(a)}</div>`).join("");
    return `<h4>${title}</h4>${pre ? `<p class="dnd-small">${pre}</p>` : ""}${body}`;
  };
  return `<div class="dnd-statblock">
    <h3>${esc(m.n)}</h3><p class="dnd-sbsub">${esc([m.size, m.type].filter(Boolean).join(" "))}${m.al ? ", " + esc(m.al) : ""}</p>
    <div class="dnd-sbtop"><div><b>AC</b> ${m.ac}</div><div><b>Initiative</b> ${sgn(m.init)} (${10 + m.init})</div><div><b>HP</b> ${m.hp}${m.hpf ? ` (${esc(m.hpf)})` : ""}</div><div><b>Speed</b> ${esc(m.speed)}</div></div>
    <div class="dnd-sbabs">${abRow}</div>
    <div class="dnd-sblines">${line("Skills", Object.entries(m.sk).map(([k, v]) => `${k} ${sgn(v)}`).join(", "))}${line("Vulnerabilities", m.vul.join(", "))}${line("Resistances", m.res.join(", "))}${line("Immunities", m.imm.join(", "))}
      ${line("Senses", m.senses)}${line("Languages", m.lang)}<div><b>CR</b> ${dndCr(m.cr)} (XP ${m.xp.toLocaleString()}; PB ${sgn(m.pb)})</div></div>
    ${acts("Traits", m.traits)}${acts("Actions", m.actions)}${acts("Bonus Actions", m.bonus)}${acts("Reactions", m.reactions)}
    ${acts("Legendary Actions", m.legendary, m.legN ? `Legendary Action Uses: ${m.legN}. Immediately after another creature's turn, the ${esc(who.toLowerCase())} can expend a use to take one of these actions. It regains all uses at the start of its turn.` : "")}
  </div>`;
}
function dndMonRoll(el) {
  let x = null; for (const f of DND_MON_CTX) { x = f(el); if (x) break; } if (!x || !x.mon) return; const mon = x.mon, who = x.who || mon.n;
  const a = ["traits", "actions", "bonus", "reactions", "legendary"].flatMap(g => mon[g] || []).find(x => x.n === el.dataset.a); if (!a) return;
  if (el.dataset.r === "hit") { const r = d(20); const tags = r === 20 ? [{ t: "Natural 20", c: "green" }] : r === 1 ? [{ t: "Natural 1", c: "red" }] : [];
    Dice.raw(`${a.n}: to hit`, `d20 (${r}) ${sgn(a.hit)}`, r + a.hit, who, tags); return; }
  const crit = el.dataset.r === "crit"; let total = 0; const parts = [];
  (a.dmg || []).forEach(([f, type]) => { const x = dndRollExpr(f, 0, crit); if (x) { total += x.total; parts.push(`${x.text}${type ? " " + type.toLowerCase() : ""}`); } });
  Dice.raw(`${a.n}: ${crit ? "critical damage" : "damage"}`, parts.join(" + "), total, who, [a.dc ? { t: `DC ${a.dc} ${DND_AB_NAME[a.sv] || ""} save`, c: "amber" } : null, crit ? { t: "Critical", c: "amber" } : null].filter(Boolean));
}

A["dnd-monroll"] = el => dndMonRoll(el);
