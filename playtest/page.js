(() => {
  const copy = {
    en: {
      eyebrow:'BROWSER PLAYTEST · 0.8.1',title:'A little shop.<br>Your own food street.',intro:'Make bánh mì, cook phở, welcome guests, and grow a Vietnamese food shop with your team.',play:'Play the free prototype',playNote:'Play in your browser · No account needed',phone:'One-finger controls',noAds:'No ads',prototype:'A prototype in development. Your feedback helps the shop grow.',realGame:'Actual gameplay, not concept art.',breadAlt:'Actual gameplay: the owner and customers at the bánh mì shop',madeHere:'WARM BREAD · FRAGRANT PHỞ · STREET LIFE',watch:'A moment in the shop',videoNote:'20 seconds of actual gameplay, at real speed.',videoLabel:'20 seconds of serving tables in the game',handsTitle:'Take care of your shop',hands:'Drag to move. Stand near stations to collect ingredients, cook, stock counters, and collect payments.',growTitle:'Open a new story',grow:'From bánh mì and kumquat tea to phở, dine-in tables, and rewards that change your shop.',teamTitle:'Helpers, with more to do',team:'Hire a helper, choose owner jobs, welcome groups, and look after tables in your own way.',secondPlay:'Drop in and play →',guideTitle:'Step inside and play',guide1:'On phones, play in portrait and drag one finger on the floor. On desktop, use WASD or arrow keys.',guide2:'Visit the supply basket, take ingredients to the kitchen, then stock the counter. Nearby stations work automatically.',guide3:'Menu includes help, English/Vietnamese, light/dark mode, and Home Screen instructions.',saveNote:'Progress stays in your current browser. To change devices, export/import a file in the game Menu. Play still opens the same preview.',feedbackEyebrow:'HELP THE SHOP GROW',feedbackTitle:'After hiring a helper,<br>what would you do next?',feedbackText:'Play at your own pace. If you want to share feedback, reply to the post that brought you here. No name, email, or save file needed.',copyFeedback:'Copy feedback prompts',share:'Share the demo',kitTitle:'Want to introduce the shop?',kitText:'Get actual screenshots, a 20-second clip, and Vietnamese/English post text below.',kitDownload:'Download media kit',gameDownload:'HTML5 demo package 0.8.1',footer:'No ads, payments, or in-game tracking.',copied:'Copied. Paste into the post or message where you found the game.',shareCopied:'Demo link copied.',fallback:'Select and copy the text below.',feedback:'Phố Ẩm Thực · 0.8.1\nPhone/desktop and browser (optional):\nWhere I stopped and why:\nAfter hiring a helper, what I wanted to do next:\nWhat would make me want to return:'
    }
  };
  const entries = [...document.querySelectorAll('[data-copy]')], originals = new Map(entries.map(el=>[el,el.innerHTML]));
  const messages={copied:'Đã chép. Dán vào bình luận hoặc tin nhắn nơi bạn thấy game.',shareCopied:'Đã chép đường dẫn demo.',fallback:'Chọn và sao chép nội dung bên dưới.',feedback:'Phố Ẩm Thực · 0.8.1\nĐiện thoại/máy tính và trình duyệt (tùy chọn):\nMình dừng ở đâu và vì sao:\nSau khi thuê người phụ, mình muốn làm gì tiếp:\nĐiều khiến mình muốn quay lại:'};
  let lang=new URLSearchParams(location.search).get('lang')==='en'?'en':'vi';
  function setLanguage(value){
    lang=value;document.documentElement.lang=lang;
    for(const el of entries)el.innerHTML=lang==='en'?copy.en[el.dataset.copy]:originals.get(el);
    document.querySelector('[data-alt=breadAlt]').alt=lang==='en'?copy.en.breadAlt:'Gameplay thật: nhân vật và khách tại quầy bánh mì';
    document.querySelector('[data-aria=videoLabel]').setAttribute('aria-label',lang==='en'?copy.en.videoLabel:'20 giây phục vụ bàn trong game');
    document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
    document.title=lang==='en'?'Phố Ẩm Thực — Vietnamese Food Street Playtest':'Phố Ẩm Thực — Mời bạn chăm một góc phố Việt';
    document.querySelector('#status').textContent='';document.querySelector('#copy-fallback').hidden=true;
    const url=new URL(location.href);if(lang==='en')url.searchParams.set('lang','en');else url.searchParams.delete('lang');history.replaceState(null,'',url);
  }
  async function copyText(value,key){
    try{await navigator.clipboard.writeText(value);document.querySelector('#status').textContent=lang==='en'?copy.en[key]:messages[key];}
    catch{const field=document.querySelector('#copy-fallback');field.value=value;field.hidden=false;field.focus();field.select();document.querySelector('#status').textContent=lang==='en'?copy.en.fallback:messages.fallback;}
  }
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  document.querySelector('#copy-feedback').addEventListener('click',()=>copyText(lang==='en'?copy.en.feedback:messages.feedback,'copied'));
  document.querySelector('#share').addEventListener('click',async()=>{
    const url=new URL(document.querySelector('link[rel=canonical]').href);if(lang==='en')url.searchParams.set('lang','en');
    if(navigator.share){try{await navigator.share({title:'Phố Ẩm Thực · Vietnamese Food Street',url:url.href});return;}catch(error){if(error.name==='AbortError')return;}}
    await copyText(url.href,'shareCopied');
  });
  setLanguage(lang);
})();
