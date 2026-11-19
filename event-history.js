// Historical records and telemetry are observers: never mutate damage, forces or randomness.
const arenaArchive={events:[],error:'',readFailed:false,serial:0,tab:'events',selectedRole:'heavy'};
const archiveKey='ball-arena-event-history-v1';
try{const saved=JSON.parse(localStorage.getItem(archiveKey)||'null');if(saved!==null){if(saved.version!==1||!Array.isArray(saved.events))throw Error('未知档案格式');arenaArchive.events=saved.events.filter(e=>e&&typeof e.id==='string'&&Array.isArray(e.matches)&&Array.isArray(e.entrants));}}catch{arenaArchive.readFailed=true;arenaArchive.error='历史档案读取失败；原有数据未被覆盖。新结果暂存于当前页面，请导出备份。';}
const archiveEl=id=>document.querySelector('#'+id);
function archiveIdentity(state){if(!state.archiveId)state.archiveId='event-'+Date.now()+'-'+(++arenaArchive.serial);return state.archiveId;}
function persistArchive(){if(arenaArchive.readFailed)return false;try{localStorage.setItem(archiveKey,JSON.stringify({version:1,events:arenaArchive.events}));arenaArchive.error='';return true;}catch{arenaArchive.error='浏览器未能保存历史，请导出档案备份；当前页面仍保留结果。';return false;}}
function archiveLabel(id){return roles.find(r=>r.id===id)?.name||'未知角色'}
function escapeArchive(text){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function archiveStandings(kind,state){
 const count=kind==='cup'?4:16,ranks=Array(count).fill(count),final=state.matches.filter(m=>kind==='cup'?m===state.matches[2]:m.group==='总决赛').at(-1),champion=kind==='cup'?final.winner:state.champion;
 for(const m of state.matches){if(m.winner===null)continue;const loser=m.seats.find(s=>s!==m.winner);if(kind==='cup')ranks[loser]=m===state.matches[2]?2:3;else if(m.group==='败者组')ranks[loser]=({'第一轮':13,'第二轮':9,'第三轮':7,'第四轮':5,'第五轮':4,'败者组决赛':3})[m.label]||16;}
 if(final?.winner!==null){ranks[final.seats.find(s=>s!==final.winner)]=2;ranks[champion]=1;}
 return ranks;
}
function completeEventArchive(kind,recovered=false){
 if(!eventComplete(kind))return;const state=kind==='cup'?tournament:allstar,id=archiveIdentity(state);if(arenaArchive.events.some(e=>e.id===id))return;
 const entrants=kind==='cup'?state.entrants.map(e=>e.role):[...state.seeds],matches=JSON.parse(JSON.stringify(state.matches)),finals=matches.filter(m=>kind==='cup'?m.name==='冠军决赛':m.group==='总决赛'),final=finals.at(-1),champion=kind==='cup'?final.winner:state.champion;
 let route='四强淘汰赛夺冠';if(kind==='allstar'){const first=finals[0];route=champion===first.seats[1]?'败者组逆袭夺冠':'胜者组出线夺冠';if(finals.length>1)route+=' · 经重置决赛';}
 const record={id,kind,profession:kind==='cup'?state.profession:null,createdAt:state.createdAt||null,finishedAt:Date.now(),recovered,entrants,champion,runnerUp:final.seats.find(s=>s!==champion),standings:archiveStandings(kind,state),route,matches,config:JSON.parse(JSON.stringify(eventProgress.config[kind]||tuning)),games:matches.reduce((n,m)=>n+m.rounds.length,0)};
 arenaArchive.events.push(record);persistArchive();
}
function archivedSeries(includeCurrent=true){
 const rows=[];for(const e of arenaArchive.events)for(const m of e.matches)if(m.winner!==null)rows.push({event:e.id,a:e.entrants[m.seats[0]],b:e.entrants[m.seats[1]],winner:e.entrants[m.winner]});
 if(includeCurrent){const kind=eventKind(),s=kind==='cup'?tournament:allstar;if(kind&&!arenaArchive.events.some(e=>e.id===s.archiveId)){const ids=kind==='cup'?s.entrants.map(e=>e.role):s.seeds;for(const m of s.matches)if(m.winner!==null)rows.push({event:s.archiveId,a:ids[m.seats[0]],b:ids[m.seats[1]],winner:ids[m.winner]});}}
 return rows;
}
function historicalHeadToHead(a,b,includeCurrent=true){if(a===b)return {total:0,winsA:0,winsB:0};const rows=archivedSeries(includeCurrent).filter(m=>m.a===a&&m.b===b||m.a===b&&m.b===a);return {total:rows.length,winsA:rows.filter(m=>m.winner===a).length,winsB:rows.filter(m=>m.winner===b).length};}
function eventContextFacts(kind,match){
 const state=kind==='cup'?tournament:allstar,ids=kind==='cup'?state.entrants.map(e=>e.role):state.seeds,a=ids[match.seats[0]],b=ids[match.seats[1]],facts=[],past=historicalHeadToHead(a,b);
 if(a===b)facts.push('同角色对决，双方采用相同参数。');else if(past.total)facts.push('双方第'+(past.total+1)+'次交手：此前'+archiveLabel(a)+' '+past.winsA+'胜，'+archiveLabel(b)+' '+past.winsB+'胜（按整轮对阵统计）。');
 if(kind==='allstar'&&match.label==='冠军争夺战')facts.push(archiveLabel(ids[match.seats[1]])+'从败者组晋级；本轮取胜将触发重置决赛。');
 if(match.label==='重置决赛')facts.push('双方均已失利一轮，本轮胜者夺冠。');
 for(const id of new Set([a,b])){const wins=arenaArchive.events.filter(e=>e.entrants[e.champion]===id).length;if(wins)facts.push(archiveLabel(id)+'已获'+wins+'届赛事冠军。');}
 return facts.slice(0,3);
}
const raceTelemetry={balls:new WeakMap(),seen:new WeakSet()};
function telemetryActive(){return !!eventKind()&&!eventProgress.restoring&&(tournament.playing||allstar.playing)}
function playerTelemetry(b){let value=raceTelemetry.balls.get(b);if(!value){value={role:b.role,assembled:0,surgeAttempts:0,surgeHits:0,largestPieceArea:0};raceTelemetry.balls.set(b,value);}return value;}
function observePiece(b,d,area){if(!telemetryActive()||raceTelemetry.seen.has(d))return;raceTelemetry.seen.add(d);playerTelemetry(b).largestPieceArea=Math.max(playerTelemetry(b).largestPieceArea,area);}
const flightsBeforeArchive=tickScrapFlights;tickScrapFlights=function(b,dt){const pending=[...b.special.scrapFlights];flightsBeforeArchive(b,dt);if(telemetryActive())for(const f of pending)if(f.delivered)playerTelemetry(b).assembled++;};
const surgeBeforeArchive=tryTideSurge;tryTideSurge=function(b,targets){const ok=surgeBeforeArchive(b,targets);if(ok&&telemetryActive()){const caster=lanes.find(o=>o!==b&&o.role==='tide');if(caster){const stats=playerTelemetry(caster),jet=tideState(b).surges.at(-1);stats.surgeAttempts++;if(jet&&!jet.missed)stats.surgeHits++;}}return ok;};
const islandsBeforeArchive=detachLeadIslands;detachLeadIslands=function(b,...args){const start=b.special.debris.length,result=islandsBeforeArchive(b,...args);for(const d of b.special.debris.slice(start))observePiece(b,d,d.points.length*4);return result;};
const slabBeforeArchive=releaseTideSlab;releaseTideSlab=function(b,...args){const start=b.special.debris.length,result=slabBeforeArchive(b,...args);for(const d of b.special.debris.slice(start))observePiece(b,d,d.points.length*4);return result;};
const bendBeforeArchive=tickBending;tickBending=function(b,...args){const result=bendBeforeArchive(b,...args);if(telemetryActive())for(const p of b.special.boards)for(const d of p.bend.drop)observePiece(b,d,d.segments.length*11.5*30);return result;};
function snapshotRaceTelemetry(){return {version:1,players:lanes.map(b=>({...playerTelemetry(b)}))};}
function canCompareDetachedPieces(stats){const capable=['lead','magnet','tide','gravity','frost'];return stats?.players?.length===2&&stats.players.every(p=>capable.includes(p.role));}
function gameHighlightFacts(stats){const facts=[];if(!stats?.players)return facts;
 for(const p of stats.players){if(p.assembled>0)facts.push(archiveLabel(p.role)+'成功拼成'+p.assembled+'块障碍板。');if(p.surgeAttempts>0)facts.push(archiveLabel(p.role)+'逆潮命中'+p.surgeHits+'/'+p.surgeAttempts+'次。');}
 const piece=stats.players.reduce((best,p)=>p.largestPieceArea>(best?.largestPieceArea||0)?p:best,null);if(canCompareDetachedPieces(stats)&&piece?.largestPieceArea>=64)facts.push('最大脱落板片来自'+archiveLabel(piece.role)+'，面积'+Math.round(piece.largestPieceArea)+'像素²。');return facts;
}
function finishEventFacts(kind,match,stats){
 const candidates=typeof roleEventCandidates==='function'?roleEventCandidates(stats):gameHighlightFacts(stats).map(text=>({text,priority:1}));if(match.winner!==null&&match.rounds.length===match.target*2-1)candidates.push({text:'本轮打满'+(match.target===3?'五':'三')+'小局，比分'+match.scores.join('∶')+'。',priority:2});
 const priority=Math.max(0,...candidates.map(f=>f.priority)),facts=candidates.filter(f=>f.priority===priority).map(f=>f.text);
 const node=archiveEl('race-facts');node.hidden=!facts.length;
 // Pick only from recorded facts; use UI randomness independently of battle randomness.
 let selected=0;if(facts.length>1){const random=globalThis.crypto?.getRandomValues?globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296:Math.random();selected=Math.floor(random*facts.length);}
 node.innerHTML=facts.length?'<p>'+escapeArchive(facts[selected])+'</p>':'';
}
const resetBeforeArchive=reset;reset=function(){resetBeforeArchive();archiveEl('race-facts').hidden=true;archiveEl('race-facts').innerHTML='';};
const cupCreateBeforeArchive=createCup;createCup=function(){cupCreateBeforeArchive();if(!eventProgress.restoring&&tournament.matches.length){tournament.archiveId=null;archiveIdentity(tournament);tournament.createdAt=Date.now();saveTournamentProgress();}};archiveEl('cup-create').onclick=createCup;
const starBuildBeforeArchive=buildAllstar;buildAllstar=function(){starBuildBeforeArchive();if(!eventProgress.restoring&&allstar.matches.length){allstar.archiveId=null;archiveIdentity(allstar);allstar.createdAt=Date.now();saveTournamentProgress();}};archiveEl('allstar-create').onclick=buildAllstar;
const clearBeforeArchive=clearModeSession;clearModeSession=function(){clearBeforeArchive();tournament.archiveId=null;tournament.createdAt=null;allstar.archiveId=null;allstar.createdAt=null;};
const finishBeforeArchive=finishRace;finishRace=function(side){
 const kind=eventKind(),state=kind==='cup'?tournament:allstar,match=kind?state.matches[state.index]:null,before=winner,stats=kind?snapshotRaceTelemetry():null;if(stats&&lanes[side])stats.victory={role:lanes[side].role,time};finishBeforeArchive(side);
 if(!kind||before!==null||winner===null||!match)return;const round=match.rounds.at(-1);if(round)round.stats=stats;finishEventFacts(kind,match,stats);completeEventArchive(kind);saveTournamentProgress();
};
const resumeBeforeArchive=resumeTournament;resumeTournament=function(kind){resumeBeforeArchive(kind);if(eventKind()===kind){const s=kind==='cup'?tournament:allstar;archiveIdentity(s);completeEventArchive(kind,true);saveTournamentProgress();}};
for(const kind of ['cup','allstar'])archiveEl('resume-'+kind).onclick=()=>resumeTournament(kind);
const introBeforeArchive=beginRaceIntro;beginRaceIntro=function(kind){const wasActive=raceIntro.active;introBeforeArchive(kind);if(raceIntro.active&&!wasActive){const s=kind==='cup'?tournament:allstar,node=archiveEl('race-intro-context'),facts=eventContextFacts(kind,s.matches[s.index]);node.textContent=facts.join('\n');node.hidden=!facts.length;raceIntro.remaining+=facts.length*3;}};
function archiveRoleStats(id){let starts=0,titles=0,best=null;for(const e of arenaArchive.events){const seats=e.entrants.flatMap((r,i)=>r===id?[i]:[]);if(!seats.length)continue;starts++;if(e.entrants[e.champion]===id)titles++;const rank=Math.min(...seats.map(i=>e.standings[i]));best=best===null?rank:Math.min(best,rank);}return {starts,titles,best};}
function renderArchiveEvents(){
 const list=[...arenaArchive.events].reverse();archiveEl('archive-events').innerHTML=list.length?list.map(e=>{const final=e.matches.filter(m=>e.kind==='cup'?m.name==='冠军决赛':m.group==='总决赛').at(-1);return '<article class="archive-event"><h3>♜ '+escapeArchive(archiveLabel(e.entrants[e.champion]))+' · '+(e.kind==='cup'?escapeArchive(e.profession)+'四强冠军':'全明星冠军')+'</h3><div class="archive-meta"><span>'+escapeArchive(e.route)+'</span><span>'+e.games+'小局</span><span>决赛 '+final.scores.join('∶')+'</span><span>'+new Date(e.finishedAt).toLocaleString('zh-CN')+(e.recovered?'（存档补录）':'')+'</span></div><p>亚军：'+escapeArchive(archiveLabel(e.entrants[e.runnerUp]))+'</p><button data-archive-event="'+escapeArchive(e.id)+'">查看完整赛果</button></article>';}).join(''):'<p class="archive-empty">还没有完整赛事记录。完成一届四强赛或全明星赛后，冠军与赛果会自动收入档案。已有存档可继续完成；旧赛事不会凭空生成。</p>';
}
function renderArchiveRole(id=arenaArchive.selectedRole){
 arenaArchive.selectedRole=id;const s=archiveRoleStats(id),opponents=roles.filter(r=>r.id!==id).map(r=>({r,h:historicalHeadToHead(id,r.id,false)})).filter(x=>x.h.total);
 archiveEl('archive-profile').innerHTML='<h3>'+escapeArchive(archiveLabel(id))+'</h3><div class="archive-stat-grid"><div><strong>'+s.starts+'</strong><span>完整赛事参赛届数</span></div><div><strong>'+s.titles+'</strong><span>冠军次数</span></div><div><strong>'+(s.best===null?'—':s.best)+'</strong><span>最好名次</span></div></div><p>四强半决赛败者并列第三；双败赛同轮淘汰按并列名次记录。同角色多个席位按一届参赛计。</p>'+(opponents.length?'<div class="archive-table-wrap"><table class="archive-table"><thead><tr><th>对手</th><th>对阵次数</th><th>胜</th><th>负</th></tr></thead><tbody>'+opponents.map(({r,h})=>'<tr><td>'+escapeArchive(r.name)+'</td><td>'+h.total+'</td><td>'+h.winsA+'</td><td>'+h.winsB+'</td></tr>').join('')+'</tbody></table></div>':'<p class="archive-empty">暂无完整赛事的交手记录。</p>');
}
function showArchiveDetail(id){
 const e=arenaArchive.events.find(e=>e.id===id);if(!e)return;archiveEl('archive-events').hidden=true;archiveEl('archive-roles').hidden=true;const node=archiveEl('archive-detail');node.hidden=false;
 const eventRows=e.matches.map(m=>m.rounds.map((r,i)=>{const facts=gameHighlightFacts(r.stats);return facts.length?'<article class="archive-event"><b>'+escapeArchive(m.name)+' · 第'+(i+1)+'小局</b><p>'+facts.map(escapeArchive).join('<br>')+'</p></article>':'';}).join('')).join('');
 node.innerHTML='<h3>'+escapeArchive(archiveLabel(e.entrants[e.champion]))+'的冠军之路</h3><p>'+escapeArchive(e.route)+' · '+e.games+'小局</p><div class="archive-table-wrap"><table class="archive-table"><thead><tr><th>名次</th><th>选手</th><th>席位</th></tr></thead><tbody>'+e.entrants.map((id,i)=>({id,seat:i,rank:e.standings[i]})).sort((a,b)=>a.rank-b.rank).map(p=>'<tr><td>'+p.rank+'</td><td>'+escapeArchive(archiveLabel(p.id))+'</td><td>'+(p.seat+1)+'</td></tr>').join('')+'</tbody></table></div><div class="archive-table-wrap"><table class="archive-table"><thead><tr><th>轮次</th><th>双方</th><th>比分</th><th>获胜</th><th>小局用时</th></tr></thead><tbody>'+e.matches.map(m=>'<tr><td>'+escapeArchive((m.group||'')+' '+m.name)+'</td><td>'+m.seats.map(s=>escapeArchive(archiveLabel(e.entrants[s]))).join(' / ')+'</td><td>'+m.scores.join('∶')+'</td><td>'+escapeArchive(archiveLabel(e.entrants[m.winner]))+'</td><td>'+m.rounds.map(r=>r.time.toFixed(2)+'s').join(' / ')+'</td></tr>').join('')+'</tbody></table></div>'+(eventRows?'<h3>真实事件记录</h3>'+eventRows:'');
}
function showEventHistory(){
 clearModeSession();hideNavigationPanels();modeNavigation.mode='versus';modeNavigation.screen='history';archiveEl('lobby').hidden=false;archiveEl('event-history-panel').hidden=false;archiveEl('mode-back').hidden=true;archiveEl('mode-title').textContent='赛事历史与选手档案';archiveEl('mode-exit').textContent='返回主菜单 ↗';archiveEl('archive-events').hidden=false;archiveEl('archive-roles').hidden=true;archiveEl('archive-detail').hidden=true;archiveEl('archive-storage-status').textContent=arenaArchive.error||'档案保存在本机浏览器，建议定期导出备份。';archiveEl('archive-role').innerHTML=roles.map(r=>'<option value="'+r.id+'" '+(r.id===arenaArchive.selectedRole?'selected':'')+'>'+r.name+'</option>').join('');renderArchiveEvents();renderArchiveRole();
}
const welcomeBeforeArchive=showModeWelcome;showModeWelcome=function(...args){welcomeBeforeArchive(...args);archiveEl('event-history-open').hidden=modeNavigation.mode!=='versus';};
archiveEl('event-history-open').onclick=showEventHistory;archiveEl('archive-close').onclick=()=>showModeWelcome('versus');
archiveEl('archive-events-tab').onclick=()=>{archiveEl('archive-events').hidden=false;archiveEl('archive-roles').hidden=true;archiveEl('archive-detail').hidden=true;renderArchiveEvents();};
archiveEl('archive-roles-tab').onclick=()=>{archiveEl('archive-events').hidden=true;archiveEl('archive-roles').hidden=false;archiveEl('archive-detail').hidden=true;renderArchiveRole();};
archiveEl('archive-role').onchange=e=>{if(roles.some(r=>r.id===e.target.value))renderArchiveRole(e.target.value);};
archiveEl('archive-events').onclick=e=>{const el=e.target.closest('[data-archive-event]');if(el)showArchiveDetail(el.dataset.archiveEvent);};
archiveEl('archive-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,events:arenaArchive.events},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='弹球竞技场-赛事档案.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
