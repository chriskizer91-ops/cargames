/* Opens the built game in headless Chromium the size of a phone held sideways (or a laptop), reports any
   errors, and saves screenshots: the menu, the garage, and the car driving (the loop held still, frames
   drawn on demand, since software rendering is slow).
   usage: node tools/smoke.js <out-dir> [phone|laptop] [night] */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','mini-dirt-run-solo.html');
(async()=>{
  const [out='/tmp/mdrs',kind='phone',tod='day']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const phone=kind==='phone';
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext(phone?{viewport:{width:915,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true}:{viewport:{width:1280,height:720}});
  const pg=await ctx.newPage();const logs=[];
  pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  const t0=Date.now();await pg.goto('file://'+PAGE);
  await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:180000});
  console.log('booted in',((Date.now()-t0)/1000).toFixed(1),'s');
  await pg.evaluate(t=>{const G=__game;G.GAME.hold=true;if(t==='night'){G.APP.tod='night';G.applyTod('night');G.APP.lights=true;}},tod);
  const shot=async(name)=>{const d=await pg.evaluate(()=>__game.snap());fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(d.split(',')[1],'base64'));
    await pg.screenshot({path:path.join(out,name+'_page.png')});console.log('shot',name);};
  await shot('menu');
  await pg.evaluate(()=>__game.showTab('garage'));await pg.evaluate(()=>{const G=__game;for(let i=0;i<30;i++)G.step(1/30);});await shot('garage');
  await pg.evaluate(()=>{const G=__game;G.showTab('drive');G.closeMenu();for(let i=0;i<60;i++)G.step(1/30);});await shot('drive');
  /* drive forward a little with the gas held */
  await pg.evaluate(()=>{const G=__game;G.TOUCH.on=true;G.TOUCH.thr=1;for(let i=0;i<120;i++)G.step(1/30);G.TOUCH.thr=0;});await shot('moving');
  for(const l of logs.slice(0,40))console.log(l.slice(0,800));
  await b.close();
})();
