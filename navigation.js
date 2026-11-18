// Mode ownership stays explicit; results never infer a mode from death flags.
const modeNavigation={mode:null,screen:'home',sessionRoles:null};
const modeDefinitions={
  versus:{name:'双球竞技',symbol:'VS',description:'两位选手，同场较量。选择双方角色，率先突破八层障碍。',rules:['双人同场','自由搭配角色','率先抵达终点获胜']},
  solo:{name:'单球计时',symbol:'◷',description:'专注一位角色，挑战八层障碍，刷新你的最佳通关时间。',rules:['独立赛道','按游戏时间计时','不同参数分别记录成绩']},
  endless:{name:'无尽模式',symbol:'∞',description:'向下逃离不断逼近的锯齿，突破八层后迎接更坚固的下一关。',rules:['逐关增强','躲避上方锯齿','挑战最高关卡']}
};
const navigationElement=selector=>document.querySelector(selector);
const openDeveloperFields=navigationElement('#dev-open').onclick;
function hideNavigationPanels(){
  for(const selector of ['#home-screen','#lobby','main','#result','.pickers','#solo-panel','#rank-panel','#developer','#mode-welcome'])navigationElement(selector).hidden=true;
  navigationElement('#lobby').classList.remove('solo-selecting','ranking-view');
}
function clearModeSession(){
  running=false;inMenu=true;soloMode=false;endlessMode=false;endlessSelecting=false;
  endlessStage=1;endlessElapsed=0;endlessDead=false;stagePause=0;sawY=80;
  selected=['heavy','root'];activeSide=0;versusProfession='全部';soloProfession='全部';soloSelection=null;
  modeNavigation.sessionRoles=null;
  navigationElement('#speed').value='1';
  navigationElement('#solo-panel').dataset.mode='';
  navigationElement('#solo-info').hidden=true;
  navigationElement('#solo-hero').hidden=true;
  navigationElement('#solo-stage').classList.remove('has-selection');
  navigationElement('#solo-launch').disabled=true;
  navigationElement('#solo-launch').textContent='选择角色后开始挑战';
  reset();syncDrillSound();stopSceneLoops();
}
function showArenaHome(){
  clearModeSession();hideNavigationPanels();
  modeNavigation.mode=null;modeNavigation.screen='home';
  navigationElement('#home-screen').hidden=false;
  navigationElement('#home-versus').focus();
}
function showModeWelcome(mode=modeNavigation.mode){
  if(!modeDefinitions[mode])return showArenaHome();
  clearModeSession();hideNavigationPanels();
  modeNavigation.mode=mode;modeNavigation.screen='welcome';
  const definition=modeDefinitions[mode];
  navigationElement('#lobby').hidden=false;
  navigationElement('#mode-welcome').hidden=false;
  navigationElement('#mode-back').hidden=true;
  navigationElement('#mode-title').textContent=definition.name;
  navigationElement('#mode-welcome-symbol').textContent=definition.symbol;
  navigationElement('#mode-welcome-title').textContent=definition.name;
  navigationElement('#mode-welcome-description').textContent=definition.description;
  navigationElement('#mode-rules').innerHTML=definition.rules.map(rule=>'<span>'+rule+'</span>').join('');
  navigationElement('#mode-begin').focus();
}
function showModeSelection(){
  const mode=modeNavigation.mode;if(!modeDefinitions[mode])return;
  hideNavigationPanels();modeNavigation.screen='select';
  navigationElement('#lobby').hidden=false;
  navigationElement('#mode-back').hidden=false;
  if(mode==='versus'){
    navigationElement('.pickers').hidden=false;renderRoster();
  }else{
    endlessSelecting=mode==='endless';
    navigationElement('#lobby').classList.add('solo-selecting');
    navigationElement('#solo-panel').hidden=false;
    navigationElement('#solo-panel').dataset.mode=mode;
    navigationElement('.challenge-heading h2').textContent=modeDefinitions[mode].name;
    navigationElement('.challenge-heading p').textContent=mode==='endless'?'选择角色，挑战更高关卡':'选择角色，挑战八层障碍';
    navigationElement('#solo-close').textContent='返回模式首页';
    renderSoloGrid();
  }
}
function returnToModeSelection(){
  if(!modeDefinitions[modeNavigation.mode])return showArenaHome();
  clearModeSession();showModeSelection();
  navigationElement('#mode-back').focus();
}
function startModeSession(replay=false){
  const mode=modeNavigation.mode;
  if(!modeDefinitions[mode])return;
  if(replay){if(!modeNavigation.sessionRoles)return showModeWelcome();}
  else{
    if(modeNavigation.screen!=='select'||(mode!=='versus'&&!soloSelection))return;
    modeNavigation.sessionRoles=mode==='versus'?[...selected]:[soloSelection];
  }
  selected=mode==='versus'?[...modeNavigation.sessionRoles]:[modeNavigation.sessionRoles[0],'root'];
  soloMode=mode!=='versus';endlessMode=mode==='endless';endlessSelecting=false;
  endlessStage=1;endlessElapsed=0;endlessDead=false;stagePause=0;
  hideNavigationPanels();modeNavigation.screen='game';inMenu=false;
  navigationElement('main').hidden=false;
  navigationElement('#menu').textContent='返回'+modeDefinitions[mode].name;
  navigationElement('#back').textContent='返回'+modeDefinitions[mode].name;
  navigationElement('#again').textContent='重玩';
  reset();toggle();navigationElement('#start').focus();
}
function showHomeUtility(kind){
  clearModeSession();hideNavigationPanels();modeNavigation.mode=null;modeNavigation.screen=kind;
  navigationElement('#lobby').hidden=false;navigationElement('#mode-back').hidden=true;
  navigationElement('#mode-exit').textContent='返回主菜单 ↗';
  navigationElement('#mode-title').textContent=kind==='rank'?'单球排行榜':'开发者模式';
  if(kind==='rank'){navigationElement('#rank-panel').hidden=false;renderRank();}
  else openDeveloperFields();
}
const renderSoloGridForNavigation=renderSoloGrid;
renderSoloGrid=function(){renderSoloGridForNavigation();navigationElement('#solo-launch').textContent=soloSelection?(modeNavigation.mode==='endless'?'开始无尽挑战 →':'开始计时挑战 →'):'选择角色后开始挑战';};
const refreshSoloBestForNavigation=refreshSoloBest;
refreshSoloBest=function(){
  if(modeNavigation.mode!=='endless')return refreshSoloBestForNavigation();
  const endlessBest=endlessRoleBest(soloSelection);
  navigationElement('#solo-best-value').textContent=endlessBest?'第 '+endlessBest+' 关':'— —';
  navigationElement('#solo-best').textContent='无尽模式最高关卡 · 本机记录';
};
for(const mode of Object.keys(modeDefinitions))navigationElement('#home-'+mode).onclick=()=>{
  navigationElement('#mode-exit').textContent='退出模式 ↗';showModeWelcome(mode);
};
navigationElement('#mode-begin').onclick=showModeSelection;
navigationElement('#mode-back').onclick=()=>showModeWelcome();
navigationElement('#mode-exit').onclick=showArenaHome;
navigationElement('#solo-close').onclick=()=>showModeWelcome();
navigationElement('#versus-start').onclick=()=>startModeSession();
navigationElement('#launch').onclick=()=>startModeSession();
navigationElement('#solo-launch').onclick=()=>startModeSession();
navigationElement('#again').onclick=()=>startModeSession(true);
navigationElement('#reset').onclick=()=>startModeSession(true);
navigationElement('#menu').onclick=returnToModeSelection;
navigationElement('#back').onclick=returnToModeSelection;
navigationElement('#home-rank').onclick=()=>showHomeUtility('rank');
navigationElement('#rank-open').onclick=()=>showHomeUtility('rank');
navigationElement('#rank-close').onclick=showArenaHome;
navigationElement('#rank-challenge').onclick=()=>{navigationElement('#mode-exit').textContent='退出模式 ↗';showModeWelcome('solo');};
navigationElement('#home-developer').onclick=()=>showHomeUtility('developer');
navigationElement('#dev-open').onclick=()=>showHomeUtility('developer');
navigationElement('#solo-open').onclick=()=>showModeWelcome('solo');
navigationElement('#endless-open').onclick=()=>showModeWelcome('endless');
showMenu=showArenaHome;
showArenaHome();
