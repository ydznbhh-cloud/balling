// The lane is a solid U-shaped enclosure. Its floor remains the race finish trigger.
function containArenaBall(b,side){
 if(!b||b.done)return;const r=b.role==='spring'?21:32,origin=side?348:36,left=origin+r,right=origin+276-r;
 const reflect=(nx,ny,x,y)=>{
  if(b.role==='eccentric')eccentricImpulse(b,{x,y,nx,ny,wall:true});
  if(nx&&b.vx*nx<0)b.vx=-b.vx;
  if(ny&&b.v*ny<0)b.v=-b.v;
 };
 if(b.x<left){b.x=left;reflect(1,0,origin,b.y);}else if(b.x>right){b.x=right;reflect(-1,0,origin+276,b.y);}
 // A camera edge is not a ceiling in endless mode: the saw is the upper hazard.
 if(!endlessMode&&b.y<76+r){b.y=76+r;reflect(0,1,b.x,76);}
}
const tickBeforeArenaBoundaries=tickNew;tickNew=function(b,side,dt){containArenaBall(b,side);const result=tickBeforeArenaBoundaries(b,side,dt);containArenaBall(b,side);return result;};
const updateBeforeArenaBoundaries=update;update=function(dt){updateBeforeArenaBoundaries(dt);for(let side=0;side<lanes.length;side++)containArenaBall(lanes[side],side);};
