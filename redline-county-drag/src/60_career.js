/* =====================================================================================
   THE CAREER (City Limits', moved here): a save of its own beside free play.
   Career: a stock SUV and $2,500. Challenges (60_chal) and the town's people (60_jobs) pay, and so do the
   feats, a share of what free play would give for them; the money buys parts and the other cars at the
   dealer (three of them only once someone in town has vouched for you), and the Plus tune is a paid job at
   Marisol's. Each car keeps one rig; what you have bought stays bought, so going back to it is free.
   Free play: as it always was, every car and every part yours, the money a score.
   The game's RIGS and APP.car hold whichever mode is on: free play's are kept in cc-game as before, the
   career's in cc-career (with its money, medals, bests, jobs). cc-mode says which one you were in.
   ===================================================================================== */
const START_CASH=2500,FEAT_SHARE=.35,PLUS_PRICE=6000;
/* the dealer: price, and the job that opens it (60_jobs) */
const DEALER={suv:{price:14000},hatch:{price:9000},trail:{price:11000},wagon:{price:12500},pickup:{price:16000},coupe:{price:24000},muscle:{price:28000},
  ev:{price:32000,job:'quiet'},wedge:{price:42000,job:'nightrunner'},hyper:{price:68000,job:'twohundred'},
  quad90:{price:1500},quad450:{price:7500},quadUtil:{price:6000},sxs:{price:15000},golf:{price:4000},kart:{price:3500},tractor:{price:18000},semi:{price:45000}};
const careerFresh=()=>({v:1,money:START_CASH,earned:0,cars:{suv:{rig:presetRig('stock')}},owned:{},plus:{},tune:{},current:'suv',medals:{},best:{},runs:{},quests:{},active:null,seen:{},bought:0,made:Date.now()});
function careerLoad(){try{const d=JSON.parse(store.get('cc-career','null'));return d&&d.v===1?d:null;}catch(e){return null;}}
const careerSave=()=>{if(CAREER.d)store.set('cc-career',JSON.stringify(CAREER.d));};
const careerExists=()=>!!careerLoad();
/* ---------- money: the career's, or free play's score ---------- */
const cash=()=>CAREER.on?CAREER.d.money:Feats.S.money;
function earn(n){n=Math.round(n);if(!n)return 0;if(CAREER.on){CAREER.d.money+=n;CAREER.d.earned+=n;careerSave();}else{Feats.S.money+=n;Feats.S.session+=n;Feats.save();}return n;}
function spend(n){if(!CAREER.on)return true;if(CAREER.d.money<n)return false;CAREER.d.money-=n;careerSave();return true;}
/* the feats bank into the career at a share (free play keeps its whole score) */
Feats.onBank=tot=>CAREER.on?earn(tot*FEAT_SHARE):tot;
/* ---------- cars ---------- */
const ownsCar=car=>!CAREER.on||!!CAREER.d.cars[car];
const jobDone=id=>!!(CAREER.d&&CAREER.d.quests[id]&&CAREER.d.quests[id].done);
const carOpen=car=>!CAREER.on||!DEALER[car]||!DEALER[car].job||jobDone(DEALER[car].job);
function buyCar(car){if(ownsCar(car))return true;if(!carOpen(car)||!spend(DEALER[car].price))return false;
  CAREER.d.cars[car]={rig:presetRig(CAR_STOCK[car])};RIGS[car]=presetRig(CAR_STOCK[car]);APP.car=car;careerSave();saveGame();return true;}
/* ---------- parts: what the car came with, what costs nothing, what you have bought for it ---------- */
function partPrice(car,slot,val,rig){const o=slotOptions(car,slot,rig||rigOf(car)).find(q=>q[0]===val);return o?o[3]||0:0;}
function ownsPart(car,slot,val,rig){if(!CAREER.on)return true;const base=PRESET_PARTS[CAR_STOCK[car]];
  if(base&&String(base[slot])===String(val))return true;if(!partPrice(car,slot,val,rig))return true;return !!CAREER.d.owned[car+'|'+slot+'|'+val];}
/* what a whole rig would cost on top of what you own, and the parts that make it up */
function rigCost(car,rig){let c=0;const list=[];for(const [s] of SLOTS)if(!ownsPart(car,s,rig[s],rig)){const p=partPrice(car,s,rig[s],rig);c+=p;list.push([s,rig[s],p]);}return {cost:c,list};}
function buyRig(car,rig){const {cost,list}=rigCost(car,rig);if(!spend(cost))return false;
  for(const [s,v] of list)CAREER.d.owned[car+'|'+s+'|'+v]=1;if(list.length)CAREER.d.bought=(CAREER.d.bought||0)+1;careerSave();return true;}
const plusOwned=car=>!CAREER.on||!!CAREER.d.plus[car];
function buyPlus(car){if(plusOwned(car))return true;if(!spend(PLUS_PRICE))return false;CAREER.d.plus[car]=1;careerSave();return true;}
/* the dealer's line for a car you don't have: its price, or who to see */
function dealerLine(car){if(ownsCar(car))return '';const D=DEALER[car];if(!D)return 'Not for sale';
  if(!carOpen(car)){const j=typeof JOB_NAMES!=='undefined'&&JOB_NAMES[D.job];return j?`Opens with ${j}`:'Not for sale yet';}
  return Feats.fmtMoney(D.price);}
/* ---------- switching: free play's cars and rigs kept aside while the career's are on, and back ---------- */
function setMode(mode,quiet){
  const want=mode==='career';if(want===CAREER.on&&(!want||CAREER.d)){if(!quiet)spawnRig(false);return;}
  if(want){CAREER.free={car:APP.car,rigs:Object.assign({},RIGS)};CAREER.d=careerLoad()||careerFresh();CAREER.on=true;
    for(const k of Object.keys(RIGS))delete RIGS[k];for(const car of Object.keys(CAREER.d.cars))if(CAR_PARTS[car])RIGS[car]=cleanRig(car,CAREER.d.cars[car].rig);
    APP.car=CAREER.d.cars[CAREER.d.current]?CAREER.d.current:'suv';Feats.load('cc-cfeats');tuneSwap(CAREER.d.tune||{});}
  else{careerSync();if(CAREER.d)CAREER.d.tune=JSON.parse(JSON.stringify(TUNE));careerSave();CAREER.on=false;for(const k of Object.keys(RIGS))delete RIGS[k];if(CAREER.free){Object.assign(RIGS,CAREER.free.rigs);APP.car=CAREER.free.car;}CAREER.free=null;Feats.load('cc-free');
    let T={};try{T=JSON.parse(store.get('cc-tune','{}'))||{};}catch(e){}tuneSwap(T);}
  store.set('cc-mode',want?'career':'free');saveGame();if(typeof chalReset==='function')chalReset();spawnRig(false);
}
/* the Tune sheet's hand tunes (TUNE, 16_engines) are each game's own: swapped in whole, and every engine made afresh */
function tuneSwap(T){for(const k of Object.keys(TUNE))delete TUNE[k];Object.assign(TUNE,JSON.parse(JSON.stringify(T)));for(const k of Object.keys(SPECS))delete SPECS[k];}
/* the career's cars, rigs and current car, from the game's */
function careerSync(){if(!CAREER.on||!CAREER.d)return;for(const car of Object.keys(CAREER.d.cars))if(RIGS[car])CAREER.d.cars[car].rig=Object.assign({},RIGS[car]);
  if(CAREER.d.cars[APP.car])CAREER.d.current=APP.car;careerSave();}
function careerWipe(){store.set('cc-career','null');if(CAREER.on){CAREER.d=null;CAREER.on=false;let T={};try{T=JSON.parse(store.get('cc-tune','{}'))||{};}catch(e){}tuneSwap(T);setMode('career');}}
/* ---------- the buy bar under the menu: what, how much, yes or no ---------- */
const BUY={yes:null};
function askBuy(text,price,yes){
  const bar=$('mBuy');if(!CAREER.on||!price){yes();return;}
  const can=cash()>=price;bar.hidden=false;$('mBuyTxt').textContent=text+' · '+Feats.fmtMoney(price)+(can?'':' (you have '+Feats.fmtMoney(cash())+')');
  $('mBuyYes').disabled=!can;$('mBuyYes').textContent=can?'Buy it':'Not enough money';BUY.yes=yes;}
function closeBuy(){$('mBuy').hidden=true;BUY.yes=null;}
function buildBuy(){$('mBuyYes').addEventListener('click',()=>{const f=BUY.yes;closeBuy();if(f)f();});$('mBuyNo').addEventListener('click',closeBuy);}
