/* The career in the browser: into it from free play, the money and the locked cars, buying a part, a car too
   dear, a joke unlock, the save code there and back, out to free play with its rigs as they were, and a reload
   that comes back into the career.
   usage: node tools/career_check.js <out-dir> */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','mini-dirt-run-solo.html');
(async()=>{
  const [out='/tmp/mdrs-c']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();const logs=[];
  pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
  await pg.goto('file://'+PAGE);await pg.evaluate(()=>localStorage.clear());await pg.reload();
  const ready=()=>pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:180000});await ready();
  const ok=(c,m)=>console.log((c?'ok   ':'FAIL ')+m);
  const r1=await pg.evaluate(()=>{const G=__game;G.GAME.hold=true;
    /* free play: change the SUV a little so we can tell it comes back */
    G.RIGS.suv=Object.assign({},G.RIGS.suv||G.presetRig('stock'),{intake:2});G.Feats.S.money=777;G.Feats.save();
    document.querySelector('#mMode [data-v="career"]').click();
    const cards=[...document.querySelectorAll('#mCars .card')].map(c=>[c.dataset.car,c.classList.contains('lock'),c.querySelector('small').textContent]);
    return {mode:G.APP.mode,money:G.Feats.S.money,car:G.APP.car,intake:G.RIGS.suv.intake,cards};});
  ok(r1.mode==='career','into the career');ok(r1.money===1500,'starts with $1,500 ('+r1.money+')');ok(r1.car==='suv'&&r1.intake===0,'the stock truck');
  ok(r1.cards.filter(c=>!c[1]).length===1,'only the truck is owned: '+r1.cards.map(c=>c[0]+(c[1]?' '+c[2]:'')).join(', '));
  {const t0=Date.now();await pg.evaluate(()=>1);console.log('eval after',Date.now()-t0,'ms');}await pg.screenshot({path:path.join(out,'career_drive.png'),timeout:180000});
  /* buy a cold-air intake in the garage */
  const r2=await pg.evaluate(async()=>{const G=__game;G.showTab('garage');
    const hd=[...document.querySelectorAll('#gSlots .slot>button')].find(x=>x.textContent.startsWith('Intake'));hd.click();
    const opt=[...document.querySelectorAll('#gSlots .opt')].find(o=>o.querySelector('b').textContent.startsWith('Cold-air'));
    const tag0=opt.querySelector('.tag').textContent;opt.click();const tag1=opt.querySelector('.tag').textContent;opt.click();
    return {tag0,tag1,money:G.Feats.S.money,intake:G.RIGS.suv.intake,owned:G.Career.owns('suv','intake',1)};});
  ok(r2.money===1150&&r2.intake===1&&r2.owned,`bought the intake: ${r2.tag0} -> ${r2.tag1}, money ${r2.money}`);
  await pg.screenshot({path:path.join(out,'career_garage.png'),timeout:180000});
  /* a car too dear, then a joke unlock */
  const r3=await pg.evaluate(()=>{const G=__game;G.showTab('drive');const card=document.querySelector('#mCars .card[data-car="sxs"]');card.click();card.click();
    const before=G.APP.car;G.Feats.onFeat('mudpit',{s:12});const early=!!G.Career.S.cars.golf;G.RIGS.suv=Object.assign({},G.RIGS.suv,{intake:0});G.Feats.onFeat('mudpit',{s:12});G.syncMenu();
    const golf=document.querySelector('#mCars .card[data-car="golf"]');return {car:before,early,golfLocked:golf.classList.contains('lock'),money:G.Feats.S.money,cars:Object.keys(G.Career.S.cars)};});
  ok(r3.car==='suv','could not buy the side-by-side with $'+r3.money);ok(!r3.early,'no golf cart for the mud pit with a part changed');ok(!r3.golfLocked&&r3.cars.includes('golf'),'golf cart unlocked by the mud pit in the stock truck: '+r3.cars.join(','));
  /* money for a quad, and buy it */
  const r4=await pg.evaluate(()=>{const G=__game;G.Feats.S.money=7000;G.syncMenu();const card=document.querySelector('#mCars .card[data-car="quad450"]');card.click();const t1=card.querySelector('small').textContent;card.click();
    return {t1,car:G.APP.car,money:G.Feats.S.money};});
  ok(r4.car==='quad450'&&r4.money===500,`bought the sport quad (${r4.t1}), $${r4.money} left`);
  await pg.evaluate(()=>{__game.showTab('cool');});await pg.screenshot({path:path.join(out,'career_cool.png'),timeout:180000});
  /* the save code there and back */
  const r5=await pg.evaluate(()=>{const G=__game,c=G.Career.code();G.Feats.S.money=1;G.Career.S.cars={suv:1};const err=G.Career.loadCode(c);return {len:c.length,err,money:G.Feats.S.money,cars:Object.keys(G.Career.S.cars)};});
  ok(!r5.err&&r5.money===500&&r5.cars.includes('quad450')&&r5.cars.includes('golf'),`save code (${r5.len} chars) loads back: $${r5.money}, ${r5.cars.join(',')}`);
  /* reload: back in the career */
  await pg.reload();await ready();
  const r6=await pg.evaluate(()=>{const G=__game;return {mode:G.APP.mode,car:G.APP.car,money:G.Feats.S.money,eyebrow:document.getElementById('mEyebrow').textContent};});
  ok(r6.mode==='career'&&r6.money===500,`reload keeps the career (${r6.eyebrow}, ${r6.car}, $${r6.money})`);
  /* out to free play: its money and rigs as they were */
  const r7=await pg.evaluate(()=>{const G=__game;G.GAME.hold=true;document.querySelector('#mMode [data-v="free"]').click();return {mode:G.APP.mode,money:G.Feats.S.money,intake:(G.RIGS.suv||{}).intake,locked:document.querySelectorAll('#mCars .card.lock').length};});
  ok(r7.mode==='free'&&r7.money===777&&r7.intake===2&&r7.locked===0,`back to free play: $${r7.money}, SUV intake ${r7.intake}, ${r7.locked} locked`);
  for(const l of logs.slice(0,20))console.log(l.slice(0,600));
  await b.close();
})();
