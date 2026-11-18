// Continue the final within-segment multiplicative increase across segment boundaries.
function endlessStageStride(){return tuning.board7-tuning.board0+Math.max(.0001,tuning.board7-tuning.board6)}
function endlessSawVelocity(stage=endlessStage){return cfg.endlessSawSpeed*Math.pow(1+cfg.endlessSawGrowthPercent/100,Math.max(0,stage-1))}
let endlessCamera=0,endlessDistance=0;
let endlessMode=false,endlessSelecting=false,endlessStage=1,endlessElapsed=0,endlessDead=false,sawY=80,stagePause=0;
let endlessRecords={};try{endlessRecords=JSON.parse(localStorage.getItem('ball-arena-endless-roles-v1')||'{}')||{}}catch{}
function endlessRoleBest(role){return Number(endlessRecords[role])||0}
let endlessBest=0;
function prepareEndlessStage(){if(!endlessMode)return;let stageStride=endlessStageStride();for(let j=0;j<8;j++){levels[j]=tuning['board'+j]+(endlessStage-1)*stageStride;lanes[0].hp[j]=levels[j]}if(endlessStage===1){sawY=-240;endlessCamera=0;endlessDistance=0}stagePause=0;document.querySelector('main h1').textContent=roleOf(lanes[0]).name+' · 无尽逃生';document.querySelector('main p').textContent='第 '+endlessStage+' 关 · 锯齿逼近，向下逃离';}
function tickEndless(dt){if(!endlessMode||endlessDead)return false;endlessCamera=Math.max(endlessCamera,lanes[0].y-450);const ball=lanes[0];if(endlessStage===1&&ball.y<108&&ball.v<0){ball.y=108;ball.v=Math.abs(ball.v)*.65;}if(stagePause>0){stagePause=Math.max(0,stagePause-dt);return true}sawY+=endlessSawVelocity()*dt;if(lanes[0].y-32<=sawY+15){interfaceSound('death');endlessDead=true;running=false;winner=0;endlessBest=Math.max(endlessRoleBest(lanes[0].role),endlessStage);endlessRecords[lanes[0].role]=endlessBest;try{localStorage.setItem('ball-arena-endless-roles-v1',JSON.stringify(endlessRecords))}catch{}document.querySelector('#result-title').textContent='逃生结束';document.querySelector('#result-detail').textContent='抵达第 '+endlessStage+' 关 · 生存 '+(endlessElapsed+time).toFixed(2)+' 秒 · 最高第 '+endlessBest+' 关';document.querySelector('.medal').textContent='⚙';document.querySelector('.confetti').innerHTML='';document.querySelector('#result').hidden=false;document.querySelector('#start').disabled=true;document.querySelector('#start').textContent='挑战结束';document.querySelector('#again').focus();return true}return false;}
function nextEndlessStage(){
 const previous=lanes[0],motion={x:previous.x,y:previous.y-905.6,v:previous.v,vx:previous.vx,hits:previous.hits,power:previous.power,controlMetrics:previous.controlMetrics};
 const remnants=collectEndlessRemnants(previous);
 const camera=endlessCamera-905.6,saw=sawY-905.6,elapsed=time;
 endlessStage++;reset();Object.assign(lanes[0],motion);lanes[0].done=false;lanes[0].endlessRemnants=remnants;
 time=elapsed;endlessCamera=camera;sawY=saw;endlessDistance+=905.6;
 running=true;document.querySelector('#start').textContent='暂停';
}
function drawEndless(){if(!endlessMode)return;ctx.save();ctx.fillStyle='#27313b';ctx.fillRect(36,76,276,Math.max(0,sawY-76));ctx.fillStyle='#a4b2bd';ctx.strokeStyle='#e1e9eb';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(36,sawY-7);for(let x=36;x<312;x+=18){ctx.lineTo(x+9,sawY+15);ctx.lineTo(x+18,sawY-7)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e8b56c';for(let x=40;x<308;x+=28)ctx.fillRect(x,sawY-13,15,3);if(stagePause>0){round(89,160,170,65,12,'#0a1726df','#7fcfc9');ctx.textAlign='center';ctx.font='bold 20px system-ui';ctx.fillStyle='#d4fff3';ctx.fillText('第 '+endlessStage+' 关',174,185);ctx.font='12px system-ui';ctx.fillText('准备逃生 '+Math.ceil(stagePause),174,208)}document.querySelector('#solo-hud-time').textContent=(endlessElapsed+time).toFixed(2)+' s';document.querySelector('#solo-hud-progress').textContent='第 '+endlessStage+' 关 · '+Math.min(lanes[0].index,8)+'/8';ctx.restore();}
function initEndless(){document.querySelector('#endless-open').onclick=()=>{if(!document.querySelector('#solo-panel').hidden)closeSolo();document.querySelector('#solo-open').onclick();endlessSelecting=true;document.querySelector('#solo-panel').dataset.mode='endless';document.querySelector('.challenge-heading h2').textContent='无尽逃生';document.querySelector('.challenge-heading p').textContent='躲避下落锯齿，突破八层障碍，不断挑战更高关卡';document.querySelector('#solo-best').textContent='最高纪录：第 '+endlessBest+' 关';};}

// Upcoming segments share the exact spacing and strength formula of active segments.
function endlessUpcomingBoards(){
 if(!endlessMode)return [];
 const boards=[],bottom=endlessCamera+1157,stride=endlessStageStride();
 for(let segment=1;258+segment*905.6<=bottom;segment++){
  for(let j=0;j<8;j++){
   const y=258+segment*905.6+j*113.2;
   if(y>bottom)break;
   if(y+30<endlessCamera+76)continue;
   boards.push({y,index:j,hp:tuning['board'+j]+(endlessStage+segment-1)*stride});
  }
 }
 return boards;
}
function drawEndlessUpcomingBoards(x){
 const palette=themePalettes[visualTheme];
 for(const board of endlessUpcomingBoards()){
  round(x,board.y,276,30,6,palette.boards[board.index],'#94e6ee88');
  drawThemeBoard(x,board.y);
  ctx.fillStyle='#f0faff';ctx.font='bold 22px system-ui';ctx.textAlign='center';
  ctx.fillText(fmt(board.hp),x+138,board.y+23);
 }
}

function collectEndlessRemnants(b){
 const pieces=(b.endlessRemnants||[]).map(p=>({...p,y:p.y-905.6}));
 for(const d of b.special.debris||[])pieces.push({...d,y:d.y-905.6,life:3});
 for(let j=0;j<b.special.boards.length;j++)for(const d of b.special.boards[j].bend.drop||[])pieces.push({...d,x:d.x+36,y:d.y+258+j*113.2-905.6,color:themePalettes[visualTheme].boards[j],life:3});
 return pieces;
}
function drawEndlessRemnants(b){
 for(const d of b.endlessRemnants||[]){ctx.save();ctx.globalAlpha=Math.max(0,d.life/3);ctx.translate(d.x,d.y);ctx.rotate(d.angle||0);ctx.fillStyle=d.color||'#91cddd';
  if(d.points){ctx.beginPath();for(let k=0;k<d.points.length;k++){if((k%13)/13>d.life/3)continue;const p=d.points[k];ctx.rect(p.x,p.y,2,2)}ctx.fill();}
  else for(const p of d.segments||[]){ctx.beginPath();ctx.moveTo(p.x,p.a);ctx.lineTo(p.x+11.5,p.z);ctx.lineTo(p.x+11.5,p.z+30);ctx.lineTo(p.x,p.a+30);ctx.closePath();ctx.fill();}
 ctx.restore();}
}
function tickPlayAssistance(dt){
 for(const b of lanes){
  tickControlMetrics(b,dt);
  for(const d of b.endlessRemnants||[]){d.life-=dt;d.y+=(d.vy||0)*dt;d.x+=(d.vx||0)*dt;d.angle=(d.angle||0)+(d.spin||0)*dt;}
  b.endlessRemnants=(b.endlessRemnants||[]).filter(d=>d.life>0);
  if(b.done)continue;
  const w=b.stuckWatch||(b.stuckWatch={y:b.y,age:0,index:b.index});
  if(Math.abs(b.y-w.y)>48||b.index!==w.index){w.y=b.y;w.index=b.index;w.age=0;}else w.age+=dt;
  if(w.age>=6&&!b.action){b.v=Math.max(cfg.fall,260);b.vx=(Math.random()<.5?-1:1)*Math.max(cfg.vxMin,45);b.y+=4;w.age=0;materialSound('rescue');b.damageTexts.push({text:'脱困！',x:b.x,y:b.y-45,age:0});}
 }
}
