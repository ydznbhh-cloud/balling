// Persist completed games, reconstruct bracket state; unfinished games restart fairly.
const eventProgress={restoring:false,config:{cup:null,allstar:null},auto:{active:false,remaining:0,kind:null}};
function eventKind(){return allstar.active&&allstar.matches.length?'allstar':tournament.active&&tournament.matches.length?'cup':null}
function eventComplete(kind){return kind==='allstar'?allstar.champion!==null:tournament.matches[2]?.winner!==null}
function eventKey(kind){return 'ball-arena-event-'+kind+'-v1'}
function eventSaveData(kind){
 const state=kind==='allstar'?allstar:tournament;
 return {version:1,kind,archiveId:state.archiveId,createdAt:state.createdAt,lastEventKey:state.lastEventKey,updatedAt:Date.now(),config:eventProgress.config[kind]||{...tuning},introduced:state.matches.flatMap((m,i)=>m.introPlayed?[kind==='allstar'?m.id:i]:[]),seeds:kind==='allstar'?[...allstar.seeds]:undefined,profession:kind==='cup'?tournament.profession:undefined,entrants:kind==='cup'?tournament.entrants.map(e=>e.role):undefined,games:state.matches.flatMap((m,i)=>m.rounds.map(r=>({match:kind==='allstar'?m.id:i,winner:r.winner,time:r.time,stats:r.stats}))),complete:eventComplete(kind)};
}
function readEventSave(kind){try{const raw=localStorage.getItem(eventKey(kind));if(!raw)return null;const data=JSON.parse(raw);if(data.version!==1||data.kind!==kind||!Array.isArray(data.games)||data.games.length>200)return null;return data;}catch{return null;}}
function saveTournamentProgress(){
 if(eventProgress.restoring)return false;const kind=eventKind();if(!kind)return false;
 try{localStorage.setItem(eventKey(kind),JSON.stringify(eventSaveData(kind)));document.querySelector('#'+(kind==='cup'?'cup':'allstar')+'-save-status').textContent='已自动存档 · 已完成的小局与晋级已保存';return true;}
 catch{document.querySelector('#'+(kind==='cup'?'cup':'allstar')+'-save-status').textContent='当前浏览器无法保存，请保持页面打开';return false;}
}
function renderEventSaves(){
 const visible=modeNavigation.mode==='versus'&&modeNavigation.screen==='welcome';document.querySelector('#event-saves').hidden=!visible;
 for(const kind of ['cup','allstar']){const data=readEventSave(kind),button=document.querySelector('#resume-'+kind);button.hidden=!visible||!data;if(data)button.textContent=(data.complete?'查看上届':'继续上次')+(kind==='cup'?'四强赛':'全明星赛')+' · '+data.games.length+' 小局';}
}
function renderEventContinueStatus(message=''){const button=document.querySelector('#again'),base=String(button.textContent||'').replace(/（[^（）]*(?:自动继续|点击继续)[^（）]*）$/,'');button.textContent=base+(message?'（'+message+'）':'');const label=document.querySelector('#event-auto-countdown');label.hidden=true;label.textContent=message;}
function cancelTournamentAuto(message=''){const a=eventProgress.auto;a.active=false;a.remaining=0;a.kind=null;const label=document.querySelector('#event-auto-countdown');label.hidden=true;label.textContent=message;renderEventContinueStatus(message);}
function startTournamentAuto(kind){cancelTournamentAuto();if(!kind||eventComplete(kind))return;eventProgress.auto={active:true,remaining:5,kind};const label=document.querySelector('#event-auto-countdown');label.hidden=true;label.textContent='5秒后自动继续';renderEventContinueStatus('5秒后自动继续');}
function continueTournamentNow(){const kind=eventKind();cancelTournamentAuto();if(!kind||eventComplete(kind))return;kind==='allstar'?startAllstarGame():startCupRound();}
function tickTournamentAuto(dt){const a=eventProgress.auto;if(!a.active)return;if(document.hidden||eventKind()!==a.kind||document.querySelector('#result').hidden){cancelTournamentAuto();return;}a.remaining=Math.max(0,a.remaining-Math.max(0,dt));const label=document.querySelector('#event-auto-countdown'),text=Math.ceil(a.remaining)+'秒后自动继续';if(label.textContent!==text){label.textContent=text;renderEventContinueStatus(text);}if(a.remaining<=0)continueTournamentNow();}
function resumeTournament(kind){
 const data=readEventSave(kind);if(!data)return;cancelTournamentAuto();eventProgress.restoring=true;
 try{
  const savedConfig=validateTuning(data.config);eventProgress.config[kind]=savedConfig;
  if(kind==='cup'){
   if(!Object.hasOwn(professions,data.profession)||!Array.isArray(data.entrants)||data.entrants.length!==4||data.entrants.some(id=>!roles.some(r=>r.id===id&&r.profession===data.profession)))throw Error('四强赛阵容无效');
   showCupSetup();setCupProfession(data.profession);tournament.entrants=data.entrants.map((role,id)=>({id,role}));createCup();
   for(const game of data.games){const m=tournament.matches[tournament.index];if(game.match!==tournament.index||m.winner!==null||!m.seats.includes(game.winner)||!Number.isFinite(game.time)||game.time<0)throw Error('四强赛比分无效');const pos=m.seats.indexOf(game.winner);m.scores[pos]++;m.rounds.push({winner:game.winner,time:game.time,stats:game.stats});if(m.scores[pos]>=m.target){m.winner=game.winner;if(tournament.index<2){tournament.matches[2].seats[tournament.index]=game.winner;tournament.index++;}}}
   for(let i=0;i<tournament.matches.length;i++)if(data.introduced?.includes(i))tournament.matches[i].introPlayed=true;showCupBracket();
  }else{
   if(!Array.isArray(data.seeds)||data.seeds.length<2||data.seeds.length>16||new Set(data.seeds).size!==data.seeds.length||data.seeds.some(id=>!roles.some(r=>r.id===id)))throw Error('全明星阵容无效');
   showAllstarSetup();allstar.seeds=[...data.seeds];buildAllstar();
   const previousTime=time;
   try{for(const game of data.games){resolveStarMatches();const m=allstar.matches[allstar.index];if(!m||m.id!==game.match||!m.seats.includes(game.winner)||!Number.isFinite(game.time)||game.time<0)throw Error('全明星比分无效');allstar.order=m.rounds.length%2?[1,0]:[0,1];selected=allstar.order.map(i=>allstar.seeds[m.seats[i]]);time=game.time;recordAllstarGame(allstar.order.indexOf(m.seats.indexOf(game.winner)));m.rounds.at(-1).stats=game.stats;}}finally{time=previousTime;}
   for(const m of allstar.matches)if(data.introduced?.includes(m.id))m.introPlayed=true;showAllstarBracket();
  }
  const state=kind==='allstar'?allstar:tournament;state.archiveId=data.archiveId;state.createdAt=data.createdAt;state.lastEventKey=typeof data.lastEventKey==='string'?data.lastEventKey:null;document.querySelector('#'+(kind==='cup'?'cup':'allstar')+'-save-status').textContent='存档已恢复 · 从下一小局继续，沿用赛事创建时参数';
 }catch(error){showModeWelcome('versus');document.querySelector('#event-save-message').textContent='存档无法恢复：'+error.message+'。可以重新组建赛事。';}
 finally{eventProgress.restoring=false;}
}
const createBeforeSave=createCup;createCup=function(){if(!eventProgress.restoring)eventProgress.config.cup={...tuning};createBeforeSave();saveTournamentProgress();};document.querySelector('#cup-create').onclick=createCup;
const buildBeforeSave=buildAllstar;buildAllstar=function(){if(!eventProgress.restoring)eventProgress.config.allstar={...tuning};buildBeforeSave();saveTournamentProgress();};document.querySelector('#allstar-create').onclick=buildAllstar;
function startSavedEvent(kind,fn,args){cancelTournamentAuto();const original=tuning;try{if(eventProgress.config[kind])tuning={...eventProgress.config[kind]};fn(...args);}finally{tuning=original;}saveTournamentProgress();}
const startCupBeforeSave=startCupRound;startCupRound=function(...args){startSavedEvent('cup',startCupBeforeSave,args);};
const startStarBeforeSave=startAllstarGame;startAllstarGame=function(...args){startSavedEvent('allstar',startStarBeforeSave,args);};document.querySelector('#allstar-next').onclick=startAllstarGame;
const finishBeforeSave=finishRace;finishRace=function(side){const before=winner,kind=eventKind();finishBeforeSave(side);if(before===null&&winner!==null&&kind){saveTournamentProgress();startTournamentAuto(kind);}};
const clearBeforeSave=clearModeSession;clearModeSession=function(){cancelTournamentAuto();saveTournamentProgress();clearBeforeSave();};
const welcomeBeforeSave=showModeWelcome;showModeWelcome=function(...args){welcomeBeforeSave(...args);renderEventSaves();};
for(const id of ['menu','back']){const b=document.querySelector('#'+id),old=b.onclick;b.onclick=()=>{cancelTournamentAuto();saveTournamentProgress();old();};}
const againBeforeSave=document.querySelector('#again').onclick;document.querySelector('#again').onclick=()=>{const kind=eventKind();if(kind&&!eventComplete(kind))return continueTournamentNow();cancelTournamentAuto();againBeforeSave();};
for(const kind of ['cup','allstar'])document.querySelector('#resume-'+kind).onclick=()=>resumeTournament(kind);
for(const event of ['pointerdown','keydown','wheel','input','change'])document.addEventListener(event,()=>{if(eventProgress.auto.active)cancelTournamentAuto('自动继续已取消');},{capture:true,passive:event==='wheel'});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelTournamentAuto('自动继续已暂停，点击继续');});
