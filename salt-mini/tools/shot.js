/* Pictures and numbers from Salt Mini, the page's loop held: each job is name=code, the code run in the page with the
   page's handle (MINI) before a frame is drawn and the whole page (the dial, the tuner bay) is shot.
   usage: node tools/shot.js <out-dir> 'start=' 'run=MINI.step(12,{thr:1,steer:0,brk:0,hb:0})' ...
   env: W, H (the viewport, 1280 x 720), TOUCH=1 (a phone: touch and portrait sizes). What the code returns is printed. */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const out=process.argv[2]||'/tmp/mini',jobs=process.argv.slice(3);fs.mkdirSync(out,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const touch=!!process.env.TOUCH,p=await b.newPage({viewport:{width:+(process.env.W||(touch?412:1280)),height:+(process.env.H||(touch?860:720))},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,300));});
  const t0=Date.now();await p.goto('file://'+path.resolve(path.join(__dirname,'..','salt-mini.html'))+'?shots=1');
  await p.waitForFunction(()=>window.MINI&&MINI.truck&&document.getElementById('loading').hidden,null,{timeout:900000,polling:500});
  await p.evaluate(()=>MINI.hold(true));console.log('booted',((Date.now()-t0)/1000).toFixed(0)+'s');
  for(const j of jobs.length?jobs:['start=']){const i=j.indexOf('='),name=j.slice(0,i),code=j.slice(i+1),t1=Date.now();
    const r=await p.evaluate(async code=>{const v=await (new Function('MINI','return (async()=>{'+(code.includes('return')?code:'return '+(code||'0'))+'})()'))(MINI);MINI.snap();return v;},code);
    await p.waitForTimeout(300);await p.screenshot({path:path.join(out,name+'.png')});
    console.log(name,((Date.now()-t1)/1000).toFixed(0)+'s',JSON.stringify(r));}
  console.log(errs.length?'page errors: '+errs.slice(0,6).join(' | '):'no page errors');await b.close();
})();
