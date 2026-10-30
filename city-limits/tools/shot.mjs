/* Screenshots of the built page in headless Chromium (software GL is slow, so the game's own loop is held
   and frames are drawn by hand, then read straight off the canvas).
   node tools/shot.mjs out.png ['js run after boot'] [frames] [width] [height]
   The js can use G = window.__game (hold, frame, sim, placeAt, go, setInput, spawn...). */
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {writeFileSync} from 'node:fs';
const [out='/tmp/cl.png',js='',frames='12',w='1280',h='720']=process.argv.slice(2);
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:+w,height:+h}});
const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||m.text().startsWith('[cl]'))logs.push(m.type()+': '+m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1');
const t0=Date.now();
await page.waitForFunction(()=>window.__game||document.getElementById('bootMsg')?.textContent.startsWith('Could'),null,{timeout:240000,polling:500});
console.log('boot',Date.now()-t0,'ms',await page.evaluate(()=>document.getElementById('bootMsg').textContent));
await page.evaluate(()=>window.__game&&window.__game.hold(true));
if(js)await page.evaluate(`(()=>{const G=window.__game;${js}})()`);
for(let i=0;i<+frames;i++){await page.evaluate(()=>window.__game.frame(1/30));await page.waitForTimeout(250);}
const url=await page.evaluate(()=>window.__game.shot());
writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));
console.log('wrote',out);console.log(logs.slice(0,30).join('\n'));
await browser.close();
