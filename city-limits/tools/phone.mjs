/* The page as a Pixel 7a held sideways (915 x 412 CSS px, DPR 2.625, touch): the title and driving with the touch controls.
   node tools/phone.mjs outdir */
import {createRequire} from 'node:module';const {chromium,devices}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {mkdirSync,writeFileSync} from 'node:fs';
const [dir='/tmp/phone']=process.argv.slice(2);mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await browser.newContext({viewport:{width:915,height:412},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const page=await ctx.newPage();const logs=[];page.on('console',m=>{if(m.type()==='error')logs.push(m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1');
await page.waitForFunction(()=>window.__game,null,{timeout:240000,polling:500});
await page.evaluate(()=>window.__game.hold(true));
for(let i=0;i<6;i++){await page.evaluate(()=>window.__game.frame(1/30));await page.waitForTimeout(150);}
await page.screenshot({path:dir+'/title.png',timeout:120000});
console.log('settings',await page.evaluate(()=>JSON.stringify(window.__game.settings)));
await page.evaluate(()=>window.__game.go());
for(let i=0;i<6;i++){await page.evaluate(()=>window.__game.frame(1/30));await page.waitForTimeout(150);}
await page.screenshot({path:dir+'/drive.png',timeout:120000});
await page.evaluate(()=>{document.querySelector('#touch .k-pause')&&0;});
console.log(logs.join('\n'));await browser.close();
