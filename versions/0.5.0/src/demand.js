import {welcomeBoost} from './career.js';
// Demand grows with operating capacity. NPC caps remain fixed; each bundle uses real stock.
export function demand(s){
 const mature=s.day>=3,expanded=s.day>=2&&s.upgrades.pho,boost=welcomeBoost(s),lunch=s.day2.event.active;
 const interval=mature?(boost?1.5:2.2):expanded?(lunch?2.2:2.6):null;
 return{interval:interval===null?null:interval*(1+.09*Math.sin(s.elapsed/29)),cap:mature?12:expanded?10:null,bundles:mature?.30:expanded?.20:0,teaTarget:mature?8:6,prepBread:mature?10:8,prepPho:mature?7:6,
  weights:boost?(s.career.welcome.kind==='office'?[.25,.30,.45]:[.48,.38,.14]):lunch?[.25,.20,.55]:mature?[.34,.36,.30]:[.46,.26,.28]};
}
export function readyFood(s,kind){const actors=[s.player,s.worker,s.worker2,s.dining.waiter].filter(Boolean),keys=kind==='bread'?['banh','special']:[kind];return keys.reduce((n,k)=>n+s.stock[k]+s.dining.buffer[k]+actors.reduce((v,a)=>v+a.bag[k],0),0)+(kind==='bread'?s.kitchen.output.length:s.phoKitchen.output.length);}
