// Read-only tournament observers. Counters live with each ball and are serialized with round.stats.
const roleEventRuntime=new WeakMap();
function roleEventState(b){let h=roleEventRuntime.get(b);if(!h){h={boards:new WeakMap(),passed:new WeakSet(),acidLower:new WeakSet(),repaired:new WeakSet()};roleEventRuntime.set(b,h);}return h;}
function roleMetrics(b){const p=playerTelemetry(b);return p.metrics||(p.metrics={});}
function roleCount(b,key,n=1){if(telemetryActive()&&n>0){const m=roleMetrics(b);m[key]=(m[key]||0)+n;}}
function roleMax(b,key,n){if(telemetryActive()&&n>0){const m=roleMetrics(b);m[key]=Math.max(m[key]||0,n);}}
function roleAttack(b,state,original,before,broken,extra={}){
 if(!telemetryActive()||!state)return;
 const rt=roleEventState(b);let board=rt.boards.get(state);if(!board){board={hits:0,last:null,broken:false};rt.boards.set(state,board);}if(board.broken)return;
 board.hits++;const m=roleMetrics(b);
 if(b.role==='heavy'&&b.rageTime>0){if(m.rageUntil!==time+b.rageTime&&(!m.rageUntil||time>=m.rageUntil-.00001)){roleCount(b,'rageCasts');m.rageUntil=time+b.rageTime;}if(broken)roleCount(b,'rageBreaks');}
 if(['root','cube','ln'].includes(b.role)&&broken){if(m.highestBroken===undefined||original>m.highestBroken){m.highestBroken=original;m.highestHits=board.hits;}}
 if(b.role==='root'&&broken&&Math.round(10**before)<=1)roleCount(b,'oneBreaks');
 if(b.role==='cube'){roleCount(b,'charges');if(broken)roleCount(b,'chargeBreaks');if(board.last!==null&&time>board.last)m.returnGap=Math.min(m.returnGap??Infinity,time-board.last);board.last=time;}
 if(b.role==='ln'&&!broken&&before>b.hp[b.index]){const drop=before-b.hp[b.index];if(drop>(m.compression||0)){m.compression=drop;m.compressBefore=before;m.compressAfter=b.hp[b.index];}}
 if(b.role==='drill'){roleCount(b,b.ultimate?'pulverizes':'ordinaryDrills');}
 if(b.role==='chaos'&&b.rootFlash&&b.rootFlash!==extra.flash){const degrees=b.rootFlash.degrees||[];roleCount(b,'sixRoots',degrees.filter(d=>Math.round(d)===6).length);if(degrees.length>1){roleCount(b,'chains');if(Math.round(10**b.hp[b.index])<=1)roleCount(b,'chainToOne');}}
 if(b.role==='spring'&&b.special.arena){const arena=b.special.arena;arena.eventHits=(arena.eventHits||0)+1;roleMax(b,'arenaHits',arena.eventHits);roleMax(b,'arenaSpeed',Math.max(arena.speed||0,Math.abs(b.special.impactSpeed||0)));}
 if(b.role==='gyro'&&extra.notice<b.special.resonanceNotice)roleCount(b,'stuns');
 if(broken){board.broken=true;if(b.special.scrapAttack)roleCount(b,'scrapBreaks');}
}
const hitBeforeRoleEvents=hitBoard;hitBoard=function(b){
 if(newRoles.some(r=>r.id===b.role))return hitBeforeRoleEvents(b);
 const state=b.special.boards[b.index],original=levels[b.index],before=b.hp[b.index],flash=b.rootFlash,result=hitBeforeRoleEvents(b);
 roleAttack(b,state,original,before,result,{flash});return result;
};
const newHitBeforeRoleEvents=newHit;newHit=function(b){const state=b.special.boards[b.index],original=levels[b.index],before=b.hp[b.index],notice=b.special.resonanceNotice,result=newHitBeforeRoleEvents(b);roleAttack(b,state,original,before,result,{notice});return result;};
const phaseBeforeRoleEvents=phaseStrike;phaseStrike=function(b,t,c,combined=false){const result=phaseBeforeRoleEvents(b,t,c,combined);if(combined)roleCount(b,'phaseAligned');if(result.broken&&c.ny>.3)roleCount(b,'backBreaks');return result;};
const eccentricBeforeRoleEvents=eccentricDamage;eccentricDamage=function(b,t,c){const result=eccentricBeforeRoleEvents(b,t,c);roleCount(b,'eccentricHits');if(c.multiplier>1){roleCount(b,'headOns');if(result)roleCount(b,'headOnBreaks');}return result;};
const memoryBeforeRoleEvents=restoreResonanceMemory;restoreResonanceMemory=function(b,r,p){const before=Math.hypot(r.position,r.velocity/p.omega);memoryBeforeRoleEvents(b,r,p);if(Math.hypot(r.position,r.velocity/p.omega)>before+.0001)roleCount(b,'memoryReturns');};

function observeRolePassages(b){
 if(!telemetryActive()||!['lead','parasite','gravity'].includes(b.role))return;
 const rt=roleEventState(b);for(const t of b.special.boards.map((state,j)=>({state,y:258+j*113.2})).concat(b.special.scrapBoards.filter(o=>o.state).map(o=>({state:o.state,y:o.y})))){const state=t.state;if(rt.passed.has(state)||b.y-32<=t.y+30)continue;rt.passed.add(state);if(state.material.some(v=>!v)&&(b.role!=='lead'||state.material.some(Boolean)))roleCount(b,'openPasses');}
}
for(const name of ['tickLead','tickAcidBody','tickGravityBody']){
 const original=({tickLead,tickAcidBody,tickGravityBody})[name];
 const observer=function(b,...args){const result=original(b,...args);observeRolePassages(b);return result;};
 if(name==='tickLead')tickLead=observer;else if(name==='tickAcidBody')tickAcidBody=observer;else tickGravityBody=observer;
}
// Called only when an acid drop actually removes material, including assembled boards.
function observeAcidCorrosion(b,t,d){
 if(!telemetryActive())return;if(d.eventSourceY===undefined)d.eventSourceY=t.y;
 if(t.y>d.eventSourceY+1){const seen=roleEventState(b).acidLower;if(!seen.has(t.state)){seen.add(t.state);roleCount(b,'acidLowerBoards');}}
}
const repairBeforeRoleEvents=gravityRepairStep;gravityRepairStep=function(caster,job,dt){
 const kind=gravityRepairKind(job.target),before=job.target.special.materialRevision||0,present=kind==='bend'?job.t.state.bend.present.filter(Boolean).length:0,spent=gravityState(caster).spent,result=repairBeforeRoleEvents(caster,job,dt),used=gravityState(caster).spent-spent;
 if(telemetryActive()&&used>0){const rt=roleEventState(caster),changed=kind!=='bend'||job.t.state.bend.present.filter(Boolean).length>present;if(changed&&!rt.repaired.has(job.t.state)){rt.repaired.add(job.t.state);roleCount(caster,'repairedBoards');}if(kind==='material'&&(job.target.special.materialRevision||0)>before)roleCount(caster,'repairArea',used*4);}
 return result;
};
const bridgeContactBeforeRoleEvents=registerBridgeContact;registerBridgeContact=function(b,...args){const old=b.special.bridge;const result=bridgeContactBeforeRoleEvents(b,...args);if(!old&&b.special.bridge)roleCount(b,'magnetBridges');return result;};
const tideBridgeBeforeRoleEvents=registerTideBridge;registerTideBridge=function(b,c){const result=tideBridgeBeforeRoleEvents(b,c);if(result)roleCount(b,'waterBridges');return result;};
const slabBeforeRoleEvents=releaseTideSlab;releaseTideSlab=function(b,t,cells,v){const result=slabBeforeRoleEvents(b,t,cells,v),bridge=b.special.tide?.waterBridge;if(cells.length&&bridge&&!bridge.eventCollapse){bridge.eventCollapse=true;roleCount(b,'waterBridgeCollapses');}return result;};
const bendBeforeRoleEvents=tickBending;tickBending=function(b,dt){
 const bridge=b.special.bridge,watched=bridge&&!bridge.eventTear?b.special.boards.filter(p=>p===bridge.top.state||p===bridge.bottom.state).map(p=>({p,links:[...p.bend.links]})):[];
 const result=bendBeforeRoleEvents(b,dt);if(watched.some(({p,links})=>p.bend.links.some((v,k)=>v>=cfg.bendTear&&links[k]<cfg.bendTear))){bridge.eventTear=true;roleCount(b,'magnetBridgeTears');}return result;
};
const flightsBeforeRoleEvents=tickScrapFlights;tickScrapFlights=function(b,dt){const pending=[...b.special.scrapFlights],before=new Set(pending.map(f=>f.target));flightsBeforeRoleEvents(b,dt);if(telemetryActive())for(const target of before)for(const board of target.special.scrapBoards)if(!board.eventAssembler&&pending.some(f=>f.delivered&&f.target===target&&f.parts===board.parts))board.eventAssembler=b;};
function observeAssembledContact(b,o){if(o?.eventAssembler&&!o.eventContacted&&telemetryActive()){o.eventContacted=true;roleCount(o.eventAssembler,'assembledContacts');}}
const scrapHitBeforeRoleEvents=resolveScrapHit;resolveScrapHit=function(b,o,...args){observeAssembledContact(b,o);return scrapHitBeforeRoleEvents(b,o,...args);};
const acidContactBeforeRoleEvents=safeAcidContact;safeAcidContact=function(b,c){observeAssembledContact(b,c.target?.scrap);return acidContactBeforeRoleEvents(b,c);};
// Shape-specific attacks bypass resolveScrapHit, so also observe their real contact/attack entry points.
const leadHitBeforeRoleEvents=newHit;newHit=function(b){if(b.special.scrapAttack){const state=b.special.boards[b.index],o=b.special.scrapBoards.find(o=>o.state===state);observeAssembledContact(b,o);}return leadHitBeforeRoleEvents(b);};
for(const key of ['phaseStrike','eccentricDamage','frostHit','tideHit']){
 const original=({phaseStrike,eccentricDamage,frostHit,tideHit})[key],wrapped=function(b,t,...args){observeAssembledContact(b,key==='tideHit'?t:t?.scrap);return original(b,t,...args);};
 if(key==='phaseStrike')phaseStrike=wrapped;else if(key==='eccentricDamage')eccentricDamage=wrapped;else if(key==='frostHit')frostHit=wrapped;else tideHit=wrapped;
}
const snapshotBeforeRoleEvents=snapshotRaceTelemetry;snapshotRaceTelemetry=function(){for(const b of lanes)observeRolePassages(b);return snapshotBeforeRoleEvents();};

function roleEventCandidates(stats){
 const rows=[];const add=(text,priority=1)=>rows.push({text,priority});
 if(stats?.victory&&stats.victory.time>=0&&stats.victory.time<12)add(archiveLabel(stats.victory.role)+'仅用'+Number(stats.victory.time.toFixed(2))+'秒就赢得了胜利！',3);
 for(const p of stats?.players||[]){const n=archiveLabel(p.role),m=p.metrics||{},fact=(key,text,priority=1)=>{if(m[key]>0)add(n+text(m[key]),priority);};
 switch(p.role){
 case 'heavy':fact('rageCasts',v=>'本局进入狂暴'+v+'次。');fact('rageBreaks',v=>'在狂暴期间击破'+v+'块板。',2);break;
 case 'root':if(m.highestHits)add(n+'用'+m.highestHits+'次撞击击破本局已击破板中数值最高的一块（'+fmt(m.highestBroken)+'）。',2);fact('oneBreaks',v=>'将'+v+'块板化解至1后击碎。',2);break;
 case 'cube':fact('charges',v=>'完成'+v+'次蓄力攻击'+(m.chargeBreaks?'，击破'+m.chargeBreaks+'块板':'')+'。',m.chargeBreaks?2:1);if(m.returnGap>0)add(n+'反弹后再次命中同一块板的最短间隔为'+m.returnGap.toFixed(2)+'秒。');break;
 case 'ln':if(m.compression>0)add(n+'单次将板值从'+fmt(m.compressBefore)+'压缩至'+fmt(m.compressAfter)+'。',2);if(m.highestHits)add(n+'仅用'+m.highestHits+'次攻击击破本局已击破板中数值最高的一块（'+fmt(m.highestBroken)+'）。',2);break;
 case 'drill':fact('pulverizes',v=>'触发粉碎爆破'+v+'次。',2);fact('ordinaryDrills',v=>'完成'+v+'次普通钻击。');break;
 case 'chaos':fact('sixRoots',v=>'本局抽到六次根'+v+'次。');fact('chains',v=>'触发追加开方'+v+'次'+(m.chainToOne?'，其中'+m.chainToOne+'次将板化解至1':'')+'。',m.chainToOne?2:1);break;
 case 'spring':fact('arenaHits',v=>'一次板间阶段最多连续命中'+v+'次。',2);fact('arenaSpeed',v=>'板间连击最高速度达到'+Math.round(v)+'像素/秒。');break;
 case 'frost':if(canCompareDetachedPieces(stats)&&p.largestPieceArea>=64)add(n+'冻裂后最大脱落板片面积为'+Math.round(p.largestPieceArea)+'像素²。',2);fact('coldLinks',v=>'在骤冷期间撑断'+v+'处霜裂连接。',2);break;
 case 'parasite':fact('openPasses',v=>'穿过自己腐蚀出的缺口下降'+v+'层。',2);fact('acidLowerBoards',v=>'从上层滴落的酸液实际腐蚀了'+v+'块下层板。',2);break;
 case 'phase':fact('backBreaks',v=>'从板背面完成'+v+'次破板。',2);fact('phaseAligned',v=>'命中相位印记并获得冷却返还'+v+'次。',2);break;
 case 'gyro':fact('stuns',v=>'成功共振，使对手昏迷'+v+'次。',2);fact('memoryReturns',v=>'脱控后利用保留余震完成'+v+'次强化回击。',2);break;
 case 'lead':fact('openPasses',v=>'穿过自己砸出的洞口下降'+v+'层，余板仍保留。',2);if(canCompareDetachedPieces(stats)&&p.largestPieceArea>=64)add(n+'砸落的最大板片面积为'+Math.round(p.largestPieceArea)+'像素²。',2);break;
 case 'magnet':if(p.assembled>0)add(n+'成功拼成'+p.assembled+'块障碍板'+(m.assembledContacts?'，其中'+m.assembledContacts+'块被对手实际撞到':'')+'。',m.assembledContacts?2:1);fact('magnetBridges',v=>'形成'+v+'次双板磁桥'+(m.magnetBridgeTears?'，其中'+m.magnetBridgeTears+'次在持续期间撕断连接':'')+'。',m.magnetBridgeTears?2:1);break;
 case 'tide':if(p.surgeAttempts>0)add(n+'逆潮命中'+p.surgeHits+'/'+p.surgeAttempts+'次。',p.surgeHits?2:1);fact('waterBridges',v=>'形成'+v+'次双板水桥'+(m.waterBridgeCollapses?'，其中'+m.waterBridgeCollapses+'次在持续期间引发坍塌':'')+'。',m.waterBridgeCollapses?2:1);break;
 case 'gravity':fact('openPasses',v=>'撕开通道，成功下降'+v+'层。',2);fact('repairedBoards',v=>'实际回填对手'+v+'块受损板'+(m.repairArea?'，补回材料面积'+Math.round(m.repairArea)+'像素²':'')+'。',2);break;
 case 'eccentric':fact('headOns',v=>'完成正碰'+v+'次'+(m.eccentricHits?'，有效攻击中正碰率'+Math.round(v/m.eccentricHits*100)+'%':'')+'。');fact('headOnBreaks',v=>'通过正碰完成'+v+'次破板。',2);break;
 }
 // Other roles can also cause real detached chunks; retain the shared fragment event.
 if(canCompareDetachedPieces(stats)&&!['lead','frost'].includes(p.role)&&p.largestPieceArea>=64)add(n+'造成的最大脱落板片面积为'+Math.round(p.largestPieceArea)+'像素²。',2);
 }
 return rows;
}
gameHighlightFacts=function(stats){return roleEventCandidates(stats).map(f=>f.text);};
