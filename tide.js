// Finite-volume water on the existing board geometry. Rendering and control share this state.
function tideState(b){return b.special.tide||(b.special.tide={pools:[],drops:[],flights:[],surges:[],surgeCooldown:0,pressure:0,hits:0,immunity:0,float:null,notice:0,label:'',generated:0,drained:0})}
function tideTargets(b){let list=[];for(let j=0;j<levels.length;j++){let state=b.special.boards[j],live;if(b.role==='lead'||b.role==='parasite'||b.role==='tide'||b.role==='gravity'||b.role==='frost')live=state.material.some(Boolean);else if(b.role==='magnet')live=state.bend.present.some(Boolean);else if(b.role==='eccentric')live=!state.eccentricBroken;else if(b.role==='phase')live=!state.phaseBroken;else live=j>=b.index&&!b.special.cleared.includes(j);if(live)list.push({state,j,y:258+j*113.2})}for(const scrap of b.special.scrapBoards){ensureScrapState(b,scrap);list.push({state:scrap.state,scrap,j:0,y:scrap.y})}return list}
function tideSurface(b,t,x){let origin=b.x<330?36:348,local=x-origin;if(local<0||local>=276)return null;
if(b.role==='magnet'){let k=Math.min(23,Math.floor(local/11.5)),m=t.state.bend;if(!m.present[k])return null;let f=local/11.5-k;return t.y+m.nodes[k].y*(1-f)+m.nodes[k+1].y*f}
if(b.role==='lead'||b.role==='parasite'||b.role==='tide'||b.role==='gravity'||b.role==='frost'){let col=Math.min(137,Math.floor(local/2));for(let row=0;row<15;row++)if(t.state.material[row*138+col])return t.y+row*2+(b.role==='tide'?(t.state.wheelSag?.[col]||0):0);return null}
return t.y+(b.role==='gyro'?t.state.resonance.position:0)}
function tideAvailable(b){let h=tideState(b);return h.pools.reduce((v,p)=>v+p.cells.reduce((a,n)=>a+n,0),0)+h.drops.reduce((v,d)=>v+d.volume,0)}
function tideDrop(b,x,y,volume,vx=0,vy=20){if(volume<=1e-7){if(volume>0)tideState(b).drained+=volume;return}let h=tideState(b),d=h.drops.find(d=>Math.abs(d.x-x)<6&&Math.abs(d.y-y)<4);if(d){let total=d.volume+volume;d.vx=(d.vx*d.volume+vx*volume)/total;d.vy=(d.vy*d.volume+vy*volume)/total;d.volume=total;return}if(h.drops.length>=120){d=h.drops.reduce((a,n)=>Math.abs(n.x-x)+Math.abs(n.y-y)<Math.abs(a.x-x)+Math.abs(a.y-y)?n:a);let total=d.volume+volume;d.x=(d.x*d.volume+x*volume)/total;d.y=(d.y*d.volume+y*volume)/total;d.volume=total;return}h.drops.push({x,y,volume,vx,vy})}
function tideDeposit(b,t,x,volume){if(!t){tideDrop(b,x,Math.max(80,b.y+34),volume);return}let h=tideState(b),p=h.pools.find(p=>p.state===t.state);if(!p){p={state:t.state,y:t.y,cells:Array(24).fill(0)};h.pools.push(p)}let origin=b.x<330?36:348,k=Math.max(0,Math.min(23,Math.floor((x-origin)/11.5)));p.cells[k]+=volume;return p}
function takeTideWater(b,amount){if(tideAvailable(b)+1e-7<amount)return null;let h=tideState(b),samples=[],remaining=amount,origin=b.x<330?36:348;
for(const p of h.pools)for(let k=0;k<24&&remaining>1e-7;k++){let take=Math.min(p.cells[k],remaining);if(take<=0)continue;p.cells[k]-=take;remaining-=take;samples.push({x:origin+(k+.5)*11.5,y:p.y-4,volume:take})}
for(const d of h.drops){let take=Math.min(d.volume,remaining);if(take<=0)continue;d.volume-=take;remaining-=take;samples.push({x:d.x,y:d.y,volume:take})}pruneTideDrops(h);return samples}
function tideLanding(target){let candidates=tideTargets(target).map(t=>({t,y:tideSurface(target,t,target.x)})).filter(p=>p.y!==null&&p.y>=target.y+20).sort((a,b)=>a.y-b.y);return candidates[0]?.t||null}
function tideCanFloat(b){if(b.role==='gravity')return false;let h=b.special.tide;return !b.done&&!b.action&&!b.special.arena&&!b.special.bridge&&b.special.stunTime<=0&&(!h||!h.float&&!h.waterBridge&&h.immunity<=0&&h.surgeCooldown<=Math.max(0,cfg.tideSurgeCooldown-.35))}
function tideCast(b,target,kind,cost){let samples=takeTideWater(b,cost);if(!samples)return false;let h=tideState(b);h.flights.push({kind,target,volume:cost,samples,age:0});h.notice=.7;h.label=kind==='float'?'浮托':'引潮';tideSound(kind);return true}
function tideHit(b,scrap=null,normalIndex=b.index,contact=null){let h=tideState(b),amount=Math.max(0,Math.min(cfg.tideWaterGain,cfg.tideWaterCap-tideAvailable(b)-h.flights.filter(f=>f.kind==='recycle').reduce((v,f)=>v+f.volume,0))),target=scrap?tideTargets(b).find(t=>t.scrap===scrap):tideTargets(b).find(t=>!t.scrap&&t.j===normalIndex);let pool=target?tideState(b).pools.find(p=>p.state===target.state):null,hitX=contact?.x??b.x,origin=b.x<330?36:348,hitColumn=Math.max(0,Math.min(23,Math.floor((hitX-origin)/11.5))),wet=pool?pool.cells.reduce((v,n,k)=>v+(Math.abs(k-hitColumn)<=2?n:0),0):0;if(contact&&contact.ny>.15)tideDrop(b,contact.x,contact.y+3,amount,b.vx*.2,20);else tideDeposit(b,target,hitX,amount);if(target&&(!contact||contact.ny<=.15)){if(amount<8&&wet<8&&!h.flights.some(f=>f.kind==='recycle'&&f.boardState===target.state)){let amount=Math.min(cfg.tideWaterGain,tideAvailable(b)),samples=amount>1?takeTideWater(b,amount):null;if(samples)h.flights.push({kind:'recycle',target:b,boardState:target.state,x:hitX,volume:amount,samples,age:0})}}h.generated+=amount;h.hits++;h.pressure=Math.min(100,h.pressure+cfg.tideChargeGain);
let opponent=soloMode?null:lanes.find(o=>o!==b);if(!opponent||opponent.done)return;
if(h.pressure>=100&&tideCanFloat(opponent)&&!h.flights.some(f=>f.kind==='float')&&tideCast(b,opponent,'float',cfg.tideFloatCost)){h.pressure=0;return}
if(h.hits%cfg.tidePourHits===0)tideCast(b,opponent,'pour',cfg.tidePourCost)}
function tickTideFlights(b,dt){let h=tideState(b);for(const f of h.flights){f.age+=dt;if(f.age<cfg.tideFlightTime)continue;let target=f.target;if(target.done){h.drained+=f.volume;f.done=true;continue}let receiver=tideState(target);
if(f.kind==='recycle'){let board=tideTargets(target).find(t=>t.state===f.boardState)||tideLanding(target);tideDeposit(target,board,f.x,f.volume)}else if(f.kind==='float'&&tideCanFloat(target)){receiver.float={age:0,duration:cfg.tideFloatDuration,volume:f.volume,startY:target.y};receiver.immunity=cfg.tideImmunity+cfg.tideFloatDuration;target.v=0;tideSound('float')}else{let floor=tideLanding(target),origin=target.x<330?36:348,x=Math.max(origin+12,Math.min(origin+264,target.x+target.vx*.2));if(floor){let pool;for(const [offset,weight] of [[-23,.1],[-11.5,.2],[0,.4],[11.5,.2],[23,.1]])pool=tideDeposit(target,floor,x+offset,f.volume*weight);pool.hostile=true;pool.surge={center:x,radius:30,remaining:cfg.tideSurgeLife,charges:1}}else tideDeposit(target,null,x,f.volume)}f.done=true}
h.flights=h.flights.filter(f=>!f.done)}
function tickTideWater(b,dt){let h=tideState(b),origin=b.x<330?36:348,targets=tideTargets(b);
for(const p of h.pools){let t=targets.find(t=>t.state===p.state);if(!t){for(let k=0;k<24;k++){tideDrop(b,origin+(k+.5)*11.5,p.y-1,p.cells[k]);p.cells[k]=0}continue}p.y=t.y;if(p.surge){p.surge.remaining=Math.max(0,p.surge.remaining-dt);if(p.hostile&&p.surge.remaining<=0){h.drained+=p.cells.reduce((a,v)=>a+v,0);p.cells.fill(0);}}let surfaces=Array.from({length:24},(_,k)=>tideSurface(b,t,origin+(k+.5)*11.5));
for(let k=0;k<23;k++){let left=(surfaces[k]??t.y+35)-p.cells[k]*.65,right=(surfaces[k+1]??t.y+35)-p.cells[k+1]*.65,delta=(right-left)*cfg.tideWaterFlow*dt*.4;if(delta>0){let flow=Math.min(p.cells[k]*.45,delta);p.cells[k]-=flow;p.cells[k+1]+=flow}else{let flow=Math.min(p.cells[k+1]*.45,-delta);p.cells[k+1]-=flow;p.cells[k]+=flow}}
if(b.role!=='tide'&&p.surge)for(let k=0;k<24;k++){let x=origin+(k+.5)*11.5;if(Math.abs(x-p.surge.center)>p.surge.radius+6&&p.cells[k]>0){tideDrop(b,x,t.y+31,p.cells[k]);p.cells[k]=0}}
for(let k=0;k<24;k++)if(surfaces[k]===null&&p.cells[k]>0){let drain=Math.min(p.cells[k],24*dt);p.cells[k]-=drain;tideDrop(b,origin+(k+.5)*11.5,t.y+31,drain)}
}h.pools=h.pools.filter(p=>{let keep=p.cells.some(v=>v>1e-7);if(!keep)h.drained+=p.cells.reduce((a,v)=>a+v,0);return keep});
for(const d of h.drops){let old=d.y;d.vy+=cfg.gravity*.5*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;let candidates=targets.map(t=>({t,y:tideSurface(b,t,d.x)})).filter(p=>p.y!==null&&old<=p.y+1&&d.y>=p.y).sort((a,b)=>a.y-b.y);if(candidates.length){tideDeposit(b,candidates[0].t,d.x,d.volume);d.volume=0}else if(d.y>1157||d.x<origin-8||d.x>origin+284){h.drained+=d.volume;d.volume=0}}
pruneTideDrops(h);
tryTideSurge(b,targets);
}
function tickTideActor(b,side,dt){if(b.role!=='tide'&&!b.special.tide)return false;let h=tideState(b);h.immunity=Math.max(0,h.immunity-dt);h.notice=Math.max(0,h.notice-dt);h.surgeCooldown=Math.max(0,h.surgeCooldown-dt);tickTideSurges(b,dt);tickTideFlights(b,dt);tickTideWater(b,dt);let f=h.float;if(!f)return false;
// Float controls the sphere, while board vibration and detached fragments keep moving.
if(b.role==='lead'||b.role==='tide')tickLeadDebris(b,dt);if(b.role==='magnet'){tickBending(b,dt);tickScrapBending(b,dt)}b.special.stunImmunity=Math.max(0,b.special.stunImmunity-dt);
f.age+=dt;let origin=side?348:36;b.x=Math.max(origin+32,Math.min(origin+244,b.x+b.vx*dt*.2));let top=108,bottom=1124;
for(const t of tideTargets(b)){let surface=tideSurface(b,t,b.x);if(surface===null)continue;if(surface+30<=f.startY-31)top=Math.max(top,surface+30+32.1);else if(surface>=f.startY+31)bottom=Math.min(bottom,surface-32.1)}
let lift=cfg.tideFloatLift*Math.sin(Math.min(1,f.age/.3)*Math.PI/2);b.y=Math.max(top,Math.min(Math.max(top,bottom),f.startY-lift));b.v=0;
if(f.age>=f.duration){let volume=f.volume;h.float=null;h.immunity=Math.max(h.immunity,cfg.tideImmunity);h.surgeCooldown=Math.max(h.surgeCooldown,.7);b.v=40;for(let k=0;k<5;k++)tideDrop(b,b.x+(k-2)*9,b.y+25,volume/5,(k-2)*12,35)}return true}
function drawTide(b){drawTideBridge(b);drawTideWheel(b);let h=b.special.tide;if(!h)return;let origin=b.x<330?36:348,targets=tideTargets(b);ctx.save();ctx.beginPath();ctx.rect(origin,76,276,1081);ctx.clip();
for(const p of h.pools){let t=targets.find(t=>t.state===p.state);if(!t)continue;for(let k=0;k<24;k++){let depth=Math.min(p.surge?18:8,p.cells[k]*(p.surge?.65:.35));if(depth<.03)continue;let x=origin+k*11.5,y=tideSurface(b,t,x+5.75);if(y===null)continue;let wave=Math.sin(time*6+k*.8)*Math.min(1.5,depth*.2);ctx.fillStyle=b.role==='tide'?'#40cfe958':'#40cfe925';ctx.fillRect(x,y-depth+wave,11.7,depth-wave);ctx.strokeStyle=b.role==='tide'?'#a5f4ffbb':'#77b4c144';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y-depth+wave);ctx.lineTo(x+11.5,y-depth+Math.sin(time*6+(k+1)*.8)*Math.min(1.5,depth*.2));ctx.stroke()}}
drawTideSurges(b,h);ctx.fillStyle='#75e9ffb0';for(const d of h.drops){ctx.beginPath();ctx.ellipse(d.x,d.y,Math.min(5,1.5+Math.sqrt(d.volume)*.45),3+Math.min(6,Math.abs(d.vy)*.015),0,0,Math.PI*2);ctx.fill()}
if(h.float){let f=h.float,alpha=Math.min(1,f.age/.15,(f.duration-f.age)/.15);ctx.globalAlpha=Math.max(0,alpha);ctx.fillStyle='#48cce946';ctx.strokeStyle='#b4f5ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.x,b.y+5,42+Math.sin(time*9)*2,45,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(b.x,b.y+18,37,9,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#c1faff';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText('浮托',b.x,b.y-54);ctx.globalAlpha=1}
ctx.restore();if(b.role==='tide'){ctx.save();round(b.x-32,b.y+41,64,5,2,'#112638');round(b.x-32,b.y+41,64*Math.min(1,tideAvailable(b)/cfg.tideFloatCost),5,2,'#4ecfe7');round(b.x-32,b.y+49,64,4,2,'#112638');round(b.x-32,b.y+49,64*h.pressure/100,4,2,'#b3f4ff');if(h.notice>0){ctx.globalAlpha=Math.min(1,h.notice/.2);ctx.fillStyle='#bff7ff';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText(h.label,b.x,b.y-45)}ctx.restore()}}
function drawTideFlights(){for(const b of lanes){let h=b.special.tide;if(!h)continue;for(const f of h.flights){let t=Math.min(1,f.age/cfg.tideFlightTime),e=t*t*(3-2*t),floor=tideLanding(f.target),tx=f.kind==='recycle'?f.x:f.target.x,ty=f.kind==='recycle'?(tideTargets(f.target).find(t=>t.state===f.boardState)?.y??f.target.y+32):f.kind==='float'?f.target.y:(floor?.y??f.target.y+45);ctx.save();for(let k=0;k<f.samples.length;k++){let p=f.samples[k],x=p.x+(tx-p.x)*e,y=p.y+(ty-p.y)*e-Math.sin(t*Math.PI)*70;ctx.strokeStyle='#68deef66';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+tx)/2,Math.min(p.y,ty)-70,x,y);ctx.stroke();ctx.fillStyle='#a6f4ff';ctx.beginPath();ctx.arc(x,y,Math.min(7,2+Math.sqrt(p.volume)*.5),0,Math.PI*2);ctx.fill()}ctx.restore()}}}
function tideSound(kind){let c=gameAudio.context;if(!gameAudio.enabled||!c||c.state!=='running'||gameAudio.volume<=0)return;let now=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),duration=kind==='float'?.45:.18;osc.type='sine';osc.frequency.setValueAtTime(kind==='float'?140:280,now);osc.frequency.exponentialRampToValueAtTime(kind==='float'?330:110,now+duration);gain.gain.setValueAtTime(gameAudio.volume*.16,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(c.destination);osc.start(now);osc.stop(now+duration)}

function pruneTideDrops(h){h.drops=h.drops.filter(d=>{if(d.volume>1e-7)return true;h.drained+=Math.max(0,d.volume);return false})}

// Cross-lane water carries a short-lived countercurrent. A surge spends real local pool water once.
function tryTideSurge(b,targets){if(b.role==='gravity')return false;let h=tideState(b);if(h.float||h.waterBridge||h.surgeCooldown>0||b.v<=40||b.action||b.special.arena||b.special.bridge||b.special.stunTime>0)return false;let origin=b.x<330?36:348;
for(const p of h.pools){const surge=p.surge,puddle=!surge;if(puddle&&b.role==='tide'&&!p.hostile)continue;if(surge&&(surge.remaining<=0||surge.charges<=0||Math.abs(b.x-surge.center)>surge.radius+20))continue;const centerX=surge?.center??b.x,radius=surge?.radius??30;let t=targets.find(t=>t.state===p.state);if(!t)continue;let y=tideSurface(b,t,b.x);if(y===null||b.y+32<y-24||b.y-32>y)continue;
let slots=[];for(let k=0;k<24;k++)if(Math.abs(origin+(k+.5)*11.5-b.x)<=50&&Math.abs(origin+(k+.5)*11.5-centerX)<=radius+6&&p.cells[k]>0)slots.push(k);let available=slots.reduce((v,k)=>v+p.cells[k],0);if(available+1e-7<(puddle?.25:cfg.tideSurgeCost))continue;
let spent=0;if(puddle){let remaining=cfg.tideSurgeCost;for(const k of slots){const take=Math.min(remaining,p.cells[k]);p.cells[k]-=take;spent+=take;remaining-=take;if(remaining<=1e-7)break}}else{spent=p.cells.reduce((a,v)=>a+v,0);p.cells.fill(0);}
const missed=Math.random()<(cfg.tideSurgeMiss??50)/100;let center=origin+138,side=b.x<center?1:b.x>center?-1:b.vx>=0?-1:1;h.surges.push({x:b.x,y,age:0,life:.42,volume:spent,side,puddle,missed});if(surge){surge.charges--;delete p.surge;}h.surgeCooldown=cfg.tideSurgeCooldown;if(missed){h.missUntil=Date.now()+1200;h.missCount=(h.missCount||0)+1;}if(!missed){recordControlEvent(b,puddle?'积水逆潮':'强逆潮');b.v=-(puddle?150:cfg.tideSurgeLift);b.vx=Math.max(-cfg.vxMax,Math.min(cfg.vxMax,b.vx*.35+side*cfg.tideSurgeSide));}if(missed)materialSound('miss');else tideSound('surge');return true}return false}
function tickTideSurges(b,dt){let h=tideState(b);for(const jet of h.surges){jet.age+=dt;if(jet.age>=jet.life&&!jet.done){h.drained+=jet.volume;jet.done=true}}h.surges=h.surges.filter(j=>!j.done)}
function drawTideSurges(b,h){for(const p of h.pools){if(!p.surge||p.surge.charges<=0||p.surge.remaining<=0)continue;let t=tideTargets(b).find(t=>t.state===p.state);if(!t)continue;let origin=b.x<330?36:348,slots=[];for(let k=0;k<24;k++)if(Math.abs(origin+(k+.5)*11.5-p.surge.center)<=p.surge.radius+6)slots.push(k);let volume=slots.reduce((v,k)=>v+p.cells[k],0),blocked=h.float||h.waterBridge||h.surgeCooldown>0||b.action||b.special.arena||b.special.bridge||b.special.stunTime>0,ready=!blocked&&volume+1e-7>=cfg.tideSurgeCost;
const surface=tideSurface(b,t,p.surge.center),approaching=ready&&surface!==null&&b.v>0&&surface-(b.y+32)>=0&&surface-(b.y+32)<110;ctx.save();if(approaching){const gather=1-(surface-(b.y+32))/110;ctx.strokeStyle='#bdffff';ctx.lineWidth=2;ctx.globalAlpha=.3+gather*.5;ctx.beginPath();ctx.ellipse(p.surge.center,surface-3,25-gather*8,4+gather*3,0,0,Math.PI*2);ctx.stroke();}ctx.strokeStyle=ready?'#b7fbff':'#55727d';ctx.lineWidth=ready?1.5:1;ctx.globalAlpha=ready?1:.4;for(const k of slots){if(p.cells[k]<.15)continue;let x=origin+(k+.5)*11.5,y=tideSurface(b,t,x);if(y===null)continue;ctx.beginPath();if(ready){ctx.moveTo(x-3,y-5);ctx.lineTo(x,y-10-Math.sin(time*8+k)*2);ctx.lineTo(x+3,y-5)}else{ctx.moveTo(x-3,y-5);ctx.lineTo(x+3,y-5)}ctx.stroke()}ctx.restore()}

for(const jet of h.surges){let t=jet.age/jet.life,rise=Math.sin(Math.min(1,t*2)*Math.PI/2)*(jet.puddle?44:85);ctx.save();ctx.globalAlpha=Math.max(0,1-t);ctx.strokeStyle='#9af5ff';ctx.fillStyle='#40d9ef55';ctx.lineWidth=3;ctx.beginPath();if(jet.missed)ctx.translate(jet.side*62,0);ctx.moveTo(jet.x-24,jet.y);ctx.quadraticCurveTo(jet.x-17+jet.side*10,jet.y-rise,jet.x+jet.side*18,jet.y-rise);ctx.quadraticCurveTo(jet.x+22+jet.side*10,jet.y-rise+7,jet.x+24,jet.y);ctx.fill();ctx.stroke();ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#d6fbff';if(!jet.missed&&!jet.puddle)ctx.fillText('逆潮',jet.x,jet.y-rise-8);ctx.restore()}}
function releaseTideSlab(b,t,cells,velocity){let groups=new Map(),origin=b.x<330?36:348;for(const k of cells){let source=t.j;if(t.scrap){let edge=0;for(const part of t.scrap.parts){edge+=276*part.count/t.scrap.total;if(k%138*2<edge){source=part.source;break}}}if(!groups.has(source))groups.set(source,[]);groups.get(source).push(k)}
for(const [source,group] of groups){let cx=group.reduce((v,k)=>v+k%138*2+1,0)/group.length,cy=group.reduce((v,k)=>v+Math.floor(k/138)*2+1,0)/group.length,points=group.map(k=>({x:k%138*2+1-cx,y:Math.floor(k/138)*2+1-cy}));b.special.debris.push({x:origin+cx,y:t.y+cy,vx:(cx-138)*.1,vy:Math.max(35,velocity),angle:0,spin:(cx-138)*.006,generation:0,breakCooldown:.4,points,inertia:points.reduce((v,p)=>v+p.x*p.x+p.y*p.y+2/3,0)/points.length,boardIndex:source,color:themePalettes.neon.boards[source],age:0})}}
function tickTideBody(b,side,dt){tickLeadDebris(b,dt);let h=tideState(b),s=b.special;h.bridgeCooldown=Math.max(0,(h.bridgeCooldown||0)-dt);if(h.waterBridge)return tickTideBridge(b,dt);if(h.wheel)return tickTideWheel(b,dt);h.contactCooldown=Math.max(0,(h.contactCooldown||0)-dt);s.stunImmunity=Math.max(0,s.stunImmunity-dt);if(s.stunTime>0){s.stunTime=Math.max(0,s.stunTime-dt);return true}let origin=side?348:36,targets=tideTargets(b),steps=Math.max(1,Math.ceil(dt/.003));
for(let n=0;n<steps;n++){let step=dt/steps;b.v+=cfg.gravity*step;b.x+=b.vx*step;b.y+=b.v*step;if(b.x<origin+32){b.x=origin+32;b.vx=Math.abs(b.vx)}if(b.x>origin+244){b.x=origin+244;b.vx=-Math.abs(b.vx)}let c=tideMaterialContact(b,targets,origin);
if(c){b.x+=c.nx*Math.max(0,32.1-c.dist);b.y+=c.ny*Math.max(0,32.1-c.dist);if(h.contactCooldown<=0){b.hits++;tideHit(b,c.target.scrap,c.target.j,c);h.contactCooldown=.06;if(registerTideBridge(b,c))return true;if(c.ny<-.3){startTideWheel(b,c.target);return true}impact(c.x,c.y,roleOf(b).color,side,false,false);soundEffect('hit','tide')}let vx=b.vx-2*c.dot*c.nx,vy=b.v-2*c.dot*c.ny,speed=cfg.bounce+Math.random()*cfg.bounceRandom,scale=speed/Math.max(1,Math.hypot(vx,vy));b.vx=Math.max(-cfg.vxMax,Math.min(cfg.vxMax,vx*scale));b.v=vy*scale}
while(b.index<levels.length&&b.y-32>258+b.index*113.2+30)b.index++;if(b.y+32>=courseFloor()&&b.v>0){b.y=(courseFloor()-32);b.index=levels.length;b.done=true;b.finish=time;finishRace(side);break}}return true}
function tideMaterialContact(b,targets,origin){let best=null;for(const target of targets){if(b.y+33<target.y||b.y-33>target.y+30+cfg.tideCollapseDepth)continue;for(let col=Math.max(0,Math.floor((b.x-origin-33)/2));col<=Math.min(137,Math.ceil((b.x-origin+33)/2));col++)for(let row=0;row<15;row++){if(!target.state.material[row*138+col])continue;let x=Math.max(origin+col*2,Math.min(origin+col*2+2,b.x)),y=Math.max(target.y+row*2+(target.state.wheelSag?.[col]||0),Math.min(target.y+row*2+2+(target.state.wheelSag?.[col]||0),b.y)),dx=b.x-x,dy=b.y-y,dist=Math.hypot(dx,dy);if(dist<.001||dist>32.5)continue;let nx=dx/dist,ny=dy/dist,dot=b.vx*nx+b.v*ny;if(dot<0&&(!best||dist<best.dist))best={target,x,y,nx,ny,dot,dist}}}return best}
function drawTidePlate(){}

function startTideWheel(b,target){let h=tideState(b),volume=Math.min(30,tideAvailable(b));if(volume>0)takeTideWater(b,volume);let power=volume/30,origin=b.x<330?36:348,dir=b.vx<0?-1:1;if(b.x<origin+44&&dir<0)dir=1;else if(b.x>origin+232&&dir>0)dir=-1;h.wheel={state:target.state,target,volume,age:0,duration:.18+Math.max(0,cfg.tideWheelDuration-.18)*power,power,dir,cut:[]};b.action={kind:'tideWheel'};b.v=0;soundEffect('hit','tide')}
function endTideWheel(b,fall=false){let h=tideState(b),w=h.wheel;if(!w)return;if(w.target.scrap){let start=b.special.debris.length;withScrapState(b,w.target.scrap,()=>detachLeadIslands(b,0));for(let k=start;k<b.special.debris.length;k++)b.special.debris[k].y+=w.target.y-258}else detachLeadIslands(b,w.target.j);let remaining=w.target.state.material.reduce((a,v)=>a+v,0)/2070,hp=tideOriginalWheelStrength(w.target)+Math.log10(Math.max(.001,remaining)),before=w.target.scrap?w.target.scrap.hp:b.hp[w.target.j];if(w.target.scrap)w.target.scrap.hp=hp;else b.hp[w.target.j]=hp;recordDamage(b,before,hp);for(let k=0;k<5;k++)tideDrop(b,b.x+(k-2)*9,b.y+24,w.volume/5,(k-2)*20,40);h.wheel=null;b.action=null;b.v=fall?70:-(cfg.bounce+Math.random()*cfg.bounceRandom);b.special.materialRevision=(b.special.materialRevision||0)+1}
function tideOriginalWheelStrength(t){return t.scrap?t.scrap.original:levels[t.j]}
function tickTideWheel(b,dt){let w=tideState(b).wheel,t=tideTargets(b).find(t=>t.state===w.state);if(!t||b.special.stunTime>0){endTideWheel(b,!t);return true}let steps=Math.max(1,Math.ceil(dt/.003)),origin=b.x<330?36:348;t.state.wheelSag??=new Float32Array(138);
for(let n=0;n<steps;n++){let h=dt/steps;w.age+=h;let surface=tideSurface(b,t,b.x);if(surface===null){endTideWheel(b,true);return true}b.y=surface-32;b.x+=w.dir*(100+w.power*(cfg.tideWheelSpeed-100))*h;if(b.x<origin+32||b.x>origin+244){b.x=Math.max(origin+32,Math.min(origin+244,b.x));endTideWheel(b);return true}
let assist=tidePoolAssist(b,t.state),radius=32+w.power*18,peak=0;for(let col=Math.max(1,Math.floor((b.x-origin-radius)/2));col<=Math.min(136,Math.ceil((b.x-origin+radius)/2));col++){if(!t.state.material[col])continue;let dx=(origin+col*2+1-b.x)/radius,load=Math.max(0,1-dx*dx)*(14+(cfg.tideWheelWear-14)*w.power)/(1+.12*Math.log10(1+courseResistanceValue(tideOriginalWheelStrength(t))));t.state.wheelSag[col]+=load*h*assist;peak=Math.max(peak,t.state.wheelSag[col])}
if(peak>=cfg.tideCollapseDepth){collapseTideSag(b,t);endTideWheel(b,true);return true}
if(w.age>=w.duration){endTideWheel(b);return true}}return true}
function drawTideWheel(b){let w=b.special.tide?.wheel;if(!w)return;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(w.dir*w.age*26);ctx.strokeStyle='#91f3ff';ctx.lineWidth=4+w.power*3;ctx.globalAlpha=.8;for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(0,0,35+w.power*5,k*Math.PI/2,k*Math.PI/2+1.05);ctx.stroke()}ctx.restore()}

function collapseTideSag(b,t){let sag=t.state.wheelSag,cells=[];for(let col=0;col<138;col++)if(sag[col]>=cfg.tideCollapseDepth*.38)for(let row=0;row<15;row++){let k=row*138+col;if(t.state.material[k]){t.state.material[k]=0;cells.push(k)}}let start=b.special.debris.length;releaseTideSlab(b,t,cells,150);for(let k=start;k<b.special.debris.length;k++){let d=b.special.debris[k];for(const p of d.points){let col=Math.max(0,Math.min(137,Math.floor((d.x+p.x-(b.x<330?36:348))/2)));p.y+=sag[col]||0}let cy=d.points.reduce((v,p)=>v+p.y,0)/d.points.length;d.y+=cy;for(const p of d.points)p.y-=cy;d.inertia=d.points.reduce((v,p)=>v+p.x*p.x+p.y*p.y+2/3,0)/d.points.length;d.spin=(d.x-b.x)*.025}impact(b.x,t.y+cfg.tideCollapseDepth,roleOf(b).color,b.x<330?0:1,true,false);soundEffect('ultimate','lead');tideState(b).notice=.6;tideState(b).label='塌陷！'}
function drawTideSagBoard(b,j,x,y,scrap=null){let state=scrap?scrap.state:b.special.boards[j],sag=state.wheelSag,texture;if(scrap){scrapTexture(scrap);texture=state.bend.texture}else texture=bendBoardTexture(b,j);ctx.save();for(let col=0;col<138;col++){let shift=sag?.[col]||0,start=-1;for(let row=0;row<=15;row++){let live=row<15&&state.material[row*138+col];if(live&&start<0)start=row;if(!live&&start>=0){ctx.drawImage(texture,col*2,start*2,2,(row-start)*2,x+col*2,y+start*2+shift,2.1,(row-start)*2);start=-1}}if(shift>cfg.tideCollapseDepth*.5){ctx.strokeStyle='#d5f7ff88';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+col*2,y+shift);ctx.lineTo(x+col*2+1,y+shift+Math.min(25,shift));ctx.stroke()}}ctx.restore()}

function tidePoolAssist(b,state){let pool=tideState(b).pools.find(p=>p.state===state),water=pool?pool.cells.reduce((v,n)=>v+n,0):0;return 1+Math.min(.25,cfg.tidePoolBoost/100)*Math.min(1,Math.max(0,water)/cfg.tidePoolBoostWater)}

// Independent foreground notice: not evicted by damage numbers or sped up with simulation time.
function drawTideMissNotices(){
 const now=Date.now();for(const b of lanes){const h=b.special.tide;if(!h||!(h.missUntil>now))continue;
  const remaining=(h.missUntil-now)/1200,ceiling=endlessMode?endlessCamera+105:105;
  ctx.save();ctx.globalAlpha=Math.min(1,remaining*5);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 21px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#082132';ctx.fillStyle='#c4faff';
  const y=Math.max(ceiling,b.y-52-(1-remaining)*14);ctx.strokeText('miss',b.x,y);ctx.fillText('miss',b.x,y);ctx.restore();
 }
}

function tideBridgeGeometry(b,bridge=tideState(b).waterBridge){
 if(!bridge)return null;const targets=tideTargets(b),top=targets.find(t=>t.state===bridge.top),bottom=targets.find(t=>t.state===bridge.bottom);
 if(!top||!bottom)return null;const mixed=!!top.scrap!==!!bottom.scrap,origin=b.x<330?36:348;
 // A passed-through opening may be empty at the ball center: anchor to a real adjacent edge.
 for(let offset=0;offset<=(bridge.locked?0:44);offset+=2)for(const direction of offset?[1,-1]:[1]){
  const x=bridge.x+offset*direction;if(x<origin+2||x>origin+274)continue;
  const col=Math.floor((x-origin)/2);let a=null;
  for(let r=14;r>=0;r--)if(top.state.material[r*138+col]){a=top.y+r*2+2+(top.state.wheelSag?.[col]||0);break;}
  const z=tideSurface(b,bottom,x);if(a===null||z===null||z-a<(mixed?2:65))continue;
  if(targets.some(t=>t.state!==top.state&&t.state!==bottom.state&&t.y>a&&t.y<z&&tideSurface(b,t,x)!==null))continue;
  return {top,bottom,topY:a,bottomY:z,x,external:z-a<65};
 }
 return null;
}
function registerTideBridge(b,c){
 const h=tideState(b),old=h.bridgeContact;h.bridgeContact={state:c.target.state,y:c.target.y,x:c.x,ny:c.ny,time};
 if(h.waterBridge||h.bridgeCooldown>0||!old||old.state===c.target.state||time-old.time>cfg.tideBridgeWindow||Math.abs(c.x-old.x)>65||Math.abs(c.ny)<.3||Math.abs(old.ny)<.3)return false;
 const top=old.y<c.target.y?old:{state:c.target.state,y:c.target.y,ny:c.ny},bottom=old.y<c.target.y?{state:c.target.state,y:c.target.y,ny:c.ny}:old;
 const bridge={top:top.state,bottom:bottom.state,x:(old.x+c.x)/2,ballX:b.x,ballY:b.y,age:0,volume:cfg.tideBridgeCost},geometry=tideBridgeGeometry(b,bridge);
 if(!geometry)return false;
 // Wide gaps require genuine inside-face alternation. A narrow mixed pair can be
 // connected after consecutive face contacts near the opening, without moving the ball into it.
 if(!geometry.external&&(top.ny<.3||bottom.ny>-.3||c.ny*old.ny>-.3))return false;
 if(!takeTideWater(b,cfg.tideBridgeCost))return false;
 bridge.x=geometry.x;bridge.external=geometry.external;bridge.locked=true;
 h.waterBridge=bridge;h.bridgeCooldown=cfg.tideBridgeCooldown;b.v=0;b.vx*=.25;
 b.damageTexts.push({text:'双板水桥',age:0});waterImpactSound();return true;
}
function finishTideBridge(b){const h=tideState(b),bridge=h.waterBridge;if(!bridge)return;h.drained+=bridge.volume;h.waterBridge=null;h.bridgeContact=null;b.v=cfg.fall;b.vx=(b.vx<0?-1:1)*Math.max(cfg.vxMin,Math.abs(b.vx));}
function tickTideBridge(b,dt){
 const h=tideState(b),bridge=h.waterBridge,geometry=tideBridgeGeometry(b);bridge.age+=dt;
 if(!geometry||bridge.age>=cfg.tideBridgeDuration||b.special.stunTime>0){finishTideBridge(b);return true;}
 if(bridge.external){b.x=bridge.ballX;b.y=bridge.ballY;}else{b.x=bridge.x;b.y=Math.max(geometry.topY+32.1,Math.min(geometry.bottomY-32.1,(geometry.topY+geometry.bottomY)/2));}b.v=0;
 const origin=b.x<330?36:348;
 for(const [t,direction] of [[geometry.top,-1],[geometry.bottom,1]]){
  const sag=t.state.wheelSag||(t.state.wheelSag=new Float32Array(138)),cells=[];
  const resistance=1+.12*Math.log10(1+courseResistanceValue(tideOriginalWheelStrength(t)));
  for(let k=1;k<137;k++){
   const dx=(origin+k*2+1-bridge.x)/44;if(Math.abs(dx)>1)continue;
   let live=false;for(let row=0;row<15;row++)if(t.state.material[row*138+k]){live=true;break}if(!live)continue;
   sag[k]+=direction*(1-dx*dx)*cfg.tideBridgePressure/resistance*dt;
   if(Math.abs(sag[k])>=cfg.tideCollapseDepth)for(let r=0;r<15;r++){const cell=r*138+k;if(t.state.material[cell]){t.state.material[cell]=0;cells.push(cell);}}
  }
  if(cells.length){releaseTideSlab(b,t,cells,direction*70);b.special.materialRevision=(b.special.materialRevision||0)+1;soundEffect('break','tide');}
  const ratio=t.state.material.reduce((a,v)=>a+v,0)/2070,hp=tideOriginalWheelStrength(t)+Math.log10(Math.max(1e-9,ratio));if(t.scrap)t.scrap.hp=hp;else b.hp[t.j]=hp;
 }
 return true;
}
function drawTideBridge(b){
 const bridge=b.special.tide?.waterBridge;if(!bridge)return;const g=tideBridgeGeometry(b);if(!g)return;
 ctx.save();ctx.lineCap='round';const top=g.topY,bottom=g.bottomY,x=bridge.x;
 for(let n=0;n<5;n++){const offset=(n-2)*8,phase=bridge.age*12+n;ctx.beginPath();ctx.moveTo(x+offset,top);ctx.bezierCurveTo(x+offset+Math.sin(phase)*20,top+(bottom-top)*.3,x+offset-Math.sin(phase)*20,top+(bottom-top)*.7,x+offset,bottom);ctx.strokeStyle=n%2?'#a6faffcc':'#32cce888';ctx.lineWidth=n===2?8:3;ctx.stroke();}
 for(let n=0;n<8;n++){const fraction=(bridge.age*1.7+n/8)%1,sign=n%2?1:-1;ctx.fillStyle='#ddffff';ctx.beginPath();ctx.arc(x+sign*(12+Math.sin(fraction*7)*5),top+(bottom-top)*(sign>0?fraction:1-fraction),2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}

// Read-only diagnostics; no new control immunity or balance changes.
function controlMetrics(b){return b.controlMetrics||(b.controlMetrics={events:[],lastStart:null,shortestGap:null,controlledSeconds:0,activeKind:null})}
function recordControlEvent(b,kind){const m=controlMetrics(b),gap=m.lastStart===null?null:time-m.lastStart;if(gap!==null)m.shortestGap=m.shortestGap===null?gap:Math.min(m.shortestGap,gap);m.lastStart=time;m.events.push({kind,time,gap});if(m.events.length>200)m.events.shift();}
function tickControlMetrics(b,dt){const h=b.special.tide,kind=h?.float?'浮托':b.special.stunTime>0?'昏迷':h?.waterBridge?'水桥':null,m=controlMetrics(b);if(kind){m.controlledSeconds+=dt;if(m.activeKind!==kind)recordControlEvent(b,kind);}m.activeKind=kind;}
function getControlDiagnostics(){return lanes.map(b=>({role:roleOf(b).name,...controlMetrics(b),events:controlMetrics(b).events.map(e=>({...e}))}));}
