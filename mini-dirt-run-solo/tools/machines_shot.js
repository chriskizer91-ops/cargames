/* Each machine in the browser: spawned at the shop, driven a moment, a screenshot from the chase camera and one
   from the helmet camera; and any errors.
   usage: node tools/machines_shot.js <out-dir> [ids...] */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','mini-dirt-run-solo.html');
(async()=>{
  const [out='/tmp/mdrs-m',...want]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();const logs=[];
  pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.goto('file://'+PAGE);
  await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:180000});
  await pg.evaluate(()=>{__game.GAME.hold=true;});
  const shot=async(name)=>{const d=await pg.evaluate(()=>__game.snap());fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(d.split(',')[1],'base64'));console.log('shot',name);};
  const ids=want.length?want:await pg.evaluate(()=>Object.keys(__game.MACH));
  await pg.evaluate(()=>{__game.closeMenu();});
  for(const id of ids){
    const info=await pg.evaluate(id=>{const G=__game;G.APP.car=id;G.spawnRig(false);G.goTo('shop');G.APP.cam=0;G.CAM.cut=true;
      G.TOUCH.on=true;G.TOUCH.thr=.6;G.TOUCH.steerActive=true;G.TOUCH.steer=.3;for(let i=0;i<90;i++)G.step(1/30);G.TOUCH.thr=0;G.TOUCH.steer=0;
      for(let i=0;i<10;i++)G.step(1/30);G.render(1/30);const t=G.GAME.car;return {v:t.speed.toFixed(1),y:t.p[1].toFixed(2),up:t.M[4].toFixed(2),lean:t.lean?[t.lean.x.toFixed(2),t.lean.z.toFixed(2)]:null,tris:G.APP.tris};},id);
    console.log(id,JSON.stringify(info));await shot(id+'_chase');
    await pg.evaluate(()=>{const G=__game;G.APP.cam=2;G.CAM.cut=true;G.step(1/30);G.render(1/30);});await shot(id+'_hood');
    await pg.evaluate(()=>{const G=__game;G.APP.cam=0;G.CAM.cut=true;});}
  for(const l of logs.slice(0,40))console.log(l.slice(0,800));
  await b.close();
})();
