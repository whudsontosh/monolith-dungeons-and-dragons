"""Class features on attacks (Rage, Sneak Attack, Martial Arts and Unarmed Strike, Divine Smite,
Hunter's Mark, Archery, Improved Critical, weapon mastery) and the Companions tab (familiars,
companions, and a Druid's Wild Shape forms)."""
import asyncio, sys
from playwright.async_api import async_playwright
from harness import *

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pl = await page(b, "P", "player.html")
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(120)
        async def shot(n): await pl.screenshot(path=OUT + f"/{n}.png", full_page=True)
        ev = pl.evaluate
        async def become(cls, sub, level, ab, items=(), extra=""):
            await ev("""([cls,sub,level,ab,items,extra])=>{const c=curChar();Object.assign(c,{cls,subclass:sub,level,multi:[],ab,attacks:[],inv:[],feats:[],conc:'',raging:false,res:{},comps:[],form:'',acAuto:true,spells:[]});
              c.saveProf=Object.fromEntries(DND_ABILITIES.map(([a])=>[a,DND_CLASSES[cls].saves.includes(a)]));items.forEach(n=>dndAddItem(c,dndItemRef(n)));if(extra)eval(extra);saveChar(c,true);render()}""", [cls, sub, level, ab, list(items), extra])
            await pl.wait_for_timeout(150)
        nums = lambda name: ev(f"(()=>{{const c=curChar();const k=dndCalc(c);const a=c.attacks.find(x=>x.name==={name!r})||dndUnarmed(c);const n=dndAttackNums(c,k,a);return {{hit:n.hit,dmg:n.dmg,mod:n.dmgMod,riders:n.riders.map(r=>[r.k,r.d||'']),crit:n.critMin,mast:n.mast,ma:n.ma}}}})()")
        fix = lambda v: ev(f"window.__r=Math.random;Math.random=()=>{v}")
        unfix = lambda: ev("Math.random=window.__r")
        await click(".card:has-text('Ilyra Venn') [data-act=open-char]"); await click("[data-act=copy-sample]")

        # ---------- Barbarian: Rage ----------
        await become("Barbarian", "", 5, {"str": 17, "dex": 14, "con": 15, "int": 8, "wis": 12, "cha": 10}, ["Greataxe"])
        ok(await pl.locator(".dnd-atk:has-text('Unarmed Strike')").count() == 1, "everyone gets an Unarmed Strike")
        u = await nums("Unarmed Strike"); ok(u["hit"] == 3 + 3 and u["dmg"] == "" and u["mod"] == 1 + 3, "Unarmed Strike: +6 to hit, 1 + Strength damage")
        g = await nums("Greataxe"); ok(g["hit"] == 6 and g["dmg"] == "1d12" and g["mod"] == 3, "Greataxe before raging: 1d12+3")
        await click("[data-act=dnd-rage] >> nth=0")
        g = await nums("Greataxe")
        ok(await ev("[curChar().raging,curChar().res.rage]") == [True, 1] and g["mod"] == 3 + 2, "Rage spends a use and adds +2 to Strength damage")
        ok(set(["Bludgeoning", "Piercing", "Slashing"]) <= set(await ev("dndCalc(curChar()).defs.res")) and await pl.locator(".dnd-headtools [data-act=dnd-rage]:has-text('Raging')").count() == 1, "while raging: resistances, and a Raging button in the header")
        await shot("f1-rage")
        await click("[data-act=dnd-short]")
        ok(await ev("curChar().raging") is False, "a rest ends the Rage")

        # ---------- Rogue: Sneak Attack, crits doubling it ----------
        await become("Rogue", "", 5, {"str": 10, "dex": 17, "con": 12, "int": 13, "wis": 12, "cha": 14}, ["Rapier", "Shortbow"])
        r = await nums("Rapier"); ok(["sneak", "3d6"] in r["riders"] and r["hit"] == 3 + 3, "a Rogue's finesse weapon offers Sneak Attack 3d6")
        ok(["sneak", "3d6"] in (await nums("Shortbow"))["riders"] and not (await nums("Unarmed Strike"))["riders"], "ranged weapons too, but not an Unarmed Strike")
        await fix(0.5); await click(".dnd-atk:has-text('Rapier') [data-act=dnd-rider][data-k=sneak]"); await unfix()
        e = await ev("Dice.log[0]"); ok(e["label"] == "Rapier: Sneak Attack" and e["detail"].startswith("3d6"), "rolling Sneak Attack on its own")
        await fix(0.999); await click(".dnd-atk:has-text('Rapier') [data-act=dnd-attack]"); await click(".dnd-atk:has-text('Rapier') [data-act=dnd-rider][data-k=sneak]"); await unfix()
        e = await ev("Dice.log[0]"); ok(e["detail"].startswith("6d6"), "after a natural 20, Sneak Attack's dice are doubled")
        await shot("f2-sneak")

        # ---------- Fighter: Improved Critical, Archery, weapon mastery ----------
        await become("Fighter", "Champion", 3, {"str": 16, "dex": 14, "con": 14, "int": 10, "wis": 12, "cha": 8}, ["Longbow", "Maul"], "c.feats.push({n:'Archery',lvl:1,src:'Fighting Style'})")
        bow = await nums("Longbow"); maul = await nums("Maul")
        ok(bow["crit"] == 19 and bow["hit"] == 2 + 2 + 2, "Champion crits on 19–20; Archery adds +2 to the longbow (+6)")
        ok(maul["hit"] == 3 + 2 and maul["mast"]["n"] == "Topple" and maul["mast"]["dc"] == 8 + 3 + 2, "the maul shows its Topple mastery with the save DC (13)")
        await fix(0.91); await click(".dnd-atk:has-text('Longbow') [data-act=dnd-attack]"); await unfix()
        ok(await ev("ui.dndLastHit.crit") is True, "a natural 19 counts as a critical hit")
        ok(await pl.locator(".dnd-atk:has-text('Longbow') .dnd-mast:has-text('Slow')").count() == 1, "the longbow's Slow mastery is shown")

        # ---------- Monk: Martial Arts ----------
        await become("Monk", "", 5, {"str": 10, "dex": 16, "con": 14, "int": 10, "wis": 16, "cha": 8}, ["Shortsword"])
        u = await nums("Unarmed Strike"); s = await nums("Shortsword")
        ok(u["dmg"] == "1d8" and u["hit"] == 3 + 3 and u["mod"] == 3 and u["ma"], "Martial Arts: Unarmed Strike uses Dexterity and a d8")
        ok(s["dmg"] == "1d8" and s["hit"] == 6, "a shortsword (martial, light) uses the bigger Martial Arts die")

        # ---------- Paladin: Divine Smite; Ranger: Hunter's Mark ----------
        await become("Paladin", "", 5, {"str": 16, "dex": 10, "con": 14, "int": 8, "wis": 10, "cha": 16}, ["Longsword"])
        ok(["smite", ""] in (await nums("Longsword"))["riders"], "a Paladin's melee attacks offer Divine Smite")
        await click(".dnd-atk:has-text('Longsword') [data-act=dnd-rider][data-k=smite]")
        ok(await pl.locator(".modal [data-act=dnd-smitego]").count() == 2, "Divine Smite asks which slot (1st or 2nd)")
        await shot("f3-smite")
        await click(".modal input[data-act-change=dnd-smiteund]")
        await click(".modal [data-act=dnd-smitego][data-l='2']")
        e = await ev("Dice.log[0]")
        ok(e["label"] == "Longsword: Divine Smite" and e["detail"].startswith("4d8") and await ev("curChar().slotsUsed[2]") == 1, "a 2nd-level smite against a fiend: 4d8 radiant, and the slot is spent")
        await become("Ranger", "", 5, {"str": 10, "dex": 16, "con": 14, "int": 8, "wis": 14, "cha": 10}, ["Longbow"], "c.conc=\"Hunter's Mark\"")
        ok(["mark", "1d6"] in (await nums("Longbow"))["riders"], "concentrating on Hunter's Mark adds a 1d6 force rider")
        await click("[data-act=dnd-tab][data-t=actions]")
        ok(await pl.locator(".dnd-actrow:has-text('Longbow') [data-act=dnd-rider][data-k=mark]").count() == 1 and await pl.locator(".dnd-actrow:has-text('Unarmed Strike')").count() == 1, "the Actions tab has the riders and the Unarmed Strike too")
        await click("[data-act=dnd-tab][data-t=sheet]")

        # ---------- Companions: a Druid's Wild Shape ----------
        await become("Druid", "", 4, {"str": 10, "dex": 14, "con": 14, "int": 12, "wis": 16, "cha": 8})
        await click("[data-act=dnd-tab][data-t=comps]")
        ok(await pl.locator(".chip:has-text('Known forms 0 / 6')").count() == 1 and await pl.locator(".chip:has-text('Up to CR 1/2')").count() == 1, "Druid 4: six known forms, up to CR 1/2, no flying")
        await click("[data-act=dnd-comppick][data-k=form]")
        names = await ev("[...document.querySelectorAll('.modal .dnd-pickname b')].map(x=>x.textContent)")
        ok("Wolf" in names and "Owl" not in names and await ev("ns=>ns.every(n=>dndMon(n).cr<=0.5&&!/fly/i.test(dndMon(n).speed))", names), "the form list only has beasts up to CR 1/2 that can't fly")
        await pl.fill("#dnd-comp-q", "wolf"); await pl.wait_for_timeout(150)
        await click(".modal .dnd-pickrow:has(.dnd-pickname b:text-is('Wolf')) [data-act=dnd-compadd]"); await click("[data-act=close-modal]")
        ok(await ev("curChar().comps.map(x=>[x.kind,x.n,x.ac,x.max])") == [["form", "Wolf", 12, 11]], "the Wolf is a known form (AC 12, 11 HP)")
        await click("[data-act=dnd-formon]")
        ok(await ev("[curChar().form===curChar().comps[0].id,curChar().res.ws,curChar().hpTemp]") == [True, 1, 4], "assuming the form spends Wild Shape and gives 4 temporary HP")
        await click("[data-act=dnd-compopen]")
        await fix(0.5); await click(".dnd-comp [data-act=dnd-monroll][data-r=hit]"); await unfix()
        e = await ev("Dice.log[0]"); ok(e["who"] == "Wolf" and e["label"].endswith("to hit"), "the form's stat block rolls its attacks")
        await shot("f4-wildshape")
        await click("[data-act=dnd-tab][data-t=sheet]")
        ok(await pl.locator(".dnd-formbanner:has-text('In Wolf form')").count() == 1, "the Sheet tab says you're in Wolf form")
        await click("[data-act=dnd-tab][data-t=comps]")
        wid = await ev("curChar().comps[0].id")
        await pl.fill(f"[data-compamt='{wid}']", "20"); await click(f"[data-act=dnd-comphit][data-id='{wid}']")
        ok(await ev("[curChar().comps[0].hp,curChar().form]") == [0, ""], "dropping the form to 0 HP ends Wild Shape")
        # a familiar and a written-in companion
        await click("[data-act=dnd-comppick][data-k=companion]")
        await pl.select_option(".modal [data-act-change=dnd-compfilter]", "familiar"); await pl.select_option(".modal [data-act-change=dnd-compkind]", "familiar"); await pl.wait_for_timeout(150)
        fam = await ev("[...document.querySelectorAll('.modal .dnd-pickname b')].map(x=>x.textContent)")
        ok("Owl" in fam and await ev("ns=>ns.every(n=>dndMon(n).cr===0)", fam), "familiars: CR 0 beasts")
        await click(".modal .dnd-pickrow:has(.dnd-pickname b:text-is('Owl')) [data-act=dnd-compadd]"); await click("[data-act=close-modal]")
        await click("[data-act=dnd-compcustom]"); await pl.fill("[data-dnd='comps.2.n']", "Bramble the pony"); await pl.wait_for_timeout(120)
        ok(await ev("curChar().comps.map(x=>[x.kind,x.n])") == [["form", "Wolf"], ["familiar", "Owl"], ["other", "Bramble the pony"]], "a familiar Owl and a written-in pony")
        await click("[data-act=dnd-long]")
        ok(await ev("curChar().comps[0].hp") == 11, "a long rest heals companions")
        await shot("f5-companions")
        print("errors:", errs); ok(not errs, "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
