import asyncio, sys, base64, json
from playwright.async_api import async_playwright
# usage: game_shot.py '<script json: list of steps>' [w h q]
import os
OUT=os.environ.get('SHOTS','/tmp')
PAGE=os.environ.get('PAGE',os.path.abspath(os.path.join(os.path.dirname(__file__),'..','dist','dirt-sleeper.local.html')))
steps=json.loads(sys.argv[1]); W=int(sys.argv[2]) if len(sys.argv)>2 else 800; H=int(sys.argv[3]) if len(sys.argv)>3 else 450; q=sys.argv[4] if len(sys.argv)>4 else 'low'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':W,'height':H},has_touch=('touch' in sys.argv))
        pg=await ctx.new_page(); pg.set_default_timeout(400000)
        logs=[]; pg.on('console', lambda m: logs.append(m.type+': '+m.text)); pg.on('pageerror', lambda e: logs.append('pageerror: '+str(e)))
        await pg.goto('file://'+PAGE+f'?q={q}&manual&fixed')
        for i in range(1500):
            r=await pg.evaluate('window.__game&&window.__game.ready')
            if r: break
            if any('pageerror' in l for l in logs): break
            await pg.wait_for_timeout(200)
        print('ready', r, flush=True)
        for s in steps:
            if s[0]=='js': out=await pg.evaluate(s[1]); out is not None and print('js>',str(out)[:600],flush=True)
            elif s[0]=='click': await pg.click(s[1])
            elif s[0]=='frames':
                n=s[1]; inp=json.dumps(s[2] if len(s)>2 else None)
                out=await pg.evaluate(f"(()=>{{const g=window.__game,inp={inp};for(let i=0;i<{n};i++){{if(inp){{g.input.down.clear();for(const k of inp)g.input.down.add(k);}}g.frame(1/60);i%4===3&&g.R.gl.finish();}}if(inp)g.input.down.clear();const t=g.truck;return [g.state,t.p.map(x=>x.toFixed(1)).join(','),t.speed.toFixed(1),g.mode&&g.mode.phase,g.mode&&g.mode.t&&g.mode.t.toFixed(2)].join(' | ');}})()")
                print('frames',n,out,flush=True)
            elif s[0]=='canvas':
                # the 3D view alone, read straight from the canvas in the same task as the frame
                url=await pg.evaluate("(()=>{const g=window.__game;g.frame(1/60);return document.getElementById('view').toDataURL('image/jpeg',0.88)})()")
                import base64
                open(OUT+'/c_'+s[1]+'.jpg','wb').write(base64.b64decode(url.split(',')[1]))
                print('canvas',s[1],flush=True)
            elif s[0]=='shot':
                await pg.evaluate("window.__game.frame(1/60)")
                try:
                    await pg.screenshot(path=OUT+'/g_'+s[1]+'.png',timeout=240000)
                    print('shot',s[1])
                except Exception as e: print('shot failed',s[1],str(e)[:80])
        for l in logs[:40]: print(l[:1200])
        await b.close()
asyncio.run(main())
