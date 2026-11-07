import { WORLD, STATIONS, count, goal } from './model.js';
const C = { ink: '#284f43', teal: '#337b69', dark: '#1c5144', cream: '#fff2cf', gold: '#efba58', wood: '#b97b46' };
let ctx;
function rr(x,y,w,h,r,fill,stroke,line=1) { ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();} }
function el(x,y,rx,ry,fill) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill(); }
function line(x,y,x2,y2,color,width=2) { ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke(); }
function text(t,x,y,size=14,color=C.ink,weight=700,align='center') { ctx.font=`${weight} ${size}px "Trebuchet MS", system-ui, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(t,x,y); }
function leaf(x,y,scale=1,angle=0) {ctx.save();ctx.translate(x,y);ctx.rotate(angle);el(0,0,7*scale,15*scale,'#568d59');line(0,-9*scale,0,10*scale,'#84ae6b',1.4);ctx.restore();}
function plant(x,y,scale=1) {ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);el(0,10,25,9,'#61554220');rr(-17,-14,34,30,5,'#bb7554');rr(-20,-16,40,9,3,'#d89168');for(let i=0;i<7;i++){const a=(i-3)*.33;line(0,-14,Math.sin(a)*25,-40-Math.cos(a)*8,'#54835b',3);leaf(Math.sin(a)*26,-43-Math.cos(a)*8,.75,a);}ctx.restore();}
export function food(kind,x,y,scale=1,angle=0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
  if(kind==='tea') {rr(-9,-14,18,26,4,'#f4ce70','#c09846',1.5);rr(-7,-10,14,16,3,'#dba03e');el(0,-13,10,4,'#fff1bd');line(4,-24,2,-8,'#367a62',2.5);for(let i=0;i<3;i++)rr(-5+i*4,-8+(i%2)*5,4,4,1,'#ffeab99c');el(7,-9,5,5,'#63904c');el(7,-9,3,3,'#c4d564');}
  else if(kind==='raw') {rr(-15,-9,30,23,3,'#bd8953','#8c6543');for(let i=-1;i<2;i++){leaf(i*9,-7,.6,i*.45);el(i*8,-3,5,5,i===0?'#d76442':'#e6a349');}line(-13,4,13,4,'#e3bb7a',2);}
  else {el(0,5,23,9,'#98542830');ctx.rotate(-.18);rr(-24,-11,48,23,11,'#ca8238','#a9662e');rr(-23,-8,46,10,6,'#6c9348');for(let i=0;i<4;i++){el(-15+i*10,-3,5,4,'#e76d3f');}rr(-24,-14,48,13,8,kind==='special'?'#e7a64a':'#edb65f','#d59848');for(let i=-1;i<2;i++)line(i*12-3,-12,i*12+1,-6,'#ffe0a0',3);if(kind==='special'){line(15,-20,15,-10,'#a67c36',1.5);rr(15,-23,11,7,1,'#cb6246');}}
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
  food('raw',71,290,.6);text('TƯƠI MỖI NGÀY',127,289,8,'#fff0bf');
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
  rr(94,577,175,32,5,'#276351','#76a284',1);text('BÁNH MÌ NHÀ MÌNH',182,590,14,'#ffedbb',900);text('NÓNG GIÒN · THƠM PHỨC',182,603,7,'#b9d3ac');
  rr(85,536,193,32,5,'#cfe1d4','#658b70',1.5);rr(90,539,183,23,4,'#e9eace');
  const total=s.stock.banh+s.stock.special;
  for(let i=0;i<Math.min(total,8);i++)food(i<s.stock.special?'special':'banh',107+(i%4)*49,542+Math.floor(i/4)*11,.8);
  rr(242,533,29,26,4,'#48635a');rr(246,536,21,12,2,'#d0d8ac');text('₫',256,542,10,'#3f624e');
  badge(`${total}/${s.upgrades.capacity?18:10} bánh`,181,636,96,'#f3eedc');
  if(s.till){for(let i=0;i<3;i++){el(275+i*4,623-i*3,9,4,'#eab34e');el(275+i*4,620-i*3,9,4,'#f7d079');}badge(`+${s.till} xu`,302,648,73,'#fff0b8');}
}
function tea(s,t) {
  if(!s.upgrades.tea){
    rr(373,548,157,85,10,'#ded9c2','#afa88d',2);ctx.setLineDash([6,6]);rr(378,553,147,75,7,null,'#bbb393',2);ctx.setLineDash([]);
    rr(416,572,63,23,5,'#c3b99b');text('SẮP MỞ',448,584,12,'#f8f0d7');
    text('TRÀ TẮC',451,611,11,'#9b977c');plant(507,553,.57);badge('100 xu để mở',451,643,115,'#e8e3ce');return;
  }
  counterBase(373,553,157,78,'#d2a64f','#a77c36');
  rr(388,563,128,36,5,'#f4d685','#bb9347');text('TRÀ TẮC',452,579,17,'#5a7545',900);text('MÁT LÀNH MỖI NGÀY',452,593,7,'#7f864b');
  rr(382,507,51,46,6,'#749b77','#4d795d',2);rr(387,510,41,35,4,'#eac66d');rr(387,511,41,12,4,'#f9e0a3');el(407,510,26,6,'#cfdfb9');line(409,542,409,555,'#476e59',3);
  for(let i=0;i<Math.min(s.stock.tea,6);i++)food('tea',444+(i%3)*28,536-Math.floor(i/3)*17,.7);
  el(511,535,10,8,'#8aa84e');el(512,533,6,5,'#cdd676');
  badge(`${s.stock.tea}/${s.upgrades.capacity?18:10} ly`,451,636,87,'#fff0c5');
}
function actor(a,t,isWorker=false,customer=false,cart=false) {
  const x=a.x,y=a.y,bob=a.moving?Math.sin(a.step*2)*1.6:Math.sin(t*2)*.5;
  const swing=a.moving?Math.sin(a.step)*8:0;
  const palette=['#d07c5e','#6f8f9c','#ba944b','#9b85a3','#b16c79','#6c926e'];
  const shirt=customer?palette[a.look%6]:isWorker?'#d18465':'#32796a';
  ctx.save();ctx.translate(x,y);el(0,1,17,7,'#3d523529');ctx.translate(0,bob);
  // Independently articulated shoes, legs, arms, torso, head, apron and carried goods.
  line(-7,-13,-8+swing*.45,-2+swing*.5,'#314d4b',8);line(7,-13,8-swing*.45,-2-swing*.5,'#314d4b',8);
  rr(-14+swing*.45,-3+swing*.5,13,6,3,isWorker&&cart?'#d6bd7c':'#514b3b');rr(2-swing*.45,-3-swing*.5,13,6,3,isWorker&&cart?'#d6bd7c':'#514b3b');
  const carrying=a.bag&&count(a.bag)>0||a.holding;
  ctx.save();ctx.translate(-13,-30);ctx.rotate((carrying?-.6:swing*.045));rr(-4,0,8,21,4,shirt);el(0,21,4,4,'#e9b68b');ctx.restore();
  ctx.save();ctx.translate(13,-30);ctx.rotate((carrying?.6:-swing*.045));rr(-4,0,8,21,4,shirt);el(0,21,4,4,'#e9b68b');ctx.restore();
  rr(-12,-34,24,25,7,shirt);if(!customer){rr(-9,-26,18,17,3,a.back?'#c9c6a2':'#f4dc9b');line(-6,-33,-7,-24,'#f4dc9b',2);line(6,-33,7,-24,'#f4dc9b',2);rr(-5,-19,10,5,2,'#bda873');}
  ctx.save();ctx.translate(a.face*2,-45);el(0,0,14,15,'#e9b78e');el(-12,2,3,4,'#dea478');el(12,2,3,4,'#dea478');
  el(0,-7,14,10,customer&&a.look%2?'#665442':'#3e4032');
  if(a.back){el(0,-1,13,11,'#3e4032');}else{el(a.face*3-5,1,1.4,1.9,'#34453b');el(a.face*3+4,1,1.4,1.9,'#34453b');el(a.face*3+6,6,3,1.7,'#da967b');line(a.face*3-1,7,a.face*3+3,7,'#ab6a50',1.2);}
  if(!customer){rr(-15,-13,30,7,3,isWorker?'#d27252':'#e8d5a8');if(isWorker){ctx.beginPath();ctx.moveTo(-12,-11);ctx.lineTo(-23,-16);ctx.lineTo(-18,-5);ctx.fillStyle='#d27252';ctx.fill();}else{rr(-10,-20,21,12,5,'#fff0c9');el(1,-22,12,6,'#fff1d4');}}
  ctx.restore();
  if(a.bag&&count(a.bag)>0){
    const items=[];for(const k of ['raw','banh','special','tea'])for(let i=0;i<a.bag[k];i++)items.push(k);
    if(cart){line(14,-19,31,-10,'#677766',3);el(30,2,5,5,'#4a5d51');el(58,2,5,5,'#4a5d51');rr(20,-24,48,25,5,'#bb864a','#7c6745',2);for(let i=0;i<items.length;i++)food(items[i],33+(i%2)*21,-19-Math.floor(i/2)*8,.48);}
    else{rr(-18,-23,36,14,4,'#b47b48');for(let i=0;i<items.length;i++)food(items[i],(i%2)*17-8,-25-Math.floor(i/2)*9,.52);el(-18,-19,4,4,'#e9b78e');el(18,-19,4,4,'#e9b78e');}
  }
  if(a.holding)food(a.holding,a.face*13,-24,.65);
  if(isWorker){text('LINH',0,-76,9,'#7b513d');if(a.moving&&cart)text('ϟ',20,0,15,'#e0b542');}
  if(!customer&&!isWorker){el(0,8,4,2,'#f0bd57');}
  ctx.restore();
}
function customerBubble(c,t) {
  if(c.phase==='leave') {text(c.angry?'…':'♥',c.x,c.y-76,16,c.angry?'#a07a5f':'#b96750');return;}
  rr(c.x-17,c.y-91,34,30,10,'#fff8df','#c1bc9a');
  ctx.beginPath();ctx.moveTo(c.x-3,c.y-62);ctx.lineTo(c.x,c.y-56);ctx.lineTo(c.x+5,c.y-62);ctx.fillStyle='#fff8df';ctx.fill();
  food(c.type,c.x,c.y-74,.48);
  if(c.phase==='wait'){rr(c.x-12,c.y-58,24,3,2,'#ded7b9');rr(c.x-12,c.y-58,24*Math.max(0,c.patience/48),3,2,c.patience<15?'#c68155':'#7ca17b');}
}
function background(s,t) {
  ctx.fillStyle='#e2d8bd';ctx.fillRect(0,0,WORLD.w,WORLD.h);
  // Pavement and shop's single, clear floor plane.
  rr(12,151,576,710,20,'#b9b49a');rr(19,151,562,701,16,'#eadfc3');
  ctx.save();ctx.beginPath();ctx.roundRect(20,151,560,699,16);ctx.clip();
  for(let row=0;row<15;row++)for(let col=0;col<12;col++){
    const x=20+col*48+(row%2)*24,y=155+row*48;
    rr(x,y,46,46,2,(row+col)%4===0?'#e4d6b7':(row+col)%4===1?'#f0e5cc':'#eaddbf');
    if((row*7+col)%11===0){el(x+10,y+14,1,1,'#cdbf9c');el(x+33,y+32,1,1,'#d2c4a3');}
  }
  // Sunny soft shadow, kept away from working zones.
  ctx.fillStyle='#a8b18c14';ctx.beginPath();ctx.moveTo(470,152);ctx.lineTo(585,152);ctx.lineTo(585,700);ctx.lineTo(530,700);ctx.closePath();ctx.fill();
  ctx.restore();
  // Rear wall, terracotta trim and custom striped awning.
  rr(12,88,576,88,12,'#baad89');rr(19,89,562,76,8,'#f1dbac');
  for(let i=0;i<14;i++){rr(18+i*40,84,40,32,[0,0,8,8],i%2?'#f7e9bf':'#4c8168');rr(18+i*40,81,40,9,1,i%2?'#fff2cc':'#6a9879');}
  rr(148,112,305,46,8,'#215b49','#d4b169',2);text('PHỐ ẨM THỰC',300,131,25,'#ffebaf',900);text('BÁNH MÌ  •  TRÀ TẮC  •  CHUYỆN PHỐ',300,149,8,'#b7c9a0',600);
  for(const x of [57,544]){line(x,112,x,134,'#9b7e46',2);el(x,143,13,17,'#d59848');line(x,161,x,170,'#bd8650',2);line(x,131,x,154,'#e9bf68',2);}
  // Street entrance and front edging, all on one level.
  for(let i=0;i<12;i++)rr(i*52,863,50,29,4,'#c6bda0');
  text('HẺM 01',78,891,10,'#8a8b71',800);line(155,886,245,886,'#c8bea1',1);line(355,886,445,886,'#c8bea1',1);text('✦',300,886,17,'#ac986b');
  rr(197,792,207,35,17,'#d7d3b1');text('GÓC PHỐ CỦA RIÊNG BẠN',300,810,10,'#8d9879',800);
  plant(44,774,.85);plant(552,774,.85);
  // Small floor arrows guide, never intercept input.
  for(const p of [[215,365],[271,365],[310,671]]){text('›',p[0],p[1],20,'#c5b68e');}
}
export class Renderer {
  constructor(canvas) {this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});this.camera=0;this.height=920;this.effects=[];this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.scale=r.width/600;this.height=r.height/this.scale;this.dpr=dpr;}
  event(type,e){if(e.x!==undefined)this.effects.push({...e,type,life:1.2,max:1.2});if(type==='upgrade')for(let i=0;i<26;i++)this.effects.push({type:'confetti',x:100+Math.random()*400,y:170+Math.random()*450,vx:(Math.random()-.5)*80,life:2,max:2,color:i%2?'#d4aa4e':'#5b9672'});}
  render(s,dt=0){
    ctx=this.context;const h=this.height;this.camera=Math.max(0,Math.min(WORLD.h-h,s.player.y-h*.56));
    if(h>=WORLD.h)this.camera=-(h-WORLD.h)/2;
    ctx.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,-this.camera*this.dpr*this.scale);
    ctx.clearRect(0,this.camera,600,h);background(s,s.elapsed);
    const g=goal(s),near=n=>Math.hypot(s.player.x-STATIONS[n].x,s.player.y-STATIONS[n].y)<43;
    for(const [name,p] of Object.entries(STATIONS)){if(name==='tea'&&!s.upgrades.tea)continue;ring(p.x,p.y,near(name),name==='supply'?'↓':name==='kitchen'?'♨':name==='sale'?'↑':'＋',s.elapsed,g.station===name);}
    const draws=[{y:324,draw:()=>supply(s,s.elapsed)},{y:324,draw:()=>kitchen(s,s.elapsed)},{y:631,draw:()=>sale(s,s.elapsed)},{y:631,draw:()=>tea(s,s.elapsed)},...s.customers.map(c=>({y:c.y,draw:()=>actor(c,s.elapsed,false,true)})),{y:s.player.y,draw:()=>actor(s.player,s.elapsed,false,false,s.upgrades.capacity)}];
    if(s.worker)draws.push({y:s.worker.y,draw:()=>actor(s.worker,s.elapsed,true,false,s.upgrades.efficiency)});
    draws.sort((a,b)=>a.y-b.y).forEach(d=>d.draw());
    s.customers.forEach(c=>customerBubble(c,s.elapsed));
    for(const e of this.effects){e.life-=dt;const p=1-e.life/e.max;ctx.globalAlpha=Math.min(1,e.life*3);
      if(e.type==='money'||e.type==='sold'){text(`+${e.amount}`,e.x,e.y-p*48,19,e.type==='money'?'#976b21':'#397753',900);el(e.x-24,e.y-p*48,7,7,'#e6b44f');text('₫',e.x-24,e.y-p*48,9,'#856029');}
      else if(e.type==='confetti'){rr(e.x+e.vx*p,e.y+p*100,5,9,1,e.color);}
      else if(e.type==='pickup'){food(e.kind,e.x+23,e.y-48-p*24,.48);}
      else if(e.type==='cooked'){text('✦',e.x+30,e.y-25-p*18,24,'#e3b453');}
      else if(e.type==='tea'){text('✦',e.x,e.y-p*25,21,'#5a9a71');}
      ctx.globalAlpha=1;
    }this.effects=this.effects.filter(e=>e.life>0);
    if(!s.upgrades.worker&&s.sold>=5){text('THÊM BẠN ĐỒNG HÀNH, THÊM NIỀM VUI',300,749,9,'#a69c7d',600);}
  }
}
