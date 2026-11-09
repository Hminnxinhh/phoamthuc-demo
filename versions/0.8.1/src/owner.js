import{restaurantId,jobHere,recordSale,newOwner,prepareRestaurant}from'./restaurants.js';
import {hasPrize} from './venues.js';
import {formatVnd} from './currency.js';
import {priceFor,isMoney,validBasis} from './currency.js';
import {gainXP,carryCapacity} from './career.js';
import {recordMotion,travelDelta} from './motion.js';
// Optional owner's work. Automation stays intact; no penalties for ignoring jobs.
import {STATIONS} from './world-layout.js';
export const PICKUP=STATIONS.pickup;
export function ownerState(){return newOwner();}
export function nextRecipe(s){return restaurantId(s)==='pho'?{bread:0,tea:0,pho:3}:{bread:s.upgrades.tea?2:3,tea:s.upgrades.tea?2:0,pho:0};}
export function startTakeaway(s,emit=()=>{},allowSolo=false){
  if(!prepareRestaurant(s))return false;const q=s.owner.takeaway;if(restaurantId(s)==='dining'||s.career?.office.active||!s.upgrades.worker&&!allowSolo||q.active||q.cooldown>0)return false;
  q.venue=restaurantId(s);q.priceBasis='current';q.recipe=nextRecipe(s);q.active=true;q.left=70;q.serial++;
  s.owner.courier={x:650,y:q.venue==='pho'?1542:812,phase:'arrive',face:-1,step:0,look:7,courier:true};
  emit('owner',{text:'Đơn mang đi · Gom món ở quầy rồi giao tại điểm túi giấy.'});return true;
}
export function startVenueOrder(s,id,emit=()=>{}){if(id!==restaurantId(s)||!['home','pho'].includes(id)||!hasPrize(s,id,id==='home'?'h-hands':'p-hands')||id==='pho'&&!s.upgrades.pho||!startTakeaway(s,()=>{},true))return false;const q=s.owner.takeaway;q.venue=id;q.recipe=id==='pho'?{bread:0,tea:0,pho:3}:{bread:hasPrize(s,'home','h-local')&&carryCapacity(s)>=6?3:2,tea:s.upgrades.tea?(hasPrize(s,'home','h-local')&&carryCapacity(s)>=6?3:2):0,pho:0};if(id==='pho')s.owner.courier.y=1542;emit('owner',{text:'Đơn riêng của quán · Gom món rồi giao ngay tại địa chỉ này.'});return true;}
export const parcelStation=s=>s.owner.takeaway.venue==='pho'?'office':'pickup';
export function startIce(s,emit=()=>{}){
  if(!prepareRestaurant(s)||restaurantId(s)!=='home')return false;const ice=s.owner.ice;if(!s.upgrades.worker||!s.upgrades.tea||ice.active||ice.cooldown>0||ice.stock<=0)return false;
  s.local.legacyIce=false;ice.active=true;emit('owner',{text:'Tiếp đá · Lấy thùng tại kho rau, mang tới quầy trà.'});return true;
}
export function reservedBread(s,actor){
  const need=jobHere(s,s.owner.takeaway)?s.owner.takeaway.recipe.bread:0,banh=Math.min(need,actor.bag.banh);
  return {banh,special:Math.min(Math.max(0,need-banh),actor.bag.special)};
}
export function hasParcel(s){const b=s.player.bag,r=s.owner.takeaway.recipe;return b.banh+b.special>=r.bread&&b.tea>=r.tea&&b.pho>=r.pho;}
export function parcelCount(s){const b=s.player.bag,r=s.owner.takeaway.recipe;return Math.min(r.bread,b.banh+b.special)+Math.min(r.tea,b.tea)+Math.min(r.pho,b.pho);}
export function updateOwner(s,dt,emit){
  const q=s.owner.takeaway,ice=s.owner.ice;if(jobHere(s,q)||restaurantId(s)===q.venue)q.cooldown=Math.max(0,q.cooldown-dt);if(restaurantId(s)==='home'||s.local.legacyIce){ice.cooldown=Math.max(0,ice.cooldown-dt);ice.freshLeft=Math.max(0,ice.freshLeft-dt);
  ice.restock+=dt;if(ice.restock>=90){ice.restock-=90;ice.stock=Math.min(2,ice.stock+1);}
  }
  if(s.local.legacyIce&&!ice.active&&!ice.freshLeft)s.local.legacyIce=false;
  if(jobHere(s,q)){q.left=Math.max(0,q.left-dt);if(q.left===0){q.active=false;q.missed++;q.cooldown=30;if(s.owner.courier)s.owner.courier.phase='leave';emit('owner',{text:'Khách đã đi. Món vẫn trên tay; có thể bày lại, không mất tiền.'});}}
  const c=s.owner.courier;
  if(c&&(restaurantId(s)===q.venue||jobHere(s,q))){const tx=c.phase==='leave'?680:510,ty=q.venue==='pho'?1542:812,dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy);c.moving=d>1;if(d>1){const delta=travelDelta(dx,dy,90*dt,true);c.x+=delta.x;c.y+=delta.y;recordMotion(c,delta.x,delta.y,dt);}else if(c.phase==='arrive')c.phase='wait';if(c.x>660)s.owner.courier=null;}
}
export function deliverTakeaway(s,emit=()=>{}){
  const q=s.owner.takeaway;if(!q.active||!hasParcel(s)||!s.owner.courier||Math.abs(s.owner.courier.x-510)>5)return false;
  const b=s.player.bag,r=q.recipe,normal=Math.min(b.banh,r.bread),special=r.bread-normal;
  const amount=normal*priceFor('banh',q.priceBasis)+special*priceFor('special',q.priceBasis)+r.tea*priceFor('tea',q.priceBasis,s.owner.ice.freshLeft>0)+r.pho*priceFor('pho',q.priceBasis),bonus=72000+Math.min(20000,Math.floor(q.left/10)*4000),items=r.bread+r.tea+r.pho;
  b.banh-=normal;b.special-=special;b.tea-=r.tea;b.pho-=r.pho;
  s.stats.soldBanh+=r.bread;s.stats.soldTea+=r.tea;s.stats.soldPho+=r.pho;
  recordSale(s,q.venue,items);if(q.venue==='home')s.local.earned.homeBread+=r.bread;else s.local.earned.phoBowls+=r.pho;s.sold+=items;s.served++;if(s.career){s.career.stats.ownerDishes+=items;gainXP(s,'owner',items*2+6);}s.revenue+=amount;s.money+=amount+bonus;s.stats.rewards+=bonus;q.bonusEarned+=bonus;q.completed++;if(s.places)s.places.stats[q.venue==='pho'?'localPho':'localHome']++;q.active=false;q.cooldown=70;
  if(s.owner.courier){s.owner.courier.phase='leave';s.owner.courier.parcel=true;}
  emit('money',{x:STATIONS[parcelStation(s)].x,y:STATIONS[parcelStation(s)].y-20,amount:amount+bonus});emit('owner',{text:`Giao đơn thành công · ${formatVnd(amount)} tiền món + ${formatVnd(bonus)} thưởng!`});return true;
}
export function validOwner(o){
  if(!o||!o.takeaway||!o.ice)return false;const q=o.takeaway,i=o.ice,finite=n=>Number.isFinite(n)&&n>=0;
  if(!['home','pho'].includes(q.venue)||!validBasis(q.priceBasis)||!isMoney(q.bonusEarned))return false;
  if(typeof q.active!=='boolean'||typeof i.active!=='boolean'||![q.left,q.cooldown,q.serial,q.completed,q.missed,q.bonusEarned,i.stock,i.restock,i.cooldown,i.freshLeft,i.taken,i.used].every(finite)||q.left>70||i.stock>2||i.freshLeft>70)return false;
  if(!q.recipe||!['bread','tea','pho'].every(k=>Number.isInteger(q.recipe[k])&&q.recipe[k]>=0&&q.recipe[k]<=3)||q.recipe.bread+q.recipe.tea+q.recipe.pho<1)return false;
  if(o.courier&&(![o.courier.x,o.courier.y,o.courier.step].every(Number.isFinite)||!['arrive','wait','leave'].includes(o.courier.phase)))return false;return true;
}
