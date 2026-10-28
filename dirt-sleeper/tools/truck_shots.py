import asyncio, sys, json, os
from playwright.async_api import async_playwright
# Renders the truck in the yard with given builds from a few angles and stitches a contact sheet.
# usage: truck_shots.py '<json: [{"name":..,"build":{..}}]>' [angles json] [w h]
OUT = os.environ.get('SHOTS', '/tmp')
PAGE = os.environ.get('PAGE', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'dirt-sleeper.local.html')))
builds = json.loads(sys.argv[1])
angles = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else [[0.55, 0.1, 7.6], [2.6, 0.1, 7.6], [1.5708, 0.04, 8.4]]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 640
H = int(sys.argv[4]) if len(sys.argv) > 4 else 400
env = os.environ.get('ENV', 'afternoon')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': W, 'height': H})).new_page()
        pg.set_default_timeout(600000)
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        await pg.goto('file://' + PAGE + '?q=high&manual&fixed')
        for i in range(1500):
            if await pg.evaluate('window.__game&&window.__game.ready'): break
            if any('pageerror' in l for l in logs): break
            await pg.wait_for_timeout(200)
        await pg.evaluate("(()=>{const g=window.__game;g.chooseMode('free');g.enterGarage&&g.enterGarage();})()")
        await pg.evaluate(f"window.__game.setEnv({json.dumps(env)})")
        files = []
        for bi in builds:
            await pg.evaluate("(b)=>{const g=window.__game;if(b.look){g.applyBuild(Object.assign(g.presetBuild(b.look,g.SVnow.build),b.extra||{}));}else g.applyBuild(Object.assign({},g.SVnow.build,b));for(const id of ['garage','hud','title','toasts'])document.getElementById(id)&&(document.getElementById(id).hidden=true);}", bi['build'])
            row = []
            for k, (yaw, pitch, dist) in enumerate(angles):
                await pg.evaluate(f"(()=>{{const g=window.__game;g.cam.orbit={{yaw:{yaw},pitch:{pitch},dist:{dist},y:0.25,fov:0.62,cut:!0}};for(let i=0;i<14;i++)g.frame(1/60);}})()")
                fn = f"{OUT}/t_{bi['name']}_{k}.png"
                await pg.screenshot(path=fn)
                row.append(fn)
            files.append(row)
            print('shot', bi['name'])
        for l in logs[:30]: print(l[:600])
        await b.close()
    from PIL import Image, ImageDraw
    rows = len(files); cols = max(len(r) for r in files)
    sheet = Image.new('RGB', (cols * W // 2, rows * H // 2), (20, 20, 20))
    for i, r in enumerate(files):
        for j, f in enumerate(r):
            im = Image.open(f).convert('RGB').resize((W // 2, H // 2), Image.LANCZOS)
            sheet.paste(im, (j * W // 2, i * H // 2))
        ImageDraw.Draw(sheet).text((6, i * H // 2 + 4), builds[i]['name'], fill=(255, 220, 120))
    out = f"{OUT}/sheet_{os.environ.get('TAG','x')}.png"
    sheet.save(out)
    print('sheet', out)

asyncio.run(main())
