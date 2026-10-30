/* A tour of the world in one browser session: one screenshot per place (or per car).
   node tools/tour.mjs outdir [places|cars] [ids,comma,separated] [width] [height] [quality] */
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {writeFileSync,mkdirSync} from 'node:fs';
const [dir='/tmp/tour',kind='places',ids='',w='1280',h='720',quality='low']=process.argv.slice(2);mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:+w,height:+h}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1&quality='+quality);
await page.waitForFunction(()=>window.__game,null,{timeout:240000,polling:500});
await page.evaluate(()=>{const G=window.__game;G.hold(true);G.go();});
const list=kind==='cars'?(ids?ids.split(','):await page.evaluate(()=>window.__game.HD.BUILDS.map(b=>b.id))):(ids?ids.split(','):await page.evaluate(()=>window.__game.W.PLACES.map(p=>p.id)));
for(const id of list){
  const t0=Date.now();
  await page.evaluate(([kind,id])=>{const G=window.__game;
    if(kind==='cars'){const i=G.HD.BUILDS.findIndex(b=>b.id===id);G.spawn(i);G.placeAt(3.6,-60,Math.PI/2);G.cam.orbit={yaw:2.5,pitch:.1,dist:7.2,fov:.62,y:.15};}
    else{G.cam.orbit=null;const p=G.W.PLACES.find(p=>p.id===id);G.placeAt(p.x,p.y,p.yaw);G.setInput(()=>({thr:.35,steer:0}));G.sim(1.5);G.setInput(null);}
    G.cam.cut=true;},[kind,id]);
  for(let i=0;i<10;i++){await page.evaluate(()=>window.__game.frame(1/30));await page.waitForTimeout(150);}
  const url=await page.evaluate(()=>window.__game.shot());
  writeFileSync(`${dir}/${id}.png`,Buffer.from(url.split(',')[1],'base64'));console.log(id,Date.now()-t0,'ms');
}
console.log(logs.slice(0,20).join('\n'));
await browser.close();
