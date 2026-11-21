const starRosterKey='ball-arena-allstar-roster-v1';
function defaultStarRoster(){return roles.filter(r=>!['ln','chaos'].includes(r.id)).map(r=>r.id);}
function readStarRoster(){try{const ids=JSON.parse(localStorage.getItem(starRosterKey));if(Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>roles.some(r=>r.id===id)))return ids;}catch{}return defaultStarRoster();}
function saveStarRoster(){try{localStorage.setItem(starRosterKey,JSON.stringify(allstar.seeds));}catch{}}
const setupBeforeRoster=showAllstarSetup;showAllstarSetup=function(){setupBeforeRoster();allstar.seeds=readStarRoster();renderStarSeeds();};starEl('allstar-open').onclick=showAllstarSetup;starEl('allstar-new').onclick=showAllstarSetup;
renderStarSeeds=function(){
 starEl('allstar-roster').innerHTML=roles.map(r=>{const selected=allstar.seeds.includes(r.id);return '<button type="button" class="allstar-entrant '+(selected?'roster-selected':'roster-excluded')+'" data-star-role="'+r.id+'" aria-pressed="'+selected+'"><span class="orb" style="--accent:'+r.color+'">'+r.icon+'</span><span>'+r.name+'<br><small>'+r.profession+' · '+(selected?'已参赛':'未参赛')+'</small></span></button>';}).join('');
 const n=allstar.seeds.length,size=2**Math.ceil(Math.log2(Math.max(2,n)));starEl('allstar-roster-count').textContent='已选 '+n+' / '+roles.length+' 位 · 至少2位'+(n>=2&&size>n?' · 首轮 '+(size-n)+' 位轮空':'');starEl('allstar-create').disabled=n<2;
};
starEl('allstar-roster').onclick=e=>{const button=e.target.closest('[data-star-role]');if(!button)return;const id=button.dataset.starRole;if(!roles.some(r=>r.id===id))return;allstar.seeds=allstar.seeds.includes(id)?allstar.seeds.filter(r=>r!==id):[...allstar.seeds,id];saveStarRoster();renderStarSeeds();};
starEl('allstar-select-all').onclick=()=>{allstar.seeds=roles.map(r=>r.id);saveStarRoster();renderStarSeeds();};
starEl('allstar-select-default').onclick=()=>{allstar.seeds=defaultStarRoster();saveStarRoster();renderStarSeeds();};
starEl('allstar-select-none').onclick=()=>{allstar.seeds=[];saveStarRoster();renderStarSeeds();};
const shuffleBeforeRoster=starEl('allstar-shuffle').onclick;starEl('allstar-shuffle').onclick=()=>{shuffleBeforeRoster();saveStarRoster();};
const resolveSourceBeforeRoster=starResolve;starResolve=function(source){if(source.seat!==undefined)return source.seat;const m=allstar.matches.find(m=>m.id===source.id);if(m?.bye&&m.winner!==null)return source.outcome==='loser'?-1:m.winner;return resolveSourceBeforeRoster(source);};
resolveStarMatches=function(){
 for(const m of allstar.matches){m.seats=m.sources.map(starResolve);if(m.winner===null&&m.seats.every(s=>s!==null)&&m.seats.includes(-1)){m.bye=true;m.winner=m.seats.find(s=>s>=0)??-1;}}
 allstar.index=allstar.matches.findIndex(m=>m.winner===null&&m.seats.every(s=>s!==null&&s>=0));
};
const nameBeforeRoster=starName;starName=seat=>seat===-1?'轮空':nameBeforeRoster(seat);
const fullBuildBeforeRoster=buildAllstar;buildAllstar=function(){
 const n=allstar.seeds.length;if(n<2||n>roles.length||new Set(allstar.seeds).size!==n||allstar.seeds.some(id=>!roles.some(r=>r.id===id)))return;
 if(n===16)return fullBuildBeforeRoster();
 allstar.matches=[];allstar.losses=Array(n).fill(0);allstar.index=0;allstar.champion=null;
 const size=2**Math.ceil(Math.log2(n)),rounds=Math.log2(size),half=size/2,labels={2:'胜者组决赛',4:'四强赛',8:'八强赛',16:'十六强赛'},loserLabels=['第一轮','第二轮','第三轮','第四轮','第五轮'];
 let w=starAddRound('胜者组',labels[size],Array.from({length:half},(_,i)=>[{seat:i<n?i:-1},{seat:i+half<n?i+half:-1}]),rounds===1?3:2),l;
 if(rounds===1)l=[{direct:starSource(w[0],'loser')}];
 else l=starAddRound('败者组','第一轮',Array.from({length:w.length/2},(_,i)=>[starSource(w[i*2],'loser'),starSource(w[i*2+1],'loser')]));
 for(let r=2;r<=rounds;r++){
  w=starAddRound('胜者组',labels[size/2**(r-1)],Array.from({length:w.length/2},(_,i)=>[starSource(w[i*2]),starSource(w[i*2+1])]),r===rounds?3:2);
  l=starAddRound('败者组',r===rounds?'败者组决赛':loserLabels[2*r-3],l.map((id,i)=>[starSource(id),starSource(w[w.length-1-i],'loser')]),r===rounds?3:2);
  if(r<rounds)l=starAddRound('败者组',loserLabels[2*r-2],Array.from({length:l.length/2},(_,i)=>[starSource(l[i*2]),starSource(l[i*2+1])]));
 }
 starAddRound('总决赛','冠军争夺战',[[starSource(w[0]),rounds===1?l[0].direct:starSource(l[0])]],3);resolveStarMatches();showAllstarBracket();
};starEl('allstar-create').onclick=buildAllstar;
