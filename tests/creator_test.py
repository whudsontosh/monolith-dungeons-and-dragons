"""The character creator: a Human Rogue built through every step, a Dwarf Barbarian by point buy, and drafts on the roster."""
import asyncio, sys, os
from playwright.async_api import async_playwright
from harness import *

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pl = await page(b, "P", "player.html")
        async def shot(n): await pl.screenshot(path=OUT + f"/{n}.png", full_page=True)
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(120)
        async def left(): return await pl.evaluate("dndOpen(curChar().build)")

        await click("[data-act=new-character] >> nth=0")
        ok(await pl.evaluate("ui.view") == "build", "a new character opens the creator")
        await shot("b1-classes")
        # 1. Class: Rogue
        await click("[data-act=dnd-b-pick][data-k=cls][data-v=Rogue]")
        ok((await left())["class"] == 6, "Rogue asks for 4 skills and 2 expertise")
        for s in ["acrobatics", "deception", "investigation", "perception"]:
            await click(f".dnd-b-choice [data-act=dnd-b-toggle][data-k=clsSkills][data-v={s}]")
        ok(await pl.is_disabled("[data-act=dnd-b-toggle][data-k=clsSkills][data-v=stealth]"), "a fifth skill can't be picked")
        await click("[data-act=dnd-b-toggle][data-k=expertise][data-v=perception]"); await click("[data-act=dnd-b-toggle][data-k=expertise][data-v=acrobatics]")
        ok((await left())["class"] == 0, "class step complete")
        await shot("b2-class")
        # 2. Background: Criminal, +2 DEX +1 CON
        await click(".dnd-b-nav [data-act=dnd-b-step][data-s=bg]")
        await click("[data-act=dnd-b-pick][data-k=bg][data-v=Criminal]")
        await pl.select_option("[data-dnd='build.plus2']", "dex"); await pl.wait_for_timeout(150)
        await pl.select_option("[data-dnd='build.plus1']", "con"); await pl.wait_for_timeout(150)
        ok((await left())["bg"] == 0, "background step complete")
        await shot("b3-bg")
        # the class's Stealth chip now says it comes from the background
        await click("[data-act=dnd-b-step][data-s=class]")
        ok(await pl.is_disabled("[data-act=dnd-b-toggle][data-k=clsSkills][data-v=stealth]") and "from background" in await pl.inner_text("[data-act=dnd-b-toggle][data-v=stealth]"), "Stealth shows it comes from the background")
        # 3. Species: Human, Skillful Medicine, Versatile Skilled → 3 more skills
        await click("[data-act=dnd-b-step][data-s=species]")
        await click("[data-act=dnd-b-pick][data-k=species][data-v=Human]")
        await click("[data-act=dnd-b-set][data-k=skillful][data-v=medicine]")
        await pl.select_option("[data-dnd='build.versatile']", "Skilled"); await pl.wait_for_timeout(150)
        ok((await left())["species"] == 3, "Human with Skilled still needs 3 skills")
        for s in ["history", "nature", "survival"]:
            await click(f"[data-act=dnd-b-toggle][data-k=skilled][data-v={s}]")
        ok((await left())["species"] == 0, "species step complete")
        await shot("b4-species")
        # 4. Abilities: suggested Rogue array
        await click("[data-act=dnd-b-step][data-s=abilities]")
        await click("[data-act=dnd-b-suggest]")
        tot = await pl.evaluate("dndTotals(curChar().build)"); print(tot)
        ok(tot == {"str": 12, "dex": 17, "con": 14, "int": 14, "wis": 10, "cha": 8}, "suggested array plus background: DEX 17, CON 14")
        await shot("b5-abilities")
        # point buy keeps to 27
        await click("[data-act=dnd-b-method][data-v=point]")
        for _ in range(7): await click("[data-act=dnd-b-pb][data-a=dex][data-d='1']")
        for _ in range(7): await pl.click("[data-act=dnd-b-pb][data-a=con][data-d='1']", force=True); await pl.wait_for_timeout(60)
        pb = await pl.evaluate("[curChar().build.pb.dex,curChar().build.pb.con,dndPointsLeft(curChar().build)]"); print(pb)
        ok(pb[0] == 15 and pb[2] >= 0, "point buy stops at 15 and never overspends")
        await click("[data-act=dnd-b-method][data-v=roll]"); await click("[data-act=dnd-b-roll]")
        ok(await pl.evaluate("curChar().build.rolls.length") == 6, "rolled six scores")
        await shot("b5b-roll")
        await click("[data-act=dnd-b-method][data-v=array]"); await click("[data-act=dnd-b-suggest]")
        # 5. Equipment
        await click("[data-act=dnd-b-step][data-s=equip]")
        await pl.select_option("[data-dnd='build.armor']", "Leather Armor"); await pl.wait_for_timeout(150)
        for w in ["Rapier", "Shortbow", "Dagger", "Dagger"]:
            await click(f".dnd-wpnlist [data-act=dnd-b-wpn][data-v='{w}']")
        await pl.fill("[data-dnd='build.gear']", "Burglar's Pack\nThieves' Tools\nCaltrops x2"); await pl.fill("[data-dnd='build.gp']", "16"); await pl.wait_for_timeout(200)
        await shot("b6-equip")
        # 6. Review & finish
        await click("[data-act=dnd-b-step][data-s=review]")
        ok(await pl.is_disabled("[data-act=dnd-b-finish]"), "can't finish without a name")
        await pl.fill("[data-dnd='build.name']", "Sable Marrow"); await pl.wait_for_timeout(250)
        await shot("b7-review")
        await click("[data-act=dnd-b-finish]"); await pl.wait_for_timeout(300)
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return {view:ui.view,build:c.build,ac:c.ac,hp:k.hpMax,init:k.init,dex:c.ab.dex,skills:c.skills,insp:c.insp,atk:c.attacks.map(a=>[a.name,dndAttackNums(c,k,a).hit,a.dmg,dndAttackNums(c,k,a).dmgMod]),inv:c.inv.map(i=>[i.name,i.qty]),gp:c.coins.gp,saves:[c.saveProf.dex,c.saveProf.int]}})()")
        print(c)
        ok(c["view"] == "sheet" and c["build"] is None, "finishing opens the sheet")
        ok(c["ac"] == 14 and c["hp"] == 10 and c["init"] == 5, "leather armor AC 14, HP 8+2, initiative +3 DEX +2 Alert")
        ok(len(c["skills"]) == 10 and c["skills"]["perception"] == 2 and c["skills"]["stealth"] == 1, "10 skills, Perception expertise")
        ok(c["insp"] and c["saves"] == [True, True], "Human starts with Heroic Inspiration; Rogue saves DEX and INT")
        ok(["Rapier", 5, "1d8", 3] in c["atk"] and ["Shortbow", 5, "1d6", 3] in c["atk"], "rapier and shortbow attacks +5, damage +3")
        ok(["Dagger", 2] in c["inv"] and ["Caltrops", 2] in c["inv"] and c["gp"] == 16, "inventory and gold carried over")
        ok(await pl.evaluate("RS.character.isFinished(curChar())"), "the finished character can join a table")
        await shot("b8-sheet")
        # a Dwarf Barbarian by point buy: Unarmored Defense and Dwarven Toughness
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0")
        await pl.evaluate("""()=>{const c=curChar();Object.assign(c.build,{cls:'Barbarian',clsSkills:['athletics','perception'],bg:'Soldier',plus2:'str',plus1:'con',species:'Dwarf',
          method:'point',pb:{str:15,dex:14,con:15,int:8,wis:8,cha:8},name:'Brakka'});saveChar(c,true);render()}""")
        await pl.wait_for_timeout(200); await click("[data-act=dnd-b-step][data-s=review]"); await click("[data-act=dnd-b-finish]")
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.ac,k.hpMax,c.ab.str,c.ab.con,k.init]})()"); print(c)
        ok(c == [15, 16, 17, 16, 2], "Dwarf Barbarian: AC 10+2+3=15, HP 12+3+1=16")
        # the roster shows a draft for an unfinished build
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0"); await click("[data-act=dnd-b-pick][data-k=cls][data-v=Wizard]")
        await click("nav [data-act=go-roster]")
        ok(await pl.locator(".card:has-text('Draft · step 1 of 6')").count() == 1, "an unfinished build shows as a draft on the roster")
        await shot("b9-roster")
        await pl.set_viewport_size({"width": 420, "height": 900}); await click(".card:has-text('Draft') [data-act=open-char]"); await shot("b10-phone")
        print("errors:", errs); ok(not errs, "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
