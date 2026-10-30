/* =====================================================================================
   CITY LIMITS — THE TOWN'S PEOPLE AND WHAT THEY ASK. Five people with a string of jobs each:
   Marisol at the garage, Deke at the gas station, Rosa at the diner, Vince and the Neon Row crew,
   and Old Hal out on the salt. Stop by one (an amber light means they have something for you),
   listen, take the job. One job at a time; the next step's light is green. A job's steps:
     talk     stop by someone             deliver  get somewhere before the clock runs out
     goto     find a place                chal     a medal (or better) in a challenge
     part     buy any part                medals   so many medals in all
     speed    so fast, on the salt
   Finishing pays, and three of them open a car at the dealer (profile.js).
   ===================================================================================== */
export const PEOPLE={
  marisol:{name:'Marisol Vega',short:'Marisol',role:'runs the garage on Central Avenue',x:0,y:-96,col:'#ff8a3d'},
  deke:{name:'Deke',short:'Deke',role:'works nights at the gas station',x:470,y:20,col:'#ffd23f'},
  rosa:{name:'Rosa',short:'Rosa',role:'owns the Starlite Diner',x:-470,y:-14,col:'#ff5c8a'},
  vince:{name:'Vince',short:'Vince',role:'runs with the Neon Row crew',x:-205,y:-120,col:'#4fe3ff'},
  hal:{name:'Old Hal',short:'Hal',role:'has lived out on the salt since 1971',x:1760,y:-28,col:'#b9a7ff'}
};
const Q=(id,who,title,needs,intro,steps,outro,reward,tip)=>({id,who,title,needs,intro,steps,outro,reward,tip});
export function buildQuests(W){
  const loop=W.D.roads.find(r=>r.id==='loop');let ci=0,cd=1e18;for(let i=0;i<loop.N;i++){const d=(loop.x[i]-600)**2+(loop.y[i]-660)**2;if(d<cd){cd=d;ci=i;}}
  const crate={x:loop.x[ci],y:loop.y[ci]};
  return [
  Q('firstnight','marisol','First Night',[],
    ['So you\'re the one who bought the old SUV. It runs. I checked.','Go and say hi to Deke at the gas station, east end of Main Avenue. He always has work going.'],
    [{t:'talk',who:'deke',text:'Meet Deke at the gas station, east on Main Avenue'}],
    {who:'deke',text:'Marisol sent you? Good. Here, gas money for the drive over.'},{money:800},
    'The cyan columns of light round town and out in the desert are challenges: stop in one to start it. A light in someone\'s colour is a person with work for you. Esc or II pauses, with the garage and every challenge.'),
  Q('grease','marisol','Grease Monkey',['firstnight'],
    ['A car isn\'t yours until you\'ve put something on it.','Buy one part in the garage, anything at all, then come and show me.'],
    [{t:'part',text:'Buy a part in the garage (pause menu, Garage)'},{t:'talk',who:'marisol',text:'Show Marisol at the garage'}],
    {text:'Not bad. Keep the receipt, that one\'s on me.'},{money:1500}),
  Q('quiet','marisol','The Quiet One',['grease'],
    ['I have an electric sedan on order for a customer who changed his mind.','Win five medals anywhere and I\'ll let it go at cost.'],
    [{t:'medals',n:5,text:'Win five medals in the challenges'},{t:'talk',who:'marisol',text:'Tell Marisol'}],
    {text:'It\'s at the dealer. You won\'t hear it coming, but you\'ll feel it.'},{money:3000,car:'ev'}),
  Q('jerrycan','deke','Jerry Can',['firstnight'],
    ['Rosa\'s generator at the diner ran dry, and her pies are in the cooler.','Take her this can. West end of Main, seventy-five seconds. Don\'t spill it.'],
    [{t:'deliver',who:'rosa',limit:75,text:'Get the fuel to Rosa\'s diner'}],
    {who:'rosa',text:'Oh, you\'re a lifesaver. Lights on, pies saved. Come by any time, hon.'},{money:1200}),
  Q('saltfever','deke','Salt Fever',['jerrycan'],
    ['Every kid in town runs the Salt Road once. From my pumps to the salt.','Any medal, and I\'ll know you\'re serious.'],
    [{t:'chal',id:'salt',medal:2,text:'Win a medal on the Salt Road Run'},{t:'talk',who:'deke',text:'Back to Deke'}],
    {text:'Ha! Felt that one from here.'},{money:1500}),
  Q('lostload','deke','Lost Load',['saltfever'],
    ['A truck dropped a crate of parts somewhere on the Rim Trail, north-east of town.','Find it and bring it back. Keep whatever\'s on top.'],
    [{t:'goto',x:crate.x,y:crate.y,r:9,name:'the crate',text:'Find the crate on the Rim Trail'},{t:'talk',who:'deke',text:'Bring the crate to Deke'}],
    {text:'That\'s the one. Told you the trail eats crates.'},{money:3000}),
  Q('pies','rosa','Pies Before Midnight',['jerrycan'],
    ['There\'s a couple up at the summit lookout. It\'s their anniversary, and they ordered a pie.','Ridge Road, all the way up. It\'s warm now. Keep it that way: two minutes and twenty.'],
    [{t:'deliver',x:78,y:1251,r:14,limit:140,name:'the summit lookout',text:'Take the pie to the summit'}],
    {who:'',text:'Two people on a blanket cheer and wave you off. Rosa will hear about this.'},{money:2000}),
  Q('bog','rosa','The Bog Ate My Truck',['pies'],
    ['My cook drove into the bog south of town to "save time". The truck is still in there.','Show him it can be done. Get through the bog. And maybe think about tyres.'],
    [{t:'chal',id:'bog',medal:2,text:'Win a medal at The Bog'},{t:'talk',who:'rosa',text:'Back to Rosa'}],
    {text:'He says it was the truck\'s fault. Here, for your trouble.'},{money:2500}),
  Q('breakfast','rosa','Breakfast for Hal',['bog'],
    ['Old Hal lives out on the salt. One meal a day, and it\'s my breakfast plate.','East, past the end of the Salt Road. Hundred seconds, or it\'s cold and he\'ll tell everyone.'],
    [{t:'deliver',who:'hal',limit:100,text:'Take the plate to Old Hal on the salt'}],
    {who:'hal',text:'Still warm. Huh. You can drive. Come and see me when you want to really go fast.'},{money:2000}),
  Q('prove','vince','Prove It',['firstnight'],
    ['New car in town. The crew wants to know if you can drive or just park.','Two laps of the boulevard. Silver, at least.'],
    [{t:'chal',id:'loop',medal:1,text:'Silver or better on the Limits Loop'},{t:'talk',who:'vince',text:'Find Vince on Neon Row'}],
    {text:'Okay. Okay. You can drive.'},{money:2000}),
  Q('sideways','vince','Sideways',['prove'],
    ['Fast is fine. Sideways is better. Neon Row is ours after midnight.','Silver in the drift zone and you\'re in the crew.'],
    [{t:'chal',id:'drift',medal:1,text:'Silver or better in Neon Row Drift'},{t:'talk',who:'vince',text:'Back to Vince'}],
    {text:'Welcome to the crew. Don\'t scratch the paint.'},{money:2500}),
  Q('nightrunner','vince','Night Runner',['sideways'],
    ['There\'s a wedge in a lock-up on the edge of town. Pop-up lamps, a V12, the whole poster.','Gold on the Downtown Dash and gold on the Quarter, and I make the call.'],
    [{t:'chal',id:'dash',medal:0,text:'Gold on the Downtown Dash'},{t:'chal',id:'quarter',medal:0,text:'Gold on the Main Avenue Quarter'},{t:'talk',who:'vince',text:'Back to Vince'}],
    {text:'The wedge is at the dealer. Don\'t make me regret it.'},{money:5000,car:'wedge'}),
  Q('mile','hal','The Mile',['breakfast'],
    ['I ran the mile out here in \'71. Hundred and forty-one. Nobody\'s believed me since.','Win a medal in the Flying Mile and we\'ll talk.'],
    [{t:'chal',id:'mile',medal:2,text:'Win a medal in the Flying Mile'},{t:'talk',who:'hal',text:'Back to Hal'}],
    {text:'Now you know why I never left.'},{money:3000}),
  Q('twohundred','hal','Two Hundred',['mile'],
    ['Two hundred miles an hour. On the salt. Under the moon. That\'s the dream.','Do it, and I know a man selling a hypercar who owes me a favour.'],
    [{t:'speed',v:89.41,text:'Hit 200 mph on the salt flats'},{t:'talk',who:'hal',text:'Back to Hal'}],
    {text:'Two hundred! I\'ll call him tonight. It\'ll be at the dealer.'},{money:6000,car:'hyper'})
  ];
}

export class Quests{
  constructor(list,profile,challenges){this.list=list;this.P=profile;this.C=challenges;this.msgs=[];this.near=null;this.cool=0;}
  get d(){return this.P.d;}
  done(id){const q=this.d.quests[id];return !!(q&&q.done);}
  get active(){const a=this.d.active;return a?Object.assign({q:this.list.find(q=>q.id===a.id)},a):null;}
  /* the job a person has for you now */
  offerOf(who){return this.list.find(q=>q.who===who&&!this.done(q.id)&&q.needs.every(n=>this.done(n)))||null;}
  step(){const a=this.active;return a?a.q.steps[a.step]:null;}
  accept(q){this.d.active={id:q.id,step:0,t0:null,bought:this.d.bought||0};this.startStep();this.P.save();this.msgs.push({t:'accept',q});}
  drop(){this.d.active=null;this.P.save();}
  startStep(){const a=this.d.active,s=this.step();a.t0=s&&s.limit?0:null;}
  /* where the current step wants you */
  target(){const s=this.step();if(!s)return null;
    if(s.who){const p=PEOPLE[s.who];return {x:p.x,y:p.y,name:p.short,r:10};}
    if(s.t==='goto'||s.t==='deliver')return {x:s.x,y:s.y,name:s.name,r:s.r||10};
    if(s.t==='chal'){const c=this.C.find(c=>c.id===s.id);return c?{x:c.start.x,y:c.start.y,name:c.name,r:14,chal:c}:null;}
    if(s.t==='speed')return {x:2600,y:0,name:'the salt flats',r:0};
    return null;}
  /* each frame while driving: is the current step done? is someone close enough to talk? */
  update(dt,car){
    const x=car.p[0],y=-car.p[2],slow=car.speed<3.5,a=this.d.active;this.cool=Math.max(0,this.cool-dt);
    if(a){const s=this.step();
      if(s&&s.limit){a.t0+=dt;if(a.t0>s.limit){this.msgs.push({t:'late',q:this.active.q});this.d.active=null;this.P.save();return;}}
      if(s){let ok=false;const tg=this.target();
        if(s.t==='talk'||s.t==='deliver'||s.t==='goto'){const near=tg&&Math.hypot(x-tg.x,y-tg.y)<tg.r;ok=near&&(s.t==='goto'||slow);}
        else if(s.t==='chal')ok=this.P.medal(s.id)>=0&&this.P.medal(s.id)<=s.medal;
        else if(s.t==='part')ok=(this.d.bought||0)>a.bought;
        else if(s.t==='medals')ok=this.P.medalCount().reduce((p,q)=>p+q,0)>=s.n;
        else if(s.t==='speed')ok=car.speed>=s.v&&Math.hypot(x,y)>1650;
        if(ok)this.advance();}}
    /* people: stopped next to one with a job for you */
    this.near=null;
    for(const [who,p] of Object.entries(PEOPLE)){if(Math.hypot(x-p.x,y-p.y)>11)continue;const o=this.offerOf(who);
      if(o&&!(this.d.active&&this.d.active.id===o.id))this.near={who,q:o};}
  }
  advance(){const a=this.d.active,q=this.active.q;a.step++;
    if(a.step>=q.steps.length){this.d.quests[q.id]={done:true,at:Date.now()};this.d.active=null;
      const r=q.reward||{};if(r.money)this.P.earn(r.money);else this.P.save();this.msgs.push({t:'done',q,reward:r});}
    else{this.startStep();this.P.save();this.msgs.push({t:'step',q,step:q.steps[a.step]});}}
  take(){const m=this.msgs;this.msgs=[];return m;}
  /* the HUD's line: whose job, what now, the clock */
  hud(){const a=this.active;if(!a)return null;const s=a.q.steps[a.step];return {title:a.q.title,who:PEOPLE[a.q.who].short,text:s.text||'',left:s.limit?Math.max(0,s.limit-a.t0):null,target:this.target()};}
  /* who to light up: amber for a job waiting, green for where the current step is */
  beacons(){const out=[],tg=this.target();
    for(const [who,p] of Object.entries(PEOPLE)){const o=this.offerOf(who),isT=tg&&tg.name===p.short;if(o&&!(this.d.active&&this.d.active.id===o.id)||isT)out.push({x:p.x,y:p.y,kind:isT?'target':'offer',col:p.col});}
    if(tg&&!tg.chal&&tg.r&&!Object.values(PEOPLE).some(p=>p.short===tg.name))out.push({x:tg.x,y:tg.y,kind:'target'});
    return out;}
  count(){return this.list.filter(q=>this.done(q.id)).length;}
}
