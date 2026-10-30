/* =====================================================================================
   THE PAUSE MENU — Shiftlight's panel look (index.html #menu). Rows of chips: go to a place, the
   driving level, the camera, graphics (Shiftlight 3's two lightest tiers), units, sound, touch.
   City Limits adds the money, the job you're on, and the challenges with a Go for each.
   ===================================================================================== */
const CAMS=[['chase','Chase'],['far','Far'],['hood','Hood'],['bumper','Bumper'],['cockpit','Cockpit']];
export class Menu{
  constructor(root,o){this.root=root;this.o=o;this.isOpen=false;
    root.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;this.act(b.dataset.a,b.dataset.v);});}
  open(car){this.isOpen=true;this.car=car;this.root.hidden=false;this.render();}
  close(){this.isOpen=false;this.root.hidden=true;}
  act(a,v){const o=this.o,s=o.settings;
    if(a==='resume')o.resume();
    else if(a==='garage')o.garage();
    else if(a==='chal')o.startChal(v);
    else if(a==='restart')o.restartChal();
    else if(a==='quit')o.quitChal();
    else if(a==='drop'){o.dropJob();this.render();}
    else if(a==='title')o.title();
    else if(a==='reset')o.reset();
    else if(a==='go')o.goTo(o.places.find(p=>p.id===v));
    else if(a==='level'){o.level(v);this.render();}
    else if(a==='quality')o.quality(v);
    else if(a==='cam'){o.camera(v);this.render();}
    else if(a==='units'){s.units=v;o.save();this.render();}
    else if(a==='vol'){o.volume(+v);this.render();}
    else if(a==='hear'){s.hear=v;o.hear();this.render();}
    else if(a==='body'){s.body=v;o.hear();this.render();}
    else if(a==='touch'){s.touch=v;o.save();this.render();}
    else if(a==='steer'){s.steer=v;o.save();this.render();}
    else if(a==='perf'){s.perf=!s.perf;o.save();this.render();}
  }
  render(){
    const o=this.o,s=o.settings,chip=(a,v,l,on)=>`<button class="chip${on?' on':''}" data-a="${a}" data-v="${v}">${l}</button>`;
    const row=(lab,chips,desc)=>`<div class="row"><span class="lab">${lab}</span><div class="chips">${chips}</div>${desc?`<span class="desc">${desc}</span>`:''}</div>`;
    const lv=o.LEVELS.find(l=>l[0]===s.level);
    const P=o.profile(),run=o.run(),job=o.job(),M=o.MEDALS,mph=s.units!=='kmh';
    const chals=o.challenges.map(c=>{const m=P.medal(c.id),b=P.best(c.id);
      return `<div class="ch"><b>${c.name}</b><em style="color:${m>=0?M[m][2]:'var(--dim)'}">${m>=0?M[m][1]:'No medal'}</em>${chip('chal',c.id,'Go',false)}<small>${c.where} · ${o.KINDS[c.kind]}${b!=null?' · best '+o.fmtVal(c,b,mph):''}</small></div>`;}).join('');
    const jobRow=job?`<div class="ch"><b>${job.title}</b><em style="color:#5dff7a">${job.who}</em>${chip('drop','1','Drop',false)}<small>${job.text}</small></div>`
      :`<div class="ch"><small>No job right now. A coloured light in town is someone with work for you: stop next to it.</small></div>`;
    this.root.innerHTML=`<div class="panel"><div class="ttl">PAUSED<span class="money">${P.free?'Score ':''}$${Math.round(P.money).toLocaleString('en-US')}</span></div><div class="rows">
      <button class="row act" data-a="resume">Resume</button>
      ${run?`<button class="row act" data-a="restart">Restart ${run.c.name}</button><button class="row act" data-a="quit">Quit the challenge</button>`:''}
      <button class="row act" data-a="garage">Garage · parts, paint and cars</button>
      <button class="row act" data-a="reset">Reset the car</button>
      <div class="head">The job</div>${jobRow}
      <div class="head">Challenges</div>${chals}
      <div class="head">Go to</div>${row('Places',o.places.map(p=>chip('go',p.id,p.name,false)).join(''))}
      <div class="head">Driving</div>${row('Level',o.LEVELS.map(([id,n])=>chip('level',id,n,s.level===id)).join(''),lv?lv[2]:'')}
      ${row('Camera',CAMS.map(([id,n])=>chip('cam',id,n,s.cam===id)).join(''))}
      ${row('Units',chip('units','mph','MPH',s.units==='mph')+chip('units','kmh','KM/H',s.units==='kmh'))}
      <div class="head">Graphics</div>${row('Quality',chip('quality','mobile','Mobile',s.quality==='mobile')+chip('quality','low','Low',s.quality==='low'),
        'Shiftlight 3\'s two lightest levels. Mobile is made for phones; Low adds motion blur, a sharper reflection probe and more haze steps. Changing it reloads the page.')}
      ${row('Readout',chip('perf','1',s.perf?'On':'Off',s.perf),'Frame rate and render size (P on a keyboard).')}
      <div class="head">Sound</div>${row('Volume',[0,.25,.5,.75,1].map(v=>chip('vol',v,Math.round(v*100)+'%',Math.abs(s.volume-v)<.01)).join(''))}
      ${row('Heard from',chip('hear','bay','Like the bay',s.hear==='bay')+chip('hear','camera','From the camera',s.hear==='camera'))}
      ${row('Body',chip('body','fuller','Fuller',s.body==='fuller')+chip('body','phone','Phone speaker',s.body==='phone')+chip('body','lab','As the lab',s.body==='lab'))}
      <div class="head">Touch</div>${row('Controls',chip('touch','auto','Auto',s.touch==='auto')+chip('touch','on','Always',s.touch==='on')+chip('touch','off','Off',s.touch==='off'))}
      ${row('Steering',chip('steer','slide','Slide',s.steer==='slide')+chip('steer','buttons','Buttons',s.steer==='buttons')+chip('steer','tilt','Tilt',s.steer==='tilt'))}
      <button class="row act" data-a="title">Back to the title</button>
      </div><div class="foot">Esc to go back · W/S gas and brake · A/D steer · Space handbrake · Shift nitrous · C camera · H high beam · R reset</div></div>`;
  }
}
