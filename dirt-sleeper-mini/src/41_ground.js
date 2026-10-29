/* =====================================================================================
   GROUND CONTACT for any world that can say how high the ground is at (x, z), what it is made of and
   which way it faces: Dirt Sleeper Mini 4's RanchWorld queries, without the garbage.
   groundAt(x,z,out) fills out.y, out.n (a unit normal) and out.surf. colliders.near(x,z) lists the
   posts, trees and walls near a point: circles {t:'c',x,z,r,top} and boxes {x0,x1,z0,z1,top}. bound is
   the hard wall at the edge of the world.
   ===================================================================================== */
const FOOT=[-.75,-.5,-.25,.25,.5,.75];
class GroundWorld{
  constructor(groundAt,colliders,bound){
    this.groundAt=groundAt;this.colliders=colliders||null;this.bound=bound||1e9;
    /* how much grip the ground is giving, surface by surface ({dirt: 1.2, ...}); null is as tuned */
    this.grip=null;
    this._g={y:0,n:F3(),surf:''};this._h=mkHit();this._o=F3();this._f=F3();
  }
  /* the ground where a ray first meets it: a few steps along the ray, each onto the plane under it */
  raycast(o,d,maxT,hit){
    const g=this._g;let t=0;
    for(let k=0;k<5;k++){
      const x=o[0]+d[0]*t,z=o[2]+d[2]*t;this.groundAt(x,z,g);
      const den=d[0]*g.n[0]+d[1]*g.n[1]+d[2]*g.n[2];if(den>-1e-4)return false;
      const nt=((x-o[0])*g.n[0]+(g.y-o[1])*g.n[1]+(z-o[2])*g.n[2])/den;
      if(Math.abs(nt-t)<1e-4){t=nt;break;}t=nt;
    }
    if(t<0||t>maxT)return false;
    hit.t=t;hit.p[0]=o[0]+d[0]*t;hit.p[1]=o[1]+d[1]*t;hit.p[2]=o[2]+d[2]*t;hit.n.set(g.n);hit.surf=g.surf;hit.i=0;hit.off=0;return true;
  }
  /* where a tyre (a circle of radius R rolling along fwd) first touches the ground: rays down at seven points
     across its footprint, each lifted by the circle's curve there. A ledge ahead is found before the hub
     reaches it, and the contact normal leans back off its face */
  contact(o,down,fwd,R,maxT,best){
    let got=this.raycast(o,down,maxT,best);
    const fd=fwd[0]*down[0]+fwd[1]*down[1]+fwd[2]*down[2],f=this._f;
    f[0]=fwd[0]-down[0]*fd;f[1]=fwd[1]-down[1]*fd;f[2]=fwd[2]-down[2]*fd;
    const fl=Math.hypot(f[0],f[1],f[2])||1;f[0]=f[0]/fl;f[1]=f[1]/fl;f[2]=f[2]/fl;
    const h=this._h,po=this._o;
    for(const k of FOOT){
      const dx=k*R;po[0]=o[0]+f[0]*dx;po[1]=o[1]+f[1]*dx;po[2]=o[2]+f[2]*dx;
      if(!this.raycast(po,down,maxT,h))continue;
      const eff=h.t+R-Math.sqrt(R*R-dx*dx);
      if(!got||eff<best.t-2e-3){
        const c0=o[0]+down[0]*(eff-R),c1=o[1]+down[1]*(eff-R),c2=o[2]+down[2]*(eff-R),n0=c0-h.p[0],n1=c1-h.p[1],n2=c2-h.p[2],nl=Math.hypot(n0,n1,n2)||1;
        best.t=eff;best.p.set(h.p);best.n[0]=n0/nl;best.n[1]=n1/nl;best.n[2]=n2/nl;best.surf=h.surf;best.i=0;best.off=dx;got=true;
      }
    }
    return got&&best.t<=maxT;
  }
  ground(x,z,out){this.groundAt(x,z,out);return out;}
  /* the edge of the world, trees, posts, walls and bales: how far P is inside one and which way is out */
  wall(P,out){
    const b=this.bound;
    if(Math.abs(P[0])>b||Math.abs(P[2])>b){const ax=Math.abs(P[0])-b,az=Math.abs(P[2])-b;
      out.pen=ax>az?ax:az;out.n[0]=ax>az?-Math.sign(P[0]):0;out.n[1]=0;out.n[2]=ax>az?0:-Math.sign(P[2]);return true;}
    if(!this.colliders)return false;
    let found=false;
    for(const c of this.colliders.near(P[0],P[2])){
      if(P[1]>c.top+.2)continue;
      if(c.t==='c'){const dx=P[0]-c.x,dz=P[2]-c.z,d=Math.hypot(dx,dz);
        if(d<c.r){const pen=c.r-d;if(!found||pen>out.pen){found=true;out.pen=pen;if(d>1e-4){out.n[0]=dx/d;out.n[1]=0;out.n[2]=dz/d;}else{out.n[0]=1;out.n[1]=0;out.n[2]=0;}}}}
      else if(P[0]>c.x0&&P[0]<c.x1&&P[2]>c.z0&&P[2]<c.z1){
        /* out through the nearest face */
        let pen=P[0]-c.x0,nx=-1,nz=0;
        if(c.x1-P[0]<pen){pen=c.x1-P[0];nx=1;nz=0;}
        if(P[2]-c.z0<pen){pen=P[2]-c.z0;nx=0;nz=-1;}
        if(c.z1-P[2]<pen){pen=c.z1-P[2];nx=0;nz=1;}
        if(!found||pen>out.pen){found=true;out.pen=pen;out.n[0]=nx;out.n[1]=0;out.n[2]=nz;}}
    }
    return found;
  }
}
