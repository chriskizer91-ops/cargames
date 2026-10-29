/* ---------- hands and feet (the lab's car controls) ---------- */
const ENG_BTNS=[
  {id:'brake',l:'Brake',k:'KeyS',t:'hold',drive:1,tone:'red'},{id:'down',l:'Shift down',k:'KeyQ',t:'tap',drive:1},{id:'up',l:'Shift up',k:'KeyE',t:'tap',drive:1},
  {id:'nos',l:'Nitrous',k:'KeyN',t:'hold',tone:'cyan',need:e=>e.nosKw},{id:'purge',l:'Purge',k:'KeyP',t:'tap',need:e=>e.nosKw},{id:'blip',l:'Blip',k:'KeyB',t:'tap'}];
const ENG_ACT={up:()=>ENG.sim.shift(1),down:()=>ENG.sim.shift(-1),purge:()=>{const v=cur();if(v.port)v.port.post({t:'ev',ev:{type:'purge'}});},blip:()=>{ENG.blipT=.22;}};
function engHold(d,v){if(d.el)d.el.classList.toggle('on',v);if(d.id==='brake')ENG.brkBtn=v;else if(d.id==='nos')ENG.nos=v;}
function engPress(d){if(d.el&&d.el.disabled)return;if(ENG_ACT[d.id])ENG_ACT[d.id]();}
function readInput(dt){
  let thr=ENG.keys.has('thr')?1:0;
  for(const d of ENG.digits)thr=Math.max(thr,d/10);
  if(ENG.padOn)thr=Math.max(thr,ENG.pad);
  if(ENG.blipT>0){ENG.blipT-=dt;thr=1;}
  return {thr,brk:ENG.keys.has('brk')||ENG.brkBtn?1:0,nos:ENG.nos};
}
const typing=t=>t&&(t.tagName==='SELECT'||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&t.type!=='range'));
addEventListener('keydown',e=>{
  if(!ENG.sim||typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;
  const c=e.code,onRange=e.target&&e.target.type==='range';
  const d=ENG_BTNS.find(x=>x.k===c&&x.el&&!x.el.hidden);
  if(d){e.preventDefault();if(d.t==='hold'){if(!e.repeat)engHold(d,true);}else if(!e.repeat)engPress(d);return;}
  if(c==='Space'||c==='KeyW'||(c==='ArrowUp'&&!onRange)){e.preventDefault();ENG.keys.add('thr');return;}
  if(c==='KeyS'||(c==='ArrowDown'&&!onRange)){e.preventDefault();ENG.keys.add('brk');return;}
  if(/^Digit\d$/.test(c)){ENG.digits.add(+c.slice(5)||10);return;}
  if(e.repeat)return;
  if(c==='KeyI')toggleEngine();
  else if(c==='KeyV'){setListener((ENG.listener+1)%3);syncEngineDock();}
});
addEventListener('keyup',e=>{const c=e.code;
  const d=ENG_BTNS.find(x=>x.k===c);if(d&&d.t==='hold'){engHold(d,false);return;}
  if(c==='Space'||c==='KeyW'||c==='ArrowUp'){ENG.keys.delete('thr');if(c==='Space'&&!typing(e.target))e.preventDefault();}
  if(c==='KeyS'||c==='ArrowDown')ENG.keys.delete('brk');
  if(/^Digit\d$/.test(c))ENG.digits.delete(+c.slice(5)||10);});
addEventListener('blur',()=>{ENG.keys.clear();ENG.digits.clear();ENG.padOn=false;ENG.brkBtn=false;ENG.nos=false;for(const d of ENG_BTNS)if(d.t==='hold')engHold(d,false);});

