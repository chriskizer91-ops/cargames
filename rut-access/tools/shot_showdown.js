/* Screenshots of Dirt Sleeper HD, Showdown or Mini Dirt Run Open World (they share the game's hooks),
   for comparing looks.
   usage: node tools/shot_showdown.js <page.html> <out-dir> name:gfx:display:tod:place[:res] ...
   gfx: mini phone laptop ultra (Open World: mini plus high) · display: clear or dots (HD, Showdown)
   tod: day golden night · place: a Go to id (trail loop is 'loop'; Open World has 'junction', 'garage')
   res: the dot matrix size, an index into RES (default 4, 1280 x 720)
   e.g.   node tools/shot_showdown.js dirt-sleeper-showdown.html /tmp/shots best:ultra:clear:day:loop
   Software rendering: three to six minutes a shot. */
const {chromium}=require('playwright');const fs=require('fs');
const [file,out,...jobs]=process.argv.slice(2);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const j of jobs){
    const [name,gfx,disp,tod,place,res]=j.split(':');const t0=Date.now();
    const p=await b.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
    await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
    await p.goto('file://'+require('path').resolve(file));
    await p.waitForFunction(()=>window.__game&&window.__game.GAME,null,{timeout:400000,polling:1000});
    if(await p.evaluate(()=>!!window.__game.WORLD))await p.waitForFunction(()=>window.__game.WORLD.ready,null,{timeout:400000,polling:1000});
    await p.waitForTimeout(3000);
    const r=await p.evaluate(async ([gfx,disp,tod,place,res])=>{
      /* stop the page's own loop: each shot is stepped and drawn here */
      window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,500));
      const g=window.__game,G=g.GAME;G.hold=true;g.closeMenu();G.state='drive';
      g.setRes(res?+res:4);g.setDetail('sharp');
      if(g.setGfx)g.setGfx(gfx);if(window.setDisplay)setDisplay(disp);
      g.applyTod(tod);g.APP.lights=tod==='night';g.APP.tod=tod;
      g.goTo(place);g.APP.cam=0;
      const dt=1/60;let k=0;
      while(k*dt<4){g.step(dt);
        if(g.worldUpdate){const t=G.car,F=[t.M[0],t.M[3],t.M[6]];g.worldUpdate([t.p[0]-F[0]*8,t.p[1]+3,t.p[2]-F[2]*8],t);}
        k++;if(k%30===0)await new Promise(r=>setTimeout(r,50));}
      for(let i=0;i<6;i++)g.render(dt);
      return {snap:g.snap(),gfx:g.GFX&&g.GFX.level,place:G.place,tris:g.APP.tris};},[gfx,disp,tod,place,res]);
    fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.snap.split(',')[1],'base64'));delete r.snap;
    console.log(name,((Date.now()-t0)/1000).toFixed(0)+'s',JSON.stringify(r),errs.slice(0,3).join(' | '));
    await p.close();
  }
  await b.close();
})();
