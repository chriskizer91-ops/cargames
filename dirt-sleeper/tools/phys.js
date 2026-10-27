const H=require('./harness.js');
const B=(o)=>Object.assign({},H.STOCK_BUILD,o);
const builds={
 stock:{}, catback:{exhaust:'catback',intake:1,tune:1},
 v62:{engine:'v62',exhaust:'headers',intake:1,tune:2,cam:2},
 blown74:{engine:'bb74',power:'roots',exhaust:'headers',tune:2,cam:3,trans:'race4',axle:4.56,tyre:'drag33',wheel:'weld15',susp:'lowered',shocks:'drag',interior:'gutted'},
 sleeper:{engine:'tt35',power:'bigturbo',nos:3,trans:'built',axle:4.1,interior:'gutted',tune:2},
 diesel:{engine:'d67',power:'compound',tune:2,exhaust:'stacks',trans:'built',axle:4.1},
 mud37:{susp:'lift6',tyre:'mt37',axle:4.88,wheel:'beadlock17',lockers:2,tcase:'low'},
 mud37stockgear:{susp:'lift6',tyre:'mt37'},
 paddle:{susp:'level',tyre:'paddle35',axle:4.56,engine:'v62',tune:2},
};
for(const [k,o] of Object.entries(builds)){
  const b=B(o),n=H.buildNumbers(b);const t0=Date.now();
  const q=H.quickPass(b,'strip');const q2=H.quickPass(b,'concrete');
  console.log(k.padEnd(16),'hp',n.hp.toFixed(0).padStart(5),'tq',n.tq.toFixed(0).padStart(5),'kg',n.mass,'looks',n.looks,'sleeper',n.sleeper,'| dirt 1/8',q.et.toFixed(2),'trap',(q.trap*2.237).toFixed(0),'mph 0-60',q.t60.toFixed(2),'| conc',q2.et.toFixed(2),(Date.now()-t0)+'ms');
}
