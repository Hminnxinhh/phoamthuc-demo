// Shared geometry for navigation/rendering. Future dining areas register here, not in the animator.
export const WORLD = { w: 600, h: 2640 };
export const STATIONS = {
  office:{x:450,y:1500,label:'Văn phòng'},
  invite:{x:104,y:820,label:'Đầu hẻm'},
  pickup: {x:450,y:770,label:'Giao đơn mang đi'},
  supply: { x: 104, y: 365, label: 'Nguyên liệu' },
  kitchen: { x: 365, y: 365, label: 'Bếp bánh mì' },
  sale: { x: 180, y: 671, label: 'Quầy bánh mì' },
  tea: { x: 451, y: 671, label: 'Trà tắc' },
  phoSupply: { x: 104, y: 1095, label: 'Nguyên liệu phở' },
  phoKitchen: { x: 365, y: 1095, label: 'Nồi phở bò' },
  phoSale: { x: 180, y: 1401, label: 'Quầy phở bò' },
};
export const SOLIDS = [
  { x: 38, y: 238, w: 134, h: 86 },
  { x: 285, y: 226, w: 172, h: 98 },
  { x: 78, y: 559, w: 207, h: 72 },
  { x: 373, y: 553, w: 157, h: 78 },
  { x: 22, y: 746, w: 43, h: 43 },
  { x: 531, y: 746, w: 43, h: 43 },
  { x: 38, y: 968, w: 134, h: 86 },
  { x: 285, y: 956, w: 172, h: 98 },
  { x: 78, y: 1289, w: 207, h: 72 },
  { x: 492, y: 1458, w: 45, h: 44 },
];

export const AREAS=Object.freeze([{id:'home',top:0,bottom:920,unlocked:()=>true},{id:'pho',top:920,bottom:1660,unlocked:s=>!!s.upgrades.pho},{id:'dining',top:1660,bottom:2640,unlocked:s=>!!s.upgrades.dining}]);
export const worldHeight=state=>Math.max(...AREAS.filter(area=>area.unlocked(state)).map(area=>area.bottom));

export const DINING_TABLES=Object.freeze([
 {id:0,cx:180,cy:1930,point:{x:180,y:2020},seats:[{x:150,y:1890},{x:210,y:1890}]},
 {id:1,cx:420,cy:2170,point:{x:420,y:2260},seats:[{x:390,y:2130},{x:450,y:2130}]},
 {id:2,cx:180,cy:2410,point:{x:180,y:2500},seats:[{x:150,y:2370},{x:210,y:2370}],requires:'thirdTable'},
]);
export const SERVICE_PASS={x:450,y:1700,label:'Xe phục vụ',area:'dining'};
STATIONS.service=SERVICE_PASS;
for(const t of DINING_TABLES){STATIONS['table'+t.id]={...t.point,label:'Bàn '+(t.id+1),area:'dining',requires:t.requires};SOLIDS.push({x:t.cx-70,y:t.cy-20,w:140,h:64,area:'dining',requires:t.requires});for(const seat of t.seats)SOLIDS.push({x:seat.x-12,y:seat.y-50,w:24,h:30,area:'dining',requires:t.requires});}
SOLIDS.push({x:370,y:1610,w:160,h:48,area:'dining'});
export const activeSolids=state=>SOLIDS.filter(r=>r.area!=='dining'||state?.upgrades.dining&&(!r.requires||state.upgrades[r.requires]));
