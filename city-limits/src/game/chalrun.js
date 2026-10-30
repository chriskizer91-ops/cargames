/* =====================================================================================
   CITY LIMITS — ONE RUN AT A CHALLENGE: the countdown, the gates in order, laps, the trap, the
   flying mile, flights off the table-top, drift points in the zone, the time limit, the result.
   No drawing and no page: the game drives it from the player's car, tools/par.mjs from a robot's.
   car: a Vehicle (p, speed, vf, beta, air, wheels); map point (x, y) = (p[0], -p[2]).
   ===================================================================================== */
import {DriftScore} from './drift.js';
import {medalOf} from './chaldefs.js';

export class ChalRun{
  constructor(c,{countdown=3}={}){
    this.c=c;this.phase=countdown>0?'count':'run';this.cd=countdown;this.t=0;this.gi=0;this.lap=1;this.lapT0=0;this.msgs=[];
    this.value=null;this.medal=-1;this.failed=null;this.top=0;this.trapV=null;this.mileT0=null;this.fly=null;this.bestJump=0;this.lastJump=0;
    this.drift=c.kind==='drift'?new DriftScore():null;this.inZone=true;
  }
  get next(){const g=this.c.gates;return g&&this.phase!=='done'?g[this.gi]:null;}
  /* seconds of countdown left, as start lights (0 to 3) */
  get lights(){return this.phase==='count'?Math.min(3,3-Math.ceil(this.cd)+1):0;}
  update(dt,car,ev){
    if(this.phase==='count'){this.cd-=dt;if(this.cd<=0){this.phase='run';this.msgs.push({t:'go'});}return;}
    if(this.phase!=='run')return;
    const c=this.c,x=car.p[0],y=-car.p[2];this.t+=dt;this.top=Math.max(this.top,car.speed);
    if(c.kind==='drift'){
      const inside=Math.hypot(x-c.zone.x,y-c.zone.y)<c.zone.r;
      if(inside)this.drift.update(dt,car,ev);else{this.drift.bank();this.drift.on=false;}
      if(inside!==this.inZone){this.inZone=inside;this.msgs.push({t:inside?'zoneIn':'zoneOut'});}
      if(this.t>=c.time){this.drift.bank();this.finish(this.drift.total);}
      return;}
    /* flights: from the wheels leaving the ground to all four back on it */
    const grounded=car.wheels.some(w=>w.contact);
    if(!grounded&&!this.fly)this.fly={x,y,t:this.t};
    else if(grounded&&this.fly){const d=Math.hypot(x-this.fly.x,y-this.fly.y),air=this.t-this.fly.t;this.fly=null;
      if(d>4&&air>.3){this.lastJump=d;if(d>this.bestJump){this.bestJump=d;}this.msgs.push({t:'jump',d,air,best:d>=this.bestJump});}}
    const g=this.next;
    if(g&&(x-g.x)**2+(y-g.y)**2<g.r*g.r)this.pass(g,car);
    if(this.phase==='run'&&this.t>c.limit)this.fail('time');
  }
  pass(g,car){
    const c=this.c;
    if(c.kind==='trap'){this.trapV=car.speed;this.finish(car.speed);return;}
    if(c.kind==='mile'){
      if(Math.abs(g.s-c.mile[0])<1){this.mileT0=this.t;this.msgs.push({t:'mileIn'});}
      else if(Math.abs(g.s-c.mile[1])<1){this.finish(1609.344/Math.max(.1,this.t-this.mileT0));return;}}
    this.gi++;
    if(c.kind==='lap'&&this.gi>=c.gates.length){
      const lt=this.t-this.lapT0;this.lapT0=this.t;
      if(this.lap>=c.laps){this.finish(this.t);return;}
      this.lap++;this.gi=0;this.msgs.push({t:'lap',lap:this.lap,lt});return;}
    if(this.gi>=c.gates.length){this.finish(c.kind==='jump'?(this.bestJump||null):this.t);return;}
    this.msgs.push({t:'gate',i:this.gi});
  }
  finish(v){this.phase='done';this.value=v;this.medal=medalOf(this.c,v);this.msgs.push({t:'finish',v,medal:this.medal});}
  fail(why){if(this.phase==='done')return;this.phase='done';this.value=null;this.medal=-1;this.failed=why;this.msgs.push({t:'fail',why});}
  take(){const m=this.msgs;this.msgs=[];return m;}
  /* what is left to the next gate, along the ground (m) */
  distNext(car){const g=this.next;return g?Math.hypot(car.p[0]-g.x,-car.p[2]-g.y):0;}
}
