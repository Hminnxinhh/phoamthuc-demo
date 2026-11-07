import { freshState, tick, buy, goal, UPGRADES, STATIONS, count, encode, decode, findPath } from './model.js';
import { Renderer } from './render.js';
import { platform } from './platform.js';
const $ = id => document.getElementById(id), KEY = 'pho-am-thuc.save.v1';
let state = freshState(), storageOK = true;
try { const raw = localStorage.getItem(KEY); if (raw) {const saved=decode(raw); if(saved)state=saved;else $('save-status').textContent='Bản lưu cũ không hợp lệ · Bắt đầu ngày mới';} } catch { storageOK=false; }
const renderer = new Renderer($('game'));
let paused = false, lastTime = performance.now(), saveTimer = 0, hudTimer = 0, toastTimer, currentOverlay = null, pointer = null, soundEnabled = false, audio;
const keys = new Set(), input = { x: 0, y: 0 };
let previousGoal = goal(state).text;
function toast(message) { $('toast').textContent=message; $('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3000); }
function tone(freq=600,length=.08) {if(!soundEnabled||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.7,audio.currentTime+length);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{/* Audio is optional. */}}
function save(){try{localStorage.setItem(KEY,encode(state));storageOK=true;}catch{storageOK=false;}$('save-status').textContent=storageOK?'Đã lưu trên thiết bị · Mốc 1':'Không thể lưu · Kiểm tra dung lượng / chế độ riêng tư';}
function event(type,e){renderer.event(type,e);if(type==='money')tone(870,.16);if(type==='pickup')tone(420,.035);if(type==='upgrade'){toast(`✦ ${e.text} đã sẵn sàng!`);tone(1100,.25);platform.onMilestone(e.id);save();}if(type==='rush'){toast(e.text);tone(740,.3);}if(type==='finish'){state.finishSeen=true;save();showFinish();}}
function clearInput(){keys.clear();pointer=null;input.x=0;input.y=0;$('joystick').hidden=true;}
function open(id){clearInput();paused=true;currentOverlay=id;$(id).hidden=false;platform.onGameplayStop();if(id==='shop-panel')renderShop();}
function close(){if(currentOverlay)$(currentOverlay).hidden=true;currentOverlay=null;paused=false;lastTime=performance.now();if(state.started)platform.onGameplayStart();$('game').focus({preventScroll:true});}
function renderShop(){
  $('upgrades').replaceChildren();
  for(const u of UPGRADES){const row=document.createElement('article');row.className='upgrade';const owned=state.upgrades[u.id],locked=u.requires&&!state.upgrades[u.requires];
    row.innerHTML=`<span class="upgrade-icon">${u.icon}</span><div><h3>${u.name}</h3><p>${u.description}</p></div>`;
    if(owned){const done=document.createElement('span');done.className='purchased';done.textContent='✓ Đã có';row.append(done);}
    else{const b=document.createElement('button');b.className='primary';b.dataset.buy=u.id;b.disabled=state.money<u.cost||!!locked;b.textContent=locked?'Cần Linh':`${u.cost} xu`;b.addEventListener('click',()=>{if(buy(state,u.id,event)){renderShop();updateHUD();}});row.append(b);}
    $('upgrades').append(row);
  }
}
function updateHUD(){
  $('money').textContent=state.money.toLocaleString('vi-VN');
  const g=goal(state);$('goal').textContent=g.text;$('goal-count').textContent=g.max===1?'✓':`${Math.floor(Math.min(g.value,g.max))}/${g.max}`;$('goal-progress').style.width=`${Math.min(100,g.value/g.max*100)}%`;
  $('chapter').textContent=state.finished?'NGÀY 01 · PHỐ MÌNH LÊN ĐÈN':state.rushStarted&&state.rushLeft>0?'NGÀY 01 · GIỜ CAO ĐIỂM':'NGÀY 01 · KHAI TRƯƠNG';
  if(previousGoal!==g.text){previousGoal=g.text;if(state.started&&!state.finished)toast(`Mục tiêu mới: ${g.text}`);}
  $('capacity').textContent=`${count(state.player.bag)}/${state.upgrades.capacity?7:4}`;
  const b=state.player.bag,parts=[];if(b.raw)parts.push(`${b.raw} nguyên liệu`);if(b.banh)parts.push(`${b.banh} bánh`);if(b.special)parts.push(`${b.special} đặc biệt`);if(b.tea)parts.push(`${b.tea} trà`);$('bag').textContent=parts.length?parts.join(' · '):'Tay trống';
  $('shop-dot').style.display=UPGRADES.some(u=>!state.upgrades[u.id]&&state.money>=u.cost&&(!u.requires||state.upgrades[u.requires]))?'block':'none';
  $('rush').hidden=!(state.rushStarted&&state.rushLeft>0);$('rush-time').textContent=`${Math.ceil(state.rushLeft)}s`;
  const near=Object.entries(STATIONS).find(([,p])=>Math.hypot(state.player.x-p.x,state.player.y-p.y)<43)?.[0];
  let hint=state.elapsed<9?'Kéo trên sàn để đi · Đứng gần trạm để làm':b.raw?'Mang nguyên liệu tới bếp bánh mì':b.banh+b.special?'Mang bánh đến quầy xanh để bày bán':state.till>0?'Ghé quầy bánh mì hoặc trà để thu tiền':'Lấy nguyên liệu → Bếp → Quầy bán';
  if(near==='supply')hint=count(b)>=(state.upgrades.capacity?7:4)?'Đầy tay rồi! Mang nguyên liệu tới bếp':b.banh+b.special?'Mang bánh ra quầy trước nhé':'Đang lấy nguyên liệu tươi…';
  if(near==='kitchen')hint=b.raw?'Đang giao nguyên liệu…':count(b)>=(state.upgrades.capacity?7:4)?'Đầy tay rồi! Bày bánh ở quầy xanh':state.kitchen.job?'Bếp đang nướng · Bánh chín tự lên tay':state.kitchen.output.length?'Đang lấy bánh nóng…':'Bếp cần thêm nguyên liệu';
  if(near==='sale')hint=b.banh+b.special?'Đang bày bánh · Khách tự mua':'Khách tự mua · Ghé đây để thu tiền';
  if(near==='tea')hint=state.upgrades.tea?(state.stock.tea>= (state.upgrades.capacity?18:10)?'Quầy trà đã đầy · Cùng làm bánh nào':'Đang pha trà tắc mát lạnh…'):'Mở quầy trà trong mục Phát triển';
  $('station-hint').textContent=hint;
}
function showFinish(){ $('finish-stats').innerHTML=`<span><strong>${state.revenue}</strong>xu doanh thu</span><span><strong>${state.served}</strong>khách vui</span><span><strong>${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}</strong>thời gian</span>`;open('finish');}
$('start').addEventListener('click',()=>{state.started=true;$('welcome').hidden=true;close();save();tone();});
$('welcome').hidden=state.started;if(!state.started){paused=true;currentOverlay='welcome';}
$('shop').addEventListener('click',()=>open('shop-panel'));
$('help').addEventListener('click',()=>open('help-panel'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));
$('continue').addEventListener('click',close);
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;if(soundEnabled){audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();tone();}$('sound').querySelector('span').hidden=soundEnabled;$('sound').setAttribute('aria-label',soundEnabled?'Tắt âm thanh':'Bật âm thanh');});
$('reset').addEventListener('click',()=>{if(!confirm('Xóa tiến độ trên thiết bị này và bắt đầu lại?'))return;state=freshState();save();close();open('welcome');updateHUD();});
$('game').addEventListener('pointerdown',e=>{if(paused||!state.started||pointer)return;e.preventDefault();$('game').setPointerCapture(e.pointerId);const r=$('scene-wrap').getBoundingClientRect();pointer={id:e.pointerId,x:e.clientX,y:e.clientY};$('joystick').hidden=false;$('joystick').style.left=`${e.clientX-r.left}px`;$('joystick').style.top=`${e.clientY-r.top}px`;$('stick').style.transform='translate(0,0)';});
$('game').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y,d=Math.hypot(dx,dy),max=40;input.x=dx/Math.max(max,d);input.y=dy/Math.max(max,d);$('stick').style.transform=`translate(${input.x*26}px,${input.y*26}px)`;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(name,e=>{if(pointer?.id===e.pointerId)clearInput();});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();if(!paused)keys.add(e.key.toLowerCase());}if(e.key==='Escape'&&currentOverlay&&state.started)close();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{clearInput();save();});
document.addEventListener('visibilitychange',()=>{clearInput();lastTime=performance.now();if(document.hidden){save();platform.onGameplayStop();}else if(!paused)platform.onGameplayStart();});
window.addEventListener('pagehide',save);
new ResizeObserver(()=>{renderer.resize();renderer.render(state);}).observe($('scene-wrap'));
function step(dt){let i=input;if(!pointer)i={x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)};tick(state,dt,i,event);saveTimer+=dt;hudTimer+=dt;if(saveTimer>2){save();saveTimer=0;}if(hudTimer>.1){updateHUD();hudTimer=0;}}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-lastTime)/1000));lastTime=now;if(!paused&&!document.hidden)step(dt);renderer.render(state,paused?0:dt);requestAnimationFrame(frame);}
updateHUD();requestAnimationFrame(frame);
// Opt-in deterministic harness, absent from normal game URLs. Tests still use the live production model.
if(new URLSearchParams(location.search).get('test')==='1')window.__game={snapshot:()=>JSON.parse(JSON.stringify(state)),path:target=>findPath(state.player,STATIONS[target]),advance:(seconds,vector={x:0,y:0})=>{for(let t=0;t<seconds;t+=1/60)tick(state,Math.min(1/60,seconds-t),vector,event);updateHUD();renderer.render(state,seconds);},save,screen:(x,y)=>{const r=$('game').getBoundingClientRect();return{x:r.left+x*renderer.scale,y:r.top+(y-renderer.camera)*renderer.scale};}};
