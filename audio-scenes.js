// Presentation-only observation. Never consumes gameplay randomness or changes physics.
const sceneAudio={balls:new WeakMap(),debris:new WeakMap(),loops:new Map(),running:false,menu:true,winner:null,stage:1,danger:0,records:''};
function stopSceneLoops(){for(const loop of sceneAudio.loops.values()){try{loop.source.stop();loop.source.disconnect();loop.filter.disconnect();loop.gain.disconnect();}catch{}}sceneAudio.loops.clear();}
function sceneLoop(b,kind){
 const c=gameAudio.context;if(!c||!gameAudio.enabled||gameAudio.volume<=0||!running||inMenu){stopSceneLoops();return;}
 let loop=sceneAudio.loops.get(b);if(loop&&loop.kind!==kind){try{loop.source.stop();loop.source.disconnect();loop.filter.disconnect();loop.gain.disconnect();}catch{}sceneAudio.loops.delete(b);loop=null;}
 if(!kind)return;
 if(!loop){const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),buffer=c.createBuffer(1,c.sampleRate,c.sampleRate),data=buffer.getChannelData(0);let seed=5729,smooth=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;smooth=.9*smooth+.1*(seed/2147483648-1);data[i]=smooth;}source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=kind==='water'?1100:kind==='acid'?1500:420;source.connect(filter);filter.connect(gain);gain.connect(audioDestination(c));gain.gain.value=0;source.start();loop={source,filter,gain,kind};sceneAudio.loops.set(b,loop);}
 loop.gain.gain.setTargetAtTime(gameAudio.volume*(kind==='water'?.13:kind==='acid'?.06:.075),c.currentTime,.035);
}
function syncSceneAudio(){
 const active=!document.hidden&&!inMenu&&running&&winner===null,c=gameAudio.context;if(!inMenu&&!sceneAudio.menu&&running!==sceneAudio.running&&winner===null)interfaceSound(running?'resume':'pause');
 if(!active||!gameAudio.enabled||!c||c.state!=='running'||gameAudio.volume<=0){stopSceneLoops();sceneAudio.running=running;sceneAudio.menu=inMenu;return;}
 for(const old of sceneAudio.loops.keys())if(!lanes.includes(old))sceneLoop(old,null);
 for(const b of lanes){
  if(b.role==='tide'){sceneLoop(b,null);continue;}
  const s=b.special,h=s.tide,g=s.gravity,old=sceneAudio.balls.get(b)||{},action=b.action?.kind||(b.action?(b.role==='cube'?'cube':'drill'):null);
  if(action!==old.action){
   if(action==='spring')specialAudioCue('springLoad',[[240,100,.09,.17,0]]);
   if(old.action==='spring')specialAudioCue('springRelease',[[180,480,.11,.12,0]]);
   if(action==='springGhost')specialAudioCue('springGhost',[[560,200,.10,.22,0]]);
   if(action==='cube')specialAudioCue('cubeLoad',[[180,90,.08,.10,0]]);
   if(old.action==='phaseTravel'&&!action)specialAudioCue('phaseSolid',[[260,420,.07,.12,0]]);
   if(old.action==='cube')specialAudioCue('cubeRelease',[[130,260,.13,.12,0]]);
  }
  const rage=b.rageTime>0;if(rage&&!old.rage)specialAudioCue('rageUltimate',[[120,250,.20,.24,0],[250,80,.13,.3,.1]]);if(!rage&&old.rage)specialAudioCue('rageEnd',[[200,100,.065,.16,0]]);
  const slam=s.leadSlam>0;if(slam&&!old.slam)specialAudioCue('leadReady',[[100,180,.12,.25,0]]);
  const acid=s.acidUltFlash>0;if(acid&&!old.acid)specialAudioCue('acidUltimate',[[180,65,.13,.3,0],[360,140,.08,.22,.05]]);
  const bridge=!!s.bridge;if(bridge&&!old.bridge)materialSound('tear');
  const flo=!!h?.float;
  const waterBridge=!!h?.waterBridge;if(!waterBridge&&old.waterBridge)specialAudioCue('waterBridgeEnd',[[220,100,.065,.18,0]]);
  const frost=s.frost?.ultimate>0;if(!frost&&old.frost)specialAudioCue('frostEnd',[[750,420,.045,.16,0]]);
  const stunt=s.stunTime>0;if(!stunt&&old.stunt)specialAudioCue('stunEnd',[[330,550,.055,.12,0]]);
  if(old.x!==undefined&&Math.sign(b.vx)!==Math.sign(old.vx)&&(b.x<(b.x<330?36:348)+38||b.x>(b.x<330?36:348)+238))materialSound('wall');
  const frames=b.fractures.reduce((n,f)=>n+f.edges.length,0);if(frames>(old.cracks||0)+2)materialSound('crack');
  const debrisCount=s.debris.length+s.boards.reduce((n,p)=>n+p.bend.drop.length,0);if(debrisCount>(old.debris||0))materialSound('flake');
  for(const d of s.debris){const prior=sceneAudio.debris.get(d);if(prior&&prior.vy>100&&Math.abs(d.vy)<5)materialSound('landing',d.points.length/500);sceneAudio.debris.set(d,{vy:d.vy});}
  const warning=s.boards.some(p=>p.frostCracks?.some(f=>f.length>=22&&f.broken.size>=8&&f.broken.size<15));if(warning&&!old.warning)specialAudioCue('frostWarning',[[900,1100,.05,.12,0]]);
  if(g&&(g.jobs.length>(old.jobs||0)))specialAudioCue('repairJoin',[[250,420,.075,.16,0]]);
  sceneLoop(b,h?.wheel||h?.waterBridge?'water':s.bridge||s.magnetField||s.boards.some(p=>p.bend.pulse>0)?'magnet':g?.target?'gravity':s.acidDrops.length?'acid':null);
  sceneAudio.balls.set(b,{action,rage,slam,acid,bridge,float:flo,waterBridge,frost,stunt,x:b.x,vx:b.vx,cracks:frames,debris:debrisCount,warning,jobs:g?.jobs.length||0});
 }
 if(endlessMode){if(endlessStage!==sceneAudio.stage)interfaceSound(endlessStage>endlessRoleBest(lanes[0].role)?'record':'stage');sceneAudio.stage=endlessStage;const distance=lanes[0].y-32-(sawY+15),now=c.currentTime;if(distance<160&&now-sceneAudio.danger>(distance<80?.8:1.6)){sceneAudio.danger=now;specialAudioCue('dangerSaw',[[330,430,.09,.12,0],[430,330,.07,.12,.16]]);}}
 sceneAudio.running=running;sceneAudio.menu=inMenu;
}
function initSceneAudioUI(){
 document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(!button||button.disabled||button.id==='audio-toggle')return;unlockAudio();
  const id=button.id||'',data=button.dataset||{};
  if(id==='start')return interfaceSound(running?'pause':'resume');
  if(/again|reset|launch|versus-start|mode-begin/.test(id))return interfaceSound('start');
  if(/back|exit|close|^menu$/.test(id))return interfaceSound('back');
  interfaceSound(data.solo||data.versusRole||data.choose?'select':'click');
 },true);
 
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSceneLoops();if(drillPlaying){drillRecording.pause();drillPlaying=false;}}});
}
