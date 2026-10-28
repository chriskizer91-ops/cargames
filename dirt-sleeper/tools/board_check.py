# Load the sound board headless, start sound, step through scenes, read the meters, take screenshots.
import asyncio, sys, json, os
from playwright.async_api import async_playwright
PAGE=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','dist','sound-board.local.html'))
OUT=os.environ.get('SHOTS','/tmp')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for (W,H,tag) in [(1280,900,'desk'),(390,844,'phone')]:
            pg=await b.new_page(viewport={'width':W,'height':H}); logs=[]
            pg.on('console', lambda m: logs.append(m.type+': '+m.text)); pg.on('pageerror', lambda e: logs.append('pageerror: '+str(e)))
            await pg.goto('file://'+PAGE); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{OUT}/b_{tag}_rest.png', full_page=(tag=='desk'))
            if tag=='desk':
                await pg.click('#start'); await pg.wait_for_timeout(2500)
                print('audio', await pg.evaluate("[window.__board.audio.kind, window.__board.audio.ctx&&window.__board.audio.ctx.state, window.__board.audio.ready].join(' ')"))
                for sc in ['Idle in the shop','Cruising the trail','Redline on the strip','Night at the creek','Storm, in the cab','Mud bog','Just the world']:
                    await pg.click(f'.tag:has-text("{sc}")'); await pg.wait_for_timeout(2600)
                    lv=await pg.evaluate("(()=>{const L=window.__board.audio.levels();const o={};for(const k in L)o[k]=Array.isArray(L[k])?L[k].map(x=>+x.toFixed(1)):+L[k].toFixed(1);return JSON.stringify(o)})()")
                    print(sc.ljust(22), lv)
                await pg.screenshot(path=f'{OUT}/b_{tag}_live.png')
            for l in logs[:20]:
                if 'ERR_TUNNEL' not in l: print(l[:400])
            await pg.close()
        await b.close()
asyncio.run(main())
