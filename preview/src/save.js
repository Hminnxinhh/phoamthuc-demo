import {decode,encode} from './model.js';
export const SAVE_KEY='pho-am-thuc.save.v7';
export const VENUES_KEY='pho-am-thuc.save.v6';
export const CURRENCY_KEY='pho-am-thuc.save.v5';
export const CAREER_KEY='pho-am-thuc.save.v4';
export const MILESTONE3_KEY='pho-am-thuc.save.v3';
export const PREVIOUS_KEY='pho-am-thuc.save.v2';
export const LEGACY_KEY='pho-am-thuc.save.v1';
export function loadProgress(storage){
  try{
    const current=storage.getItem(SAVE_KEY);
    if(current!==null){const state=decode(current);return state?{state,migrated:false}:{state:null,error:'Bản lưu hiện tại chưa đọc được. Dữ liệu được giữ nguyên.',raw:current};}
    const venues=storage.getItem(VENUES_KEY);
    if(venues!==null){const state=decode(venues);return state?{state,migrated:true,raw:venues}:{state:null,error:'Bản lưu 0.7 chưa đọc được. Dữ liệu được giữ nguyên.',raw:venues};}
    const currency=storage.getItem(CURRENCY_KEY);
    if(currency!==null){const state=decode(currency);return state?{state,migrated:true,raw:currency}:{state:null,error:'Bản lưu 0.6 chưa đọc được. Dữ liệu được giữ nguyên.',raw:currency};}
    const fourth=storage.getItem(CAREER_KEY);
    if(fourth!==null){const state=decode(fourth);return state?{state,migrated:true,raw:fourth}:{state:null,error:'Bản lưu 0.5 chưa đọc được. Dữ liệu được giữ nguyên.',raw:fourth};}
    const third=storage.getItem(MILESTONE3_KEY);
    if(third!==null){const state=decode(third);return state?{state,migrated:true,raw:third}:{state:null,error:'Bản lưu Mốc 3B chưa đọc được. Dữ liệu được giữ nguyên.',raw:third};}
    const previous=storage.getItem(PREVIOUS_KEY);
    if(previous!==null){const state=decode(previous);return state?{state,migrated:true,raw:previous}:{state:null,error:'Bản lưu Mốc 2/3A chưa đọc được. Dữ liệu được giữ nguyên.',raw:previous};}
    const old=storage.getItem(LEGACY_KEY);
    if(old!==null){const state=decode(old);return state?{state,migrated:true,raw:old}:{state:null,error:'Bản lưu Mốc 1 chưa đọc được. Dữ liệu được giữ nguyên.',raw:old};}
    return {state:null,empty:true};
  }catch{return {state:null,error:'Trình duyệt chặn đọc bộ nhớ. Game sẽ không tự ghi đè dữ liệu.'};}
}
export function saveProgress(storage,state){
  const data=encode(state);
  if(!decode(data))throw Error('Trạng thái chưa hợp lệ; bản lưu trước được giữ nguyên.');
  // Legacy key is deliberately never overwritten or removed. Migration is one-way.
  storage.setItem(SAVE_KEY,data);
}
export function backupCurrent(storage){const raw=storage.getItem(SAVE_KEY);if(raw!==null)storage.setItem('pho-am-thuc.backup.v7',raw);}
