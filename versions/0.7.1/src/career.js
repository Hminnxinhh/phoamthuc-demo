import {hasPrize} from './venues.js';
import {priceFor,isMoney,validBasis,legacyVnd} from './currency.js';
import {STATIONS} from './world-layout.js';
const ROLES=['owner','linh','an','mai'];
const foodBag=()=>({banh:0,special:0,tea:0,pho:0});
export const CHARACTERS=[{id:'owner',name:'Chủ quán',icon:'👨🏻‍🍳'},{id:'linh',name:'Linh',icon:'🥖',requires:'worker'},{id:'an',name:'An',icon:'🍜',requires:'worker2'},{id:'mai',name:'Mai',icon:'🍽',requires:'waiter'}];
export const TRACKS={
 stride:{title:'Bước chân nhanh',description:'Tốc độ tăng 10%, 20%, rồi 30% qua ba bậc.',cost:[200000,480000,960000]},
 carry:{title:'Bê hàng vững tay',description:'Mỗi bậc mang thêm một món thật.',cost:[220000,500000,1000000]},
 service:{title:'Tay nghề chủ quán',description:'Thời gian giao món và lau bàn giảm 15%, 28%, rồi 40%.',cost:[200000,460000,920000]},
};
export const tracksFor=role=>role==='owner'?['stride','carry','service']:['stride','carry'];
export function careerState(s=null){
 const stocked=s?Math.max(0,s.stats.stocked-s.stats.workerStocked-s.stats.workerPhoStocked):0;
 const xp={owner:Math.min(80,stocked+(s?.owner.takeaway.completed||0)*8),linh:Math.min(50,s?.stats.workerStocked||0),an:Math.min(50,s?.stats.workerPhoStocked||0),mai:Math.min(30,(s?.dining.stats.parties||0)*2)};
 return{roles:Object.fromEntries(ROLES.map(id=>[id,{xp:xp[id],levels:Object.fromEntries(tracksFor(id).map(k=>[k,0]))}])),spent:0,claimed:[],stats:{ownerDishes:0,ownerCleaned:0,officeCompleted:0,welcomeCompleted:0},contract:{round:0,start:0},office:{priceBasis:'current',active:false,left:0,cooldown:0,stage:0,delivered:foodBag(),completed:0,missed:0,bonus:0},welcome:{active:false,stage:0,left:0,progress:0,cooldown:0,kind:'market',startSold:0,completed:0,missed:0,last:0}};
}
export const level=(s,role,track)=>s.career?.roles[role]?.levels[track]||0;
export const speedFactor=(s,role)=>[1,1.10,1.20,1.30][level(s,role,'stride')];
export function carryCapacity(s,role='owner'){const base=role==='owner'?(s.upgrades.capacity?7:4):role==='linh'?(s.upgrades.efficiency?5:3):role==='an'?(s.upgrades.phoBoiler?4:3):(s.upgrades.serviceCart?7:4);return base+level(s,role,'carry')+(role==='owner'&&hasPrize(s,'dining','s-hands')?1:0);}
export const serviceFactor=s=>[1,.85,.72,.60][level(s,'owner','service')];
export const trained=s=>Object.values(s.career.roles).reduce((n,r)=>n+Object.values(r.levels).reduce((a,b)=>a+b,0),0);
export function gainXP(s,role,amount){if(s.career&&Number.isSafeInteger(amount)&&amount>0)s.career.roles[role].xp+=amount;}
export function nextTraining(s,role,track){const r=s.career?.roles[role],l=r?.levels[track];if(l===undefined)return null;const who=CHARACTERS.find(c=>c.id===role);return{level:l,cost:TRACKS[track].cost[l]||0,xp:[20,70,180][l]||0,owned:!who.requires||!!s.upgrades[who.requires],max:l===3};}
export function train(s,role,track,emit=()=>{}){const n=nextTraining(s,role,track);if(!n||n.max||!n.owned||s.money<n.cost||s.career.roles[role].xp<n.xp)return false;s.money-=n.cost;s.career.spent+=n.cost;s.career.roles[role].levels[track]++;emit('career',{text:'Đã luyện kỹ năng · Trang bị và hiệu quả làm việc đã thay đổi.'});return true;}
const OFFICE_RECIPES=[{bread:3,tea:2,pho:0},{bread:0,tea:2,pho:2}];
export const officeRecipe=s=>OFFICE_RECIPES[Math.min(1,s.career.office.stage)];
export function officeRemaining(s){const q=s.career.office,r={bread:0,tea:0,pho:0};if(!q.active)return r;for(let i=q.stage;i<2;i++){r.bread+=OFFICE_RECIPES[i].bread;r.tea+=OFFICE_RECIPES[i].tea;r.pho+=OFFICE_RECIPES[i].pho;}r.bread-=q.delivered.banh+q.delivered.special;r.tea-=q.delivered.tea;r.pho-=q.delivered.pho;return r;}
export function startOffice(s,emit=()=>{}){const q=s.career.office;if(s.day<2||!s.upgrades.pho||!s.upgrades.tea||!s.upgrades.worker||q.active||q.cooldown||s.owner.takeaway.active)return false;Object.assign(q,{priceBasis:'current',active:true,left:150,stage:0,delivered:foodBag()});emit('career',{text:'Đơn văn phòng · Hai điểm giao, có thể giao từng phần. Hàng luôn có nguồn thật.'});return true;}
export function startWelcome(s,kind,emit=()=>{}){const q=s.career.welcome;if(!['market','office'].includes(kind)||s.day<2||!s.upgrades.worker||q.active||q.cooldown)return false;Object.assign(q,{active:true,stage:0,left:90,progress:0,kind});emit('career',{text:'Mời đoàn phố · Ghé điểm đầu hẻm rồi điểm văn phòng để đón khách.'});return true;}
export const welcomeBoost=s=>s.career?.welcome.active&&s.career.welcome.stage===2;
function handOffice(s,dt,emit){const q=s.career.office,a=s.player,p=q.stage===0?STATIONS.office:STATIONS.invite;if(Math.hypot(a.x-p.x,a.y-p.y)>43||a.action>0)return;
 const r=officeRecipe(s);for(const k of ['banh','special','tea','pho']){const need=k==='banh'||k==='special'?r.bread-q.delivered.banh-q.delivered.special:r[k]-q.delivered[k];if(need<=0||!a.bag[k])continue;
  a.bag[k]--;q.delivered[k]++;a.action=.24*serviceFactor(s);const price=priceFor(k,q.priceBasis,s.owner.ice.freshLeft>0);s.money+=price;s.revenue+=price;s.sold++;s.served++;s.stats.collected+=price;s.stats[k==='pho'?'soldPho':k==='tea'?'soldTea':'soldBanh']++;s.career.stats.ownerDishes++;gainXP(s,'owner',2);emit('money',{...p,amount:price});break;
 }
 if(q.delivered.banh+q.delivered.special>=r.bread&&q.delivered.tea>=r.tea&&q.delivered.pho>=r.pho){q.stage++;q.delivered=foodBag();if(q.stage===2){const bonus=140000+Math.min(40000,Math.floor(q.left/15)*4000);q.active=false;q.cooldown=75;q.completed++;q.bonus+=bonus;s.career.stats.officeCompleted++;s.money+=bonus;s.stats.rewards+=bonus;gainXP(s,'owner',10);emit('career',{text:'Đã giao hai điểm · Nhận tiền thưởng và kinh nghiệm chủ quán.'});}else emit('career',{text:'Xong điểm văn phòng · Mang phần còn lại tới đầu hẻm.'});}
}
export function updateCareer(s,dt,emit){const c=s.career,q=c.office,w=c.welcome;q.cooldown=Math.max(0,q.cooldown-dt);w.cooldown=Math.max(0,w.cooldown-dt);
 if(q.active){q.left=Math.max(0,q.left-dt);handOffice(s,dt,emit);if(!q.left&&q.active){q.active=false;q.missed++;q.cooldown=45;emit('career',{text:'Đơn đã khép · Tiền phần đã giao và món còn trên tay đều được giữ.'});}}
 if(w.active){w.left=Math.max(0,w.left-dt);if(w.stage<2){const p=w.stage===0?STATIONS.invite:STATIONS.office;if(Math.hypot(s.player.x-p.x,s.player.y-p.y)<43){w.progress+=dt;if(w.progress>=1.2){w.stage++;w.progress=0;if(w.stage===2){w.left=70;w.startSold=s.sold;emit('career',{text:'Đoàn khách đã lên đường · Phân bổ quầy và bán 28 món trong 70 giây.'});}}}else w.progress=0;}
  if(!w.left){w.active=false;w.last=w.stage===2?s.sold-w.startSold:0;w.cooldown=60;if(w.stage===2&&w.last>=28){w.completed++;c.stats.welcomeCompleted++;s.money+=80000;s.stats.rewards+=80000;gainXP(s,'owner',12);emit('career',{text:'Đón đoàn thành công · Quán có thêm uy tín nghề và tiền thưởng.'});}else{w.missed++;emit('career',{text:'Đoàn phố đã qua · Không mất tiền hay hàng, bạn có thể chuẩn bị rồi thử lại.'});}}}
}
export function careerGoals(s){const c=s.career,goals=[
 ['c-hands','Chủ quán vào guồng','Tự giao 12 món cho khách hoặc đơn văn phòng.',12,80,()=>c.stats.ownerDishes],
 ['c-clean','Bàn sạch nhờ bạn','Tự tay dọn 8 bàn để đón lượt khách mới.',8,80,()=>c.stats.ownerCleaned],
 ['c-office','Hai đầu phố','Hoàn tất 3 đơn văn phòng hai điểm giao.',3,140,()=>c.stats.officeCompleted],
 ['c-welcome','Cả phố biết quán','Đón thành công 2 đoàn khách do bạn đi mời.',2,140,()=>c.stats.welcomeCompleted],
 ['c-owner','Đồ nghề xứng tay','Mua 4 bậc kỹ năng của chủ quán.',4,100,()=>Object.values(c.roles.owner.levels).reduce((a,b)=>a+b,0)],
 ['c-team','Đồng đội trưởng thành','Mua 6 bậc kỹ năng cho Linh, An hoặc Mai.',6,140,()=>trained(s)-Object.values(c.roles.owner.levels).reduce((a,b)=>a+b,0)],
 ['c-master','Người giữ nhịp quán','Tự giao 60 món và có một kỹ năng chủ quán bậc 3.',60,180,()=>Math.max(...Object.values(c.roles.owner.levels))===3?c.stats.ownerDishes:0],
 ['c-specialists','Đội ngũ có nghề','Có 3 kỹ năng bất kỳ đạt bậc 3.',3,200,()=>Object.values(c.roles).flatMap(r=>Object.values(r.levels)).filter(l=>l===3).length],
 ].map(([id,title,description,max,reward,value])=>({id,title,description,max,reward:legacyVnd(reward),value}));
 if(c.claimed.length===8)goals.push({id:'c-contract',title:'Hợp đồng của chủ quán',description:'Tự giao thêm 20 món cho vòng hợp đồng tiếp theo.',max:20,reward:200000,value:()=>c.stats.ownerDishes-c.contract.start});return goals;
}
export function claimCareer(s,id,emit=()=>{}){const c=s.career,g=careerGoals(s).find(g=>g.id===id);if(!g||c.claimed.includes(id)||g.value()<g.max)return false;if(id==='c-contract'){c.contract.round++;c.contract.start=c.stats.ownerDishes;}else{c.claimed.push(id);if(c.claimed.length===8)c.contract.start=c.stats.ownerDishes;}s.money+=g.reward;s.stats.rewards+=g.reward;emit('career',{text:'Đã nhận thưởng thành tựu · Tiến độ mới tiếp tục mở.'});return true;}
export function careerGoal(s){if(s.day<3)return null;const q=careerGoals(s).find(q=>!s.career.claimed.includes(q.id));return q?{text:q.title,value:Math.max(0,q.value()),max:q.max,quest:q.id}:null;}
export function validCareer(c){const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9,finite=n=>Number.isFinite(n)&&n>=0,bag=b=>b&&['banh','special','tea','pho'].every(k=>int(b[k]));if(!c||!isMoney(c.spent)||!c.roles||!c.stats||!Object.keys(careerState().stats).every(k=>int(c.stats[k]))||!ROLES.every(id=>c.roles[id]&&int(c.roles[id].xp)&&tracksFor(id).every(k=>Number.isInteger(c.roles[id].levels?.[k])&&c.roles[id].levels[k]>=0&&c.roles[id].levels[k]<=3)))return false;
 const spent=ROLES.reduce((sum,id)=>sum+tracksFor(id).reduce((n,k)=>n+TRACKS[k].cost.slice(0,c.roles[id].levels[k]).reduce((a,b)=>a+b,0),0),0);if(spent!==c.spent||Object.keys(c.roles).length!==4||ROLES.some(id=>Object.keys(c.roles[id].levels).length!==tracksFor(id).length))return false;
 if(!Array.isArray(c.claimed)||new Set(c.claimed).size!==c.claimed.length||c.claimed.some(id=>!['c-hands','c-clean','c-office','c-welcome','c-owner','c-team','c-master','c-specialists'].includes(id))||!c.contract||![c.contract.round,c.contract.start].every(int)||c.contract.start>c.stats.ownerDishes)return false;
 const q=c.office,w=c.welcome;if(!q||!w||![q.active,w.active].every(v=>typeof v==='boolean')||![q.left,q.cooldown,w.left,w.cooldown,w.progress].every(finite)||q.left>150||w.left>90||w.progress>1.2||![q.completed,q.missed,w.completed,w.missed,w.last,w.startSold].every(int)||!validBasis(q.priceBasis)||!isMoney(q.bonus)||!bag(q.delivered)||![0,1,2].includes(q.stage)||![0,1,2].includes(w.stage)||q.active&&q.stage===2||!['market','office'].includes(w.kind))return false;
 const r=OFFICE_RECIPES[Math.min(q.stage,1)];return q.delivered.banh+q.delivered.special<=r.bread&&q.delivered.tea<=r.tea&&q.delivered.pho<=r.pho;
}
