/* Screenshots of Wide Open 2, drawn frame by frame through the game's own hooks (the page's loop is stopped).
   usage: node tools/shot_wo2.js <out-dir> name:quality:display:tod:place[:cam] ...
   quality: mobile low medium high ultra · display: clear or dots · tod: day night · place: a Go to id (the Drive tab's:
   garage downtown neon ring hwyE hwyW gas diner ridge hills wash bog paddock oval short loop mud strip saltE saltW deep),
   or 'show' for the showroom (the opening screen's shed), 'bay' (the bay's window on the car, Look) or 'lab' (the
   dyno lab) · cam: 0 chase, 1 far, 2 hood (default 1 for the places, as the Drive tab's pictures)
   env: W, H (the viewport, 960 x 540), FRAMES (frames drawn before the shot, 24), SIM (seconds of driving first, 2),
        DEBUG (one of the renderer's buffers instead of the picture: color normal rough vel depth ssr fog lit hist bloom expo probe),
        JS (code run in the page before the frames, with the game as g),
        PAGE=1 (a screenshot of the whole page, menus and readouts included, instead of the picture alone),
        FILE (another built page to shoot: Wide Open's own build, city-and-country.html, is shot the way it draws, with
        its levels: mobile is its Phone, high its Laptop; its day is its old daylight, its night its full moon)
   e.g.   node tools/shot_wo2.js /tmp/shots town:mobile:clear:day:downtown salt:high:clear:night:saltE
   Software rendering: a minute or three a shot. Any page error is printed and fails the run. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const [out,...jobs]=process.argv.slice(2);const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','wide-open-2.html');
const W=+(process.env.W||960),H=+(process.env.H||540),FRAMES=+(process.env.FRAMES||24),SIM=+(process.env.SIM||2),DEBUG=process.env.DEBUG||'',JS=process.env.JS||'',PAGE=!!process.env.PAGE;
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  let fails=0;
  for(const j of jobs){
    const [name,q,disp,tod,place,cam]=j.split(':');const t0=Date.now();
    const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,400));});
    /* (Wide Open's own build keeps its settings under cc- and has its own levels) */
    await p.addInitScript(([q,disp])=>{try{localStorage.clear();const old={mobile:'phone',low:'phone',medium:'laptop',high:'laptop',ultra:'ultra'}[q]||'phone';
      localStorage.setItem('cc-gfx',old);localStorage.setItem('cc-display',disp||'clear');localStorage.setItem('wo2-display',disp||'clear');}catch(e){}
      /* the page's own loop held from the start: the opening screen isn't drawn over and over while the shot waits */
      const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);},[q,disp]);
    await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
    await p.goto('file://'+file+`?quality=${q||'mobile'}&display=${disp||'clear'}`+(DEBUG?'&debug='+DEBUG:''));
    try{await p.waitForFunction(()=>window.__game&&(document.getElementById('loading').hidden||/wrong|compile/.test(document.getElementById('loading').textContent)),null,{timeout:600000,polling:1000});}
    catch(e){errs.push('boot timed out');}
    const loading=await p.evaluate(()=>document.getElementById('loading').textContent);
    let r={};
    if(await p.evaluate(()=>document.getElementById('loading').hidden)){
      r=await p.evaluate(async([tod,place,cam,FRAMES,SIM,JS])=>{
        window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,300));
        const g=window.__game,G=g.GAME,neu=!!g.R,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));G.hold=true;
        /* the time of day: Wide Open's own build has only its full moon in its list; its day is the light it had before */
        if(neu){g.applyTod(tod==='night'?'night':'day');}
        else if(tod==='night')g.applyTod('night');
        else Object.assign(g.SKY,{sun:[-.52/Math.hypot(.52,.5,.4),.5/Math.hypot(.52,.5,.4),.4/Math.hypot(.52,.5,.4)],sunCol:[1.28,1.18,1.02],sky:[.44,.5,.62],gnd:[.24,.18,.13],zen:[.16,.32,.85],hor:[.78,.86,1.02],fogD:.0011,fogK:[.68,.72,.78],draw:420,night:0,expo:undefined,haze:1});
        g.APP.tod=tod;g.APP.lights=tod==='night';
        const studio=place==='show'||place==='bay'||place==='lab';
        if(studio){
          /* the opening screen's shed; the bay's window (Look); the dyno lab (Engine) */
          if(place!=='show'){g.showTab('garage');g.showFull(true);g.SHOW.tab=place==='lab'?'engine':'look';g.syncShow();}
          if(JS)(new Function('g',JS))(g);
          for(let i=0;i<FRAMES;i++){g.APP.t+=dt;g.render(dt);if(i%4===3)await wait(20);}
          return {snap:g.snap(),place,tris:g.APP.tris,render:neu?g.R.iw+'x'+g.R.ih+' of '+g.R.W+'x'+g.R.H:''};}
        g.closeMenu();G.state='drive';g.goTo(place);g.APP.cam=cam===undefined||cam===''?1:+cam;
        /* the world round the car: wait for the chunk under it (its ground and its things) and the ones round it */
        const C=g.WORLD,key=(x,z)=>(Math.floor(x/128)+4096)*8192+Math.floor(z/128)+4096,eye=()=>[G.car.p[0],G.car.p[1]+3,G.car.p[2]];
        let tries=0;
        for(;tries<400;tries++){g.worldUpdate(eye(),G.car);const c=C.chunks.get(key(G.car.p[0],G.car.p[2]));
          if(c&&c.H&&c.st&&C.inflight===0&&C.st.queue===0)break;await wait(60);}
        g.placeCar(G.car.p[0],G.car.p[2],Math.atan2(-G.car.M[6],G.car.M[0]));
        if(JS)(new Function('g',JS))(g);
        let k=0;while(k*dt<SIM){g.APP.t+=dt;g.step(dt);g.worldUpdate(eye(),G.car);k++;if(k%30===0)await wait(20);}
        for(let i=0;i<40;i++){g.worldUpdate(eye(),G.car);if(C.inflight===0&&C.st.queue===0&&!C.inbox.length)break;await wait(80);}
        /* enough frames for TAA, the exposure and the probe to settle */
        for(let i=0;i<FRAMES;i++){g.APP.t+=dt;g.render(dt);if(i%4===3)await wait(20);}
        return {snap:g.snap(),place:G.place,tries,tris:g.APP.tris,chunks:C.chunks.size,holes:C.st.holes,stat:g.RANCH.stat,ro:[...g.RO],
          render:neu?g.R.iw+'x'+g.R.ih+' of '+g.R.W+'x'+g.R.H:'',lights:neu?g.R.lights.stats.lights:0,p:G.car.p.map(v=>+v.toFixed(1))};},[tod,place,cam,FRAMES,SIM,JS]);
      if(PAGE)await p.screenshot({path:`${out}/${name}.png`,timeout:300000});else fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.snap.split(',')[1],'base64'));delete r.snap;}
    else{r.loading=loading;fails++;}
    if(errs.length)fails++;
    console.log(name,((Date.now()-t0)/1000).toFixed(0)+'s',JSON.stringify(r),errs.length?'\n  ERRORS: '+errs.slice(0,4).join('\n  '):'');
    await p.close();
  }
  await b.close();process.exit(fails?1:0);
})();
