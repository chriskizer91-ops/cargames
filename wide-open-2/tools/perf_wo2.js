/* What a frame costs on the JavaScript side, counted: the WebGL calls (draws, instanced draws, program switches,
   texture binds, framebuffer binds, uniform uploads, buffer uploads), the triangles, the JavaScript time of each
   part of the frame (the physics, the world, the HUD, the shadow maps, the probe, the rest of the renderer), and
   the garbage made per frame (the heap's growth between collections). Headless Chromium draws with SwiftShader,
   so GPU time means nothing here; the counts and the JavaScript time do, and they are what this tool is for:
   the same scene before and after a change, side by side.
   usage: node tools/perf_wo2.js [scene ...]      scenes: day night menu hwy race (default: day night menu hwy)
   env: QUALITY (high), W, H (960 x 540), FRAMES (frames measured, 120), FILE (another built page), JSON=1 (machine output) */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','wide-open-2.html');
const Q=process.env.QUALITY||'high',FRAMES=+(process.env.FRAMES||120),scenes=process.argv.slice(2).length?process.argv.slice(2):['day','night','menu','hwy'];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-precise-memory-info','--js-flags=--expose-gc']});
  const p=await b.newPage({viewport:{width:+(process.env.W||960),height:+(process.env.H||540)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${Q}&display=clear`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:400000,polling:500});
  const out={};
  for(const sc of scenes){
    const r=await p.evaluate(async([sc,FRAMES])=>{
      const g=__game,G=g.GAME,gl=g.gl,R=g.R,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
      /* the scene */
      const place={day:'downtown',night:'neon',menu:'downtown',hwy:'hwyE',race:'oval'}[sc]||sc;
      g.applyTod(sc==='night'?'night':'day');g.APP.tod=sc==='night'?'night':'day';g.APP.lights=sc==='night';
      g.closeMenu();G.state='drive';g.goTo(place);g.APP.cam=1;
      /* a few seconds on the gas so the chunks round the car are built and the picture has settled */
      for(let f=0;f<180;f++){g.setTestInput({steer:0,thr:.6,brk:0,hb:0,nos:false});g.APP.t+=dt;g.step(dt);if(f%20===19){g.render(dt);await wait(5);}}
      /* the world's meshes arrive from the worker between frames: let them */
      for(let i=0;i<12;i++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(60);}
      if(sc==='menu'){g.openMenu(false);}
      /* count the GL calls */
      const C={};const n=k=>{C[k]=(C[k]||0)+1;};
      const prog=new Map();let cur='?';const wrap=(name,fn)=>{const o=gl[name];gl[name]=function(){fn.apply(this,arguments);return o.apply(this,arguments);};};
      for(const P of R.G.programs)prog.set(P.p,P.name);
      wrap('useProgram',function(pg){n('useProgram');cur=prog.get(pg)||'game';});
      const draws={},tri={};const d=(k,t)=>{n('draw');draws[cur]=(draws[cur]||0)+1;tri[cur]=(tri[cur]||0)+t;};
      wrap('drawElements',function(m,c){d(cur,c/3);});wrap('drawArrays',function(m,f,c){d(cur,c/3);});
      wrap('drawElementsInstanced',function(m,c,t,o,k){n('drawInst');d(cur,c/3*k);});wrap('drawArraysInstanced',function(m,f,c,k){n('drawInst');d(cur,c/3*k);});
      wrap('bindTexture',()=>n('bindTexture'));wrap('bindFramebuffer',()=>n('bindFramebuffer'));wrap('bindVertexArray',()=>n('bindVertexArray'));
      wrap('bufferData',()=>n('bufferData'));wrap('bufferSubData',()=>n('bufferSubData'));wrap('texImage2D',()=>n('texImage2D'));wrap('texSubImage2D',()=>n('texSubImage2D'));
      wrap('generateMipmap',()=>n('generateMipmap'));wrap('clear',()=>n('clear'));wrap('getParameter',()=>n('getParameter'));wrap('getQueryParameter',()=>n('getQueryParameter'));
      const uni={};for(const k of Object.getOwnPropertyNames(WebGL2RenderingContext.prototype))if(/^uniform(Matrix)?[1234]/.test(k))wrap(k,()=>{n('uniform');uni[cur]=(uni[cur]||0)+1;});
      /* the JavaScript time of the renderer's parts */
      const T={shadow:0,probe:0,render:0,frame:0};
      const sp=R.shadowPass.bind(R),pp=R.probePass.bind(R);R.shadowPass=S=>{const t=performance.now();sp(S);T.shadow+=performance.now()-t;};R.probePass=S=>{const t=performance.now();pp(S);T.probe+=performance.now()-t;};
      const rr=R.render.bind(R);R.render=S=>{const t=performance.now();rr(S);T.render+=performance.now()-t;};
      const ps=new Float32Array(10);let heapUp=0,gcs=0,last=performance.memory.usedJSHeapSize;
      g.PS.avg.fill(0);
      for(let f=0;f<FRAMES;f++){const t0=performance.now();g.APP.t+=dt;if(sc!=='menu')g.setTestInput({steer:Math.sin(f/30)*.2,thr:.5,brk:0,hb:0,nos:false});g.step(dt);g.render(dt);T.frame+=performance.now()-t0;
        for(let i=0;i<10;i++)ps[i]+=g.PS.cur[i];g.PS.cur.fill(0);
        const h=performance.memory.usedJSHeapSize;if(h>=last)heapUp+=h-last;else gcs++;last=h;}
      for(const k in C)C[k]=+(C[k]/FRAMES).toFixed(1);
      const per={};for(const k in draws)per[k]={draws:+(draws[k]/FRAMES).toFixed(1),ktris:+(tri[k]/FRAMES/1000).toFixed(1),uniforms:+((uni[k]||0)/FRAMES).toFixed(1)};
      const psn=['phys','world','shadow','probe','scene','post','hud','sound','trees','send'],js={};for(let i=0;i<10;i++)if(ps[i]>0)js[psn[i]]=+(ps[i]/FRAMES).toFixed(2);
      return {place,render:R.iw+'x'+R.ih+' of '+R.W+'x'+R.H,state:G.state,calls:C,perProgram:per,
        jsMs:{frame:+(T.frame/FRAMES).toFixed(2),renderer:+(T.render/FRAMES).toFixed(2),shadow:+(T.shadow/FRAMES).toFixed(2),probe:+(T.probe/FRAMES).toFixed(2),game:js},
        garbageKBperFrame:+(heapUp/FRAMES/1024).toFixed(1),gcPerFrame:+(gcs/FRAMES).toFixed(3),tris:g.APP.tris,fps:null};
    },[sc,FRAMES]);
    out[sc]=r;
    if(!process.env.JSON){console.log(`\n== ${sc}  (${r.render}, ${r.state})`);
      const C=r.calls;console.log(`  GL per frame: draws ${C.draw||0} (instanced ${C.drawInst||0}) · programs ${C.useProgram||0} · textures bound ${C.bindTexture||0} · framebuffers ${C.bindFramebuffer||0} · VAOs ${C.bindVertexArray||0} · uniforms ${C.uniform||0} · texImage2D ${C.texImage2D||0} · bufferSubData ${C.bufferSubData||0} · mipmaps ${C.generateMipmap||0} · getParameter ${C.getParameter||0}`);
      const rows=Object.entries(r.perProgram).sort((a,b)=>b[1].draws-a[1].draws).map(([k,v])=>`${k} ${v.draws}d/${v.ktris}kt/${v.uniforms}u`);console.log('  per program: '+rows.join(' · '));
      const J=r.jsMs;console.log(`  JS ms per frame: whole ${J.frame} · renderer ${J.renderer} (shadow ${J.shadow}, probe ${J.probe}) · game: ${Object.entries(J.game).map(([k,v])=>k+' '+v).join(', ')}`);
      console.log(`  garbage: ${r.garbageKBperFrame} KB per frame, a collection every ${r.gcPerFrame>0?(1/r.gcPerFrame).toFixed(0):'∞'} frames`);}
  }
  if(process.env.JSON)console.log(JSON.stringify(out));
  if(errs.length)console.log('ERRORS',errs);
  await b.close();
})();
