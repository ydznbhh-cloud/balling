// Presentation tracks the real strip stress and removed cells, including assembled material.
function gravityTearFX(b){return b.special.gravityTearFX||(b.special.gravityTearFX={pieces:[],target:null,pulse:0,nextPull:0,nextSnap:0});}
const flushBeforeTearFX=gravityFlush;gravityFlush=function(b){
 const pending=gravityState(b).pending,cells=pending?.cells.length?[...pending.cells]:null;
 if(cells){const fx=gravityTearFX(b),t=pending.t,origin=b.x<330?36:348,groups=new Map();for(const k of cells){const band=Math.floor(k%138/6);if(!groups.has(band))groups.set(band,[]);let source=t.j;if(t.scrap){let edge=0;for(const part of t.scrap.parts){edge+=276*part.count/t.scrap.total;if(k%138*2<edge){source=part.source;break;}}}groups.get(band).push({x:origin+k%138*2+1,y:t.y+Math.floor(k/138)*2+1,source});}
  for(const points of groups.values())fx.pieces.push({points,age:0,life:.48,tx:b.x,ty:b.y});fx.pieces=fx.pieces.slice(-32);fx.pulse=.28;
  if(time>=fx.nextSnap){specialAudioCue('gravityStripSnap',[[290,75,.16,.18,0],[460,180,.075,.09,.025]]);materialSound('tear',.45);fx.nextSnap=time+.14;}
 }
 return flushBeforeTearFX(b);
};
const tearBeforeTearFX=gravityTear;gravityTear=function(b,t,dt){
 const fx=gravityTearFX(b);fx.target=t;const result=tearBeforeTearFX(b,t,dt),stress=t.state.gravityStripStress?Math.max(...t.state.gravityStripStress):0;
 if(stress>.05&&time>=fx.nextPull){specialAudioCue('gravityTension',[[100+stress*90,150+stress*150,.13,.045+stress*.035,0]]);fx.nextPull=time+.3;}
 return result;
};
const actorBeforeTearFX=tickGravityActor;tickGravityActor=function(b,side,dt){const fx=b.special.gravityTearFX;if(fx){fx.pulse=Math.max(0,fx.pulse-dt);for(const p of fx.pieces)p.age+=dt;fx.pieces=fx.pieces.filter(p=>p.age<p.life);}return actorBeforeTearFX(b,side,dt);};
const drawBeforeTearFX=drawGravity;drawGravity=function(b){drawBeforeTearFX(b);if(b.role!=='gravity')return;const fx=b.special.gravityTearFX;if(!fx)return;
 ctx.save();const t=gravityState(b).target,origin=b.x<330?36:348;
 if(t&&t.state.gravityStripStress){for(let band=0;band<23;band++){const stress=t.state.gravityStripStress[band];if(stress<.05||stress>=1)continue;const col=band*6;let live=false;for(let row=0;row<15&&!live;row++)for(let c=col;c<col+6;c++)if(t.state.material[row*138+c]){live=true;break;}if(!live)continue;
  const x=origin+band*12,lift=stress*7,wobble=Math.sin(time*(18+stress*25)+band)*stress*1.6;
  ctx.globalAlpha=.15+stress*.65;ctx.strokeStyle='#dac8ff';ctx.lineWidth=1+stress;ctx.beginPath();ctx.moveTo(x+wobble,t.y);ctx.lineTo(x+wobble,t.y+30);ctx.moveTo(x+12+wobble,t.y);ctx.lineTo(x+12+wobble,t.y+30);ctx.stroke();
  ctx.fillStyle='#d9c6ff';ctx.fillRect(x+2,t.y-lift,8,1+stress);ctx.globalAlpha=stress*.5;ctx.beginPath();ctx.moveTo(b.x,b.y+20);ctx.quadraticCurveTo(x+6,b.y+25,x+6+wobble,t.y-lift);ctx.stroke();
 }}
 for(const piece of fx.pieces){const a=piece.age/piece.life,e=a*a*(3-2*a);ctx.globalAlpha=1-a;for(const p of piece.points){const x=p.x+(piece.tx-p.x)*e+Math.sin(a*Math.PI)*Math.sin(p.x*.1)*5,y=p.y+(piece.ty-p.y)*e-Math.sin(a*Math.PI)*16;ctx.fillStyle=themePalettes.neon.boards[p.source];ctx.fillRect(x-1,y-1,2,2);}}
 if(fx.pulse>0){const a=1-fx.pulse/.28;ctx.globalAlpha=(1-a)*.6;ctx.strokeStyle='#d5baff';ctx.lineWidth=2*(1-a)+.5;ctx.beginPath();ctx.ellipse(b.x,b.y+31,12+a*35,3+a*7,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
};
