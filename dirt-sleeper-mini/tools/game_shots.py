import asyncio, sys, json, os, base64, time
from playwright.async_api import async_playwright
# Loads the game headless, drives scripted runs with the game's own step(), and saves stills.
# usage: game_shots.py '<json: {"runs":[{"build":0,"place":"mud","keys":["KeyW"],"secs":3,"cam":0,"name":"x"}],"res":2}>' outprefix
cfg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/game'
PAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dist', 'dirt-sleeper-mini.html'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
        pg = await (await b.new_context(viewport={'width': cfg.get('vw', 1280), 'height': cfg.get('vh', 720)}, device_scale_factor=1)).new_page()
        pg.set_default_timeout(900000)
        logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text))
        pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
        t0 = time.time()
        await pg.goto('file://' + PAGE)
        for i in range(600):
            if await pg.evaluate('!!(window.__game&&window.__game.GAME.truck)'): break
            await pg.wait_for_timeout(100)
        print('boot', round(time.time() - t0, 1), 's', await pg.evaluate('window.__game?{ranchMs:Math.round(__game.RANCH.ms),shapeMs:Math.round(__game.RANCH.shapeMs),tiles:__game.RANCH.ground.length,props:__game.RANCH.props.length}:null'))
        if not await pg.evaluate('!!window.__game'):
            for l in logs[:30]: print(l[:500])
            await b.close(); return
        await pg.evaluate(f"(()=>{{const G=__game;G.GAME.hold=true;G.setRes({cfg.get('res',2)});dispatchEvent(new Event('resize'));G.closeMenu();document.querySelector('.bar').hidden={json.dumps(not cfg.get('bar',False))};}})()")
        if cfg.get('menu'):
            await pg.evaluate("__game.openMenu(true)")
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=OUT + '_menu.png'); print('menu shot')
            await pg.evaluate("__game.closeMenu()")
        for r in cfg.get('runs', []):
            await pg.evaluate("([r])=>{const G=__game;if(r.level){G.APP.level=r.level;}if(r.build!==undefined&&r.build!==G.APP.build){G.APP.build=r.build;G.spawnTruck(r.build);}G.GAME.truck.setAssists(G.APP.level);if(r.place)G.goTo(r.place);if(r.cam!==undefined){G.APP.cam=r.cam;G.CAM.cut=true;}if(r.pos)G.placeTruck(r.pos[0],r.pos[1],r.pos[2]);G.GAME.truck.pt.st='run';G.GAME.truck.pt.we=G.GAME.truck.pt.e.idle*Math.PI*2/60;}", [r])
            for k in r.get('keys', []): await pg.keyboard.down(k)
            st = await pg.evaluate("([secs])=>{const G=__game,t0=performance.now();const n=Math.round(secs*60);for(let i=0;i<n;i++)G.step(1/60);const t=G.GAME.truck;return {ms:Math.round((performance.now()-t0)/n*10)/10,pos:t.p.map(v=>+v.toFixed(1)),mph:+(t.speed*2.237).toFixed(1),gear:t.pt.gear,rpm:Math.round(t.pt.rpm),up:+(t.q?(1-2*(t.q[0]*t.q[0]+t.q[2]*t.q[2])):1).toFixed(2),place:G.GAME.place,fx:0}}", [r.get('secs', 2)])
            for k in r.get('keys', []): await pg.keyboard.up(k)
            print(r.get('name'), st)
            d = await pg.evaluate("__game.snap()")
            open(f"{OUT}_{r.get('name','run')}.png", 'wb').write(base64.b64decode(d.split(',')[1]))
        tm = await pg.evaluate("(()=>{const G=__game,t0=performance.now();G.render(1/60);const gl=document.querySelector('canvas').getContext('webgl2'),px=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);return {renderMs:Math.round(performance.now()-t0),tris:G.APP.tris}})()")
        print('render (software GL)', tm)
        for l in logs[:30]:
            if 'TUNNEL' not in l: print(l[:500])
        await b.close()
asyncio.run(main())
