/* Run a piece of code inside the booted game and print what it returns: for checks that need no picture.
   usage: node tools/eval_rut.js "<code, with the game as g>"      env: FILE (another built page), QUALITY (mobile)
   e.g.   node tools/eval_rut.js "return {car:g.APP.car,hp:g.GAME.car.spec.peak.hp}"
   The page's loop is stopped (GAME.hold) and requestAnimationFrame is a no-op, as in shot_rut.js; call g.step, g.bayTick
   and g.render yourself. A thrown error comes back as {error, stack}. Software rendering: half a minute to boot. */
const {chromium}=require('playwright');const path=require('path');
const code=process.argv[2]||'return null';const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rut-access.html');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||960),height:+(process.env.H||540)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  await p.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}&display=clear`);
  try{await p.waitForFunction(()=>window.__game&&(document.getElementById('loading').hidden||/wrong|compile/.test(document.getElementById('loading').textContent)),null,{timeout:400000,polling:1000});}
  catch(e){errs.push('boot timed out');}
  const r=await p.evaluate(async code=>{
    window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,300));
    const g=window.__game;g.GAME.hold=true;g.closeMenu();g.GAME.state='drive';
    try{return await (new (Object.getPrototypeOf(async function(){}).constructor)('g',code))(g);}catch(e){return {error:e.message,stack:String(e.stack).split('\n').slice(0,6)};}
  },code);
  console.log(JSON.stringify(r,null,1));if(errs.length)console.log('PAGE ERRORS:',errs.slice(0,5).join('\n'));
  await b.close();process.exit(errs.length?1:0);
})();
