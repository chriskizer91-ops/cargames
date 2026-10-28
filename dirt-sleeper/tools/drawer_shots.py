import asyncio, sys, os
from playwright.async_api import async_playwright
# Screenshots of the tuning drawer without the 3D view: the game builds the drawer, then its markup and
# styles are shown on a plain page (SwiftShader screenshots of the live game are too slow).
OUT = os.environ.get('SHOTS', '/tmp')
PAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'dirt-sleeper.local.html'))
SETUP = """(tab)=>{const g=window.__game;if(g.state!=='drive'){g.chooseMode('free');document.querySelectorAll('.pcard')[3].click();document.getElementById('pickDrive').click();g.goTo('burn');}
for(let i=0;i<10;i++)g.frame(1/60);const u=g.ui();u.tuneTab=tab;u.tuneOn=true;document.getElementById('tune').hidden=false;u.tuneSync();
const live=document.getElementById('tuLive');live&&(live.innerHTML='<b>Dirt</b> · 4° slope · 0 mph · tyre slip 11.8 m/s<br>Ground grip here 1.00×');
return {css:[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n'),html:document.getElementById('tune').outerHTML.replace(' hidden=""','')}}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 800, 'height': 500})).new_page()
        pg.set_default_timeout(600000)
        logs = []
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        await pg.goto('file://' + PAGE + '?q=low&manual&fixed')
        for i in range(1500):
            if await pg.evaluate('window.__game&&window.__game.ready'): break
            await pg.wait_for_timeout(200)
        # change a few sliders first so the "changed" look shows
        await pg.evaluate("""()=>{const g=window.__game;g.chooseMode('free');document.querySelectorAll('.pcard')[3].click();document.getElementById('pickDrive').click();g.goTo('burn');
          const t=g.SETTINGS.tune;t.gDirt=1.15;t.low1=0.7;t.slope=0.35;g.tuneAB(false);}""")
        got = {tab: await pg.evaluate(SETUP, tab) for tab in ['phys', 'snd']}
        await b.close()
        b = await p.chromium.launch()
        for tab, d in got.items():
            for (W, H, tag) in [(1280, 820, 'desk'), (390, 844, 'phone')]:
                q = await b.new_page(viewport={'width': W, 'height': H})
                await q.set_content('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + d['css'] + '</style></head><body style="background:#3a3a30">' + d['html'] + '</body></html>')
                await q.wait_for_timeout(300)
                await q.screenshot(path=f'{OUT}/d_{tab}_{tag}.png')
                print('shot', tab, tag, flush=True)
                await q.close()
        for l in logs[:10]: print(l)
        await b.close()
asyncio.run(main())
