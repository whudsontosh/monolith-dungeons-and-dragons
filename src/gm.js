/* ============================== D&D 2024: THE GM'S SCREENS ==============================
   The party at a glance, each character's full sheet (the GM can edit it, and changes reach the
   player while they're at the table), and health rings on the map tokens. */

function dndPartyTable(list) {
  const rows = list.map(c => {
    const k = dndCalc(c); const frac = k.hpMax ? k.hp / k.hpMax : 0;
    const online = typeof isOnline === "function" && isOnline(c.id);
    const status = [k.dead ? `<span class="chip red">Dead</span>` : k.hp === 0 ? `<span class="chip red">Dying</span>` : "",
      ...c.conditions.filter(x => x !== "Unconscious" || k.hp > 0).map(x => `<span class="chip red">${x}</span>`),
      c.exhaustion ? `<span class="chip amber">Exhaustion ${c.exhaustion}</span>` : "", c.conc ? `<span class="chip blue">Concentrating: ${esc(c.conc)}</span>` : "",
      c.insp ? `<span class="chip green">Inspired</span>` : ""].filter(Boolean).join(" ");
    return `<tr>
      <td><div class="row" style="gap:10px;flex-wrap:nowrap"><div class="portrait sm" style="background:${esc(dndColor(c))}">${esc(dndName(c).charAt(0).toUpperCase())}</div>
        <div style="min-width:0"><b>${esc(dndName(c))}</b>${online ? ` <span class="chip green">Online</span>` : ""}<div class="faint dnd-small">${esc(st.players[c.id] || c.player || "")}</div></div></div></td>
      <td>${esc([c.species, c.cls].filter(Boolean).join(" ") || "—")}<div class="faint dnd-small">Level ${c.level}${c.subclass ? " · " + esc(c.subclass) : ""}</div></td>
      <td class="dnd-n"><b>${c.ac}</b></td>
      <td class="dnd-hpcell"><b>${k.hp}</b><span class="faint"> / ${k.hpMax}</span>${c.hpTemp ? ` <span class="chip blue">+${c.hpTemp}</span>` : ""}
        <div class="meter"><i style="width:${clamp(frac, 0, 1) * 100}%;background:${dndRingColor(frac)}"></i></div></td>
      <td class="dnd-n">${k.passive.perception}</td>
      <td class="dnd-n">${k.spellAb ? k.spellDc : "—"}</td>
      <td>${status || `<span class="faint">—</span>`}</td>
      <td><div class="row" style="gap:4px;flex-wrap:nowrap;justify-content:flex-end">
        <button class="btn sm" data-act="open-pc" data-id="${esc(c.id)}">Open</button>
        <button class="btn sm ghost" data-act="download-pc" data-id="${esc(c.id)}">File</button>
        <button class="btn sm ghost" data-act="ask-remove-pc" data-id="${esc(c.id)}">Remove</button></div></td>
    </tr>`; }).join("");
  return `<section class="panel"><div class="tbl-wrap"><table class="dnd-party">
    <thead><tr><th>Character</th><th>Class</th><th>AC</th><th>Hit points</th><th>Passive Perc.</th><th>Spell DC</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></section>`;
}

function dndRingColor(frac) { return frac > 0.5 ? "#5fae4a" : frac > 0.25 ? "#e0a13a" : frac > 0 ? "#d0452f" : "#7a1f12"; }
function dndColor(c) { return c.color || (DND_CLASSES[c.cls] && DND_CLASSES[c.cls].color) || "#556070"; }

/* map tokens for party members get a ring showing how hurt they are */
function dndTokenRing(t) {
  if (t.kind !== "pc") return null; const c = pc(t.ref); if (!c) return null; const k = dndCalc(c);
  const frac = k.hpMax ? k.hp / k.hpMax : 0;
  return { color: dndRingColor(frac), frac: Math.max(frac, 0.05), dead: k.dead };
}
function dndTokenInfo(t) {
  if (t.kind !== "pc") return ""; const c = pc(t.ref); if (!c) return ""; const k = dndCalc(c);
  return `<div class="row" style="justify-content:space-between;gap:8px"><span>HP <b>${k.hp}</b>/${k.hpMax}${c.hpTemp ? ` (+${c.hpTemp})` : ""} · AC <b>${c.ac}</b> · PP ${k.passive.perception}
    ${c.conditions.map(x => `<span class="chip red">${x}</span>`).join(" ")}</span>
    <button class="btn sm ghost" data-act="dnd-gm-open" data-id="${esc(c.id)}">Sheet</button></div>`;
}
A["dnd-gm-open"] = el => { ui.tab = "party"; ui.open = el.dataset.id; ui.dndTab = "sheet"; render(); window.scrollTo(0, 0); };
