#!/usr/bin/env python3
"""The drag engines (src/58_drag.js) in every car that takes them, headless: each fits, builds, starts and pulls on
   endless flat tarmac (speedTest, the game's own physics) with no NaN. Prints crank hp, lb-ft, 0-60, the quarter
   mile and top speed, as built from the car's drag-ready preset with the engine swapped in, ram air, zoomies and a
   race tune. Also writes each build's engine spec (the base given to SIM.makeSpec) to tools/ref/drag_specs.json for
   tools/drag_sound.js.
   python3 tools/drag_check.py [level: middle | real]"""
import sys, os, json
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); PAGE='file://'+os.path.join(HERE,'..','redline-county-drag.html')
level=sys.argv[1] if len(sys.argv)>1 else 'middle'
JS=r"""(level)=>{const g=Object.assign({},__game,__game.parts),out=[],specs={};
  const base={suv:'sleeper',pickup:'prerunner',muscle:'muscleDrag',trail:'trailRig'};
  for(const car of Object.keys(base)){
    const engs=g.CAR_PARTS[car].engines.filter(k=>g.ENGINES[k].drag);
    for(const eng of ['ref',...engs]){
      let rig=g.presetRig(base[car]);
      if(eng!=='ref'){for(const [s,v] of [['engine',eng],['power',(g.ENGINES[eng].powers||['none'])[0]],['intake',2],['exhaust','zoomies'],['tune',2]]){
          const why=g.fits(car,rig,s,v);if(why){out.push({car,eng,err:s+': '+why});}rig[s]=v;rig=g.fixRig(car,rig);}}
      const i=g.rigBuild(car,rig),sp=g.specOf(i);
      const r=g.speedTest(i,0,90,1,level);
      out.push(Object.assign({car,eng,kg:r.kg,cam:rig.cam,exhaust:rig.exhaust,power:rig.power,hat:g.ENGINE_OF[g.BUILDS[i].id].hat||'',out:!!g.BUILDS[i].look.engineOut},r));
      if(car==='suv')specs[eng]=Object.assign({},sp.src);
    }
  }
  return {out,specs};}"""
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':960,'height':540})
    pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    pg.goto(PAGE)
    pg.wait_for_function("window.__game&&document.getElementById('loading').hidden",timeout=180000)
    pg.evaluate("__game.GAME.hold=true")
    for k in ['CAR_PARTS','ENGINES','presetRig','fits','fixRig','rigBuild','specOf','speedTest','ENGINE_OF','BUILDS']:
        if not pg.evaluate(f"!!(__game.{k}||__game.parts.{k})"): errs.append('missing hook '+k)
    res=pg.evaluate(JS,level)
    b.close()
for r in res['out']:
    if 'err' in r: print('FIT', r['car'], r['eng'], r['err']); continue
    print(f"{r['car']:7}{r['eng']:7} {r['hp']:6} hp {r['tq']:5} lb-ft {r['kg']:5} kg  0-60 {r['z60']}  0-100 {r['z100']}  1/4 {r['q']}  top {r['top']} mph"
          f"  {r['gear']}/{r['nG']} @ {r['rpm']}  cam {r['cam']} {r['exhaust']} {r['power']} hat:{r['hat']} out:{r['out']}{'  NaN!' if r['nan'] else ''}{'  ROLLED' if r['minUp']<0.3 else ''}")
json.dump(res['specs'],open(os.path.join(HERE,'ref','drag_specs.json'),'w'),indent=1)
print('\n'.join(errs[:20]) or 'no errors')
