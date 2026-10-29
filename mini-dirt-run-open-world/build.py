#!/usr/bin/env python3
"""Mini Dirt Run Open World: Mini Dirt Run Solo (base/) with its fixed ranch swapped for a world made as you drive.

Takes base/mini-dirt-run-solo-sim.html unchanged, cuts out the ranch and the country round it, puts in
src/world_rt.js (with src/worldgen.js inside it), and patches the game: drawing relative to the camera,
the road and far-tile shading, the maps, the places, free play only, the Dev tab and cruise.
Writes dist/mini-dirt-run-open-world.html."""
import sys, os
W = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(W, 'base', 'mini-dirt-run-solo-sim.html')).read()
rd = lambda f: open(os.path.join(W, 'src', f)).read()

def rep(old, new, count=1):
    global src
    n = src.count(old)
    assert n == count, (n, old[:120])
    src = src.replace(old, new)

def cut(start_marker, end_marker, new, keep_end=True):
    """replace from start_marker (inclusive) to end_marker (exclusive unless keep_end False)"""
    global src
    a = src.index(start_marker); b = src.index(end_marker, a)
    if not keep_end: b += len(end_marker)
    src = src[:a] + new + src[b:]

# ---------------------------------------------------------------- the world modules out, the open world in
rt = rd('world_rt.js').replace('/*@@WORLDGEN@@*/', rd('worldgen.js'))
a = src.index('/* =====================================================================================\n   THE COUNTRY AROUND THE RANCH.')
b = src.index('/* =====================================================================================\n   DUST, MUD AND SPRAY')
src = src[:a] + rt + '\n' + src[b:]

# ---------------------------------------------------------------- names, saves
rep('<title>Mini Dirt Run Solo</title>', '<title>Mini Dirt Run Open World</title>')
rep('<h1>Mini Dirt Run Solo</h1>', '<h1>Mini Dirt Run Open World</h1>')
rep('<div id="loading">Building the ranch and the country round it</div>', '<div id="loading">Laying out forty miles of country</div>')
n = src.count("'mdrs-"); src = src.replace("'mdrs-", "'mdow-"); assert n > 10
rep("$('loading').textContent='Something went wrong building the ranch: '", "$('loading').textContent='Something went wrong building the world: '")

# ---------------------------------------------------------------- the menu: no career, no clock runs; a Dev tab
rep('<button type="button" role="tab" data-t="runs">Clock runs</button>', '<button type="button" role="tab" data-t="dev">Dev</button>')
rep('<section><h2>Mode</h2>', '<section hidden><h2>Mode</h2>')
rep('close calls past the trees, splashes, the mud pit, Red Hill, the rock garden, laps and clock runs.', 'close calls past the trees and the power poles, and splashes through the creeks.')
rep('<kbd>R</kbd> reset ·', '<kbd>R</kbd> reset · <kbd>F</kbd> world numbers · <kbd>T</kbd> cruise ·')
DEV_HTML = '''<div class="tab dev" data-tab="dev" hidden>
      <section><h2>The open world</h2><p class="hint" style="margin:0 0 10px">For the stress test: forty miles square, made in 128 m chunks round you as you drive and let go behind you. Cruise holds the road you're on (its right-hand lane) so you can watch the world come in. Brake to stop it.</p>
        <div class="row2"><div><h2 class="sub">World numbers on screen (F)</h2><div class="seg" id="dHud" role="group" aria-label="World numbers"></div></div>
          <div><h2 class="sub">View distance</h2><div class="seg" id="dView" role="group" aria-label="View distance"></div></div></div>
        <div class="row2" style="margin-top:12px"><div><h2 class="sub">Made on</h2><div class="seg" id="dGen" role="group" aria-label="Made on"></div></div>
          <div><h2 class="sub">Cruise (T)</h2><div class="seg" id="dCruise" role="group" aria-label="Cruise"></div></div></div>
        <p class="hint" id="dNote"></p><div class="places" style="margin-top:8px"><button class="btn sm" id="dReset" type="button">Reset the trip numbers</button></div></section>
      <section><h2>Handling</h2><div class="devrows" id="dTune"></div></section>
      <section><h2>Sim switches</h2><p class="hint" style="margin:0 0 10px">These act on the Sim driving level.</p><div class="devchks" id="dSim"></div><div class="devrows" id="dSimK" style="margin-top:12px"></div>
        <div class="places" style="margin-top:10px"><button class="btn sm" id="dSimReset" type="button">Back to as built</button></div></section>
    </div>
    <div class="tab" data-tab="settings" hidden>'''
rep('<div class="tab" data-tab="settings" hidden>', DEV_HTML)
DEV_CSS = '''.dev h2.sub{font-size:11px}
.devrows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px}
@media (max-width:640px){.devrows{grid-template-columns:minmax(0,1fr)}}
.devrow{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:2px 10px;align-items:center}
.devrow label{font:600 11px/1.2 var(--f);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
.devrow output{font:600 12px/1 var(--f);color:var(--ink);text-align:right;font-variant-numeric:tabular-nums}
.devrow input{grid-column:1/-1;width:100%;accent-color:var(--amber)}
.devrow small{grid-column:1/-1;color:var(--ink-3);font-size:11px;line-height:1.35}
.devchks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px}
@media (max-width:640px){.devchks{grid-template-columns:minmax(0,1fr)}}
.devchk{display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;align-items:start;cursor:pointer}
.devchk input{margin:2px 0 0;width:16px;height:16px;accent-color:var(--amber)}
.devchk b{display:block;font:600 11px/1.2 var(--f);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}
</style>'''
assert src.count('\n</style>') == 1
src = src.replace('\n</style>', '\n'+DEV_CSS)

# ---------------------------------------------------------------- the scene shader
rep('uniform float uShK[8];uniform float uMudOff;uniform float uMudLocal;', 'uniform float uShK[8];uniform float uMudOff;uniform float uMudLocal;uniform vec3 uOrg;')
rep('uniform float uInst;\n#endif\nvoid main(){', 'uniform float uInst;uniform vec4 uFarDrop;\n#endif\nvoid main(){')
rep('  vec3 w=(uM*vec4(aPos,1.)).xyz;vN=normalize(mat3(uM)*aNrm);',
    '  vec3 w=(uM*vec4(aPos,1.)).xyz;\n#ifdef WORLD\n  /* the far tiles sink a little where the chunks are drawn, so the chunks always show */\n  if(uFarDrop.x>.5)w.y-=uFarDrop.w*(1.-smoothstep(uFarDrop.y,uFarDrop.z,length(w.xz)));\n#endif\n  vN=normalize(mat3(uM)*aNrm);')
# the world's textures follow the world, not the camera (positions are drawn relative to the camera)
a = src.index('    vec2 wp=vP.xz;float sh=wshadow(vP);'); b = src.index('    alb*=sh;add*=sh;', a)
blk = src[a:b]
blk = blk.replace('rockCol(vP)', 'rockCol(Pw)').replace('vP.x', 'Pw.x').replace('vP.y', 'Pw.y').replace('vP.z', 'Pw.z').replace('vn3(vP*', 'vn3(Pw*')
blk = blk.replace('    vec2 wp=Pw.xz;float sh=wshadow(vP);', '    vec3 Pw=vP+uOrg;vec2 wp=Pw.xz;float sh=wshadow(vP);')
assert 'vec3 Pw=vP+uOrg' in blk and 'normalize(vP-uCam)' in blk
ROAD = '''    else if(m==56){
      /* the public roads: blacktop (3), Route 6 (4), the expressway (5). Colour = metres along (mod 1200), metres
         across, class; alpha = half width. Edge lines white, a dashed yellow down the middle (a double one on
         the expressway, with dashed white between its lanes), darker where the tyres run */
      float sx=vC.r,d=vC.g,ad=abs(d),cls=vC.b,n2=vn(wp*6.),n3=vn(wp*37.),lane=cls>3.5?3.65:3.2,lanes=cls>4.5?2.:1.;
      vec3 ac=(cls<3.5?vec3(.085,.08,.074):vec3(.052,.052,.058))*(.84+.26*n2)*(.88+.22*n3);
      float q=mod(ad,lane);ac*=1.-.12*exp(-pow((q-lane*.28)/.45,2.))-.12*exp(-pow((q-lane*.72)/.45,2.));
      float el=lane*lanes,wht=step(el-.16,ad)*step(ad,el),yel=cls>4.5?step(.07,ad)*step(ad,.19):step(ad,.065)*step(fract(sx/12.),.25);
      if(cls>4.5)wht=max(wht,step(abs(ad-lane),.065)*step(fract(sx/12.),.25));
      ac=mix(ac,vec3(.6,.6,.58),wht*(.75+.25*n3));ac=mix(ac,vec3(.58,.42,.07),yel*(.75+.25*n3));
      alb=ac;spec=.18;shin=40.;add+=env(R)*F*.08;em=0.;
    }
'''
blk = blk.replace('    /* rain: porous ground goes dark', ROAD + '    /* rain: porous ground goes dark')
blk = blk.replace('hard=m==54||m==45?1.:0.', 'hard=m==54||m==45||m==56?1.:0.')
assert 'm==56' in blk and 'm==56?1.:0.' in blk
src = src[:a] + blk + src[b:]

# ---------------------------------------------------------------- drawing relative to the camera
rep('FX_BUF[o]=p.x;FX_BUF[o+1]=p.y;FX_BUF[o+2]=p.z;', 'FX_BUF[o]=p.x-RO[0];FX_BUF[o+1]=p.y-RO[1];FX_BUF[o+2]=p.z-RO[2];')
rep('B[o]=wx;B[o+1]=e[1]+y;B[o+2]=wz;', 'B[o]=wx-RO[0];B[o+1]=e[1]+y-RO[1];B[o+2]=wz-RO[2];')
rep('  SH.M=shadowMatrix(ctr);', '  SH.M=shadowMatrix([ctr[0]-RO[0],ctr[1]-RO[1],ctr[2]-RO[2]]);')
cut('  const R=GFX.R+14,near=(mn,mx)=>', '  tris+=carShadow(t,u);', '  let tris=worldShadowCasters(u,ctr,GFX.R+14);\n')
rep("      LP.set([w[0],w[1],w[2],70],n*4);", "      LP.set([w[0]-RO[0],w[1]-RO[1],w[2]-RO[2],70],n*4);")
rep("F=fixtures().map(", "F=worldLights(p,200).map(")
rep("LP.set([f.p[0],f.p[1],f.p[2],f.r],n*4);", "LP.set([f.p[0]-RO[0],f.p[1]-RO[1],f.p[2]-RO[2],f.r],n*4);")
cut('let FIXTURES=null;\nfunction fixtures(){', '  return FIXTURES=out;\n}', '', keep_end=False)
rep('WSH[n*4]=x;WSH[n*4+1]=z;', 'WSH[n*4]=x-RO[0];WSH[n*4+1]=z-RO[2];')
rep('m[12]=t.p[0];m[13]=t.p[1];m[14]=t.p[2];m[15]=1;\n  return M4.mul(m,M4T(-t.cg[0],-t.cg[1],0));}', 'm[12]=t.p[0]-RO[0];m[13]=t.p[1]-RO[1];m[14]=t.p[2]-RO[2];m[15]=1;\n  return M4.mul(m,M4T(-t.cg[0],-t.cg[1],0));}')
rep('M4T(B.p[0],B.p[1]+.2,B.p[2])', 'M4T(B.p[0]-RO[0],B.p[1]+.2-RO[1],B.p[2]-RO[2])')
rep('''function camMats(c,asp){const tgt=add(c.eye,c.fwd),V_=M4.look(c.eye,tgt,c.up),P_=M4.persp(c.fov,asp,mode0Near(),1500);''',
    '''function camMats(c,asp){RO[0]=c.eye[0];RO[1]=c.eye[1];RO[2]=c.eye[2];
  /* the GPU sees the world relative to the camera; the culling uses the real view */
  const V_=M4.look([0,0,0],c.fwd,c.up),Vw=M4.look(c.eye,add(c.eye,c.fwd),c.up),P_=M4.persp(c.fov,asp,mode0Near(),3200);''')
rep('  return Object.assign(c,{V:V_,P:P_,VP:M4.mul(P_,V_)});}', '  return Object.assign(c,{V:V_,P:P_,VP:M4.mul(P_,V_),VPw:M4.mul(P_,Vw)});}')
rep('gl.uniform3fv(u.uCam,c.eye);gl.uniform1f(u.uTime,APP.t);', 'gl.uniform3fv(u.uCam,[0,0,0]);gl.uniform3fv(u.uOrg,RO);gl.uniform4f(u.uFarDrop,0,0,0,0);gl.uniform1f(u.uTime,APP.t);')
rep('  shadowPass(c,t);\n', '  worldUpdate(c.eye,t);shadowPass(c,t);\n')
rep('let tris=drawRanch(c,SKY.night?SKY.draw:GFX.far)+(SH.on?SH.tris||0:0);', 'let tris=drawWorld(c)+(SH.on?SH.tris||0:0);')
# a longer view through a lighter haze (the far tiles reach the horizon)
rep("fogD:.0016,fogK:[.68,.72,.78],draw:420,night:0}", "fogD:.0011,fogK:[.68,.72,.78],draw:420,night:0}", 2)

rep('GFX.lod=L===\'high\'?[190,360]:[150,290];LOD_DIST[0]=GFX.lod[0];LOD_DIST[1]=GFX.lod[1];','GFX.lod=L===\'high\'?[190,360]:[150,290];')
# ---------------------------------------------------------------- the game: places, spawn, laps and runs, keys, cruise
cut('/* ---------- where things are on the ranch ---------- */', 'function say(', '''/* ---------- where things are: the garage, the roads out of it, the towns, and far out on Route 6 ---------- */
let PLACES=[];
function computePlaces(){
  const L=WG.L,xe=WG.xExp(-150),jx=WG.townsNear(2*L,0,900)[0],far=WG.townsNear(0,0,16000).filter(t=>t.name!=='Junction').sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];
  PLACES=[['garage','The garage',38,-57,-PI/2],['dirt','The dirt road north',WG.offNS(0,-140)+1,-140,PI/2],
    ['r6e','Route 6, heading east',70,1.85,0],['r6w','Route 6, heading west',-40,-1.85,PI],['exp','The expressway, heading north',xe+5.5,-150,PI/2]];
  if(jx)PLACES.push(['junction','Junction',jx.x-170,1.85,0]);
  if(far){const z=far.j*L+WG.offEW(far.j,far.x-170);PLACES.push(['town',far.name,far.x-170,z+1.6,0]);}
  PLACES.push(['hills','Into the hills',WG.offNS(0,-4300)+1.2,-4300,PI/2],['far5','5 miles out on Route 6',5*L,1.85,0],['far10','10 miles out on Route 6',10*L,1.85,0],
    ['edge','The end of Route 6 (20 mi)',WG.ROAD_END-400,1.85,0]);
}
/* the name of the place the car is in */
function placeName(x,z){return WG.placeAt(x,z);}
''')
rep('if(x===undefined){if(prev){x=prev.p[0];z=prev.p[2];yaw=Math.atan2(-prev.M[6],prev.M[0]);}else{x=6;z=4;yaw=0;}}', 'if(x===undefined){if(prev){x=prev.p[0];z=prev.p[2];yaw=Math.atan2(-prev.M[6],prev.M[0]);}else{x=38;z=-57;yaw=-PI/2;}}')
rep('const prev=GAME.car,t=makeCar(i,RANCH.world,simOpts());t.setAssists(APP.level);applyWet(t);', 'const prev=GAME.car,t=makeCar(i,RANCH.world,simOpts());t.setAssists(APP.level);applyWet(t);t.tune=devTune();')
rep('function lapStep(dt,t){\n', 'function lapStep(dt,t){return;\n')
a = src.index('const RUNS=['); b = src.index('];\nconst RUN={', a); src = src[:a] + 'const RUNS=[' + src[b:]
rep("cam:['KeyC'],reset:['KeyR']", "cam:['KeyC'],stats:['KeyF'],cruise:['KeyT'],reset:['KeyR']")
rep("for(const k of ['up','down','cam','reset','menu','low','lockers','lights','ign','purge','map','od'])", "for(const k of ['up','down','cam','reset','menu','low','lockers','lights','ign','purge','map','od','stats','cruise'])")
rep('    if(inp.map)APP.bigMap=!APP.bigMap;\n', '    if(inp.map)APP.bigMap=!APP.bigMap;\n    if(inp.stats){DEVW.hud=!DEVW.hud;saveDev();}\n    if(inp.cruise)toggleCruise();\n')
rep('    drive=inp;\n', '    drive=inp;\n    if(CRUISE.on)drive=cruiseDrive(t,drive);\n')
rep('/* ---------- the car on the ground ---------- */', rd('game_dev.js') + '\n/* ---------- the car on the ground ---------- */')
rep("$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps';", "$('stat').textContent=fmt(APP.tris/1000)+'k tris · '+APP.fps.toFixed(0)+' fps · '+WORLD.chunks.size+' chunks';")

# ---------------------------------------------------------------- the HUD's maps and the world numbers
cut('const MAPC={grass:', "/* the Sim level's settings in a few letters", rd('game_maps.js'))
rep('  drawFeatsHud();\n', '  drawFeatsHud();\n  if(DEVW.hud)drawWorldStats();\n')
rep("if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);", "if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);if(CRUISE.on)C.push(['CRUISE',true,PAL.cyan]);")

# ---------------------------------------------------------------- the menu
rep("  if(id==='garage')syncGarage();if(id==='cool')syncCool();if(id==='runs')syncRuns();", "  if(id==='garage')syncGarage();if(id==='cool')syncCool();if(id==='runs')syncRuns();if(id==='dev')syncDev();")
rep('  buildGarage();\n}', '  buildGarage();buildDev();\n}')

# ---------------------------------------------------------------- the boot
rep('''      buildRanchGL();computePlaces();mapBitmap();bindTouch();setDetail(APP.detail);
      if(APP.wantCareer)Career.enter();
      spawnCar(rigBuild(APP.car,rigOf(APP.car)),6,4,0);buildMenu();''', '''      worldInit();computePlaces();bindTouch();setDetail(APP.detail);
      spawnCar(rigBuild(APP.car,rigOf(APP.car)),38,-57,-PI/2);buildMenu();''')
rep('window.__game={APP,GAME,RANCH,', 'window.__game={WORLD,RANCH,WG,RO,DEVW,CRUISE,toggleCruise,worldUpdate,drawWorld,PLACES:()=>PLACES,APP,GAME,RANCH,')

assert src.startswith('<!doctype html>')
src = '<!DOCTYPE html>' + src[len('<!doctype html>'):]
os.makedirs(os.path.join(W, 'dist'), exist_ok=True)
out = os.path.join(W, 'dist', 'mini-dirt-run-open-world.html')
open(out, 'w').write(src)
print('wrote', out, len(src), 'bytes')
