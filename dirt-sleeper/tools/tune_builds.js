// Coordinate-descent search for the preset builds, using the game's own physics (quickPass).
// node tools/tune_builds.js [sleeper|racer|mudder]
const H=require('./harness.js'),g=H.get;
const SB=H.STOCK_BUILD,SLOT=H.SLOT,SLOTS=H.SLOTS,quickPass=H.quickPass,buildNumbers=H.buildNumbers;
const which=process.argv[2]||'racer';
const looks={
  sleeper:{paint:'bronze',face:'classic',tails:'classic',trim:'chrome',clad:'satin',accent:'none',livery:0,tint:'stock',wheel:'stock18',flares:0,sides:'cladding',spoiler:1,roof:'rails',front:'stock',hood:'stock',snorkel:0,lights:0},
  racer:{paint:'gunmetal',face:'street',tails:'led',trim:'black',clad:'satin',accent:'red',livery:0,tint:'limo',flares:0,sides:'cladding',spoiler:2,roof:'none',front:'lip',hood:'stock',snorkel:0,lights:0},
  mudder:{paint:'orange',face:'backcountry',tails:'classic',trim:'black',clad:'satin',accent:'none',livery:0,tint:'stock',flares:2,sides:'sliders',spoiler:0,roof:'none',front:'recovery',hood:'stock',snorkel:1,lights:1}
}[which];
const free={
  sleeper:['engine','power','nos','intake','exhaust','cam','tune','trans','axle','tcase','lockers','susp','shocks','tyre','interior','rear'],
  racer:['engine','power','nos','intake','exhaust','cam','tune','trans','axle','tcase','lockers','susp','shocks','tyre','wheel','interior','rear'],
  mudder:['engine','power','nos','intake','exhaust','cam','tune','trans','axle','tcase','lockers','susp','shocks','tyre','wheel','interior']
}[which];
const valid=b=>{for(const s of SLOTS){const o=s.opts.find(o=>o.v===b[s.id]);if(!o)return false;if(o.req&&o.req(b))return false;}return true;};
const cache=new Map();
function score(b){
  const k=JSON.stringify(b);if(cache.has(k))return cache.get(k);
  let r;
  if(which==='mudder'){const m=quickPass(b,'mud',60);const t=quickPass(b,'trail',120);r={s:m.et*1+t.et*0.25,m:m.et,t:t.et};}
  else{const p=quickPass(b,'strip');const n=buildNumbers(b);
    r={s:which==='sleeper'? p.et + Math.max(0,n.looks-14)*0.08 : p.et, et:p.et, looks:n.looks, sleeper:n.sleeper, hp:n.hp};}
  cache.set(k,r);return r;
}
let b=Object.assign({},SB,looks,{
  sleeper:{engine:'tt35',power:'bigturbo',tune:2,nos:2,trans:'race4',axle:4.1,tyre:'street32'},
  racer:{engine:'bb74',power:'roots',tune:2,nos:4,trans:'race4',axle:4.1,tyre:'drag33',susp:'lowered',wheel:'street20'},
  mudder:{engine:'bb74',tune:1,trans:'built',axle:5.38,tyre:'sw40',susp:'lift6',tcase:'low',lockers:2,wheel:'beadlock17'}
}[which]);
if(!valid(b)){for(const s of SLOTS){const o=s.opts.find(o=>o.v===b[s.id]);if(o&&o.req&&o.req(b))console.log('invalid start',s.id,o.req(b));}}
let best=score(b),t0=Date.now();console.log('start',JSON.stringify(best));
for(let pass=0;pass<4;pass++){let improved=false;
  for(const id of free){for(const o of SLOT[id].opts){if(o.v===b[id])continue;const c=Object.assign({},b,{[id]:o.v});
      // keep tyre/lift pairs valid by trying the cheapest valid lift too
      let cands=[c];if(id==='tyre'||id==='susp')for(const sp of SLOT.susp.opts)cands.push(Object.assign({},c,{susp:sp.v}));
      for(const cc of cands){if(!valid(cc))continue;const sc=score(cc);if(sc.s<best.s-1e-3){best=sc;b=cc;improved=true;}}}}
  console.log('pass',pass,JSON.stringify(best),((Date.now()-t0)/1000).toFixed(0)+'s');if(!improved)break;}
const out={};for(const id of free)out[id]=b[id];console.log(which,JSON.stringify(out));
