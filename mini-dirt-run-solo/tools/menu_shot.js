/* The menu at phone size: the Drive tab on the Sim level (the Sim card and the weather), scrolled through, and
   the Settings tab. usage: node tools/menu_shot.js <out-dir> */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','mini-dirt-run-solo.html');
(async()=>{
  const [out='/tmp/mdrs-menu']=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();const logs=[];pg.on('pageerror',e=>logs.push('pageerror: '+e.message));
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.goto('file://'+PAGE);await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:180000});
  await pg.evaluate(()=>{__game.GAME.hold=true;document.querySelector('#mLevel [data-v="sim"]').click();document.querySelector('#mWx [data-v="wet"]').click();});
  for(const [i,y] of [[0,0],[1,330],[2,660]]){await pg.evaluate(y=>{document.getElementById('menu').scrollTop=y;},y);await pg.screenshot({path:path.join(out,'drive'+i+'.png'),timeout:180000});}
  await pg.evaluate(()=>{__game.showTab('settings');});await pg.screenshot({path:path.join(out,'settings.png'),timeout:180000});
  console.log(logs.join('\n')||'no errors');await b.close();
})();
