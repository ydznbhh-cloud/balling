function courseLevels(parameters=cfg){
 const n=endlessMode?8:([8,12,16].includes(parameters.courseBoards)?parameters.courseBoards:8),base=Array.from({length:8},(_,j)=>parameters['board'+j]);
 // Repeat the original eight-board exponent progression above the previous block's last value.
 return Array.from({length:n},(_,j)=>base[j%8]+Math.floor(j/8)*base[7]);
}
function courseTier(j){const n=levels.length;return j<Math.ceil(n*3/8)?0:j<Math.ceil(n*6/8)?1:2;}
function courseTierForValue(value){return value<=levels[Math.ceil(levels.length*3/8)-1]+1e-9?0:value<=levels[Math.ceil(levels.length*6/8)-1]+1e-9?1:2;}
function courseResistanceValue(value){
 if(levels.length===8)return value;const actual=courseLevels(cfg),base=Array.from({length:8},(_,j)=>cfg['board'+j]);let index=actual.findIndex(v=>v>=value);if(index<0)return base[7];if(index===0)return base[0];const a=actual[index-1],z=actual[index],fraction=(value-a)/Math.max(1e-9,z-a),progress=(index-1+Math.max(0,Math.min(1,fraction)))/(actual.length-1)*7,low=Math.floor(progress),high=Math.min(7,low+1);return base[low]+(base[high]-base[low])*(progress-low);
}
function prepareCourseColors(){for(const palette of Object.values(themePalettes)){if(!Array.isArray(palette.boards))continue;const base=palette.boards.slice(0,8);palette.boards.splice(0,palette.boards.length,...Array.from({length:levels.length},(_,j)=>base[j%8]));}const base=colors.slice(0,8);colors.splice(0,colors.length,...Array.from({length:levels.length},(_,j)=>base[j%8]));}
function courseCamera(b){return endlessMode||levels.length<=8||!b?0:b.courseCamera||0;}
function tickCourseCameras(dt){
 if(endlessMode||levels.length<=8)return;
 for(const b of lanes){const old=b.courseCamera||0,screenY=b.y-old,max=courseFloor()-1140;let target=old;
  // Hold the camera through ordinary bounces. Pan only when the ball leaves a broad safe zone.
  if(screenY>760)target=b.y-650;else if(screenY<260)target=b.y-360;
  target=Math.max(0,Math.min(max,target));const ease=1-Math.exp(-Math.max(0,dt)*(target>old?5:3));let next=old+(target-old)*ease;
  // Fast ults must stay visible, without pinning every ordinary frame to the ball.
  if(b.y-next>1030)next=b.y-1030;if(b.y-next<140)next=b.y-140;
  b.courseCamera=Math.max(0,Math.min(max,next));
 }
}
function drawCourseEffects(draw){if(endlessMode||levels.length<=8){draw();return;}for(let side=0;side<lanes.length;side++){ctx.save();ctx.beginPath();ctx.rect(side?348:36,76,276,1081);ctx.clip();ctx.translate(0,-courseCamera(lanes[side]));draw();ctx.restore();}}
function getCourseSoloRecord(role,parameters){const current=soloRecords[role+':'+JSON.stringify(parameters)];if((parameters.courseBoards||8)!==8)return current;const legacy={...parameters};delete legacy.courseBoards;const old=soloRecords[role+':'+JSON.stringify(legacy)];return !current||old&&old.time<current.time?old:current;}
