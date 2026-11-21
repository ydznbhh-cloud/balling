// Dismantled cells become a single-use ledge beneath the opponent. No board healing.
Object.assign(tuningSchema,{
 gravityPadCooldown:['碎格承托释放间隔（秒）',.3,.1,10],
 gravityPadLife:['碎格承托有效秒数',2.5,.5,8],
 gravityPadBounce:['碎格承托反弹速度',800,100,1400]
});
for(const k of ['gravityPadCooldown','gravityPadLife','gravityPadBounce']){tuningDefaults[k]=tuningSchema[k][1];if(tuning[k]===undefined)tuning[k]=tuningDefaults[k];}
if(tuning.gravityPadCooldown===3)tuning.gravityPadCooldown=.3;
if(tuning.gravityPadBounce===300)tuning.gravityPadBounce=800;
for(const k of ['gravityRepairCap','gravityRepairRate','gravityNumericStrip'])delete tuningGroups['引力球'][k];
for(const k of ['gravityPadCooldown','gravityPadLife','gravityPadBounce'])tuningGroups['引力球'][k]=tuningSchema[k];
tuningSchema.gravityUtilization[0]='拆板材料回收利用率 %';tuningSchema.gravityFlight[0]='碎格跨场运输秒数';tuningSchema.gravityStripUnits[0]='一次承托所需材料格';
function gravityPadRadius(b){return b.role==='spring'?21:32;}
function gravityOrbitCell(b,p,i){const n=(p.visualOffset||0)+i,phase=(p.source*17+p.x*.37+p.y*.13+n*2.399963),angle=time*.8+phase;return {x:b.x+Math.cos(angle)*(40+n%4*3),y:b.y+Math.sin(angle)*19,source:p.source};}
function drawGravityInventory(b){for(const p of gravityState(b).bank){if(p.ready>time)continue;for(let i=0;i<Math.floor(p.units);i++){const cell=gravityOrbitCell(b,p,i);ctx.fillStyle=themePalettes.neon.boards[cell.source];ctx.fillRect(cell.x-1,cell.y-1,2,2);}}}
function gravityPadLocation(b){
 if(b.done||b.action||b.special.arena||b.special.bridge||b.special.stunTime>0||b.special.tide?.float||b.special.tide?.waterBridge||b.special.tide?.wheel)return null;
 const radius=gravityPadRadius(b),y=b.y+radius+20;
 if(y>(courseFloor()-22)||y<100)return null;
 // Do not conceal a ledge inside a surviving normal or assembled plate.
 for(const t of tideTargets(b))for(const x of [b.x-30,b.x,b.x+30]){const surface=tideSurface(b,t,x);if(surface!==null&&surface>=b.y+radius-2&&surface<=y+6)return null;}
 return {x:b.x,y};
}
gravityDispatch=function(b){
 const h=gravityState(b),target=soloMode?null:lanes.find(o=>o!==b);
 const occupied=lanes.reduce((n,o)=>n+(o.special.gravityPads||[]).filter(p=>!p.used).length+(o.special.gravity?.flights||[]).filter(f=>!f.done).length,0);
 if(!target||target.done||time<(h.padNextCast||0)||occupied>=5)return;
 const site=gravityPadLocation(target),ready=h.bank.filter(p=>p.ready<=time),required=Math.round(cfg.gravityStripUnits);
 if(!site||ready.reduce((n,p)=>n+p.units,0)<required)return;
 let left=required,x=0,y=0;const parts=[],launchCells=[];
 for(const p of ready){const take=Math.min(left,p.units);if(take<=0)continue;for(let i=0;i<take;i++)launchCells.push(gravityOrbitCell(b,p,i));p.visualOffset=(p.visualOffset||0)+take;p.units-=take;left-=take;x+=p.x*take/required;y+=p.y*take/required;parts.push({source:p.source,fraction:take/required});if(left<=0)break;}
 h.bank=h.bank.filter(p=>p.units>0);h.flights.push({target,remaining:required,initial:required,parts,launchCells,x,y,age:0,padSite:site});h.padNextCast=time+cfg.gravityPadCooldown;
};
tickGravityActor=function(b,side,dt){
 if(b.role!=='gravity')return;const h=gravityState(b);h.castClock+=dt;
 for(const f of h.flights){f.age+=dt;const site=gravityPadLocation(f.target);if(site)f.padSite=site;
  if(f.age<cfg.gravityFlight)continue;
  if(site){const pad={...site,units:f.initial,parts:f.parts,source:b,age:0,used:false};(f.target.special.gravityPads||(f.target.special.gravityPads=[])).push(pad);h.spent+=f.initial;f.remaining=0;assemblySound(true);if(typeof roleCount==='function')roleCount(b,'gravityPads');}
  else{for(const part of f.parts)h.bank.push({units:f.initial*part.fraction,source:part.source,level:levels[part.source],x:b.x,y:b.y,ready:time+.2});f.remaining=0;}
  f.done=true;
 }h.flights=h.flights.filter(f=>!f.done);h.jobs=[];
 if(h.castClock>=.2){h.castClock=0;gravityDispatch(b);}
};
function gravityPadParticles(p){for(let n=0;n<p.units;n++){const col=n%30,row=Math.floor(n/30),part=p.parts[Math.min(p.parts.length-1,Math.floor(n/p.units*p.parts.length))];particles.push({x:p.x-30+col*2,y:p.y+row*2,vx:(col-15)*2,vy:25+row*8,life:.5,color:themePalettes.neon.boards[part.source]});}}
// Sweep a circle against all four faces and the rounded corner regions, earliest contact first.
function gravityPadContact(x,y,dx,dy,r,p){
 const left=p.x-30,right=p.x+30,top=p.y,bottom=p.y+Math.ceil(p.units/30)*2,hits=[];
 const add=(t,nx,ny)=>{if(t>=0&&t<=1&&dx*nx+dy*ny<-.000001)hits.push({t,nx,ny});};
 const cx=Math.max(left,Math.min(right,x)),cy=Math.max(top,Math.min(bottom,y)),ox=x-cx,oy=y-cy,dist=Math.hypot(ox,oy);
 if(dist<r&&dist>.000001){if(dx*ox+dy*oy<0)return {t:0,nx:ox/dist,ny:oy/dist,push:r-dist};}
 if(dx!==0)for(const [edge,nx] of [[left-r,-1],[right+r,1]]){const t=(edge-x)/dx,py=y+dy*t;if(py>=top&&py<=bottom)add(t,nx,0);}
 if(dy!==0)for(const [edge,ny] of [[top-r,-1],[bottom+r,1]]){const t=(edge-y)/dy,px=x+dx*t;if(px>=left&&px<=right)add(t,0,ny);}
 const a=dx*dx+dy*dy;if(a>0)for(const [qx,sx] of [[left,-1],[right,1]])for(const [qy,sy] of [[top,-1],[bottom,1]]){const ux=x-qx,uy=y-qy,b=2*(ux*dx+uy*dy),c=ux*ux+uy*uy-r*r,d=b*b-4*a*c;if(d<0)continue;const t=(-b-Math.sqrt(d))/(2*a),hx=x+dx*t-qx,hy=y+dy*t-qy;if(hx*sx>=0&&hy*sy>=0)add(t,hx/r,hy/r);}
 return hits.sort((a,b)=>a.t-b.t)[0]||null;
}
function tickGravityPads(b,dt){
 const pads=b.special.gravityPads||[];
 for(const p of pads){p.age+=dt;if(!p.used&&p.age>=cfg.gravityPadLife){p.used=true;gravityPadParticles(p);}}
 b.special.gravityPads=pads.filter(p=>!p.used);
 if(b.done||b.action||b.special.arena||b.special.bridge||b.special.stunTime>0||b.special.tide?.float||b.special.tide?.waterBridge||b.special.tide?.wheel)return false;
 const radius=gravityPadRadius(b),vy=b.role==='gravity'&&!b.special.gravityPadArc?cfg.gravitySpeed:b.v;
 const step=dt*(b.role==='cube'?cfg.cubeSpeed:1)*(b.role==='spring'&&b.special.boost>0?cfg.springComboSpeed:1),nextY=b.y+vy*step+(b.role==='gravity'?0:cfg.gravity*step*step),nextX=b.x+b.vx*step;
 const contacts=b.special.gravityPads.map(p=>({p,c:gravityPadContact(b.x,b.y,nextX-b.x,nextY-b.y,radius,p)})).filter(o=>o.c).sort((a,b)=>a.c.t-b.c.t);
 for(const {p,c} of contacts){
  b.x+=(nextX-b.x)*c.t+c.nx*((c.push||0)+.05);b.y+=(nextY-b.y)*c.t+c.ny*((c.push||0)+.05);
  const incomingY=vy+(b.role==='gravity'?0:cfg.gravity*step*c.t),dot=b.vx*c.nx+incomingY*c.ny,rx=b.vx-2*dot*c.nx,ry=incomingY-2*dot*c.ny,scale=time<(b.special.gravityPadImmuneUntil||0)?1:Math.max(1,cfg.gravityPadBounce/Math.max(1,Math.hypot(rx,ry)));
  b.vx=rx*scale;b.v=ry*scale;p.used=true;gravityPadParticles(p);b.special.gravityPadImmuneUntil=time+3;
  if(b.role==='gravity')b.special.gravityPadArc={returnY:b.y};
  if(typeof roleCount==='function')roleCount(p.source,'gravityPadHits');soundEffect('hit','gravity');impact(b.x,p.y,roleOf(p.source).color,b.x<330?0:1,false,false);return true;
 }return false;
}
const tickBeforeGravityPads=tickNew;tickNew=function(b,side,dt){
 if(tickGravityPads(b,dt)){tickGravityActor(b,side,dt);return true;}
 if(b.role==='gravity'&&b.special.gravityPadArc&&b.special.stunTime<=0){const arc=b.special.gravityPadArc;b.v+=cfg.gravity*dt;b.y+=b.v*dt;tickGravityActor(b,side,dt);if(b.v>=0&&b.y>=arc.returnY){b.y=arc.returnY;b.special.gravityPadArc=null;b.v=cfg.gravitySpeed;}return true;}
 return tickBeforeGravityPads(b,side,dt);
};
drawGravityFlights=function(){
 for(const b of lanes){const h=b.special.gravity;
  for(const f of h?.flights||[]){const t=Math.min(1,f.age/cfg.gravityFlight),e=t*t*(3-2*t);ctx.save();ctx.strokeStyle='#bfaaff88';ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(f.padSite.x,f.padSite.y);ctx.stroke();for(let n=0;n<f.initial;n++){const part=f.parts[Math.min(f.parts.length-1,Math.floor(n/f.initial*f.parts.length))],cell=f.launchCells?.[n]||{x:f.x,y:f.y},x=cell.x+(f.padSite.x-30+n%30*2-cell.x)*e,y=cell.y+(f.padSite.y+Math.floor(n/30)*2-cell.y)*e-Math.sin(t*Math.PI)*45;ctx.fillStyle=themePalettes.neon.boards[cell.source??part.source];ctx.fillRect(x,y,2,2);}ctx.restore();}
  for(const p of b.special.gravityPads||[]){if(p.used)continue;ctx.save();ctx.globalAlpha=Math.min(1,(cfg.gravityPadLife-p.age)/.25);for(let n=0;n<p.units;n++){const part=p.parts[Math.min(p.parts.length-1,Math.floor(n/p.units*p.parts.length))];ctx.fillStyle=themePalettes.neon.boards[part.source];ctx.fillRect(p.x-30+n%30*2,p.y+Math.floor(n/30)*2,2,2);}ctx.strokeStyle='#d4c4ff';ctx.strokeRect(p.x-30,p.y,60,Math.ceil(p.units/30)*2);ctx.restore();}
 }
};
// Keep the dismantling visual; old healing overlays no longer have an active producer.
const gravityRoleDescription='恒速下降并悬停撕开板体；回收拆下的小格，送至对手身下组成一次性承托，使其额外反弹。';
roles.find(r=>r.id==='gravity').desc=gravityRoleDescription;
soloMechanics.gravity=['引力 · 悬停撕解','恒速下降，距板面10像素悬停；拆下竖向板片，逐渐撕开通道','碎格承托','消耗回收材料，在对手身下组成一次性小承托；真实碰到才反弹，承托随即碎散，不再修补板体。'];
