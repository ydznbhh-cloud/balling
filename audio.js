// Browser-native synthesized effects. Audio starts only after user interaction.
const gameAudio={context:null,enabled:true,volume:.35,last:{}};
try{let saved=JSON.parse(localStorage.getItem('ball-arena-audio')||'null');if(saved){gameAudio.enabled=saved.enabled!==false;gameAudio.volume=Math.max(0,Math.min(1,Number(saved.volume)||0))}}catch{}
function unlockAudio(){try{if(!gameAudio.context)gameAudio.context=new (window.AudioContext||window.webkitAudioContext)();if(gameAudio.context.state==='suspended')gameAudio.context.resume().catch(()=>{})}catch{}}
function soundEffect(kind='hit',role='',strong=false){if(kind==='hit'&&['root','ln','chaos'].includes(role)){const tones={root:[[620,350,.10,.10,0]],ln:[[780,240,.10,.14,0]],chaos:[[520,850,.09,.11,0]]};specialAudioCue('transform_'+role,tones[role]);return;}if(role==='tide'&&kind==='hit'){waterImpactSound();return}if(kind==='ultimate'&&role==='drill'){drillCrushSound();return}let a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;if(!audioPermit(kind+role,kind==='ultimate'?2:kind==='break'?1:0))return;let key=kind+role,now=c.currentTime;if(now-(a.last[key]??-100)<.055)return;a.last[key]=now;let duration=kind==='ultimate'?.42:kind==='break'?.2:role==='lead'?.2:.11;let gain=c.createGain();gain.gain.setValueAtTime(a.volume*(kind==='ultimate'?.45:.36),now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);gain.connect(audioDestination(c));let osc=c.createOscillator();osc.type=role==='spring'?'sine':role==='drill'?'triangle':'sine';let frequency=kind==='ultimate'?95:role==='lead'?75:role==='spring'?430:role==='drill'?210:180;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(25,frequency*(role==='spring'?.35:.24)),now+duration);osc.connect(gain);osc.start(now);osc.stop(now+duration);if(role!=='spring'||kind==='break'){let frames=Math.ceil(c.sampleRate*duration),buffer=c.createBuffer(1,frames,c.sampleRate),data=buffer.getChannelData(0);let seed=137;for(let i=0;i<frames;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.55;}let noise=c.createBufferSource(),filter=c.createBiquadFilter();noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=role==='lead'?420:kind==='break'?2100:1100;noise.connect(filter);filter.connect(gain);noise.start(now);noise.stop(now+duration)}}
function initAudioUI(){const toggle=document.querySelector('#audio-toggle'),volume=document.querySelector('#audio-volume');function refresh(){toggle.textContent=gameAudio.enabled?'音效：开':'音效：关';toggle.setAttribute('aria-pressed',String(gameAudio.enabled));volume.value=String(Math.round(gameAudio.volume*100))}function save(){try{localStorage.setItem('ball-arena-audio',JSON.stringify({enabled:gameAudio.enabled,volume:gameAudio.volume}))}catch{}}toggle.onclick=()=>{unlockAudio();gameAudio.enabled=!gameAudio.enabled;save();refresh()};volume.oninput=()=>{unlockAudio();gameAudio.volume=Number(volume.value)/100;save()};refresh();document.addEventListener('pointerdown',unlockAudio,{once:true});document.addEventListener('keydown',unlockAudio,{once:true})}

function victorySound(){const a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;const now=c.currentTime;[523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{const start=now+i*.13,duration=i===3?.65:.23,osc=c.createOscillator(),gain=c.createGain();osc.type='triangle';osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(a.volume*.28,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(audioDestination(c));osc.start(start);osc.stop(start+duration)});}

const drillRecording=new Audio('assets/drill-real-lowpass.wav');drillRecording.loop=true;drillRecording.preload='auto';let drillPlaying=false;
function syncDrillSound(){const a=gameAudio;const active=!document.hidden&&typeof running!=='undefined'&&running&&winner===null&&lanes.some(b=>b.role==='drill'&&b.action&&!b.action.kind);if(!active||!a.enabled||a.volume<=0){if(drillPlaying){drillRecording.pause();drillRecording.currentTime=0;drillPlaying=false}return}drillRecording.volume=Math.min(1,a.volume*.28);if(!drillPlaying){drillPlaying=true;drillRecording.play().catch(()=>{drillPlaying=false})}}

function resonanceSound(){let a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;let now=c.currentTime;if(now-(a.last.resonance??-100)<.25)return;a.last.resonance=now;for(const [frequency,level,life] of [[110,.3,.36],[330,.17,.7],[554,.07,.55]]){let osc=c.createOscillator(),gain=c.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(frequency*.94,now+life);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(a.volume*level,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+life);osc.connect(gain);gain.connect(audioDestination(c));osc.start(now);osc.stop(now+life)}}

function assemblySound(complete=false){const a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;let now=c.currentTime,key=complete?'assemblyEnd':'assemblyTick';if(now-(a.last[key]??-10)<.08)return;a.last[key]=now;for(let i=0;i<(complete?2:1);i++){let o=c.createOscillator(),g=c.createGain(),start=now+i*.045,life=complete?.22:.075;o.type='sine';o.frequency.setValueAtTime(complete?(i?440:220):320,start);o.frequency.exponentialRampToValueAtTime(complete?(i?330:165):170,start+life);g.gain.setValueAtTime(a.volume*(complete?.22:.1),start);g.gain.exponentialRampToValueAtTime(.0001,start+life);o.connect(g);g.connect(audioDestination(c));o.start(start);o.stop(start+life)}}

// Dedicated low-frequency cues, gated by the same master volume and mute switch.
function specialAudioCue(key,tones){
 const a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;
 const now=c.currentTime;if(now-(a.last[key]??-100)<.18||!audioPermit(key,/Ultimate|Crush|Split|record|victory|danger|death/i.test(key)?2:1))return;a.last[key]=now;
 for(const [startHz,endHz,level,duration,delay] of tones){
  const start=now+delay,o=c.createOscillator(),g=c.createGain();o.type='sine';
  o.frequency.setValueAtTime(startHz,start);o.frequency.exponentialRampToValueAtTime(endHz,start+duration);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(a.volume*level,start+.012);
  g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(audioDestination(c));o.start(start);o.stop(start+duration);
 }
}
function drillCrushSound(){
 const a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;
 const now=c.currentTime;if(now-(a.last.drillCrush??-100)<.18)return;
 // Short impact body plus a broad, textured fracture burst.
 specialAudioCue('drillCrush',[[260,80,.26,.22,0],[480,160,.10,.12,.008]]);
 const duration=.38,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
 let seed=4271;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 const noise=c.createBufferSource(),low=c.createBiquadFilter(),high=c.createBiquadFilter(),gain=c.createGain();noise.buffer=buffer;
 high.type='highpass';high.frequency.value=220;low.type='lowpass';low.frequency.setValueAtTime(2400,now);low.frequency.exponentialRampToValueAtTime(850,now+duration);
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(a.volume*.46,now+.004);gain.gain.exponentialRampToValueAtTime(a.volume*.13,now+.09);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 noise.connect(high);high.connect(low);low.connect(gain);gain.connect(audioDestination(c));noise.start(now);noise.stop(now+duration);
}
function magneticBridgeSound(){specialAudioCue('magneticBridge',[[100,220,.16,.42,0],[160,320,.12,.4,.06],[320,110,.12,.55,.28]]);}

function phaseTravelSound(){specialAudioCue('phaseTravel',[[420,180,.13,.28,0],[650,300,.07,.22,.04]]);}
function eccentricHeadOnSound(){specialAudioCue('headOn',[[360,100,.23,.15,0],[720,260,.09,.12,.015]]);}
function waterImpactSound(){
 const a=gameAudio,c=a.context;if(!a.enabled||!c||c.state!=='running'||a.volume<=0)return;
 const now=c.currentTime;if(now-(a.last.waterImpact??-100)<.22)return;a.last.waterImpact=now;
 // Water shield rupture: a tight pressure release, a hollow water body,
 // then separated splash pulses rather than a sustained surf hiss.
 const duration=.46,frames=Math.ceil(c.sampleRate*duration),buffer=c.createBuffer(2,frames,c.sampleRate);
 for(let channel=0;channel<2;channel++){
  const data=buffer.getChannelData(channel);let seed=13731+channel*4271,smooth=0;
  for(let i=0;i<frames;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1,t=i/c.sampleRate;
   smooth=.88*smooth+.12*white;
   const crack=Math.exp(-t*95),spray=Math.exp(-t*11)*(.48+.52*Math.pow(Math.sin(t*105+channel*.6),2));
   data[i]=white*.33*crack+(smooth*2.5+white*.13)*spray;
  }
 }
 const source=c.createBufferSource(),high=c.createBiquadFilter(),low=c.createBiquadFilter(),body=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;
 high.type='highpass';high.frequency.value=130;low.type='lowpass';low.Q.value=.6;
 low.frequency.setValueAtTime(3600,now);low.frequency.exponentialRampToValueAtTime(1600,now+.075);low.frequency.exponentialRampToValueAtTime(700,now+duration);
 body.type='peaking';body.frequency.setValueAtTime(850,now);body.frequency.exponentialRampToValueAtTime(280,now+.24);body.Q.value=1.1;body.gain.value=6;
 gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(a.volume*.58,now+.003);gain.gain.exponentialRampToValueAtTime(a.volume*.38,now+.055);gain.gain.exponentialRampToValueAtTime(a.volume*.15,now+.18);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 source.connect(high);high.connect(low);low.connect(body);body.connect(gain);gain.connect(audioDestination(c));source.start(now);source.stop(now+duration);
 specialAudioCue('waterShieldBody',[[210,85,.12,.14,0]]);
}

function audioDestination(c){
 if(!c.createDynamicsCompressor)return c.destination;
 if(gameAudio.busContext!==c){const bus=c.createDynamicsCompressor();bus.threshold.value=-15;bus.knee.value=16;bus.ratio.value=5;bus.attack.value=.006;bus.release.value=.18;bus.connect(c.destination);gameAudio.bus=bus;gameAudio.busContext=c;}
 return gameAudio.bus;
}
function audioPermit(key,priority=0){
 const c=gameAudio.context;if(!c||!gameAudio.enabled||gameAudio.volume<=0)return false;const now=c.currentTime;
 gameAudio.voices=(gameAudio.voices||[]).filter(v=>now-v.time<.12);
 if(priority===0&&now<(gameAudio.importantUntil||0))return false;
 if(gameAudio.voices.length>=(priority===2?12:priority===1?8:4))return false;
 gameAudio.voices.push({time:now,key});if(priority===2)gameAudio.importantUntil=now+.16;return true;
}
function interfaceSound(kind='click'){
 const tones={click:[[520,430,.055,.07,0]],select:[[440,660,.08,.10,0]],back:[[440,320,.06,.10,0]],start:[[330,660,.10,.18,0],[660,880,.07,.15,.10]],pause:[[390,310,.07,.11,0]],resume:[[310,440,.07,.11,0]],error:[[220,160,.08,.15,0]],saved:[[520,780,.07,.13,0]],record:[[660,880,.12,.18,0],[880,1174,.10,.25,.13]],death:[[180,65,.17,.35,0],[110,45,.09,.45,.08]],stage:[[440,660,.08,.16,0],[660,880,.06,.18,.08]]};specialAudioCue('ui_'+kind,tones[kind]||tones.click);
}
function materialSound(kind='crack',strength=1){
 const level=Math.min(1,Math.max(.2,strength));
 const tones={wall:[[240,140,.06,.065,0]],crack:[[650,220,.055,.10,0]],tear:[[320,90,.10,.22,0],[740,260,.05,.13,.03]],flake:[[480,160,.10,.19,0]],landing:[[130,55,.11*level,.17,0]],rescue:[[340,540,.07,.15,0]],miss:[[190,280,.045,.09,0]]};specialAudioCue('material_'+kind,tones[kind]||tones.crack);
}
