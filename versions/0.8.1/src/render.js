import{jobHere}from'./restaurants.js';
import{officeStation,welcomeStation}from'./career.js';
import{parcelStation}from'./owner.js';
import {currentVenue,stationVenue,hasPrize} from './venues.js';
import {compactVnd,formatVnd} from './currency.js';
import {level,carryCapacity} from './career.js';
import {activeTables,needs,GUEST_TYPES} from './dining.js';
import {DINING_TABLES,SERVICE_PASS,worldHeight as layoutHeight} from './world-layout.js';
import {t as translateCanvas,getLanguage} from './locale.js';
import {ActorAnimator,CHIBI} from './animation.js';
import { WORLD, STATIONS, SOLIDS, count, goal } from './model.js';
const C = { ink: '#284f43', teal: '#337b69', dark: '#1c5144', cream: '#fff2cf', gold: '#efba58', wood: '#b97b46' };
let ctx,animation,frameDelta=0,sceneState,night=false;
const floorColour=(day,evening)=>night?evening:day;
function rr(x,y,w,h,r,fill,stroke,line=1) { ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();} }
function el(x,y,rx,ry,fill) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill(); }
function line(x,y,x2,y2,color,width=2) { ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke(); }
function text(t,x,y,size=14,color=C.ink,weight=700,align='center') { ctx.font=`${weight} ${size}px "Trebuchet MS", system-ui, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;const label=translateCanvas(t),max=label.length>28?310:undefined;if(max)ctx.fillText(label,x,y,max);else ctx.fillText(label,x,y); }
function leaf(x,y,scale=1,angle=0) {ctx.save();ctx.translate(x,y);ctx.rotate(angle);el(0,0,7*scale,15*scale,'#568d59');line(0,-9*scale,0,10*scale,'#84ae6b',1.4);ctx.restore();}
function plant(x,y,scale=1) {ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);el(0,10,25,9,'#61554220');rr(-17,-14,34,30,5,'#bb7554');rr(-20,-16,40,9,3,'#d89168');for(let i=0;i<7;i++){const a=(i-3)*.33;line(0,-14,Math.sin(a)*25,-40-Math.cos(a)*8,'#54835b',3);leaf(Math.sin(a)*26,-43-Math.cos(a)*8,.75,a);}ctx.restore();}
function plasticChair(x,y){
  el(x,y+10,23,8,'#5e533b20');
  for(const dx of [-14,14]){line(x+dx,y-7,x+dx*1.15,y+13,'#a34f3b',5);line(x+dx,y-20,x+dx,y-43,'#be624b',5);}
  rr(x-19,y-48,38,23,5,'#d37859','#ac563e',1.5);rr(x-14,y-43,28,12,3,'#e4a378');
  rr(x-21,y-14,42,15,5,'#bd6048');rr(x-21,y-16,42,10,5,'#e4936d');line(x-15,y-11,x+15,y-11,'#f0b58a',1.3);
}
export function food(kind,x,y,scale=1,angle=0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
  if(kind==='ice'){rr(-19,-11,38,25,4,'#81b5bf','#477c8e',1.7);rr(-21,-14,42,7,3,'#d0e5df','#648f99');line(-16,-5,-16,8,'#bbd8d7',2);line(15,-5,15,8,'#bbd8d7',2);text('ĐÁ',0,3,10,'#eff7e9',900);}
  else if(kind==='pho'){
    el(0,12,26,8,'#705b3828');ctx.beginPath();ctx.moveTo(-27,-3);ctx.quadraticCurveTo(-23,22,0,22);ctx.quadraticCurveTo(23,22,27,-3);ctx.fillStyle='#f6f2d7';ctx.fill();
    el(0,0,28,13,'#d1ded0');el(0,-1,25,11,'#b17b43');el(0,-2,21,9,'#cfa369');
    for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(-7+i*3,-2+(i%2)*2,11,3,0,0,Math.PI*1.7);ctx.strokeStyle='#fbf0ca';ctx.lineWidth=2;ctx.stroke();}
    for(let i=0;i<3;i++){el(-12+i*10,-4+(i%2)*3,7,4,'#b97961');line(-15+i*10,-5,-10+i*10,-3,'#e4b8a0',1.3);}
    for(let i=0;i<5;i++)el(-15+i*7,-7+(i%3)*5,2,1.5,'#568b4d');leaf(18,-5,.38,.8);line(-24,-5,-12,-16,'#825732',1.5);line(-21,-4,-9,-15,'#825732',1.5);line(-16,13,16,13,'#6f9b87',1.7);
  }
  else if(kind==='rawPho'){rr(-20,-10,40,27,4,'#e0e5cd','#7e9e8b',1.4);rr(-17,-7,18,17,3,'#f9edc9');for(let i=0;i<3;i++)line(-14,-4+i*5,-3,-4+i*5,'#c4b995',1);for(let i=0;i<3;i++){rr(4,-6+i*5,11,4,2,'#bb7c68');line(5,-5+i*5,12,-5+i*5,'#e9bba0',1);}leaf(16,-8,.4,.8);}
  else if(kind==='tea') {rr(-9,-14,18,26,4,'#f4ce70','#c09846',1.5);rr(-7,-10,14,16,3,'#dba03e');el(0,-13,10,4,'#fff1bd');line(4,-24,2,-8,'#367a62',2.5);for(let i=0;i<3;i++)rr(-5+i*4,-8+(i%2)*5,4,4,1,'#ffeab99c');el(7,-9,5,5,'#63904c');el(7,-9,3,3,'#c4d564');}
  else if(kind==='raw') {rr(-15,-9,30,23,3,'#bd8953','#8c6543');for(let i=-1;i<2;i++){leaf(i*9,-7,.6,i*.45);el(i*8,-3,5,5,i===0?'#d76442':'#e6a349');}line(-13,4,13,4,'#e3bb7a',2);}
  else {el(0,5,23,9,'#98542830');ctx.rotate(-.18);rr(-24,-11,48,23,11,'#ca8238','#a9662e');rr(-23,-8,46,10,6,'#6c9348');for(let i=0;i<4;i++){el(-15+i*10,-3,5,4,'#e76d3f');}rr(-24,-14,48,13,8,kind==='special'?'#e7a64a':'#edb65f','#d59848');for(let i=-1;i<2;i++)line(i*12-3,-12,i*12+1,-6,'#ffe0a0',3);if(kind==='special'){line(15,-20,15,-10,'#a67c36',1.5);rr(15,-23,11,7,1,'#cb6246');}}
  if(kind==='banh'||kind==='special'){for(let i=0;i<5;i++){leaf(-17+i*8,-5+(i%2)*2,.23,(i-2)*.2);rr(-16+i*7,-2,9,2.4,1,'#ffe1a7');}for(let i=0;i<7;i++)line(-18+i*6,-12+(i%2)*2,-16+i*6,-13+(i%2)*2,'#fff2c8',1);line(-17,-9,15,-12,'#fff1c15e',2);}
  if(kind==='tea'){line(-6,-8,-6,7,'#fff8dcaa',1.5);el(-1,-13,7,2,'#f4bb42');el(7,-9,4.2,4.2,'#b5cf58');for(let i=0;i<5;i++){const a=i*Math.PI*.4;line(7,-9,7+Math.cos(a)*3,-9+Math.sin(a)*3,'#eef3a1',.5);}line(-8,11,7,11,'#e6e4c6',1);}
  if(kind==='pho'){line(-20,6,-15,15,'#ffffffa0',2);for(let i=0;i<8;i++)el(-18+i*5,-6+(i%3)*3,.8,.6,'#f7ce75');if(sceneState&&hasPrize(sceneState,'pho','p-busy')){line(-17,13,17,13,'#385d97',2);for(let i=-2;i<=2;i++)text('✿',i*6,16,5,'#507bb3');}}
  ctx.restore();
}
function badge(label,x,y,w=112,color='#fff2d6') {el(x,y+8,w/2,9,'#4a5a3520');rr(x-w/2,y-12,w,25,9,color,'#c9b995',1);text(label,x,y+1,12,C.ink);}
function ring(x,y,active,icon,t,highlight=false) {
  const pulse=Math.sin(t*3)*.5+.5;
  el(x,y+4,39,17,active?'#347d6944':'#fff5d930');
  ctx.beginPath();ctx.ellipse(x,y,38,16,0,0,Math.PI*2);ctx.strokeStyle=active?'#4d9a7d':highlight?'#e0aa4f':'#c6bb98';ctx.lineWidth=active?3:2;ctx.setLineDash(active?[]:[5,5]);ctx.stroke();ctx.setLineDash([]);
  text(icon,x,y,18,active?'#2a785d':'#ad9e79');
  if(highlight&&!active){ctx.save();ctx.globalAlpha=.5+pulse*.5;text('⌄',x,y-34-pulse*7,29,'#c68e38');ctx.restore();}
}
function counterBase(x,y,w,h,color,edge) {
  el(x+w/2,y+h,w*.52,13,'#77664822');rr(x,y+15,w,h-11,8,edge);rr(x+4,y+17,w-8,h-15,5,color);
  for(let i=16;i<w-5;i+=27)line(x+i,y+25,x+i,y+h-4,'#ffffff13',1);
  rr(x-4,y-7,w+8,29,7,'#e0b47a','#996c45',1.5);rr(x-4,y-9,w+8,10,4,'#f4d19a');
}
function supply(s,t) {
  const x=38,y=238;counterBase(x,y,134,86,'#b88954','#8e693e');
  rr(46,222,55,49,4,'#a77c48');rr(110,222,54,49,4,'#a77c48');
  for(let i=0;i<7;i++){leaf(56+(i%3)*16,229+Math.floor(i/3)*11,.75,(i-3)*.3);el(119+(i%3)*15,229+Math.floor(i/3)*12,7,6,i%2?'#deab4f':'#d66c48');}
  for(const xx of [47,111]){rr(xx,252,53,10,1,'#d7a66a');line(xx+3,255,xx+48,255,'#ecc88d',2);}
  food('raw',69,290,.55);text('RAU TƯƠI',117,283,9,'#fff0bf');if(s.owner.ice.stock>0)food('ice',145,296,.48);
  badge('NGUYÊN LIỆU',105,201,138);badge(`${s.supply}/20`,105,332,61,'#eee7d0');
}
function kitchen(s,t) {
  const x=285,y=226,w=172;counterBase(x,y,w,98,s.upgrades.oven?'#a96041':'#857f6a',s.upgrades.oven?'#804a34':'#626659');
  rr(294,215,154,56,6,'#c1b9a0','#7d826b',2);rr(300,221,62,44,5,'#3d5148');
  el(330,242,23,14,'#202f2c');el(330,240,18,10,'#b89e6d');
  if(s.kitchen.job){el(330,242,19+Math.sin(t*16)*2,8,'#ec9b39');el(330,239,12,6,'#f8cd69');}
  food('banh',330,235,.57);
  if(s.upgrades.oven){rr(372,221,65,44,5,'#3d5148');el(404,241,23,14,'#202f2c');el(404,240,18,10,s.kitchen.job?'#e8b759':'#b89e6d');food('special',405,237,.55);}
  else{rr(374,222,64,38,5,'#c29159');line(387,224,407,248,'#f6e3bd',4);line(406,247,414,254,'#5c6e5a',4);leaf(424,233,.55,.5);}
  rr(300,276,63,31,5,'#524a3c');rr(306,282,51,18,3,s.kitchen.job?'#d49443':'#8b7f60');
  for(let i=0;i<(s.upgrades.oven?3:2);i++){el(389+i*19,284,5,5,'#d5c49b');line(389+i*19,281,389+i*19,284,'#6b6552',2);}
  text(s.upgrades.oven?'BẾP ĐÔI':'BẾP NHÀ',400,303,9,'#ffedc0');
  for(let i=0;i<Math.min(4,s.kitchen.output.length);i++)food(s.kitchen.output[i],310+i*32,262,.65);
  badge('BẾP BÁNH MÌ',372,185,140);
  if(s.kitchen.job){rr(294,326,155,8,4,'#c2b99c');rr(294,326,155*(1-s.kitchen.job.left/s.kitchen.job.total),8,4,'#5d9475');}
  text(`🥬 ${s.kitchen.input}   •   ${s.kitchen.output.length} bánh sẵn`,370,346,11,'#657c60');
  if(s.kitchen.job)for(let i=0;i<4;i++){const p=(t*.7+i*.23)%1;ctx.globalAlpha=(1-p)*.5;line(319+i*24+Math.sin(p*8)*4,208-p*37,323+i*24+Math.sin(p*8)*4,199-p*37,'#fffbed',3);ctx.globalAlpha=1;}
}
function sale(s,t) {
  counterBase(78,559,207,72,'#38836e','#245c4e');
  rr(94,577,175,32,5,hasPrize(s,'home','h-first')?'#835238':'#276351','#d7b36b',hasPrize(s,'home','h-first')?3:1);text(hasPrize(s,'home','h-first')?'BÁNH MÌ ĐẦU PHỐ':'BÁNH MÌ NHÀ MÌNH',182,590,14,'#ffedbb',900);text('20k · ĐẶC BIỆT 30k VNĐ',182,604,9,'#e1dba9');
  rr(85,508,193,60,5,'#c3dfd54d','#6f9e91',2);line(92,511,92,561,'#88b7aa',2);line(271,511,271,561,'#88b7aa',2);line(93,514,144,514,'#ffffff85',2);
  rr(85,536,193,32,5,'#cfe1d4','#658b70',1.5);rr(90,539,183,23,4,'#e9eace');
  const total=s.stock.banh+s.stock.special;
  for(let i=0;i<Math.min(total,8);i++)food(i<s.stock.special?'special':'banh',107+(i%4)*49,542+Math.floor(i/4)*11,.8);
  line(101,526,114,514,'#ffffff80',2);line(122,529,137,514,'#ffffff40',3);
  for(const wx of [109,255]){el(wx,640,10,10,'#3f5147');el(wx,640,5,5,'#aeb5a0');}
  rr(242,533,29,26,4,'#48635a');rr(246,536,21,12,2,'#d0d8ac');text('₫',256,542,10,'#3f624e');
  badge(`${total}/${s.upgrades.capacity?18:10} bánh`,181,636,96,'#f3eedc');
  if(s.till){for(let i=0;i<3;i++){el(275+i*4,623-i*3,9,4,'#eab34e');el(275+i*4,620-i*3,9,4,'#f7d079');}badge('+'+compactVnd(s.till,getLanguage()),302,648,73,'#fff0b8');}
}
function tea(s,t) {
  if(!s.upgrades.tea){
    rr(373,548,157,85,10,'#ded9c2','#afa88d',2);ctx.setLineDash([6,6]);rr(378,553,147,75,7,null,'#bbb393',2);ctx.setLineDash([]);
    rr(416,572,63,23,5,'#c3b99b');text('SẮP MỞ',448,584,12,'#f8f0d7');
    text('TRÀ TẮC',451,611,11,'#9b977c');plant(507,553,.57);badge('200.000đ để mở',451,643,115,'#e8e3ce');return;
  }
  counterBase(373,553,157,78,'#d2a64f','#a77c36');
  rr(388,563,128,36,5,'#f4d685','#bb9347');text('TRÀ TẮC',452,579,17,'#5a7545',900);text(s.owner.ice.freshLeft>0?'ĐÁ MÁT · 18.000đ/LY':'TRÀ TẮC · 15.000đ/LY',452,596,8,'#7f864b');
  rr(382,507,51,46,6,'#749b77','#4d795d',2);rr(387,510,41,35,4,'#eac66d');rr(387,511,41,12,4,'#f9e0a3');el(407,510,26,6,'#cfdfb9');line(409,542,409,555,'#476e59',3);
  for(let i=0;i<Math.min(s.stock.tea,6);i++)food('tea',444+(i%3)*28,536-Math.floor(i/3)*17,.7);
  food('ice',510,545,.62);el(513,526,8,6,'#8aa84e');el(514,524,5,4,'#cdd676');if(s.owner.ice.freshLeft>0){text('✧',477,510+Math.sin(t*3)*3,18,'#8cc4c6');}
  if(s.upgrades.teaAuto){rr(380,491,57,16,5,'#3f6c5a','#90b69a',1.5);text('AUTO',408,500,8,'#ffe6a6');el(429,500,3,3,Math.sin(t*4)>0?'#f4d275':'#9aba86');line(435,510,439,519+Math.sin(t*5)*2,'#b8d3a1',3);}
  badge(`${s.stock.tea}/${s.upgrades.capacity?18:10} ly`,451,636,87,'#fff0c5');
}
function actor(a,t,isWorker=false,customer=false,cart=false) {
  const pose=animation.sample(a,t,frameDelta),palette=['#d07c5e','#6f8f9c','#ba944b','#9b85a3','#b16c79','#6c926e','#a1a388','#547973'];
  const outfit=!customer&&!isWorker?sceneState.places.outfit:'chef';
  const festive=customer&&a.party!=null&&sceneState.dining.event.active&&sceneState.dining.event.festival;
  const shirt=festive?(a.seat%2?'#c39b45':'#b95a4a'):outfit==='baba'?'#855642':outfit==='festival'?'#b9493d':customer?(a.courier?'#ce8555':palette[a.look%8]):isWorker?(a.name==='AN'?'#668e9e':a.name==='MAI'?'#9984a0':'#d18465'):'#32796a';
  const role=isWorker?(a.name==='AN'?'an':a.name==='MAI'?'mai':'linh'):'owner',trained=!customer&&sceneState?.career?Object.values(sceneState.career.roles[role].levels).reduce((n,v)=>n+v,0):0;
  const skin='#e9b78e',pants='#344f4d',shoe=trained?'#b89448':isWorker&&cart?'#cba66a':'#514b3b';
  ctx.save();ctx.translate(a.x,a.y);if(a.seated)ctx.translate(0,16);el(0,2,16,6,'#3d52352c');
  // Soft short cutout legs. The whole limb swings; there is no joint solver.
  for(const f of (a.seated?[]:[pose.left,pose.right]).sort((a,b)=>a.y-b.y)){
    line(f.hipX,f.hipY,f.x,f.y-1,pants,7.5);
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.roll);rr(-4.2,-2,8.4,4.6,2.3,shoe);line(-2.4,-.6,2,-.6,'#ffffff24',.8);ctx.restore();
  }
  ctx.translate(pose.sway,pose.bob);ctx.rotate(pose.tilt);ctx.save();ctx.scale(pose.bodyWidth*pose.squashX,pose.squashY);
  const carrying=a.bag&&count(a.bag)>0||a.holding||a.parcel;
  function arm(side){
    if(a.seated){const eating=a.phase==='eat',wave=eating?(Math.sin(t*4+a.id)*.5+.5):a.kind==='hurry'?Math.sin(t*3)*.3:0;const hx=side*13,hy=eating?-19-wave*10:-12;line(side*11,-25,hx,hy,shirt,7.5);el(hx,hy,3.6,3.6,skin);if(eating&&side>0){line(hx,hy,hx-4,hy-9,'#8c633b',1.5);line(hx+3,hy,hx-1,hy-9,'#8c633b',1.5);}return;}
    if(carrying&&(!cart||side>0)){const hx=cart?14:side*18,hy=-14-pose.reach*.4;line(side*11,-25,hx,hy,shirt,7.5);el(hx,hy,3.6,3.8,skin);return;}
    ctx.save();ctx.translate(side*11,-25);ctx.rotate(carrying?side*.4:-side*pose.arm);
    line(0,0,side*1,9-pose.reach,shirt,7.5);el(side,10-pose.reach,3.6,3.8,skin);ctx.restore();
  }
  arm(-1);arm(1);
  rr(-12.5,CHIBI.shoulderY,25,19,7,shirt);
  if(!customer){rr(-9,-22,18,14,4,isWorker&&a.name==='AN'&&hasPrize(sceneState,'pho','p-team')?'#b4513b':pose.back?'#c9c6a2':'#f4dc9b');line(-6,-27,-7,-19,'#f4dc9b',2);line(6,-27,7,-19,'#f4dc9b',2);rr(-4,-16,8,4,2,'#bda873');}
  if(outfit!=='chef'){line(0,-26,0,-9,'#efcf8e',1);for(let yy=-23;yy<=-11;yy+=5)el(2,yy,.9,.9,'#f7dfaa');}if(!customer&&hasPrize(sceneState,'dining','s-clean')){rr(-10,-30,21,5,1,'#f4e8c9');for(let xx=-8;xx<12;xx+=4)line(xx,-30,xx,-25,'#665d50',1);}
  // Large face, compact torso and small feet are shared by every role.
  ctx.save();ctx.translate(pose.dx*1.2,CHIBI.headY);
  el(0,0,16,15,skin);el(-14,2,3,4,'#dea478');el(14,2,3,4,'#dea478');
  const hair=customer&&a.look%2?'#665442':'#3e4032';el(0,-7,16,10,hair);
  if(pose.back){el(0,-.5,15.5,12,hair);line(-9,8,8,8,'#ffffff0b',2);}
  else{
    el(-6+pose.dx*2,1,1.7,2.3,'#34453b');el(5+pose.dx*2,1,1.7,2.3,'#34453b');
    el(-10,6,3,1.8,'#d78e7a70');el(10,6,3,1.8,'#d78e7a70');
    ctx.beginPath();ctx.arc(pose.dx*2,6,3,.15,Math.PI-.15);ctx.strokeStyle='#a36347';ctx.lineWidth=1.3;ctx.stroke();
    if(customer&&a.phase==='wait'&&a.patience<15){line(-9,-4,-3,-2,'#8a563e',1.5);line(2,-2,8,-4,'#8a563e',1.5);}
    if(customer&&a.look>=6){rr(-12,-2,10,7,3,null,'#665d45',1.2);rr(1,-2,10,7,3,null,'#665d45',1.2);line(-2,1,1,1,'#665d45',1);}
  }
  if(!customer){
    const band=isWorker?(a.name==='AN'?'#567d89':'#d27252'):'#e8d5a8';rr(-17,-13,34,7,3,band);
    if(isWorker){ctx.beginPath();ctx.moveTo(-14,-11);ctx.lineTo(-24,-15);ctx.lineTo(-19,-4);ctx.fillStyle=band;ctx.fill();}
    else if(outfit==='baba'){rr(-17,-15,34,9,3,'#d9dfc8');for(let xx=-14;xx<15;xx+=5)line(xx,-15,xx,-7,'#42675d',1.5);}else if(outfit==='festival'){rr(-17,-15,34,8,3,'#ab3e32');text('✿',10,-12,13,'#f4c969');}else{rr(-12,-21,25,12,5,'#fff0c9');el(-5,-21,9,7,'#fff1d4');el(5,-23,10,7,'#fff1d4');}
  }
  if(festive)text('✿',12,-9,14,'#f3c559');
  if(a.courier){rr(-17,-14,34,12,7,'#467c77');line(-14,-3,14,-3,'#d3dfc2',2);}
  ctx.restore();ctx.restore();
  if(a.courier&&a.parcel){rr(-15,-23,30,20,4,'#b78950','#86643f');text('PHỐ',0,-13,8,'#f3e5b9');}
  if(a.bag&&count(a.bag)>0){
    const items=[];for(const k of ['raw','banh','special','tea','rawPho','pho','ice'])for(let i=0;i<Math.min(a.bag[k],10);i++)items.push(k);
    if(cart){line(13,-15,31,-10,'#677766',3);el(30,2,5,5,'#4a5d51');el(58,2,5,5,'#4a5d51');rr(20,-24,48,25,5,'#bb864a','#7c6745',2);for(let i=0;i<items.length;i++)food(items[i],33+(i%2)*21,-19-Math.floor(i/2)*8,.48);}
    else{ctx.save();ctx.translate(0,-pose.reach*.4);rr(-18,-18,36,12,4,!isWorker&&hasPrize(sceneState,'dining','s-hands')?'#91483e':'#b47b48');for(let i=0;i<items.length;i++)food(items[i],(i%3)*12-12,-20-Math.floor(i/3)*5.5,.45);el(-18,-14,3.6,3.6,skin);el(18,-14,3.6,3.6,skin);ctx.restore();}
  }
  if(a.holding&&!a.seated){food(a.holding,a.face*12,-20,.6);if((a.received||1)>1)food(a.holding,a.face*8,-27,.45);}
  ctx.restore();
  if(trained)text('✦'.repeat(Math.min(3,trained)),a.x,a.y-65,10,'#bd8a3b');
  if(isWorker)badge(a.name==='AN'?'AN':a.name==='MAI'?'MAI':'LINH',a.x,a.y-75,43,a.name==='AN'?'#d4e6e4':'#fae2c4');
  if(!customer&&!isWorker)el(a.x,a.y+8,4,2,'#f0bd57');
}
function customerBubble(c,t) {
  if(c.phase==='leave') {text(c.angry?'…':'♥',c.x,c.y-76,16,c.angry?'#a07a5f':'#b96750');return;}
  rr(c.x-17,c.y-87,34,28,10,'#fff8df','#c1bc9a');
  ctx.beginPath();ctx.moveTo(c.x-3,c.y-60);ctx.lineTo(c.x,c.y-55);ctx.lineTo(c.x+5,c.y-60);ctx.fillStyle='#fff8df';ctx.fill();
  food(c.type,c.x,c.y-73,.48);if((c.remaining||0)>1)text('×'+c.remaining,c.x+22,c.y-73,10,'#a57b44');
  if(c.phase==='wait'){rr(c.x-12,c.y-59,24,3,2,'#ded7b9');rr(c.x-12,c.y-59,24*Math.max(0,c.patience/48),3,2,c.patience<15?'#c68155':'#7ca17b');}
}
function background(s,t) {
  ctx.fillStyle=floorColour('#e2d8bd','#263c38');ctx.fillRect(0,0,WORLD.w,WORLD.h);
  // Pavement and shop's single, clear floor plane.
  rr(12,151,576,710,20,floorColour('#b9b49a','#506256'));rr(19,151,562,701,16,floorColour('#eadfc3','#475148'));
  ctx.save();ctx.beginPath();ctx.roundRect(20,151,560,699,16);ctx.clip();
  for(let row=0;row<15;row++)for(let col=0;col<12;col++){
    const x=20+col*48+(row%2)*24,y=155+row*48;
    rr(x,y,46,46,2,(row+col)%4===0?floorColour('#e4d6b7','#485046'):(row+col)%4===1?floorColour('#f0e5cc','#555d50'):floorColour('#eaddbf','#4d564b'));
    if((row*7+col)%11===0){el(x+10,y+14,1,1,'#cdbf9c');el(x+33,y+32,1,1,'#d2c4a3');}
  }
  // Sunny soft shadow, kept away from working zones.
  ctx.fillStyle='#a8b18c14';ctx.beginPath();ctx.moveTo(470,152);ctx.lineTo(585,152);ctx.lineTo(585,700);ctx.lineTo(530,700);ctx.closePath();ctx.fill();
  ctx.restore();
  // Rear wall, terracotta trim and custom striped awning.
  rr(12,88,576,88,12,'#baad89');rr(19,89,562,76,8,'#f1dbac');
  for(let i=0;i<14;i++){rr(18+i*40,84,40,32,[0,0,8,8],i%2?'#f7e9bf':hasPrize(s,'home','h-busy')?'#b15a45':'#4c8168');rr(18+i*40,81,40,9,1,i%2?'#fff2cc':'#6a9879');}
  rr(148,112,305,46,8,'#215b49','#d4b169',2);text('PHỐ ẨM THỰC',300,131,25,'#ffebaf',900);text('BÁNH MÌ  •  TRÀ TẮC  •  CHUYỆN PHỐ',300,149,8,'#b7c9a0',600);
  for(const [x,name,price] of [[25,'BÁNH MÌ','20k–30k VNĐ'],[467,'TRÀ TẮC','15k VNĐ']]){rr(x,120,108,43,5,'#375b48','#a99b6e',2);text(name,x+54,132,12,'#f0e1b6');text(price,x+54,150,13,'#e8c47b');}
  // Street entrance and front edging, all on one level.
  for(let i=0;i<12;i++)rr(i*52,863,50,29,4,floorColour('#c6bda0','#536052'));
  text('HẺM 01',78,891,10,'#8a8b71',800);line(155,886,245,886,'#c8bea1',1);line(355,886,445,886,'#c8bea1',1);text('✦',300,886,17,'#ac986b');
  rr(197,792,207,35,17,'#d7d3b1');text('GÓC PHỐ CỦA RIÊNG BẠN',300,810,10,'#8d9879',800);
  plant(552,774,.85);
}
function expandedFloor(s){
  // A continuous extension of the same tiled floor, with no steps or extra level.
  rr(12,827,576,775,18,floorColour('#b9b49a','#506256'));rr(19,827,562,766,14,floorColour('#eadfc3','#475148'));
  ctx.save();ctx.beginPath();ctx.roundRect(20,827,560,764,12);ctx.clip();
  for(let row=0;row<17;row++)for(let col=0;col<12;col++){const x=20+col*48+(row%2)*24,y=827+row*48;rr(x,y,46,46,2,(row+col)%4===0?floorColour('#e4d6b7','#485046'):(row+col)%4===1?floorColour('#f0e5cc','#555d50'):floorColour('#eaddbf','#4d564b'));}
  ctx.restore();
  rr(196,792,208,35,17,'#d2ddbb');text('PHỐ CỦA BẠN · CHỌN ĐỊA CHỈ',300,810,11,'#66815d',800);
  rr(145,855,310,50,12,'#eee3c8','#c4b594',1.5);text('MỘT GÓC PHỐ MỚI',300,869,10,'#9b8056',700);text('PHỞ BÒ NHÀ MÌNH',300,889,22,'#8b533c',900);
  for(const x of [53,550]){line(x,847,x,891,'#b39967',2);el(x,899,12,16,'#ca8559');line(x,916,x,923,'#b39967',2);}
  plant(514,1480,.9);rr(372,1322,165,44,12,'#e4dbc0');text('NƯỚC TRONG · BÒ MỀM',454,1345,10,'#9e8b61');
  rr(200,1514,200,34,17,'#d4d9b6');text('PHỐ CỦA BẠN · CHỌN ĐỊA CHỈ',300,1532,10,'#7c916b',800);
  for(let i=0;i<12;i++)rr(i*52,1603,50,28,4,floorColour('#c6bda0','#536052'));text('HẺM 01 · PHỐ ĐANG LỚN',300,1636,10,'#999574');
}
function phoSupply(s,t){
  counterBase(38,968,134,86,'#789a83','#4e7664');
  rr(44,948,122,47,5,'#dbe5ce','#7f9d80',1.5);rr(49,953,55,33,3,'#f7ecd2');
  for(let i=0;i<5;i++){rr(54,957+i*5,43,3,1,'#fff6dd');line(60+i*7,954,59+i*7,982,'#d9c9a6',1);}
  rr(108,953,53,32,3,'#ba8370');for(let i=0;i<4;i++){line(115,959+i*6,151,959+i*6,'#e3b299',3);}
  leaf(156,950,.6,.7);food('rawPho',75,1020,.6);text('THỊT · BÁNH PHỞ',126,1024,8,'#f7edce');
  badge('NGUYÊN LIỆU PHỞ',105,923,154);badge(`${s.phoSupply}/16`,105,1063,65,'#e6ebd7');
}
function pot(x,y,t,active,gold=false){
  el(x,y+31,32,10,'#50625422');rr(x-27,y-3,54,33,7,gold?'#b99d63':'#819b8a','#4c7162',2);el(x,y-2,28,13,'#d3dfcb');el(x,y-3,23,10,'#ad7b47');
  line(x-32,y+3,x-27,y+3,'#466956',4);line(x+27,y+3,x+32,y+3,'#466956',4);line(x-19,y+21,x+19,y+21,gold?'#ddc693':'#afc7b2',2);
  if(active){for(let i=0;i<4;i++){const p=(t*.65+i*.23)%1;ctx.globalAlpha=(1-p)*.65;line(x-17+i*12+Math.sin(p*7)*4,y-17-p*33,x-13+i*12+Math.sin(p*7)*4,y-27-p*33,'#fff9df',3);ctx.globalAlpha=1;}el(x,y+32,19+Math.sin(t*12)*2,4,'#e5aa49');}
}
function phoKitchen(s,t){
  counterBase(285,956,172,98,s.upgrades.phoBoiler?'#b2784c':'#638777',s.upgrades.phoBoiler?'#8e5b38':'#486c5d');rr(293,941,156,63,6,'#a8baa0','#678773',2);
  pot(s.upgrades.phoBoiler?330:347,959,t,!!s.phoKitchen.job,!!s.upgrades.phoBoiler);
  if(s.upgrades.phoBoiler)pot(413,959,t+.5,!!s.phoKitchen.job,true);else{rr(390,951,51,36,4,'#c6a77a');leaf(423,958,.55,.5);line(398,952,415,975,'#fff2cc',3);}
  for(let i=0;i<Math.min(4,s.phoKitchen.output.length);i++)food('pho',310+i*38,1010,.66);
  text(s.upgrades.phoBoiler?'NỒI ĐÔI':'NƯỚC DÙNG NHÀ NẤU',372,1033,9,'#f8edc9');
  badge('NỒI PHỞ BÒ',372,923,132,'#f5e6c7');
  if(s.phoKitchen.job){rr(294,1056,155,8,4,'#c5bea2');rr(294,1056,155*(1-s.phoKitchen.job.left/s.phoKitchen.job.total),8,4,'#ad7d47');}
  text(`${s.phoKitchen.input} phần chờ · ${s.phoKitchen.output.length} tô sẵn`,370,1077,11,'#657c60');
}
function phoSale(s,t){
  counterBase(78,1289,207,72,'#ad6d51','#83503c');rr(85,1265,193,32,5,'#e1ceb1','#a38761',1.5);rr(90,1268,183,22,4,'#f4e7c9');
  for(let i=0;i<Math.min(s.stock.pho,8);i++)food('pho',108+(i%4)*48,1269+Math.floor(i/4)*10,.72);
  rr(94,1307,175,32,5,'#894e37','#d3a37b',1);text('PHỞ BÒ NHÀ MÌNH',182,1321,15,'#ffe8b6',900);text('50.000đ · NINH CHẬM',182,1334,7,'#e4c49a');
  if(hasPrize(s,'pho','p-local')){for(let i=0;i<3;i++){rr(236+i*13,1248,10,16,2,i===1?'#b64835':'#a3b677');el(241+i*13,1248,5,2,'#e7cd9c');}}
  badge(`${s.stock.pho}/${s.upgrades.phoBoiler?12:6} tô phở`,181,1366,104,'#f7e4c8');
  if(s.phoTill){for(let i=0;i<3;i++){el(275+i*4,1354-i*3,9,4,'#eab34e');el(275+i*4,1351-i*3,9,4,'#f7d079');}badge('+'+compactVnd(s.phoTill,getLanguage()),303,1379,75,'#fff0b8');}
}
function diningFloor(s){
  rr(12,1560,576,1050,18,floorColour('#aca88d','#506256'));rr(19,1560,562,1041,14,floorColour('#ede3c9','#475148'));
  ctx.save();ctx.beginPath();ctx.roundRect(20,1560,560,1040,12);ctx.clip();
  for(let row=0;row<23;row++)for(let col=0;col<12;col++){const x=20+col*48+(row%2)*24,y=1560+row*48;rr(x,y,46,46,2,(row+col)%5===0?floorColour('#dfd1b4','#485046'):floorColour('#eee1c6','#555d50'));}ctx.restore();
  rr(110,1740,330,56,12,'#e0c997','#c3aa77',1);text('SÂN NHÀ · MỜI NGỒI LẠI',275,1758,18,'#615d3d',900);text('MÓN NÓNG · CHUYỆN VUI',275,1781,10,'#857b50');
  text('KHO · BẾP · PHỤC VỤ TẠI SÂN',290,1580,10,'#7d906a');
  for(const yy of [1850,2090,2330]){rr(22,yy,9,170,3,'#d5c69f');rr(570,yy,9,170,3,'#d5c69f');}
  if(s.upgrades.canopy){line(38,1805,563,1805,'#ae9464',2);for(let i=0;i<7;i++){const x=55+i*80;line(x,1805,x,1817,'#ae9464',1);el(x,1830,11,14,i%2?'#d6a152':'#bc7157');line(x,1842,x,1852,'#ac7e47',1);}}
  rr(220,2356,260,29,14,'#dad4b6');text('HẸN GẶP LẠI · CẢM ƠN BẠN',350,2370,10,'#8b906f');
}
function servicePass(s){
  counterBase(370,1610,160,48,'#6f9484','#456c5d');rr(377,1596,146,23,5,'#e6ddbc','#8e9e79');
  text('XE PHỤC VỤ',450,1606,12,'#41644e');
  const counts=['banh','tea','pho'].map(k=>s.dining.buffer[k]+(k==='banh'?s.dining.buffer.special:0));
  for(let i=0;i<3;i++){food(['banh','tea','pho'][i],396+i*47,1630,.5);text(String(counts[i]),396+i*47,1652,10,'#fff3ce');}
  for(const x of [394,510])el(x,1671,7,7,'#485e50');
}
function diningKitchen(s){
 const p=s.local.pantry;counterBase(38,1600,130,58,'#a8794e','#785436');rr(44,1587,118,24,6,'#e2c79a','#b5915e');text('KHO RIÊNG',103,1599,12,'#6a5435');
 for(let i=0;i<3;i++){food('raw',63+i*34,1630,.5);leaf(59+i*34,1626,.5,i*.2);}badge(String(p.supply)+'/20',100,1665,70,'#f6e8be');
 counterBase(200,1600,120,58,'#a75f41','#794936');rr(207,1590,106,24,5,'#6a7460');for(let i=0;i<2;i++){el(232+i*52,1626,20,11,'#514d3c');el(232+i*52,1622,16,9,'#d2bb87');}
 text('BẾP SÂN NHÀ',260,1600,11,'#fff0ce');if(p.job){food(p.job.kind,260,1620,.65);for(let i=0;i<3;i++)text('∿',242+i*15,1600-((s.elapsed*20+i*11)%26),16,'#fff7df');rr(215,1644,90,5,2,'#765b3e');rr(215,1644,90*(1-p.job.left/p.job.total),5,2,'#f4cd6a');}
 for(let i=0;i<Math.min(3,p.output.length);i++)food(p.output[i],222+i*31,1657,.46);badge(p.input+' · '+p.output.length,260,1672,73,'#f5e2bd');
 if(s.upgrades.diningPrep){rr(320,1620,50,20,3,'#a1aa88');for(let i=0;i<3;i++)line(327+i*14,1622,327+i*14,1638,'#6e8064',2);text('AUTO',347,1610,9,'#52775b');}
}
function diningTable(s,tb){const g=DINING_TABLES[tb.id],x=g.cx,y=g.cy,dirty=tb.state==='dirty';
  el(x,y+45,83,15,'#75654d25');for(const dx of [-50,50]){rr(x+dx-5,y+7,10,39,3,'#57796b');line(x+dx,y+37,x+dx+dx*.1,y+48,'#3c5f51',5);}
  rr(x-71,y-19,142,58,9,'#8b9a83','#657a66',2);rr(x-73,y-29,146,53,10,dirty?'#dfcaa5':'#f6ebcf','#c6b58c',1.5);line(x-61,y-21,x+60,y-21,'#fffae4',2);
  rr(x-17,y-15,34,22,4,'#b88655');line(x-9,y-11,x-9,y-25,'#7d6743',2);line(x-2,y-11,x-2,y-27,'#876c41',2);el(x+9,y-5,5,4,'#b45d44');
  if(dirty){for(const dx of [-40,40]){el(x+dx,y,18,8,'#b9c3b0');line(x+dx-6,y,x+dx+7,y+1,'#bb9b72',2);el(x+dx+3,y-2,3,2,'#6f8a51');}line(x-46,y+9,x-28,y+11,'#bca178',2);}
  else{let i=0;for(const k of ['banh','special','tea','pho'])for(let n=0;n<tb.delivered[k];n++){food(k,x-47+(i%3)*44,y-5+Math.floor(i/3)*13,.55);i++;}}
  if(tb.coins){el(x+55,y+15,10,5,'#d6a049');el(x+55,y+11,10,5,'#f6d172');}
  if(tb.clean>0&&dirty){const a=s.player,w=s.dining.waiter,p=w&&Math.hypot(w.x-g.point.x,w.y-g.point.y)<46?w:a;rr(x-45+Math.sin(s.elapsed*15)*26,y+2,36,10,5,'#a1c6ba');text('✧',x+28,y-7,18,'#77a592');}
  text(String(tb.id+1),x,y+30,11,'#ecf2da');
}
function diningTicket(s,tb){const g=DINING_TABLES[tb.id],focus=s.dining.focus===tb.id,tx=g.cx,ty=g.cy-160;
  rr(tx-78,ty-49,156,89,12,focus?'#fff1c9':'#f9f0db',focus?'#c59c4c':'#cfbea0',focus?2:1);
  text(translateCanvas('Bàn {n}',{n:tb.id+1})+(s.dining.assignment.includes(tb.id)&&s.dining.waiter?' · MAI':''),tx,ty-34,14,'#776347');
  if(['seating','waiting','eating','leaving'].includes(tb.state)){
    const profile=GUEST_TYPES[tb.kind];text(profile.icon+' '+translateCanvas(profile.label),tx,ty-17,13,tb.kind==='hurry'?'#ad7550':'#6b8064');
    if(tb.state==='waiting'){let i=0;for(const [k,n]of Object.entries(needs(tb)))if(n){food(k,tx-29+i*56,ty+3,.55);text('×'+n,tx-9+i*56,ty+6,13);i++;}rr(tx-49,ty+24,98,4,2,'#daceb0');rr(tx-49,ty+24,98*tb.waitLeft/tb.waitMax,4,2,tb.waitLeft<20?'#cc9066':'#7d9f7b');}
    else{text(({seating:'Đang vào chỗ',eating:'Ngon quá!',leaving:'Hẹn gặp lại'})[tb.state],tx,ty+6,14,'#66866c');}
  }else{text(tb.state==='dirty'?'✧ Cần dọn bàn':'Sẵn sàng',tx,ty-5,13,'#7d8b67');if(tb.coins)text('+'+compactVnd(tb.coins,getLanguage()),tx,ty+17,12,'#b38236');}
  // One short dialogue per table, away from faces and the central walkway.
  if(tb.state==='eating')text(tb.kind==='friends'?'Kể tiếp đi!':tb.kind==='regular'?'Vẫn ngon như mọi khi.':'Kịp giờ rồi!',g.cx,g.cy-105,11,'#6d8065');
}
function venueDecor(s,place){
 const wood=(x,y,label)=>{rr(x,y,134,38,7,'#935d3e','#e8c082',2);text(label,x+67,y+19,12,'#fff0c9');};
 if(place==='home'&&hasPrize(s,'home','h-first'))wood(40,405,'BÁNH NÓNG MỖI SÁNG');
 if(place==='home'&&hasPrize(s,'home','h-team')){rr(76,520,210,40,5,'#bbded343','#6eab99',2);line(80,524,275,524,'#eef9d9',3);}
 if(place==='home'&&hasPrize(s,'home','h-ice')){rr(505,692,35,36,5,'#7bb1b5','#3d7b83',2);text('ĐÁ',522,709,10,'#fff8d7');}
 if(place==='home'&&hasPrize(s,'home','h-busy'))for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(80+i*66,170);ctx.lineTo(110+i*66,170);ctx.lineTo(95+i*66,193);ctx.fillStyle=i%2?'#f0c56a':'#b55e48';ctx.fill();}
 if(place==='pho'&&hasPrize(s,'pho','p-open'))wood(198,933,'PHỞ BÒ · NỒI NHÀ');
 if(place==='pho'&&hasPrize(s,'pho','p-local')){rr(480,1140,65,35,5,'#a57548');for(let i=0;i<3;i++){rr(486+i*19,1124,12,20,3,i===1?'#b64835':'#b9cf85');el(492+i*19,1124,6,2,'#e6cf94');}}
 if(place==='pho'&&hasPrize(s,'pho','p-lunch')){el(62,1439,26,12,'#b78649');for(let i=0;i<6;i++)leaf(45+i*6,1424-i%2*7,.65,(i-2)*.3);}
 if(place==='dining'&&hasPrize(s,'dining','s-first'))for(let i=0;i<6;i++){const x=62+i*94;line(x,1680,x,1702,'#a87842',1);el(x,1714,13,17,i%2?'#d3a554':'#b9624b');line(x,1730,x,1739,'#bc8b48',2);}
 if(place==='dining'&&hasPrize(s,'dining','s-repute')){rr(145,1608,310,43,8,'#913f35','#e8bc65',3);text('PHỐ HIẾU KHÁCH',300,1629,19,'#ffe4a6');}
}
export class Renderer {
  constructor(canvas) {this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});this.camera=0;this.height=920;this.effects=[];this.animation=new ActorAnimator();this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.scale=r.width/600;this.height=r.height/this.scale;this.dpr=dpr;}
  event(type,e){if(this.effects.length>90)this.effects.splice(0,this.effects.length-90);if(e.x!==undefined)this.effects.push({...e,type,life:1.2,max:1.2});if(type==='upgrade')for(let i=0;i<26;i++)this.effects.push({type:'confetti',x:100+Math.random()*400,y:this.camera+100+Math.random()*450,vx:(Math.random()-.5)*80,life:2,max:2,color:i%2?'#d4aa4e':'#5b9672'});}
  render(s,dt=0){
    night=document.documentElement.dataset.theme==='dark';sceneState=s;ctx=this.context;animation=this.animation;frameDelta=dt;const venue=currentVenue(s),r=this.canvas.getBoundingClientRect();this.scale=Math.min(r.width/600,r.height/(venue.bottom-venue.top));this.height=r.height/this.scale;const h=this.height;this.offsetX=(r.width/this.scale-600)/2;this.camera=venue.top-(h-(venue.bottom-venue.top))/2;
    ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=floorColour('#d4cfb4','#263c38');ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    ctx.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.offsetX*this.dpr*this.scale,-this.camera*this.dpr*this.scale);
    ctx.save();ctx.beginPath();ctx.rect(0,venue.top,600,venue.bottom-venue.top);ctx.clip();
    const key=`${night}-${venue.id}-${!!s.upgrades.pho}-${!!s.upgrades.dining}-${!!s.upgrades.canopy}-${getLanguage()}-${Object.values(s.places.claimed).flat().join(',')}`;
    if(this.backgroundKey!==key||!this.backgroundCanvas){const b=document.createElement('canvas');b.width=600;b.height=WORLD.h;const live=ctx;ctx=b.getContext('2d');if(venue.id==='home')background(s,s.elapsed);else if(venue.id==='pho')expandedFloor(s);else diningFloor(s);venueDecor(s,venue.id);ctx=live;this.backgroundCanvas=b;this.backgroundKey=key;}
    ctx.drawImage(this.backgroundCanvas,0,0);if(venue.id==='dining'&&s.dining.event.active&&s.dining.event.festival){rr(110,1740,330,56,12,'#b14f3d','#e8c472',2);text('NGÀY HỘI PHỐ VIỆT',275,1767,18,'#ffe7ad');}
    const g=goal(s),near=n=>Math.hypot(s.player.x-STATIONS[n].x,s.player.y-STATIONS[n].y)<43;
    let highlighted=g.station;const q=s.owner.takeaway,bag=s.player.bag;if(q.active)highlighted=bag.banh+bag.special<q.recipe.bread?'sale':bag.tea<q.recipe.tea?'tea':bag.pho<q.recipe.pho?'phoSale':q.venue==='pho'?'office':'pickup';if(s.owner.ice.active)highlighted=bag.ice?'tea':'supply';
    const o=s.career.office,w=s.career.welcome,points=new Set();if(jobHere(s,o))points.add(officeStation(s));if(jobHere(s,w)&&w.stage<2)points.add(welcomeStation(s));if(jobHere(s,q))points.add(parcelStation(s));
    for(const [name,p] of Object.entries(STATIONS)){
     if(stationVenue(name)!==venue.id)continue;
     if(['office','invite','pickup','phoDoor','diningPickup','diningDoor'].includes(name)&&!points.has(name))continue;
     if(p.area==='dining'&&(!s.upgrades.dining||p.requires&&!s.upgrades[p.requires]))continue;if(name==='tea'&&!s.upgrades.tea||name.startsWith('pho')&&!s.upgrades.pho)continue;
     const icon=name.startsWith('table')?(s.dining.tables[Number(name.slice(5))].state==='dirty'?'✧':'🍽'):name.toLowerCase().includes('supply')?'↓':name.toLowerCase().includes('kitchen')?'♨':name.toLowerCase().includes('sale')?'↑':name==='tea'?'＋':'▤';
     ring(p.x,p.y,near(name),icon,s.elapsed,false);if(points.has(name))badge(p.label,p.x,p.y-32,112,'#f7e6bf');
    }
    const draws=[{y:789,draw:()=>plasticChair(44,774)},{y:324,draw:()=>supply(s,s.elapsed)},{y:324,draw:()=>kitchen(s,s.elapsed)},{y:631,draw:()=>sale(s,s.elapsed)},{y:631,draw:()=>tea(s,s.elapsed)},...s.customers.map(c=>({y:c.y,draw:()=>actor(c,s.elapsed,false,true)})),{y:s.player.y,draw:()=>actor(s.player,s.elapsed,false,false,s.upgrades.capacity)}];
    if(s.owner.courier)draws.push({y:s.owner.courier.y,draw:()=>{actor(s.owner.courier,s.elapsed,false,true,false);if(s.owner.takeaway.active)badge('MANG ĐI',s.owner.courier.x,s.owner.courier.y-78,76,'#eadab6');}});
    if(s.worker)draws.push({y:s.worker.y,draw:()=>actor(s.worker,s.elapsed,true,false,s.upgrades.efficiency)});
    if(s.upgrades.pho)draws.push({y:1054,draw:()=>phoSupply(s,s.elapsed)},{y:1054,draw:()=>phoKitchen(s,s.elapsed)},{y:1361,draw:()=>phoSale(s,s.elapsed)});
    if(s.worker2)draws.push({y:s.worker2.y,draw:()=>actor(s.worker2,s.elapsed,true,false,false)});
    if(venue.id==='dining'&&s.upgrades.dining){
      draws.push({y:1658,draw:()=>servicePass(s)},{y:1658,draw:()=>diningKitchen(s)});
      for(const tb of activeTables(s)){const g=DINING_TABLES[tb.id];for(const seat of g.seats)draws.push({y:seat.y-18,draw:()=>plasticChair(seat.x,seat.y-8)});draws.push({y:g.cy+44,draw:()=>diningTable(s,tb)});}
      for(const guest of s.dining.guests)draws.push({y:guest.y,draw:()=>actor(guest,s.elapsed,false,true)});
      if(s.dining.waiter)draws.push({y:s.dining.waiter.y,draw:()=>actor(s.dining.waiter,s.elapsed,true,false,!!s.upgrades.serviceCart)});
    }
    if(venue.id==='dining'&&s.upgrades.dining)for(const tb of activeTables(s)){const g=DINING_TABLES[tb.id];if(g.cy>this.camera-140&&g.cy<this.camera+h+140)diningTicket(s,tb);}
    draws.sort((a,b)=>a.y-b.y).forEach(d=>{if(d.y>this.camera-100&&d.y<this.camera+h+150)d.draw();});
    s.customers.filter(c=>c.y>this.camera-30&&c.y<this.camera+h+100).forEach(c=>customerBubble(c,s.elapsed));
    for(const e of this.effects){e.life-=dt;const p=1-e.life/e.max;ctx.globalAlpha=Math.max(0,Math.min(1,e.life*3));
      if(e.type==='money'||e.type==='sold'){text('+'+compactVnd(e.amount,getLanguage()),e.x,e.y-p*48,19,e.type==='money'?'#976b21':'#397753',900);el(e.x-24,e.y-p*48,7,7,'#e6b44f');text('₫',e.x-24,e.y-p*48,9,'#856029');}
      else if(e.type==='confetti'){rr(e.x+e.vx*p,e.y+p*100,5,9,1,e.color);}
      else if(e.type==='pickup'){food(e.kind,e.x+23,e.y-48-p*24,.48);}
      else if(e.type==='clean'){text('✧',e.x,e.y-p*32,25,'#6e9c89');}
      else if(e.type==='cooked'){text('✦',e.x+30,e.y-25-p*18,24,'#e3b453');}
      else if(e.type==='tea'){text('✦',e.x,e.y-p*25,21,'#5a9a71');}
      ctx.globalAlpha=1;
    }this.effects=this.effects.filter(e=>e.life>0);
    if(!s.upgrades.worker&&s.sold>=5){text('THÊM BẠN ĐỒNG HÀNH, THÊM NIỀM VUI',300,749,9,'#a69c7d',600);}
    ctx.restore();
  }
}

export function drawOutfitPreview(canvas,state,outfit){const old={ctx,sceneState,animation,frameDelta};try{ctx=canvas.getContext('2d');sceneState={...state,places:{...state.places,outfit}};animation=new ActorAnimator();frameDelta=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/88,canvas.height/96);actor({x:44,y:80,step:0,face:1,action:0,moving:false,bag:{raw:0,banh:0,special:0,tea:0,rawPho:0,pho:0,ice:0}},0);ctx.restore();}finally{ctx=old.ctx;sceneState=old.sceneState;animation=old.animation;frameDelta=old.frameDelta;}}

export function drawFoodPreview(canvas,state,kind){const previous={ctx,sceneState};try{ctx=canvas.getContext('2d');sceneState=state;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/160,canvas.height/110);el(80,89,54,10,'#b9c9a044');food(kind,80,kind==='tea'?66:65,kind==='tea'?2.7:2);if(kind==='pho'){for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(65+i*28,31);ctx.bezierCurveTo(53+i*28,24,78+i*28,19,67+i*28,11);ctx.strokeStyle='#f9f3d0bb';ctx.lineWidth=2;ctx.stroke();}}ctx.restore();}finally{ctx=previous.ctx;sceneState=previous.sceneState;}}
