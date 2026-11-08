import{DINING_TABLES,SERVICE_PASS}from'./world-layout.js';
export const FOODS=['banh','special','tea','pho'];export const FOOD_PRICE={banh:12,special:18,tea:10,pho:28};
export const foodBag=()=>({banh:0,special:0,tea:0,pho:0});
const total=b=>Object.values(b).reduce((n,v)=>n+v,0),near=(a,p,r=43)=>Math.hypot(a.x-p.x,a.y-p.y)<r;
export const GUEST_TYPES={
 regular:{label:'Khách quen',icon:'♥',people:1,patience:78,eat:14,order:()=>({banh:0,special:0,tea:1,pho:1}),look:6},
 hurry:{label:'Khách vội',icon:'⌛',people:1,patience:48,eat:9,order:()=>({banh:0,special:0,tea:1,pho:1}),look:2},
 friends:{label:'Nhóm bạn',icon:'☻',people:2,patience:95,eat:18,order:()=>({banh:2,special:0,tea:2,pho:0}),look:3},
};
export const DINING_UPGRADES=[
 {id:'dining',cost:380,icon:'🍽',name:'Mở sân ăn tại chỗ',description:'Hai bàn, xe phục vụ và khách ngồi ăn thật.',day:3,requires:'pho',section:'dining'},
 {id:'thirdTable',cost:260,icon:'▦',name:'Thêm bàn thứ ba',description:'Đón thêm một nhóm khách · Thêm chỗ điều phối.',requires:'dining',section:'dining',condition:s=>s.dining.stats.parties>=3,lock:'Phục vụ 3 bàn trước'},
 {id:'waiter',cost:360,icon:'👩🏻‍🍳',name:'Mời Mai phục vụ bàn',description:'Mai lấy món, phục vụ, thu và dọn một bàn được giao.',requires:'dining',section:'dining',condition:s=>s.dining.stats.parties>=2,lock:'Phục vụ 2 bàn trước'},
 {id:'serviceCart',cost:180,icon:'⚡',name:'Xe phục vụ nhanh',description:'Mai đi nhanh, mang 7 món và phụ tối đa hai bàn.',requires:'waiter',section:'dining'},
 {id:'canopy',cost:220,icon:'🏮',name:'Đèn lồng & bóng mát',description:'Khách đợi thêm 15 giây · Sân ấm áp, tip nhỉnh hơn.',requires:'dining',section:'dining',condition:s=>s.dining.reputation>=28,lock:'Cần 28 uy tín'},
];
export function diningState(){const stats={parties:0,cleaned:0,abandoned:0,turnaways:0,dishes:0,revenue:0,tips:0,regular:0,hurry:0,friends:0,events:0};return{day:3,startedAt:null,openedAt:null,dayBase:{...stats},claimed:[],history:[],reputation:0,loyalVisits:0,focus:null,assignment:[0],waiter:null,buffer:foodBag(),spawnTimer:4,nextParty:1,navVersion:0,waiting:null,guests:[],tables:DINING_TABLES.map(t=>({id:t.id,state:'empty',party:null,order:foodBag(),delivered:foodBag(),base:0,settled:false,coins:0,waitLeft:0,waitMax:0,eatLeft:0,clean:0,kind:'regular',servedIn:0})),stats,event:{active:false,left:0,cooldown:0,serial:0,start:0,best:0,last:0,target:3,kind:'hurry'}};}
export const activeTables=s=>s.dining.tables.filter(t=>t.id<2||s.upgrades.thirdTable);
export function needs(t){return Object.fromEntries(FOODS.map(k=>[k,Math.max(0,t.order[k]-t.delivered[k])]));}
export function unpaidMeals(s){const b=foodBag();for(const t of s.dining.tables)if(!t.settled)for(const k of FOODS)b[k]+=t.delivered[k];return b;}
export function diningCoins(s){return s.dining.tables.reduce((n,t)=>n+t.coins,0);}
export function selectTable(s,id){const t=activeTables(s).find(t=>t.id===id);if(!t)return false;s.dining.focus=id;return true;}
export function assignTable(s,id){if(!s.dining.waiter||!activeTables(s).some(t=>t.id===id))return false;const list=s.dining.assignment,index=list.indexOf(id);if(index>=0)list.splice(index,1);else{const cap=s.upgrades.serviceCart?2:1;if(list.length>=cap)list.shift();list.push(id);}s.dining.waiter.path=[];return true;}
export function diningUpgrade(s,id,emptyBag){const d=s.dining;if(id==='dining'){d.openedAt=s.elapsed;d.spawnTimer=3;}if(id==='thirdTable')d.navVersion++;if(id==='waiter')d.waiter={x:480,y:1740,step:0,face:-1,action:0,bag:emptyBag(),name:'MAI',serviceRole:true,path:[],target:null};}
function newParty(s,kind,env){const d=s.dining,p=GUEST_TYPES[kind],id=d.nextParty++,order=p.order();return{id,kind,order,people:p.people};}
function reserve(s,table,party){const d=s.dining;if(d.focus===table.id)d.focus=null;const p=GUEST_TYPES[party.kind];Object.assign(table,{state:'seating',party:party.id,order:{...party.order},delivered:foodBag(),base:0,settled:false,waitLeft:p.patience+(s.upgrades.canopy?15:0),waitMax:p.patience+(s.upgrades.canopy?15:0),eatLeft:p.eat,clean:0,kind:party.kind,servedIn:0});for(const g of d.guests.filter(g=>g.party===party.id)){g.table=table.id;g.phase='enter';g.path=[];}}
function spawn(s,party){const d=s.dining,p=GUEST_TYPES[party.kind];for(let i=0;i<party.people;i++)d.guests.push({id:party.id*2+i,party:party.id,seat:i,table:null,x:550,y:1770+i*36,step:0,face:-1,action:0,look:p.look+i,kind:party.kind,phase:'queue',path:[]});}
function settle(s,t,full,emit){if(t.settled)return;const d=s.dining,items=total(t.delivered);t.settled=true;const speed=Math.max(0,t.waitLeft/Math.max(1,t.waitMax));let tip=full?Math.floor(t.base*(.05+speed*.08+(s.upgrades.canopy?.02:0))):0;
 if(full&&t.kind==='regular'){d.loyalVisits++;if(d.loyalVisits%3===0)tip+=3;}const bill=t.base+tip;t.coins+=bill;s.revenue+=bill;s.sold+=items;s.served+=items?1:0;s.stats.soldBanh+=t.delivered.banh+t.delivered.special;s.stats.soldTea+=t.delivered.tea;s.stats.soldPho+=t.delivered.pho;d.stats.revenue+=bill;d.stats.tips+=tip;d.stats.dishes+=items;
 if(full){d.stats.parties++;d.stats[t.kind]++;d.reputation+=t.kind==='regular'?3:2;}else{d.stats.abandoned++;d.reputation=Math.max(0,d.reputation-1);}t.state='leaving';for(const g of d.guests.filter(g=>g.party===t.party)){g.phase='leave';g.seated=false;g.holding=null;g.path=[];}if(bill)emit('sold',{x:DINING_TABLES[t.id].cx,y:DINING_TABLES[t.id].cy,amount:bill});}
function collect(s,t,emit){if(!t.coins)return;const amount=t.coins;t.coins=0;s.money+=amount;s.stats.collected+=amount;emit('money',{...DINING_TABLES[t.id].point,amount});}
export function interactTable(s,a,t,dt,emit){const d=s.dining;if(!near(a,DINING_TABLES[t.id].point,46))return false;collect(s,t,emit);
 if(t.state==='dirty'){t.clean+=dt;a.action=.06;if(t.clean>=1.5){t.state='empty';t.party=null;t.delivered=foodBag();t.order=foodBag();t.base=0;t.settled=false;t.clean=0;d.stats.cleaned++;emit('clean',{...DINING_TABLES[t.id].point});}return true;}
 if(t.state!=='waiting'||a.action>0)return false;for(const k of FOODS)if(a.bag[k]>0&&t.delivered[k]<t.order[k]){a.bag[k]--;t.delivered[k]++;t.base+=k==='tea'&&s.owner.ice.freshLeft>0?13:FOOD_PRICE[k];a.action=.26;emit('drop',{x:DINING_TABLES[t.id].cx,y:DINING_TABLES[t.id].cy,kind:k});if(total(needs(t))===0){t.state='eating';if(a===s.player)d.focus=null;t.servedIn=t.waitMax-t.waitLeft;for(const g of d.guests.filter(g=>g.party===t.party)){g.phase='eat';g.holding=t.kind==='friends'?'banh':'pho';}emit('dining',{text:'Đủ món rồi · Khách bắt đầu dùng bữa.'});}return true;}return false;}
function pass(s,a,t,cap,emit){if(a.action>0)return;const d=s.dining,needed=t?needs(t):foodBag();for(const k of FOODS){if(a.bag[k]>needed[k]){a.bag[k]--;d.buffer[k]++;a.action=.22;emit('drop',{x:SERVICE_PASS.x,y:SERVICE_PASS.y-30,kind:k});return;}}
 if(total(a.bag)>=cap)return;for(const k of FOODS)if(a.bag[k]<needed[k]){const source=d.buffer[k]>0?d.buffer:s.stock;if(source[k]>0){source[k]--;a.bag[k]++;a.action=.24;emit('pickup',{x:a.x,y:a.y,kind:k});return;}}}
export function focusedTable(s){const d=s.dining;return activeTables(s).find(t=>t.id===d.focus&&t.state==='waiting')||activeTables(s).filter(t=>t.state==='waiting'&&(!d.waiter||!d.assignment.includes(t.id))).sort((a,b)=>a.waitLeft-b.waitLeft)[0]||null;}
export function interactDining(s,a,dt,emit){if(!s.upgrades.dining||a!==s.player)return;for(const t of activeTables(s))if(near(a,DINING_TABLES[t.id].point,46)){if(t.state==='waiting')s.dining.focus=t.id;interactTable(s,a,t,dt,emit);}if(near(a,SERVICE_PASS)&&!s.owner.takeaway.active)pass(s,a,focusedTable(s),s.upgrades.capacity?7:4,emit);}
export function startDiningEvent(s,emit=()=>{}){const d=s.dining,e=d.event;if(!s.upgrades.dining||e.active||e.cooldown>0||d.stats.parties<2)return false;e.kind=['hurry','friends','regular'][e.serial%3];e.serial++;e.active=true;e.left=e.kind==='hurry'?90:110;e.start=d.stats.parties;e.target=e.kind==='regular'?4:3;d.spawnTimer=0;emit('dining',{text:'Ca đặc biệt bắt đầu · Hãy chọn bàn ưu tiên.'});return true;}
export function diningQuests(s){const d=s.dining,delta=k=>Math.max(0,d.stats[k]-d.dayBase[k]);if(s.day<3)return[];if(d.day===3)return[
 {id:'d-open',icon:'🍽',title:'Mời khách ngồi lại',description:'Mở sân ăn với hai bàn thật.',max:1,reward:80,value:()=>+!!s.upgrades.dining},
 {id:'d-serve',icon:'♨',title:'Bữa đầu ấm bụng',description:'Phục vụ trọn vẹn 8 bàn ăn.',max:8,reward:120,value:()=>delta('parties')},
 {id:'d-clean',icon:'✧',title:'Bàn sạch đón khách',description:'Dọn 4 bàn sau khi khách rời đi.',max:4,reward:100,value:()=>delta('cleaned')},
 {id:'d-team',icon:'☻',title:'Có Mai cùng lo',description:'Thuê Mai và giao một bàn cho bạn ấy.',max:1,reward:100,value:()=>+(!!d.waiter&&d.assignment.length>0)},
 ];return[
 {id:'d-serve',icon:'🍽',title:'Nhịp phố mỗi ngày',description:'Phục vụ trọn vẹn các bàn trong ngày.',max:8+Math.min(4,d.day-4),reward:120,value:()=>delta('parties')},
 {id:'d-types',icon:'☻',title:'Mỗi khách một câu chuyện',description:'Phục vụ khách quen, khách vội và nhóm bạn.',max:3,reward:90,value:()=>['regular','hurry','friends'].filter(k=>delta(k)>0).length},
 {id:'d-clean',icon:'✧',title:'Bàn sạch đón khách',description:'Dọn 6 bàn trong ngày.',max:6,reward:90,value:()=>delta('cleaned')},
 {id:'d-shift',icon:'☀',title:'Một ca đáng nhớ',description:'Hoàn thành một ca đặc biệt tùy chọn.',max:1,reward:120,value:()=>delta('events')},
 ];}
export function claimDiningQuest(s,id,emit=()=>{}){const d=s.dining,q=diningQuests(s).find(q=>q.id===id);if(!q||d.claimed.includes(id)||q.value()<q.max)return false;d.claimed.push(id);s.money+=q.reward;s.stats.rewards+=q.reward;emit('reward',{text:`${q.title} · +${q.reward} xu`,amount:q.reward});if(d.claimed.length===4){d.history.push({day:d.day,parties:d.stats.parties-d.dayBase.parties,revenue:d.stats.revenue-d.dayBase.revenue});if(d.history.length>30)d.history.shift();d.day++;s.day=d.day;d.dayBase={...d.stats};d.claimed=[];emit('dining',{text:'Ngày mới đã mở · Tiếp tục câu chuyện của sân ăn.'});}return true;}
export function diningGoal(s){if(s.day<3)return null;if(!s.upgrades.dining)return{text:'Mở sân ăn tại chỗ · 380 xu',value:s.money,max:380,station:'shop'};const q=diningQuests(s).find(q=>!s.dining.claimed.includes(q.id));return q?{text:q.title,value:q.value(),max:q.max,quest:q.id}:null;}
export function updateDining(s,dt,emit,env){const d=s.dining;if(s.day2.completed&&s.day<3){s.day=3;d.startedAt=s.elapsed;d.dayBase={...d.stats};emit('dining',{text:'Ngày 03 · Mời cả phố ngồi lại dùng bữa!'});}if(!s.upgrades.dining)return;
 d.spawnTimer=Math.max(0,d.spawnTimer-dt);const e=d.event;e.cooldown=Math.max(0,e.cooldown-dt);if(e.active){e.left=Math.max(0,e.left-dt);if(!e.left){e.active=false;e.last=d.stats.parties-e.start;e.best=Math.max(e.best,e.last);e.cooldown=45;if(e.last>=e.target){d.stats.events++;emit('dining',{text:'Ca đặc biệt thành công · Cùng giữ nhịp quán nhé!'});}else emit('dining',{text:'Ca đã khép lại · Chuẩn bị hàng rồi thử lại, không mất tiến độ.'});}}
 if(d.spawnTimer<=0&&!d.waiting&&d.guests.length<7){d.spawnTimer=e.active?8:18;const kind=e.active?e.kind:['regular','hurry','friends'][Math.floor(env.random()*3)],party=newParty(s,kind,env);if(d.guests.length+party.people<=8){spawn(s,party);const t=activeTables(s).find(t=>t.state==='empty');if(t)reserve(s,t,party);else d.waiting={...party,left:16};}}
 if(d.waiting){const t=activeTables(s).find(t=>t.state==='empty');if(t){reserve(s,t,d.waiting);d.waiting=null;}else{d.waiting.left-=dt;if(d.waiting.left<=0){for(const g of d.guests.filter(g=>g.party===d.waiting.id))g.phase='leave';d.stats.turnaways++;d.waiting=null;}}}
 for(const g of d.guests){g.moving=false;const t=g.table===null?null:d.tables[g.table];if(g.phase==='enter'){const seat=DINING_TABLES[g.table].seats[g.seat];if(env.walk(g,seat,g.kind==='hurry'?105:80)){g.phase='wait';g.seated=true;g.dirX=g.seat?-.25:.25;g.dirY=1;}}
  else if(g.phase==='leave')env.walk(g,{x:550,y:1770+g.seat*36},100);}
 d.guests=d.guests.filter(g=>!(g.phase==='leave'&&near(g,{x:550,y:1770+g.seat*36},9)));
 for(const t of activeTables(s)){
  if(t.state==='seating'){const guests=d.guests.filter(g=>g.party===t.party);if(guests.length&&guests.every(g=>g.phase==='wait'))t.state='waiting';}
  else if(t.state==='waiting'){t.waitLeft=Math.max(0,t.waitLeft-dt);if(!t.waitLeft)settle(s,t,false,emit);}
  else if(t.state==='eating'){t.eatLeft=Math.max(0,t.eatLeft-dt);if(!t.eatLeft)settle(s,t,true,emit);}
  else if(t.state==='leaving'&&!d.guests.some(g=>g.party===t.party&&near(g,{x:DINING_TABLES[t.id].cx,y:DINING_TABLES[t.id].cy-40},90)))t.state='dirty';
 }
 const w=d.waiter;if(w){w.action=Math.max(0,w.action-dt);w.moving=false;const assigned=activeTables(s).filter(t=>d.assignment.includes(t.id));let t=assigned.filter(t=>t.state==='waiting').sort((a,b)=>a.waitLeft-b.waitLeft)[0]||assigned.find(t=>t.state==='dirty'||t.coins>0);w.target=t?.id??null;
  const have=t&&FOODS.some(k=>w.bag[k]>0&&needs(t)[k]>0),dest=t&&(t.state==='dirty'||t.coins>0||have)?{x:DINING_TABLES[t.id].point.x+26,y:DINING_TABLES[t.id].point.y}: {x:SERVICE_PASS.x+26,y:SERVICE_PASS.y};
  if(env.walk(w,dest,s.upgrades.serviceCart?140:105)){if(t&&near(w,DINING_TABLES[t.id].point,46)&&(t.state==='dirty'||t.coins>0||have))interactTable(s,w,t,dt,emit);else pass(s,w,t?.state==='waiting'?t:null,s.upgrades.serviceCart?7:4,emit);}
 }
}
// Validate persisted reservations and settlement state before accepting an import.
// Render-only paths/poses are discarded on decode and never authorize transactions.
export function validDining(d,s,blocked){
 const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9,finite=n=>Number.isFinite(n)&&n>=0;
 const bag=b=>b&&FOODS.every(k=>int(b[k])),id=n=>Number.isInteger(n)&&n>=0&&n<3;
 if(!d||!int(d.day)||d.day<3||!int(d.reputation)||!int(d.loyalVisits)||!int(d.nextParty)||!d.nextParty||!int(d.navVersion)||!finite(d.spawnTimer)||!bag(d.buffer))return false;
 if(!Array.isArray(d.tables)||d.tables.length!==3||!Array.isArray(d.guests)||d.guests.length>8||!Array.isArray(d.assignment)||new Set(d.assignment).size!==d.assignment.length||d.assignment.length>(s.upgrades.serviceCart?2:1)||d.assignment.some(n=>!id(n)||n===2&&!s.upgrades.thirdTable))return false;
 if(d.focus!==null&&(!id(d.focus)||d.focus===2&&!s.upgrades.thirdTable)||![d.startedAt,d.openedAt].every(v=>v===null||finite(v)&&v<=s.elapsed))return false;
 if(!d.stats||!d.dayBase||!Object.keys(diningState().stats).every(k=>int(d.stats[k])&&int(d.dayBase[k])&&d.dayBase[k]<=d.stats[k]))return false;
 if(d.stats.regular+d.stats.hurry+d.stats.friends!==d.stats.parties||d.stats.tips>d.stats.revenue)return false;
 if(!Array.isArray(d.claimed)||new Set(d.claimed).size!==d.claimed.length||d.claimed.some(n=>!(d.day===3?['d-open','d-serve','d-clean','d-team']:['d-serve','d-types','d-clean','d-shift']).includes(n))||!Array.isArray(d.history)||d.history.length>30||d.history.some(h=>!int(h.day)||h.day<3||h.day>=d.day||!int(h.parties)||!int(h.revenue)))return false;
 const parties=new Set();
 for(const [i,t]of d.tables.entries()){
  if(t.id!==i||!['empty','seating','waiting','eating','leaving','dirty'].includes(t.state)||!GUEST_TYPES[t.kind]||!bag(t.order)||!bag(t.delivered)||FOODS.some(k=>t.order[k]>4||t.delivered[k]>t.order[k])||!int(t.base)||!int(t.coins)||typeof t.settled!=='boolean'||![t.waitLeft,t.waitMax,t.eatLeft,t.clean,t.servedIn].every(finite)||t.waitLeft>t.waitMax||t.clean>1.5)return false;
  const low=FOODS.reduce((n,k)=>n+t.delivered[k]*FOOD_PRICE[k],0);
  if(t.base<low||t.base>low+t.delivered.tea*3)return false;
  if(t.state==='empty'){if(t.party!==null||t.settled||total(t.order)||total(t.delivered)||t.base)return false;}
  else{
   if(!int(t.party)||!t.party||t.party>=d.nextParty||parties.has(t.party))return false;parties.add(t.party);
   if(FOODS.some(k=>t.order[k]!==GUEST_TYPES[t.kind].order()[k]))return false;
   if(['leaving','dirty'].includes(t.state)!==t.settled)return false;
   if(t.state==='eating'&&total(needs(t)))return false;
  }
  if(i===2&&!s.upgrades.thirdTable&&t.state!=='empty')return false;
 }
 if(new Set(d.guests.map(g=>g.id)).size!==d.guests.length)return false;
 for(const g of d.guests){
  if(![g.x,g.y,g.step].every(Number.isFinite)||!int(g.party)||!g.party||g.party>=d.nextParty||!int(g.id)||!int(g.seat)||g.seat>=GUEST_TYPES[g.kind]?.people||!GUEST_TYPES[g.kind]||!['queue','enter','wait','eat','leave'].includes(g.phase)||g.table!==null&&!id(g.table)||blocked(g.x,g.y,12,s))return false;
  if(g.phase==='queue'){if(!d.waiting||g.party!==d.waiting.id||g.table!==null)return false;}
  else if(g.phase!=='leave'){
   const t=d.tables[g.table];if(!t||t.party!==g.party||t.kind!==g.kind||!['seating','waiting','eating'].includes(t.state))return false;
   if(g.phase==='eat'&&t.state!=='eating')return false;
  }
 }
 for(const t of d.tables.filter(t=>['seating','waiting','eating'].includes(t.state))){const guests=d.guests.filter(g=>g.party===t.party);if(guests.length!==GUEST_TYPES[t.kind].people||new Set(guests.map(g=>g.seat)).size!==guests.length)return false;}
 if(d.waiting&&(!int(d.waiting.id)||d.waiting.id>=d.nextParty||!GUEST_TYPES[d.waiting.kind]||!finite(d.waiting.left)||d.waiting.left>16||!bag(d.waiting.order)||FOODS.some(k=>d.waiting.order[k]!==GUEST_TYPES[d.waiting.kind].order()[k])||d.guests.filter(g=>g.party===d.waiting.id&&g.phase==='queue').length!==GUEST_TYPES[d.waiting.kind].people))return false;
 const e=d.event;if(!e||typeof e.active!=='boolean'||![e.left,e.cooldown].every(finite)||![e.serial,e.start,e.best,e.last,e.target].every(int)||e.left>110||e.start>d.stats.parties||!GUEST_TYPES[e.kind]||e.active&&!s.upgrades.dining)return false;
 if(d.waiter&&(!s.upgrades.waiter||![d.waiter.x,d.waiter.y,d.waiter.step,d.waiter.action,d.waiter.face].every(Number.isFinite)||!d.waiter.bag||!['raw','banh','special','tea','rawPho','pho','ice'].every(k=>int(d.waiter.bag[k]))||blocked(d.waiter.x,d.waiter.y,12,s)))return false;
 if(s.upgrades.waiter&&!d.waiter||s.upgrades.dining&&(!s.upgrades.pho||s.day<3)||['thirdTable','waiter','canopy'].some(k=>s.upgrades[k]&&!s.upgrades.dining)||s.upgrades.serviceCart&&!s.upgrades.waiter||s.day>=3&&d.day!==s.day)return false;
 return true;
}
