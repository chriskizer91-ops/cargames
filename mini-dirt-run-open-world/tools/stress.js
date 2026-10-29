/* Usage: node tools/stress.js [page.html] [build=coupe] [place=r6e] [seconds=60] [cams for snapshots e.g. 0,1] [cpu throttle]
   MAIN=1 makes the world on the main thread instead of the worker.
   the stress test: a car flat out on a road with cruise holding the lane, the world streamed round it in real time
   (the physics stepped here, nothing drawn except the odd snapshot) */
const {chromium}=require('playwright');const fs=require('fs');
const [file,build,place,secs,shots,cpu]=[process.argv[2]||require('path').join(__dirname,'..','dist','mini-dirt-run-open-world.html'),process.argv[3]||'coupe',process.argv[4]||'r6e',+(process.argv[5]||60),process.argv[6]||'',+(process.argv[7]||1)];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:960,height:540}});
  const errs=[];p.on('console',m=>{if(m.type()==='error'||/worker/i.test(m.text()))errs.push(m.type()+': '+m.text().slice(0,300));});p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  if(cpu>1){const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:cpu});}
  if(process.env.MAIN)await p.addInitScript(()=>{window.MAINTHREAD=1;});
  await p.goto('file://'+file);
  await p.waitForFunction(()=>window.__game&&window.__game.WORLD.ready,null,{polling:500,timeout:90000});
  const info=await p.evaluate(async({build,place,secs})=>{
    const g=window.__game,G=g.GAME,W=g.WORLD;G.hold=true;
    const bi=g.BUILDS.findIndex(x=>x.id===build);g.spawnCar(bi);g.goTo(place);g.closeMenu();G.state='drive';
    if(build!=='none'){g.DEVW.lastCruise='max';g.toggleCruise();}
    if(window.MAINTHREAD){W.forceLocal=true;if(W.worker)W.worker.terminate();W.worker=null;W.mode='main thread';W.pend.clear();W.inflight=0;}
    const dt=1/60,t0=performance.now(),log=[];let k=0,next=0,worstStep=0,worstUpd=0;
    while(k*dt<secs){
      const a=performance.now();g.step(dt);const b=performance.now();
      const t=G.car,F=[t.M[0],t.M[3],t.M[6]],eye=[t.p[0]-F[0]*8,t.p[1]+3,t.p[2]-F[2]*8];g.worldUpdate(eye,t);const c=performance.now();
      worstStep=Math.max(worstStep,b-a);worstUpd=Math.max(worstUpd,c-b);
      if(k%60===0){let holes=0;for(const ch of W.chunks.values()){const d=Math.hypot(Math.max(ch.x0-eye[0],0,eye[0]-ch.x0-128),Math.max(ch.z0-eye[2],0,eye[2]-ch.z0-128));if(d<W.near*.6&&!(ch.g[0]||ch.g[1]||ch.g[2]))holes++;}
        log.push({t:k*dt,mph:Math.round(t.speed*2.237),x:Math.round(t.p[0]),z:Math.round(t.p[2]*10)/10,y:Math.round(t.p[1]),chunks:W.chunks.size,far:W.far.size,q:W.st.queue,fly:W.inflight,holes,miss:W.st.missT,
          mb:+(W.st.bytes/1048576).toFixed(1),cruise:g.CRUISE.on,surf:t.wheels.map(w=>w.surf[0]).join(''),up:+t.M[4].toFixed(2),place:G.place,d:(()=>{const r=g.WG.roadAt(t.p[0],t.p[2]);return r?+r.d.toFixed(1)+'/'+r.cls:'-';})(),stepMs:+worstStep.toFixed(1),updMs:+worstUpd.toFixed(1)});worstStep=0;worstUpd=0;}
      k++;
      /* real time: the worker gets the time it would get */
      const target=t0+k*dt*1000,now=performance.now();await new Promise(r=>setTimeout(r,Math.max(0,target-now)));
    }
    const S=W.st;return {log,n:S.n,ms:S.ms.map((v,i)=>S.n[i]?+(v/S.n[i]).toFixed(1):0),mx:S.mx.map(v=>+v.toFixed(1)),stat:[S.sn,S.sn?+(S.sms/S.sn).toFixed(1):0,+S.smx.toFixed(1)],far:[S.fn,S.fn?+(S.fms/S.fn).toFixed(1):0],
      upms:+S.upms.toFixed(0),miss:S.missT,mode:W.mode,odo:+(S.odo/1609.34).toFixed(2),top:Math.round(S.top*2.237),real:+((performance.now()-t0)/1000).toFixed(1)};
  },{build,place,secs});
  for(const l of info.log)console.log(JSON.stringify(l));
  delete info.log;console.log(JSON.stringify(info));
  if(shots){/* a few frames drawn where it ended up */
    await p.evaluate(()=>{const g=window.__game;g.APP.cam=0;g.setRes(+(2));g.setDetail('fast');});
    for(const [i,cam] of shots.split(',').map((s,i)=>[i,+s])){const t0=Date.now();const url=await p.evaluate(c=>{const g=window.__game;g.APP.cam=c;g.render(1/60);return g.snap();},cam);console.log('shot',i,(Date.now()-t0)+'ms');
      fs.writeFileSync(require('path').join(require('os').tmpdir(),'shot_'+i+'.png'),Buffer.from(url.split(',')[1],'base64'));}}
  console.log(errs.slice(0,15).join('\n'));
  await b.close();
})();
