const courseSelectors=['versus-course','solo-course','cup-course','allstar-course','rank-course'];
function syncCourseSelectors(){for(const id of courseSelectors){const node=document.querySelector('#'+id);if(node){node.disabled=id==='solo-course'&&modeNavigation.mode==='endless';node.value=String(node.disabled?8:tuning.courseBoards||8);for(const n of [8,12,16]){const radio=document.querySelector('#'+id+'-'+n);if(radio)radio.checked=String(n)===node.value;}}}}
for(const id of courseSelectors){const node=document.querySelector('#'+id);if(node)node.onchange=e=>{const n=Number(e.target.value);if(![8,12,16].includes(n))return;tuning.courseBoards=n;syncCourseSelectors();try{localStorage.setItem('ball-arena-tuning-v1',JSON.stringify(tuning));}catch{}if(typeof refreshSoloBest==='function')refreshSoloBest();if(typeof renderRank==='function')renderRank();};}
const selectionBeforeCourseControls=showModeSelection;showModeSelection=function(...args){selectionBeforeCourseControls(...args);syncCourseSelectors();};
const cupSetupBeforeCourseControls=showCupSetup;showCupSetup=function(...args){cupSetupBeforeCourseControls(...args);syncCourseSelectors();};document.querySelector('#tournament-open').onclick=showCupSetup;
const starSetupBeforeCourseControls=showAllstarSetup;showAllstarSetup=function(...args){starSetupBeforeCourseControls(...args);syncCourseSelectors();};document.querySelector('#allstar-open').onclick=showAllstarSetup;document.querySelector('#allstar-new').onclick=showAllstarSetup;
syncCourseSelectors();
const updateBeforeCourseCamera=update;update=function(dt){updateBeforeCourseCamera(dt);tickCourseCameras(dt);};

soloMechanics.lead[3]='按关卡进度分为前/中/后段，分别需要当前设置的大招命中次数整板震碎。';
for(const [key,label] of [['leadCrushFrontHits','前段整板震碎所需大招命中数'],['leadCrushMiddleHits','中段整板震碎所需大招命中数'],['leadCrushBackHits','后段整板震碎所需大招命中数']])tuningSchema[key][0]=label;
