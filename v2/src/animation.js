// 3/4 orthographic limb rig. Gameplay/save positions remain projected floor coordinates.
export const RIG=Object.freeze({groundY:.72,heightY:.82,hipHeight:40,ankleHeight:2.4,hipHalfWidth:4.8,thigh:20,shin:20,shoulderY:-51,hemY:-28,headY:-63});
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>t*t*(3-2*t);
export function strideLength(speed=155){return 36+40*smooth(clamp(speed/155,0,1));}
export function stanceFraction(speed=155){return .62-.12*smooth(clamp(speed/155,0,1));}
export const STRIDE=strideLength(155);
export const STEP_PER_UNIT=TAU/STRIDE;
export const floorDistance=(dx,dy)=>Math.hypot(dx,dy/RIG.groundY);
export function travelDelta(dx,dy,distance,stopAtTarget=false){const d=floorDistance(dx,dy);if(d<1e-9)return {x:0,y:0};const k=stopAtTarget?Math.min(1,distance/d):distance/d;return {x:dx*k,y:dy*k};}
export function recordMotion(a,dx,dy,dt=1/60){
  const distance=floorDistance(dx,dy),projected=Math.hypot(dx,dy);a.moving=projected>.0001;
  a.gaitSpeed=a.moving?distance/Math.max(dt,1e-6):0;
  if(a.moving){const k=1-Math.exp(-dt/.1);a.gaitPoseSpeed=Number.isFinite(a.gaitPoseSpeed)?a.gaitPoseSpeed+(a.gaitSpeed-a.gaitPoseSpeed)*k:a.gaitSpeed;a.step+=distance*TAU/strideLength(a.gaitPoseSpeed);a.dirX=dx/projected;a.dirY=dy/projected;if(Math.abs(dx)>.001)a.face=dx<0?-1:1;a.back=dy<-Math.abs(dx)*.5;}
}
export function facing(a){if(Number.isFinite(a.dirX)&&Number.isFinite(a.dirY)&&Math.hypot(a.dirX,a.dirY)>.1)return Math.atan2(a.dirY/RIG.groundY,a.dirX);return a.back?-Math.PI/2:Math.PI/2-(a.face||1)*.22;}
const project=p=>({x:p.x,y:p.y*RIG.groundY-p.z*RIG.heightY});
const length=v=>Math.hypot(v.x,v.y,v.z),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
// Solve in 3D before projection: neither bone is stretched to reach a screen-space target.
export function solveLeg(hip,target,forward){
  let dvec={x:target.x-hip.x,y:target.y-hip.y,z:target.z-hip.z},d=length(dvec);
  const maximum=RIG.thigh+RIG.shin-.08,minimum=Math.abs(RIG.thigh-RIG.shin)+.01;
  const reach=clamp(d,minimum,maximum),n=d>1e-9?{x:dvec.x/d,y:dvec.y/d,z:dvec.z/d}:{x:0,y:0,z:-1};
  const ankle={x:hip.x+n.x*reach,y:hip.y+n.y*reach,z:hip.z+n.z*reach};
  const along=(RIG.thigh**2-RIG.shin**2+reach**2)/(2*reach),height=Math.sqrt(Math.max(0,RIG.thigh**2-along**2));
  let bend={x:forward.x-n.x*dot(forward,n),y:forward.y-n.y*dot(forward,n),z:forward.z-n.z*dot(forward,n)},bl=length(bend);
  if(bl<1e-6){bend={x:-n.y,y:n.x,z:0};bl=length(bend)||1;}
  const knee={x:hip.x+n.x*along+bend.x/bl*height,y:hip.y+n.y*along+bend.y/bl*height,z:hip.z+n.z*along+bend.z/bl*height};
  const h=project(hip),k=project(knee),f=project(ankle);
  return {x:f.x,y:f.y,hipX:h.x,hipY:h.y,kneeX:k.x,kneeY:k.y,hip3:hip,knee3:knee,ankle3:ankle,forward,reachLimited:d>maximum};
}
export function gaitPose(phase,blend,angle,time=0,action=0,speed=155){
  const dx=Math.cos(angle),dy=Math.sin(angle),forward={x:dx,y:dy,z:0},right={x:dy,y:-dx,z:0},stride=strideLength(speed),stance=stanceFraction(speed),bob=(1.5+3*clamp(speed/155,0,1))*RIG.heightY*blend+Math.cos(phase*2)*.35*blend;
  const foot=(side,offset)=>{
    const u=(((phase+offset)%TAU+TAU)%TAU)/TAU,grounded=u<stance,span=stride*stance,half=span/2;
    let advance,lift=0;
    if(grounded)advance=half-stride*u;
    else{
      const t=(u-stance)/(1-stance),t2=t*t,t3=t2*t,m=-stride*(1-stance);
      // Contact and toe-off have matching first derivatives; no reversal/reset at cycle seams.
      advance=(2*t3-3*t2+1)*(-half)+(t3-2*t2+t)*m+(-2*t3+3*t2)*half+(t3-t2)*m;
      lift=(2.5+3*clamp(speed/155,0,1))*16*t2*(1-t)*(1-t);
    }
    const hip={x:right.x*side*RIG.hipHalfWidth,y:right.y*side*RIG.hipHalfWidth,z:RIG.hipHeight-bob/RIG.heightY};
    const target={x:hip.x+forward.x*advance*blend,y:hip.y+forward.y*advance*blend,z:RIG.ankleHeight+lift*blend};
    return {...solveLeg(hip,target,forward),grounded,phase:u,advance:advance*blend,lift:lift*blend};
  };
  return {dx,dy,back:dy<-.38,left:foot(-1,0),right:foot(1,Math.PI),bodyWidth:.86+.14*Math.abs(dy),arm:Math.sin(phase)*.34*blend,bob:bob+Math.sin(time*1.8)*.13*(1-blend),lean:dx*.8*blend,reach:Math.sin(Math.min(1,Math.max(0,action)/.3)*Math.PI)*1.8,stride,stance};
}
export class ActorAnimator{
  constructor(){this.actors=new WeakMap();}
  sample(a,time,dt){
    const target=facing(a);let m=this.actors.get(a);
    if(!m){m={angle:target,blend:0,locks:{},lastX:a.x,lastY:a.y};this.actors.set(a,m);}
    const turn=1-Math.exp(-Math.max(0,dt)/.065),fade=1-Math.exp(-Math.max(0,dt)/.075);
    m.angle+=Math.atan2(Math.sin(target-m.angle),Math.cos(target-m.angle))*turn;m.blend+=((a.moving?1:0)-m.blend)*fade;
    const measured=dt>0?floorDistance(a.x-m.lastX,a.y-m.lastY)/dt:0,speed=Number.isFinite(a.gaitPoseSpeed)?a.gaitPoseSpeed:(!a.moving?m.lastSpeed||0:Number.isFinite(a.gaitSpeed)?a.gaitSpeed:measured||155);m.lastSpeed=speed;
    let pose=gaitPose(a.step||0,m.blend,m.angle,time,a.action||0,speed);
    for(const side of ['left','right']){
      let f=pose[side];
      if(a.moving&&m.blend>.85&&f.grounded){
        let lock=m.locks[side];if(!lock)lock=m.locks[side]={x:a.x+f.ankle3.x,y:a.y+f.ankle3.y*RIG.groundY};
        const anchored={x:lock.x-a.x,y:(lock.y-a.y)/RIG.groundY,z:RIG.ankleHeight},solved=solveLeg(f.hip3,anchored,f.forward);
        if(!solved.reachLimited)pose[side]={...solved,grounded:true,anchored:true,phase:f.phase};else m.locks[side]=null;
      }else m.locks[side]=null;
    }
    m.lastX=a.x;m.lastY=a.y;return pose;
  }
}
// Foot targets avoid furniture, then the IK is solved again; never scale/stretch bones.
export function constrainFoot(a,f,solids){
  if(!f.ankle3)return f;
  const hit=k=>solids.some(r=>{const x=a.x+f.ankle3.x*k,y=a.y+f.ankle3.y*RIG.groundY*k;return x>r.x-3&&x<r.x+r.w+3&&y>r.y-3&&y<r.y+r.h+3;});
  if(!hit(1)||hit(0))return f;
  let lo=0,hi=1;for(let i=0;i<8;i++){const mid=(lo+hi)/2;if(hit(mid))hi=mid;else lo=mid;}
  return {...solveLeg(f.hip3,{x:f.ankle3.x*lo,y:f.ankle3.y*lo,z:f.ankle3.z},f.forward),grounded:f.grounded,obstacleLimited:true};
}
