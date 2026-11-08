import {decode,encode} from './model.js';
export const SAVE_KEY='pho-am-thuc.save.v2';
export const LEGACY_KEY='pho-am-thuc.save.v1';
export function loadProgress(storage){
  try{
    const current=storage.getItem(SAVE_KEY);
    if(current!==null){const state=decode(current);return state?{state,migrated:false}:{state:null,error:'Bản lưu hiện tại chưa đọc được. Dữ liệu được giữ nguyên.',raw:current};}
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
export function backupCurrent(storage){const raw=storage.getItem(SAVE_KEY);if(raw!==null)storage.setItem('pho-am-thuc.backup.v2',raw);}
