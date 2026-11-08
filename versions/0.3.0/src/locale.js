import {EN} from './translations.js';
export const LANGUAGE_KEY='pho-am-thuc.language';
let language='vi';const cache=new Map(),untranslated=new Set();
export const translationIssues=()=>[...untranslated];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(EN).filter(([k])=>k.includes('{')).map(([source,target])=>{
  const names=[...source.matchAll(/\{(\w+)\}/g)].map(m=>m[1]);
  return {names,target,match:new RegExp('^'+source.split(/\{\w+\}/).map((part,i)=>escape(part)+(i<names.length?(['n','m','a','b','amount','bonus'].includes(names[i])?'([\\d.,]+)':'(.+?)'):'')).join('')+'$')};
});
export const getLanguage=()=>language;
export const number=n=>n.toLocaleString(language==='vi'?'vi-VN':'en-US');
export function setLanguage(value,storage){language=value==='en'?'en':'vi';cache.clear();try{storage?.setItem(LANGUAGE_KEY,language);}catch{/* Language preference must never block progress. */}return language;}
export function loadLanguage(storage){try{return setLanguage(storage.getItem(LANGUAGE_KEY));}catch{return setLanguage('vi');}}
export function t(source,values={}){
  if(source==null)return '';if(typeof source!=='string')return String(source);
  let message=source;
  if(language==='en'){
    if(EN[source]!==undefined)message=EN[source];
    else if(cache.has(source))message=cache.get(source);
    else{for(const pattern of patterns){const match=source.match(pattern.match);if(match){message=pattern.target.replace(/\{(\w+)\}/g,(_,key)=>t(match[pattern.names.indexOf(key)+1]));break;}}
      if(message===source&&/[ăâđêôơưĂÂĐÊÔƠƯ\u1ea0-\u1ef9]/u.test(source.replace(/Phố Ẩm Thực|PHỐ|bánh mì|phở|Tiếng Việt/gi,'')))untranslated.add(source);
      if(cache.size>512)cache.clear();cache.set(source,message);}
  }
  return message.replace(/\{(\w+)\}/g,(_,key)=>values[key]??`{${key}}`);
}
export function localize(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){
    const node=walker.currentNode;if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;
    const raw=node.nodeValue,core=raw.trim();if(core)node.nodeValue=raw.replace(core,t(core));
  }
  for(const el of root.querySelectorAll('[aria-label],[title],meta[name="description"]'))for(const attr of ['aria-label','title','content'])if(el.hasAttribute(attr))el.setAttribute(attr,t(el.getAttribute(attr)));
}
// Capture static copy once. Dynamic panels are re-rendered from language-neutral state on switches.
export function staticCopy(root){
  const copy=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!['SCRIPT','STYLE'].includes(n.parentElement?.tagName))copy.push([n,n.nodeValue]);}
  const attrs=[];for(const el of root.querySelectorAll('[aria-label],[title],meta[name="description"]'))for(const attr of ['aria-label','title','content'])if(el.hasAttribute(attr))attrs.push([el,attr,el.getAttribute(attr)]);
  return ()=>{for(const [node,raw]of copy){const core=raw.trim();node.nodeValue=core?raw.replace(core,t(core)):raw;}for(const [el,attr,raw]of attrs)el.setAttribute(attr,t(raw));document.documentElement.lang=language;};
}
