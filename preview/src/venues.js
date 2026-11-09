// Separate, compact addresses share the existing economy and physical station geometry.
export const VENUES=Object.freeze([
 {id:'home',name:'Bánh mì & trà',icon:'🥖',top:75,bottom:845,spawn:{x:300,y:430},min:175,max:830,description:'Linh cùng bạn giữ lò bánh, pha trà và đón khách đầu phố.'},
 {id:'pho',name:'Phở đầu hẻm',icon:'🍜',top:900,bottom:1630,spawn:{x:300,y:1160},min:1015,max:1615,description:'An giữ nồi nước dùng. Chuẩn bị đơn phở và chọn món gợi ý.'},
 {id:'dining',name:'Sân ăn nhà mình',icon:'🍽',top:1560,bottom:2395,spawn:{x:300,y:1810},min:1685,max:2375,description:'Cùng Mai đón từng nhóm khách, giao món và chăm bàn ăn.'}
]);
export const venueForY=y=>y<920?'home':y<1660?'pho':'dining';
export const currentVenue=s=>VENUES.find(v=>v.id===venueForY(s.player.y));
export const stationVenue=id=>id==='office'||id.startsWith('pho')?'pho':id==='service'||id.startsWith('table')?'dining':'home';
export const canVisit=(s,id)=>id==='home'||id==='pho'&&!!s.upgrades.pho||id==='dining'&&!!s.upgrades.dining;
export function visitVenue(s,id){const v=VENUES.find(v=>v.id===id);if(!v||!canVisit(s,id)||currentVenue(s).id===id&&s.player.y>=v.min&&s.player.y<=v.max)return false;Object.assign(s.player,v.spawn,{moving:false,path:[],action:0});return true;}
export function venueMove(s,a,dy){if(a!==s.player)return dy;const v=currentVenue(s);if(dy<0&&a.y<=v.min||dy>0&&a.y>=v.max)return 0;return dy<0?Math.max(dy,Math.min(0,v.min-a.y)):Math.min(dy,Math.max(0,v.max-a.y));}
export function placesState(s=null){return{claimed:{home:[],pho:[],dining:[]},stats:{breadStocked:0,phoStocked:0,localHome:s?.owner.takeaway.completed||0,localPho:0},focus:{home:'balanced',pho:'balanced'},focusUntil:{home:0,pho:0},outfit:'chef'};}
export const venueBonus=(s,id)=>Math.min(.12,(s.places?.claimed[id].length||0)*.02);
export function venueProjects(s,id){const p=s.places;const specs={home:[
 ['h-first','Mùi bánh buổi sớm','Bán 15 ổ bánh thật cho khách.',15,60000,()=>s.stats.soldBanh],
 ['h-hands','Tự tay bày quầy','Chủ quán tự bày thêm 12 ổ bánh.',12,120000,()=>p.stats.breadStocked],
 ['h-ice','Trà mát ngày nắng','Tự tiếp hai thùng đá cho quầy trà.',2,100000,()=>s.owner.ice.used],
 ['h-local','Hàng xóm ghé mua','Hoàn tất hai đơn riêng của quầy bánh.',2,160000,()=>p.stats.localHome],
 ['h-team','Linh vững tay nghề','Mở bếp đôi và luyện sức bê cho Linh.',1,140000,()=>+(s.upgrades.oven&&s.career.roles.linh.levels.carry>=1)],
 ['h-busy','Một góc phố thân quen','Bán 120 ổ bánh, giữ khách quay lại.',120,200000,()=>s.stats.soldBanh]],pho:[
 ['p-open','Nồi phở đầu tiên','Mở địa chỉ phở và bán 12 tô.',12,160000,()=>s.stats.soldPho],
 ['p-hands','Bày tô phở nóng','Chủ quán tự bày thêm 8 tô phở.',8,140000,()=>p.stats.phoStocked],
 ['p-local','Bữa sáng mang về','Hoàn tất hai đơn phở riêng tại quán.',2,180000,()=>p.stats.localPho],
 ['p-lunch','Đón khách giờ trưa','Bán đủ 14 món trong ca bữa trưa.',14,180000,()=>s.day2.event.best],
 ['p-team','An giữ nhịp nồi','Mua ba bậc kỹ năng cho An.',3,200000,()=>Object.values(s.career.roles.an.levels).reduce((a,b)=>a+b,0)],
 ['p-busy','Quán phở có tiếng','Phục vụ 80 tô phở nóng.',80,240000,()=>s.stats.soldPho]],dining:[
 ['s-first','Mời ngồi dùng bữa','Phục vụ trọn vẹn hai bàn.',2,120000,()=>s.dining.stats.parties],
 ['s-hands','Chủ quán hiếu khách','Tự giao 20 món cho khách và đơn hàng.',20,140000,()=>s.career.stats.ownerDishes],
 ['s-clean','Bàn sạch, khách vui','Chủ quán tự dọn sáu bàn.',6,160000,()=>s.career.stats.ownerCleaned],
 ['s-team','Mai có đồng đội','Thuê Mai và mở xe phục vụ nhanh.',1,180000,()=>+(s.upgrades.waiter&&s.upgrades.serviceCart)],
 ['s-welcome','Lời mời đầu phố','Đón thành công hai đoàn khách được mời.',2,180000,()=>s.career.welcome.completed],
 ['s-repute','Tiếng thơm của phố','Đạt 60 uy tín ở sân ăn.',60,240000,()=>s.dining.reputation]]};
 return(specs[id]||[]).map(([key,title,description,max,reward,value])=>({id:key,title,description,max,reward,prize:PRIZES[key],value:value(),claimed:p.claimed[id].includes(key)}));}
export function claimVenue(s,id,key,emit=()=>{}){const q=venueProjects(s,id).find(q=>q.id===key);if(!canVisit(s,id)||!q||q.claimed||q.value<q.max)return false;s.places.claimed[id].push(key);s.money+=q.reward;s.stats.rewards+=q.reward;emit('reward',{text:'Thêm một dấu sao cho địa chỉ · Quán làm việc hiệu quả hơn.',amount:q.reward});return true;}
export function setVenueFocus(s,id,focus){const allowed=id==='home'?['balanced','bread','tea']:id==='pho'?['balanced','pho','tea']:[];if(!canVisit(s,id)||!hasPrize(s,id,id==='home'?'h-first':'p-open')||!allowed.includes(focus)||s.places.focusUntil[id]>s.elapsed||s.places.focus[id]===focus)return false;s.places.focus[id]=focus;s.places.focusUntil[id]=s.elapsed+60;return true;}
export function validPlaces(p,s){const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;if(!p||!['chef','baba','festival'].includes(p.outfit)||!canEquip(s,p.outfit)||!p.stats||!Object.keys(placesState().stats).every(k=>int(p.stats[k]))||!p.claimed||!p.focus||!p.focusUntil)return false;for(const id of ['home','pho','dining']){const a=p.claimed[id];if(!Array.isArray(a)||new Set(a).size!==a.length||a.some(key=>!venueProjects({...s,places:p},id).some(q=>q.id===key)))return false;}return ['home','pho'].every(id=>['balanced','tea',id==='home'?'bread':'pho'].includes(p.focus[id])&&Number.isFinite(p.focusUntil[id])&&p.focusUntil[id]>=0);}

export const PRIZES={
'h-first':'Biển quán viết tay & món gợi ý','h-hands':'Mở đơn hàng xóm tại quầy bánh','h-ice':'Thùng đá giữ lạnh 70 giây','h-local':'Mở set bữa sáng 6 món','h-team':'Tủ kính bánh mì · Phục vụ nhanh hơn','h-busy':'Mái bạt chợ phố & cờ tiệm',
'p-open':'Biển phở phố cổ & món gợi ý','p-hands':'Mở đơn phở mang về tại quán','p-local':'Kệ bày gia vị · Phục vụ nhanh hơn','p-lunch':'Giỏ rau thơm · Khách chờ thêm 6 giây','p-team':'Tạp dề mới cho An','p-busy':'Tô gốm Bát Tràng',
's-first':'Dây đèn lồng Hội An','s-hands':'Khay sơn mài · Mang thêm 1 món','s-clean':'Khăn rằn · Lau bàn nhanh hơn','s-team':'Mở chuyện nhỏ của khách quen','s-welcome':'Mở Ngày hội phố khi đạt 400 XP','s-repute':'Cổng phố hiếu khách'};
export const hasPrize=(s,id,key)=>!!s.places?.claimed[id]?.includes(key);
export const festivalUnlocked=s=>s.career.roles.owner.xp>=400&&hasPrize(s,'dining','s-welcome');
export const canEquip=(s,id)=>id==='chef'||id==='baba'&&s.career.roles.owner.xp>=180||id==='festival'&&festivalUnlocked(s);
export function equipOutfit(s,id){if(!canEquip(s,id)||!s.places)return false;s.places.outfit=id;return true;}

export function normalizeVenuePosition(s){const v=currentVenue(s);if(s.player.y<v.min||s.player.y>v.max){Object.assign(s.player,v.spawn,{moving:false,path:[]});return true;}return false;}
