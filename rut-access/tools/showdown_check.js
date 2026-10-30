/* Showdown in a real browser (headless Chromium, WebGL in software): boots the built page, then for each
   cross-country route runs a whole race with a robot (44_ai) in your seat, through the game's own step, and
   prints who you raced, who woke up, the result, the prize and the "nobody saw it coming" bonus; then sits in a
   staging lane at the strip until a callout pulls up, runs it, and checks the ladder moved. Any page error fails it.
   usage: node tools/showdown_check.js [route ids... | callout]      (needs playwright: NODE_PATH or npx) */
const path=require('path');let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('/opt/npm-tools/node_modules/playwright'));}
const file=path.resolve(__dirname,'..','rut-access.html'),want=process.argv.slice(2);
(async()=>{
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await b.newPage({viewport:{width:640,height:360}});const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,200));});
  await pg.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await pg.goto('file://'+file);
  await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:300000});
  const ids=want.length?want:(await pg.evaluate(()=>window.__game.CROSS_ROUTES.map(r=>r.id))).concat(['callout']);
  for(const id of ids){
    const r=await pg.evaluate(id=>{const G=window.__game,log=[];G.GAME.hold=true;G.closeMenu();G.GAME.state='drive';
      const run=s=>{for(let k=0;k<s*60;k++)G.step(1/60);},seen=[];
      if(id==='callout'){const b0=G.CALLOUT.beaten;G.goTo('strip');G.setAuto(()=>({thr:0,brk:0,steer:0}));run(7);if(!G.RACE.on)return ['no callout came'];log.push(G.RACE.ev.name+' ('+G.RACE.ev.rival+')');
        G.setAuto(()=>({thr:G.RACE.green?1:0,brk:G.RACE.green?0:1,steer:0}));let n=0;while(G.RACE.state!=='done'&&n<60*30){G.step(1/60);n++;}
        const R=G.RACE.res;log.push(R?`place ${R.place} prize ${R.prize} bonus ${R.bonus} ladder ${b0}->${G.CALLOUT.beaten}  ${R.ladder}`:'no result');G.hideResults();G.setAuto(null);return log;}
      G.startRace(id);const L=G.RACE.me.line,me=new G.Driver(G.GAME.car,L,{skill:.95,react:.1});me.track();
      log.push(G.RACE.ev.name+' '+(L.len/1000).toFixed(2)+' km: '+G.RACE.cars.map(c=>c.me?'you':c.name+' ('+G.BUILDS[c.car.bi].id+', looks '+c.looks+')').join(', '));
      G.setAuto(()=>{me.go=G.RACE.green;const i=me.drive(1/60,G.RACE.cars.filter(c=>!c.me).map(c=>c.drv));if(me.resetReq){me.resetReq=false;return {reset:true};}return {steer:i.steer,thr:i.thr,brk:i.brk,hb:0,nos:false};});
      let n=0;while(G.RACE.state!=='done'&&n<60*600){G.step(1/60);n++;for(const m of G.GAME.msgs)if(/WOKE|ON IT|TOWED/.test(m.t)&&!seen.includes(m.t))seen.push(m.t);}
      const R=G.RACE.res;log.push('  '+(seen.join(', ')||'nobody woke up'));
      log.push(R?'  '+(R.place?'place '+R.place:'did not finish')+'  prize '+R.prize+'  bonus '+R.bonus+'  '+R.rows.map(r=>r.name+' '+r.time).join(' | '):'  no result after '+(n/60|0)+' s');
      if(R)G.hideResults();else G.raceEnd(null);G.setAuto(null);return log;},id);
    console.log(r.join('\n'));}
  console.log(errs.length?'PAGE ERRORS:\n'+errs.join('\n'):'no page errors');await b.close();process.exit(errs.length?1:0);})();
