"""Importing from D&D Beyond: converting a character's JSON (a made-up character in fixtures/), the
import window fetching it, the paste fallback when D&D Beyond can't be reached, and updating a
character that was imported before."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
from harness import *

RAW = open(os.path.join(FIX, "ddb-character.json")).read()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pl = await page(b, "P", "player.html")
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(150)
        async def shot(n): await pl.screenshot(path=OUT + f"/{n}.png", full_page=True)

        # ---------- the converter ----------
        r = await pl.evaluate("""raw=>{const r=ddbConvert(JSON.parse(raw));const c=r.c;const k=dndCalc(c);return {r:r.summary,notes:r.notes,c,k:{ac:k.ac,hp:k.hpMax,save:k.save,init:k.init,slots:k.slots,casting:k.casting,hd:k.hdPools,dv:k.senses.dv,attuned:k.attuned},
          res:dndResources(c).map(x=>[x.n,x.max,x.used]),atk:c.attacks.map(a=>{const n=dndAttackNums(c,k,a);return [a.name,n.hit,a.dmg,n.dmgMod,a.prof]})}}""", RAW)
        c, k = r["c"], r["k"]; print(r["r"], r["notes"])
        ok(c["name"] == "Vessa Thornwood" and c["ddb"] == "90000001" and c["species"] == "Dwarf" and c["background"] == "Soldier" and c["alignment"] == "Neutral Good", "name, species, background and alignment")
        ok(c["cls"] == "Fighter" and c["subclass"] == "Champion" and c["multi"] == [{"cls": "Wizard", "subclass": "", "level": 2}] and c["level"] == 5, "Fighter 3 (Champion) / Wizard 2, level 5")
        ok(c["ab"] == {"str": 17, "dex": 13, "con": 15, "int": 12, "wis": 10, "cha": 8}, "ability scores with the background's increases")
        ok([a for a in c["saveProf"] if c["saveProf"][a]] == ["str", "con"], "saving throws from the first class only")
        ok(c["skills"] == {"athletics": 1, "intimidation": 1, "perception": 2}, "skills, with expertise in Perception")
        ok(c["alert"] and c["initBonus"] == 0 and k["init"] == 1 + 3, "Alert gives initiative (DEX +1, proficiency +3), not counted twice")
        ok(k["hp"] == 39 and c["hp"] == 30 and c["hpTemp"] == 4, "hit points match D&D Beyond: 39 max, 30 now, 4 temporary")
        ok(k["ac"] == 20, "AC 20: chain mail 16, shield 2, Cloak of Protection 1, Defense 1")
        ok(k["save"]["str"] == 3 + 3 + 2 and k["attuned"] == 2, "saves get +1 from the cloak and +1 from an unknown item's bonus; 2 items attuned")
        ok(["Longsword +1", 7, "1d8", 4, True] in r["atk"] and len(r["atk"]) == 1, "the equipped +1 longsword becomes an attack: +7 to hit, 1d8+4")
        wand = next(i for i in c["inv"] if i["name"] == "Wand of Magic Missiles"); bolts = next(i for i in c["inv"] if i["name"] == "Bolts")
        ok(wand["ch"] == 7 and wand["chUsed"] == 2 and wand["chRest"] == "dawn" and abs(bolts["wt"] - 0.075) < 1e-9, "wand charges, and ammunition weight per piece")
        ok(any(i["name"] == "Letter from Captain Ruhl" for i in c["inv"]) and c["coins"]["gp"] == 47 and c["coins"]["pp"] == 1, "custom items and coins")
        sp = {s["name"]: [s["lvl"], s["prep"], s["cls"]] for s in c["spells"]}
        ok(sp["Fire Bolt"] == [0, True, "Wizard"] and sp["Shield"] == [1, True, "Wizard"] and sp["Sleep"] == [1, False, "Wizard"], "Wizard spells, prepared or not, tagged with their class")
        ok(k["slots"][1] == 3 and c["slotsUsed"][1] == 1 and k["casting"][0]["dc"] == 12, "Wizard 2 slots (3 first-level, 1 used), spell save DC 12")
        ok(["Second Wind", 2, 1] in r["res"] and ["Action Surge", 1, 1] in r["res"] and ["Stonecunning", 3, 1] in r["res"], "used class and species resources carried over")
        ok([t["n"] for t in c["trackers"]] == ["Rallying Cry"] and c["trackers"][0]["max"] == 1, "other limited uses become trackers")
        ok(c["acts"][0]["n"] == "Shield Bash" and c["acts"][0]["type"] == "bonus", "a written-in action, as a bonus action")
        ok(c["exhaustion"] == 1 and c["conditions"] == ["Poisoned"] and c["insp"] is True, "exhaustion, conditions and Heroic Inspiration")
        ok(c["defs"]["res"] == ["Poison"] and k["dv"] == 120 and c["hpPerLvl"] == 1, "poison resistance, darkvision 120 ft, Dwarven Toughness")
        ok("Weapon Mastery: Sap (Longsword)" in c["profs"] and "Languages: Common, Dwarvish" in c["profs"] and "Tools: Dice Set" in c["profs"], "proficiencies, languages and weapon masteries")
        ok(c["traits"]["flaws"] == "Can't refuse a wager." and "northern wall" in c["backstory"] and "3rd Company" in c["allies"] and c["phys"]["eyes"] == "Grey", "personality, backstory, allies and looks")
        ok(any(f["n"] == "Defense" for f in c["feats"]), "the Defense fighting style becomes its feat")
        bad = await pl.evaluate("()=>{try{ddbConvert({hello:1});return ''}catch(e){return e.message}}")
        ok("doesn't look like a D&D Beyond character" in bad, "something else is turned away with a clear message")

        # ---------- the import window: fetched ----------
        await pl.route("**/character-service.dndbeyond.com/**", lambda route: route.fulfill(status=200, content_type="application/json", body=RAW, headers={"Access-Control-Allow-Origin": "*"}))
        ok(await pl.locator("nav [data-act=ddb-open]").count() == 1, "the top bar has Import from D&D Beyond")
        await click("nav [data-act=ddb-open]")
        await pl.fill("#ddb-link", "https://www.dndbeyond.com/characters/90000001"); await click("[data-act=ddb-fetch]")
        await pl.wait_for_selector(".dnd-ddb-preview", timeout=5000)
        ok("Vessa Thornwood" in await pl.inner_text(".dnd-ddb-preview") and "Fighter 3 (Champion) / Wizard 2" in await pl.inner_text(".dnd-ddb-preview"), "the link is fetched and previewed")
        await shot("d1-preview")
        await click("[data-act=ddb-save]")
        ok(await pl.evaluate("curChar() && curChar().name") == "Vessa Thornwood" and await pl.locator(".dnd-head h1:has-text('Vessa Thornwood')").count() == 1, "Import opens the new character's sheet")
        ok(await pl.evaluate("JSON.parse(localStorage.getItem('monolith-roster-dnd')).some(c=>c.ddb==='90000001')"), "and it's saved")
        await shot("d2-sheet")
        await click("[data-act=dnd-tab][data-t=actions]"); await shot("d3-actions")
        await click("[data-act=dnd-tab][data-t=features]"); await shot("d4-features")
        await click("[data-act=dnd-tab][data-t=spells]"); await shot("d5-spells")
        await click("[data-act=dnd-tab][data-t=inv]"); await shot("d6-inventory")
        await click("[data-act=dnd-tab][data-t=details]"); await shot("d7-details")
        first = await pl.evaluate("curChar().id")

        # ---------- the paste fallback, and updating ----------
        await pl.unroute("**/character-service.dndbeyond.com/**")
        await pl.route("**/character-service.dndbeyond.com/**", lambda route: route.abort())
        await click("nav [data-act=ddb-open]")
        await pl.fill("#ddb-link", "90000001"); await click("[data-act=ddb-fetch]")
        await pl.wait_for_selector("#ddb-text", timeout=5000)
        ok(await pl.locator(".dnd-ddb a[href*='character-service.dndbeyond.com/character/v5/character/90000001']").count() == 1, "when D&D Beyond can't be reached, it links to the data to copy")
        await pl.fill("#ddb-text", "not json"); await click("[data-act=ddb-read]")
        ok("isn't the whole page" in await pl.inner_text(".dnd-ddb"), "a bad paste explains what to copy")
        await shot("d8-paste")
        changed = json.loads(RAW); changed["data"]["removedHitPoints"] = 0; changed["data"]["name"] = "Vessa Thornwood"
        await pl.fill("#ddb-text", json.dumps(changed)); await click("[data-act=ddb-read]")
        ok(await pl.locator("[data-act=ddb-save][data-id]").count() == 1, "an earlier import of the same character can be updated")
        await click("[data-act=ddb-save][data-id]")
        ok(await pl.evaluate("S.chars.size") == 1 and await pl.evaluate("curChar().id") == first and await pl.evaluate("dndCalc(curChar()).hp") == 39, "updating keeps the same character, now at full HP")
        print("errors:", errs); ok(not errs, "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
