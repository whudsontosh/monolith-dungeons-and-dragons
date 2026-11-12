# Changelog

## 0.6.4

- **Darkvision on the map.** With Monolith 1.6.0 or later, a character's Darkvision (or Blindsight or
  Truesight) is how far their token sees on a dark map. The GM can change it on the token.

## 0.6.3

- **Conditions on map tokens.** With Monolith 1.4.0 or later, right-click a token to mark it Blinded,
  Grappled, Prone and the rest, plus Concentrating. Badges show around the token.
- A condition can last a number of rounds. It counts down when the combat tracker starts a new round
  and comes off by itself.

Token badges are separate from the conditions on a character's sheet for now.

## 0.6.2

- **Spell areas on the map.** With Monolith 1.3.0 or later, the map's Template tool has ready-made
  areas for ten common spells, from Burning Hands to Fireball and Lightning Bolt. You can still draw
  any circle, cone, line or square by hand.
- Templates follow the 2024 grid rules: they start on a grid corner, and a creature is caught when
  its square is at least half covered.

## 0.6.1

- **Maps in feet.** With Monolith 1.2.0 or later, new maps measure in feet: each square is 5 ft and a
  diagonal costs one square, the 2024 rule. The GM can switch a map to hexes or to the 5/10 ft
  diagonal rule in Map settings. Maps you already have keep their settings.

## 0.6.0

Class features on attacks, companions and Wild Shape, and homebrew.

- **Class features on attacks:** Rage adds its damage to Strength attacks (the Rage button spends a
  use and gives resistance to bludgeoning, piercing and slashing until a rest). Rogues get a Sneak
  Attack button on finesse and ranged weapons, Paladins a Divine Smite button that asks which slot
  to spend, and Hunter's Mark and Hex add their dice while you concentrate on them. Martial Arts
  uses Dexterity and the Martial Arts die for monk weapons, Archery adds +2 to ranged attacks, and
  the Champion's Improved and Superior Critical score crits on 19 or 18. Extra damage doubles after
  a critical hit. Weapons show their mastery property (Topple with its save DC, Graze with its
  damage on a miss). Everyone gets an Unarmed Strike.
- **Companions tab:** familiars, animal companions, mounts and summons from the bestiary (the beasts
  up to CR 2 for players, every monster for the GM, plus homebrew) or written in, each with hit
  points, AC, speed, notes and a stat block that rolls its attacks. Druids learn Wild Shape forms
  within their CR and flying limits; assuming a form spends a use and gives temporary hit points,
  the Sheet tab shows the form, and dropping it to 0 HP ends it.
- **Homebrew (like Cyberpunk's):** the GM's Homebrew tab writes packs of subclasses (with features
  and their uses), species, backgrounds, feats, spells, magic items and equipment (weapons, armor,
  bonuses, charges) and monsters. Turn a pack on for a campaign and players get it when they join;
  save it as a .dndhomebrew file to share. Players can install pack files from the Homebrew window
  and choose which packs each character uses. Homebrew shows up in the creator, Level up, the
  spell, equipment and monster lists, and the Combat tab. Every character keeps a copy of the
  homebrew it uses, so it keeps working where the pack isn't installed. Packs are checked and
  cleaned when they're read; nothing in one is ever run.

## 0.5.0

Import from D&D Beyond, multiclassing, and the rest of what a D&D Beyond sheet tracks.

- **Import from D&D Beyond:** in the top bar (and on the creator's first step). Paste a public
  character's link and it's read in: classes and levels, ability scores, saves, skills and expertise,
  hit points, proficiencies, languages and weapon masteries, equipment (equipped, attuned, charges,
  +1 weapons and armor), coins, spells by class with slots used, feats, class resources and other
  limited uses, conditions, defenses, senses, speeds, personality, backstory and portrait. If D&D
  Beyond can't be reached directly, the window links to the character's data to copy and paste, or
  takes a saved .json file. Importing the same character again offers to update it.
- **Multiclassing:** Level up asks which class takes the level, including a new one (with the 2024
  ability requirements and the proficiencies it gives). The creator's Levels step can do the same.
  Spell slots combine across casting classes, each class casts with its own ability, hit dice are
  tracked by class, and the Features tab has a section per class. The Details tab lists every class.
- **Equipment that does things:** Equip and Attune on the Inventory tab (3 attunements at most).
  Armor Class is worked out from worn armor, shield, Unarmored Defense, the Defense style and magic
  items (or set it by hand). Cloaks and Rings of Protection, Bracers of Defense, Gauntlets of Ogre
  Power, Belts of Giant Strength, Ioun Stones, the Robe of the Archmagi and more apply themselves;
  any item can be given AC, save, check and spell bonuses. Items with charges get pips.
- **Actions tab:** everything you can do on a turn in Actions, Bonus actions, Reactions and Other:
  weapon attacks, prepared spells by casting time, class features and feats (with their uses),
  species traits, item charges and actions you write in, plus the basic actions anyone can take.
- **Limited uses:** species traits (Breath Weapon, Relentless Endurance, Stonecunning…) and the
  Lucky feat join class resources, and + Track adds your own with how they come back.
- **Defenses, senses and story:** resistances, immunities, vulnerabilities, condition immunities,
  darkvision and other senses, extra speeds, extra AC/save/HP bonuses; a Proficiencies & training
  panel on the sheet; personality traits, ideals, bonds, flaws, appearance, physical details,
  allies, backstory and a portrait.

## 0.4.0

Class resources, a combat tracker, and levelling up inside the creator.

- **Class resources:** a panel on the sheet tracks what your class spends: Rage, Bardic Inspiration,
  Channel Divinity, Divine Intervention, Wild Shape, Second Wind, Action Surge, Indomitable, Focus
  Points, Lay on Hands, Favored Enemy, Sorcery Points, Innate Sorcery, Magical Cunning, Arcane
  Recovery and Stroke of Luck, with the right number for your level. Short and long rests give back
  what the rules say (Second Wind, Rage, Channel Divinity and Wild Shape get one back on a short rest).
- **Combat tab (GM):** add the party, add monsters from the SRD's 330 stat blocks (search, type and CR
  filters, average or rolled hit points, several at once) or custom combatants, roll initiative,
  step through turns and rounds, and apply damage and healing (party damage goes onto their sheets).
  Each monster's stat block opens in the list with buttons to roll its attacks, damage and crits.
  Encounter difficulty (Low, Moderate, High) is worked out against the party's XP budget. Place on
  map puts the monsters on the current map as tokens with health rings, and the map highlights
  whose turn it is.
- **Levels in the creator:** start a character above level 1 and a Levels step lists every level
  from 2 up. Make each level's choices there (hit points, subclass, Ability Score Improvement or
  feat, fighting styles, expertise and other picks), each one built on the levels before it. Finish
  makes the whole character at once.

## 0.3.0

Every spell and piece of equipment in the free rules.

- **Spell list:** "Add from the spell list" on the Spells tab opens all 341 SRD spells. Filter by class
  list (yours to start with), level, school, or only the levels you can cast now, search by name, and
  read any spell before adding it. Added spells come with their casting time, range, components and
  duration.
- **On the Spells tab:** an "i" on each spell opens its full description, school, components and
  classes, with your save DC or spell attack. Damage and healing spells get a roll button with your
  spellcasting modifier added and cantrips scaled to your level. Cantrip and prepared counts show
  against your class table.
- **Equipment list:** "Add from the equipment list" on the Inventory tab opens over 600 items:
  weapons, armor, adventuring gear, tools, packs, potions, scrolls and the SRD's magic items, with
  cost, weight, rarity and attunement. Weapons get an attack, magic weapons with their bonus.
  Armor gets a Wear button that sets your Armor Class (counting a shield you carry).
- **Starting equipment:** the creator's Equipment step offers your class's and background's options
  (A, B or gold) and fills in armor, weapons, gear and gold from them. Items get their real weights.

## 0.2.0

All 20 levels for every class.

- **Features tab:** every class and subclass feature from level 1 to your level, with the full rules
  text (Read more), your class table's numbers (Rages, Sneak Attack, Focus Points, spells prepared
  and so on), your feats, and what's coming next level.
- **Level up:** one button walks through a level: hit points (take the average or roll), subclass at
  level 3, Ability Score Improvement or a feat at 4, 8, 12 and 16 (and the Fighter's and Rogue's
  extra ones), an Epic Boon at 19, and picks such as fighting styles, Eldritch Invocations (only
  those your level allows), Primal Order, Elemental Fury and expertise. Jack of All Trades turns on
  by itself.
- **Subclasses:** the free-rules subclass for each class (Berserker, Lore, Life, Land, Champion, Open
  Hand, Devotion, Hunter, Thief, Draconic, Fiend and Evoker), with all their features. A subclass from
  your book can be named instead.
- **Creator:** a starting level above 1 takes you through each level's choices after Finish. Class
  pages show all 20 levels at a glance, and level 1 picks (a Fighter's fighting style, a Druid's
  Primal Order, a Warlock's first invocation) are made in the Class step.
- Feats from your background and species are recorded on the Features tab.
- Hit points you roll are kept per level, so the maximum stays right as you level.

## 0.1.0

The first beta.

- **Character creator:** step by step through class, background, species, ability scores (standard
  array, point buy, 4d6 or typed in), equipment, and name. Each step shows how many choices are left,
  and Finish fills in the whole sheet.
- **Character sheet:** abilities, saves and skills with proficiency and expertise; AC, initiative,
  speed; hit points with damage, healing and temporary HP; hit dice, death saves, conditions,
  exhaustion and concentration; weapons and attacks; spell slots and spells; inventory and coins.
- **Rolls:** click any number to roll it, with advantage or disadvantage, natural 20s and 1s, and
  critical damage.
- **For the GM:** a party table, each character's full sheet, and health rings on map tokens.
- **The look:** parchment pages, oxblood headings and gold rules.
