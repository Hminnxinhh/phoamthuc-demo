// Articulated gait driven by distance actually travelled, never by requested input.
export const STRIDE = 88;
export const STEP_PER_UNIT = Math.PI * 2 / STRIDE;
export function facing(actor){
  if(Number.isFinite(actor.dirX)&&Number.isFinite(actor.dirY)&&Math.hypot(actor.dirX,actor.dirY)>.1)return Math.atan2(actor.dirY,actor.dirX);
  return actor.back?-Math.PI/2:Math.PI/2-(actor.face||1)*.22;
}
export function gaitPose(phase,blend,angle,time=0,action=0){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const foot=(side,offset)=>{
    const p=((phase+offset)%(Math.PI*2)+Math.PI*2)%(Math.PI*2),stance=p<Math.PI,u=stance?p/Math.PI:(p-Math.PI)/Math.PI;
    // During stance, relative displacement cancels root travel exactly. Swing lifts the foot forward.
    const advance=(stance?STRIDE/4-STRIDE/2*u:-STRIDE/4+STRIDE/2*(u*u*(3-2*u)))*blend;
    const lift=(stance?0:Math.sin(u*Math.PI)*5.5)*blend,x=side*7+advance*dx,y=advance*dy-lift;
    return {x,y,kneeX:side*7+advance*dx*.45,kneeY:(-15+y)/2-1.5-lift*.15,grounded:stance};
  };
  return {dx,dy,back:dy<-.38,left:foot(-1,0),right:foot(1,Math.PI),arm:Math.sin(phase)*.43*blend,
    bob:-Math.abs(Math.sin(phase))*1.15*blend+Math.sin(time*1.8)*.18*(1-blend),
    lean:dx*1.5*blend,reach:Math.sin(Math.min(1,Math.max(0,action)/.3)*Math.PI)*2};
}
export class ActorAnimator{
  constructor(){this.actors=new WeakMap();}
  sample(actor,time,dt){
    const target=facing(actor);let m=this.actors.get(actor);
    if(!m){m={angle:target,blend:actor.moving?1:0};this.actors.set(actor,m);}
    const turn=1-Math.exp(-Math.max(0,dt)/.065),fade=1-Math.exp(-Math.max(0,dt)/.075);
    m.angle+=Math.atan2(Math.sin(target-m.angle),Math.cos(target-m.angle))*turn;
    m.blend+=((actor.moving?1:0)-m.blend)*fade;
    return gaitPose(actor.step||0,m.blend,m.angle,time,actor.action||0);
  }
}
// A long planted step must not visually reach through a counter or chair.
export function constrainFoot(actor,foot,solids){
  const hit=k=>solids.some(r=>{const x=actor.x+foot.x*k,y=actor.y+foot.y*k;return x>r.x-3&&x<r.x+r.w+3&&y>r.y-3&&y<r.y+r.h+3;});
  if(!hit(1)||hit(0))return foot;
  let lo=0,hi=1;for(let i=0;i<6;i++){const m=(lo+hi)/2;if(hit(m))hi=m;else lo=m;}
  return {...foot,x:foot.x*lo,y:foot.y*lo,kneeX:foot.kneeX*lo,kneeY:(-15+foot.y*lo)/2-1.5};
}
