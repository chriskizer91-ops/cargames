// The mud preset, judged in the real ranch: through the mud bog, and up the hill climb.
const A=require('./auto.js'),H=require('./harness.js');
const look={paint:'orange',face:'backcountry',tails:'classic',trim:'black',clad:'satin',accent:'none',flares:2,sides:'sliders',spoiler:0,roof:'none',front:'recovery',snorkel:1,lights:1,tcase:'low',lockers:2,interior:'gutted',shocks:'bypass'};
const combos=[];
for(const [tyre,susp] of [['mt37','lift6'],['sw40','lift6'],['sw44','lift9'],['paddle35','lift4'],['mt35','lift4']])
 for(const engine of ['bb74','d67','v62','tt35'])
  for(const axle of [4.88,5.38]){
   const power=engine==='d67'?'compound':engine==='tt35'?'bigturbo':'none';
   combos.push(Object.assign({},look,{tyre,susp,engine,axle,power,tune:2,intake:2,exhaust:engine==='d67'?'stacks':'headers',trans:'built',wheel:'beadlock17'}));
  }
const res=[];
for(const o of combos){const b=A.B(o);const t0=Date.now();const bog=A.runBog(b),climb=A.runPath(b,'climb');
 const sc=(bog.time||40)+0.3*(climb.time||200);res.push([sc,o.tyre,o.susp,o.engine,o.axle,bog.time?bog.time.toFixed(2):bog.dnf,climb.time?climb.time.toFixed(1):climb.dnf]);
 console.log(res[res.length-1].join(' '),(Date.now()-t0)+'ms');}
res.sort((a,b)=>a[0]-b[0]);console.log('BEST');for(const r of res.slice(0,6))console.log(r.join(' '));
