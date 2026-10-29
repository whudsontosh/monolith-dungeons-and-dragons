/* ============================== D&D 2024: REGISTERING WITH MONOLITH ==============================
   Everything Monolith needs to know about this game, in one place. The rules are in rules.js,
   the sheet in sheet.js and the GM's screens in gm.js; build.py joins them into one game.js. */

/* an example character on the roster, to try the sheet with */
const DND_SAMPLE = dndNormalize({
  id: "sample", name: "Ilyra Venn", player: "", cls: "Wizard", subclass: "Evoker", level: 3, species: "Elf", background: "Sage", alignment: "Neutral Good", xp: 900,
  ab: { str: 8, dex: 14, con: 14, int: 17, wis: 12, cha: 10 },
  saveProf: { int: true, wis: true }, skills: { arcana: 1, history: 1, investigation: 1, perception: 1 },
  ac: 12, done: true,
  attacks: [
    { name: "Dagger", ab: "fin", prof: true, dmg: "1d4", type: "piercing", notes: "Finesse, light, thrown (20/60 ft) · Mastery: Nick" },
    { name: "Fire Bolt", ab: "spell", prof: true, dmg: "1d10", type: "fire", notes: "Cantrip · 120 ft · sets unattended flammable objects alight" },
  ],
  spells: [
    { lvl: 0, name: "Fire Bolt", notes: "Action · 120 ft · spell attack, 1d10 fire" },
    { lvl: 0, name: "Mage Hand", notes: "Action · 30 ft · a spectral hand for 1 minute" },
    { lvl: 0, name: "Light", notes: "Action · touch · an object sheds light for 1 hour" },
    { lvl: 1, name: "Magic Missile", prep: true, notes: "Action · 120 ft · three darts, 1d4+1 force each" },
    { lvl: 1, name: "Shield", prep: true, notes: "Reaction · self · +5 AC until your next turn" },
    { lvl: 1, name: "Mage Armor", prep: true, notes: "Action · touch · base AC 13 + DEX for 8 hours" },
    { lvl: 1, name: "Detect Magic", prep: false, notes: "Action · ritual · concentration, 10 minutes" },
    { lvl: 2, name: "Misty Step", prep: true, notes: "Bonus action · teleport up to 30 ft" },
  ],
  inv: [
    { name: "Spellbook", qty: 1, wt: 3 }, { name: "Quarterstaff", qty: 1, wt: 4, notes: "Arcane focus" },
    { name: "Dagger", qty: 2, wt: 1 }, { name: "Robe", qty: 1, wt: 4 }, { name: "Scholar's pack", qty: 1, wt: 22 },
  ],
  coins: { gp: 18, sp: 4 },
  profs: "Weapons: simple\nTools: calligrapher's supplies\nLanguages: Common, Elvish, Draconic",
  features: "Elf: Darkvision 60 ft, Fey Ancestry, Keen Senses, Trance\nArcane Recovery: once a day after a short rest, regain spell slots totalling up to 2 levels\nEvocation Savant, Potent Cantrip",
  notes: "Left the Candlekeep archives looking for a book that rewrites itself.",
});

function dndCard(c) {
  if (c.build) { const b = c.build; const i = Math.max(0, DND_STEPS.findIndex(s => s[0] === b.step));
    return { name: b.name || "New character", sub: [b.species, b.cls].filter(Boolean).join(" ") || "In the character creator", color: b.color || (DND_CLASSES[b.cls] || {}).color || "#556070",
      initial: (b.name || "?").charAt(0).toUpperCase(), chips: [{ t: `Draft · step ${i + 1} of ${DND_STEPS.length}`, c: "blue" }], draft: true, openLabel: "Continue building" }; }
  const k = dndCalc(c); const done = !!(c.name && c.cls);
  return {
    name: dndName(c), sub: [`Level ${c.level}`, c.species, c.cls].filter(Boolean).join(" "),
    color: dndColor(c), initial: (c.name || "?").trim().charAt(0).toUpperCase() || "?",
    chips: !done ? [{ t: "Draft", c: "blue" }] : k.dead ? [{ t: "Dead", c: "red" }] : k.hp === 0 ? [{ t: "Dying", c: "red" }] : c.conditions.slice(0, 2).map(x => ({ t: x, c: "red" })),
    stats: [["AC", c.ac], ["HP", `${k.hp}/${k.hpMax}`], ["Init", sgn(k.init)], ["Pass. Perc.", k.passive.perception]],
    meter: { frac: k.hpMax ? k.hp / k.hpMax : 0, title: `Hit points ${k.hp} of ${k.hpMax}` },
    draft: !done, openLabel: done ? "Open sheet" : "Continue",
  };
}

Object.assign(Monolith.theme.map, { void: "#1a120c", accent: "#c9a24f", select: "#e0b04f", label: "#f3e6c8", labelBg: "rgba(42,26,18,.85)" });
Monolith.hooks.trayQuick = () => [["d4", "1D4"], ["d6", "1D6"], ["d8", "1D8"], ["d10", "1D10"], ["d12", "1D12"], ["d20", "1D20"], ["d100", "1D100"]];

Monolith.registerGame({
  id: "dnd", api: 1, diceLabel: "D20",
  rulesets: { "dnd5.5e": {
    name: "5.5e",
    character: {
      blank: () => { const c = dndBlank(); c.build = dndNewBuild(); return c; }, normalize: dndNormalize,
      isCharacter: x => !!(x && typeof x === "object" && typeof x.id === "string"),
      isFinished: c => !!(c && !c.build && c.name && c.cls),
      joined: c => { c.done = true; },
      label: c => c.build ? (c.build.name || "New character") : dndName(c), card: dndCard, sample: DND_SAMPLE,
      summary: c => { try { const k = dndCalc(c); return `Level ${c.level} ${c.cls || ""} · HP ${k.hp}/${k.hpMax} · ${c.inv.length} items · ${c.spells.length} spells`; } catch (e) { return ""; } },
      copy: src => { const c = clone(src); c.name = src.name + " (copy)"; ["attacks", "spells", "inv"].forEach(l => c[l].forEach(x => { x.id = uid(); })); return c; },
    },
    player: {
      charNoun: ["character", "characters"], rosterTitle: "Your characters",
      newCard: () => ({ label: "D&D 2024", title: "+ New character", text: "Step by step: class, background, species, ability scores and equipment. The sheet works out the rest." }),
      views: { sheet: c => dndSheetView(c), build: c => dndBuilderView(c) }, openView: c => c.build ? "build" : "sheet",
      onOpen: c => { ui.dndTab = c.cls ? "sheet" : "details"; ui.dndEdit = null; ui.dndAdv = "normal"; },
      tablePanel: c => dndTablePanel(c),
    },
    gm: {
      charNoun: ["character", "characters"],
      partyTable: list => dndPartyTable(list),
      characterView: c => dndSheetView(c),
      tokenRing: t => dndTokenRing(t), tokenInfo: t => dndTokenInfo(t),
    },
  }},
});
