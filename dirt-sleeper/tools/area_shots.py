import asyncio, sys, json, os
from playwright.async_api import async_playwright
# Looks at the free-roam areas from an orbit camera around the truck parked in each one.
# usage: area_shots.py '<json: [{"name":..,"build":"mudder","x":..,"z":..,"yaw":..,"orbit":{yaw,pitch,dist,y,fov}}]>' [w h]
OUT = os.environ.get('SHOTS', '/tmp')
PAGE = os.environ.get('PAGE', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'dirt-sleeper.local.html')))
views = json.loads(sys.argv[1])
W = int(sys.argv[2]) if len(sys.argv) > 2 else 800
H = int(sys.argv[3]) if len(sys.argv) > 3 else 500

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': W, 'height': H})).new_page()
        pg.set_default_timeout(600000)
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        await pg.goto('file://' + PAGE + '?q=medium&manual&fixed')
        for i in range(1500):
            if await pg.evaluate('window.__game&&window.__game.ready'): break
            if any('pageerror' in l for l in logs): break
            await pg.wait_for_timeout(200)
        await pg.evaluate("(()=>{const g=window.__game;g.chooseMode('free');})()")
        for v in views:
            await pg.evaluate("(v)=>{const g=window.__game;v.build&&g.applyBuild(g.presetBuild(v.build,g.SVnow.build));g.setEnv(v.env||'afternoon');g.placeTruck(v.x,v.z,v.yaw||0);g.cam.orbit=Object.assign({cut:!0},v.orbit);for(const id of ['garage','hud','title','toasts','pick'])document.getElementById(id)&&(document.getElementById(id).hidden=true);for(let i=0;i<12;i++)g.frame(1/60);}", v)
            fn = f"{OUT}/a_{v['name']}.png"
            try:
                await pg.screenshot(path=fn, timeout=240000)
                print('shot', v['name'], flush=True)
            except Exception as e:
                print('shot failed', v['name'], str(e)[:80], flush=True)
        for l in logs[:30]:
            'TUNNEL' in l or print(l[:600])
        await b.close()

asyncio.run(main())
