/* The lights in the world and the garage: node tools/marks_shot.mjs outdir [phone] */
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {mkdirSync} from 'node:fs';
const [dir='/tmp/ms',dev='']=process.argv.slice(2);mkdirSync(dir,{recursive:true});const phone=dev==='phone';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await browser.newContext(phone?{viewport:{width:915,height:412},deviceScaleFactor:1,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
const page=await ctx.newPage();const logs=[];page.on('console',m=>{if(m.type()==='error')logs.push(m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1&quality=mobile');
await page.waitForFunction(()=>window.__game,null,{timeout:240000,polling:500});
await page.evaluate(()=>{localStorage.removeItem('cl-free');window.__game.hold(true);});
const frames=async(n=4,dt=1/30)=>{for(let i=0;i<n;i++)await page.evaluate(d=>window.__game.frame(d),dt);};
const shot=async name=>{await frames(4);await page.screenshot({path:dir+'/'+name+'.png',timeout:120000});console.log('shot',name);};
const only=(process.argv[4]||'garage,neon,salt,summit,gate,drift').split(',');
await page.evaluate(()=>window.__game.chooseMode('free'));await page.waitForTimeout(300);
if(only.includes('garage')){await page.click('.gc[data-v="wedge"]');await page.waitForTimeout(300);await page.click('.gp[data-v="wedgeNR"]');await page.waitForTimeout(300);await shot('garage-wedgeNR');
  await page.click('.gg[data-v="body"]');await page.click('.gs[data-v="glow"]');await page.click('.go[data-v="magenta"]');await page.waitForTimeout(300);await shot('garage-glow');}
await page.evaluate(()=>{const g=window.__game;g.P.current='suv';});
await page.click('.gdrive');await page.waitForTimeout(200);
await page.evaluate(()=>{const d=document.querySelector('#dialog [data-d="0"]');if(d)d.click();});
const view=async(name,x,y,yaw,cam)=>{await page.evaluate(([x,y,yaw,cam])=>{const g=window.__game;g.placeAt(x,y,yaw);if(cam)g.cam.mode=cam;g.sim(.3);},[x,y,yaw,cam]);await shot(name);};
if(only.includes('neon'))await view('town-vince',-260,-120,0);
if(only.includes('salt'))await view('salt-start',330,-2,0);
if(only.includes('summit'))await view('summit-town',60,1150,-1.75);
if(only.includes('gate')){await page.evaluate(()=>{const g=window.__game;g.startChal('salt');g.sim(3.4);g.setInput(()=>({thr:1,steer:0,brk:0,hb:0}));g.sim(2.5);});await shot('gate-salt');}
if(only.includes('drift')){await page.evaluate(()=>{const g=window.__game;g.setInput(null);g.startChal('drift');g.sim(3.5);});await shot('drift-zone');}
if(only.includes('menu')){await page.keyboard.press('Escape');await page.evaluate(()=>{const g=window.__game;if(g.state()!=='pause'){document.querySelector('#touch .k-pause');}});await shot('menu');
  await page.evaluate(()=>{const r=document.querySelector('#menu .rows');r.scrollTop=520;});await shot('menu-chals');}
console.log(logs.join('\n'));await browser.close();
