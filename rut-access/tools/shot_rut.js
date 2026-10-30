/* Screenshots of Rut Access, drawn frame by frame through the game's own hooks (the page's loop is stopped).
   usage: node tools/shot_rut.js <out-dir> name:quality:display:tod:place ...
   quality: mobile low medium high ultra · display: clear or dots · tod: day golden night · place: a Go to id
   (trail loop is 'loop'; strip, mud, rocks, climb, shop, home, lane, store, track, county, pond, woods, speedway,
   short, summit, top, rally, lake)
   env: W, H (the viewport, 960 x 540), FRAMES (frames drawn before the shot, 24), SIM (seconds of driving first, 4),
        DEBUG (one of the renderer's buffers instead of the picture: color normal rough vel depth ssr fog lit hist bloom expo probe),
        JS (code run in the page before the frames, with the game as g: e.g. JS="g.SKY.ambUp=[0,0,0]"),
        PAGE=1 (a screenshot of the whole page, menus and readouts included, instead of the picture alone),
        FILE (another built page to shoot, e.g. an older build kept for comparison)
   e.g.   node tools/shot_rut.js /tmp/shots noon:mobile:clear:day:loop night:mobile:dots:night:strip
   Software rendering: a minute or three a shot. Any page error is printed. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const [out,...jobs]=process.argv.slice(2);const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rut-access.html');
const W=+(process.env.W||960),H=+(process.env.H||540),FRAMES=+(process.env.FRAMES||24),SIM=+(process.env.SIM||4),DEBUG=process.env.DEBUG||'',JS=process.env.JS||'',PAGE=!!process.env.PAGE;
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  let fails=0;
  for(const j of jobs){
    const [name,q,disp,tod,place]=j.split(':');const t0=Date.now();
    const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
    await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
    await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
    await p.goto('file://'+file+`?quality=${q||'mobile'}&display=${disp||'clear'}`+(DEBUG?'&debug='+DEBUG:''));
    try{await p.waitForFunction(()=>window.__game&&(document.getElementById('loading').hidden||/wrong|compile/.test(document.getElementById('loading').textContent)),null,{timeout:400000,polling:1000});}
    catch(e){errs.push('boot timed out');}
    const loading=await p.evaluate(()=>document.getElementById('loading').textContent);
    let r={};
    if(await p.evaluate(()=>document.getElementById('loading').hidden)){
      r=await p.evaluate(async([tod,place,FRAMES,SIM,JS])=>{
        window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,300));
        const g=window.__game,G=g.GAME;G.hold=true;g.closeMenu();G.state='drive';
        g.applyTod(tod);g.APP.lights=tod==='night';g.APP.tod=tod;g.goTo(place);g.APP.cam=0;
        if(JS)(new Function('g',JS))(g);
        const dt=1/60;let k=0;while(k*dt<SIM){g.step(dt);k++;if(k%30===0)await new Promise(r=>setTimeout(r,20));}
        /* enough frames for TAA, the exposure and the probe to settle */
        for(let i=0;i<FRAMES;i++){g.render(dt);if(i%4===3)await new Promise(r=>setTimeout(r,20));}
        return {snap:g.snap(),place:G.place,tris:g.APP.tris,render:g.R.iw+'x'+g.R.ih+' of '+g.R.W+'x'+g.R.H,lights:g.R.lights.stats.lights,csmOn:g.R.U.uCSMOn,csms:Array.from(g.R.U.uCSMS||[]).map(v=>+v.toFixed(3)),dbg:window.__dbg||null};},[tod,place,FRAMES,SIM,JS]);
      if(PAGE)await p.screenshot({path:`${out}/${name}.png`,timeout:300000});else fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.snap.split(',')[1],'base64'));delete r.snap;}
    else{r.loading=loading;fails++;}
    if(errs.length)fails++;
    console.log(name,((Date.now()-t0)/1000).toFixed(0)+'s',JSON.stringify(r),errs.length?'\n  ERRORS: '+errs.slice(0,4).join('\n  '):'');
    await p.close();
  }
  await b.close();process.exit(fails?1:0);
})();
