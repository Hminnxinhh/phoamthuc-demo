// Shared geometry for navigation/rendering. Future dining areas register here, not in the animator.
export const WORLD = { w: 600, h: 1660 };
export const STATIONS = {
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

export const AREAS=Object.freeze([{id:'home',top:0,bottom:920,unlocked:()=>true},{id:'pho',top:920,bottom:1660,unlocked:s=>!!s.upgrades.pho}]);
export const worldHeight=state=>Math.max(...AREAS.filter(area=>area.unlocked(state)).map(area=>area.bottom));
