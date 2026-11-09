import{restaurantState,restaurantId,legacyOperations,jobHere,oldActivities,prepareRestaurant,updatePantry,interactPantry,validRestaurants,recordSale}from'./restaurants.js';
import {placesState,validPlaces,venueBonus,venueMove,hasPrize,normalizeVenuePosition} from './venues.js';
import {PRICE,priceFor,isMoney,convertLegacyMoney,validBasis} from './currency.js';
export {PRICE} from './currency.js';
import {careerState,validCareer,carryCapacity,speedFactor,serviceFactor,gainXP,officeRemaining,updateCareer} from './career.js';
import {demand,readyFood} from './demand.js';
import {diningState,DINING_UPGRADES,diningUpgrade,diningGoal,interactDining,updateDining,validDining} from './dining.js';
import {ownerState,updateOwner,reservedBread,deliverTakeaway,parcelStation,PICKUP,validOwner} from './owner.js';
import {recordMotion,travelDelta} from './motion.js';
import { NEW_UPGRADES, QUESTS, dayTwo, updateDayTwo, available } from './growth.js';
// Deterministic simulation. No DOM, rendering, wall-clock time or third-party SDKs.
import {WORLD,STATIONS,SOLIDS,activeSolids,worldHeight,DINING_TABLES} from './world-layout.js';
export {WORLD,STATIONS,SOLIDS} from './world-layout.js';
export const UPGRADES = [
  { id: 'oven', cost:120000, icon: '♨', name: 'Bếp đôi rực lửa', description: 'Nấu nhanh hơn 40% · Thêm bánh mì đặc biệt 30.000đ.' },
  { id: 'tea', cost:200000, icon: '🍹', name: 'Quầy trà tắc', description: 'Mở món thứ ba · Tự pha và bày trà khi đứng cạnh.' },
  { id: 'worker', cost:280000, icon: '👩🏻‍🍳', name: 'Mời Linh về quán', description: 'Linh tự lấy hàng, làm bánh, bày bán và thu tiền.' },
  { id: 'capacity', cost:150000, icon: '▣', name: 'Xe đẩy & kệ rộng', description: 'Mang 7 món · Quầy chứa 18 món · Có xe đẩy thật.' },
  { id: 'efficiency', cost:200000, icon: '⚡', name: 'Đôi giày nhanh nhẹn', description: 'Linh đi nhanh hơn 45%, mang 5 món thay vì 3.', requires: 'worker' },
];
UPGRADES.push(...NEW_UPGRADES,...DINING_UPGRADES);
export const emptyBag = () => ({ raw: 0, banh: 0, special: 0, tea: 0, rawPho: 0, pho: 0, ice: 0 });
export const count = bag => Object.values(bag).reduce((a, b) => a + b, 0);
export function freshState() {
  return {
    version:7,local:restaurantState(),places:placesState(),currency:'VND',career: careerState(), dining: diningState(), owner: ownerState(), day: 1, day2: dayTwo(), rng: 20261107, started: false, elapsed: 0, money: 0, revenue: 0, sold: 0,
    upgrades: {}, player: { x: 255, y: 430, face: 1, step: 0, moving: false, bag: emptyBag(), action: 0 },
    worker: null, worker2: null, phoSupply: 16, phoSupplyTimer: 0, phoKitchen: { input: 0, output: [], job: null, serial: 0 }, phoTill: 0, teaAutoTimer: 0, supply: 20, supplyTimer: 0,
    kitchen: { input: 0, output: [], job: null, serial: 0 }, stock: { banh: 0, special: 0, tea: 0, pho: 0 },
    till: 0, customers: [], spawnTimer: 2, nextCustomer: 1, served: 0, lost: 0,
    teaTimer: 0, rushStarted: false, rushLeft: 60, finished: false, finishSeen: false,
    stats: { rawTaken: 0, cooked: 0, stocked: 0, workerStocked: 0, collected: 0, brewed: 0, soldBanh: 0, soldTea: 0, rawPhoTaken: 0, cookedPho: 0, soldPho: 0, workerPhoStocked: 0, rewards: 0 },
  };
}
export function random(s) { s.rng = (s.rng * 1664525 + 1013904223) >>> 0; return s.rng / 4294967296; }
export function blocked(x, y, radius = 13, state = null) {
  if (x < 23 || x > 577 || y < 175 || y > (state ? worldHeight(state)-82 : WORLD.h-82)) return true;
  return activeSolids(state).some(r => {
    // The courtyard's non-walkable header overlaps the old phở coordinates.
    // Its furniture belongs only to that address, not to the phở floor below 1660.
    if(r.area==='dining'&&y<1660)return false;
    const dx = x - Math.max(r.x, Math.min(x, r.x + r.w));
    const dy = y - Math.max(r.y, Math.min(y, r.y + r.h));
    return dx * dx + dy * dy < radius * radius;
  });
}
export function move(actor, dx, dy, state = null, dt = 1/60) {
  dy=state?venueMove(state,actor,dy):dy;
  const parts = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  const ox = actor.x, oy = actor.y;
  for (let i = 0; i < parts; i++) {
    if (!blocked(actor.x + dx / parts, actor.y, 13, state)) actor.x += dx / parts;
    if (!blocked(actor.x, actor.y + dy / parts, 13, state)) actor.y += dy / parts;
  }
  recordMotion(actor,actor.x-ox,actor.y-oy,dt);
}
// Small grid A* with obstacle inflation; worker and keyboard tests share physical movement.
export function findPath(from, to, state = null) {
  const cell = 20, cols = 30, rows = Math.ceil(WORLD.h/20);
  const start = [Math.floor(from.x / cell), Math.floor(from.y / cell)];
  const end = [Math.floor(to.x / cell), Math.floor(to.y / cell)];
  const key = (x, y) => y * cols + x;
  const open = [{ x: start[0], y: start[1], g: 0, f: 0 }], seen = new Map(), prev = new Map();
  seen.set(key(...start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const n = open.shift(), nk = key(n.x, n.y);
    if (n.x === end[0] && n.y === end[1]) {
      const path = [{ x: to.x, y: to.y }]; let k = nk;
      while (prev.has(k)) { path.unshift({ x: (k % cols) * cell + 10, y: Math.floor(k / cols) * cell + 10 }); k = prev.get(k); }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = n.x + dx, y = n.y + dy, k = key(x, y), g = n.g + 1;
      if (x < 0 || x >= cols || y < 0 || y >= rows || blocked(x * cell + 10, y * cell + 10, 16, state)) continue;
      if (seen.has(k) && seen.get(k) <= g) continue;
      seen.set(k, g); prev.set(k, nk);
      open.push({ x, y, g, f: g + Math.abs(x - end[0]) + Math.abs(y - end[1]) });
    }
  }
  return [];
}
export function walkTo(s,actor,dest,speed,dt){
  const key=`${dest.x},${dest.y},${s.dining.navVersion}`;
  if(actor.navKey!==key){actor.path=[];actor.navKey=key;}
  if(Math.hypot(actor.x-dest.x,actor.y-dest.y)<4){actor.moving=false;return true;}
  if(!actor.path?.length)actor.path=findPath(actor,dest,s);
  while(actor.path.length&&Math.hypot(actor.x-actor.path[0].x,actor.y-actor.path[0].y)<3)actor.path.shift();
  if(actor.path.length){const p=actor.path[0],d=travelDelta(p.x-actor.x,p.y-actor.y,speed*dt,true);move(actor,d.x,d.y,s,dt);}
  return Math.hypot(actor.x-dest.x,actor.y-dest.y)<4;
}
export function buy(s, id, emit = () => {}) {
  const u = UPGRADES.find(v => v.id === id);
  if (!u || !available(s,u)) return false;
  const candidate={...s,upgrades:{...s.upgrades,[id]:true}},actors=[s.player,s.worker,s.worker2,s.dining.waiter,...s.dining.guests].filter(Boolean);
  if(actors.some(a=>!blocked(a.x,a.y,13,s)&&blocked(a.x,a.y,13,candidate))){emit('dining',{text:'Chỗ đặt bàn đang có người · Bước ra lối trống rồi mở lại nhé.'});return false;}
  s.money -= u.cost; s.upgrades[id] = true;
  if (id === 'worker') s.worker = { x: 300, y: 760, face: 1, step: 0, bag: emptyBag(), action: 0, target: 'supply', path: [] };
  if (id === 'worker2') s.worker2 = { x: 320, y: 1470, face: 1, step: 0, bag: emptyBag(), action: 0, target: 'phoSupply', path: [], name: 'AN' };
  diningUpgrade(s,id,emptyBag);
  emit('upgrade', { id, text: u.name }); return true;
}
export function goal(s) {
  if(s.day>=3)return diningGoal(s);
  if(s.day>=2){
    if(s.day2.completed)return {text:'Phố đang lớn · Giữ quán đông vui!',value:s.revenue,max:Math.max(6000000,Math.ceil((s.revenue+1)/2000000)*2000000),money:true,chapter:'TỰ DO PHÁT TRIỂN'};
    if(!s.upgrades.pho)return {text:'Mở sân phở bò · 600.000đ',value:s.money,max:600000,money:true,station:'shop'};
    const q=QUESTS.find(q=>!s.day2.claimed.includes(q.id));
    return {text:q.title,value:q.value(s),max:q.max,quest:q.id};
  }
  if (s.sold < 5) return { text: 'Bán 5 ổ bánh đầu tiên', value: s.sold, max: 5, station: count(s.player.bag) ? (s.player.bag.raw ? 'kitchen' : 'sale') : 'supply' };
  if (!s.upgrades.oven) return { text: 'Nâng bếp · mở bánh đặc biệt', value:s.money,max:120000,money:true,station: 'shop' };
  if (!s.upgrades.tea) return { text: 'Mở quầy trà tắc', value:s.money,max:200000,money:true,station: 'shop' };
  if (!s.upgrades.worker) return { text: 'Mời Linh về phụ quán', value:s.money,max:280000,money:true,station: 'shop' };
  if (s.revenue < 1800000) return { text: 'Doanh thu khai trương: 1.800.000đ', value:s.revenue,max:1800000,money:true };
  if (!s.finished) return { text: s.rushStarted ? 'Giữ quán nhộn nhịp hết giờ cao điểm' : 'Chuẩn bị cho giờ cao điểm', value: s.rushStarted ? 60 - s.rushLeft : s.elapsed, max: s.rushStarted ? 60 : 300 };
  return { text: 'Ngày khai trương thành công!', value: 1, max: 1 };
}
export function interact(s, actor, dt, emit, worker = false) {
  actor.action = Math.max(0, actor.action - dt);
  if (actor.action > 0) return;
  const at = name => Math.hypot(actor.x - STATIONS[name].x, actor.y - STATIONS[name].y) < 43;
  const role=worker==='pho'?'an':worker?'linh':'owner',cap=carryCapacity(s,role),bag=actor.bag,office=!worker&&jobHere(s,s.career.office)?officeRemaining(s):null;
  const parcel=!worker&&jobHere(s,s.owner.takeaway);
  const foodCount = bag.banh + bag.special + bag.tea + bag.pho;
  const iceJob=!worker&&s.owner.ice.active&&restaurantId(s)==='home';
  if(iceJob&&at('supply')&&!bag.ice&&s.owner.ice.stock>0&&count(bag)<cap){bag.ice++;s.owner.ice.stock--;s.owner.ice.taken++;actor.action=.3;emit('pickup',{x:actor.x,y:actor.y,kind:'ice'});return;}
  if(parcel&&at(parcelStation(s)))deliverTakeaway(s,emit);
  if (!iceJob && at('supply') && count(bag) < cap && (!foodCount||office&&office.bread>bag.banh+bag.special+bag.raw) && !bag.rawPho && s.supply > 0) {
    bag.raw++; s.supply--; s.stats.rawTaken++; actor.action = .25; emit('pickup', { x: actor.x, y: actor.y, kind: 'raw' });
  }
  if (at('kitchen')) {
    if (bag.raw > 0) { bag.raw--; s.kitchen.input++; actor.action = .22; emit('drop', { x: 365, y: 295 }); }
    else if (s.kitchen.output.length && count(bag) < cap) { const kind = s.kitchen.output.shift(); bag[kind]++; actor.action = .24; emit('pickup', { x: actor.x, y: actor.y, kind }); }
  }
  if (at('sale')) {
    if (s.till > 0) { const amount = s.till; s.money += amount; s.stats.collected += amount; s.till = 0; emit('money', { x: 180, y: 623, amount }); }
    const reserve=office?{banh:Math.min(office.bread,bag.banh),special:Math.min(Math.max(0,office.bread-bag.banh),bag.special)}:!worker?reservedBread(s,actor):{banh:0,special:0};
    const kind=bag.special>reserve.special?'special':bag.banh>reserve.banh?'banh':null;
    if (kind && s.stock.banh + s.stock.special < (s.upgrades.capacity ? 18 : 10)) {
      bag[kind]--; s.stock[kind]++; s.stats.stocked++; if (worker){s.stats.workerStocked++;gainXP(s,'linh',1);}else{gainXP(s,'owner',1);s.places.stats.breadStocked++;}
      actor.action = .22; emit('drop', { x: 180, y: 585 });
    }
    else if(!worker&&(office||parcel)&&bag.banh+bag.special<(office?office.bread:s.owner.takeaway.recipe.bread)&&count(bag)<cap){const take=s.stock.banh?'banh':s.stock.special?'special':null;if(take){s.stock[take]--;bag[take]++;actor.action=.25;emit('pickup',{x:actor.x,y:actor.y,kind:take});}}
  }
  if (!worker && at('tea') && s.upgrades.tea) {
    if(bag.ice){bag.ice--;s.owner.ice.used++;s.owner.ice.active=false;s.owner.ice.freshLeft=hasPrize(s,'home','h-ice')?70:50;s.owner.ice.cooldown=60;actor.action=.25;emit('owner',{text:`Đã tiếp đá · Trà bán 18.000đ thay vì 15.000đ trong ${s.owner.ice.freshLeft} giây!`});return;}
    if((office||parcel)&&bag.tea<(office?office.tea:s.owner.takeaway.recipe.tea)&&s.stock.tea>0&&count(bag)<cap){s.stock.tea--;bag.tea++;actor.action=.25;emit('pickup',{x:actor.x,y:actor.y,kind:'tea'});return;}
    if(bag.tea>(office?office.tea:parcel?s.owner.takeaway.recipe.tea:0)&&s.stock.tea<(s.upgrades.capacity?18:10)){bag.tea--;s.stock.tea++;actor.action=.25;return;}
    if (s.till > 0) { const amount = s.till; s.money += amount; s.stats.collected += amount; s.till = 0; emit('money', { x: 451, y: 620, amount }); }
    s.teaTimer += dt;
    if (s.teaTimer >= .9 && s.stock.tea < (s.upgrades.capacity ? 18 : 10)) {
      s.teaTimer = 0; s.stock.tea++; s.stats.brewed++; s.stats.stocked++; emit('tea', { x: 450, y: 580 });
    }
  }
  if(s.upgrades.pho){
    if(at('phoSupply')&&count(bag)<cap&&(!foodCount||office&&office.pho>bag.pho+bag.rawPho)&&!bag.raw&&s.phoSupply>0){bag.rawPho++;s.phoSupply--;s.stats.rawPhoTaken++;actor.action=.3;emit('pickup',{x:actor.x,y:actor.y,kind:'rawPho'});}
    if(at('phoKitchen')){
      if(bag.rawPho>0){bag.rawPho--;s.phoKitchen.input++;actor.action=.25;emit('drop',{x:365,y:1020});}
      else if(s.phoKitchen.output.length&&count(bag)<cap){s.phoKitchen.output.shift();bag.pho++;actor.action=.28;emit('pickup',{x:actor.x,y:actor.y,kind:'pho'});}
    }
    if(at('phoSale')){
      if(s.phoTill>0){const amount=s.phoTill;s.money+=amount;s.stats.collected+=amount;s.phoTill=0;emit('money',{x:180,y:1340,amount});}
      if(bag.pho>(office?office.pho:!worker&&parcel?s.owner.takeaway.recipe.pho:0)&&s.stock.pho<(s.upgrades.phoBoiler?12:6)){bag.pho--;s.stock.pho++;s.stats.stocked++;if(worker){s.stats.workerPhoStocked++;gainXP(s,'an',1);}else{gainXP(s,'owner',1);s.places.stats.phoStocked++;}actor.action=.25;emit('drop',{x:180,y:1310});}
      else if(!worker&&(office||parcel)&&bag.pho<(office?office.pho:s.owner.takeaway.recipe.pho)&&s.stock.pho>0&&count(bag)<cap){s.stock.pho--;bag.pho++;actor.action=.25;emit('pickup',{x:actor.x,y:actor.y,kind:'pho'});}
    }
  }

}
function updateWorker(s, dt, emit, isPho = false) {
  const w = isPho ? s.worker2 : s.worker; if (!w) return;
  const role=isPho?'an':'linh',cap=carryCapacity(s,role);
  const names=isPho?['phoSupply','phoKitchen','phoSale']:['supply','kitchen','sale'];
  const raw=isPho?'rawPho':'raw',food=isPho?w.bag.pho:w.bag.banh+w.bag.special,k=isPho?s.phoKitchen:s.kitchen;
  let target=w.target;
  if(target===names[0]&&(count(w.bag)>=cap||(w.bag[raw]>0&&(isPho?s.phoSupply:s.supply)===0)))target=names[1];
  if(target===names[1]&&!w.bag[raw]&&(count(w.bag)>=cap||(food>0&&!k.input&&!k.job&&!k.output.length)))target=names[2];
  if(target===names[2]&&!count(w.bag))target=names[0];
  const plan=demand(s);if(s.day>=2&&!count(w.bag)){const shelf=isPho?s.stock.pho:s.stock.banh+s.stock.special,limit=isPho?plan.prepPho:plan.prepBread;target=shelf>=limit?names[2]:k.output.length||k.input||k.job?names[1]:names[0];}
  w.resting=target===names[2]&&!count(w.bag);
  if(target!==w.target){w.target=target;w.path=[];}
  const offset=isPho?730:0;
  const dest=w.target===names[2]?{x:212,y:673+offset}:w.target===names[1]?{x:395,y:369+offset}:{x:132,y:369+offset};
  if (Math.hypot(w.x - dest.x, w.y - dest.y) > 9) {
    if (!w.path?.length) w.path = findPath(w, dest, s);
    if (w.path.length) {
      const p = w.path[0], dx = p.x - w.x, dy = p.y - w.y, len = Math.hypot(dx, dy);
      const d=travelDelta(dx,dy,(isPho?115:s.upgrades.efficiency?155:107)*speedFactor(s,role)*(1+venueBonus(s,isPho?'pho':'home'))*dt,true);
      if (len > .1) move(w,d.x,d.y,s,dt);
      if (len < 5) w.path.shift();
    }
  } else w.moving = false;
  interact(s, w, dt, emit, isPho ? 'pho' : true);
}
export const MAX_CUSTOMERS = 18;
function customerGroup(c){return c.type==='pho'?'pho':c.type==='tea'?'tea':'bread';}
function updateCustomers(s,dt,emit){
  const here=legacyOperations(s)?'street':restaurantId(s);if(here==='dining')return;const spawning=here==='pho'?s.local.phoSpawn:s.spawnTimer;let timer=spawning-dt;
  const active=s.customers.filter(c=>c.phase!=='leave'),lunch=s.day2.event.active;
  const plan=demand(s),activeCap=plan.cap||(s.upgrades.pho?(lunch?10:9):7);
  if(timer<=0&&active.filter(c=>here==='street'||(c.type==='pho'?'pho':'home')===here).length<activeCap&&s.customers.length<MAX_CUSTOMERS){
    timer=plan.interval|| (lunch?2.5:s.rushStarted&&s.rushLeft>0?2.7:s.sold<5?7:s.upgrades.pho?3.8:4.7);
    const groups=here==='pho'?['pho']:['bread',...(s.upgrades.tea?['tea']:[]),...(here==='street'&&s.upgrades.pho?['pho']:[])];
    const r=random(s),weights=plan.weights;let group=s.upgrades.pho&&plan.interval?(r<weights[0]?'bread':r<weights[0]+weights[1]?'tea':'pho'):s.upgrades.pho&&r<(lunch?.55:.28)?'pho':s.upgrades.tea&&r<(s.upgrades.pho?(lunch?.75:.54):.34)?'tea':'bread';
    group=here==='pho'?'pho':here==='home'&&group==='pho'?'bread':group;
    if(active.filter(c=>customerGroup(c)===group).length>=4)group=groups.find(g=>active.filter(c=>customerGroup(c)===g).length<4);
    if(group){const offset=group==='pho'?730:0,type=group==='pho'?'pho':group==='tea'?'tea':s.upgrades.oven&&random(s)<.35?'special':'banh';
      const quantity=plan.bundles&&random(s)<plan.bundles?2:1;
      s.customers.push({priceBasis:'current',quantity,remaining:quantity,id:s.nextCustomer++,x:-35,y:440+offset,phase:'enter',type,patience:48+(type==='pho'&&hasPrize(s,'pho','p-lunch')?6:0),wait:0,service:0,look:Math.floor(random(s)*8),step:0,face:1});}
  }
  if(here==='pho')s.local.phoSpawn=timer;else s.spawnTimer=timer;
  for(const c of s.customers){
    if(here!=='street'&&(c.type==='pho'?'pho':'home')!==here)continue;
    const group=customerGroup(c),offset=group==='pho'?730:0;
    const queue=s.customers.filter(v=>v.phase!=='leave'&&customerGroup(v)===group),idx=queue.indexOf(c);
    let tx=(group==='tea'?449:179)+(idx%2?7:0),ty=522+offset-Math.max(0,idx)*42;
    if(c.phase==='leave'){tx=680;ty=(c.y-offset<460?440:490)+offset;}
    if(c.phase==='enter'&&c.x<tx-5)ty=430+offset-Math.max(0,idx)*8;
    const dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy),speed=c.phase==='leave'?96:72;
    c.moving=d>2;
    if(d>2){const delta=travelDelta(dx,dy,speed*dt,true);c.x+=delta.x;c.y+=delta.y;recordMotion(c,delta.x,delta.y,dt);}
    else if(c.phase!=='leave'){
      c.phase='wait';c.wait+=dt;c.patience-=dt;
      if(idx===0){let kind=c.type;
        if(kind==='special'&&!s.stock.special&&s.stock.banh)kind='banh';
        if(kind==='banh'&&!s.stock.banh&&s.stock.special)kind='special';
        if(s.stock[kind]>0){c.service+=dt;if(c.service>=(kind==='pho'&&hasPrize(s,'pho','p-local')||kind!=='pho'&&kind!=='tea'&&hasPrize(s,'home','h-team')?1:1.2)){
          s.stock[kind]--;if(kind==='tea')s.stats.soldTea++;else if(kind==='pho')s.stats.soldPho++;else s.stats.soldBanh++;
          const price=priceFor(kind,c.priceBasis,s.owner.ice.freshLeft>0);
          if(kind==='pho')s.phoTill+=price;else s.till+=price;
          recordSale(s,c.type==='pho'?'pho':'home',1,kind);s.revenue+=price;s.sold++;s.served++;c.received=(c.received||0)+1;c.remaining=(c.remaining??1)-1;c.service=0;if(!c.remaining)c.phase='leave';c.holding=kind;
          emit('sold',{x:c.x,y:c.y-45,amount:price});
        }}else c.service=0;
      }
      if(c.patience<=0&&c.phase!=='leave'){c.phase='leave';c.angry=true;s.lost++;emit('lost',{x:c.x,y:c.y-40});}
    }
  }
  s.customers=s.customers.filter(c=>c.x<660);
}
export function tick(s, dt, input = { x: 0, y: 0 }, emit = () => {}) {
  if (!s.started || dt <= 0) return;
  prepareRestaurant(s);dt = Math.min(dt, .1); s.elapsed += dt;
  const len = Math.hypot(input.x, input.y);
  s.player.moving = false;
  if (len > .05){const d=travelDelta(input.x,input.y,155*speedFactor(s,'owner')*Math.min(1,len)*dt);move(s.player,d.x,d.y,s,dt);}
  interact(s, s.player, dt, emit);
  interactDining(s,s.player,dt,emit);
  interactPantry(s,s.player,dt,carryCapacity(s),emit);
  const here=restaurantId(s),legacy=legacyOperations(s);
  if(here==='home'||legacy){
  s.supplyTimer += dt;
  if (s.supplyTimer >= 12) { s.supplyTimer -= 12; s.supply = Math.min(20, s.supply + 12); }
  const k = s.kitchen;
  if (!k.job && k.input > 0 && k.output.length < 8) {
    k.input--; k.serial++;
    k.job = { kind: s.upgrades.oven && k.serial % 3 === 0 ? 'special' : 'banh', left:(s.upgrades.oven?1.5:2.5)/(1+venueBonus(s,'home')),total:(s.upgrades.oven?1.5:2.5)/(1+venueBonus(s,'home')) };
  }
  if (k.job) { k.job.left -= dt; if (k.job.left <= 0) { k.output.push(k.job.kind); s.stats.cooked++; k.job = null; emit('cooked', { x: 365, y: 270 }); } }
  updateWorker(s, dt, emit);}
  if(here==='pho'||legacy)updateWorker(s,dt,emit,true);updateCustomers(s,dt,emit);
  if (!s.rushStarted && s.elapsed >= 300 && s.upgrades.worker && s.upgrades.tea) { s.rushStarted = true; emit('rush', { text: 'Giờ cao điểm! Cả phố ghé quán.' }); }
  if (s.rushStarted && s.rushLeft > 0) s.rushLeft = Math.max(0, s.rushLeft - dt);
  if (!s.finished && s.revenue >= 1800000 && s.rushStarted && s.rushLeft === 0 && s.upgrades.oven && s.upgrades.worker && s.upgrades.tea) { s.finished = true; s.day=2; s.day2=dayTwo(s.elapsed,s.revenue); emit('day',{text:'Ngày 02 · Cả phố đang đợi món mới!'}); }
  if((here==='pho'||legacy)&&s.upgrades.pho){
    s.phoSupplyTimer+=dt;if(s.phoSupplyTimer>=12){s.phoSupplyTimer-=12;s.phoSupply=Math.min(16,s.phoSupply+8);}
    const p=s.phoKitchen;
    if(!p.job&&p.input>0&&p.output.length<6){p.input--;p.serial++;const total=(s.upgrades.phoBoiler?2.6:4.2)/(1+venueBonus(s,'pho'));p.job={kind:'pho',left:total,total};}
    if(p.job){p.job.left-=dt;if(p.job.left<=0){p.output.push('pho');s.stats.cookedPho++;p.job=null;emit('cooked',{x:365,y:1000});}}
  }
  if((here==='home'||legacy)&&s.upgrades.teaAuto){s.teaAutoTimer+=dt;if(s.teaAutoTimer>=3&&s.stock.tea<demand(s).teaTarget){s.teaAutoTimer=0;s.stock.tea++;s.stats.brewed++;s.stats.stocked++;emit('tea',{x:450,y:540});}}
  if(here==='pho'||legacy)updateDayTwo(s,dt,emit);updatePantry(s,dt,emit);updateOwner(s,dt,emit);updateCareer(s,dt,emit);
  updateDining(s,dt,emit,{random:()=>random(s),walk:(a,dest,speed)=>walkTo(s,a,dest,speed,dt)});prepareRestaurant(s);

}
export function encode(s){return JSON.stringify({schema:7,state:s});}
const integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
const finite=n=>Number.isFinite(n);
function validBase(s,legacy){
  if(!s||!s.player||!s.upgrades||!s.stock||!s.stats||!Array.isArray(s.customers)||s.customers.length>10000)return false;
  if(![s.money,s.revenue,s.till].every(isMoney)||![s.sold,s.supply,s.nextCustomer,s.served,s.lost].every(integer)||!finite(s.elapsed)||s.elapsed<0||!Number.isInteger(s.rng)||s.rng<0||s.rng>0xffffffff)return false;
  if(![s.supplyTimer,s.spawnTimer,s.teaTimer,s.rushLeft].every(finite)||typeof s.started!=='boolean')return false;
  if(!Object.values(s.upgrades).every(v=>typeof v==='boolean'))return false;
  const bagKeys=legacy?['raw','banh','special','tea']:Object.keys(emptyBag());
  for(const a of [s.player,s.worker,...(legacy?[]:[s.worker2])].filter(Boolean)){
    if(![a.x,a.y,a.step,a.action,a.face].every(finite)||blocked(a.x,a.y,12,s)||!a.bag||!bagKeys.every(k=>integer(a.bag[k])))return false;
  }
  if(![s.finished,s.rushStarted,s.finishSeen].every(v=>typeof v==='boolean'))return false;
  const kitchens=legacy?[s.kitchen]:[s.kitchen,s.phoKitchen];
  for(const k of kitchens){if(!k||!integer(k.input)||!integer(k.serial)||!Array.isArray(k.output)||k.output.length>100||!k.output.every(v=>['banh','special','pho'].includes(v)))return false;
    if(k.job&&(!(k===s.kitchen?['banh','special']:['pho']).includes(k.job.kind)||![k.job.left,k.job.total].every(finite)||k.job.total<=0||k.job.left<=0||k.job.left>k.job.total))return false;
  }
  if(!(legacy?['banh','special','tea']:['banh','special','tea','pho']).every(k=>integer(s.stock[k])))return false;
  const oldStats=['rawTaken','cooked','stocked','workerStocked','collected','brewed','soldBanh','soldTea'];
  if(!(legacy?oldStats:Object.keys(freshState().stats)).every(k=>(['collected','rewards'].includes(k)?isMoney:integer)(s.stats[k])))return false;
  if(!s.customers.every(c=>(legacy||validBasis(c.priceBasis))&&(c.remaining===undefined||Number.isInteger(c.remaining)&&c.remaining>=0&&c.remaining<=2)&&(c.quantity===undefined||[1,2].includes(c.quantity))&&(c.received===undefined||[0,1,2].includes(c.received))&&[c.x,c.y,c.patience,c.service,c.look,c.step].every(finite)&&['enter','wait','leave'].includes(c.phase)&&['banh','special','tea','pho'].includes(c.type)))return false;
  return true;
}
export function migrateV1(s){
  if(s?.version!==1||!validBase(s,true))return null;
  const base=freshState();
  const upgradeActor=a=>a?{...a,bag:{...emptyBag(),...a.bag},path:[]}:null;
  return {...base,...s,version:6,day:s.finished?2:1,day2:dayTwo(s.elapsed,s.revenue),
    player:upgradeActor(s.player),worker:upgradeActor(s.worker),worker2:null,
    stock:{...base.stock,...s.stock},stats:{...base.stats,...s.stats},
    // M1 exit target was inside its removal boundary. Remove only those already offscreen.
    customers:s.customers.filter(c=>!(c.phase==='leave'&&c.x>=648)),
  };
}
export function decode(json){
  try{
    const v=JSON.parse(json);let s;
    if(v.schema===1&&v.state?.version===1)s=migrateV1(v.state);
    else if(v.schema===2&&v.state?.version===2){s=v.state;if(!Object.hasOwn(s,'owner'))s.owner=ownerState();for(const a of [s.player,s.worker,s.worker2].filter(Boolean))if(a.bag&&!Object.hasOwn(a.bag,'ice'))a.bag.ice=0;s.dining=diningState();s.version=6;}
    else if(v.schema===3&&v.state?.version===3){s=v.state;s.version=6;}
    else if(v.schema===4&&v.state?.version===4){s=v.state;s.version=6;}
    else if(v.schema===5&&v.state?.version===5){s=v.state;s.version=6;}
    else if(v.schema===6&&v.state?.version===6)s=v.state;else if(v.schema===7&&v.state?.version===7)s=v.state;else return null;
    if(s&&v.schema<4)s.career=careerState(s);
    if(s&&v.schema<5)convertLegacyMoney(s);
    if(s?.currency!=='VND')return null;
    if(s&&v.schema<6){s.places=placesState(s);s.owner.takeaway.venue='home';s.dining.event.festival=false;for(const table of s.dining.tables)table.greeted=false;normalizeVenuePosition(s);
      // The compact courtyard keeps reservations/bills, but moves old seated guests to their new seats.
      for(const guest of s.dining.guests){if(guest.seated||guest.phase==='eat'){const seat=DINING_TABLES[guest.table]?.seats[guest.seat];if(seat)Object.assign(guest,seat);}else if(guest.y>2390||blocked(guest.x,guest.y,12,s)){guest.x=550;guest.y=1770+guest.seat*36;}guest.path=[];delete guest.navKey;}
      for(const actor of [s.player,s.dining.waiter].filter(Boolean))if(blocked(actor.x,actor.y,12,s)){actor.x=actor===s.player?300:480;actor.y=actor===s.player?1810:1740;actor.path=[];actor.moving=false;}
}
    if(s&&v.schema<7){s.version=7;s.local=restaurantState();s.career.office.venue=s.career.office.active?'street':restaurantId(s);s.career.welcome.venue=s.career.welcome.active?'street':restaurantId(s);s.career.welcome.localStart=0;s.local.legacyIce=!!(s.owner.ice.active||s.owner.ice.freshLeft>0);s.local.earned={homeBread:s.stats.soldBanh,phoBowls:s.stats.soldPho,diningOwner:s.career.stats.ownerDishes,diningClean:s.career.stats.ownerCleaned,diningWelcome:s.career.welcome.completed};s.local.sold={home:s.stats.soldBanh+s.stats.soldTea,pho:s.stats.soldPho,dining:s.dining.stats.dishes};s.local.lunch={legacy:s.day2.event.active,start:s.local.sold.pho};s.local.partitionPending=true;s.local.legacyMode=!!oldActivities(s);}
    if(!validRestaurants(s?.local)||!validPlaces(s?.places,s))return null;
    if(Object.values(s.local.jobs).filter(Boolean).some(j=>!validOwner(j.owner)||!validCareer({...s.career,office:j.office,welcome:j.welcome})))return null;
    if(!s||!validCareer(s.career)||!validOwner(s.owner)||!validBase(s,false)||!integer(s.day)||s.day<1||!validDining(s.dining,s,blocked)||!s.day2||!s.day2.event)return null;
    if(![s.phoSupply].every(integer)||!isMoney(s.phoTill)||![s.phoSupplyTimer,s.teaAutoTimer,s.day2.startedAt].every(finite)||!isMoney(s.day2.revenueStart))return null;
    if(![s.day2.completed,s.day2.summarySeen].every(v=>typeof v==='boolean'))return null;
    if(!Array.isArray(s.day2.claimed)||new Set(s.day2.claimed).size!==s.day2.claimed.length||!s.day2.claimed.every(id=>QUESTS.some(q=>q.id===id)))return null;
    const e=s.day2.event;if(![e.left,e.cooldown,e.startSold,e.best,e.attempts,e.lastServed].every(n=>finite(n)&&n>=0)||e.left>60||typeof e.active!=='boolean')return null;
    if(s.worker&&!['supply','kitchen','sale'].includes(s.worker.target))return null;
    if(s.worker2&&(!s.upgrades.worker2||!s.upgrades.pho||!['phoSupply','phoKitchen','phoSale'].includes(s.worker2.target)))return null;
    if(s.upgrades.worker&&!s.worker||s.upgrades.worker2&&!s.worker2)return null;
    s.customers=s.customers.filter(c=>!(c.phase==='leave'&&c.x>=660));
    if(s.customers.length>MAX_CUSTOMERS)return null;
    for(const w of [s.worker,s.worker2,s.dining.waiter,...s.dining.guests].filter(Boolean)){w.path=[];delete w.navKey;}
    return s;
  }catch{return null;}
}
