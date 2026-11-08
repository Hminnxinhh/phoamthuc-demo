import {GUEST_TYPES,activeTables,needs,selectTable,assignTable,claimDiningQuest,startDiningEvent} from './dining.js';
import {t,number,loadLanguage,setLanguage,getLanguage,localize,staticCopy} from './locale.js';
import {missionBoard} from './mission-view.js';
import {startTakeaway,startIce,nextRecipe,parcelCount} from './owner.js';
import {freshState,tick,buy,goal,UPGRADES,STATIONS,count,encode,decode,findPath} from './model.js';
import {QUESTS,startLunch,claimQuest,available,lockReason} from './growth.js';
import {loadProgress,saveProgress,backupCurrent} from './save.js';
import {dragVector} from './controls.js';
import {Renderer} from './render.js';
import {platform} from './platform.js';
const $=id=>document.getElementById(id);
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
loadLanguage(storage);const restoreStatic=staticCopy(document);restoreStatic();
const loaded=loadProgress(storage);
let state=loaded.state||freshState(),saveBlocked=!!loaded.error,paused=false,currentOverlay=null,shopTab=state.day>=3?'dining':state.day===2?'growth':'home';
let lastTime=performance.now(),saveTimer=0,hudTimer=0,toastTimer,pointer=null,soundEnabled=false,audio,manualMode=false;
const renderer=new Renderer($('game')),keys=new Set(),input={x:0,y:0};
let previousGoal=goal(state).text,missionTab='goals',trackedQuest=null,toastMessage='',importMessage='',saveLabel='Tự lưu trên thiết bị · Mốc 3B';
function toast(message){toastMessage=message;$('toast').textContent=t(message);$('toast').classList.add('visible');$('station-hint').hidden=true;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('visible');$('station-hint').hidden=false;},3300);}
function tone(freq=600,length=.08){if(!soundEnabled||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.7,audio.currentTime+length);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{/* Optional audio. */}}
function setSaveStatus(message){saveLabel=message;$('save-status').textContent=t(message);}
function save(){if(saveBlocked)return;try{saveProgress(storage,state);setSaveStatus('Đã lưu trên thiết bị · Mốc 3B');}catch{setSaveStatus('Chưa lưu được · Bản cũ được giữ nguyên · Hãy xuất bản lưu');}}
function event(type,e){
  renderer.event(type,e);
  if(type==='money')tone(870,.16);if(type==='pickup')tone(420,.035);
  if(type==='upgrade'){toast(e.id==='worker'?'Linh lo bánh · Bạn có thể nhận đơn mang đi hoặc tiếp đá trong Nhiệm vụ.':`✦ ${e.text} đã sẵn sàng!`);tone(1100,.25);platform.onMilestone(e.id);save();}
  if(['rush','day','lunchEnd','reward','owner','dining'].includes(type)){toast(e.text);tone(type==='reward'?1080:740,.2);if(type!=='rush')save();}
  if(type==='day'){shopTab='growth';previousGoal='';}
  if(type==='day2Complete'){state.day2.summarySeen=true;save();showFinish();}
}
function clearInput(){keys.clear();pointer=null;input.x=0;input.y=0;}
function open(id){clearInput();paused=true;currentOverlay=id;$(id).hidden=false;platform.onGameplayStop();if(id==='shop-panel')renderShop();if(id==='missions-panel')renderMissions();}
function close(){if(currentOverlay)$(currentOverlay).hidden=true;currentOverlay=null;paused=false;lastTime=performance.now();if(state.started)platform.onGameplayStart();$('game').focus({preventScroll:true});}
function renderShop(){
  $('tab-dining').classList.toggle('active',shopTab==='dining');$('tab-dining').setAttribute('aria-pressed',String(shopTab==='dining'));
  $('tab-home').classList.toggle('active',shopTab==='home');$('tab-growth').classList.toggle('active',shopTab==='growth');
  $('tab-home').setAttribute('aria-pressed',String(shopTab==='home'));$('tab-growth').setAttribute('aria-pressed',String(shopTab==='growth'));
  $('upgrades').replaceChildren();
  if(shopTab==='growth'&&state.day<2){const p=document.createElement('p');p.className='section-note';p.textContent='Hoàn tất ngày khai trương để mở phần sân nối liền và đón khách phở Ngày 02. Bạn có thể xem trước các cải tiến ở đây.';$('upgrades').append(p);}
  for(const u of UPGRADES.filter(u=>(u.section==='dining'?'dining':['pho','phoBoiler','worker2','teaAuto'].includes(u.id)?'growth':'home')===shopTab)){
    const row=document.createElement('article');row.className='upgrade';row.innerHTML=`<span class="upgrade-icon">${u.icon}</span><div><h3>${u.name}</h3><p>${u.description}</p></div>`;
    if(state.upgrades[u.id]){const done=document.createElement('span');done.className='purchased';done.textContent='✓ Đã có';row.append(done);}
    else{const b=document.createElement('button');b.className='primary';b.dataset.buy=u.id;b.disabled=!available(state,u);b.textContent=lockReason(state,u)||`${u.cost} xu`;b.addEventListener('click',()=>{if(buy(state,u.id,event)){renderShop();updateHUD();}});row.append(b);}
    $('upgrades').append(row);
  }
  localize($('shop-panel'));
}
function renderOwnerJobs(){
  const root=$('owner-jobs');root.replaceChildren();
  if(!state.upgrades.worker){const note=document.createElement('p');note.className='section-note';note.textContent='Khi Linh lo bánh, bạn có thể nhận đơn mang đi và tiếp đá cho quầy trà. Đây là việc tùy chọn, không thay công việc tự động của Linh.';root.append(note);localize(root);return;}
  const q=state.owner.takeaway,i=state.owner.ice,r=q.active?q.recipe:nextRecipe(state),parts=[];
  if(r.bread)parts.push(t(`${r.bread} bánh`));if(r.tea)parts.push(t(`${r.tea} trà`));if(r.pho)parts.push(t(`${r.pho} phở`));
  const title=document.createElement('p');title.className='chapter-chip';title.textContent='VIỆC CỦA CHỦ QUÁN · TÙY CHỌN';root.append(title);
  for(const job of [
    {id:'takeaway',title:'Đơn mang đi',text:`${parts.join(' + ')} · 70 giây · Thưởng 36–46 xu. Gom món ở quầy, giao tại túi giấy. Trễ không phạt, hàng vẫn trên tay. Đã giao: ${q.completed}.`,label:q.active?`Đang giao · ${Math.ceil(q.left)}s`:q.cooldown>0?`Khách hẹn lại · ${Math.ceil(q.cooldown)}s`:'Nhận đơn mang đi →',disabled:q.active||q.cooldown>0,action:()=>startTakeaway(state,event)},
    {id:'ice',title:'Tiếp đá mát lành',text:'Kho rau → Quầy trà. Một thùng đá giúp trà bán 13 xu thay vì 10 trong 50 giây. Không hạn giờ; Linh vẫn lo bánh.',label:!state.upgrades.tea?'Cần quầy trà':i.active?'Đang tiếp đá · Kho rau → Trà':i.cooldown>0?`Nghỉ tay · ${Math.ceil(i.cooldown)}s`:i.stock<=0?'Chờ xe đá ghé kho':'Nhận việc tiếp đá →',disabled:!state.upgrades.tea||i.active||i.cooldown>0||i.stock<=0,action:()=>startIce(state,event)}
  ]){const card=document.createElement('div');card.className='lunch-card owner-card';const h=document.createElement('h3');h.textContent=job.title;const p=document.createElement('p');p.textContent=job.text;const b=document.createElement('button');b.id=`start-${job.id}`;b.className='primary';b.disabled=job.disabled;b.textContent=job.label;b.addEventListener('click',()=>{if(job.action()){close();save();updateHUD();}});card.append(h,p,b);root.append(card);}
 localize(root);
}
function renderDiningBoard(){
  const root=$('dining-board');root.replaceChildren();
  const note=document.createElement('p');note.className='section-note';note.textContent=state.upgrades.dining?t('Uy tín {n} · Bàn trọn vẹn {m} · Tip {p} xu',{n:state.dining.reputation,m:state.dining.stats.parties,p:state.dining.stats.tips}):'Hoàn tất Ngày 02, mở sân ăn trong Phát triển. Đi xuống dưới sân phở để tới bàn ăn.';root.append(note);
  const last=state.dining.history.at(-1);if(last){const summary=document.createElement('p');summary.className='section-note';summary.textContent=t('Ngày {n} đã xong · {m} bàn · {p} xu. Ngày mới có mục tiêu tiếp theo.',{n:last.day,m:last.parties,p:last.revenue});root.append(summary);}
  const how=document.createElement('p');how.className='sheet-sub';how.textContent='Chọn bàn → Ghé xe phục vụ → Mang món tới bàn. Khách ăn xong mới trả tiền. Đứng gần bàn bẩn để tự lau.';root.append(how);
  if(state.upgrades.dining)for(const tb of activeTables(state)){
    const card=document.createElement('article');card.className='quest';card.dataset.table=tb.id;
    const h=document.createElement('h3');h.textContent=t('Bàn {n} · {status}',{n:tb.id+1,status:t(({empty:'Sẵn sàng',seating:'Đang vào chỗ',waiting:'Chờ món',eating:'Đang dùng bữa',leaving:'Hẹn gặp lại',dirty:'Cần dọn bàn'})[tb.state])});
    const p=document.createElement('p');p.className='table-detail';const dishes=needs(tb);p.textContent=tb.state==='waiting'?t('{kind} · Còn {n}s',{kind:t(GUEST_TYPES[tb.kind].label),n:Math.ceil(tb.waitLeft)})+' · '+Object.entries(dishes).filter(([,v])=>v).map(([k,v])=>t('{n} × {dish}',{n:v,dish:t(({banh:'bánh',special:'đặc biệt',tea:'trà',pho:'tô phở'})[k])})).join(' + '):tb.state==='dirty'?'Ghé vòng trước bàn để lau, tiền tự lên ví.':tb.state==='eating'?'Bạn có thể lo bàn khác trong lúc khách ăn.':'Bàn sạch đón lượt khách tiếp theo.';
    const actions=document.createElement('div');actions.className='table-actions';const b=document.createElement('button');b.className='primary';b.dataset.focusTable=tb.id;b.disabled=tb.state!=='waiting';b.textContent=state.dining.focus===tb.id?'✓ Ưu tiên bàn này':'Lấy món cho bàn này';b.addEventListener('click',()=>{selectTable(state,tb.id);close();save();updateHUD();});actions.append(b);
    if(state.dining.waiter){const a=document.createElement('button');a.className='track-button';a.dataset.assignTable=tb.id;a.setAttribute('aria-pressed',String(state.dining.assignment.includes(tb.id)));a.textContent=state.dining.assignment.includes(tb.id)?'✓ Mai đang phụ':'Giao Mai phụ';a.addEventListener('click',()=>{assignTable(state,tb.id);renderDiningBoard();localize(root);save();});actions.append(a);}
    card.append(h,p,actions);root.append(card);
  }
  if(!state.upgrades.dining){const b=document.createElement('button');b.className='primary';b.textContent='Mở Phát triển';b.addEventListener('click',()=>{close();shopTab='dining';open('shop-panel');});root.append(b);}
  const e=state.dining.event,nextKind=['hurry','friends','regular'][e.serial%3],target=e.active?e.target:nextKind==='regular'?4:3,box=document.createElement('article');box.className='lunch-card';const h=document.createElement('h3');h.textContent=t('Ca đặc biệt · {kind}',{kind:t(GUEST_TYPES[e.active?e.kind:nextKind].label)});const p=document.createElement('p');p.textContent=t('Khách vội, nhóm bạn rồi khách quen luân phiên. Mỗi ca 90–110 giây, đủ {n} bàn là đạt. Chưa đủ vẫn giữ toàn bộ tiền và hàng.',{n:target});const b=document.createElement('button');b.className='primary';b.id='start-dining-event';b.disabled=!state.upgrades.dining||state.dining.stats.parties<2||e.active||e.cooldown>0;b.textContent=e.active?t('Ca đang diễn ra · {n}s',{n:Math.ceil(e.left)}):e.cooldown>0?t('Nghỉ ca · {n}s',{n:Math.ceil(e.cooldown)}):'Đón ca đặc biệt →';b.addEventListener('click',()=>{if(startDiningEvent(state,event)){close();save();updateHUD();}});const result=document.createElement('p');result.textContent=t('Ca đạt {n} · Kỷ lục {m} bàn · Ca trước {p} bàn',{n:state.dining.stats.events,m:e.best,p:e.last});box.append(h,p,result,b);root.append(box);localize(root);
}
function selectMissionTab(tab){
  missionTab=['goals','jobs','lunch','dining'].includes(tab)?tab:'goals';
  for(const name of ['goals','jobs','lunch','dining']){
    const active=name===missionTab,b=$(`missions-${name}`);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;
    $(`mission-${name}`).hidden=!active;
  }
  $('mission-goals').parentElement.scrollTop=0;
}
function renderMissions(){
  renderOwnerJobs();renderDiningBoard();$('quests').replaceChildren();$('lunch-card').replaceChildren();
  const board=missionBoard(state,trackedQuest);
  $('mission-summary').textContent=state.day<2?'Nhiệm vụ khai trương':t(state.day>=3?'Đã nhận {n}/4 thưởng':'Đã nhận {n}/3 thưởng',{n:board.claimed});
  if(board.ready){const ready=document.createElement('strong');ready.textContent=' · '+t('Có {n} thưởng sẵn sàng',{n:board.ready});$('mission-summary').append(ready);}
  $('reward-count').hidden=!board.ready;$('reward-count').textContent=board.ready;
  $('missions-sub').textContent=state.day>=3?t('Ngày {n} · Ưu tiên bàn, giao việc cho Mai và chuẩn bị ca đặc biệt.',{n:state.day}):state.day<2?'Ngày 01 · Làm quen góc phố, đạt 900 xu và vượt giờ cao điểm. Ngày 02 sẽ có nhiệm vụ, món phở và một phần sân mới.':state.day2.completed?'Ngày 02 đã hoàn tất. Tiếp tục buôn bán, mở hết cải tiến và thử phá kỷ lục bữa trưa của bạn.':'Ngày 02 · Mở sân phở rồi chọn việc bạn muốn ưu tiên. Thưởng chỉ nhận một lần, không cần chạy theo một thứ tự bắt buộc.';
  if(state.day<2){
    const g=goal(state),card=document.createElement('article');card.className='quest';
    card.innerHTML=`<div class="quest-head"><span class="quest-icon">☀</span><div><h3>${g.text}</h3><p>Bước tiếp theo</p></div></div><div class="progress"><i style="width:${Math.min(100,g.value/g.max*100)}%"></i></div><div class="quest-progress-label">${Math.floor(Math.min(g.value,g.max))}/${g.max}</div>`;
    if(g.station==='shop'){const b=document.createElement('button');b.className='primary';b.textContent='Mở Phát triển';b.addEventListener('click',()=>{close();open('shop-panel');});card.append(b);}
    $('quests').append(card);
  }
  const e=state.day2.event,card=document.createElement('div');card.className='lunch-card';
  card.innerHTML=`<h3>☀ Đoàn khách bữa trưa</h3><p>60 giây · Khách gọi phở nhiều hơn.<br>Đủ 14 món là đạt. Chưa đủ? Chuẩn bị hàng rồi thử lại.<br>Kỷ lục: <b>${e.best} món</b>${e.attempts?` · Lượt gần nhất: ${e.lastServed}`:''}</p>`;
  const b=document.createElement('button');b.className='primary';b.id='start-lunch';b.disabled=state.day<2||!state.upgrades.pho||e.active||e.cooldown>0;
  b.textContent=!state.upgrades.pho?'Mở sân phở để đón khách':e.active?`Đang đón khách · ${Math.ceil(e.left)}s`:e.cooldown>0?`Chuẩn bị lại · ${Math.ceil(e.cooldown)}s`:'Đón khách bữa trưa →';
  b.addEventListener('click',()=>{if(startLunch(state,event)){close();save();updateHUD();}});card.append(b);$('lunch-card').append(card);
  for(const q of board.cards){
    const row=document.createElement('article');row.className='quest';row.dataset.quest=q.id;
    row.innerHTML=`<div class="quest-head"><span class="quest-icon">${q.icon}</span><div><h3>${q.title}</h3><p>${q.description}</p></div></div><div class="progress"><i style="width:${q.progress*100}%"></i></div><div class="quest-tail"><span>${Math.floor(q.value)}/${q.max} · ✦ ${q.reward} xu</span></div>`;
    const tail=row.querySelector('.quest-tail');
    if(q.claimed){const done=document.createElement('span');done.className='done';done.textContent='✓ Đã nhận';tail.append(done);}
    else{
      const reward=document.createElement('button');reward.className='primary';reward.dataset.claim=q.id;reward.textContent=q.ready?'Nhận thưởng':'Đang thực hiện';reward.disabled=!q.ready;
      reward.addEventListener('click',()=>{if((state.day>=3?claimDiningQuest:claimQuest)(state,q.id,event)){if(currentOverlay==='missions-panel')renderMissions();save();updateHUD();}});tail.append(reward);
      const actions=document.createElement('div');actions.className='quest-actions';const track=document.createElement('button');track.className='track-button';track.dataset.track=q.id;track.setAttribute('aria-pressed',String(board.active.quest===q.id));track.textContent=board.active.quest===q.id?'Đang theo dõi':'Theo dõi';
      track.addEventListener('click',()=>{trackedQuest=q.id;renderMissions();updateHUD();});actions.append(track);row.append(actions);
    }
    $('quests').append(row);
  }
  if(state.day===2&&state.day2.completed){const p=document.createElement('p');p.className='section-note';p.textContent=`Tiếp theo: ${number(goal(state).max)} xu doanh thu tích lũy. Cùng giữ quán đông vui; bạn vẫn có thể đón đoàn bữa trưa để lập kỷ lục mới.`;$('quests').append(p);}
  selectMissionTab(missionTab);localize($('missions-panel'));
}
function updateHUD(){
  $('money').textContent=number(state.money);const g=missionBoard(state,trackedQuest).active;
  $('goal').textContent=g.text;$('goal-count').textContent=g.max===1?(g.value>=g.max?'✓':'0/1'):`${Math.floor(Math.min(g.value,g.max))}/${g.max}`;$('goal-progress').style.width=`${Math.min(100,g.value/g.max*100)}%`;
  $('chapter').textContent=state.day>=3?t('NGÀY {n} · SÂN ĂN ẤM ÁP',{n:String(state.day).padStart(2,'0')}):state.day===2?(state.day2.completed?'NGÀY 02 · TỰ DO PHÁT TRIỂN':state.day2.event.active?'NGÀY 02 · BỮA TRƯA NHỘN NHỊP':'NGÀY 02 · PHỐ ĐANG LỚN'):state.rushStarted&&state.rushLeft>0?'NGÀY 01 · GIỜ CAO ĐIỂM':'NGÀY 01 · KHAI TRƯƠNG';
  if(previousGoal!==g.text){previousGoal=g.text;if(state.started)toast(`Mục tiêu: ${g.text}`);}
  const bag=state.player.bag;$('capacity').textContent=`${count(bag)}/${state.upgrades.capacity?7:4}`;
  const names={raw:'nguyên liệu',banh:'bánh',special:'đặc biệt',tea:'trà',rawPho:'phần phở',pho:'tô phở',ice:'thùng đá'};$('bag').textContent=Object.entries(bag).filter(([,v])=>v).map(([k,v])=>`${v} ${t(names[k])}`).join(' · ')||'Tay trống';
  $('shop-dot').style.display=UPGRADES.some(u=>available(state,u))?'block':'none';
  const lunch=state.day2.event,de=state.dining.event;$('rush').hidden=!(de.active||lunch.active||state.rushStarted&&state.rushLeft>0);
  $('rush').firstChild.textContent=de.active?t('🍽 CA ĐẶC BIỆT '):lunch.active?'☀ BỮA TRƯA ':'♨ GIỜ CAO ĐIỂM ';$('rush-time').textContent=de.active?`${state.dining.stats.parties-de.start}/${de.target} · ${Math.ceil(de.left)}s`:lunch.active?`${state.sold-lunch.startSold}/14 · ${Math.ceil(lunch.left)}s`:`${Math.ceil(state.rushLeft)}s`;
  const q=state.owner.takeaway,ice=state.owner.ice,jobStatus=$('owner-status');
  jobStatus.hidden=!(q.active||ice.active||ice.freshLeft>0);const tagsTop=$('toast').classList.contains('visible')?Math.max(48,$('toast').offsetHeight+18):48;$('rush').style.top=`${tagsTop}px`;jobStatus.style.top=`${tagsTop+($('rush').hidden?0:35)}px`;
  jobStatus.textContent=q.active?`▤ ĐƠN MANG ĐI ${parcelCount(state)}/${q.recipe.bread+q.recipe.tea+q.recipe.pho} · ${Math.ceil(q.left)}s`:ice.active?'❄ TIẾP ĐÁ · KHO RAU → TRÀ':`❄ TRÀ MÁT 13 xu · ${Math.ceil(ice.freshLeft)}s`;
  const near=Object.entries(STATIONS).find(([,p])=>Math.hypot(state.player.x-p.x,state.player.y-p.y)<43)?.[0];
  let hint=state.elapsed<9?'Kéo trên sàn để đi · Đứng gần trạm để làm':bag.rawPho?'Mang phần phở tới nồi ở sân mới':bag.pho?'Bày phở ở quầy nâu phía dưới':bag.raw?'Mang nguyên liệu tới bếp bánh mì':bag.banh+bag.special?'Mang bánh đến quầy xanh':state.phoTill>0&&state.player.y>850?'Ghé quầy phở để thu tiền':state.till>0?'Ghé quầy bánh mì hoặc trà để thu tiền':state.upgrades.pho?(state.player.y<850?'↓ Đi xuống sân phở · Chạm mục tiêu để xem nhiệm vụ':'↑ Quán bánh mì ở phía trên · Kéo để đi'):'Lấy nguyên liệu → Bếp → Quầy bán';
  const full=count(bag)>=(state.upgrades.capacity?7:4);
  if(near==='supply')hint=full?'Đầy tay rồi! Mang nguyên liệu tới bếp':bag.banh+bag.special+bag.pho?'Bày món đang mang trước nhé':bag.rawPho?'Nguyên liệu phở cần nồi ở sân dưới':state.supply?'Đang lấy nguyên liệu tươi…':`Giao hàng sau ${Math.ceil(12-state.supplyTimer)}s`;
  if(near==='kitchen')hint=bag.raw?'Đang giao nguyên liệu…':full?'Đầy tay rồi! Mang món ra quầy':state.kitchen.job?'Bếp đang nướng · Bánh chín tự lên tay':state.kitchen.output.length?'Đang lấy bánh nóng…':'Bếp cần thêm nguyên liệu';
  if(near==='sale')hint=bag.banh+bag.special?'Đang bày bánh · Khách tự mua':'Khách tự mua · Ghé đây để thu tiền';
  if(near==='tea')hint=state.upgrades.tea?(state.upgrades.teaAuto?'Máy trà đang phụ bạn · Cùng lo món khác nào':state.stock.tea>=(state.upgrades.capacity?18:10)?'Quầy trà đã đầy':'Đang pha trà tắc mát lạnh…'):'Mở quầy trà trong mục Phát triển';
  if(near==='phoSupply'&&state.upgrades.pho)hint=full?'Mang phần phở đến nồi bên phải':bag.raw?'Giao nguyên liệu bánh mì ở bếp trên trước':bag.banh+bag.special+bag.pho?'Bày món đang mang trước nhé':state.phoSupply?'Đang lấy thịt & bánh phở…':`Xe hàng phở đến sau ${Math.ceil(12-state.phoSupplyTimer)}s`;
  if(near==='phoKitchen'&&state.upgrades.pho)hint=bag.rawPho?'Đang giao thịt & bánh phở…':full?'Đầy tay rồi! Mang phở tới quầy nâu':state.phoKitchen.job?'Nước dùng đang sôi · Phở chín tự lên tay':state.phoKitchen.output.length?'Đang lấy phở bò nóng…':'Nồi phở cần nguyên liệu';
  if(near==='phoSale'&&state.upgrades.pho)hint=bag.pho?'Đang bày phở nóng · Khách tự mua':'Quầy phở · Tự thu tiền khi bạn ghé';
  if(state.upgrades.worker&&!q.active&&!ice.active&&!bag.banh&&!bag.special&&!bag.pho&&!bag.raw&&!bag.rawPho)hint='Linh lo bánh · Mở Nhiệm vụ để nhận việc chủ quán';
  if(q.active){const r=q.recipe,bread=bag.banh+bag.special;hint=bread<r.bread?'Đơn mang đi · Ghé quầy xanh lấy bánh':bag.tea<r.tea?'Đơn mang đi · Ghé quầy trà lấy ly':bag.pho<r.pho?'Đơn mang đi · Ghé quầy phở lấy tô':'Đủ món! Giao tại điểm túi giấy cạnh lối xuống sân';}
  if(ice.active)hint=bag.ice?'Mang thùng đá tới quầy trà':'Ghé kho rau để nhận một thùng đá';
  if(near==='pickup'&&q.active)hint=parcelCount(state)<q.recipe.bread+q.recipe.tea+q.recipe.pho?'Chưa đủ món · Xem túi hàng bên dưới':'Đang giao đơn cho khách…';
  if(state.upgrades.dining&&state.player.y>1580){
    hint='Chọn bàn trong Nhiệm vụ → Bàn ăn · Ghé xe lấy món';
    if(near==='service')hint=state.owner.takeaway.active?'Đang có đơn mang đi · Giao xong rồi phục vụ bàn':count(bag)>=(state.upgrades.capacity?7:4)&&bag.raw+bag.rawPho+bag.ice>0?'Giao nguyên liệu trước để có chỗ bê món':'Xe lấy món từ kho quầy thật · Hết món? Bổ sung quầy';
    if(near?.startsWith('table')){const tb=state.dining.tables[Number(near.slice(5))];hint=tb.state==='dirty'?'Đang lau bàn · Sắp đón lượt khách mới':tb.state==='waiting'?'Tự giao đúng món trên tay · Thiếu món? Ghé xe phục vụ':tb.state==='eating'?'Khách đang dùng bữa · Có thể lo bàn khác':'Ghé bàn tự thu tiền · Bàn sạch mới đón khách';}
  }
  $('station-hint').textContent=hint;
  for(const id of ['missions','bag','rush','owner-status','station-hint'])localize($(id));
}
function showFinish(){if(currentOverlay)$(currentOverlay).hidden=true;$('finish-stats').innerHTML=`<span><strong>${state.revenue}</strong>xu doanh thu</span><span><strong>${state.stats.soldPho}</strong>tô phở</span><span><strong>${state.day2.event.best}</strong>món / bữa trưa</span>`;localize($('finish'));open('finish');}
function download(data,name){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function refreshLanguage(){
  restoreStatic();renderShop();renderMissions();updateHUD();
  $('language').textContent=getLanguage()==='vi'?'EN':'VI';
  $('language').setAttribute('aria-label',getLanguage()==='vi'?'Switch to English':'Chuyển sang Tiếng Việt');
  document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===getLanguage())));
  $('sound').setAttribute('aria-label',t(soundEnabled?'Tắt âm thanh':'Bật âm thanh'));
  $('toast').textContent=t(toastMessage);$('save-status').textContent=t(saveLabel);
  $('import-status').textContent=t(importMessage);if(saveBlocked)$('recovery-message').textContent=t(importMessage||loaded.error);
  if(currentOverlay==='finish'){const overlay=currentOverlay;showFinish();currentOverlay=overlay;}
  renderer.render(state);
}
$('language').addEventListener('click',()=>{setLanguage(getLanguage()==='vi'?'en':'vi',storage);clearInput();refreshLanguage();});
document.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>{setLanguage(b.dataset.language,storage);clearInput();refreshLanguage();}));
document.querySelectorAll('[data-mission-tab]').forEach(b=>{
 b.addEventListener('click',()=>selectMissionTab(b.dataset.missionTab));
 b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const tabs=['goals','jobs','lunch','dining'],i=tabs.indexOf(missionTab);selectMissionTab(e.key==='Home'?'goals':e.key==='End'?'dining':tabs[(i+(e.key==='ArrowRight'?1:3))%4]);$(`missions-${missionTab}`).focus();});
});
$('start').addEventListener('click',()=>{state.started=true;close();save();tone();});
$('shop').addEventListener('click',()=>open('shop-panel'));$('help').addEventListener('click',()=>open('help-panel'));
$('tab-dining').addEventListener('click',()=>{shopTab='dining';renderShop();});
$('tab-home').addEventListener('click',()=>{shopTab='home';renderShop();});$('tab-growth').addEventListener('click',()=>{shopTab='growth';renderShop();});
$('missions').addEventListener('click',()=>open('missions-panel'));$('missions').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open('missions-panel');}});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));$('continue').addEventListener('click',close);
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;if(soundEnabled){audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();tone();}$('sound').querySelector('span').hidden=soundEnabled;$('sound').setAttribute('aria-label',t(soundEnabled?'Tắt âm thanh':'Bật âm thanh'));});
$('export-save').addEventListener('click',()=>download(encode(state),'PhoAmThuc-save-Moc3B.json'));
$('export-raw').addEventListener('click',()=>download(loaded.raw||'{}','PhoAmThuc-ban-luu-goc.json'));
for(const id of ['import-save','recovery-import'])$(id).addEventListener('click',()=>$('save-file').click());
function importError(message){importMessage=message;toast(message);$(currentOverlay==='recovery'?'recovery-message':'import-status').textContent=t(message);}
$('save-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';importMessage='';$('import-status').textContent='';if(!file)return;if(file.size>1024*1024){importError('File quá lớn. Hãy chọn bản lưu JSON của game.');return;}
  const raw=await file.text(),next=decode(raw);if(!next){importError('Chưa đọc được file. Tiến độ hiện tại được giữ nguyên.');return;}
  if(!confirm(t('Nhập bản lưu này để thay tiến độ hiện tại? Bản Mốc 1 gốc sẽ vẫn được giữ.')))return;
  try{backupCurrent(storage);saveProgress(storage,next);}catch{importError('Không ghi được bộ nhớ. Chưa thay bản lưu hiện tại.');return;}
  state=next;saveBlocked=false;renderer.effects=[];close();$('welcome').hidden=state.started;if(!state.started)open('welcome');updateHUD();toast('Đã nhập tiến độ. Góc phố của bạn vẫn còn nguyên!');
});
function newGame(){if(!confirm(t('Bắt đầu lượt mới? Tiến độ hiện tại sẽ được sao lưu nếu bộ nhớ cho phép.')))return;try{backupCurrent(storage);saveBlocked=false;}catch{saveBlocked=true;}state=freshState();renderer.effects=[];close();open('welcome');save();updateHUD();}
$('reset').addEventListener('click',newGame);$('recovery-new').addEventListener('click',newGame);
$('game').addEventListener('pointerdown',e=>{if(paused||!state.started||pointer)return;e.preventDefault();$('game').setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
$('game').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();const v=dragVector(pointer,e.clientX,e.clientY);input.x=v.x;input.y=v.y;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(name,e=>{if(pointer?.id===e.pointerId)clearInput();});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();if(!paused)keys.add(e.key.toLowerCase());}if(e.key==='Escape'&&currentOverlay&&state.started&&!saveBlocked)close();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{clearInput();save();});
document.addEventListener('visibilitychange',()=>{clearInput();lastTime=performance.now();if(document.hidden){save();platform.onGameplayStop();}else if(!paused)platform.onGameplayStart();});window.addEventListener('pagehide',save);
new ResizeObserver(()=>{renderer.resize();renderer.render(state);}).observe($('scene-wrap'));
function step(dt){let i=input;if(!pointer)i={x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)};tick(state,dt,i,event);saveTimer+=dt;hudTimer+=dt;if(saveTimer>2){save();saveTimer=0;}if(hudTimer>.1){updateHUD();hudTimer=0;}}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-lastTime)/1000));lastTime=now;if(!manualMode){if(!paused&&!document.hidden)step(dt);renderer.render(state,paused?0:dt);}requestAnimationFrame(frame);}
$('welcome').hidden=true;
if(loaded.error){$('recovery-message').textContent=t(loaded.error);open('recovery');setSaveStatus('Bản lưu được bảo vệ · Không tự ghi đè');}
else if(!state.started)open('welcome');
else if(loaded.migrated){save();toast('Đã tiếp nối bản lưu cũ · Dữ liệu gốc được giữ nguyên.');}
refreshLanguage();requestAnimationFrame(frame);
// Opt-in test harness. Input still goes through the same collision/economy model; no teleport or money grant.
if(new URLSearchParams(location.search).get('test')==='1')window.__game={setManual:value=>{manualMode=!!value;lastTime=performance.now();},snapshot:()=>JSON.parse(JSON.stringify(state)),path:target=>findPath(state.player,STATIONS[target],state),advance:(seconds,vector={x:0,y:0},draw=true)=>{if(paused||document.hidden)return false;for(let t=0;t<seconds;t+=1/60){if(paused)break;tick(state,Math.min(1/60,seconds-t),vector,event);}if(draw){updateHUD();renderer.render(state,seconds);}return true;},draw:()=>{updateHUD();renderer.render(state);},save,screen:(x,y)=>{const r=$('game').getBoundingClientRect();return{x:r.left+x*renderer.scale,y:r.top+(y-renderer.camera)*renderer.scale};},diagnostics:()=>({paused,saveBlocked,effects:renderer.effects.length,camera:renderer.camera})};
