(()=>{const g=__game,P=g.parts,out=[];
g.BUILDS.slice().forEach((b,i)=>{if(String(b.id).startsWith("rig:"))return;const rig=g.PRESET_PARTS[b.id];if(!rig)return;
  const parts=[];
  for(const [slot,grp,label] of P.SLOTS){const v=rig[slot];if(v===undefined)continue;let opts=[];
    const CP=P.CAR_PARTS[b.car]||{},isM=!!P.MACH[b.car];if(slot==='wheels'||slot==='paint')continue;if(isM&&CP.slots&&!['engine','trans','axle','tires'].includes(slot)&&!CP.slots.includes(slot))continue;try{opts=(CP.opts&&CP.opts[slot])||P.slotOptions(b.car,slot,rig)||[];}catch(e){opts=[];}
    const o=opts.find(o=>o[0]===v||(typeof v==='number'&&+o[0]===v));
    parts.push({slot,grp,label,val:v,name:o?o[1]:String(v),note:o?o[2]:'',price:o?o[3]:null});}
  const ri=g.rigBuild(b.car,g.presetRig(b.id)),s=g.specOf(ri),E=P.ENGINES[rig.engine]||null,D=P.DE_ENGINES[rig.engine]||null,eo=P.ENGINE_OF[b.id]||null;
  const pick=o=>o&&Object.fromEntries(Object.entries(o).filter(([k,v])=>typeof v!=='function'));
  out.push({i,id:b.id,car:b.car,name:b.name,tag:b.tag,blurb:b.blurb,specs:b.specs,mach:!!P.MACH[b.car],machName:P.MACH[b.car]&&P.MACH[b.car].name,
    desc:eo&&eo.desc,parts,engine:E&&{key:rig.engine,name:E.name,note:E.note,kg:E.kg,price:E.price},de:pick(D),
    spec:{layout:s.layout,disp:s.disp,cyl:s.cyl,kind:s.kind,rotary:s.rotary,stroke2:s.stroke2,diesel:s.diesel,redline:s.redline,limiterRpm:s.limiterRpm,idle:s.idle,
      fi:s.fi,boost:s.boost,sup:s.sup,turbo:s.turbo,antilag:s.antilag,nos:s.nos,nosKw:s.nosKw,nosT:s.nosT,limiter:s.limiter,launch:s.launch,launchRpm:s.launchRpm,
      gears:s.gears,fd:s.fd,R:s.R,mass:s.mass,drv:s.drv,cdA:s.cdA,mu:s.mu,nG:s.nG,conv:s.conv,shiftT:s.shiftT,cam:s.cam,intake:s.intake,ex:s.ex,peak:s.peak,tq:s.tq,M:s.M&&s.M.n}});
});
return JSON.stringify(out);})()
