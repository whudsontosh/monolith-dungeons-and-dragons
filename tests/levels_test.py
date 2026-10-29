"""Levels 1 to 20: the Features tab, the Level up dialog (hit points, subclass, ability increases,
feats, epic boons, fighting styles, invocations, expertise), and the creator starting above level 1."""
import asyncio, sys, os
from playwright.async_api import async_playwright
from harness import *

# fills in whatever the open Level up dialog asks for, the first option each time
AUTO = """(mode)=>{const c=dndLvFind();const st=ui.lvl;for(let pass=0;pass<2;pass++){const n=dndLvNeeds(c);
  if(n.needSub&&!st.sub)st.sub=DND_LEVELS[c.cls].sub.n;
  if(n.asi&&mode!=='feat'){st.asi='asi';st.asiMode='11';const abs=DND_ABILITIES.map(a=>a[0]).filter(a=>c.ab[a]<20);st.a1=abs[0];st.b1=abs[1]}
  n.picks.forEach(p=>{if(!(st.picks[p.pool]||[]).length)st.picks[p.pool]=p.options.slice(0,p.count).map(o=>o.n)});
  if(n.styles&&!(st.picks.__style||[]).length)st.picks.__style=[DND_FEAT_LIST.filter(f=>f.cat==='fighting-style'&&!c.feats.some(x=>x.n===f.n))[0].n];
  if(n.expertise&&!st.exp.length)st.exp=Object.keys(c.skills).filter(s=>c.skills[s]===1).slice(0,2)}
  renderModal();return dndLvMissing(c)}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pl = await page(b, "P", "player.html")
        async def click(sel): await pl.click(sel); await pl.wait_for_timeout(120)
        async def shot(n): await pl.screenshot(path=OUT + f"/{n}.png", full_page=True)
        async def level(mode=""):
            miss = await pl.evaluate(AUTO, mode); await pl.wait_for_timeout(60)
            if miss: print("missing:", miss)
            await click("[data-act=dnd-lv-apply]")
            return miss

        # the example wizard (level 3 Evoker)
        await click(".card:has-text('Ilyra Venn') [data-act=open-char]"); await click("[data-act=copy-sample]")
        await click("[data-act=dnd-tab][data-t=features]")
        txt = await pl.inner_text(".dnd")
        ok("Evocation Savant" in txt and "Arcane Recovery" in txt and "Scholar" in txt, "Features tab lists class and Evoker features up to level 3")
        ok(await pl.evaluate("JSON.stringify(dndTableAt(curChar(),3))") == '[["Prepared Spells",6],["Cantrips",3]]', "class table at level 3: 6 prepared spells, 3 cantrips")
        await shot("l1-features")
        # 3 → 4: Ability Score Improvement +2 INT
        await click(".dnd-ftop [data-act=dnd-levelup]")
        ok(await pl.locator(".modal:has-text('Level 3 → 4')").count() == 1, "the Level up dialog opens")
        ok(await pl.is_disabled("[data-act=dnd-lv-apply]"), "it waits for the ability score choice")
        await pl.select_option("[data-act-change=dnd-lv][data-k=a2]", "int"); await pl.wait_for_timeout(150)
        await shot("l2-dialog")
        await click("[data-act=dnd-lv-apply]")
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.level,c.ab.int,k.hpMax,c.feats.map(f=>f.n)]})()"); print(c)
        ok(c[0] == 4 and c[1] == 19 and c[2] == 26, "level 4: INT 17 → 19, HP 20 + (4 + 2) = 26")
        # 4 → 5 with a rolled hit die
        await click(".dnd-head [data-act=dnd-levelup]")
        await click("[data-act=dnd-lv-set][data-k=hp][data-v=roll]")
        ok(await pl.is_disabled("[data-act=dnd-lv-apply]"), "choosing to roll waits for the roll")
        await pl.evaluate("window.__r=Math.random;Math.random=()=>0.99"); await click("[data-act=dnd-lv-roll]"); await pl.evaluate("Math.random=window.__r")
        await click("[data-act=dnd-lv-apply]")
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.level,c.hpRolls,k.hpMax,k.slots.slice(1,4),k.pb]})()"); print(c)
        ok(c[0] == 5 and c[1] == {"5": 6} and c[2] == 34 and c[3] == [4, 3, 2] and c[4] == 3, "level 5: rolled a 6 (+2 CON) → 34 HP, 3rd-level slots, proficiency +3")
        # on to 20, with an epic boon at 19
        for lvl in range(6, 21):
            await click(".dnd-head [data-act=dnd-levelup]")
            if lvl == 19:
                await click("[data-act=dnd-lv-set][data-k=asi][data-v=feat]")
                await pl.select_option("[data-act-change=dnd-lv][data-k=feat]", "Boon of Spell Recall"); await pl.wait_for_timeout(120)
                await pl.select_option("[data-act-change=dnd-lv][data-k=featAb]", "int"); await pl.wait_for_timeout(120)
                await shot("l3-epic")
                await click("[data-act=dnd-lv-apply]")
            else:
                await level()
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.level,c.ab.int,k.slots.slice(1),c.feats.filter(f=>f.src==='level').length,c.feats.some(f=>f.n==='Boon of Spell Recall'),k.pb]})()"); print(c)
        ok(c[0] == 20 and c[2] == [4, 3, 3, 3, 3, 2, 2, 1, 1] and c[5] == 6, "level 20 wizard: full slot table, proficiency +6")
        ok(c[3] == 5 and c[4], "five level choices recorded, including the Epic Boon")
        txt = await pl.inner_text(".dnd")
        ok("Signature Spells" in txt and "Overchannel" in txt and "Spell Mastery" in txt, "Features tab shows level 18 and 20 class features and level 14 Evoker")
        ok(await pl.locator(".dnd-ftop [data-act=dnd-levelup]").count() == 0, "no Level up at 20")
        await shot("l4-level20")
        # a Fighter made at level 5 in the creator
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0")
        await click("[data-act=dnd-b-pick][data-k=cls][data-v=Fighter]")
        await pl.select_option("[data-dnd='build.level']", "5"); await pl.wait_for_timeout(150)
        ok((await pl.evaluate("dndOpen(curChar().build).class")) == 3, "Fighter asks for 2 skills and a fighting style")
        await click("[data-act=dnd-b-choice][data-pool='Fighting Style'][data-v=Defense]")
        await click("[data-act=dnd-b-toggle][data-k=clsSkills][data-v=athletics]"); await click("[data-act=dnd-b-toggle][data-k=clsSkills][data-v=perception]")
        ok(await pl.locator(".dnd-lvtable tr.now").count() == 5, "the class's level table highlights levels 1 to 5")
        await shot("l5-creator-class")
        await pl.evaluate("""()=>{const c=curChar();Object.assign(c.build,{bg:'Soldier',plus2:'str',plus1:'con',species:'Orc',method:'array',name:'Grusk'});
          const ci=DND_CLASS_INFO.Fighter;const t=new Set();DND_ABILITIES.forEach(([a])=>{const i=DND_STANDARD_ARRAY.findIndex((v,j)=>v===ci.array[a]&&!t.has(j));t.add(i);c.build.arr[a]=i});saveChar(c,true);render()}""")
        await pl.wait_for_timeout(200); await click("[data-act=dnd-b-step][data-s=review]"); await click("[data-act=dnd-b-finish]"); await pl.wait_for_timeout(300)
        ok(await pl.locator(".modal:has-text('Level 1 → 2')").count() == 1 and await pl.locator(".modal:has-text('Building to level 5')").count() == 1, "Finish at level 5 walks through level 2 first")
        await level()
        ok(await pl.locator(".modal:has-text('Level 2 → 3')").count() == 1, "then level 3")
        miss = await pl.evaluate(AUTO, "")
        ok(await pl.evaluate("ui.lvl.sub") == "Champion", "level 3 asks for the subclass")
        await shot("l6-subclass"); await click("[data-act=dnd-lv-apply]")
        # level 4: take the Grappler feat (+1 STR)
        await click("[data-act=dnd-lv-set][data-k=asi][data-v=feat]")
        await pl.select_option("[data-act-change=dnd-lv][data-k=feat]", "Grappler"); await pl.wait_for_timeout(120)
        await pl.select_option("[data-act-change=dnd-lv][data-k=featAb]", "str"); await pl.wait_for_timeout(120)
        await click("[data-act=dnd-lv-apply]"); await level()
        c = await pl.evaluate("(()=>{const c=curChar();const k=dndCalc(c);return [c.level,c.subclass,c.ab.str,c.feats.map(f=>f.n),c.choices,ui.modal,k.hpMax,c.pendingLevel]})()"); print(c)
        ok(c[0] == 5 and c[1] == "Champion" and c[2] == 18 and "Grappler" in c[3] and c[4] == {"Fighting Style": ["Defense"]} and c[5] is None and c[7] == 0, "Grusk reaches level 5: Champion, Grappler (STR 18), Defense style")
        ok(c[6] == 10 + 2 + 4 * (6 + 2), "Fighter 5 HP with CON 14: 44")
        await click("[data-act=dnd-tab][data-t=features]")
        txt = await pl.inner_text(".dnd")
        ok("Improved Critical" in txt and "Extra Attack" in txt and "Tactical Shift" in txt and "Defense" in txt, "Fighter features, Champion features and the chosen style are listed")
        # a Warlock picks invocations at 1 and 2
        await click("nav [data-act=go-roster]"); await click("[data-act=new-character] >> nth=0")
        await click("[data-act=dnd-b-pick][data-k=cls][data-v=Warlock]")
        await click("[data-act=dnd-b-choice][data-pool='Eldritch Invocations'][data-v='Pact of the Tome']")
        await pl.evaluate("""()=>{const c=curChar();Object.assign(c.build,{clsSkills:['arcana','deception'],bg:'Sage',plus2:'int',plus1:'wis',species:'Tiefling',lineage:'Infernal',method:'manual',name:'Vex'});saveChar(c,true);render()}""")
        await pl.wait_for_timeout(200); await click("[data-act=dnd-b-step][data-s=review]"); await click("[data-act=dnd-b-finish]"); await pl.wait_for_timeout(300)
        await click(".dnd-head [data-act=dnd-levelup]")
        ok(await pl.locator(".modal:has-text('Eldritch Invocations: choose 2')").count() == 1, "Warlock level 2 asks for two more invocations")
        ok(await pl.locator(".modal [data-act=dnd-lv-pick][data-v='Pact of the Tome']").count() == 0, "an invocation already taken isn't offered again")
        await level()
        ok(len(await pl.evaluate("curChar().choices['Eldritch Invocations']")) == 3, "three invocations after level 2")
        # a Rogue gets more expertise at 6
        await pl.evaluate("""()=>{const c=curChar();c.cls='Rogue';c.level=5;c.subclass='Thief';c.skills={stealth:2,acrobatics:2,perception:1,insight:1,athletics:1};saveChar(c,true);render()}""")
        await pl.wait_for_timeout(200); await click(".dnd-head [data-act=dnd-levelup]")
        ok(await pl.locator(".modal:has-text('Expertise: choose 2')").count() == 1, "Rogue level 6 asks for expertise")
        await level()
        ok(await pl.evaluate("Object.values(curChar().skills).filter(v=>v===2).length") == 4, "four expertise skills at Rogue 6")
        await pl.set_viewport_size({"width": 420, "height": 900}); await click("[data-act=dnd-tab][data-t=features]"); await shot("l7-phone")
        print("errors:", errs); ok(not errs, "no page errors")
        await b.close()
    sys.exit(finish())

asyncio.run(main())
