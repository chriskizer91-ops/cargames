/* Where the garbage comes from: the game is booted, driven a little, then V8's sampling heap profiler watches a
   run of frames and the allocation sites are printed largest first (bytes per frame, the function and the line
   in the built page). Software rendering makes the frames slow, not different.
   usage: node tools/alloc_wo2.js [scene]      scenes: day night menu hwy (default day)
   env: QUALITY (high), W, H (480 x 270), FRAMES (frames watched, 60), FILE, TOP (sites printed, 40) */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','wide-open-2.html');
const Q=process.env.QUALITY||'high',FRAMES=+(process.env.FRAMES||60),sc=process.argv[2]||'day',TOP=+(process.env.TOP||40);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${Q}&display=clear`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:400000,polling:500});
  await p.evaluate(async([sc])=>{const g=__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
    const place={day:'downtown',night:'neon',menu:'downtown',hwy:'hwyE'}[sc]||sc;
    g.applyTod(sc==='night'?'night':'day');g.APP.tod=sc==='night'?'night':'day';g.APP.lights=sc==='night';
    g.closeMenu();G.state='drive';g.goTo(place);g.APP.cam=1;
    for(let f=0;f<180;f++){g.setTestInput({steer:0,thr:.6,brk:0,hb:0,nos:false});g.APP.t+=dt;g.step(dt);if(f%20===19){g.render(dt);await wait(5);}}
    for(let i=0;i<12;i++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(60);}
    if(sc==='menu')g.openMenu(false);},[sc]);
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.startSampling',{samplingInterval:512,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  await p.evaluate(async([sc,FRAMES])=>{const g=__game,dt=1/60,fin=WebGL2RenderingContext.prototype.finish.bind(g.gl);
    for(let f=0;f<FRAMES;f++){g.APP.t+=dt;if(sc!=='menu')g.setTestInput({steer:Math.sin(f/30)*.2,thr:.5,brk:0,hb:0,nos:false});g.step(dt);g.render(dt);fin();}},[sc,FRAMES]);
  const {profile}=await cdp.send('HeapProfiler.stopSampling');
  /* flatten: bytes per call site (function + line), and per function regardless of line */
  const sites=new Map(),fns=new Map();
  const walk=(n,stack)=>{const f=n.callFrame,name=(f.functionName||'(anonymous)')+':'+f.lineNumber;
    if(n.selfSize){sites.set(name,(sites.get(name)||0)+n.selfSize);const fn=f.functionName||'(anonymous)';fns.set(fn,(fns.get(fn)||0)+n.selfSize);
      /* also charge the nearest named game function up the stack, so helpers (M4.mul, slice) are attributed */
      for(let i=stack.length-1;i>=0;i--){const s=stack[i];if(s&&!/^(mul|slice|map|forEach|norm2|sub2|add|madd|mvec|mcol|M4T|M4RY|M4RZ|M4S|persp|view|invert|lookAt|planes|frustum|toWorld|\(anonymous\))$/.test(s)){const k='under '+s;fns.set(k,(fns.get(k)||0)+n.selfSize);break;}}}
    for(const c of n.children||[])walk(c,stack.concat(f.functionName||'(anonymous)'));};
  walk(profile.head,[]);
  let total=0;for(const v of sites.values())total+=v;
  const kb=v=>(v/FRAMES/1024).toFixed(1);
  console.log(`scene ${sc}: ${kb(total)} KB allocated per frame over ${FRAMES} frames (sampled every 512 bytes)`);
  console.log('\n-- by call site (function:line in the built page), KB per frame --');
  for(const [k,v] of [...sites].sort((a,b)=>b[1]-a[1]).slice(0,TOP))console.log(`  ${kb(v).padStart(6)}  ${k}`);
  console.log('\n-- by game function (its own and its helpers\'), KB per frame --');
  for(const [k,v] of [...fns].filter(([k])=>k.startsWith('under ')).sort((a,b)=>b[1]-a[1]).slice(0,TOP))console.log(`  ${kb(v).padStart(6)}  ${k.slice(6)}`);
  if(errs.length)console.log('ERRORS',errs);
  await b.close();
})();
