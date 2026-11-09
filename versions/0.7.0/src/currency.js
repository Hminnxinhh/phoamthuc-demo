// Actual VND integers. The conversion preserves old balances and upgrade affordability.
export const LEGACY_VND_RATE=2000;
export const PRICE=Object.freeze({banh:20000,special:30000,tea:15000,pho:50000});
const LEGACY_PRICE=Object.freeze({banh:24000,special:36000,tea:20000,pho:56000});
export const isMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e15;
export const legacyVnd=n=>n*LEGACY_VND_RATE;
export const priceFor=(kind,basis='current',iced=false)=>(basis==='legacy'?LEGACY_PRICE:PRICE)[kind]+(kind==='tea'&&iced?(basis==='legacy'?6000:3000):0);
export const validBasis=value=>value==='current'||value==='legacy';
export function formatVnd(value,language='vi'){return Math.round(value).toLocaleString(language==='en'?'en-US':'vi-VN')+(language==='en'?' VND':'đ');}
export function compactVnd(value,language='vi'){
 const n=Math.max(0,value),locale=language==='en'?'en-US':'vi-VN';
 if(n>=1e9)return(n/1e9).toLocaleString(locale,{maximumFractionDigits:1})+(language==='en'?'b':'tỉ');
 if(n>=1e6)return(n/1e6).toLocaleString(locale,{maximumFractionDigits:1})+(language==='en'?'m':'tr');
 if(n>=1e3)return(n/1e3).toLocaleString(locale,{maximumFractionDigits:1})+'k';
 return n.toLocaleString(locale);
}
function checkedLegacyVnd(n){if(!Number.isSafeInteger(n)||n<0||n>1e9)throw Error('Invalid legacy monetary value');return legacyVnd(n);}
export function convertLegacyMoney(s){
 s.currency='VND';for(const k of ['money','revenue','till','phoTill'])s[k]=checkedLegacyVnd(s[k]);
 for(const k of ['collected','rewards'])s.stats[k]=checkedLegacyVnd(s.stats[k]);
 s.day2.revenueStart=checkedLegacyVnd(s.day2.revenueStart);
 s.owner.takeaway.bonusEarned=checkedLegacyVnd(s.owner.takeaway.bonusEarned);s.owner.takeaway.priceBasis=s.owner.takeaway.active?'legacy':'current';
 for(const c of s.customers)c.priceBasis='legacy';
 for(const t of s.dining.tables){t.base=checkedLegacyVnd(t.base);t.coins=checkedLegacyVnd(t.coins);t.priceBasis=t.state==='empty'?'current':'legacy';}
 for(const stats of [s.dining.stats,s.dining.dayBase])for(const k of ['revenue','tips'])stats[k]=checkedLegacyVnd(stats[k]);
 for(const h of s.dining.history)h.revenue=checkedLegacyVnd(h.revenue);
 s.career.spent=checkedLegacyVnd(s.career.spent);s.career.office.bonus=checkedLegacyVnd(s.career.office.bonus);s.career.office.priceBasis=s.career.office.active?'legacy':'current';
 return s;
}
