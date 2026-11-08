import {facing} from './motion.js';
// Chibi cutout animation. One short rounded leg per side; no knees, IK or foot locks.
export const CHIBI=Object.freeze({headY:-38,headRadius:16,shoulderY:-27,hemY:-9,hipY:-10,hipWidth:5.5,legLength:10,maxKick:3,maxLift:2.8});
const TAU=Math.PI*2;
export function chibiPose(phase,blend,angle,time=0,action=0){
  const dx=Math.cos(angle),dy=Math.sin(angle),sway=Math.sin(phase),pulse=Math.cos(phase*2);
  const foot=(side,offset)=>{
    const p=phase+offset,kick=Math.sin(p)*CHIBI.maxKick*blend,lift=Math.max(0,Math.cos(p))**2*CHIBI.maxLift*blend;
    const hipX=side*CHIBI.hipWidth,hipY=CHIBI.hipY;
    return {hipX,hipY,x:hipX+dx*kick,y:dy*kick*.45-lift,lift,roll:Math.sin(p)*.16*blend};
  };
  return {dx,dy,back:dy<-.38,left:foot(-1,0),right:foot(1,Math.PI),
    bodyWidth:.94+.06*Math.abs(dy),sway:sway*.65*blend,bob:-(1-pulse)*.65*blend+Math.sin(time*1.8)*.18*(1-blend),
    squashX:1+pulse*.018*blend,squashY:1-pulse*.018*blend,tilt:dx*sway*.018*blend,
    arm:sway*.26*blend,reach:Math.sin(Math.min(1,Math.max(0,action)/.3)*Math.PI)*1.6,blend};
}
export class ActorAnimator{
  constructor(){this.actors=new WeakMap();}
  sample(actor,time,dt){
    const target=facing(actor);let memo=this.actors.get(actor);
    if(!memo){memo={angle:target,blend:0};this.actors.set(actor,memo);}
    // Phase comes only from actual post-collision travel. Pointer events never reset it.
    const turn=1-Math.exp(-Math.max(0,dt)/.065),fade=1-Math.exp(-Math.max(0,dt)/.085);
    memo.angle+=Math.atan2(Math.sin(target-memo.angle),Math.cos(target-memo.angle))*turn;
    memo.blend+=((actor.moving?1:0)-memo.blend)*fade;
    return chibiPose((actor.step||0)%TAU,memo.blend,memo.angle,time,actor.action||0);
  }
}
