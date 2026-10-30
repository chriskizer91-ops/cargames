/* The cars on the title screen's spot downtown, no HUD: node tools/cars.mjs outdir ids yaw[,yaw2] [w h] */
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {writeFileSync,mkdirSync} from 'node:fs';
const [dir='/tmp/cars2',ids='ev,evRace,wedge,wedgeNR,hyper,hyperTrack',yaws='.75',w='960',h='540',place='']=process.argv.slice(2);mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:+w,height:+h}});
const logs=[];page.on('console',m=>{if(m.type()==='error')logs.push(m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1&quality=low');
await page.waitForFunction(()=>window.__game,null,{timeout:240000,polling:500});
await page.evaluate(()=>{window.__game.hold(true);});
for(const id of ids.split(','))for(const yaw of yaws.split(',')){
  await page.evaluate(([id,yaw,place])=>{const G=window.__game,i=G.HD.BUILDS.findIndex(b=>b.id===id);G.pickBuild(i);
    if(place){const p=G.W.PLACES.find(q=>q.id===place);G.placeAt(p.x,p.y,p.yaw);}
    G.cam.orbit={yaw:+yaw,pitch:.13,dist:6.4,fov:.6,y:.1};G.cam.cut=true;},[id,yaw,place]);
  for(let i=0;i<8;i++){await page.evaluate(()=>window.__game.frame(1/30));await page.waitForTimeout(120);}
  const url=await page.evaluate(()=>window.__game.shot());writeFileSync(`${dir}/${id}_${yaw}.png`,Buffer.from(url.split(',')[1],'base64'));console.log(id,yaw);
}
console.log(logs.slice(0,10).join('\n'));await browser.close();
