/* =====================================================================================
   CITY LIMITS — THE SAVE: one for the career, one for free play, both in this browser (cl- keys).
   Career: a stock SUV and a little cash; challenges and the town's people pay; the money buys parts
   and the other cars (three of them only once someone in town has vouched for you).
   Free play: every car and every part is yours from the start, and the money is just a score.
   Each car keeps one rig (its parts); what you have bought stays bought, so going back is free.
   ===================================================================================== */
import {PAY} from './chaldefs.js';

export const START_CASH=2500;
/* the dealer: price, and (career) the quest that opens it */
export const DEALER={suv:{price:14000,base:'stock'},hatch:{price:9000,base:'hatch'},coupe:{price:24000,base:'coupe'},
  ev:{price:32000,base:'ev',quest:'quiet'},wedge:{price:42000,base:'wedge',quest:'nightrunner'},hyper:{price:68000,base:'hyper',quest:'twohundred'}};
const KEY={career:'cl-career',free:'cl-free'};

export class Profile{
  constructor(mode,HD){this.mode=mode;this.HD=HD;this.d=this.load()||this.fresh();this.fix();}
  static exists(mode){try{return !!localStorage.getItem(KEY[mode]);}catch(e){return false;}}
  static peek(mode){try{return JSON.parse(localStorage.getItem(KEY[mode])||'null');}catch(e){return null;}}
  static wipe(mode){try{localStorage.removeItem(KEY[mode]);}catch(e){}}
  get free(){return this.mode==='free';}
  fresh(){
    const H=this.HD,d={v:1,mode:this.mode,money:this.free?0:START_CASH,earned:0,cars:{},owned:{},current:'suv',medals:{},best:{},runs:{},quests:{},active:null,seen:{},made:Date.now()};
    for(const car of this.free?Object.keys(DEALER):['suv'])d.cars[car]={rig:H.presetRig(DEALER[car].base)};
    return d;}
  load(){try{const d=JSON.parse(localStorage.getItem(KEY[this.mode])||'null');return d&&d.v===1?d:null;}catch(e){return null;}}
  save(){try{localStorage.setItem(KEY[this.mode],JSON.stringify(this.d));}catch(e){}}
  /* a rig saved by an older version may miss slots added since: fill them from the car's factory preset */
  fix(){const H=this.HD;for(const [car,c] of Object.entries(this.d.cars)){const base=H.presetRig(DEALER[car].base);for(const [s] of H.SLOTS)if(c.rig[s]===undefined)c.rig[s]=base[s];H.fixRig(car,c.rig);}
    if(!this.d.cars[this.d.current])this.d.current=Object.keys(this.d.cars)[0];}
  /* ---------- money ---------- */
  get money(){return this.d.money;}
  earn(n){n=Math.round(n);this.d.money+=n;this.d.earned+=n;this.save();return n;}
  spend(n){if(this.free)return true;if(this.d.money<n)return false;this.d.money-=n;this.save();return true;}
  /* ---------- cars ---------- */
  hasCar(car){return !!this.d.cars[car];}
  carOpen(car){return this.free||!DEALER[car].quest||!!(this.d.quests[DEALER[car].quest]&&this.d.quests[DEALER[car].quest].done);}
  buyCar(car){if(this.hasCar(car))return true;if(!this.carOpen(car))return false;if(!this.spend(DEALER[car].price))return false;
    this.d.cars[car]={rig:this.HD.presetRig(DEALER[car].base)};this.d.current=car;this.save();return true;}
  rig(car=this.d.current){return Object.assign({},this.d.cars[car].rig);}
  setRig(car,rig){this.d.cars[car].rig=Object.assign({},rig);this.save();}
  get current(){return this.d.current;}
  set current(car){if(this.hasCar(car)){this.d.current=car;this.save();}}
  /* ---------- parts: what the car came with, and what you have bought for it ---------- */
  owns(car,slot,val){if(this.free)return true;const base=this.HD.PRESET_PARTS[DEALER[car].base];
    if(base&&String(base[slot])===String(val))return true;if(this.price(car,slot,val)===0)return true;return !!this.d.owned[car+'|'+slot+'|'+val];}
  price(car,slot,val){const o=this.HD.slotOptions(car,slot,this.d.cars[car]?this.d.cars[car].rig:this.HD.presetRig(DEALER[car].base)).find(q=>String(q[0])===String(val));return o?o[3]||0:0;}
  buyPart(car,slot,val){if(this.owns(car,slot,val))return true;const p=this.price(car,slot,val);if(!this.spend(p))return false;this.d.owned[car+'|'+slot+'|'+val]=1;this.d.bought=(this.d.bought||0)+1;this.save();return true;}
  /* what a whole rig would cost on top of what you own */
  costOf(car,rig){let c=0;for(const [s] of this.HD.SLOTS){if(!this.owns(car,s,rig[s]))c+=this.price(car,s,rig[s]);}return c;}
  buyRig(car,rig){const c=this.costOf(car,rig);if(!this.spend(c))return false;for(const [s] of this.HD.SLOTS)if(!this.owns(car,s,rig[s]))this.d.owned[car+'|'+s+'|'+rig[s]]=1;this.d.bought=(this.d.bought||0)+1;this.setRig(car,rig);return true;}
  /* ---------- challenges ---------- */
  medal(id){return this.d.medals[id]??-1;}
  best(id){return this.d.best[id]??null;}
  /* a finished run: keep the best, pay the medal (a better one than before pays the difference) */
  result(c,value,medal){
    const d=this.d,prev=d.medals[c.id]??-1,pay=c.pay||PAY[1];let money=0,newBest=false;
    d.runs[c.id]=(d.runs[c.id]||0)+1;
    if(value!=null){const b=d.best[c.id];if(b==null||(c.better==='low'?value<b:value>b)){d.best[c.id]=value;newBest=true;}}
    if(medal>=0){if(prev<0||medal<prev){money=pay[medal]-(prev>=0?pay[prev]:0);d.medals[c.id]=medal;}else money=Math.round(pay[medal]*.1);}
    else if(value!=null)money=Math.round(pay[2]*.05);
    if(money)this.earn(money);else this.save();
    return {money,newBest,prev,upgraded:medal>=0&&(prev<0||medal<prev)};}
  medalCount(){const n=[0,0,0];for(const m of Object.values(this.d.medals))if(m>=0)n[m]++;return n;}
  /* ---------- quests ---------- */
  quest(id){return this.d.quests[id]||null;}
}
