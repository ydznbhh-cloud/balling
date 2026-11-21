// Frost grows connected fracture paths; only narrow failed seams are removed.
function frostState(b){return b.special.frost||(b.special.frost={hits:0,ultimate:0,cooldown:0})}
function frostColumns(state){return state.frost||(state.frost=new Float32Array(138))}
function seedFrostCrack(state,x,bottom=false){
 const cracks=state.frostCracks||(state.frostCracks=[]);x=Math.max(3,Math.min(272,x));
 const nearby=cracks.find(c=>c.bottom===bottom&&Math.abs(c.path[0].x-x)<12);
 if(nearby){nearby.length=Math.min(30,nearby.length+3);return;}
 if(cracks.length>=24)return;
 const path=Array.from({length:16},(_,n)=>({x:Math.max(2,Math.min(274,x+Math.sin(n*.9+x*.1)*3+n*(x<138?.2:-.2))),y:bottom?30-n*2:n*2}));
 cracks.push({path,bottom,length:0,age:0,broken:new Set()});
}
function frostHit(b,target,contact){
 const h=frostState(b),origin=b.x<330?36:348,center=contact.x-origin;
 // Two fracture fronts isolate a slab when their frozen seams cross the thickness.
 seedFrostCrack(target.state,center-cfg.frostRadius*.65,contact.ny>0);
 seedFrostCrack(target.state,center+cfg.frostRadius*.65,contact.ny>0);
 b.hits++;h.hits++;
 if(h.hits>=cfg.frostUltHits){h.hits=0;h.ultimate=cfg.frostUltDuration;b.damageTexts.push({text:'骤冷！',age:0});specialAudioCue('frostUltimate',[[760,280,.17,.35,0],[1100,520,.08,.25,.04]]);}
 impact(contact.x,contact.y,'#b7f5ff',b.x<330?0:1,false);specialAudioCue('frostHit',[[900,360,.13,.13,0],[1400,650,.06,.1,.025]]);
}
function tickFrostCracks(b,target,dt){
 const state=target.state,cracks=state.frostCracks;if(!cracks)return;
 const boost=frostState(b).ultimate>0?cfg.frostUltRadius:1,cold=frostColumns(state);let changed=false;
 for(const crack of cracks){
  crack.age+=dt*boost;crack.length=Math.min(30,crack.length+cfg.frostCrackSpeed*dt*boost);
  for(let n=0;n<15;n++){
   if(n*2>crack.length)break;
   const p=crack.path[n],col=Math.max(0,Math.min(137,Math.floor(p.x/2))),row=crack.bottom?14-n:n;
   cold[col]=Math.min(1,cold[col]+cfg.frostRate*dt*boost);
   // The fracture first fills with ice, then expansion breaks its connection.
   if(crack.age-n*2/cfg.frostCrackSpeed<cfg.frostSplitDelay||crack.broken.has(n))continue;
   crack.broken.add(n);
   const previous=n?Math.floor(crack.path[n-1].x/2):col;
   for(let k=Math.min(previous,col);k<=Math.max(previous,col);k++){const cell=row*138+k;if(state.material[cell]){state.material[cell]=0;changed=true;if(frostState(b).ultimate>0&&typeof roleCount==='function')roleCount(b,'coldLinks');}}
  }
 }
 if(!changed)return;
 const before=target.scrap?target.scrap.hp:b.hp[target.j],start=b.special.debris.length;
 if(target.scrap){withScrapState(b,target.scrap,()=>detachLeadIslands(b,0));for(let k=start;k<b.special.debris.length;k++)b.special.debris[k].y+=target.y-258;}
 else detachLeadIslands(b,target.j);
 for(let k=start;k<b.special.debris.length;k++){const d=b.special.debris[k];d.vy=-25;d.spin=(Math.random()-.5)*1.4;d.color='#caefff';}
 b.special.materialRevision=(b.special.materialRevision||0)+1;
 const fraction=state.material.reduce((a,v)=>a+v,0)/2070,original=target.scrap?target.scrap.original:levels[target.j],hp=original+Math.log10(Math.max(1e-9,fraction));
 if(target.scrap)target.scrap.hp=hp;else b.hp[target.j]=hp;
 recordDamage(b,before,fraction?hp:null);
 if(b.special.debris.length>start){specialAudioCue('frostSplit',[[560,180,.18,.25,0]]);impact(b.x,target.y,'#d6ffff',b.x<330?0:1,true);}
}
function tickFrost(b,side,dt){
 const h=frostState(b);h.cooldown=Math.max(0,h.cooldown-dt);h.ultimate=Math.max(0,h.ultimate-dt);tickLeadDebris(b,dt);
 let targets=tideTargets(b);
 for(const target of targets)tickFrostCracks(b,target,dt);
 if(b.special.stunTime>0){b.special.stunTime=Math.max(0,b.special.stunTime-dt);return true;}
 const origin=side?348:36,steps=Math.max(1,Math.ceil(dt/.003));
 for(let n=0;n<steps;n++){
  const step=dt/steps;b.v+=cfg.gravity*step;b.x+=b.vx*step;b.y+=b.v*step;
  if(b.x<origin+32){b.x=origin+32;b.vx=Math.abs(b.vx);}if(b.x>origin+244){b.x=origin+244;b.vx=-Math.abs(b.vx);}
  const c=tideMaterialContact(b,targets,origin);
  if(c){b.x+=c.nx*Math.max(0,32.1-c.dist);b.y+=c.ny*Math.max(0,32.1-c.dist);
   if(h.cooldown<=0){frostHit(b,c.target,c);h.cooldown=.055;}
   const vx=b.vx-2*c.dot*c.nx,vy=b.v-2*c.dot*c.ny,speed=cfg.bounce+Math.random()*cfg.bounceRandom,scale=speed/Math.max(1,Math.hypot(vx,vy));b.vx=Math.max(-cfg.vxMax,Math.min(cfg.vxMax,vx*scale));b.v=vy*scale;
  }
  while(b.index<levels.length&&b.y-32>258+b.index*113.2+30)b.index++;
  if(b.y+32>=courseFloor()&&b.v>0){b.y=(courseFloor()-32);b.index=levels.length;b.done=true;b.finish=time;finishRace(side);break;}
 }
 return true;
}
function drawFrostBoard(b,state,x,y){
 if(b.role!=='frost'||!state.frostCracks)return;ctx.save();
 for(const crack of state.frostCracks){
  const progress=Math.min(1,crack.broken.size/15),warning=crack.length>=22&&crack.broken.size>=8&&crack.broken.size<15,pulse=warning?.6+.4*Math.sin(time*15):0;ctx.lineJoin='round';ctx.beginPath();const start=crack.path[0];ctx.moveTo(x+start.x,y+start.y);
  for(let n=1;n<crack.path.length;n++){const distance=Math.min(1,Math.max(0,(crack.length-(n-1)*2)/2));if(!distance)break;const a=crack.path[n-1],z=crack.path[n];ctx.lineTo(x+a.x+(z.x-a.x)*distance,y+a.y+(z.y-a.y)*distance);}
  ctx.strokeStyle=warning?'rgba(171,244,255,'+(.4+pulse*.35)+')':'#d5fbff77';ctx.lineWidth=5+progress*3+pulse*2;ctx.stroke();ctx.strokeStyle='#17374a';ctx.lineWidth=.8+progress*2;ctx.stroke();ctx.strokeStyle='#f1ffff';ctx.lineWidth=warning?1.6:.9;ctx.stroke();
  for(let n=0;n<crack.path.length&&n*2<crack.length;n++){const p=crack.path[n];if(n%3!==0)continue;ctx.strokeStyle='#c7f8ffbb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+p.x-4,y+p.y-2);ctx.lineTo(x+p.x,y+p.y);ctx.lineTo(x+p.x+3,y+p.y+4);ctx.stroke();}
 }
 ctx.restore();
}
function drawFrostBall(b){
 for(const t of tideTargets(b))if(t.scrap)drawFrostBoard(b,t.state,b.x<330?36:348,t.y);
 if(frostState(b).ultimate<=0)return;ctx.save();ctx.strokeStyle='#dbffff';ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(b.x,b.y,39,0,Math.PI*2);ctx.stroke();ctx.restore();
}
