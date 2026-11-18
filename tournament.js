// Bracket state lives outside the race world; every match still uses native reset/update/draw.
const tournament={active:false,playing:false,profession:'强袭者',entrants:[],matches:[],index:0,order:[0,1],serial:0,lastCounted:0};
const cupElement=id=>document.querySelector('#'+id);
const cupRole=id=>roles.find(r=>r.id===id);
function cupCandidates(){return roles.filter(r=>r.profession===tournament.profession)}
function renderCupEntrants(){
 const candidates=cupCandidates();cupElement('cup-entrants').innerHTML=Array.from({length:4},(_,i)=>{const id=tournament.entrants[i]?.role||candidates[i%candidates.length].id,r=cupRole(id);return '<label class="cup-entrant"><span>席位 '+(i+1)+'</span><span class="orb" style="--accent:'+r.color+'">'+r.icon+'</span><select data-cup-slot="'+i+'" aria-label="席位'+(i+1)+'角色">'+candidates.map(c=>'<option value="'+c.id+'" '+(c.id===id?'selected':'')+'>'+c.name+'</option>').join('')+'</select></label>';}).join('');
}
function setCupProfession(value){tournament.profession=Object.hasOwn(professions,value)?value:'强袭者';const list=cupCandidates();tournament.entrants=Array.from({length:4},(_,i)=>({id:i,role:list[i%list.length].id}));renderCupEntrants();}
function showCupSetup(){
 clearModeSession();hideNavigationPanels();modeNavigation.mode='versus';modeNavigation.screen='cup-setup';tournament.active=true;tournament.playing=false;tournament.matches=[];tournament.index=0;
 cupElement('lobby').hidden=false;cupElement('tournament-panel').hidden=false;cupElement('mode-back').hidden=true;cupElement('mode-title').textContent='双球竞技 · 职业冠军赛';cupElement('mode-exit').textContent='退出模式 ↗';cupElement('cup-setup').hidden=false;cupElement('cup-bracket').hidden=true;
 cupElement('cup-profession').innerHTML=Object.keys(professions).map(p=>'<option '+(p===tournament.profession?'selected':'')+'>'+p+'</option>').join('');setCupProfession(tournament.profession);
}
function createCup(){
 const candidates=cupCandidates();if(tournament.entrants.length!==4||tournament.entrants.some(e=>!candidates.some(r=>r.id===e.role)))return;
 tournament.matches=[{name:'半决赛 A',seats:[0,1],scores:[0,0],target:1,winner:null,rounds:[]},{name:'半决赛 B',seats:[2,3],scores:[0,0],target:1,winner:null,rounds:[]},{name:'冠军决赛',seats:[null,null],scores:[0,0],target:2,winner:null,rounds:[]}];tournament.index=0;showCupBracket();
}
function cupEntrantLabel(seat){if(seat===null)return '等待晋级';const e=tournament.entrants[seat];return cupRole(e.role).name+' · '+(seat+1)+'号';}
function cupMatchHTML(match,index){return '<article class="cup-match '+(index===tournament.index?'current ':'')+(index===2?'final':'')+'"><h3>'+match.name+'</h3>'+match.seats.map((seat,i)=>{const role=seat===null?null:cupRole(tournament.entrants[seat].role);return '<div class="cup-row '+(seat!==null&&match.winner===seat?'won':'')+'">'+(role?'<span class="orb" style="--accent:'+role.color+'">'+role.icon+'</span>':'<span>◇</span>')+'<b>'+cupEntrantLabel(seat)+'</b><strong>'+match.scores[i]+'</strong></div>';}).join('')+'<div class="cup-round-note">'+(match.target===1?'单局淘汰':'三局两胜 · 每局交换左右侧')+'</div>'+(index===2&&match.winner!==null?'<div class="cup-champion">♜ 冠军：'+cupEntrantLabel(match.winner)+'</div>':'')+'</article>';}
function showCupBracket(){
 running=false;inMenu=true;tournament.playing=false;stopSceneLoops();syncDrillSound();hideNavigationPanels();modeNavigation.mode='versus';modeNavigation.screen='cup-bracket';cupElement('lobby').hidden=false;cupElement('tournament-panel').hidden=false;cupElement('mode-back').hidden=true;cupElement('mode-title').textContent='双球竞技 · 职业冠军赛';cupElement('cup-setup').hidden=true;cupElement('cup-bracket').hidden=false;
 const [a,b,final]=tournament.matches;cupElement('cup-tree').innerHTML=cupMatchHTML(a,0)+cupMatchHTML(final,2)+cupMatchHTML(b,1);
 const complete=final.winner!==null,current=tournament.matches[tournament.index];cupElement('cup-next').hidden=complete;cupElement('cup-next').textContent=current.name+' · 开始第 '+(current.rounds.length+1)+' 局 →';cupElement('cup-status').textContent=complete?'本届冠军已决出，可重新组建下一届赛事。':current.name+'：'+cupEntrantLabel(current.seats[0])+' VS '+cupEntrantLabel(current.seats[1]);cupElement(complete?'cup-new':'cup-next').focus();
}
function startCupRound(restart=false){
 if(!tournament.active||!tournament.matches.length)return;const match=tournament.matches[tournament.index];if(match.winner!==null||match.seats.some(s=>s===null))return;
 tournament.order=match.rounds.length%2?[1,0]:[0,1];selected=tournament.order.map(i=>tournament.entrants[match.seats[i]].role);soloMode=false;endlessMode=false;endlessDead=false;inMenu=false;tournament.playing=true;tournament.serial++;
 hideNavigationPanels();modeNavigation.mode='versus';modeNavigation.screen='cup-game';document.querySelector('main').hidden=false;reset();document.querySelector('main p').textContent=tournament.profession+' · '+match.name+' · 第 '+(match.rounds.length+1)+' 局 · '+match.scores.join(' : ');cupElement('back').textContent='返回赛事对阵';cupElement('again').textContent='继续赛事';cupElement('menu').textContent='查看赛事对阵';toggle();
}
const finishBeforeCup=finishRace;
finishRace=function(side){
 if(!tournament.active||!tournament.playing)return finishBeforeCup(side);if(winner!==null||tournament.lastCounted===tournament.serial)return;
 finishBeforeCup(side);tournament.lastCounted=tournament.serial;tournament.playing=false;
 const match=tournament.matches[tournament.index],position=tournament.order[side],seat=match.seats[position];match.scores[position]++;match.rounds.push({winner:seat,time,left:selected[0],right:selected[1]});
 if(match.scores[position]>=match.target){match.winner=seat;if(tournament.index<2){tournament.matches[2].seats[tournament.index]=seat;tournament.index++;}}
 cupElement('result-title').textContent=cupEntrantLabel(seat)+' 本局获胜';cupElement('result-detail').textContent=match.name+' · '+match.scores.join(' : ')+' · '+time.toFixed(2)+' 秒';
 if(tournament.matches[2].winner!==null){cupElement('result-title').textContent='♜ '+cupEntrantLabel(seat)+' 夺冠！';cupElement('again').textContent='再办一届';}else cupElement('again').textContent='继续赛事';cupElement('menu').textContent='查看赛事对阵';
};
const clearBeforeCup=clearModeSession;clearModeSession=function(){tournament.active=false;tournament.playing=false;tournament.profession='强袭者';tournament.entrants=[];tournament.matches=[];tournament.index=0;clearBeforeCup();};
const welcomeBeforeCup=showModeWelcome;showModeWelcome=function(mode=modeNavigation.mode){welcomeBeforeCup(mode);cupElement('tournament-open').hidden=mode!=='versus';if(mode==='versus')cupElement('mode-begin').textContent='自由对战选角 →';else cupElement('mode-begin').textContent='开始选角 →';};
cupElement('tournament-open').onclick=showCupSetup;cupElement('cup-profession').onchange=e=>setCupProfession(e.target.value);
cupElement('cup-entrants').onchange=e=>{const slot=Number(e.target.dataset.cupSlot),id=e.target.value;if(Number.isInteger(slot)&&slot>=0&&slot<4&&cupCandidates().some(r=>r.id===id)){tournament.entrants[slot].role=id;renderCupEntrants();}};
cupElement('cup-create').onclick=createCup;cupElement('cup-next').onclick=()=>startCupRound();cupElement('cup-new').onclick=showCupSetup;cupElement('cup-close').onclick=()=>showModeWelcome('versus');
for(const id of ['back','menu']){const button=cupElement(id),old=button.onclick;button.onclick=()=>tournament.active?showCupBracket():old();}
for(const id of ['again','reset']){const button=cupElement(id),old=button.onclick;button.onclick=()=>{if(!tournament.active)return old();if(id==='again'&&!tournament.playing){if(tournament.matches[2].winner!==null)return showCupSetup();showCupBracket();return;}startCupRound(true);};}
