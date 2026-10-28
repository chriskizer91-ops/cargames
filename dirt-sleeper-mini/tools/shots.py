import asyncio, sys, json, os
from playwright.async_api import async_playwright
# Renders the model bay headless (SwiftShader) for a list of builds and views and stitches a contact sheet.
# usage: shots.py '<json: {"builds":[0,1,2,3],"views":["front34","side","rear34"],"app":{..},"res":2}>' [out.png]
cfg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/sheet.png'
PAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'model-bay.html'))
VW, VH = cfg.get('vw', 1280), cfg.get('vh', 900)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': VW, 'height': VH}, device_scale_factor=1)).new_page()
        pg.set_default_timeout(600000)
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        await pg.goto('file://' + PAGE)
        for i in range(100):
            if await pg.evaluate('!!window.__bay'): break
            await pg.wait_for_timeout(100)
        if not await pg.evaluate('!!window.__bay'):
            for l in logs[:40]: print(l[:800])
            await b.close(); return
        await pg.evaluate(f"(()=>{{const B=window.__bay;B.setRes({cfg.get('res',2)});document.getElementById('dock').hidden={json.dumps(not cfg.get('dock',False))};document.querySelector('.bar').hidden=true;dispatchEvent(new Event('resize'));}})()")
        files = []
        for bi in cfg.get('builds', [0]):
            row = []
            for v in cfg.get('views', ['front34']):
                app = dict(cfg.get('app', {}))
                await pg.evaluate("([bi,v,app])=>{const B=window.__bay;B.setCompare(!!app.compare);B.setBuild(bi);B.setView(v);B.APP.spin=false;Object.assign(B.APP,app,{cam:B.APP.cam});if(B.APP.camT){Object.assign(B.APP.cam,B.APP.camT);B.APP.camT=null;}if(app.cam)Object.assign(B.APP.cam,app.cam);B.render(1/60);}", [bi, v, app])
                fn = f"{OUT}.{bi}_{v}.png"
                data = await pg.evaluate("window.__bay.snap()")
                import base64
                open(fn, 'wb').write(base64.b64decode(data.split(',')[1]))
                row.append(fn)
            files.append(row)
        tm = await pg.evaluate("(()=>{const B=window.__bay;return B.BUILDS.map((b,i)=>[b.id,B.truck(i).tris,B.truck(i).ms.toFixed(0)])})()")
        print('tris/build-ms', tm)
        for l in logs[:30]: print(l[:800])
        await b.close()
    from PIL import Image
    sc = cfg.get('scale', 0.5)
    ims = [[Image.open(f).convert('RGB') for f in r] for r in files]
    w, h = ims[0][0].size; w2, h2 = int(w * sc), int(h * sc)
    cols = max(len(r) for r in ims)
    sheet = Image.new('RGB', (cols * w2, len(ims) * h2), (10, 10, 10))
    for i, r in enumerate(ims):
        for j, im in enumerate(r):
            sheet.paste(im.resize((w2, h2), Image.LANCZOS), (j * w2, i * h2))
    sheet.save(OUT)
    print('sheet', OUT, sheet.size)

asyncio.run(main())
