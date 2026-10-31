/* =====================================================================================
   THE TUNE SHEET IN THE CAREER: tune within your hardware (the dyno lab's setup sheet, 63_dyno_lab). Free play
   keeps the sheet as it was: anything goes. In the career:
     always free     the sound and the feel: knock and clatter, its tone, pulse length, roughness, pipe length,
                     pops and crackle, blow-off, the horn, the dyno's own shifts and TC, launch rpm, the limiter
     free up to what's bolted on, then a kit: displacement (a stroker kit, then a big-bore block), redline (valve
                     springs, then a billet valvetrain), boost (a wastegate and injectors, then a forged bottom
                     end), turbo size, the nitrous shot, the cam's grind
     the part itself layout (an engine swap), induction, exhaust, intake, anti-lag, straight-cut gears, launch
                     control, diesel, the jake brake
   Past what you own, a slider shows the locked stretch with the next kit and its price; a choice you don't own
   shows its price. Let go past the line (or pick it) and the buy bar asks; Not now puts it back. So the sheet is
   also the shopping list. What you buy here is the car's for good, whichever engine parts it has on.
   The career's tune is kept in its own save (60_career), apart from free play's (cc-tune).
   ===================================================================================== */
const TH_FREE=new Set(['mech','mechTone','ch_td','ch_scatter','exLen','crackle','bov','horn','launchRpm','limiter']);
const r50=v=>Math.round(v/50)*50;
/* ladders: what the parts give free, then each kit's price and how far it takes the slider */
const TH_LADDER={
  disp:b=>({lo:b.disp*.85,hi:b.disp*1.06,steps:[{id:'stroker',n:'Stroker kit',p:r50(1500+b.disp*420),hi:b.disp*1.25},{id:'bigbore',n:'Big-bore block',p:r50(4200+b.disp*900),hi:b.disp*1.6}],
    past:'Bigger than that is a different engine: the garage\'s Engine slot'}),
  redline:b=>({lo:0,hi:b.redline+300,steps:[{id:'springs',n:'Valve springs',p:1400,hi:b.redline+900},{id:'billet',n:'Billet valvetrain',p:4800,hi:b.redline+2200}],
    past:'Past that the engine comes apart'}),
  boost:b=>{const b0=b.fi&&b.fi!=='none'?b.boost||.8:.8;return {lo:0,hi:b0*1.15,steps:[{id:'gate',n:'Wastegate and injectors',p:2200,hi:b0*1.7},{id:'forged',n:'Forged bottom end',p:6500,hi:3.5}],past:''};}};
/* a choice by its index, up to what you own: [price of each index] (owning one owns the ones below it) */
const TH_UP={tsize:[0,2400,4200],nos:[0,900,1600,2600,4800],cam:[0,900,1800,2800]};
/* the parts themselves: what each other choice costs */
const TH_PART={
  layout:v=>{const L=SIM.LAYOUTS[v];return L?r50(3000+L.cyl*1000+(L.stroke2?4000:0)+(L.kind?6000:0)):9000;},
  fi:v=>({none:0,turbo:6500,twin:9500,roots:5800,screw:7200,cent:5200})[v]??6000,
  ex:v=>800+(+v||0)*200,intake:v=>500+(+v||0)*200,
  antilag:v=>v?2500:0,gearWhine:v=>v?1800:0,launch:v=>v?1200:0,diesel:v=>v?12000:0,jake:v=>v?1500:0};
const TH_NAME={layout:'Engine swap',fi:'Induction',ex:'Exhaust',intake:'Intake',antilag:'Anti-lag',gearWhine:'Straight-cut gears',launch:'Launch control',diesel:'Diesel conversion',jake:'Jake brake',
  tsize:'Turbo',nos:'Nitrous kit',cam:'Cam'};
const thOwned=k=>!!(CAREER.d&&CAREER.d.owned[APP.car+'|sheet|'+k]);
const thOwn=k=>{CAREER.d.owned[APP.car+'|sheet|'+k]=1;};
/* the base: the engine as the parts made it */
const thBase=()=>dlBase();
/* how far a ladder's slider goes free with what you own */
function thLimit(k){const L=TH_LADDER[k](thBase());let hi=L.hi;for(const s of L.steps)if(thOwned(k+'|'+s.id))hi=Math.max(hi,s.hi);return {L,hi};}
/* what a value needs that you don't have: null, or {n, p, own:[keys]} (p null: no kit takes it that far) */
function thNeed(r,v){
  if(!CAREER.on||r.sim||TH_FREE.has(r.k))return null;const b=thBase(),k=r.k;
  if(TH_LADDER[k]){const {L,hi}=thLimit(k);if(v<=hi+1e-6&&v>=L.lo-1e-6)return null;
    if(v<L.lo-1e-6)return {n:'',p:null,why:'Smaller than that is a different engine: the garage\'s Engine slot'};
    let p=0;const own=[],names=[];for(const s of L.steps){if(thOwned(k+'|'+s.id)||s.hi<hi)continue;p+=s.p;own.push(k+'|'+s.id);names.push(s.n);if(v<=s.hi+1e-6)return {n:names.join(' + '),p,own};}
    return {n:'',p:null,why:L.past||'Past what any kit allows'};}
  if(TH_UP[k]){const i=+v,b0=k==='tsize'?(b.fi&&b.fi!=='none'?b.tsize||0:0):+(b[k]||0);if(i<=b0)return null;let p=0;const own=[];
    for(let j=b0+1;j<=i;j++){if(thOwned(k+'|'+j))continue;p+=TH_UP[k][j]||0;own.push(k+'|'+j);}
    return p?{n:TH_NAME[k]+': '+thChoice(r,v),p,own}:null;}
  if(TH_PART[k]){if(String(v)===String(b[k]??(k==='fi'?'none':0))||!TH_PART[k](v))return null;const key=k+'|'+v;if(thOwned(key))return null;
    return {n:TH_NAME[k]+': '+thChoice(r,v),p:TH_PART[k](v),own:[key]};}
  return null;}
const thChoice=(r,v)=>{if(r.t==='toggle')return v?'on':'off';const o=(r.opts?r.opts(dlParams()):[]).find(q=>String(q[0])===String(v));return o?String(o[1]):String(v);};
/* ---------- the gate on a change (called by dlSetVal): true to go ahead as asked, 'preview' to try it without
   handing it to the car, false to drop it ---------- */
const TH={ask:null};
function thGate(r,v,final){
  if(!CAREER.on||r.sim)return true;const need=thNeed(r,v);
  if(!need){if(TH.ask&&TH.ask.r===r&&final)thClose();return true;}
  if(!final)return 'preview';
  /* let go past what you own: the price, or (past any kit) back to the line */
  const prev=TH.ask&&TH.ask.r===r?TH.ask.prev:thPrev(r);
  if(need.p==null){thSay(need.why);dlSetValRaw(r,thClamp(r,v,prev),true);return false;}
  TH.ask={r,v,prev,need};const bar=$('dlBuy'),can=cash()>=need.p;bar.hidden=false;
  $('dlBuyTxt').textContent=need.n+' for the '+carLabel()+' · '+Feats.fmtMoney(need.p)+(can?'':' (you have '+Feats.fmtMoney(cash())+')');
  $('dlBuyYes').disabled=!can;$('dlBuyYes').textContent=can?'Buy it':'Not enough money';
  return 'preview';}
/* where a refused value goes back to: a slider to the end of what you own, a choice to what it was */
function thClamp(r,v,prev){if(TH_LADDER[r.k]){const {L,hi}=thLimit(r.k);return Math.min(hi,Math.max(L.lo,v));}return prev;}
function thPrev(r){const o=dlParams();return r.val?r.val(o):o[r.k];}
function thSay(t){const el=$('dlBuyTxt');$('dlBuy').hidden=false;el.textContent=t;$('dlBuyYes').hidden=true;$('dlBuyNo').textContent='OK';TH.ask=null;}
function thClose(){$('dlBuy').hidden=true;$('dlBuyYes').hidden=false;$('dlBuyNo').textContent='Not now';TH.ask=null;}
function thBuy(){const a=TH.ask;if(!a)return;if(!spend(a.need.p))return;for(const k of a.need.own)thOwn(k);CAREER.d.bought=(CAREER.d.bought||0)+1;careerSave();thClose();dlSetValRaw(a.r,a.v,true);}
function thNo(){const a=TH.ask;thClose();if(a)dlSetValRaw(a.r,thClamp(a.r,a.v,a.prev),true);}
/* ---------- the sheet in the career: the locked stretch on each slider, the price on each choice ---------- */
function thDecorate(o){
  const on=CAREER.on;
  for(const r of DL.rows){
    if(!r.row||r.row.hidden)continue;
    if(r.t==='range'){let lim=r.row.querySelector('.lim');
      if(!on||!TH_LADDER[r.k]){if(lim)lim.remove();continue;}
      if(!lim){lim=document.createElement('div');lim.className='lim';lim.innerHTML='<i></i><b></b><span></span>';r.el.after(lim);}
      const [mn,mx]=[+r.el.min,+r.el.max],{L,hi}=thLimit(r.k),f=x=>clamp((x-mn)/(mx-mn),0,1)*100;
      lim.querySelector('i').style.cssText=`left:${f(L.lo)}%;width:${Math.max(0,f(hi)-f(L.lo))}%`;lim.querySelector('b').style.cssText=`left:${f(hi)}%;right:0`;
      const nx=L.steps.find(s=>!thOwned(r.k+'|'+s.id)&&s.hi>hi);
      lim.querySelector('span').textContent=hi>=mx-1e-6?'':nx?`To ${r.fmt(nx.hi)}: ${nx.n} · ${Feats.fmtMoney(nx.p)}`:`Locked past ${r.fmt(hi)}`;
      const cur=+r.el.value;r.row.classList.toggle('locked',cur>hi+1e-6||cur<L.lo-1e-6);continue;}
    if(r.t==='seg'&&(TH_UP[r.k]||TH_PART[r.k])){for(const btn of r.el.children){if(!btn.dataset.n)btn.dataset.n=btn.textContent;const need=on?thNeed(r,/^\d+$/.test(btn.dataset.v)?+btn.dataset.v:btn.dataset.v):null;
        btn.textContent=btn.dataset.n+(need&&need.p?' · '+Feats.fmtMoney(need.p):'');btn.classList.toggle('price',!!(need&&need.p));}continue;}
    if(r.t==='select'&&TH_PART[r.k]){for(const op of r.el.options){if(!op.dataset.n)op.dataset.n=op.textContent;const need=on?thNeed(r,/^\d+$/.test(op.value)?+op.value:op.value):null;op.textContent=op.dataset.n+(need&&need.p?' · '+Feats.fmtMoney(need.p):'');}continue;}
    if(r.t==='toggle'&&TH_PART[r.k]){const lab=r.row.querySelector('label');if(!lab.dataset.n)lab.dataset.n=lab.textContent;const need=on&&r.el.getAttribute('aria-checked')!=='true'?thNeed(r,1):null;
      lab.textContent=lab.dataset.n+(need&&need.p?' · '+Feats.fmtMoney(need.p):'');}
  }
  const t=$('dlTuned');if(on&&t&&t.textContent)t.textContent+=' In the career the sheet tunes what you have bolted on: past that, each kit or part shows its price.';
}
function buildTuneCareer(){$('dlBuyYes').addEventListener('click',thBuy);$('dlBuyNo').addEventListener('click',()=>{if(TH.ask)thNo();else thClose();});}
