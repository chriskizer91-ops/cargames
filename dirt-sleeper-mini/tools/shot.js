/* Screenshots of the model bay, for checking the cars by eye.
   usage: node tools/shot.js <out-dir> <build>:<view>[:<stage>] ...
   e.g.   node tools/shot.js /tmp/shots 0:front34 coupe:side:light
   Builds are indexes into BUILDS (or ids); views are the bay's view ids ('bay' opens the hood). */
const {chromium}=require('playwright');
const path=require('path'),fs=require('fs');
const page=process.env.PAGE||path.resolve(__dirname,'..','model-bay.html');
(async()=>{
  const [out,...jobs]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const logs=[];pg.on('console',m=>{if(m.type()!=='log')logs.push(m.type()+': '+m.text());});pg.on('pageerror',e=>logs.push('pageerror: '+e.message));
  /* no animation loop: each shot renders one frame on demand, which is all swiftshader can keep up with */
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}window.requestAnimationFrame=()=>0;});
  await pg.goto('file://'+page);
  await pg.waitForFunction(()=>window.__bay,null,{timeout:120000});
  /* the dock hidden, so the matrix always fills the same space */
  await pg.evaluate(()=>{document.getElementById('dock').style.display='none';dispatchEvent(new Event('resize'));__bay.setRes(3);});
  for(const j of jobs){
    const [bi,view='front34',stage='dark']=j.split(':');
    const r=await pg.evaluate(([bi,view,stage])=>{const B=__bay.BUILDS,i=isNaN(+bi)?B.findIndex(b=>b.id===bi):+bi;
      __bay.setBuild(i);__bay.APP.hood=false;__bay.setView(view);const c=__bay.APP.camT;__bay.APP.stage=stage;__bay.APP.spin=false;
      __bay.shot({cam:c});const t=__bay.truck(i);return [__bay.snap(),B[i].id+' '+Math.round(t.tris/1000)+'k tris '+t.ms.toFixed(0)+' ms'];},[bi,view,stage]);
    const f=path.join(out,j.replace(/:/g,'_')+'.png');
    fs.writeFileSync(f,Buffer.from(r[0].split(',')[1],'base64'));console.log(f,r[1]);
  }
  for(const l of logs.slice(0,30))console.log(l.slice(0,600));
  await b.close();
})();
