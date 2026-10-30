/* =====================================================================================
   HD CARS — draws the Dirt Sleeper cars (hd/ meshes, kept on the CPU by the build) in Shiftlight 3's
   renderer. Plugs into the renderer's prepare / opaque / shadow hooks like Shiftlight's CarRenderer.
   A car to draw is a plain object the game fills each frame:
     {key, T (the build's meshes: truck(i)), build, M (model matrix: physics frame to model frame),
      wheels:[{M}], spares:[{M, rear}], lamp, brake, rev, ind:[l,r], dirt, glow, self}
   Meshes are uploaded once per build and kept; letting go of a build frees them.
   ===================================================================================== */
import {M4} from './gl.js';
import {HDCAR_VS,HDCAR_FS,HDCAR_DEPTH_VS,HDCAR_DEPTH_FS} from './glsl/hdcar.js';

const STRIDE=44;
const LAYOUT=[{loc:0,size:3,type:'f32',offset:0},{loc:1,size:3,type:'f32',offset:12},{loc:2,size:4,type:'f32',offset:24},{loc:3,size:1,type:'f32',offset:40}];
/* sRGB hex -> linear */
const lin=h=>{const n=parseInt(h.slice(1),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255].map(c=>Math.pow(c,2.2));};

export class HDCarRenderer{
  constructor(R){
    this.R=R;const G=R.G;this.G=G;
    this.P={car:G.program('hdcar',HDCAR_VS,HDCAR_FS),depth:G.program('hdcarDepth',HDCAR_DEPTH_VS,HDCAR_DEPTH_FS)};
    this.gpu=new Map();this.items=[];this.prev=new Map();this.tris=0;
    R.extra.push(this);
  }
  /* one CPU mesh ({pos,nrm,col,mat}) to a vertex array */
  upload(m){
    if(!m||!m.pos||!m.n)return null;if(this.gpu.has(m))return this.gpu.get(m);
    const n=m.n,f=new Float32Array(n*11);
    for(let i=0;i<n;i++){const o=i*11;
      f[o]=m.pos[i*3];f[o+1]=m.pos[i*3+1];f[o+2]=m.pos[i*3+2];f[o+3]=m.nrm[i*3];f[o+4]=m.nrm[i*3+1];f[o+5]=m.nrm[i*3+2];
      f[o+6]=m.col[i*4];f[o+7]=m.col[i*4+1];f[o+8]=m.col[i*4+2];f[o+9]=m.col[i*4+3];f[o+10]=m.mat?m.mat[i]:0;}
    const g=this.G.mesh(LAYOUT,STRIDE,f,null);g.tris=n/3;this.gpu.set(m,g);return g;
  }
  free(m){const g=this.gpu.get(m);if(!g)return;const gl=this.R.gl;gl.deleteVertexArray(g.vao);gl.deleteBuffer(g.vb);this.gpu.delete(m);}
  /* every mesh a build has */
  meshesOf(T){return [T.body,T.hood,T.hide,T.wheel,T.wheelR,T.engineOut&&T.bay?T.bay.engine:null].filter(Boolean);}
  release(T){for(const m of this.meshesOf(T))this.free(m);}
  prepare(R,S){
    this.items=(S.hdcars||[]).filter(c=>c&&c.T);
    for(const c of this.items){
      const pv=this.prev.get(c.key);c.MP=pv&&!S.cut?pv.M:c.M;c.wheels.forEach((w,i)=>{w.MP=pv&&pv.w[i]&&!S.cut?pv.w[i]:w.M;});
      if(!c.U){const b=c.build;c.U={uPaint:lin(c.paint||b.paint),uPaint2:lin(b.paint2),uRim:lin(b.rim),uCal:lin(b.cal),uClad:lin(b.clad),uLiv:b.liv||0};}
    }
  }
  /* after the frame: remember this frame's matrices for the next one's motion vectors */
  commit(){this.prev.clear();for(const c of this.items)this.prev.set(c.key,{M:c.M,w:c.wheels.map(w=>w.M)});}
  draws(c){
    const T=c.T,out=[[T.body,c.M,c.MP,0],[T.hood,c.M,c.MP,0],[T.hide,c.M,c.MP,0]];
    if(T.engineOut&&T.bay&&T.bay.engine)out.push([T.bay.engine,c.M,c.MP,0]);
    for(const s of c.spares||[])out.push([s.rear?T.wheelR:T.wheel,s.M,s.M,0]);
    c.wheels.forEach(w=>out.push([w.front?T.wheel:T.wheelR,w.M,w.MP,w.R||0]));
    return out;
  }
  opaque(R,U,texs){
    if(!this.items.length)return;
    const G=R.G,gl=R.gl,P=G.use(this.P.car);G.set(P,U);G.tex(P,texs);
    gl.disable(gl.CULL_FACE);let tris=0;
    for(const c of this.items){
      G.set(P,c.U);
      G.set(P,{uLivP:c.livP||[0,4,1,1.4],uLamp:c.lamp||0,uBrake:c.brake||0,uRev:c.rev||0,uInd:c.ind||[0,0],uDirt:c.dirt||0,uEmK:c.emK||3,
        uGlow:c.glow||[0,0,0],uMetal:c.metal??.55,uProbeLod:U.uProbeLod});
      for(const [m,M,MP,mo] of this.draws(c)){const g=this.upload(m);if(!g)continue;G.uni(P,'uM',M);G.uni(P,'uMPrev',MP);G.uni(P,'uMudOff',mo);G.draw(g);tris+=g.tris;}
    }
    this.tris=tris;
  }
  /* the moon's cascades draw the cars inside their range; the headlight's shadow skips your own car */
  shadow(R,P,VP,kind){
    if(!this.items.length)return;
    const G=R.G;let Pd=null;
    for(const c of this.items){if(kind==='hl'&&c.self)continue;
      if(!Pd){Pd=G.use(this.P.depth);G.uni(Pd,'uVP',VP);}
      for(const [m,M] of this.draws(c)){const g=this.upload(m);if(!g)continue;G.uni(Pd,'uM',M);G.draw(g);}}
    if(Pd)G.use(P);
  }
}

/* ---------- matrices for one car from its physics state ---------- */
const T4=(x,y,z)=>{const m=M4.ident();m[12]=x;m[13]=y;m[14]=z;return m;};
const RY=a=>{const m=M4.ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const RZ=a=>{const m=M4.ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
const SC=(x,y,z)=>{const m=M4.ident();m[0]=x;m[5]=y;m[10]=z;return m;};
/* the model matrix: physics frame (centre of gravity) to the model's frame (ground under the middle);
   then each wheel at its own hub, steered and turning (Dirt Sleeper HD's drawWorldCar) */
export function carDraw(t,T,o={}){
  const R=t.M,m=new Float32Array(16);
  m[0]=R[0];m[1]=R[3];m[2]=R[6];m[4]=R[1];m[5]=R[4];m[6]=R[7];m[8]=R[2];m[9]=R[5];m[10]=R[8];m[12]=t.p[0]-(o.origin?o.origin[0]:0);m[13]=t.p[1];m[14]=t.p[2]-(o.origin?o.origin[2]:0);m[15]=1;
  const M0=M4.mul(m,T4(-t.cg[0],-t.cg[1],0));let Mb=M0;const D=T.D,b=t.build;
  const fx=D.X(D.uFa),Rr=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(T4(fx,Rr,0),M4.mul(RZ(D.pitch),T4(-fx,-Rr,0))));
  const wheels=t.wheels.map(w=>{const s=w.hp[2]<0?-1:1,st=w.front?t.steer:0;
    return {front:w.front,R:w.R,M:M4.mul(M0,M4.mul(T4(w.hp[0]+t.cg[0],w.hp[1]-w.len+t.cg[1],w.hp[2]),M4.mul(RY(-st),M4.mul(SC(1,1,s),RZ(-w.ang)))))};});
  const spares=(D.spares||[]).map(sp=>({rear:sp.rear,M:M4.mul(Mb,M4.mul(T4(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?RY(-Math.PI/2):SC(1,1,sp.p[2]<0?-1:1)))}));
  return {M:Mb,wheels,spares,livP:[D.X(0),D.X(D.L),D.belt(2.5),D.Hr]};
}
