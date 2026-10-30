/* The garage, a challenge and a job, driven in the page: screenshots and the console's errors.
   node tools/game_check.mjs outdir [phone]      (phone: 915 x 412, touch) */
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {resolve} from 'node:path';import {mkdirSync} from 'node:fs';
const [dir='/tmp/gc',dev='']=process.argv.slice(2);mkdirSync(dir,{recursive:true});const phone=dev==='phone';
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const ctx=await browser.newContext(phone?{viewport:{width:915,height:412},deviceScaleFactor:1,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720}});
const page=await ctx.newPage();const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text());});page.on('pageerror',e=>logs.push('pageerror: '+e.message+'\n'+e.stack));
await page.goto('file://'+resolve('dist/city-limits.html')+'?manual=1&quality=mobile');
await page.waitForFunction(()=>window.__game,null,{timeout:240000,polling:500});
await page.evaluate(()=>{localStorage.removeItem('cl-career');window.__game.hold(true);});
const frames=async(n=4,dt=1/30)=>{for(let i=0;i<n;i++){await page.evaluate(d=>window.__game.frame(d),dt);}};
const shot=async name=>{await frames(3);await page.screenshot({path:dir+'/'+name+'.png',timeout:120000});console.log('shot',name);};
await page.evaluate(()=>window.__game.toTitle());await shot('01-title');
await page.click('[data-m="career"]');await shot('02-garage');
/* open the engine slot, try a part on */
await page.click('.gs[data-v="power"]');await shot('03-power');
await page.click('.go[data-v="twin"]');await shot('04-trying');
console.log('buy bar:',await page.$eval('.gbuy',e=>e.textContent).catch(()=>'none'));
await page.click('[data-a="cancel"]');
await page.click('.gg[data-v="body"]');await page.click('.gs[data-v="paint"]');await shot('05-paint');
await page.click('.gc[data-v="wedge"]');await shot('06-dealer-locked');
await page.click('.gc[data-v="hatch"]');await shot('07-dealer-hatch');
await page.click('.gc[data-v="suv"]');
await page.click('.gdrive');await shot('08-drive');
/* a job: Marisol's first */
const job=await page.evaluate(()=>{const g=window.__game;g.talk('marisol');return document.querySelector('#dialog').hidden?'no dialog':document.querySelector('#dialog').textContent.slice(0,120);});
console.log('dialog:',job);await shot('09-dialog');
await page.click('#dialog [data-d="1"]');await shot('10-job');
console.log('job:',await page.evaluate(()=>JSON.stringify(window.__game.quests.hud())));
/* a challenge: the Main Avenue Quarter, flat out */
await page.evaluate(()=>{const g=window.__game;g.startChal('quarter');g.setInput(()=>({thr:1,brk:0,steer:0,hb:0}));});
await page.evaluate(()=>window.__game.sim(1.5));await shot('11-countdown');
await page.evaluate(()=>window.__game.sim(5));await shot('12-run');
for(let k=0;k<30&&await page.evaluate(()=>!!window.__game.run&&window.__game.state()==='drive');k++)await page.evaluate(()=>window.__game.sim(1));
await shot('13-result');
console.log('result:',await page.evaluate(()=>document.querySelector('#result').hidden?'none':document.querySelector('#result').textContent.slice(0,200)));
console.log('money:',await page.evaluate(()=>window.__game.P.money),'medals',await page.evaluate(()=>JSON.stringify(window.__game.P.d.medals)));
await page.evaluate(()=>window.__game.setInput(null));
await page.click('#result [data-r="on"]');
/* a desert challenge start, to see the lights */
await page.evaluate(()=>{const g=window.__game;g.startChal('ridge');g.sim(4);});await shot('14-ridge');
await page.evaluate(()=>{const g=window.__game;g.placeAt(30,330,1.4);g.sim(.5);});await shot('15-beacons');
console.log(logs.slice(0,30).join('\n'));await browser.close();
