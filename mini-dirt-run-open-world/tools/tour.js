/* Usage: node tools/tour.js [page.html] '[{"place":"junction","cam":1,"tod":"night","secs":3}]' [prefix]
   (stops: place or at:[x,z,yaw], car, cam, tod, gfx, big (map), hud, secs). Pictures go to the temp folder.
   a few pictures round the world: go somewhere, let it load (physics and world running in real time), draw one frame */
const {chromium}=require('playwright');const fs=require('fs');
const file=process.argv[2]||require('path').join(__dirname,'..','dist','mini-dirt-run-open-world.html'),stops=JSON.parse(process.argv[3]||'[{"place":"garage"},{"place":"junction","cam":1}]'),pre=process.argv[4]||'tour';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:960,height:540}});
  const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,300));});p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p.goto('file://'+file);
  await p.waitForFunction(()=>window.__game&&window.__game.WORLD.ready,null,{polling:500,timeout:90000});
  await p.evaluate(()=>{const g=window.__game;g.GAME.hold=true;g.closeMenu();g.GAME.state='drive';g.setRes(2);g.setDetail('fast');});
  for(const [i,s] of stops.entries()){
    const r=await p.evaluate(async s=>{const g=window.__game,G=g.GAME;
      if(s.car){const bi=g.BUILDS.findIndex(x=>x.id===s.car);g.APP.car=g.BUILDS[bi].car;g.spawnCar(bi);}
      if(s.tod)g.applyTod(s.tod),g.APP.lights=s.tod==='night',g.APP.tod=s.tod;
      if(s.gfx)g.setGfx(s.gfx);
      if(s.place)g.goTo(s.place);if(s.at)g.placeCar(s.at[0],s.at[1],s.at[2]);
      g.APP.cam=s.cam||0;g.APP.bigMap=!!s.big;if(s.hud!==undefined)g.DEVW.hud=s.hud;
      const dt=1/60,t0=performance.now();let k=0;
      while(k*dt<(s.secs||3)){const inp=s.thr?1:0;g.step(dt);const t=G.car,F=[t.M[0],t.M[3],t.M[6]];g.worldUpdate([t.p[0]-F[0]*8,t.p[1]+3,t.p[2]-F[2]*8],t);k++;
        const target=t0+k*dt*1000;await new Promise(r=>setTimeout(r,Math.max(0,target-performance.now())));}
      g.render(1/60);return {snap:g.snap(),place:G.place,x:G.car.p[0],z:G.car.p[2],chunks:g.WORLD.chunks.size,q:g.WORLD.st.queue,tris:g.APP.tris,stat:g.RANCH.stat,gfx:g.GFX.level};},s);
    fs.writeFileSync(require('path').join(require('os').tmpdir(),`${pre}_${i}.png`),Buffer.from(r.snap.split(',')[1],'base64'));delete r.snap;console.log(i,JSON.stringify(r));}
  console.log(errs.slice(0,10).join('\n'));await b.close();
})();
