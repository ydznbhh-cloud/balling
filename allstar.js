const allstar={active:false,playing:false,seeds:[],matches:[],losses:[],index:0,serial:0,counted:0,order:[0,1],champion:null};
const starEl=id=>document.querySelector('#'+id);
function starSource(id,outcome='winner'){return {id,outcome}}
function starResolve(source){if(source.seat!==undefined)return source.seat;const m=allstar.matches.find(m=>m.id===source.id);if(!m||m.winner===null)return null;return source.outcome==='winner'?m.winner:m.seats.find(s=>s!==m.winner);}
function starAddRound(group,label,pairs,target=2){return pairs.map((sources,i)=>{const id=group+'-'+label+'-'+i;allstar.matches.push({id,group,label,name:label+(pairs.length>1?' · '+(i+1):''),sources,seats:[null,null],scores:[0,0],target,rounds:[],winner:null});return id;});}
function buildAllstar(){
 if(allstar.seeds.length!==16||new Set(allstar.seeds).size!==16)return;allstar.matches=[];allstar.losses=Array(16).fill(0);allstar.index=0;allstar.champion=null;
 const w1=starAddRound('胜者组','十六强赛',Array.from({length:8},(_,i)=>[{seat:i*2},{seat:i*2+1}]));
 const l1=starAddRound('败者组','第一轮',Array.from({length:4},(_,i)=>[starSource(w1[i*2],'loser'),starSource(w1[i*2+1],'loser')]));
 const w2=starAddRound('胜者组','八强赛',Array.from({length:4},(_,i)=>[starSource(w1[i*2]),starSource(w1[i*2+1])]));
 const l2=starAddRound('败者组','第二轮',Array.from({length:4},(_,i)=>[starSource(l1[i]),starSource(w2[3-i],'loser')]));
 const l3=starAddRound('败者组','第三轮',Array.from({length:2},(_,i)=>[starSource(l2[i*2]),starSource(l2[i*2+1])]));
 const w3=starAddRound('胜者组','四强赛',Array.from({length:2},(_,i)=>[starSource(w2[i*2]),starSource(w2[i*2+1])]));
 const l4=starAddRound('败者组','第四轮',Array.from({length:2},(_,i)=>[starSource(l3[i]),starSource(w3[1-i],'loser')]));
 const l5=starAddRound('败者组','第五轮',[[starSource(l4[0]),starSource(l4[1])]]);
 const w4=starAddRound('胜者组','胜者组决赛',[[starSource(w3[0]),starSource(w3[1])]]);
 const l6=starAddRound('败者组','败者组决赛',[[starSource(l5[0]),starSource(w4[0],'loser')]]);
 starAddRound('总决赛','冠军争夺战',[[starSource(w4[0]),starSource(l6[0])]],3);resolveStarMatches();showAllstarBracket();
}
function resolveStarMatches(){for(const m of allstar.matches)m.seats=m.sources.map(starResolve);allstar.index=allstar.matches.findIndex(m=>m.winner===null&&m.seats.every(s=>s!==null));}
function starName(seat){return seat===null?'等待晋级':cupRole(allstar.seeds[seat]).name;}
function starCard(m){return '<article class="cup-match '+(allstar.matches[allstar.index]===m?'current':'')+'"><h3>'+m.name+' · '+(m.target===3?'五局三胜':'三局两胜')+'</h3>'+m.seats.map((s,i)=>{const r=s===null?null:cupRole(allstar.seeds[s]);return '<div class="cup-row '+(s!==null&&s===m.winner?'won':'')+'">'+(r?'<span class="orb" style="--accent:'+r.color+'">'+r.icon+'</span>':'<span>◇</span>')+'<b>'+starName(s)+(s!==null?' <small>('+allstar.losses[s]+'败)</small>':'')+'</b><strong>'+m.scores[i]+'</strong></div>';}).join('')+'</article>';}
function showAllstarSetup(){
 clearModeSession();hideNavigationPanels();allstar.active=true;allstar.playing=false;allstar.seeds=roles.map(r=>r.id);allstar.matches=[];allstar.champion=null;modeNavigation.mode='versus';modeNavigation.screen='allstar-setup';starEl('lobby').hidden=false;starEl('allstar-panel').hidden=false;starEl('mode-back').hidden=true;starEl('mode-title').textContent='双球竞技 · 全明星冠军赛';starEl('mode-exit').textContent='退出模式 ↗';starEl('allstar-setup').hidden=false;starEl('allstar-bracket').hidden=true;renderStarSeeds();
}
function renderStarSeeds(){starEl('allstar-roster').innerHTML=allstar.seeds.map((id,i)=>{const r=cupRole(id);return '<div class="allstar-entrant"><span class="orb" style="--accent:'+r.color+'">'+r.icon+'</span><span>'+String(i+1).padStart(2,'0')+' '+r.name+'<br><small>'+r.profession+'</small></span></div>';}).join('');starEl('allstar-create').disabled=allstar.seeds.length!==16;}
function showAllstarBracket(){
 running=false;inMenu=true;allstar.playing=false;stopSceneLoops();syncDrillSound();hideNavigationPanels();modeNavigation.mode='versus';modeNavigation.screen='allstar-bracket';starEl('lobby').hidden=false;starEl('allstar-panel').hidden=false;starEl('mode-back').hidden=true;starEl('allstar-setup').hidden=true;starEl('allstar-bracket').hidden=false;resolveStarMatches();
 const complete=allstar.champion!==null,current=allstar.matches[allstar.index];starEl('allstar-summary').textContent=complete?'♜ 全明星冠军：'+starName(allstar.champion):'已完成 '+allstar.matches.filter(m=>m.winner!==null).length+' 轮对阵 · 剩余 '+allstar.losses.filter(n=>n<2).length+' 位选手 · 第二次输掉对阵才淘汰';
 starEl('allstar-current').innerHTML=complete?'<div class="cup-champion">♜ '+starName(allstar.champion)+' 夺冠</div>':starCard(current);starEl('allstar-next').hidden=complete;if(current)starEl('allstar-next').textContent=current.group+' · '+current.name+' · 开始第 '+(current.rounds.length+1)+' 局 →';
 starEl('allstar-tree').innerHTML=['胜者组','败者组','总决赛'].map(group=>{const list=allstar.matches.filter(m=>m.group===group),labels=[...new Set(list.map(m=>m.label))];return '<section class="allstar-group"><h3>'+group+'</h3>'+labels.map(label=>'<section class="allstar-round"><h4>'+label+'</h4>'+list.filter(m=>m.label===label).map(starCard).join('')+'</section>').join('')+'</section>';}).join('');starEl(complete?'allstar-new':'allstar-next').focus();
}
function startAllstarGame(){
 if(!allstar.active||allstar.champion!==null)return;resolveStarMatches();const m=allstar.matches[allstar.index];if(!m)return;allstar.order=m.rounds.length%2?[1,0]:[0,1];selected=allstar.order.map(i=>allstar.seeds[m.seats[i]]);soloMode=false;endlessMode=false;inMenu=false;allstar.playing=true;allstar.serial++;hideNavigationPanels();document.querySelector('main').hidden=false;modeNavigation.mode='versus';modeNavigation.screen='allstar-game';reset();document.querySelector('main p').textContent='全明星 · '+m.group+' · '+m.name+' · '+m.scores.join(' : ')+' · '+(m.target===3?'五局三胜':'三局两胜');starEl('back').textContent='返回全明星赛程';starEl('menu').textContent='查看全明星赛程';starEl('again').textContent='继续全明星赛';toggle();
}
function recordAllstarGame(side){
 const m=allstar.matches[allstar.index],position=allstar.order[side],seat=m.seats[position];m.scores[position]++;m.rounds.push({winner:seat,time,left:selected[0],right:selected[1]});
 if(m.scores[position]>=m.target){m.winner=seat;const loser=m.seats[1-position];allstar.losses[loser]++;
  if(m.group==='总决赛'){
   if(m.label==='冠军争夺战'&&allstar.losses[loser]<2){allstar.matches.push({id:'GF-reset',group:'总决赛',label:'重置决赛',name:'重置决赛',sources:m.seats.map(seat=>({seat})),seats:[...m.seats],scores:[0,0],target:3,rounds:[],winner:null});}
   else allstar.champion=seat;
  }
 }
 return {m,seat};
}
const finishBeforeAllstar=finishRace;finishRace=function(side){
 if(!allstar.active||!allstar.playing)return finishBeforeAllstar(side);if(winner!==null||allstar.counted===allstar.serial)return;finishBeforeAllstar(side);allstar.counted=allstar.serial;allstar.playing=false;const {m,seat}=recordAllstarGame(side);starEl('result-title').textContent=allstar.champion!==null?'♜ '+starName(seat)+' 全明星冠军！':starName(seat)+' 本局获胜';starEl('result-detail').textContent=m.group+' · '+m.name+' · '+m.scores.join(' : ')+' · '+time.toFixed(2)+' 秒';starEl('again').textContent=allstar.champion!==null?'再办一届':'继续全明星赛';starEl('menu').textContent='查看全明星赛程';
};
const clearBeforeAllstar=clearModeSession;clearModeSession=function(){allstar.active=false;allstar.playing=false;allstar.matches=[];allstar.losses=[];allstar.champion=null;clearBeforeAllstar();};
const welcomeBeforeAllstar=showModeWelcome;showModeWelcome=function(mode=modeNavigation.mode){welcomeBeforeAllstar(mode);starEl('allstar-open').hidden=mode!=='versus';};
starEl('allstar-open').onclick=showAllstarSetup;starEl('allstar-create').onclick=buildAllstar;starEl('allstar-shuffle').onclick=()=>{for(let i=allstar.seeds.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allstar.seeds[i],allstar.seeds[j]]=[allstar.seeds[j],allstar.seeds[i]];}renderStarSeeds();};starEl('allstar-next').onclick=startAllstarGame;starEl('allstar-new').onclick=showAllstarSetup;starEl('allstar-close').onclick=()=>showModeWelcome('versus');
for(const id of ['back','menu']){const button=starEl(id),old=button.onclick;button.onclick=()=>allstar.active?showAllstarBracket():old();}
for(const id of ['again','reset']){const button=starEl(id),old=button.onclick;button.onclick=()=>{if(!allstar.active)return old();if(id==='again'&&!allstar.playing){if(allstar.champion!==null)return showAllstarSetup();return showAllstarBracket();}startAllstarGame();};}
