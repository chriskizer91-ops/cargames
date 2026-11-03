/* What the land's shader costs, one build of it against another, in one page: the lean ground's switches (52_world_gl's
   landDefs: d the fine detail left out, n the colour noise in two layers) flipped on the spot, each drawn K frames at
   a fixed render size with the GPU waited for after every frame (a pixel read back), the variants taken in turn ROUNDS times so the
   machine's drift lands on all of them alike. Each variant's picture is saved too (OUT/<place>-<tod>-<variant>.png),
   for the look. SwiftShader runs the shaders on the CPU, so its time is their arithmetic, lane by lane: it has no
   registers to run short of and no occupancy, which is where a phone's GPU gains most from a smaller shader. It says
   which parts of the shader cost, not what a phone will do.
   usage: node tools/shader_cost.js [place:tod ...]     (default: downtown:day neon:night ridge:day hwyE:day)
   env: QUALITY (mobile), W, H (640 x 360), SCALE (render scale, 1), K (frames a round, 10), ROUNDS (3),
        VARIANTS (off,d,n,dn), OUT (a folder for the pictures; none if unset), FILE */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const Q=process.env.QUALITY||'mobile',K=+(process.env.K||10),ROUNDS=+(process.env.ROUNDS||3),SCALE=+(process.env.SCALE||1);
const VAR=(process.env.VARIANTS||'off,d,n,dn').split(','),OUT=process.env.OUT||'';
const scenes=(process.argv.slice(2).length?process.argv.slice(2):['downtown:day','neon:night','ridge:day','hwyE:day']).map(s=>s.split(':'));
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||640),height:+(process.env.H||360)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${Q}&display=clear&gputime=off&lean=off`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:600000,polling:500});
  if(OUT)fs.mkdirSync(OUT,{recursive:true});
  const all={};
  for(const [place,tod] of scenes){
    const r=await p.evaluate(async([place,tod,K,ROUNDS,VAR,SCALE,shots])=>{
      const g=__game,G=g.GAME,R=g.R,gl=g.gl,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
      g.applyTod(tod==='night'?'night':'day');g.APP.tod=tod;g.APP.lights=tod==='night';
      g.closeMenu();G.state='drive';g.goTo(place);g.APP.cam=1;
      let tries=0;for(;tries<120;tries++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(40);const W=g.WORLD;if(tries>8&&W.st.holes===0&&W.pend.size===0&&W.inbox.length===0&&W.st.queue===0)break;}
      for(let i=0;i<6;i++){g.APP.t+=dt;g.step(dt);g.render(dt);await wait(40);}
      R.resize(g.PIC.w,g.PIC.h,SCALE);
      /* (finish alone lets SwiftShader's frames queue up behind it: a pixel read back from the canvas waits for the
         frame to be drawn, every pass of it) */
      const px=new Uint8Array(4),fin=()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);},ms={},png={};for(const v of VAR)ms[v]=[];
      const frame=()=>{g.APP.t+=dt;g.step(dt);const t0=performance.now();g.render(dt);fin();return performance.now()-t0;};
      for(let k=0;k<ROUNDS;k++)for(const v of VAR){
        g.landLean(v);
        /* (the first frames after a switch compile and settle the history: not counted) */
        for(let i=0;i<3;i++)frame();
        for(let i=0;i<K;i++)ms[v].push(frame());
        if(shots&&k===0){R.frameN=0;R.resetTAA=true;R.hasPrev=false;g.APP.t=100;G.car.v.fill(0);G.car.w.fill(0);g.CAM.cut=true;for(let i=0;i<16;i++){g.APP.t+=dt;g.step(dt);g.render(dt);}png[v]=g.snap();}
      }
      const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s[s.length>>1];};
      const out={};for(const v of VAR)out[v]={median:+med(ms[v]).toFixed(1),min:+Math.min(...ms[v]).toFixed(1)};
      g.landLean('off');
      return {render:R.iw+'x'+R.ih,tag:g.P_LAND.defs,ms:out,png};
    },[place,tod,K,ROUNDS,VAR,SCALE,!!OUT]);
    if(OUT)for(const v in r.png)fs.writeFileSync(path.join(OUT,`${place}-${tod}-${v}.png`),Buffer.from(r.png[v].split(',')[1],'base64'));
    delete r.png;all[place+':'+tod]=r;
    const base=r.ms[VAR[0]].median;
    console.log(`${place} ${tod}  render ${r.render}  `+VAR.map(v=>`${v} ${r.ms[v].median} ms (${(100*(r.ms[v].median-base)/base).toFixed(0)}%)`).join('   '));
  }
  if(errs.length)console.log('ERRORS',JSON.stringify(errs.slice(0,5)));
  await b.close();
})();
