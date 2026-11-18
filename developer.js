// All gameplay tuning lives here; the editor validates and persists this schema.
const tuningGroups={
'通用运动':{gravity:['重力',1100,100,5000],vxMin:['初始水平速度下限',35,0,300],vxRange:['初始水平随机增量',30,0,300],vxMax:['水平速度上限',100,1,500],vxFloor:['水平速度最低值',25,0,300],vxJitter:['每次撞击水平扰动范围',35,0,300],bounce:['普通反弹基准',260,20,800],bounceRandom:['普通反弹随机增量',120,0,500],fall:['破板下落速度基准',70,0,500],fallRandom:['破板下落随机增量',60,0,300]},
'怒焰球':{weight:['初始重量',100,1,1e10],growth:['每次撞击重量倍率',2.6,1,100],rageGain:['每击怒气',15,0,1000],rageMax:['怒气上限',100,1,1000],rageDuration:['狂暴时长（秒）',2,.1,30],rageMultiplier:['狂暴伤害倍率',100,1,1e8],ragePercent:['狂暴最低伤害（初始板值 %）',12,0,100],rageBounce:['狂暴反弹基准',80,10,800],rageRandom:['狂暴反弹随机增量',40,0,500]},
'根号球 / 立方根球 / ln 球':{rootBounce:['根号球反弹基准',235,20,800],rootDegree:['根号球开方次数',2,1.01,20],cubeDegree:['立方根球开方次数',3,1.01,20],cubeWait:['立方根球蓄力（秒）',.1,0,10],cubeBounce:['立方根球反弹基准倍率',1.3,.1,5],cubeSpeed:['立方根球速度倍率',1.2,.1,5],lnBase:['ln 球对数底数（e≈2.71828）',Math.E,1.01,100]},
'钻头球':{drillPityReduction:['连续普通钻击后的时长缩短 %',20,0,60],drillDuration:['钻击时长（秒）',1,.05,10],drillHits:['普通钻击破板次数',6,1,100,1],drillChance:['粉碎大招概率 %',35,0,100],drillBounce:['钻头反弹基准',120,10,800],drillRandom:['钻头反弹随机增量',50,0,500]},
'凝霜球':{frostRate:['霜斑冻结速率',.65,.1,3],frostRadius:['霜斑半径',42,20,80],frostCrackSpeed:['冻结裂纹深入速度（像素/秒）',18,4,60],frostSplitDelay:['冻胀断裂等待秒数',1.4,.2,4],frostUltHits:['骤冷触发撞击数',6,2,15,1],frostUltDuration:['骤冷强化有效秒数',4,1,10],frostUltRadius:['骤冷冻结加速倍率',2.4,1,6]},
'混沌球':{chaosMin:['随机开方次数下限',2,1.01,20],chaosMax:['随机开方次数上限',6,1.01,30],chaosChance:['二次触发概率 %',20,0,100]},
'裂纹 / 特效':{crackInterval:['钻击裂纹生长间隔（秒）',.08,.01,1],crackEnergy:['钻击应力能量',4,1,20],crackBranch:['裂纹分叉概率 %',14,0,100],crackLimit:['每板裂纹段数上限',220,20,600,1],crackReveal:['裂纹展开速度',8,1,30],shake:['爆炸震屏强度倍率',1,0,3],drillShake:['钻击板面震动倍率',1,0,3],particles:['粒子数量倍率',1,0,3]}
};
for(let i=0;i<8;i++){(tuningGroups['板数值（10 的指数，如 3 表示 1000）']??={})['board'+i]=['第 '+(i+1)+' 层指数',[Math.log10(512),Math.log10(16384),9.934,15.352,24.685,36.124,55.09,616.509][i],0,10000]}
const tuningSchema=Object.assign({},...Object.values(tuningGroups));
const tuningDefaults=Object.fromEntries(Object.entries(tuningSchema).map(([k,v])=>[k,v[1]]));
function validateTuning(input){if(!input||typeof input!=='object'||Array.isArray(input))throw Error('配置必须是 JSON 对象');const next={...tuningDefaults};for(const [key,value] of Object.entries(input)){const spec=tuningSchema[key];if(!spec)throw Error('未知参数：'+key);if(typeof value!=='number'||!Number.isFinite(value)||value<spec[2]||value>spec[3]||(spec[4]===1&&!Number.isInteger(value)))throw Error(spec[0]+' 超出范围或格式错误');next[key]=value}if(next.chaosMax<next.chaosMin)throw Error('混沌球上限不能小于下限');if(next.vxFloor>next.vxMax||next.vxMin+next.vxRange>next.vxMax)throw Error('水平初速与最低速度不能超过上限');return next}
let tuning={...tuningDefaults};
let cfg={...tuning};
function initDeveloper(){const panel=document.querySelector('#developer');document.querySelector('#dev-open').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)renderDeveloper()};
function message(text){document.querySelector('#dev-message').textContent=text;interfaceSound(/^(已保存|已应用|已恢复|已导出)/.test(text)?'saved':'error')}
function save(next){tuning=validateTuning(next);try{localStorage.setItem('ball-arena-tuning-v1',JSON.stringify(tuning));message('已保存，下一局生效（刷新后仍保留）。')}catch{message('已应用，下一局生效；浏览器未允许持久保存，请导出备份。')}renderRoster()}
function renderDeveloper(){document.querySelector('#dev-fields').innerHTML=Object.entries(tuningGroups).map(([group,fields])=>'<details open><summary>'+group+'</summary><div class="dev-grid">'+Object.entries(fields).map(([key,s])=>'<label>'+s[0]+'<input type="number" data-setting="'+key+'" min="'+s[2]+'" max="'+s[3]+'" step="'+(s[4]||'any')+'" value="'+tuning[key]+'"><small>'+s[2]+' ～ '+s[3]+'</small></label>').join('')+'</div></details>').join('')}
document.querySelector('#dev-form').onsubmit=e=>{e.preventDefault();try{const next={};document.querySelectorAll('[data-setting]').forEach(el=>{if(el.value.trim()==='')throw Error('参数不能为空');next[el.dataset.setting]=Number(el.value)});save(next)}catch(err){message(err.message)}};
document.querySelector('#dev-default').onclick=()=>{save({...tuningDefaults});renderDeveloper();message('已恢复默认参数，下一局生效。')};
document.querySelector('#dev-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(tuning,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ball-arena-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('已导出保存过的配置。')};
document.querySelector('#dev-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;save(JSON.parse(await file.text()));renderDeveloper()}catch(err){message('导入失败：'+err.message)}finally{e.target.value=''}};
}
