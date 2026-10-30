/* =====================================================================================
   DAY AND NIGHT. High noon is the ranch as it always was. Night is a moon low in the east, a sky full of
   stars, fog that closes in to a few hundred metres (so the world past it isn't drawn at all, which makes
   night a little cheaper than day), your headlights, and the lights the ranch and the country already
   have: the shop's yard lights, the drag strip's poles, the canopy at Feed & Fuel, the porch at home,
   the paddock's floodlights, the speedway's light poles and the red light on the mast up the mountain. The scene shader takes eight lights; the headlights are two of them and the
   six fixtures nearest the car are the rest.
   ===================================================================================== */
const TOD={
  day:{name:'High noon',sun:V3.norm([-.52,.5,.4]),sunCol:[1.28,1.18,1.02],sky:[.44,.5,.62],gnd:[.24,.18,.13],zen:[.16,.32,.85],hor:[.78,.86,1.02],fogD:.0016,fogK:[.68,.72,.78],draw:420,night:0,expo:[.22,.75,1.25],haze:1},
  /* golden hour: the sun ten degrees up in the west, warm and long, the sky going orange low down and the haze
     catching the light (55_post's shafts are strongest now) */
  golden:{name:'Golden hour',sun:V3.norm([-.86,.19,.46]),sunCol:[1.5,.98,.58],sky:[.34,.37,.48],gnd:[.22,.15,.1],zen:[.17,.29,.62],hor:[1.08,.8,.58],fogD:.0021,fogK:[.92,.8,.72],draw:420,night:0,expo:[.2,.75,1.5],haze:1.5},
  night:{name:'Night',sun:V3.norm([.55,.32,-.35]),sunCol:[.075,.09,.13],sky:[.022,.03,.05],gnd:[.008,.007,.006],zen:[.002,.004,.012],hor:[.02,.028,.05],fogD:.0062,fogK:[.6,.65,.75],draw:300,night:1,expo:[.06,1,1.8],haze:1}
};
function applyTod(id){const T=TOD[id]||TOD.day;Object.assign(SKY,{sun:T.sun,sunCol:T.sunCol,sky:T.sky,gnd:T.gnd,zen:T.zen,hor:T.hor,fogD:T.fogD,fogK:T.fogK,draw:T.draw,night:T.night,expo:T.expo,haze:T.haze});
  if(typeof CSM!=='undefined')CSM.fresh=true;}
/* the fixtures: [x, y above the ground, z, range, colour, spot direction or null, cosine of the spot's edge] */
/* the lamps out in the world: the open world's farms, towns and the garage (51_world worldLights) */
const LP=new Float32Array(32),LC=new Float32Array(32),LD=new Float32Array(32),LN={n:0};
/* the lights for this frame: the car's headlights first, then the nearest fixtures */
function skyLights(t){
  const u=CUR.u;let n=0;
  if(SKY.night&&APP.lights&&t){
    const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],R=[M[2],M[5],M[8]],lift=liftOf(t),dir=V3.norm([F[0]-U[0]*.06,F[1]-U[1]*.06,F[2]-U[2]*.06]);
    const Mc=t.c.machine&&MACH[t.c.machine];
    for(const s of [-1,1]){const x=D.L/2-.15-t.cg[0],y=(Mc?Mc.lampY:.78)+lift-t.cg[1],z=s*(Mc?Math.min(.62,Mc.W*.3):.62),w=[t.p[0]+F[0]*x+U[0]*y+R[0]*z,t.p[1]+F[1]*x+U[1]*y+R[1]*z,t.p[2]+F[2]*x+U[2]*y+R[2]*z];
      LP.set([w[0]-RO[0],w[1]-RO[1],w[2]-RO[2],70],n*4);LC.set([6.5,6.1,5.3,1],n*4);LD.set([dir[0],dir[1],dir[2],Math.cos(.5)],n*4);n++;}}
  if(SKY.night){
    const p=t?t.p:CAM.last.eye,F=worldLights(p,200).map(f=>({f,d:Math.hypot(f.p[0]-p[0],f.p[2]-p[2])-f.r})).filter(q=>q.d<160).sort((a,b)=>a.d-b.d);
    for(const {f} of F){if(n>=8)break;LP.set([f.p[0]-RO[0],f.p[1]-RO[1],f.p[2]-RO[2],f.r],n*4);LC.set([f.c[0],f.c[1],f.c[2],0],n*4);LD.set(f.d?[f.d[0],f.d[1],f.d[2],f.cs]:[0,-1,0,-2],n*4);n++;}}
  gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform4fv(u.uLD,LD);gl.uniform1i(u.uNL,n);LN.n=n;gl.uniform1f(u.uNight,SKY.night||0);
}
