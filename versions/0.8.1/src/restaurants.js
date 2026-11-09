// Operations belong to one address. Shared money/skills are the owner's existing progress.
import{STATIONS}from'./world-layout.js';
const FOODS=['banh','special','tea','pho'];
export const restaurantId=s=>s.player.y<920?'home':s.player.y<1660?'pho':'dining';
const empty=()=>({raw:0,banh:0,special:0,tea:0,rawPho:0,pho:0,ice:0});
export const newOffice=(venue='home')=>({venue,priceBasis:'current',active:false,left:0,cooldown:0,stage:0,delivered:{banh:0,special:0,tea:0,pho:0},completed:0,missed:0,bonus:0});
export const newWelcome=(venue='home')=>({venue,localStart:0,active:false,stage:0,left:0,progress:0,cooldown:0,kind:'market',startSold:0,completed:0,missed:0,last:0});
export const newOwner=(venue='home')=>({takeaway:{venue:venue==='dining'?'home':venue,priceBasis:'current',active:false,left:0,cooldown:0,serial:0,recipe:{bread:2,tea:2,pho:0},completed:0,missed:0,bonusEarned:0},ice:{active:false,stock:2,restock:0,cooldown:0,freshLeft:0,taken:0,used:0},courier:null});
export function restaurantState(){return{bags:{home:empty(),pho:empty(),dining:empty()},jobs:{home:null,pho:null,dining:null},partitionPending:false,legacyMode:false,legacyIce:false,earned:{homeBread:0,phoBowls:0,diningOwner:0,diningClean:0,diningWelcome:0},sold:{home:0,pho:0,dining:0},lunch:{legacy:false,start:0},phoSpawn:2,pantry:{supply:20,restock:0,taken:0,input:0,job:null,output:[],serial:0,cooked:{banh:0,special:0,tea:0,pho:0}}};}
export const jobHere=(s,q)=>q.active&&(s.local?.legacyMode||q.venue==='street'||q.recipe&&q.recipe.pho>0&&q.recipe.bread+q.recipe.tea>0||q.venue===restaurantId(s));
// Old mixed orders remain completable, with their original price and carried items.
export const legacyOperations=s=>s.local?.legacyMode||s.local?.legacyIce&&(s.owner.ice.active||s.owner.ice.freshLeft>0)||s.local?.lunch?.legacy&&s.day2.event.active||s.career.office.active&&s.career.office.venue==='street'||s.career.welcome.active&&s.career.welcome.venue==='street'||s.owner.takeaway.active&&s.owner.takeaway.recipe.pho>0&&s.owner.takeaway.recipe.bread+s.owner.takeaway.recipe.tea>0;
export const legacyTrip=s=>s.local?.legacyMode||s.local?.legacyIce&&s.owner.ice.active||s.career.office.active&&s.career.office.venue==='street'||s.career.welcome.active&&s.career.welcome.stage<2&&s.career.welcome.venue==='street'||s.owner.takeaway.active&&s.owner.takeaway.recipe.pho>0&&s.owner.takeaway.recipe.bread+s.owner.takeaway.recipe.tea>0;
// Legacy operations keep the original shared controller until every active lease ends.
// Then repartition once, without discarding its inactive history or moving its money.
export const oldActivities=s=>s.owner.takeaway.active||s.owner.ice.active||s.owner.ice.freshLeft>0||s.career.office.active||s.career.welcome.active||s.local.lunch.legacy&&s.day2.event.active;
export function prepareRestaurant(s){const l=s.local;if(!l||!l.partitionPending&&!l.legacyMode)return true;if(l.legacyMode&&oldActivities(s))return false;
 const here=restaurantId(s),jobs=Object.fromEntries(['home','pho','dining'].map(v=>[v,{owner:newOwner(v),office:newOffice(v),welcome:newWelcome(v)}]));
 const q=s.owner.takeaway,qVenue=q.venue==='pho'?'pho':'home';jobs[qVenue].owner.takeaway=structuredClone(q);jobs[qVenue].owner.courier=structuredClone(s.owner.courier);jobs.home.owner.ice=structuredClone(s.owner.ice);
 const office=structuredClone(s.career.office),welcome=structuredClone(s.career.welcome);office.venue=office.venue==='street'?'home':office.venue;welcome.venue=welcome.venue==='street'?(welcome.kind==='office'?'pho':'home'):welcome.venue;jobs[office.venue].office=office;jobs[welcome.venue].welcome=welcome;
 l.jobs=jobs;s.owner=jobs[here].owner;s.career.office=jobs[here].office;s.career.welcome=jobs[here].welcome;l.jobs[here]=null;
 // A courtyard can use every old food. In the two counters, return incompatible
 // carried ingredients to their original local bag rather than stranding them.
 const destinations=here==='home'?{rawPho:'pho',pho:'pho'}:here==='pho'?{raw:'home',banh:'home',special:'home',tea:'home',ice:'home'}:{};
 for(const[k,to]of Object.entries(destinations)){l.bags[to][k]+=s.player.bag[k];s.player.bag[k]=0;}
 // Specials were produced only by the old bread shop; no courtyard table orders them.
 s.stock.special+=s.dining.buffer.special;s.dining.buffer.special=0;if(here==='dining'){s.stock.special+=s.player.bag.special;s.player.bag.special=0;}
 l.partitionPending=false;l.legacyMode=false;l.legacyIce=false;return true;
}
export function storeCargo(s,to){if(!s.local)return;if(!prepareRestaurant(s))return;const from=restaurantId(s);if(!legacyTrip(s)){s.local.bags[from]={...s.player.bag};s.player.bag={...s.local.bags[to]};s.local.bags[to]=empty();}
 if(!legacyOperations(s)){s.local.jobs[from]=structuredClone({owner:s.owner,office:s.career.office,welcome:s.career.welcome});const job=s.local.jobs[to]||{owner:newOwner(to),office:newOffice(to),welcome:newWelcome(to)};s.owner=job.owner;s.career.office=job.office;s.career.welcome=job.welcome;s.local.jobs[to]=null;}
}
export const deliveryIds=(s,q)=>q.venue==='street'?['office','invite']:q.venue==='pho'?['office','phoDoor']:q.venue==='dining'?['diningPickup','diningDoor']:['pickup','invite'];
export const welcomeIds=(s,q)=>q.venue==='street'?['invite','office']:[...deliveryIds(s,q)].reverse();
export function recordSale(s,venue,count,kind){if(!s.local)return;s.local.sold[venue]+=count;if(venue==='home'&&['banh','special'].includes(kind))s.local.earned.homeBread+=count;if(venue==='pho'&&kind==='pho')s.local.earned.phoBowls+=count;}
export function pantryDemand(s){const needed={banh:0,special:0,tea:0,pho:0};for(const t of s.dining.tables)if(['seating','waiting'].includes(t.state))for(const k of FOODS)needed[k]+=Math.max(0,t.order[k]-t.delivered[k]);
 const q=s.career.office;if(jobHere(s,q)&&q.venue==='dining'){const recipe=q.stage===0?{banh:2,tea:2,pho:0}:{banh:0,tea:2,pho:2};for(const k of FOODS)needed[k]+=Math.max(0,(recipe[k]||0)-(q.delivered[k]||0));}
 for(const k of FOODS)needed[k]=Math.max(0,needed[k]-s.dining.buffer[k]-s.player.bag[k]-(s.dining.waiter?.bag[k]||0)-s.local.pantry.output.filter(x=>x===k).length-(s.local.pantry.job?.kind===k?1:0));
 return needed;
}
export function updatePantry(s,dt,emit){if(!s.upgrades.dining||restaurantId(s)!=='dining')return;const p=s.local.pantry;p.restock+=dt;if(p.restock>=12){p.restock-=12;p.supply=Math.min(20,p.supply+12);}
 const auto=s.upgrades.diningPrep;
 if(auto&&p.input<2&&p.supply>0&&Object.values(pantryDemand(s)).some(n=>n>0)){p.supply--;p.taken++;p.input++;}
 if(!p.job&&p.input&&p.output.length<8){const demand=pantryDemand(s),kind=FOODS.reduce((best,k)=>demand[k]>demand[best]?k:best,'pho');if(demand[kind]>0||p.output.length<3){p.input--;p.serial++;const food=demand[kind]>0?kind:['pho','tea','banh'][p.serial%3],total=food==='tea'?1.4:food==='pho'?3:2.2;p.job={kind:food,left:total,total};}}
 if(p.job){p.job.left-=dt;if(p.job.left<=0){const k=p.job.kind;p.output.push(k);p.cooked[k]++;p.job=null;emit('cooked',{x:260,y:1630});}}
 if(auto&&p.output.length){const kind=p.output.shift();s.dining.buffer[kind]++;emit('drop',{x:350,y:1660,kind});}
}
export function interactPantry(s,a,dt,cap,emit){if(!s.upgrades.dining||restaurantId(s)!=='dining'||a.action>0)return;const p=s.local.pantry,at=id=>Math.hypot(a.x-STATIONS[id].x,a.y-STATIONS[id].y)<43,used=Object.values(a.bag).reduce((n,v)=>n+v,0);
 if(at('diningSupply')&&used<cap&&p.supply>0&&!FOODS.some(k=>a.bag[k])){a.bag.rawPho++;p.supply--;p.taken++;a.action=.25;emit('pickup',{x:a.x,y:a.y,kind:'rawPho'});}
 if(at('diningKitchen')){if(a.bag.rawPho||a.bag.raw){if(a.bag.rawPho)a.bag.rawPho--;else a.bag.raw--;p.input++;a.action=.22;emit('drop',{x:260,y:1625,kind:'rawPho'});}else if(p.output.length&&used<cap){const kind=p.output.shift();a.bag[kind]++;a.action=.24;emit('pickup',{x:a.x,y:a.y,kind});}}
}
export function validRestaurants(l){const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9,finite=n=>Number.isFinite(n)&&n>=0;return !!l&&typeof l.partitionPending==='boolean'&&typeof l.legacyMode==='boolean'&&(!l.legacyMode||l.partitionPending)&&(!l.partitionPending||Object.values(l.jobs||{}).every(v=>v===null))&&typeof l.legacyIce==='boolean'&&l.lunch&&typeof l.lunch.legacy==='boolean'&&int(l.lunch.start)&&l.jobs&&['home','pho','dining'].every(v=>l.jobs[v]===null||l.jobs[v]&&typeof l.jobs[v]==='object')&&Object.keys(restaurantState().earned).every(k=>int(l.earned?.[k]))&&['home','pho','dining'].every(v=>l.bags?.[v]&&Object.keys(empty()).every(k=>int(l.bags[v][k]))&&int(l.sold?.[v]))&&finite(l.phoSpawn)&&l.pantry&&int(l.pantry.supply)&&finite(l.pantry.restock)&&int(l.pantry.taken)&&int(l.pantry.input)&&int(l.pantry.serial)&&FOODS.every(k=>int(l.pantry.cooked?.[k]))&&Array.isArray(l.pantry.output)&&l.pantry.output.length<=100&&l.pantry.output.every(k=>FOODS.includes(k))&&(!l.pantry.job||FOODS.includes(l.pantry.job.kind)&&finite(l.pantry.job.left)&&l.pantry.job.left>0&&finite(l.pantry.job.total)&&l.pantry.job.left<=l.pantry.job.total);}
