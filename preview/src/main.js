import{restaurantId,jobHere,pantryDemand,legacyTrip,legacyOperations}from'./restaurants.js';
import {APP_VERSION,VERSION_KEY,checkVersion,installPlatform} from './webapp.js';
import {VENUES,currentVenue,stationVenue,canVisit,visitVenue,venueProjects,claimVenue,setVenueFocus,hasPrize,canEquip,equipOutfit,festivalUnlocked} from './venues.js';
import {startFestival} from './dining.js';
import {startVenueOrder} from './owner.js';
import {formatVnd,compactVnd,PRICE} from './currency.js';
import {Navigator,stationCaption,NAVIGATION_KEY,ZONES,stationZone,stationUnlocked} from './navigation.js';
import {CHARACTERS,TRACKS,tracksFor,nextTraining,train,carryCapacity,speedFactor,careerGoals,claimCareer,startOffice,startWelcome,officeRecipe,officeRemaining,welcomeBoost,welcomeSold,welcomeTarget} from './career.js';
import {GUEST_TYPES,activeTables,needs,selectTable,assignTable,claimDiningQuest,startDiningEvent} from './dining.js';
import {t,number,loadLanguage,setLanguage,getLanguage,localize,staticCopy} from './locale.js';
import {missionBoard} from './mission-view.js';
import {startTakeaway,startIce,nextRecipe,parcelCount} from './owner.js';
import {freshState,tick,buy,goal,UPGRADES,STATIONS,count,encode,decode,findPath} from './model.js';
import {QUESTS,startLunch,claimQuest,available,lockReason,lunchSold} from './growth.js';
import {loadProgress,saveProgress,backupCurrent} from './save.js';
import {dragVector} from './controls.js';
import {Renderer,drawOutfitPreview,drawFoodPreview} from './render.js';
import {platform} from './platform.js';
const $=id=>document.getElementById(id);
let storage;try{storage=localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
loadLanguage(storage);const restoreStatic=staticCopy(document);restoreStatic();
const loaded=loadProgress(storage);
let state=loaded.state||freshState(),saveBlocked=!!loaded.error,paused=false,currentOverlay=null,shopTab=state.day>=3?'dining':state.day===2?'growth':'home';
let lastTime=performance.now(),saveTimer=0,hudTimer=0,toastTimer,pointer=null,soundEnabled=false,audio,manualMode=false;
const navigation=new Navigator(findPath);try{navigation.enabled=storage.getItem(NAVIGATION_KEY)!=='off';}catch{}
const money=n=>formatVnd(n,getLanguage()),shortMoney=n=>compactVnd(n,getLanguage());
const renderer=new Renderer($('game')),keys=new Set(),input={x:0,y:0};
let previousGoal=goal(state).text,missionTab='goals',trackedQuest=null,teamRole='owner',toastMessage='',importMessage='',saveLabel='Tự lưu trên thiết bị · 0.8.1';
function toast(message){toastMessage=message;$('toast').textContent=t(message);$('toast').classList.add('visible');$('station-hint').hidden=true;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').classList.remove('visible');$('station-hint').hidden=false;},3300);}
function tone(freq=600,length=.08){if(!soundEnabled||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.7,audio.currentTime+length);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{/* Optional audio. */}}
function setSaveStatus(message){saveLabel=message;$('save-status').textContent=t(message);}
function save(){if(saveBlocked)return false;try{saveProgress(storage,state);setSaveStatus('Đã lưu trên thiết bị · 0.8.1');return true;}catch{setSaveStatus('Chưa lưu được · Bản cũ được giữ nguyên · Hãy xuất bản lưu');return false;}}
function event(type,e){
  renderer.event(type,e);
  if(type==='money')tone(870,.16);if(type==='pickup')tone(420,.035);
  if(type==='upgrade'){toast(e.id==='worker'?'Linh lo bánh · Bạn có thể nhận đơn mang đi hoặc tiếp đá trong Nhiệm vụ.':`✦ ${e.text} đã sẵn sàng!`);tone(1100,.25);platform.onMilestone(e.id);save();}
  if(['rush','day','lunchEnd','reward','owner','dining','career'].includes(type)){toast(e.text);tone(type==='reward'?1080:740,.2);if(type!=='rush')save();}
  if(type==='day'){shopTab='growth';previousGoal='';}
  if(type==='day2Complete'){state.day2.summarySeen=true;save();showFinish();}
}
function clearInput(){const id=pointer?.id;pointer=null;keys.clear();input.x=0;input.y=0;if(id!==undefined&&$('game').hasPointerCapture(id))$('game').releasePointerCapture(id);}
function open(id){clearInput();finishTravel();if(currentOverlay&&currentOverlay!==id)$(currentOverlay).hidden=true;paused=true;currentOverlay=id;$(id).hidden=false;platform.onGameplayStop();if(id==='menu-panel')renderMenu();if(id==='street-panel')renderStreet();if(id==='journal-panel')renderJournal();if(id==='shop-panel')renderShop();if(id==='missions-panel')renderMissions();}
function close(){if(currentOverlay)$(currentOverlay).hidden=true;currentOverlay=null;if(!state.started){open('welcome');return;}paused=false;lastTime=performance.now();if(state.started)platform.onGameplayStart();$('game').focus({preventScroll:true});}
function renderPrices(){const root=$('price-board');root.replaceChildren();for(const[k,name]of Object.entries({banh:'Bánh mì',special:'Bánh đặc biệt',tea:'Trà tắc',pho:'Phở bò'})){const row=document.createElement('div'),n=document.createElement('span'),price=document.createElement('strong');n.textContent=t(name);price.textContent=money(PRICE[k]);const picture=document.createElement('canvas');picture.width=320;picture.height=220;picture.className='food-preview';picture.setAttribute('aria-hidden','true');drawFoodPreview(picture,state,k);row.append(picture,n,price);root.append(row);}}
function renderMenu(){
 renderThemeChoices();
 $('menu-balance').textContent=t('Số dư: {money}',{money:money(state.money)});$('sound-state').textContent=t(soundEnabled?'Bật':'Tắt');$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',t(soundEnabled?'Tắt âm thanh':'Bật âm thanh'));
 $('language-state').textContent=t(getLanguage()==='vi'?'Đang dùng Tiếng Việt':'Đang dùng English');$('nav-state').textContent=t(navigation.enabled?'Đang bật':'Đang tắt');$('nav-toggle').setAttribute('aria-pressed',String(navigation.enabled));
 const root=$('map-stations');root.replaceChildren();for(const[zone,label]of Object.entries(ZONES)){if(zone!==restaurantId(state))continue;const h=document.createElement('h4'),grid=document.createElement('div');h.textContent=t(label);grid.className='map-grid';for(const[id,p]of Object.entries(STATIONS).filter(([id])=>stationZone(id)===zone&&stationVenue(id)===restaurantId(state))){const b=document.createElement('button');b.dataset.route=id;b.className='map-stop';b.textContent=t(stationCaption(state,id));b.disabled=!stationUnlocked(state,id);b.addEventListener('click',()=>{if(currentVenue(state).id!==stationVenue(id))travel(stationVenue(id));if(navigation.choose(state,id)){close();updateHUD();renderer.render(state);}});grid.append(b);}root.append(h,grid);}
}
function renderThemeChoices(){
 const mode=window.PhoTheme.getMode(),dark=window.PhoTheme.getEffective()==='dark';
 $('theme-state').textContent=t(mode==='system'?(dark?'Theo thiết bị · Đang tối':'Theo thiết bị · Đang sáng'):dark?'Luôn dùng giao diện tối':'Luôn dùng giao diện sáng');
 document.querySelectorAll('button[data-theme-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeMode===mode)));
}
let departure=null,departureTimer;
function finishTravel(){clearTimeout(departureTimer);departure?.remove();departure=null;}
function travel(id){
 const previous=currentVenue(state);if(!canVisit(state,id)||previous.id===id)return false;
 finishTravel();
 // Fade through a warm floor colour so two busy layouts never overlap.
 // The saved scene changes synchronously; this short layer is presentation only.
 const picture=document.createElement('canvas'),game=$('game');picture.width=game.width;picture.height=game.height;picture.getContext('2d').drawImage(game,0,0);
 if(!visitVenue(state,id))return false;
 clearInput();navigation.manual=null;navigation.key='';close();save();updateHUD();renderer.render(state);
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const curtain=document.createElement('div');curtain.className='venue-transition';curtain.setAttribute('aria-hidden','true');curtain.style.setProperty('--departure-x',VENUES.findIndex(v=>v.id===id)>VENUES.indexOf(previous)?'-10px':'10px');curtain.append(picture);
  departure=curtain;game.after(curtain);curtain.addEventListener('animationend',e=>{if(e.target===curtain&&departure===curtain)finishTravel();});departureTimer=setTimeout(finishTravel,550);
 }
 toast(t('Đã tới {name}',{name:t(currentVenue(state).name)}));return true;
}
function adjacentVenue(direction){const unlocked=VENUES.filter(v=>canVisit(state,v.id)),index=unlocked.findIndex(v=>v.id===currentVenue(state).id);return unlocked[index+direction];}
function renderStreet(){const root=$('venue-list');root.replaceChildren();for(const v of VENUES){const card=document.createElement('article');card.className='venue-card venue-'+v.id;const h=document.createElement('h3'),p=document.createElement('p'),stars=document.createElement('div'),b=document.createElement('button');h.textContent=v.icon+' '+t(v.name);p.textContent=t(v.description);stars.className='venue-rating';stars.textContent='★'.repeat(state.places.claimed[v.id].length)+'☆'.repeat(6-state.places.claimed[v.id].length);b.className='primary';b.dataset.visit=v.id;const owned=canVisit(state,v.id);b.textContent=currentVenue(state).id===v.id?t('Đang ở đây'):owned?t('Ghé quán →'):t('Xem điều kiện mở');b.addEventListener('click',()=>{if(owned){if(!travel(v.id))close();}else{shopTab=v.id==='pho'?'growth':'dining';open('shop-panel');}});card.append(h,p,stars,b);root.append(card);}}
function renderJournal(){const v=currentVenue(state),id=v.id,root=$('venue-projects');$('journal-title').textContent=t(v.name);$('journal-intro').textContent=t('Mỗi dấu sao mở một thay đổi thật. Xem phần thưởng bên dưới, nhận khi hoàn tất.');root.replaceChildren();for(const q of venueProjects(state,id)){const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),prize=document.createElement('p'),b=document.createElement('button');card.className='quest venue-project';card.dataset.project=q.id;const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.classList.add('prize-art');art.setAttribute('viewBox','0 0 80 80');art.setAttribute('aria-hidden','true');const glyph=({'h-first':'sign','h-hands':'bag','h-ice':'ice','h-local':'bag','h-team':'cart','h-busy':'awning','p-open':'sign','p-hands':'bag','p-local':'basket','p-lunch':'basket','p-team':'shirt','p-busy':'bowl','s-first':'lantern','s-hands':'tray','s-clean':'shirt','s-team':'sign','s-welcome':'lantern','s-repute':'sign'})[q.id];const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','./src/assets/prizes.svg#'+glyph);art.append(use);card.append(art);h.textContent=t(q.title);p.textContent=t(q.description);p.className='table-detail';prize.className='prize';prize.textContent='🎁 '+t(q.prize);b.className='primary';b.dataset.claimVenue=q.id;b.disabled=q.claimed||q.value<q.max;b.textContent=q.claimed?t('✓ Đã mở'):q.value>=q.max?t('Mở phần thưởng'):Math.min(q.value,q.max)+'/'+q.max;b.addEventListener('click',()=>{if(claimVenue(state,id,q.id,event)){renderJournal();save();updateHUD();renderer.render(state);}});card.append(h,p,prize,b);root.append(card);}
 const work=$('venue-work');work.replaceChildren();if(id!=='dining'){
 const title=document.createElement('h3');title.textContent=t('Việc riêng của địa chỉ');work.append(title);const b=document.createElement('button');b.className='primary';b.id='start-local-order';b.disabled=state.owner.takeaway.active||state.career.office.active||state.owner.takeaway.cooldown>0||!hasPrize(state,id,id==='home'?'h-hands':'p-hands');b.textContent=t(id==='home'?'Nhận đơn hàng xóm':'Nhận đơn 3 tô phở');b.addEventListener('click',()=>{if(startVenueOrder(state,id,event)){close();save();updateHUD();}});const note=document.createElement('p');note.className='sheet-sub';note.textContent=t(id==='home'?'Mở bằng Tự tay bày quầy. Gom bánh/trà, giao túi giấy ngay quán.':'Mở bằng Bày tô phở nóng. Gom ba tô rồi giao cửa quán phở, không cần qua quán bánh.');work.append(note,b);
 const h=document.createElement('h3');h.textContent=t('Món gợi ý cho khách mới');work.append(h);const choices=document.createElement('div');choices.className='focus-choices';for(const key of id==='home'?['balanced','bread','tea']:['balanced','pho']){const c=document.createElement('button');c.textContent=t(id==='pho'?(key==='pho'?'Ưu tiên phần đôi':'Đơn thường'):({balanced:'Đủ món',bread:'Bánh nóng',tea:'Trà tắc'})[key]);c.dataset.focus=key;c.setAttribute('aria-pressed',String(state.places.focus[id]===key||id==='pho'&&key==='balanced'&&state.places.focus.pho==='tea'));c.disabled=state.places.focusUntil[id]>state.elapsed||!hasPrize(state,id,id==='home'?'h-first':'p-open');c.addEventListener('click',()=>{if(setVenueFocus(state,id,key)){renderJournal();save();}});choices.append(c);}const why=document.createElement('p');why.className='sheet-sub';why.textContent=t(id==='pho'?'Chọn đơn thường hoặc ưu tiên khách mua hai tô. Không đặt trà từ quán khác; mỗi lần đổi cách nhau 60 giây.':'Mở từ dấu sao đầu tiên. Đổi nhu cầu khách mới theo món đã chuẩn bị; mỗi lần giữ 60 giây.');work.append(choices,why);
 }else{const b=document.createElement('button');b.id='start-festival';b.className='primary';b.disabled=!festivalUnlocked(state)||state.dining.event.active||state.dining.event.cooldown>0;b.textContent=t('Đón Ngày hội phố Việt');b.addEventListener('click',()=>{if(startFestival(state,event)){close();save();updateHUD();}});const p=document.createElement('p');p.className='sheet-sub';p.textContent=t('400 XP chủ quán + dấu sao Lời mời đầu phố mở ngày hội. Đón bốn bàn bạn bè trong 110 giây.');work.append(p,b);}
 const wardrobe=$('wardrobe');wardrobe.replaceChildren();const title=document.createElement('h3');title.textContent=t('Tủ đồ của chủ quán');const note=document.createElement('p');note.className='sheet-sub';note.textContent=t('{n} XP · 180 XP mở áo bà ba; 400 XP và Ngày hội mở áo lễ hội.',{n:state.career.roles.owner.xp});wardrobe.append(title,note);for(const key of ['chef','baba','festival']){const b=document.createElement('button');b.dataset.outfit=key;b.className='outfit-button';b.setAttribute('aria-pressed',String(state.places.outfit===key));b.disabled=!canEquip(state,key);b.textContent=t(({chef:'Đầu bếp',baba:'Áo bà ba',festival:'Áo lễ hội'})[key]);b.addEventListener('click',()=>{if(equipOutfit(state,key)){renderJournal();save();renderer.render(state);}});const portrait=document.createElement('canvas');portrait.width=88;portrait.height=96;portrait.className='outfit-preview';portrait.setAttribute('aria-hidden','true');drawOutfitPreview(portrait,state,key);b.prepend(portrait);wardrobe.append(b);}
}
function renderShop(){
  $('shop-balance').textContent=t('Số dư: {money}',{money:money(state.money)});
  $('tab-team').classList.toggle('active',shopTab==='team');$('tab-team').setAttribute('aria-pressed',String(shopTab==='team'));
  $('tab-dining').classList.toggle('active',shopTab==='dining');$('tab-dining').setAttribute('aria-pressed',String(shopTab==='dining'));
  $('tab-home').classList.toggle('active',shopTab==='home');$('tab-growth').classList.toggle('active',shopTab==='growth');
  $('tab-home').setAttribute('aria-pressed',String(shopTab==='home'));$('tab-growth').setAttribute('aria-pressed',String(shopTab==='growth'));
  $('upgrades').replaceChildren();
  if(shopTab==='team'){renderTeam();localize($('shop-panel'));return;}
  if(shopTab==='growth'&&state.day<2){const p=document.createElement('p');p.className='section-note';p.textContent='Hoàn tất ngày khai trương để mở phần sân nối liền và đón khách phở Ngày 02. Bạn có thể xem trước các cải tiến ở đây.';$('upgrades').append(p);}
  for(const u of UPGRADES.filter(u=>(u.section==='dining'?'dining':['pho','phoBoiler','worker2','teaAuto'].includes(u.id)?'growth':'home')===shopTab)){
    const row=document.createElement('article');row.className='upgrade';row.innerHTML=`<span class="upgrade-icon">${u.icon}</span><div><h3>${u.name}</h3><p>${u.description}</p></div>`;
    if(state.upgrades[u.id]){const done=document.createElement('span');done.className='purchased';done.textContent='✓ Đã có';row.append(done);}
    else{const b=document.createElement('button');b.className='primary';b.dataset.buy=u.id;b.disabled=!available(state,u);b.textContent=lockReason(state,u)||money(u.cost);b.addEventListener('click',()=>{if(buy(state,u.id,event)){renderShop();updateHUD();}});row.append(b);}
    $('upgrades').append(row);
  }
  localize($('shop-panel'));
}
function renderTeam(){
 const root=$('upgrades'),tabs=document.createElement('div');tabs.className='team-tabs';
 for(const who of CHARACTERS){const b=document.createElement('button');b.textContent=t(who.name);b.dataset.character=who.id;b.setAttribute('aria-pressed',String(teamRole===who.id));b.addEventListener('click',()=>{teamRole=who.id;renderShop();});tabs.append(b);}root.append(tabs);
 const who=CHARACTERS.find(c=>c.id===teamRole),r=state.career.roles[teamRole],heading=document.createElement('p');heading.className='section-note';heading.textContent=t('{name} · {n} kinh nghiệm · 3 bậc mỗi kỹ năng',{name:t(who.name),n:r.xp});root.append(heading);const stat=document.createElement('p');stat.className='sheet-sub';stat.textContent=t('Mang {n} món · Di chuyển +{m}%',{n:carryCapacity(state,teamRole),m:Math.round((speedFactor(state,teamRole)-1)*100)});root.append(stat);
 for(const key of tracksFor(teamRole)){const n=nextTraining(state,teamRole,key),row=document.createElement('article');row.className='upgrade';const icon=document.createElement('span');icon.className='upgrade-icon';icon.textContent=key==='stride'?'⚡':key==='carry'?'▣':'✧';const copy=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=t(TRACKS[key].title)+' · '+n.level+'/3';p.textContent=teamRole==='mai'&&key==='carry'?'Mai bậc 3 sức bê và xe nhanh có thể nhận cả ba bàn.':TRACKS[key].description;copy.append(h,p);const b=document.createElement('button');b.className='primary';b.dataset.train=teamRole+'-'+key;b.disabled=n.max||!n.owned||state.money<n.cost||r.xp<n.xp;b.textContent=n.max?'✓ Tối đa':!n.owned?'Mời về quán trước':r.xp<n.xp?t('Cần {n} kinh nghiệm',{n:n.xp}):money(n.cost);b.addEventListener('click',()=>{if(train(state,teamRole,key,event)){renderShop();save();updateHUD();}});row.append(icon,copy,b);root.append(row);}
 const note=document.createElement('p');note.className='sheet-sub';note.textContent='Kinh nghiệm đến từ công việc thật. Chủ quán bày món, giao đơn và dọn bàn; nhân viên tự lên kinh nghiệm khi làm việc. Nâng cấp dùng tiền trong game.';root.append(note);
}
function renderCareerJobs(root){
 const here=restaurantId(state),o=state.career.office,w=state.career.welcome;
 const intro=document.createElement('p');intro.className='section-note';intro.textContent=t('Mọi việc mới đều làm tại quán đang chơi. Quán khác giữ nguyên hàng và công việc khi bạn rời đi.');root.append(intro);
 const description=legacyOperations(state)?'Đơn đang dở từ bản cũ giữ nguyên món và điểm giao. Hoàn thành xong, đơn mới chỉ làm tại quán.':here==='pho'?'Hai lượt khách nhận phở tại hai cửa của quán. Chỉ dùng phở tự nấu ở đây.':here==='dining'?'Hai lượt nhận món ngay tại sân. Dùng kho và bếp riêng, không lấy hàng quán khác.':'Hai lượt nhận bánh và trà ngay tại quán. Không cần phở hay món từ địa chỉ khác.';
 for(const job of [
 {id:'office',title:'Đơn đặt tại quán',description,label:o.active?jobHere(state,o)?t('Điểm {n}/2 · {m}s',{n:o.stage+1,m:Math.ceil(o.left)}):t('Đơn đang chờ ở quán khác'):o.cooldown?t('Nghỉ đơn · {n}s',{n:Math.ceil(o.cooldown)}):t('Nhận đơn tại quán →'),disabled:state.local.legacyMode||state.day<2||o.active||o.cooldown>0||state.owner.takeaway.active,action:()=>startOffice(state,event)},
 {id:'welcome-market',title:'Mời khách ghé quán',description:'Chào khách ở hai điểm trong quán, rồi phục vụ món tại đây. Không phải chuyển địa chỉ.',label:w.active?t('Đang đón đoàn'):w.cooldown?t('Nghỉ đoàn · {n}s',{n:Math.ceil(w.cooldown)}):t('Mời khách tại quán →'),disabled:state.local.legacyMode||state.day<2||w.active||w.cooldown>0,action:()=>startWelcome(state,here==='pho'?'office':'market',event)}
 ]){const card=document.createElement('article');card.className='lunch-card owner-card';const h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');h.textContent=t(job.title);p.textContent=t(job.description);b.id='start-'+job.id;b.className='primary';b.textContent=job.label;b.disabled=job.disabled;b.addEventListener('click',()=>{if(job.action()){close();save();updateHUD();}});card.append(h,p,b);root.append(card);}
 const book=document.createElement('details');book.className='career-book';const summary=document.createElement('summary');summary.textContent=t('Sổ thành tựu của bạn · {n}/8',{n:state.career.claimed.length});book.append(summary);
 for(const g of careerGoals(state)){const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');card.className='quest';h.textContent=t(g.title);p.textContent=t(g.description);b.className='primary';b.dataset.careerClaim=g.id;const claimed=state.career.claimed.includes(g.id),ready=g.value()>=g.max;b.disabled=claimed||!ready;b.textContent=claimed?t('✓ Đã nhận'):ready?t('Nhận thưởng'):`${Math.min(g.max,g.value())}/${g.max} · ${money(g.reward)}`;b.addEventListener('click',()=>{if(claimCareer(state,g.id,event)){renderMissions();save();updateHUD();}});card.append(h,p,b);book.append(card);}root.append(book);
}
function renderOwnerJobs(){
 const root=$('owner-jobs'),here=restaurantId(state);root.replaceChildren();renderCareerJobs(root);
 if(here==='dining'){const note=document.createElement('p');note.className='section-note';note.textContent=t('Kho riêng → Bếp sân nhà → Xe phục vụ hoặc bàn ăn. Bếp phụ tự động mở sau ba bàn.');root.append(note);localize(root);return;}
 const q=state.owner.takeaway,i=state.owner.ice,r=jobHere(state,q)?q.recipe:nextRecipe(state),parts=[];
 if(r.bread)parts.push(t(`${r.bread} bánh`));if(r.tea)parts.push(t(`${r.tea} trà`));if(r.pho)parts.push(t(`${r.pho} phở`));
 for(const job of [
 {id:'takeaway',title:'Đơn mang đi',text:legacyOperations(state)?t('Đơn đang dở từ bản cũ giữ nguyên món và điểm giao. Hoàn thành xong, đơn mới chỉ làm tại quán.'):t('Chỉ gom món của quán này: {parts}. Giao ngay tại cửa; không cần đổi quán.',{parts:parts.join(' + ')}),label:q.active?jobHere(state,q)?t('Đang giao · {n}s',{n:Math.ceil(q.left)}):t('Đơn đang chờ ở quán khác'):q.cooldown>0?t('Khách hẹn lại · {n}s',{n:Math.ceil(q.cooldown)}):t('Nhận đơn mang đi →'),disabled:state.local.legacyMode||state.career.office.active||q.active||q.cooldown>0||!state.upgrades.worker,action:()=>startTakeaway(state,event)},
 ...(here==='home'?[{id:'ice',title:'Tiếp đá mát lành',text:t('Kho rau → Quầy trà. Một thùng đá giúp trà bán 18.000đ thay vì 15.000đ trong 50 giây. Không hạn giờ; Linh vẫn lo bánh.'),label:!state.upgrades.tea?t('Cần quầy trà'):i.active?t('Đang tiếp đá · Kho rau → Trà'):i.cooldown>0?t('Nghỉ tay · {n}s',{n:Math.ceil(i.cooldown)}):i.stock<=0?t('Chờ xe đá ghé kho'):t('Nhận việc tiếp đá →'),disabled:state.local.legacyMode||!state.upgrades.tea||!state.upgrades.worker||i.active||i.cooldown>0||i.stock<=0,action:()=>startIce(state,event)}]:[])
 ]){const card=document.createElement('div'),h=document.createElement('h3'),p=document.createElement('p'),b=document.createElement('button');card.className='lunch-card owner-card';h.textContent=t(job.title);p.textContent=job.text;b.id='start-'+job.id;b.className='primary';b.disabled=job.disabled;b.textContent=job.label;b.addEventListener('click',()=>{if(job.action()){close();save();updateHUD();}});card.append(h,p,b);root.append(card);}localize(root);
}
function renderDiningBoard(){
  const root=$('dining-board');root.replaceChildren();
  const note=document.createElement('p');note.className='section-note';note.textContent=state.upgrades.dining?t('Uy tín {n} · Bàn trọn vẹn {m} · Tip {money}',{n:state.dining.reputation,m:state.dining.stats.parties,money:money(state.dining.stats.tips)}):'Mở địa chỉ Sân ăn trong Phát triển. Nấu và phục vụ ngay tại sân.';root.append(note);
  const last=state.dining.history.at(-1);if(last){const summary=document.createElement('p');summary.className='section-note';summary.textContent=t('Ngày {n} đã xong · {m} bàn · {money}. Ngày mới có mục tiêu tiếp theo.',{n:last.day,m:last.parties,money:money(last.revenue)});root.append(summary);}
  const how=document.createElement('p');how.className='sheet-sub';how.textContent='Lấy giỏ ở kho riêng → Nấu tại bếp sân → Mang món lên xe hoặc tới bàn. Khách ăn xong trả tiền; ghé bàn để thu và lau.';root.append(how);
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
  const here=restaurantId(state),allowed=['goals','jobs',...(here==='pho'?['lunch']:here==='dining'?['dining']:[])];missionTab=allowed.includes(tab)?tab:'goals';$('missions-lunch').hidden=here!=='pho';$('missions-dining').hidden=here!=='dining';
  for(const name of ['goals','jobs','lunch','dining']){
    const active=name===missionTab,b=$(`missions-${name}`);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;
    $(`mission-${name}`).hidden=!active;
  }
  $('mission-goals').parentElement.scrollTop=0;
}
function renderMissions(){
  renderOwnerJobs();renderDiningBoard();$('quests').replaceChildren();$('lunch-card').replaceChildren();
  const board=missionBoard(state,trackedQuest),venue=restaurantId(state);const local=document.createElement('article'),button=document.createElement('button');local.className='quest';button.className='primary';button.id='local-journal';button.textContent=t('Sáu mục tiêu riêng của quán →');button.addEventListener('click',()=>open('journal-panel'));local.append(button);$('quests').append(local);
  $('mission-summary').textContent=t('Dấu sao của quán · {n}/6',{n:state.places.claimed[venue].length});
  if(board.ready){const ready=document.createElement('strong');ready.textContent=' · '+t('Có {n} thưởng sẵn sàng',{n:board.ready});$('mission-summary').append(ready);}
  $('reward-count').hidden=!board.ready;$('reward-count').textContent=board.ready;
  $('missions-sub').textContent=state.day>=3?t('Ngày {n} · Ưu tiên bàn, giao việc cho Mai và chuẩn bị ca đặc biệt.',{n:state.day}):state.day<2?'Ngày 01 · Làm quen góc phố, đạt 1.800.000đ và vượt giờ cao điểm. Ngày 02 sẽ có nhiệm vụ, món phở và một phần sân mới.':state.day2.completed?'Ngày 02 đã hoàn tất. Tiếp tục buôn bán, mở hết cải tiến và thử phá kỷ lục bữa trưa của bạn.':'Ngày 02 · Mở sân phở rồi chọn việc bạn muốn ưu tiên. Thưởng chỉ nhận một lần, không cần chạy theo một thứ tự bắt buộc.';
  $('missions-sub').textContent=t('Ưu tiên việc tại quán này. Các quán khác giữ tiến độ để bạn chơi sau.');
  if(state.day<2){
    const g=goal(state),card=document.createElement('article');card.className='quest';
    card.innerHTML=`<div class="quest-head"><span class="quest-icon">☀</span><div><h3>${g.text}</h3><p>Bước tiếp theo</p></div></div><div class="progress"><i style="width:${Math.min(100,g.value/g.max*100)}%"></i></div><div class="quest-progress-label">${g.money?shortMoney(Math.min(g.value,g.max))+'/'+shortMoney(g.max):Math.floor(Math.min(g.value,g.max))+'/'+g.max}</div>`;
    if(g.station==='shop'){const b=document.createElement('button');b.className='primary';b.textContent='Mở Phát triển';b.addEventListener('click',()=>{close();open('shop-panel');});card.append(b);}
    $('quests').append(card);
  }
  const e=state.day2.event,card=document.createElement('div');card.className='lunch-card';
  card.innerHTML=`<h3>☀ Đoàn khách bữa trưa</h3><p>60 giây · Khách gọi phở nhiều hơn.<br>Đủ 14 món là đạt. Chưa đủ? Chuẩn bị hàng rồi thử lại.<br>Kỷ lục: <b>${e.best} món</b>${e.attempts?` · Lượt gần nhất: ${e.lastServed}`:''}</p>`;
  const b=document.createElement('button');b.className='primary';b.id='start-lunch';b.disabled=state.day<2||!state.upgrades.pho||e.active||e.cooldown>0;
  b.textContent=!state.upgrades.pho?'Mở sân phở để đón khách':e.active?`Đang đón khách · ${Math.ceil(e.left)}s`:e.cooldown>0?`Chuẩn bị lại · ${Math.ceil(e.cooldown)}s`:'Đón khách bữa trưa →';
  b.addEventListener('click',()=>{if(startLunch(state,event)){close();save();updateHUD();}});card.append(b);$('lunch-card').append(card);
  if(state.day>=3){const q=careerGoals(state).find(g=>!state.career.claimed.includes(g.id));if(q){const row=document.createElement('article');row.className='quest personal-quest';const chip=document.createElement('p'),h=document.createElement('h3'),p=document.createElement('p'),tail=document.createElement('div');chip.className='chapter-chip';chip.textContent='THÀNH TỰU CỦA CHỦ QUÁN';h.textContent=q.title;p.className='table-detail';p.textContent=t(q.description)+' · '+Math.min(q.max,q.value())+'/'+q.max;tail.className='table-actions';const b=document.createElement('button');b.className='primary';b.textContent=q.value()>=q.max?'Nhận thưởng':'Mở việc chủ quán';b.addEventListener('click',()=>{if(q.value()>=q.max){claimCareer(state,q.id,event);renderMissions();updateHUD();save();}else selectMissionTab('jobs');});const team=document.createElement('button');team.className='track-button';team.textContent='Rèn luyện đội ngũ';team.addEventListener('click',()=>{close();shopTab='team';open('shop-panel');});tail.append(b,team);row.append(chip,h,p,tail);$('quests').append(row);}}
  for(const q of board.cards){
    const row=document.createElement('article');row.className='quest';row.dataset.quest=q.id;
    row.innerHTML=`<div class="quest-head"><span class="quest-icon">${q.icon}</span><div><h3>${q.title}</h3><p>${q.description}</p></div></div><div class="progress"><i style="width:${q.progress*100}%"></i></div><div class="quest-tail"><span>${Math.floor(q.value)}/${q.max} · ✦ ${money(q.reward)}</span></div>`;
    const tail=row.querySelector('.quest-tail');
    if(q.claimed){const done=document.createElement('span');done.className='done';done.textContent='✓ Đã nhận';tail.append(done);}
    else{
      const reward=document.createElement('button');reward.className='primary';reward.dataset.claim=q.id;reward.textContent=q.ready?'Nhận thưởng':'Đang thực hiện';reward.disabled=!q.ready;
      reward.addEventListener('click',()=>{if((q.id.startsWith('d-')?claimDiningQuest:claimQuest)(state,q.id,event)){if(currentOverlay==='missions-panel')renderMissions();save();updateHUD();}});tail.append(reward);
      const actions=document.createElement('div');actions.className='quest-actions';const track=document.createElement('button');track.className='track-button';track.dataset.track=q.id;track.setAttribute('aria-pressed',String(board.active.quest===q.id));track.textContent=board.active.quest===q.id?'Đang theo dõi':'Theo dõi';
      track.addEventListener('click',()=>{trackedQuest=q.id;renderMissions();updateHUD();});actions.append(track);row.append(actions);
    }
    $('quests').append(row);
  }
  if(state.day===2&&state.day2.completed){const p=document.createElement('p');p.className='section-note';p.textContent=`Tiếp theo: ${money(goal(state).max)} doanh thu tích lũy. Cùng giữ quán đông vui; bạn vẫn có thể đón đoàn bữa trưa để lập kỷ lục mới.`;$('quests').append(p);}
  selectMissionTab(missionTab);localize($('missions-panel'));
}
function updateHUD(){
  const venue=currentVenue(state);$('venue-name').textContent=t(venue.name);$('venue-stars').textContent='★'.repeat(state.places.claimed[venue.id].length)+'☆'.repeat(6-state.places.claimed[venue.id].length);$('journal-count').textContent=state.places.claimed[venue.id].length+'/6';
  for(const[id,direction]of[['venue-prev',-1],['venue-next',1]]){const v=adjacentVenue(direction),b=$(id);b.disabled=!v;b.setAttribute('aria-label',v?t('Ghé {name}',{name:t(v.name)}):t(direction<0?'Quán đầu phố':'Quán cuối phố'));b.title=v?t('Ghé {name}',{name:t(v.name)}):t(direction<0?'Quán đầu phố':'Quán cuối phố');}
  $('money').textContent=shortMoney(state.money);$('money').parentElement.title=money(state.money);$('money').parentElement.setAttribute('aria-label',t('Số dư: {money}',{money:money(state.money)}));const g=missionBoard(state,trackedQuest).active;
  $('goal').textContent=g.text;$('goal-count').textContent=g.max===1?(g.value>=g.max?'✓':'0/1'):(g.money?`${shortMoney(Math.min(g.value,g.max))}/${shortMoney(g.max)}`:`${Math.floor(Math.min(g.value,g.max))}/${g.max}`);$('goal-progress').style.width=`${Math.min(100,g.value/g.max*100)}%`;
  $('chapter').textContent=state.day>=3?t('NGÀY {n} · SÂN ĂN ẤM ÁP',{n:String(state.day).padStart(2,'0')}):state.day===2?(state.day2.completed?'NGÀY 02 · TỰ DO PHÁT TRIỂN':state.day2.event.active?'NGÀY 02 · BỮA TRƯA NHỘN NHỊP':'NGÀY 02 · PHỐ ĐANG LỚN'):state.rushStarted&&state.rushLeft>0?'NGÀY 01 · GIỜ CAO ĐIỂM':'NGÀY 01 · KHAI TRƯƠNG';
  if(previousGoal!==g.text){previousGoal=g.text;if(state.started)toast(`Mục tiêu: ${g.text}`);}
  const bag=state.player.bag;$('capacity').textContent=`${count(bag)}/${carryCapacity(state)}`;
  const names={raw:'nguyên liệu',banh:'bánh',special:'đặc biệt',tea:'trà',rawPho:restaurantId(state)==='dining'?'giỏ thực phẩm':'phần phở',pho:'tô phở',ice:'thùng đá'};$('bag').textContent=Object.entries(bag).filter(([,v])=>v).map(([k,v])=>`${v} ${t(names[k])}`).join(' · ')||'Tay trống';
  $('shop-dot').style.display=UPGRADES.some(u=>available(state,u))?'block':'none';
  const lunch=state.day2.event,de=state.dining.event;$('rush').hidden=!(de.active||lunch.active||state.rushStarted&&state.rushLeft>0);
  $('rush').firstChild.textContent=de.active?t(de.festival?'🏮 NGÀY HỘI PHỐ ':'🍽 CA ĐẶC BIỆT '):lunch.active?'☀ BỮA TRƯA ':'♨ GIỜ CAO ĐIỂM ';$('rush-time').textContent=de.active?`${state.dining.stats.parties-de.start}/${de.target} · ${Math.ceil(de.left)}s`:lunch.active?`${lunchSold(state)}/14 · ${Math.ceil(lunch.left)}s`:`${Math.ceil(state.rushLeft)}s`;
  const q=state.owner.takeaway,ice=state.owner.ice,jobStatus=$('owner-status');
  jobStatus.hidden=!(q.active||ice.active||ice.freshLeft>0);const tagsTop=$('toast').classList.contains('visible')?Math.max(48,$('toast').offsetHeight+18):48;$('rush').style.top=`${tagsTop}px`;jobStatus.style.top=`${tagsTop+($('rush').hidden?0:35)}px`;
  jobStatus.textContent=q.active?`▤ ĐƠN MANG ĐI ${parcelCount(state)}/${q.recipe.bread+q.recipe.tea+q.recipe.pho} · ${Math.ceil(q.left)}s`:ice.active?'❄ TIẾP ĐÁ · KHO RAU → TRÀ':`❄ TRÀ MÁT 18.000đ · ${Math.ceil(ice.freshLeft)}s`;
  const near=Object.entries(STATIONS).find(([,p])=>Math.hypot(state.player.x-p.x,state.player.y-p.y)<43)?.[0];
  let hint=state.elapsed<9?'Kéo trên sàn để đi · Đứng gần trạm để làm':bag.rawPho?'Mang phần phở tới nồi ở sân mới':bag.pho?'Bày phở ở quầy nâu phía dưới':bag.raw?'Mang nguyên liệu tới bếp bánh mì':bag.banh+bag.special?'Mang bánh đến quầy xanh':state.phoTill>0&&state.player.y>850?'Ghé quầy phở để thu tiền':state.till>0?'Ghé quầy bánh mì hoặc trà để thu tiền':state.upgrades.pho?(state.player.y<850?'Chọn Phố của bạn để ghé quầy phở':'Chọn Phố của bạn để đổi địa chỉ'):'Lấy nguyên liệu → Bếp → Quầy bán';
  const full=count(bag)>=(carryCapacity(state));
  if(near==='supply')hint=full?'Đầy tay rồi! Mang nguyên liệu tới bếp':bag.banh+bag.special+bag.pho?'Bày món đang mang trước nhé':bag.rawPho?'Nguyên liệu phở cần nồi ở sân dưới':state.supply?'Đang lấy nguyên liệu tươi…':`Giao hàng sau ${Math.ceil(12-state.supplyTimer)}s`;
  if(near==='kitchen')hint=bag.raw?'Đang giao nguyên liệu…':full?'Đầy tay rồi! Mang món ra quầy':state.kitchen.job?'Bếp đang nướng · Bánh chín tự lên tay':state.kitchen.output.length?'Đang lấy bánh nóng…':'Bếp cần thêm nguyên liệu';
  if(near==='sale')hint=bag.banh+bag.special?'Đang bày bánh · Khách tự mua':'Khách tự mua · Ghé đây để thu tiền';
  if(near==='tea')hint=state.upgrades.tea?(state.upgrades.teaAuto?'Máy trà đang phụ bạn · Cùng lo món khác nào':state.stock.tea>=(state.upgrades.capacity?18:10)?'Quầy trà đã đầy':'Đang pha trà tắc mát lạnh…'):'Mở quầy trà trong mục Phát triển';
  if(near==='phoSupply'&&state.upgrades.pho)hint=full?'Mang phần phở đến nồi bên phải':bag.raw?'Giao nguyên liệu bánh mì ở bếp trên trước':bag.banh+bag.special+bag.pho?'Bày món đang mang trước nhé':state.phoSupply?'Đang lấy thịt & bánh phở…':`Xe hàng phở đến sau ${Math.ceil(12-state.phoSupplyTimer)}s`;
  if(near==='phoKitchen'&&state.upgrades.pho)hint=bag.rawPho?'Đang giao thịt & bánh phở…':full?'Đầy tay rồi! Mang phở tới quầy nâu':state.phoKitchen.job?'Nước dùng đang sôi · Phở chín tự lên tay':state.phoKitchen.output.length?'Đang lấy phở bò nóng…':'Nồi phở cần nguyên liệu';
  if(near==='phoSale'&&state.upgrades.pho)hint=bag.pho?'Đang bày phở nóng · Khách tự mua':'Quầy phở · Tự thu tiền khi bạn ghé';
  if(state.upgrades.worker&&!q.active&&!ice.active&&!bag.banh&&!bag.special&&!bag.pho&&!bag.raw&&!bag.rawPho)hint='Linh lo bánh · Mở Nhiệm vụ để nhận việc chủ quán';
  if(q.active){const r=q.recipe,bread=bag.banh+bag.special;hint=bread<r.bread?'Đơn mang đi · Ghé quầy xanh lấy bánh':bag.tea<r.tea?'Đơn mang đi · Ghé quầy trà lấy ly':bag.pho<r.pho?'Đơn mang đi · Ghé quầy phở lấy tô':q.venue==='pho'?'Đủ món! Giao tại cửa quán phở':'Đủ món! Giao tại điểm túi giấy cạnh lối xuống sân';}
  if(ice.active)hint=bag.ice?'Mang thùng đá tới quầy trà':'Ghé kho rau để nhận một thùng đá';
  if(near==='pickup'&&q.active)hint=parcelCount(state)<q.recipe.bread+q.recipe.tea+q.recipe.pho?'Chưa đủ món · Xem túi hàng bên dưới':'Đang giao đơn cho khách…';
  if(state.upgrades.dining&&state.player.y>1580){
    hint='Chọn bàn trong Nhiệm vụ → Bàn ăn · Ghé xe lấy món';
    if(near==='service')hint=state.owner.takeaway.active?'Đang có đơn mang đi · Giao xong rồi phục vụ bàn':count(bag)>=(carryCapacity(state))&&bag.raw+bag.rawPho+bag.ice>0?'Giao nguyên liệu trước để có chỗ bê món':'Xe lấy món từ kho quầy thật · Hết món? Bổ sung quầy';
    if(near?.startsWith('table')){const tb=state.dining.tables[Number(near.slice(5))];hint=tb.state==='dirty'?'Đang lau bàn · Sắp đón lượt khách mới':tb.state==='waiting'?'Tự giao đúng món trên tay · Thiếu món? Ghé xe phục vụ':tb.state==='eating'?'Khách đang dùng bữa · Có thể lo bàn khác':'Ghé bàn tự thu tiền · Bàn sạch mới đón khách';}
  }
  const office=state.career.office,welcome=state.career.welcome;
  if(office.active){const remaining=officeRemaining(state);hint=office.stage===0?'Văn phòng trước · Gom bánh và trà, có thể giao từng phần':'Đầu hẻm sau · Gom phở và trà, có thể giao từng phần';jobStatus.hidden=false;jobStatus.textContent=t('▤ VĂN PHÒNG · {n}/2 · {m}s',{n:office.stage+1,m:Math.ceil(office.left)});}
  else if(welcome.active){hint=welcome.stage===0?'Mời đoàn · Ghé đầu hẻm, dừng chào khách':welcome.stage===1?'Mời đoàn · Ghé văn phòng, dừng chào khách':'Đoàn khách đang tới · Ưu tiên quầy theo nhu cầu';jobStatus.hidden=false;jobStatus.textContent=welcome.stage===2?t('☻ ĐOÀN PHỐ · {n}/28 · {m}s',{n:state.sold-welcome.startSold,m:Math.ceil(welcome.left)}):t('☻ ĐI MỜI KHÁCH · {n}/2',{n:welcome.stage});}
  const guide=navigation.update(state);renderer.guide=guide;
  $('next-label').textContent=t(guide.label);$('next-distance').textContent=t(guide.kind==='panel'?'Mở ›':legacyTrip(state)&&stationVenue(guide.id)!==restaurantId(state)?'Đơn cũ ›':'Tại quán');$('next-action').title=t(currentVenue(state).name);$('next-action').dataset.target=guide.id||guide.overlay;$('next-action').setAttribute('aria-label',t(guide.label));
  const here=restaurantId(state),ready=venueProjects(state,here).some(q=>!q.claimed&&q.value>=q.max);$('venue-notice').hidden=!navigation.enabled||!ready;
  hint=guide.kind==='world'?t(guide.label):t('Mỗi quán một vòng chơi · Ghé trạm để tự làm việc');
  if(here==='dining'){if(near==='diningSupply')hint=t('Kho sân ăn · Tự nhận giỏ thực phẩm khi còn chỗ');if(near==='diningKitchen')hint=t('Bếp sân ăn · Giao giỏ, chờ nấu và tự nhận món');if(near==='service')hint=t('Xe chỉ giữ món nấu tại sân · Không lấy hàng quán khác');if(near?.startsWith('table')){const table=state.dining.tables[Number(near.slice(5))];hint=t(table.state==='dirty'?'Đang lau bàn · Sắp đón lượt khách mới':table.state==='waiting'?'Tự giao đúng món trên tay · Thiếu món? Ghé xe phục vụ':'Ghé bàn tự thu tiền · Bàn sạch mới đón khách');}}
  jobStatus.hidden=!(jobHere(state,q)||here==='home'&&(ice.active||ice.freshLeft>0)||jobHere(state,office)||jobHere(state,welcome));
  if(jobHere(state,office))jobStatus.textContent=t('▤ ĐƠN TẠI QUÁN · {n}/2 · {m}s',{n:office.stage+1,m:Math.ceil(office.left)});
  if(jobHere(state,welcome))jobStatus.textContent=welcome.stage<2?t('☻ CHÀO KHÁCH TẠI QUÁN · {n}/2',{n:welcome.stage}):t('☻ KHÁCH TẠI QUÁN · {n}/{m}',{n:welcomeSold(state),m:welcomeTarget(state)});
  $('rush').hidden=here==='dining'?!de.active:here==='pho'?!lunch.active:!(state.rushStarted&&state.rushLeft>0);
  $('chapter').textContent=t('QUÁN ĐANG CHƠI · {name}',{name:t(currentVenue(state).name)});
  $('station-hint').textContent=hint;
  for(const id of ['missions','bag','rush','owner-status','station-hint'])localize($(id));
}
function showFinish(){if(currentOverlay)$(currentOverlay).hidden=true;$('finish-stats').innerHTML=`<span><strong>${money(state.revenue)}</strong>doanh thu</span><span><strong>${state.stats.soldPho}</strong>tô phở</span><span><strong>${state.day2.event.best}</strong>món / bữa trưa</span>`;localize($('finish'));open('finish');}
function download(data,name){const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function refreshLanguage(){
  restoreStatic();renderShop();renderMissions();renderStreet();renderJournal();updateHUD();$('app-manifest').href=getLanguage()==='en'?'./manifest-en.webmanifest':'./manifest.webmanifest';
  renderMenu();renderPrices();if(currentOverlay==='install-panel')renderInstall();if(currentOverlay==='update-panel'&&updateInfo)showUpdate(updateInfo);
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
let installPrompt=null,updateInfo=null,lastUpdateCheck=0,notifiedVersion=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
function renderInstall(){const root=$('install-steps'),platform=installPlatform(navigator,matchMedia('(display-mode: standalone)').matches);root.replaceChildren();const intro=document.createElement('p');intro.className='section-note';intro.textContent=t(platform==='standalone'?'Góc phố đã có trên màn hình chính của bạn.':platform==='ios'?'Trên iPhone, mở bằng Safari rồi làm ba bước:':platform==='android'?'Trên Android, mở menu của Chrome:':'Trên máy tính, bạn có thể cài ứng dụng từ thanh địa chỉ hoặc lưu dấu trang.');root.append(intro);const list=document.createElement('ol');list.className='install-steps';const steps=platform==='ios'?['1 · Chạm nút Chia sẻ (ô vuông có mũi tên ↑).','2 · Kéo xuống và chọn Thêm vào MH chính.','3 · Chạm Thêm. Lần sau mở bằng biểu tượng Phố Ẩm Thực.']:platform==='android'?['1 · Chạm menu ⋮ trên Chrome.','2 · Chọn Thêm vào màn hình chính hoặc Cài đặt ứng dụng.','3 · Xác nhận Thêm, rồi mở game từ biểu tượng.']:platform==='standalone'?[]:['Lưu dấu trang: Ctrl+D trên Windows hoặc ⌘D trên Mac.','Tìm biểu tượng cài ứng dụng trên thanh địa chỉ nếu trình duyệt hỗ trợ.'];for(const step of steps){const li=document.createElement('li');li.textContent=t(step);list.append(li);}root.append(list);if(installPrompt){const b=document.createElement('button');b.className='primary large';b.textContent=t('Thêm ra màn hình chính');b.addEventListener('click',async()=>{await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;renderInstall();});root.append(b);}}
function showUpdate(info){if(saveBlocked||currentOverlay==='recovery')return;updateInfo=info;notifiedVersion=info.version;$('update-title').textContent=t(info.status==='installed'?'Góc phố vừa đổi mới':'Có bản cập nhật');$('update-message').textContent=t(info.status==='installed'?'Bản {version} · Tiến độ đã được nối tiếp.': 'Bản {version} đã sẵn sàng. Lưu tiến độ rồi tải lại để nhận nội dung mới.',{version:info.version});$('update-notes').textContent=info.status==='installed'?t('Sáng/tối theo thiết bị · Chọn giao diện trong Menu · Tiến độ được giữ nguyên.'):t('Tiền, hàng, đồng đội và nhiệm vụ được giữ trong trình duyệt này.');$('reload-update').textContent=t(info.status==='installed'?'Vào quán →':'Lưu tiến độ & tải bản mới');$('update-later').hidden=info.status==='installed';open('update-panel');}
async function pollUpdate(manual=false){if(document.hidden||saveBlocked||!manual&&performance.now()-lastUpdateCheck<60000&&lastUpdateCheck)return;lastUpdateCheck=performance.now();const url=new URL('./build-info.json',location.href);url.searchParams.set('check',String(Date.now()));const info=await checkVersion(fetch,url.href);$('update-state').textContent=t(info.status==='available'?'Có bản {version}':info.status==='current'?'Đang dùng {version}':'Chưa kiểm tra được · Thử lại sau',{version:info.version||APP_VERSION});if(info.status==='available'&&(manual||notifiedVersion!==info.version))showUpdate(info);else if(manual&&info.status==='current'){showUpdate({...info,status:'installed'});}else if(manual&&info.status==='unavailable')toast('Chưa kiểm tra được cập nhật · Game và bản lưu vẫn dùng được.');}
$('welcome-install').addEventListener('click',()=>{renderInstall();open('install-panel');});
$('install-help').addEventListener('click',()=>{renderInstall();open('install-panel');});$('check-update').addEventListener('click',()=>pollUpdate(true));
$('update-later').addEventListener('click',close);$('reload-update').addEventListener('click',()=>{if(updateInfo?.status==='installed'){try{storage.setItem(VERSION_KEY,APP_VERSION);}catch{}close();}else if(!saveBlocked&&save()){location.reload();}else toast('Chưa lưu được · Hãy xuất bản lưu trước khi tải lại.');});
window.addEventListener('focus',()=>pollUpdate());document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollUpdate();});
$('street-button').addEventListener('click',()=>open('street-panel'));$('journal-button').addEventListener('click',()=>open('journal-panel'));
$('venue-prev').addEventListener('click',()=>{const v=adjacentVenue(-1);if(v)travel(v.id);});$('venue-next').addEventListener('click',()=>{const v=adjacentVenue(1);if(v)travel(v.id);});
$('menu').addEventListener('click',()=>open('menu-panel'));
$('next-action').addEventListener('click',()=>{const next=navigation.update(state);if(next.kind==='panel'){if(next.overlay==='shop-panel')shopTab=next.tab;else missionTab=next.tab||'goals';open(next.overlay);}else{if(currentVenue(state).id!==stationVenue(next.id))travel(stationVenue(next.id));navigation.choose(state,next.id);updateHUD();renderer.render(state);}});
$('nav-toggle').addEventListener('click',()=>{navigation.enabled=!navigation.enabled;navigation.manual=null;try{storage.setItem(NAVIGATION_KEY,navigation.enabled?'on':'off');}catch{}renderMenu();updateHUD();renderer.render(state);});
$('shop').addEventListener('click',()=>{const id=currentVenue(state).id;shopTab=id==='home'?'home':id==='pho'?'growth':'dining';open('shop-panel');});$('help').addEventListener('click',()=>open('help-panel'));
$('tab-team').addEventListener('click',()=>{shopTab='team';renderShop();});
$('tab-dining').addEventListener('click',()=>{shopTab='dining';renderShop();});
$('tab-home').addEventListener('click',()=>{shopTab='home';renderShop();});$('tab-growth').addEventListener('click',()=>{shopTab='growth';renderShop();});
$('missions').addEventListener('click',()=>open('missions-panel'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));$('continue').addEventListener('click',close);
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;if(soundEnabled){audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();tone();}renderMenu();});
document.querySelectorAll('button[data-theme-mode]').forEach(b=>b.addEventListener('click',()=>window.PhoTheme.setMode(b.dataset.themeMode)));
window.PhoTheme.subscribe(()=>{renderThemeChoices();finishTravel();renderer.render(state);});
$('install-export').addEventListener('click',()=>download(encode(state),'PhoAmThuc-save-0.8.1.json'));
$('export-save').addEventListener('click',()=>download(encode(state),'PhoAmThuc-save-0.8.1.json'));
$('export-raw').addEventListener('click',()=>download(loaded.raw||'{}','PhoAmThuc-ban-luu-goc.json'));
for(const id of ['import-save','recovery-import'])$(id).addEventListener('click',()=>$('save-file').click());
function importError(message){importMessage=message;toast(message);$(currentOverlay==='recovery'?'recovery-message':'import-status').textContent=t(message);}
$('save-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';importMessage='';$('import-status').textContent='';if(!file)return;if(file.size>1024*1024){importError('File quá lớn. Hãy chọn bản lưu JSON của game.');return;}
  const raw=await file.text(),next=decode(raw);if(!next){importError('Chưa đọc được file. Tiến độ hiện tại được giữ nguyên.');return;}
  if(!confirm(t('Nhập bản lưu này để thay tiến độ hiện tại? Bản Mốc 1 gốc sẽ vẫn được giữ.')))return;
  try{backupCurrent(storage);saveProgress(storage,next);}catch{importError('Không ghi được bộ nhớ. Chưa thay bản lưu hiện tại.');return;}
  state=next;navigation.manual=null;navigation.key='';saveBlocked=false;renderer.effects=[];close();$('welcome').hidden=state.started;if(!state.started)open('welcome');updateHUD();toast('Đã nhập tiến độ. Góc phố của bạn vẫn còn nguyên!');
});
function newGame(){if(!confirm(t('Bắt đầu lượt mới? Tiến độ hiện tại sẽ được sao lưu nếu bộ nhớ cho phép.')))return;try{backupCurrent(storage);saveBlocked=false;}catch{saveBlocked=true;}state=freshState();navigation.manual=null;navigation.key='';renderer.effects=[];close();open('welcome');save();updateHUD();}
$('reset').addEventListener('click',newGame);$('recovery-new').addEventListener('click',newGame);
$('game').addEventListener('pointerdown',e=>{if(paused||!state.started||pointer)return;e.preventDefault();$('game').setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
$('game').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;e.preventDefault();const v=dragVector(pointer,e.clientX,e.clientY);input.x=v.x;input.y=v.y;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(name,e=>{if(pointer?.id===e.pointerId)clearInput();});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();if(!paused)keys.add(e.key.toLowerCase());}if(e.key==='Escape'&&currentOverlay&&state.started&&!saveBlocked)close();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{clearInput();finishTravel();save();});
document.addEventListener('visibilitychange',()=>{clearInput();finishTravel();lastTime=performance.now();if(document.hidden){save();platform.onGameplayStop();}else if(!paused)platform.onGameplayStart();});window.addEventListener('pagehide',save);
new ResizeObserver(()=>{finishTravel();renderer.resize();renderer.render(state);}).observe($('scene-wrap'));
function step(dt){let i=input;if(!pointer)i={x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)};tick(state,dt,i,event);saveTimer+=dt;hudTimer+=dt;if(saveTimer>2){save();saveTimer=0;}if(hudTimer>.1){updateHUD();hudTimer=0;}}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-lastTime)/1000));lastTime=now;if(!manualMode){if(!paused&&!document.hidden)step(dt);renderer.render(state,paused?0:dt);}requestAnimationFrame(frame);}
$('welcome').hidden=true;
if(loaded.error){$('recovery-message').textContent=t(loaded.error);open('recovery');setSaveStatus('Bản lưu được bảo vệ · Không tự ghi đè');}
else if(!state.started)open('welcome');
else if(loaded.migrated){save();toast(JSON.parse(loaded.raw).schema<5?'Đã đổi tiền cũ sang VNĐ · 1 xu cũ = 2.000đ. Bản gốc được giữ nguyên.':'Đã nối tiến độ sang từng địa chỉ · Bản lưu cũ được giữ nguyên.');}
refreshLanguage();requestAnimationFrame(frame);
try{const seen=storage.getItem(VERSION_KEY);if(loaded.state?.started&&seen!==APP_VERSION&&!saveBlocked)showUpdate({status:'installed',version:APP_VERSION});else if(!seen)storage.setItem(VERSION_KEY,APP_VERSION);}catch{}
pollUpdate();
// Opt-in test harness. Input still goes through the same collision/economy model; no teleport or money grant.
if(new URLSearchParams(location.search).get('test')==='1')window.__game={setManual:value=>{manualMode=!!value;lastTime=performance.now();},visitStation:name=>{if(!STATIONS[name])return false;return travel(stationVenue(name));},snapshot:()=>JSON.parse(JSON.stringify(state)),path:target=>findPath(state.player,STATIONS[target],state),advance:(seconds,vector={x:0,y:0},draw=true)=>{if(paused||document.hidden)return false;for(let t=0;t<seconds;t+=1/60){if(paused)break;tick(state,Math.min(1/60,seconds-t),vector,event);}if(draw){updateHUD();renderer.render(state,seconds);}return true;},draw:()=>{updateHUD();renderer.render(state);},save,screen:(x,y)=>{const r=$('game').getBoundingClientRect();return{x:r.left+(x+renderer.offsetX)*renderer.scale,y:r.top+(y-renderer.camera)*renderer.scale};},diagnostics:()=>({paused,saveBlocked,effects:renderer.effects.length,camera:renderer.camera,guide:renderer.guide})};
