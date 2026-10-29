"""Spells, equipment and starting kits: the spell picker (class list, level, search), spell details
and damage rolls, cantrip scaling, the equipment picker (weapons make attacks, armor sets AC), and the
creator's starting equipment options."""
import asyncio, sys, os
from playwright.async_api import async_playwright
from harness import *

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pl = await page(b, "P", "player.html")
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(120)
        async def shot(n): await pl.screenshot(path=OUT + f"/{n}.png", full_page=True)
        ok(await pl.evaluate("DND_SPELLS.length") == 341 and await pl.evaluate("DND_ITEMS.length") > 600, "the catalogue holds 341 spells and over 600 items")
        ok(await pl.evaluate("dndSpellRef('fireball').cls.join()") == "Sorcerer,Wizard", "Fireball is on the Sorcerer and Wizard lists")

        # the example wizard: add spells from the list
        await click(".card:has-text('Ilyra Venn') [data-act=open-char]"); await click("[data-act=copy-sample]")
        await click("[data-act=dnd-tab][data-t=spells]")
        ok(await pl.locator(".dnd .chip:has-text('Prepared 4 / 6')").count() == 1 and await pl.locator(".dnd .chip:has-text('Cantrips 3 / 3')").count() == 1, "spell counts against the class table: 4 of 6 prepared, 3 of 3 cantrips")
        await click("[data-act=dnd-pickspells]")
        ok(await pl.evaluate("ui.pick.cls") == "Wizard", "the picker opens on the Wizard list")
        n_all = await pl.evaluate("document.querySelectorAll('.dnd-pickrow').length")
        ok(n_all > 30 and await pl.locator(".dnd-pickrow:has-text('Fireball')").count() == 0, f"only spells up to 2nd level by default ({n_all}), so no Fireball yet")
        await pl.fill("#dnd-pick-q", "sleep"); await pl.wait_for_timeout(200)
        ok(await pl.locator(".dnd-pickrow").count() >= 1 and await pl.locator(".dnd-pickrow:has-text('Sleep')").count() >= 1, "searching finds Sleep")
        await click(".dnd-pickrow:has-text('Sleep') .dnd-pickname");
        ok(await pl.locator(".dnd-pickdetail:has-text('Casting time')").count() == 1, "clicking a spell shows its details")
        await shot("c1-spellpicker")
        await click(".dnd-pickrow:has-text('Sleep') [data-act=dnd-pickadd]")
        await pl.fill("#dnd-pick-q", "scorching"); await pl.wait_for_timeout(200); await click(".dnd-pickrow:has-text('Scorching Ray') [data-act=dnd-pickadd]")
        await click("[data-act=close-modal]")
        sp = await pl.evaluate("curChar().spells.filter(s=>['Sleep','Scorching Ray'].includes(s.name)).map(s=>[s.name,s.lvl,s.prep,s.notes])"); print(sp)
        ok(len(sp) == 2 and sp[0][1] == 1 and sp[1][1] == 2 and "Action" in sp[1][3], "Sleep (1st) and Scorching Ray (2nd) added, prepared, with their details")
        # details and a damage roll on the Spells tab
        await click(".dnd-spwrap:has(input[value='Fire Bolt']) [data-act=dnd-spinfo]")
        ok(await pl.locator(".dnd-spdetail:has-text('Spell attack +5')").count() == 1, "Fire Bolt's details show the spell attack bonus")
        await pl.evaluate("window.__r=Math.random;Math.random=()=>0.5"); await click(".dnd-spwrap:has(input[value='Fire Bolt']) [data-act=dnd-sproll]"); await pl.evaluate("Math.random=window.__r")
        e = await pl.evaluate("Dice.log[0]"); print(e)
        ok(e["label"] == "Fire Bolt: damage" and "1d10" in e["detail"] and e["total"] == 6, "Fire Bolt rolls 1d10 fire")
        await pl.evaluate("()=>{const c=curChar();c.level=5;saveChar(c,true);render()}"); await pl.wait_for_timeout(200)
        ok(await pl.locator(".dnd-spwrap:has(input[value='Fire Bolt']) [data-act=dnd-sproll]:has-text('2d10')").count() == 1, "at level 5 the cantrip rolls 2d10")
        await shot("c2-spells")
        # equipment
        await click("[data-act=dnd-tab][data-t=inv]")
        await click("[data-act=dnd-pickitems]")
        await pl.fill("#dnd-pick-q", "longsword"); await pl.wait_for_timeout(200)
        await click(".dnd-pickrow:has(.dnd-pickname b:text-is('Longsword')) [data-act=dnd-pickadd]")
        await pl.fill("#dnd-pick-q", "flame tongue"); await pl.wait_for_timeout(200)
        ok(await pl.locator(".dnd-pickrow:has-text('Flame Tongue')").count() >= 1, "magic items are in the list")
        await pl.fill("#dnd-pick-q", ""); await pl.select_option("[data-act-change=dnd-pick][data-k=cat]", "Armor"); await pl.wait_for_timeout(150)
        await pl.select_option("[data-act-change=dnd-pick][data-k=magic]", "0"); await pl.wait_for_timeout(150)
        await shot("c3-itempicker")
        await click(".dnd-pickrow:has(.dnd-pickname b:text-is('Chain Mail')) [data-act=dnd-pickadd]")
        await click(".dnd-pickrow:has(.dnd-pickname b:text-is('Shield')) [data-act=dnd-pickadd]")
        await click("[data-act=close-modal]")
        c = await pl.evaluate("(()=>{const c=curChar();return [c.inv.filter(i=>['Longsword','Chain Mail','Shield'].includes(i.name)).map(i=>[i.name,i.wt]),c.attacks.find(a=>a.name==='Longsword')]})()"); print(c)
        ok(len(c[0]) == 3 and ["Chain Mail", 55] in c[0] and c[1] and c[1]["dmg"] == "1d8" and c[1]["prof"] is False, "longsword, chain mail and shield added with weights; the longsword attack is marked not proficient for a Wizard")
        await click("tr:has(input[value='Chain Mail']) [data-act=dnd-wear]")
        ok(await pl.evaluate("curChar().ac") == 18, "wearing chain mail with a shield sets AC 16 + 2 = 18")
        await click("tr:has(input[value='Chain Mail']) [data-act=dnd-itinfo]")
        ok(await pl.locator(".dnd-itdetail").count() == 1, "an item's details open in the inventory")
        await shot("c4-inventory")
        # starting kits in the creator
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0")
        await pl.evaluate("""()=>{const c=curChar();Object.assign(c.build,{cls:'Fighter',bg:'Soldier'});saveChar(c,true);render()}""")
        await pl.wait_for_timeout(150); await click("[data-act=dnd-b-step][data-s=equip]")
        await click("[data-act=dnd-b-kit][data-k=kitCls][data-v='0']"); await click("[data-act=dnd-b-kit][data-k=kitBg][data-v='0']")
        b2 = await pl.evaluate("(()=>{const b=curChar().build;return [b.armor,b.shield,[...new Set(b.weapons)],b.weapons.length,b.gp,b.gear]})()"); print(b2)
        ok(b2[0] == "Chain Mail" and set(b2[2]) == {"Greatsword", "Flail", "Javelin", "Spear", "Shortbow"} and b2[4] == 4 + 14, "Fighter option A + Soldier option A: chain mail, five kinds of weapon, 18 GP")
        ok("Dungeoneer's Pack" in b2[5] and "Arrows ×20" in b2[5], "the rest of the kit goes into gear")
        await shot("c5-kits")
        await click("[data-act=dnd-b-kit][data-k=kitCls][data-v='2']")
        ok(await pl.evaluate("[curChar().build.gp,curChar().build.armor]") == [155 + 14, ""], "option C is 155 GP instead (plus the background's 14)")
        print("errors:", errs); ok(not errs, "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
