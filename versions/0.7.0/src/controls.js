// Invisible floating drag control. All coordinates stay outside the save model.
export function dragVector(anchor,x,y){
  let dx=x-anchor.x,dy=y-anchor.y,d=Math.hypot(dx,dy);
  // Follow a long swipe so changing direction does not require returning to the first touch.
  if(d>48){anchor.x=x-dx/d*48;anchor.y=y-dy/d*48;dx=x-anchor.x;dy=y-anchor.y;d=48;}
  if(d<=4)return {x:0,y:0};
  const speed=Math.min(1,(d-4)/28);
  return {x:dx/d*speed,y:dy/d*speed};
}
