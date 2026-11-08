import {recordMotion,travelDelta} from './animation.js';
// Optional owner's work. Automation stays intact; no penalties for ignoring jobs.
export const PICKUP = {x:450,y:770,label:'Giao đơn mang đi'};
export function ownerState(){return {
  takeaway:{active:false,left:0,cooldown:0,serial:0,recipe:{bread:2,tea:2,pho:0},completed:0,missed:0,bonusEarned:0},
  ice:{active:false,stock:2,restock:0,cooldown:0,freshLeft:0,taken:0,used:0},courier:null,
};}
export function nextRecipe(s){return s.upgrades.pho&&s.owner.takeaway.serial%2===1?{bread:1,tea:1,pho:1}:{bread:s.upgrades.tea?2:3,tea:s.upgrades.tea?2:0,pho:0};}
export function startTakeaway(s,emit=()=>{}){
  const q=s.owner.takeaway;if(!s.upgrades.worker||q.active||q.cooldown>0)return false;
  q.recipe=nextRecipe(s);q.active=true;q.left=70;q.serial++;
  s.owner.courier={x:650,y:812,phase:'arrive',face:-1,step:0,look:7,courier:true};
  emit('owner',{text:'Đơn mang đi · Gom món ở quầy rồi giao tại điểm túi giấy.'});return true;
}
export function startIce(s,emit=()=>{}){
  const ice=s.owner.ice;if(!s.upgrades.worker||!s.upgrades.tea||ice.active||ice.cooldown>0||ice.stock<=0)return false;
  ice.active=true;emit('owner',{text:'Tiếp đá · Lấy thùng tại kho rau, mang tới quầy trà.'});return true;
}
export function reservedBread(s,actor){
  const need=s.owner.takeaway.active?s.owner.takeaway.recipe.bread:0,banh=Math.min(need,actor.bag.banh);
  return {banh,special:Math.min(Math.max(0,need-banh),actor.bag.special)};
}
export function hasParcel(s){const b=s.player.bag,r=s.owner.takeaway.recipe;return b.banh+b.special>=r.bread&&b.tea>=r.tea&&b.pho>=r.pho;}
export function parcelCount(s){const b=s.player.bag,r=s.owner.takeaway.recipe;return Math.min(r.bread,b.banh+b.special)+Math.min(r.tea,b.tea)+Math.min(r.pho,b.pho);}
export function updateOwner(s,dt,emit){
  const q=s.owner.takeaway,ice=s.owner.ice;q.cooldown=Math.max(0,q.cooldown-dt);ice.cooldown=Math.max(0,ice.cooldown-dt);ice.freshLeft=Math.max(0,ice.freshLeft-dt);
  ice.restock+=dt;if(ice.restock>=90){ice.restock-=90;ice.stock=Math.min(2,ice.stock+1);}
  if(q.active){q.left=Math.max(0,q.left-dt);if(q.left===0){q.active=false;q.missed++;q.cooldown=30;if(s.owner.courier)s.owner.courier.phase='leave';emit('owner',{text:'Khách đã đi. Món vẫn trên tay; có thể bày lại, không mất tiền.'});}}
  const c=s.owner.courier;
  if(c){const tx=c.phase==='leave'?680:510,ty=812,dx=tx-c.x,dy=ty-c.y,d=Math.hypot(dx,dy);c.moving=d>1;if(d>1){const delta=travelDelta(dx,dy,90*dt,true);c.x+=delta.x;c.y+=delta.y;recordMotion(c,delta.x,delta.y,dt);}else if(c.phase==='arrive')c.phase='wait';if(c.x>660)s.owner.courier=null;}
}
export function deliverTakeaway(s,emit=()=>{}){
  const q=s.owner.takeaway;if(!q.active||!hasParcel(s)||!s.owner.courier||Math.abs(s.owner.courier.x-510)>5)return false;
  const b=s.player.bag,r=q.recipe,normal=Math.min(b.banh,r.bread),special=r.bread-normal;
  const amount=normal*12+special*18+r.tea*(s.owner.ice.freshLeft>0?13:10)+r.pho*28,bonus=36+Math.min(10,Math.floor(q.left/10)*2),items=r.bread+r.tea+r.pho;
  b.banh-=normal;b.special-=special;b.tea-=r.tea;b.pho-=r.pho;
  s.stats.soldBanh+=r.bread;s.stats.soldTea+=r.tea;s.stats.soldPho+=r.pho;
  s.sold+=items;s.served++;s.revenue+=amount;s.money+=amount+bonus;s.stats.rewards+=bonus;q.bonusEarned+=bonus;q.completed++;q.active=false;q.cooldown=70;
  if(s.owner.courier){s.owner.courier.phase='leave';s.owner.courier.parcel=true;}
  emit('money',{x:PICKUP.x,y:PICKUP.y-20,amount:amount+bonus});emit('owner',{text:`Giao đơn thành công · ${amount} xu món + ${bonus} xu thưởng!`});return true;
}
export function validOwner(o){
  if(!o||!o.takeaway||!o.ice)return false;const q=o.takeaway,i=o.ice,finite=n=>Number.isFinite(n)&&n>=0;
  if(typeof q.active!=='boolean'||typeof i.active!=='boolean'||![q.left,q.cooldown,q.serial,q.completed,q.missed,q.bonusEarned,i.stock,i.restock,i.cooldown,i.freshLeft,i.taken,i.used].every(finite)||q.left>70||i.stock>2||i.freshLeft>50)return false;
  if(!q.recipe||!['bread','tea','pho'].every(k=>Number.isInteger(q.recipe[k])&&q.recipe[k]>=0&&q.recipe[k]<=3)||q.recipe.bread+q.recipe.tea+q.recipe.pho<1)return false;
  if(o.courier&&(![o.courier.x,o.courier.y,o.courier.step].every(Number.isFinite)||!['arrive','wait','leave'].includes(o.courier.phase)))return false;return true;
}
