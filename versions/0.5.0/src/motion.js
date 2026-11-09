// Physical locomotion, independent of character art. Preserves M2 speed, phase and save fields.
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>t*t*(3-2*t);
const FLOOR_Y=.72;
export function strideLength(speed=155){return 36+40*smooth(clamp(speed/155,0,1));}
export function stanceFraction(speed=155){return .62-.12*smooth(clamp(speed/155,0,1));}
export const STRIDE=strideLength(155);
export const STEP_PER_UNIT=TAU/STRIDE;
export const floorDistance=(dx,dy)=>Math.hypot(dx,dy/FLOOR_Y);
export function travelDelta(dx,dy,distance,stopAtTarget=false){const d=floorDistance(dx,dy);if(d<1e-9)return {x:0,y:0};const k=stopAtTarget?Math.min(1,distance/d):distance/d;return {x:dx*k,y:dy*k};}
export function recordMotion(a,dx,dy,dt=1/60){
  const distance=floorDistance(dx,dy),projected=Math.hypot(dx,dy);a.moving=projected>.0001;
  a.gaitSpeed=a.moving?distance/Math.max(dt,1e-6):0;
  if(a.moving){const k=1-Math.exp(-dt/.1);a.gaitPoseSpeed=Number.isFinite(a.gaitPoseSpeed)?a.gaitPoseSpeed+(a.gaitSpeed-a.gaitPoseSpeed)*k:a.gaitSpeed;a.step+=distance*TAU/strideLength(a.gaitPoseSpeed);a.dirX=dx/projected;a.dirY=dy/projected;if(Math.abs(dx)>.001)a.face=dx<0?-1:1;a.back=dy<-Math.abs(dx)*.5;}
}
export function facing(a){if(Number.isFinite(a.dirX)&&Number.isFinite(a.dirY)&&Math.hypot(a.dirX,a.dirY)>.1)return Math.atan2(a.dirY/FLOOR_Y,a.dirX);return a.back?-Math.PI/2:Math.PI/2-(a.face||1)*.22;}
