/* ============================== D&D 2024: CHARACTER CREATION DATA ==============================
   What the creator offers: classes, backgrounds, species, origin feats, weapons and armor.
   Rules facts are from the SRD 5.2 (see the licence note in rules.js); the short descriptions
   are written for this app. To add a class, background or species, add an entry here. */

const DND_CLASS_INFO = {
  Barbarian: { blurb: "A fierce warrior who fights in a battle rage and shrugs off blows.", primary: "Strength",
    pick: 2, skills: ["animal", "athletics", "intimidation", "nature", "perception", "survival"],
    armor: ["light", "medium", "shield"], weapons: "martial", tools: "",
    array: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    features: [["Rage", "Bonus action: extra damage on Strength attacks and resistance to bludgeoning, piercing and slashing damage. A few uses per long rest."],
      ["Unarmored Defense", "Without armor, your AC is 10 + DEX + CON. A shield still counts."],
      ["Weapon Mastery", "Use the mastery properties of two kinds of simple or martial melee weapons."]] },
  Bard: { blurb: "A performer whose music and words weave magic and lift allies.", primary: "Charisma",
    pick: 3, skills: "any", armor: ["light"], weapons: "simple", tools: "Three musical instruments",
    array: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 }, spells: [2, 4],
    features: [["Bardic Inspiration", "Bonus action: give an ally a d6 to add to a failed d20 test. Uses equal your Charisma modifier per long rest."],
      ["Spellcasting", "Bard spells, cast with Charisma."]] },
  Cleric: { blurb: "A priest who channels divine power to heal, protect and smite.", primary: "Wisdom",
    pick: 2, skills: ["history", "insight", "medicine", "persuasion", "religion"],
    armor: ["light", "medium", "shield"], weapons: "simple", tools: "",
    array: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 }, spells: [3, 4],
    features: [["Spellcasting", "Cleric spells, cast with Wisdom."],
      ["Divine Order", "Protector (martial weapons and heavy armor) or Thaumaturge (an extra cantrip and a bonus to Arcana and Religion checks)."]] },
  Druid: { blurb: "A keeper of the wild who calls on nature's magic and takes animal shapes.", primary: "Wisdom",
    pick: 2, skills: ["arcana", "animal", "insight", "medicine", "nature", "perception", "religion", "survival"],
    armor: ["light", "shield"], weapons: "simple", tools: "Herbalism Kit",
    array: { str: 8, dex: 12, con: 14, int: 13, wis: 15, cha: 10 }, spells: [2, 4],
    features: [["Spellcasting", "Druid spells, cast with Wisdom."], ["Druidic", "You know the secret language of druids, and always have Speak with Animals prepared."],
      ["Primal Order", "Magician (an extra cantrip and a bonus to Arcana and Nature checks) or Warden (martial weapons and medium armor)."]] },
  Fighter: { blurb: "A master of arms and armor, at home in any fight.", primary: "Strength or Dexterity",
    pick: 2, skills: ["acrobatics", "animal", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"],
    armor: ["light", "medium", "heavy", "shield"], weapons: "martial", tools: "",
    array: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
    features: [["Fighting Style", "Choose a Fighting Style feat, such as Archery, Defense or Great Weapon Fighting."],
      ["Second Wind", "Bonus action: regain 1d10 + your fighter level in hit points. A few uses, back on a rest."],
      ["Weapon Mastery", "Use the mastery properties of three kinds of simple or martial weapons."]] },
  Monk: { blurb: "A martial artist whose disciplined body is the weapon.", primary: "Dexterity and Wisdom",
    pick: 2, skills: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"],
    armor: [], weapons: "monk", tools: "One artisan's tool or musical instrument",
    array: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
    features: [["Martial Arts", "Unarmed strikes and monk weapons can use Dexterity and deal a d6 martial arts die; make an unarmed strike as a bonus action."],
      ["Unarmored Defense", "Without armor or a shield, your AC is 10 + DEX + WIS."]] },
  Paladin: { blurb: "A holy knight bound by an oath, healing allies and smiting foes.", primary: "Strength and Charisma",
    pick: 2, skills: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"],
    armor: ["light", "medium", "heavy", "shield"], weapons: "martial", tools: "",
    array: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 }, spells: [0, 2],
    features: [["Lay on Hands", "A pool of healing equal to 5 × your paladin level, spent by touch as a bonus action."],
      ["Spellcasting", "Paladin spells, cast with Charisma."], ["Weapon Mastery", "Use the mastery properties of two kinds of weapons."]] },
  Ranger: { blurb: "A wilderness hunter and tracker who mixes steel with nature magic.", primary: "Dexterity and Wisdom",
    pick: 3, skills: ["animal", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"],
    armor: ["light", "medium", "shield"], weapons: "martial", tools: "",
    array: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 }, spells: [0, 2],
    features: [["Spellcasting", "Ranger spells, cast with Wisdom."], ["Favored Enemy", "Hunter's Mark is always prepared, and you can cast it without a slot a few times per long rest."],
      ["Weapon Mastery", "Use the mastery properties of two kinds of weapons."]] },
  Rogue: { blurb: "A sneak and specialist who strikes where it hurts most.", primary: "Dexterity",
    pick: 4, skills: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight", "stealth"],
    armor: ["light"], weapons: "rogue", tools: "Thieves' Tools", expertise: 2,
    array: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
    features: [["Expertise", "Double your proficiency bonus with two of your skills."],
      ["Sneak Attack", "Once per turn, deal an extra 1d6 with a finesse or ranged weapon when you have advantage or an ally is next to the target."],
      ["Thieves' Cant", "A secret mix of jargon and signs, plus one extra language."], ["Weapon Mastery", "Use the mastery properties of two kinds of weapons."]] },
  Sorcerer: { blurb: "A caster with magic in the blood, bending spells to their will.", primary: "Charisma",
    pick: 2, skills: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"],
    armor: [], weapons: "simple", tools: "",
    array: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 }, spells: [4, 2],
    features: [["Spellcasting", "Sorcerer spells, cast with Charisma."],
      ["Innate Sorcery", "Bonus action: for 1 minute, +1 to your spell save DC and advantage on spell attacks. Twice per long rest."]] },
  Warlock: { blurb: "A seeker of forbidden lore who made a pact with a powerful patron.", primary: "Charisma",
    pick: 2, skills: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"],
    armor: ["light"], weapons: "simple", tools: "",
    array: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 }, spells: [2, 2],
    features: [["Eldritch Invocations", "Choose one invocation, such as Pact of the Blade, Chain or Tome."],
      ["Pact Magic", "A few spell slots that come back on a short rest, cast with Charisma."]] },
  Wizard: { blurb: "A scholar of the arcane with a spellbook full of answers.", primary: "Intelligence",
    pick: 2, skills: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"],
    armor: [], weapons: "simple", tools: "",
    array: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 }, spells: [3, 4],
    features: [["Spellcasting", "Wizard spells, cast with Intelligence, from a spellbook that starts with six level 1 spells."],
      ["Ritual Adept", "Cast any ritual spell in your spellbook as a ritual without preparing it."],
      ["Arcane Recovery", "Once a day after a short rest, regain spell slots worth up to half your wizard level."]] },
};

const DND_FEATS = {
  "Alert": "Add your proficiency bonus to initiative, and you can swap initiative with a willing ally.",
  "Magic Initiate": "Learn two cantrips and one level 1 spell from the Cleric, Druid or Wizard list. Cast the spell once without a slot per long rest.",
  "Savage Attacker": "Once per turn, roll a weapon's damage dice twice and use either result.",
  "Skilled": "Gain proficiency in three skills of your choice.",
};

const DND_BG_INFO = {
  Acolyte: { blurb: "You served in a temple, learning its rites.", abs: ["int", "wis", "cha"], skills: ["insight", "religion"], tool: "Calligrapher's Supplies", feat: "Magic Initiate", featNote: "Cleric" },
  Criminal: { blurb: "You made a living on the wrong side of the law.", abs: ["dex", "con", "int"], skills: ["sleight", "stealth"], tool: "Thieves' Tools", feat: "Alert" },
  Sage: { blurb: "You spent your formative years among books and scholars.", abs: ["con", "int", "wis"], skills: ["arcana", "history"], tool: "Calligrapher's Supplies", feat: "Magic Initiate", featNote: "Wizard" },
  Soldier: { blurb: "You trained for war and served in an army.", abs: ["str", "dex", "con"], skills: ["athletics", "intimidation"], tool: "One kind of Gaming Set", feat: "Savage Attacker" },
  Custom: { blurb: "Make your own from the book or your imagination: pick three abilities, two skills, a tool and an origin feat.", custom: true },
};

/* species: speed, size, traits, and the choices each one asks for */
const DND_SPECIES_INFO = {
  Dragonborn: { blurb: "Proud dragon-blooded folk with a breath weapon.", speed: 30,
    choice: { key: "lineage", label: "Draconic ancestry", options: ["Black (acid)", "Blue (lightning)", "Brass (fire)", "Bronze (lightning)", "Copper (acid)", "Gold (fire)", "Green (poison)", "Red (fire)", "Silver (cold)", "White (cold)"] },
    traits: [["Draconic Ancestry", "Your dragon kind sets your breath weapon's damage type and your resistance."],
      ["Breath Weapon", "In place of an attack, exhale a 15-ft cone or 30-ft line: DEX save, 1d10 damage, rising with level."],
      ["Damage Resistance", "Resistance to your ancestry's damage type."], ["Darkvision", "60 ft."], ["Draconic Flight", "From level 5, sprout wings for a short flight."]] },
  Dwarf: { blurb: "Sturdy folk of stone and forge, hard to put down.", speed: 30, hpPerLvl: 1,
    traits: [["Darkvision", "120 ft."], ["Dwarven Resilience", "Resistance to poison damage, and advantage on saves against being poisoned."],
      ["Dwarven Toughness", "Your hit point maximum goes up by 1 for every level (already counted)."],
      ["Stonecunning", "Bonus action: gain tremorsense while on stone, a few times per long rest."]] },
  Elf: { blurb: "Graceful, long-lived folk touched by the Feywild.", speed: 30,
    choice: { key: "lineage", label: "Elven lineage", options: ["Drow", "High Elf", "Wood Elf"] },
    skill: { key: "keen", label: "Keen Senses", options: ["insight", "perception", "survival"] },
    traits: [["Darkvision", "60 ft (Drow: 120 ft)."], ["Elven Lineage", "Drow: Dancing Lights. High Elf: Prestidigitation. Wood Elf: Druidcraft and 35 ft speed. More spells at levels 3 and 5."],
      ["Fey Ancestry", "Advantage on saves against being charmed."], ["Keen Senses", "Proficiency in Insight, Perception or Survival."], ["Trance", "A long rest takes 4 hours of meditation."]] },
  Gnome: { blurb: "Small, clever and endlessly curious.", speed: 30, size: "Small",
    choice: { key: "lineage", label: "Gnomish lineage", options: ["Forest Gnome", "Rock Gnome"] },
    traits: [["Darkvision", "60 ft."], ["Gnomish Cunning", "Advantage on Intelligence, Wisdom and Charisma saves."],
      ["Gnomish Lineage", "Forest: Minor Illusion and Speak with Animals. Rock: Mending, Prestidigitation and tiny clockwork devices."]] },
  Goliath: { blurb: "Towering folk descended from giants.", speed: 35,
    choice: { key: "lineage", label: "Giant ancestry", options: ["Cloud's Jaunt", "Fire's Burn", "Frost's Chill", "Hill's Tumble", "Stone's Endurance", "Storm's Thunder"] },
    traits: [["Giant Ancestry", "A giant's boon you can use a few times per long rest."], ["Large Form", "From level 5, become Large for a short time."],
      ["Powerful Build", "Advantage on checks to escape a grapple, and you count as one size larger for carrying."]] },
  Halfling: { blurb: "Small, nimble and remarkably lucky.", speed: 30, size: "Small",
    traits: [["Brave", "Advantage on saves against being frightened."], ["Halfling Nimbleness", "Move through the space of any creature larger than you."],
      ["Luck", "When you roll a 1 on a d20 test, reroll it and use the new roll."], ["Naturally Stealthy", "Hide even when only a larger creature is in the way."]] },
  Human: { blurb: "Adaptable and ambitious, found everywhere.", speed: 30,
    skill: { key: "skillful", label: "Skillful", options: "any" }, feat: true,
    traits: [["Resourceful", "Gain Heroic Inspiration whenever you finish a long rest."], ["Skillful", "Proficiency in one skill of your choice."], ["Versatile", "An origin feat of your choice."]] },
  Orc: { blurb: "Strong, tireless folk who keep going when others fall.", speed: 30,
    traits: [["Adrenaline Rush", "Dash as a bonus action and gain temporary HP equal to your proficiency bonus, a few times per rest."],
      ["Darkvision", "120 ft."], ["Relentless Endurance", "When dropped to 0 HP, drop to 1 instead, once per long rest."]] },
  Tiefling: { blurb: "Bearers of a fiendish legacy, marked by the Lower Planes.", speed: 30,
    choice: { key: "lineage", label: "Fiendish legacy", options: ["Abyssal", "Chthonic", "Infernal"] },
    traits: [["Darkvision", "60 ft."], ["Fiendish Legacy", "Abyssal: poison resistance and Poison Spray. Chthonic: necrotic resistance and Chill Touch. Infernal: fire resistance and Fire Bolt. More spells at levels 3 and 5."],
      ["Otherworldly Presence", "You know Thaumaturgy."]] },
};

/* weapons: [name, damage, type, properties, mastery, category, kind] (kind: melee / ranged) */
const DND_WEAPONS = [
  ["Club", "1d4", "bludgeoning", "Light", "Slow", "simple", "melee"], ["Dagger", "1d4", "piercing", "Finesse, Light, Thrown (20/60)", "Nick", "simple", "melee"],
  ["Greatclub", "1d8", "bludgeoning", "Two-Handed", "Push", "simple", "melee"], ["Handaxe", "1d6", "slashing", "Light, Thrown (20/60)", "Vex", "simple", "melee"],
  ["Javelin", "1d6", "piercing", "Thrown (30/120)", "Slow", "simple", "melee"], ["Light Hammer", "1d4", "bludgeoning", "Light, Thrown (20/60)", "Nick", "simple", "melee"],
  ["Mace", "1d6", "bludgeoning", "", "Sap", "simple", "melee"], ["Quarterstaff", "1d6", "bludgeoning", "Versatile (1d8)", "Topple", "simple", "melee"],
  ["Sickle", "1d4", "slashing", "Light", "Nick", "simple", "melee"], ["Spear", "1d6", "piercing", "Thrown (20/60), Versatile (1d8)", "Sap", "simple", "melee"],
  ["Dart", "1d4", "piercing", "Finesse, Thrown (20/60)", "Vex", "simple", "ranged"], ["Light Crossbow", "1d8", "piercing", "Ammunition (80/320), Loading, Two-Handed", "Slow", "simple", "ranged"],
  ["Shortbow", "1d6", "piercing", "Ammunition (80/320), Two-Handed", "Vex", "simple", "ranged"], ["Sling", "1d4", "bludgeoning", "Ammunition (30/120)", "Slow", "simple", "ranged"],
  ["Battleaxe", "1d8", "slashing", "Versatile (1d10)", "Topple", "martial", "melee"], ["Flail", "1d8", "bludgeoning", "", "Sap", "martial", "melee"],
  ["Glaive", "1d10", "slashing", "Heavy, Reach, Two-Handed", "Graze", "martial", "melee"], ["Greataxe", "1d12", "slashing", "Heavy, Two-Handed", "Cleave", "martial", "melee"],
  ["Greatsword", "2d6", "slashing", "Heavy, Two-Handed", "Graze", "martial", "melee"], ["Halberd", "1d10", "slashing", "Heavy, Reach, Two-Handed", "Cleave", "martial", "melee"],
  ["Lance", "1d10", "piercing", "Heavy, Reach, Two-Handed (unless mounted)", "Topple", "martial", "melee"], ["Longsword", "1d8", "slashing", "Versatile (1d10)", "Sap", "martial", "melee"],
  ["Maul", "2d6", "bludgeoning", "Heavy, Two-Handed", "Topple", "martial", "melee"], ["Morningstar", "1d8", "piercing", "", "Sap", "martial", "melee"],
  ["Pike", "1d10", "piercing", "Heavy, Reach, Two-Handed", "Push", "martial", "melee"], ["Rapier", "1d8", "piercing", "Finesse", "Vex", "martial", "melee"],
  ["Scimitar", "1d6", "slashing", "Finesse, Light", "Nick", "martial", "melee"], ["Shortsword", "1d6", "piercing", "Finesse, Light", "Vex", "martial", "melee"],
  ["Trident", "1d8", "piercing", "Thrown (20/60), Versatile (1d10)", "Topple", "martial", "melee"], ["Warhammer", "1d8", "bludgeoning", "Versatile (1d10)", "Push", "martial", "melee"],
  ["War Pick", "1d8", "piercing", "Versatile (1d10)", "Sap", "martial", "melee"], ["Whip", "1d4", "slashing", "Finesse, Reach", "Slow", "martial", "melee"],
  ["Blowgun", "1", "piercing", "Ammunition (25/100), Loading", "Vex", "martial", "ranged"], ["Hand Crossbow", "1d6", "piercing", "Ammunition (30/120), Light, Loading", "Vex", "martial", "ranged"],
  ["Heavy Crossbow", "1d10", "piercing", "Ammunition (100/400), Heavy, Loading, Two-Handed", "Push", "martial", "ranged"], ["Longbow", "1d8", "piercing", "Ammunition (150/600), Heavy, Two-Handed", "Slow", "martial", "ranged"],
  ["Musket", "1d12", "piercing", "Ammunition (40/120), Loading, Two-Handed", "Slow", "martial", "ranged"], ["Pistol", "1d10", "piercing", "Ammunition (30/90), Loading", "Vex", "martial", "ranged"],
];
/* armor: [name, type, base AC, DEX cap (null = no cap, 0 = none), Strength needed, stealth disadvantage, weight] */
const DND_ARMOR = [
  ["Padded Armor", "light", 11, null, 0, true, 8], ["Leather Armor", "light", 11, null, 0, false, 10], ["Studded Leather Armor", "light", 12, null, 0, false, 13],
  ["Hide Armor", "medium", 12, 2, 0, false, 12], ["Chain Shirt", "medium", 13, 2, 0, false, 20], ["Scale Mail", "medium", 14, 2, 0, true, 45],
  ["Breastplate", "medium", 14, 2, 0, false, 20], ["Half Plate Armor", "medium", 15, 2, 0, true, 40],
  ["Ring Mail", "heavy", 14, 0, 0, true, 40], ["Chain Mail", "heavy", 16, 0, 13, true, 55], ["Splint Armor", "heavy", 17, 0, 15, true, 60], ["Plate Armor", "heavy", 18, 0, 15, true, 65],
];
const DND_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const DND_POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

/* can this class use this weapon well? */
function dndWeaponProf(cls, w) {
  const kind = (DND_CLASS_INFO[cls] || {}).weapons; if (!kind) return false;
  if (w[5] === "simple") return true;
  if (kind === "martial") return true;
  if (kind === "monk") return /Light/.test(w[3]);
  if (kind === "rogue") return /Finesse|Light/.test(w[3]);
  return false;
}
