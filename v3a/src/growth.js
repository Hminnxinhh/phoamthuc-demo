// Day 2 content and economy. Pure data/functions, reusable by UI and simulation.
export const NEW_UPGRADES = [
  {id:'pho',cost:300,icon:'🍜',name:'Mở sân phở bò',description:'Nối rộng sân quán · Kho, nồi nấu và quầy phở mới.',day:2},
  {id:'phoBoiler',cost:180,icon:'♨',name:'Nồi đôi nước trong',description:'Nấu phở nhanh hơn 38% · Kệ bày 12 tô.',requires:'pho'},
  {id:'worker2',cost:240,icon:'👨🏻‍🍳',name:'Mời An phụ quầy phở',description:'An tự lấy thịt/bánh phở, nấu, bày bán và thu tiền.',requires:'pho'},
  {id:'teaAuto',cost:140,icon:'⚙',name:'Máy pha trà tắc',description:'Tự bày 1 ly mỗi 3 giây · Rảnh tay lo quầy mới.',day:2,requires:'tea'},
];
export const QUESTS = [
  {id:'phoLovers',icon:'🍜',title:'Hương phở đầu phố',description:'Phục vụ 12 tô phở bò nóng.',reward:90,max:12,value:s=>s.stats.soldPho},
  {id:'teamwork',icon:'⚙',title:'Quán chạy nhịp nhàng',description:'Đầu tư 2 cải tiến: nồi đôi, An hoặc máy pha trà.',reward:90,max:2,value:s=>['phoBoiler','worker2','teaAuto'].filter(k=>s.upgrades[k]).length},
  {id:'lunch',icon:'☀',title:'Bữa trưa đắt khách',description:'Phục vụ 14 món trong một đợt bữa trưa 60 giây.',reward:120,max:14,value:s=>Math.min(14,Math.max(s.day2.event.best,s.day2.event.active?s.sold-s.day2.event.startSold:0))},
];
export function dayTwo(elapsed=0,revenue=0){return {startedAt:elapsed,revenueStart:revenue,claimed:[],completed:false,summarySeen:false,event:{active:false,left:0,cooldown:0,startSold:0,best:0,attempts:0,lastServed:0}};}
export function startLunch(s,emit=()=>{}){
  const e=s.day2.event;
  if(s.day<2||!s.upgrades.pho||e.active||e.cooldown>0)return false;
  e.active=true;e.left=60;e.startSold=s.sold;e.attempts++;s.spawnTimer=Math.min(s.spawnTimer,.2);
  emit('rush',{text:'Bữa trưa bắt đầu! Khách gọi phở nhiều hơn.'});return true;
}
export function updateDayTwo(s,dt,emit){
  if(s.day<2)return;
  const e=s.day2.event;e.cooldown=Math.max(0,e.cooldown-dt);
  if(e.active){e.left=Math.max(0,e.left-dt);if(e.left===0){e.active=false;e.lastServed=s.sold-e.startSold;e.best=Math.max(e.best,e.lastServed);e.cooldown=35;emit('lunchEnd',{success:e.lastServed>=14,text:e.lastServed>=14?`Đón khách thành công! ${e.lastServed} món trong một phút.`:`Đã phục vụ ${e.lastServed}/14 món. Chuẩn bị rồi thử lại nhé!`});}}
}
export function claimQuest(s,id,emit=()=>{}){
  const q=QUESTS.find(q=>q.id===id);
  if(s.day<2||!q||s.day2.claimed.includes(id)||q.value(s)<q.max||(id==='lunch'&&s.day2.event.best<14))return false;
  s.day2.claimed.push(id);s.money+=q.reward;s.stats.rewards+=q.reward;emit('reward',{text:`${q.title} · +${q.reward} xu`,amount:q.reward});
  if(s.day2.claimed.length===QUESTS.length&&!s.day2.completed){s.day2.completed=true;emit('day2Complete',{});}return true;
}
export function available(s,u){return !s.upgrades[u.id]&&s.money>=u.cost&&(!u.requires||s.upgrades[u.requires])&&(!u.day||s.day>=u.day);}
export function lockReason(s,u){if(u.day&&s.day<u.day)return 'Ngày 02';if(u.requires&&!s.upgrades[u.requires])return u.requires==='pho'?'Cần sân phở':u.requires==='tea'?'Cần trà tắc':'Cần Linh';return null;}
