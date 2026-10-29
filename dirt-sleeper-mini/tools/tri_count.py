import asyncio, json, os, sys, time
from playwright.async_api import async_playwright
# Places the truck at spots round the world, draws one frame at the smallest dot size and reports the
# triangles drawn (the GPU's load), with the fine ground tiles held and the trees sorted near/far.
PAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'dirt-sleeper-mini.html'))
SPOTS = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [['shop',6,4,0],['yard north',0,-60,1.57],['woods',-250,-560,1.57],['deep woods',-150,-700,0],['pond',-60,-474,1.57],['home',-462,624,-2.3],['store',470,410,.5],['track',380,505,0],['county',300,401,0],['range',480,-300,1.57]]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await (await b.new_context(viewport={'width': 640, 'height': 360})).new_page()
        pg.set_default_timeout(900000)
        await pg.goto('file://' + PAGE)
        for i in range(600):
            if await pg.evaluate('!!(window.__game&&window.__game.GAME.truck)'): break
            await pg.wait_for_timeout(100)
        await pg.evaluate("(()=>{const G=__game;G.GAME.hold=true;G.setRes(0);dispatchEvent(new Event('resize'));G.closeMenu();})()")
        for name, x, z, yaw in SPOTS:
            r = await pg.evaluate("([x,z,yaw])=>{const G=__game;G.placeTruck(x,z,yaw);for(let i=0;i<4;i++)G.render(1/60);const t0=performance.now();G.render(1/60);return {tris:G.APP.tris,lod0:G.RANCH.lod0,st:G.RANCH.stat}}", [x, z, yaw])
            st=r['st'];print(f"{name:12s} {r['tris']/1000:6.1f}k tris (ground {st['ground']/1000:.1f}k, props {st['props']/1000:.1f}k, trees {st['trees']/1000:.1f}k, truck and fx {(r['tris']-st['ground']-st['props']-st['trees'])/1000:.1f}k)  fine tiles {r['lod0']}")
        await b.close()
asyncio.run(main())
