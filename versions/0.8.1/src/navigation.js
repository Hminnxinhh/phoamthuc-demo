import{restaurantId,jobHere,legacyTrip,pantryDemand}from'./restaurants.js';
import{officeStation,welcomeStation}from'./career.js';
import{STATIONS}from'./world-layout.js';
import{carryCapacity,officeRecipe,officeRemaining,careerGoal,careerGoals}from'./career.js';
import{activeTables,needs}from'./dining.js';
export const stationCaption=(s,id)=>id==='office'&&s.owner.takeaway.active&&s.owner.takeaway.venue==='pho'?'Cửa quán phở':STATIONS[id]?.label;
export const NAVIGATION_KEY='pho-am-thuc.navigation';
export const ZONES={home:'Quán bánh mì & trà',pho:'Sân phở',dining:'Sân ăn tại chỗ'};
export function stationZone(id){return id==='office'||id.startsWith('pho')?'pho':id==='service'||id.startsWith('dining')||id.startsWith('table')?'dining':'home';}
export function stationUnlocked(s,id){if(!STATIONS[id])return false;if(stationZone(id)==='pho'&&!s.upgrades.pho)return false;if(stationZone(id)==='dining'&&!s.upgrades.dining)return false;if(id==='tea'&&!s.upgrades.tea||id==='table2'&&!s.upgrades.thirdTable)return false;return true;}
const nearby=(s,id)=>Math.hypot(s.player.x-STATIONS[id].x,s.player.y-STATIONS[id].y)<43;
const world=(id,label)=>({kind:'world',id,label,zone:stationZone(id)});
const panel=(label,overlay,tab=null)=>({kind:'panel',label,overlay,tab});
function supplyFood(s,kind){const b=s.player.bag;
 if(kind==='bread'){if(s.stock.banh+s.stock.special)return world('sale','Lấy bánh ở quầy xanh');if(b.raw||s.kitchen.output.length||s.kitchen.job||s.kitchen.input)return world('kitchen','Chế biến và lấy bánh nóng');return world('supply','Lấy nguyên liệu làm bánh');}
 if(kind==='tea')return world('tea','Lấy hoặc pha trà tắc');
 if(s.stock.pho)return world('phoSale','Lấy phở ở quầy nâu');if(b.rawPho||s.phoKitchen.output.length||s.phoKitchen.job||s.phoKitchen.input)return world('phoKitchen','Chế biến và lấy phở nóng');return world('phoSupply','Lấy thịt và bánh phở');
}
function streetNextAction(s){const b=s.player.bag,cap=carryCapacity(s),full=Object.values(b).reduce((n,v)=>n+v,0)>=cap,o=s.career.office,w=s.career.welcome,q=s.owner.takeaway,ice=s.owner.ice;
 if(b.ice)return world('tea','Mang thùng đá đến quầy trà');
 if(b.raw)return world('kitchen','Giao nguyên liệu cho bếp bánh');if(b.rawPho)return world('phoKitchen','Giao nguyên liệu cho nồi phở');
 if(full&&(o.active||q.active)){const r=o.active?officeRemaining(s):q.recipe;if(b.banh+b.special>r.bread)return world('sale','Bày bánh dư để có chỗ nhận món');if(b.tea>r.tea)return world('tea','Trả ly dư để có chỗ nhận món');if(b.pho>r.pho)return world('phoSale','Bày phở dư để có chỗ nhận món');}
 if(o.active){const r=officeRecipe(s),n={bread:Math.max(0,r.bread-o.delivered.banh-o.delivered.special),tea:Math.max(0,r.tea-o.delivered.tea),pho:Math.max(0,r.pho-o.delivered.pho)},have={bread:b.banh+b.special,tea:b.tea,pho:b.pho},delivery=officeStation(s);
  if((have.bread>=n.bread&&have.tea>=n.tea&&have.pho>=n.pho)||full&&Object.keys(n).some(k=>n[k]&&have[k]))return world(delivery,o.stage===0?'Giao phần ăn tại văn phòng':'Giao phần ăn tại đầu hẻm');
  const missing=Object.keys(n).filter(k=>have[k]<n[k]);if(missing.length)return supplyFood(s,missing[0]);
 }
 if(w.active&&w.stage<2)return world(welcomeStation(s),w.stage===0?'Dừng chào khách ở đầu hẻm':'Dừng chào khách ở văn phòng');
 if(q.active){const r=q.recipe;if(b.banh+b.special<r.bread)return supplyFood(s,'bread');if(b.tea<r.tea)return supplyFood(s,'tea');if(b.pho<r.pho)return supplyFood(s,'pho');return world(q.venue==='pho'?'office':'pickup',q.venue==='pho'?'Giao đơn phở tại cửa quán':'Giao đơn tại điểm túi giấy');}
 if(ice.active)return world('supply','Nhận thùng đá tại kho rau');
 if(s.upgrades.dining){const tables=activeTables(s),waiting=tables.filter(t=>t.state==='waiting'&&(!s.dining.waiter||!s.dining.assignment.includes(t.id))).sort((a,b)=>a.waitLeft-b.waitLeft),target=waiting.find(t=>t.id===s.dining.focus)||waiting[0];
  if(target){const n=needs(target),have=Object.keys(n).some(k=>n[k]&&b[k]),more=Object.keys(n).some(k=>n[k]>b[k]&&(s.stock[k]+s.dining.buffer[k]>0));if(have&&!(nearby(s,'service')&&!full&&more))return world('table'+target.id,'Giao món cho bàn đang chờ');if(Object.keys(n).some(k=>n[k]&&s.stock[k]+s.dining.buffer[k]>0))return world('service','Gom món ở xe phục vụ');return supplyFood(s,n.pho?'pho':n.banh+n.special?'bread':'tea');}
  const dirty=tables.find(t=>t.state==='dirty'&&(!s.dining.waiter||!s.dining.assignment.includes(t.id)))||tables.find(t=>t.state==='dirty');if(dirty)return world('table'+dirty.id,'Thu tiền và lau bàn');
 }
 if(nearby(s,'kitchen')&&!full&&(s.kitchen.job||s.kitchen.input)&&b.banh+b.special)return world('kitchen','Chờ bánh chín và tự nhận món');
 if(nearby(s,'phoKitchen')&&!full&&(s.phoKitchen.job||s.phoKitchen.input)&&b.pho)return world('phoKitchen','Chờ phở chín và tự nhận món');
 if(b.banh+b.special)return world('sale','Bày bánh lên quầy xanh');if(b.pho)return world('phoSale','Bày phở lên quầy nâu');if(b.tea)return world('tea','Trả ly dư về quầy trà');
 const ready=careerGoals(s).find(g=>!s.career.claimed.includes(g.id)&&g.value()>=g.max);if(s.day>=3&&ready)return panel('Nhận thưởng thành tựu của bạn','missions-panel','goals');
 if(s.day>=3&&!s.upgrades.dining&&s.money>=760000)return panel('Mở sân ăn tại chỗ','shop-panel','dining');
 if(s.day>=2&&!s.upgrades.pho&&s.money>=600000)return panel('Mở sân phở mới','shop-panel','growth');
 for(const[id,cost]of[['oven',120000],['tea',200000],['worker',280000]])if(!s.upgrades[id]&&s.money>=cost)return panel('Đủ tiền · Mở nâng cấp tiếp theo','shop-panel','home');
 if(s.phoTill&&!s.worker2)return world('phoSale','Thu tiền tại quầy phở');if(s.till&&!s.worker)return world('sale','Thu tiền tại quầy bánh');
 if(s.upgrades.worker){
  if(s.upgrades.tea&&!s.upgrades.teaAuto&&s.stock.tea<8)return world('tea','Pha thêm trà cho khách');
  if(w.active&&w.stage===2){const kind=w.kind==='office'?'pho':'bread';return supplyFood(s,kind);}
  const g=careerGoal(s);if(g&&['c-owner','c-team','c-master','c-specialists'].includes(g.quest))return panel('Rèn kỹ năng cho đội ngũ','shop-panel','team');
  if(s.day>=2&&s.upgrades.pho&&!o.cooldown)return panel('Nhận đơn văn phòng hai điểm','missions-panel','jobs');
  return panel('Mở nhiệm vụ để nhận việc chủ quán','missions-panel','jobs');
 }
 if(s.kitchen.output.length||s.kitchen.job||s.kitchen.input)return world('kitchen','Chế biến và lấy bánh nóng');return world('supply','Lấy nguyên liệu làm bánh');
}
export function nextAction(s){
 if(!s.local||legacyTrip(s))return streetNextAction(s);
 const here=restaurantId(s),b=s.player.bag,q=s.owner.takeaway,o=s.career.office,w=s.career.welcome,worldJob=jobHere(s,o),parcel=jobHere(s,q),full=Object.values(b).reduce((n,v)=>n+v,0)>=carryCapacity(s);
 if(jobHere(s,w)&&w.stage<2)return world(welcomeStation(s),'Chào khách ngay tại quán');
 if(here==='dining'){
  const p=s.local.pantry,tables=activeTables(s),waiting=tables.filter(t=>t.state==='waiting'&&(!s.dining.waiter||!s.dining.assignment.includes(t.id))).sort((a,b)=>a.waitLeft-b.waitLeft),target=waiting.find(t=>t.id===s.dining.focus)||waiting[0];
  if(b.raw||b.rawPho)return world('diningKitchen','Giao giỏ thực phẩm cho bếp tại sân');
  if(worldJob){const r=officeRecipe(s),done=o.delivered,matching=(b.banh+b.special>0&&done.banh+done.special<r.bread)||(b.tea>0&&done.tea<r.tea)||(b.pho>0&&done.pho<r.pho);if(matching)return world(officeStation(s),'Giao đơn ngay tại sân ăn');if(Object.values(b).some(n=>n)||s.dining.buffer.banh+s.dining.buffer.special+s.dining.buffer.tea+s.dining.buffer.pho>0)return world('service','Gom món cho đơn tại sân');}
  if(Math.hypot(s.player.x-260,s.player.y-1700)<43&&!full&&(p.input||p.job||p.output.length))return world('diningKitchen','Nhận món từ bếp riêng tại sân');
  if(target&&Object.keys(needs(target)).some(k=>b[k]&&needs(target)[k]))return world('table'+target.id,'Giao món cho bàn đang chờ');
  const dirty=tables.find(t=>(t.state==='dirty'||t.coins>0)&&(!s.dining.waiter||!s.dining.assignment.includes(t.id)));if(dirty)return world('table'+dirty.id,'Thu tiền và lau bàn');
  if(Object.values(b).some(n=>n)&&!worldJob)return world('service','Bày món lên xe của sân ăn');
  if(target&&Object.keys(needs(target)).some(k=>needs(target)[k]&&s.dining.buffer[k]>0))return world('service','Gom món ở xe phục vụ');
  if(p.output.length||p.input||p.job)return world('diningKitchen','Nhận món từ bếp riêng tại sân');
  if(Object.values(pantryDemand(s)).some(n=>n>0)&&!s.upgrades.diningPrep)return world('diningSupply','Lấy giỏ thực phẩm tại kho của sân');
  return panel('Chăm bàn và nhận việc tại sân ăn','missions-panel','tables');
 }
 if(worldJob||parcel||b.raw||b.rawPho||b.banh||b.special||b.pho||b.ice)return streetNextAction({...s,owner:{...s.owner,takeaway:{...q,active:parcel}},career:{...s.career,office:{...o,active:worldJob},welcome:{...w,active:jobHere(s,w)}},upgrades:{...s.upgrades,dining:false}});
 if(here==='pho'){if(s.phoTill&&!s.worker2)return world('phoSale','Thu tiền tại quầy phở');if(!s.worker2)return world(s.phoKitchen.output.length||s.phoKitchen.job||s.phoKitchen.input?'phoKitchen':'phoSupply','Chuẩn bị phở ngay tại quán');return panel('Nhận đơn phở và chăm quán hiện tại','journal-panel');}
 if(s.till&&!s.worker)return world('sale','Thu tiền tại quầy bánh');if(s.upgrades.tea&&!s.upgrades.teaAuto&&s.stock.tea<8)return world('tea','Pha thêm trà cho khách');if(!s.worker)return streetNextAction({...s,upgrades:{...s.upgrades,dining:false}});return panel('Nhận việc cho quán bánh mì hiện tại','missions-panel','jobs');
}
// A route is presentation state. It never moves an actor, spends currency or edits a save.
export class Navigator{
 constructor(findPath){this.findPath=findPath;this.enabled=true;this.manual=null;this.key='';this.path=[];}
 choose(s,id){if(!stationUnlocked(s,id)||!legacyTrip(s)&&stationZone(id)!==restaurantId(s))return false;this.manual=id;this.key='';return true;}
 update(s){let task=this.manual?world(this.manual,'Đi tới '+stationCaption(s,this.manual)):nextAction(s);
  if(task.kind==='world'&&!stationUnlocked(s,task.id))task=panel('Mở khu vực trong Phát triển','shop-panel',stationZone(task.id)==='dining'?'dining':'growth');
  if(task.kind!=='world'){this.key='';this.path=[];return{...task,enabled:this.enabled,path:[]};}
  const target={...STATIONS[task.id],label:stationCaption(s,task.id)},path=[],length=0,reached=Math.hypot(s.player.x-target.x,s.player.y-target.y)<43;
  const result={...task,target,enabled:this.enabled,path,steps:Math.ceil(length/32),reached};if(this.manual&&reached){this.manual=null;this.key='';}return result;
 }
}
