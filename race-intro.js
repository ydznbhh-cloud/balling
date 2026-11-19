// Once per tournament series; presentation time is never race time.
const raceIntro={active:false,remaining:0,key:null,hidden:false,played:null};
function cancelRaceIntro(){raceIntro.active=false;raceIntro.remaining=0;raceIntro.hidden=false;document.querySelector('#race-intro').hidden=true;document.querySelector('#start').disabled=false;document.querySelector('#speed').disabled=false;}
function beginRaceIntro(kind){
 const state=kind==='allstar'?allstar:tournament;if(!state.active||!state.playing)return;const match=state.matches[state.index];if(!match||match.introPlayed||match.rounds.length>0)return;const key=kind+':'+(match.id??state.index);match.introPlayed=true;saveTournamentProgress();
 cancelRaceIntro();raceIntro.active=true;raceIntro.remaining=2.2;raceIntro.key=key;raceIntro.played=key;running=false;stopSceneLoops();syncDrillSound();
 document.querySelector('#race-intro-stage').textContent=(kind==='allstar'?'全明星冠军赛 · ':'职业四强赛 · ')+(match.group?match.group+' · ':'')+match.name+' · '+(match.target===3?'五局三胜':match.target===2?'三局两胜':'单局淘汰');
 for(const [index,side] of ['left','right'].entries()){const r=roles.find(r=>r.id===selected[index]);document.querySelector('#race-intro-'+side).innerHTML='<span class="orb" style="--accent:'+r.color+'">'+r.icon+'</span><b>'+r.name+'</b><small>'+r.profession+'</small>';}
 const el=document.querySelector('#race-intro');el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';
 // Restart child animations for the next game even when the same two characters meet again.
 for(const selector of ['#race-intro-left','#race-intro-right','.race-intro-vs']){const node=document.querySelector(selector);node.style.animation='none';void node.offsetWidth;node.style.animation='';}
 document.querySelector('#start').disabled=true;document.querySelector('#speed').disabled=true;document.querySelector('#start').textContent='对阵介绍…';document.querySelector('#race-intro-back').focus();
 specialAudioCue('versusIntro',[[220,440,.11,.2,0],[440,660,.09,.22,.15]]);
}
function advanceRaceIntro(dt){
 if(!raceIntro.active)return;
 if(inMenu||winner!==null||!eventKind()){cancelRaceIntro();return;}
 if(document.hidden){raceIntro.hidden=true;return;}if(raceIntro.hidden){raceIntro.hidden=false;return;}
 raceIntro.remaining-=Math.max(0,dt);if(raceIntro.remaining>1e-6)return;
 cancelRaceIntro();toggle();document.querySelector('#start').focus();
}
const resetBeforeIntro=reset;reset=function(){cancelRaceIntro();resetBeforeIntro();};
const cupBeforeIntro=startCupRound;startCupRound=function(...args){cupBeforeIntro(...args);if(tournament.playing)beginRaceIntro('cup');};
const starBeforeIntro=startAllstarGame;startAllstarGame=function(...args){starBeforeIntro(...args);if(allstar.playing)beginRaceIntro('allstar');};document.querySelector('#allstar-next').onclick=startAllstarGame;
document.querySelector('#race-intro-back').onclick=()=>{const kind=eventKind();cancelRaceIntro();if(kind==='allstar')showAllstarBracket();else if(kind==='cup')showCupBracket();};
