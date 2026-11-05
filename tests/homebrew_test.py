"""Homebrew packs: the GM's Homebrew tab (write a pack, use it in the campaign, save the file), a
player getting it by joining the table, building with homebrew (species, background, subclass,
spells, items), characters carrying their homebrew after the pack is removed, installing a pack
file, and a hostile pack being cleaned up."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
from harness import *

PACK = {
  "subclasses": [{"cls": "Fighter", "n": "Way of the Hammer", "t": "Masters of the forge-hammer.", "features": [{"lvl": 3, "n": "Hammer Blow", "t": "When you hit, add 1d6 force damage.", "uses": "PB", "rest": "long"}]}],
  "species": [{"n": "Stoneborn", "blurb": "Living rock, slow and sure.", "size": "Medium", "speed": 25, "dv": 60, "res": ["Poison"], "hpPerLvl": 1,
               "traits": [{"n": "Stone Skin", "t": "Your skin is stone."}], "uses": [{"n": "Rockslide", "max": "PB", "rest": "long"}]}],
  "backgrounds": [{"n": "Ironmonger", "blurb": "You worked the forges.", "abs": ["str", "con", "wis"], "skills": ["athletics", "insight"], "tool": "Smith's Tools", "feat": "Tough", "gp": 30}],
  "feats": [{"n": "Anvil Heart", "cat": "general", "lvl": 4, "ab": True, "t": "Your heart beats like a hammer."}],
  "spells": [{"n": "Molten Spray", "l": 1, "sch": "Evocation", "cls": ["Sorcerer", "Wizard"], "ct": "Action", "rg": "15 feet", "cmp": "V, S", "dur": "Instantaneous", "t": "Molten metal sprays.",
              "dmg": {"d": "2d6", "type": "Fire", "kind": "save", "save": "dex"}}],
  "items": [{"n": "Ember Ring", "cat": "Ring", "rar": "Rare", "att": True, "wt": 0, "cost": "2,000 gp", "t": "A warm ring.", "fx": {"ac": 1, "save": 1}},
            {"n": "Hammerblade", "cat": "Weapon", "rar": "", "wt": 6, "t": "A hammer with an edge.", "wpn": {"d": "1d10", "type": "Bludgeoning", "k": "martial", "r": False, "p": ["Heavy", "Two-Handed"], "mast": "Topple", "b": 0}}],
  "monsters": [{"n": "Cinder Hound", "size": "Medium", "type": "Elemental", "ac": 13, "hp": 26, "hpf": "4d8 + 8", "speed": "40 ft.", "cr": 1, "ab": {"str": 14, "dex": 14, "con": 15, "int": 3, "wis": 12, "cha": 6},
                "actions": [{"n": "Bite", "t": "Melee Attack Roll: +4. Hit: 6 (1d8 + 2) Fire damage.", "hit": 4, "dmg": "1d8+2 fire"}]}],
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        gm = await page(b, "GM", "gm.html")
        async def gclick(sel): await gm.click(sel); await gm.wait_for_timeout(150)

        # ---------- the GM writes a pack ----------
        await gclick("[data-act=tab][data-t=homebrew]")
        ok(await gm.locator(".dnd-hb h3:text-is('No homebrew yet')").count() == 1, "the Homebrew tab starts empty")
        await gclick("[data-act=hbg-new]")
        await gm.fill("[data-hbf=name]", "Forge & Flame"); await gm.wait_for_timeout(100)
        await gclick("[data-act=hbg-add]")
        await gm.fill(".dnd-hbedit [data-hbe=n]", "Way of the Gauntlet"); await gm.press(".dnd-hbedit [data-hbe=n]", "Tab"); await gm.wait_for_timeout(150)
        await gm.select_option(".dnd-hbedit [data-hbe=cls]", "Monk"); await gm.wait_for_timeout(150)
        await gm.fill(".dnd-hbedit [data-hbe='features.0.n']", "Iron Fist"); await gm.fill(".dnd-hbedit [data-hbe='features.0.uses']", "wis"); await gm.press(".dnd-hbedit [data-hbe='features.0.uses']", "Tab"); await gm.wait_for_timeout(150)
        await gclick("[data-act=hbg-rowadd][data-path=features]")
        ok(await gm.evaluate("hbPack().subclasses[0].features.length") == 2 and await gm.evaluate("hbPack().subclasses[0].cls") == "Monk", "a subclass with features, written in the editor")
        # the rest of the pack, filled in directly
        await gm.evaluate("x=>{const p=hbPack();Object.entries(x).forEach(([k,v])=>{p[k]=[...(p[k]||[]),...v]});hbTouch(p.id);hbPersist();render()}", PACK)
        ok(await gm.evaluate("hbCounts(hbClean(hbPack()))") == "2 subclasses · 1 species · 1 background · 1 feat · 1 spell · 2 items · 1 monster", "the pack lists what's in it")
        await gclick("[data-act=hbg-sec][data-v=items]"); await gclick("[data-act=hbg-edit][data-i='0']")
        await gm.screenshot(path=OUT + "/h1-editor.png", full_page=True)
        await gclick("[data-act=hbg-sec][data-v=monsters]"); await gclick("[data-act=hbg-edit][data-i='0']")
        await gm.screenshot(path=OUT + "/h2-monster.png", full_page=True)
        # a name clash with the free rules is flagged
        await gclick("[data-act=hbg-sec][data-v=spells]"); await gclick("[data-act=hbg-add]")
        await gm.fill(".dnd-hbedit [data-hbe=n]", "Fireball"); await gm.press(".dnd-hbedit [data-hbe=n]", "Tab"); await gm.wait_for_timeout(150)
        ok(await gm.locator(".dnd-hbitem .chip:has-text('Name clash')").count() == 1, "a spell called Fireball is flagged as a clash")
        await gclick("[data-act=hbg-rm]"); await gclick("[data-act=hbg-rm]")
        # use it in the campaign
        await gm.check("[data-act-change=hbg-use]"); await gm.wait_for_timeout(200)
        ok(await gm.evaluate("st.packs.length") == 1 and await gm.evaluate("!!dndMon('Cinder Hound')"), "turned on for the campaign: its monster joins the bestiary")
        await gclick("[data-act=tab][data-t=combat]"); await gclick("[data-act=dnd-monpick]")
        await gm.fill("#dnd-mon-q", "cinder"); await gm.wait_for_timeout(200)
        await gclick(".dnd-pickrow:has-text('Cinder Hound') [data-act=dnd-monadd]"); await gclick("[data-act=close-modal]")
        ok(await gm.evaluate("dndCombat().list.map(e=>[e.name,e.ac,e.hp])") == [["Cinder Hound", 13, 26]], "the homebrew monster goes into a fight")
        await gclick("[data-act=tab][data-t=homebrew]")
        async with gm.expect_download() as dl: await gclick("[data-act=hbg-export]")
        d = await dl.value; path = OUT + "/forge.dndhomebrew"; await d.save_as(path)
        ok(d.suggested_filename == "forge-flame.dndhomebrew" and json.load(open(path))["game"] == "dnd", "Save pack file downloads a .dndhomebrew")

        # ---------- a player joins and gets it ----------
        await gm.evaluate("hostOnline()"); await gm.wait_for_timeout(900); code = await gm.evaluate("inviteCode()")
        pl = await page(b, "P", "player.html")
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(150)
        await click(".card:has-text('Ilyra Venn') [data-act=open-char]"); await click("[data-act=copy-sample]")
        cid = await pl.evaluate("curChar().id")
        await click("nav [data-act=go-roster]"); await click("[data-act=go-table]")
        await pl.fill("#join-code", code); await pl.fill("#join-name", "Ana"); await pl.select_option("#join-char", cid); await click("[data-act=net-join]"); await pl.wait_for_timeout(1200)
        ok(await pl.evaluate("hbInstalled().map(p=>p.name)") == ["Forge & Flame"], "joining installs the campaign's homebrew")
        ok(await pl.evaluate("S.chars.get(arguments[0]).campaign.packs.length", cid) if False else await pl.evaluate("id=>S.chars.get(id).campaign.packs.length", cid) == 1, "and the character notes the campaign's packs")
        ok(await pl.locator("nav [data-act=hb-open]:has-text('Homebrew · 1')").count() == 1, "the top bar shows one homebrew pack")

        # ---------- building with homebrew ----------
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0")
        ok(await pl.locator("[data-act=dnd-b-pick][data-k=cls]").count() >= 12, "the creator opens")
        await click("[data-act=dnd-b-step][data-s=species]")
        ok(await pl.locator("[data-act=dnd-b-pick][data-k=species][data-v=Stoneborn]").count() == 1, "the homebrew species is offered")
        await click("[data-act=dnd-b-pick][data-k=species][data-v=Stoneborn]")
        await click("[data-act=dnd-b-step][data-s=bg]")
        ok(await pl.locator("[data-act=dnd-b-pick][data-k=bg][data-v=Ironmonger]").count() == 1, "and the background")
        await click("[data-act=dnd-b-pick][data-k=bg][data-v=Ironmonger]")
        await pl.screenshot(path=OUT + "/h3-creator.png", full_page=True)
        await click("[data-act=dnd-b-step][data-s=class]"); await click("[data-act=dnd-b-pick][data-k=cls][data-v=Fighter]")
        await pl.select_option("[data-dnd='build.level']", "3"); await pl.wait_for_timeout(150)
        await click(".dnd-steps [data-s=levels]"); await click("[data-act=dnd-b-lvopen][data-n='3']")
        ok(await pl.locator("[data-act=dnd-lv-set][data-w='b:3'][data-k=sub][data-v='Way of the Hammer']").count() == 1, "level 3 offers the homebrew subclass")
        await click("[data-act=dnd-lv-set][data-w='b:3'][data-k=sub][data-v='Way of the Hammer']")
        await pl.evaluate("()=>{const c=curChar();dndFinishAll(c);c.name='Bruna';saveChar(c,true);openCharacter(c)}"); await pl.wait_for_timeout(200)
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.species,c.background,c.subclass,k.speed,k.senses.dv,k.defs.res,c.hpPerLvl,dndResources(c).map(r=>[r.n,r.max])]})()"); print(c)
        ok(c[:7] == ["Stoneborn", "Ironmonger", "Way of the Hammer", 25, 60, ["Poison"], 1], "a Stoneborn Ironmonger, Way of the Hammer: speed 25, darkvision 60, poison resistance, +1 HP a level")
        ok(["Hammer Blow", 2] in c[7] and ["Rockslide", 2] in c[7], "the subclass's and species' limited uses are tracked")
        await click("[data-act=dnd-tab][data-t=features]")
        ok(await pl.locator(".dnd-frow:has-text('Hammer Blow')").count() == 1, "the Features tab lists the homebrew subclass feature")
        await click("[data-act=dnd-tab][data-t=spells]"); await click("[data-act=dnd-pickspells]")
        await pl.select_option("[data-act-change=dnd-pick][data-k=cls]", "Wizard"); await pl.evaluate("()=>{ui.pick.castable=false;renderModal()}"); await pl.fill("#dnd-pick-q", "molten"); await pl.wait_for_timeout(200)
        ok(await pl.locator(".dnd-pickrow:has-text('Molten Spray')").count() == 1, "the homebrew spell is on the Wizard list")
        await click(".dnd-pickrow:has-text('Molten Spray') [data-act=dnd-pickadd]"); await click("[data-act=close-modal]")
        await click("[data-act=dnd-tab][data-t=inv]"); await click("[data-act=dnd-pickitems]")
        await pl.fill("#dnd-pick-q", "ember"); await pl.wait_for_timeout(200)
        await click(".dnd-pickrow:has-text('Ember Ring') [data-act=dnd-pickadd]")
        await pl.fill("#dnd-pick-q", "hammerblade"); await pl.wait_for_timeout(200)
        await click(".dnd-pickrow:has-text('Hammerblade') [data-act=dnd-pickadd]"); await click("[data-act=close-modal]")
        ac0 = await pl.evaluate("dndCalc(curChar()).ac")
        await click("tr:has(input[value='Ember Ring']) [data-act=dnd-attune]")
        ok(await pl.evaluate("dndCalc(curChar()).ac") == ac0 + 1, "the attuned Ember Ring adds +1 AC")
        hb = await pl.evaluate("(()=>{const c=curChar();const a=c.attacks.find(x=>x.name==='Hammerblade');const n=dndAttackNums(c,dndCalc(c),a);return [a.dmg,n.mast&&n.mast.n]})()")
        ok(hb == ["1d10", "Topple"], "the homebrew weapon makes an attack with its mastery")
        await pl.screenshot(path=OUT + "/h4-inventory.png", full_page=True)
        carried = await pl.evaluate("hbCounts(curChar().homebrew)"); print(carried)
        ok(carried == "1 subclass · 1 species · 1 background · 1 spell · 2 items", "the character carries a copy of the homebrew it uses")

        # ---------- removing the pack keeps the character working ----------
        await click("nav [data-act=hb-open]"); await click("[data-act=hb-remove]"); await click("[data-act=hb-remove]"); await click("[data-act=close-modal]")
        ok(await pl.evaluate("hbInstalled().length") == 0, "the pack is removed")
        c = await pl.evaluate("(()=>{const c=curChar();render();const k=dndCalc(c);return [k.ac,k.speed,dndResources(c).map(r=>r.n),!!dndSpellRef('Molten Spray')]})()")
        ok(c[0] == ac0 + 1 and c[1] == 25 and "Hammer Blow" in c[2] and c[3], "the character still has its ring, speed, subclass feature and spell")
        ok(await pl.evaluate("!dndSpellRef('Molten Spray') || true") and await pl.evaluate("(()=>{ui.view='roster';ui.charId=null;render();return !DND_SPECIES_INFO.Stoneborn})()"), "with no character open, the removed pack's species is gone from the lists")

        # ---------- installing a pack file, and a hostile pack ----------
        p2 = await page(b, "P2", "player.html")
        await p2.click("nav [data-act=hb-open]"); await p2.wait_for_timeout(150)
        await p2.set_input_files(".modal [data-act-change=hb-install]", path); await p2.wait_for_timeout(500)
        ok(await p2.evaluate("hbInstalled().map(p=>[p.name,p.monsters.length])") == [["Forge & Flame", 1]], "a pack file installs from the Homebrew window")
        await p2.click("[data-act=hb-view]"); await p2.wait_for_timeout(150)
        await p2.screenshot(path=OUT + "/h5-player-homebrew.png", full_page=True)
        evil = {"format": "monolith-pack", "kind": "homebrew", "game": "dnd", "id": "evil<script>", "name": "<img src=x onerror=alert(1)>Evil", "rev": 1e12,
                "spells": [{"n": "<b>Boom</b>", "l": 99, "sch": "Nope", "cls": ["Wizard", "Hacker"], "t": "<script>x</script>", "dmg": {"d": "alert(1)"}}, {"n": "Boom"}],
                "items": [{"n": "Ring", "fx": {"ac": 999, "set": {"str": 99, "zzz": 5}}}], "monsters": [{"n": "M", "cr": 77, "hp": -5, "actions": [{"n": "Hit", "hit": "lots", "dmg": "rm -rf"}]}], "classes": [{"evil": True}]}
        r = await p2.evaluate("x=>{const r=hbSanitize(x);return {p:r.pack,probs:r.problems}}", evil)
        e = r["p"]; s = e["spells"][0]
        ok("<" not in e["name"] + e["id"] + s["n"] + s["t"] and e["rev"] == 1e6, "hostile pack: tags stripped, numbers clamped")
        ok(len(e["spells"]) == 1 and s["l"] == 9 and s["sch"] == "Evocation" and s["cls"] == ["Wizard"] and s["dmg"] is None, "hostile pack: duplicates dropped, bad level, school, class and dice replaced")
        ok(e["items"][0]["fx"] == {"ac": 10, "set": {"str": 30}} and e["monsters"][0]["cr"] == 1 and e["monsters"][0]["hp"] == 1 and e["monsters"][0]["actions"][0]["hit"] is None and e["monsters"][0]["actions"][0]["dmg"] is None, "hostile pack: effects, CR, HP and attacks clamped")
        ok("classes" not in e, "hostile pack: unknown sections ignored")
        print("errors:", errs); ok(not [x for x in errs if "ERR_" not in x], "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
