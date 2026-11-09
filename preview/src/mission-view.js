import{currentVenue,venueProjects}from'./venues.js';
import {careerGoal,careerGoals} from './career.js';
import {goal} from './model.js';
import {diningQuests} from './dining.js';
import {QUESTS} from './growth.js';
// Presentation registry: future chapters can add quests without changing the touch panel.
// Never store translated strings or UI tab/selection in the gameplay save.
export function missionBoard(state,trackedId=null){
  const venue=currentVenue(state).id,isDining=venue==='dining';const cards=state.day<2||venue==='home'?[]:(isDining?diningQuests(state):QUESTS).map(q=>{
    const value=Math.min(q.max,isDining?q.value():q.value(state)),claimed=(isDining?state.dining.claimed:state.day2.claimed).includes(q.id);
    return {...q,value,claimed,ready:!claimed&&value>=q.max&&(q.id!=='lunch'||state.day2.event.best>=14),progress:value/q.max};
  });
  const personal=careerGoals(state).find(q=>q.id===trackedId&&!state.career.claimed.includes(q.id));
  const tracked=cards.find(q=>q.id===trackedId&&!q.claimed);
  const project=venueProjects(state,venue).find(q=>!q.claimed),local=project?{text:project.title,value:project.value,max:project.max,quest:project.id}:null;
  return {cards,ready:cards.filter(q=>q.ready).length,claimed:cards.filter(q=>q.claimed).length,
    active:tracked?{text:tracked.title,value:tracked.value,max:tracked.max,quest:tracked.id}:personal?{text:personal.title,value:personal.value(),max:personal.max,quest:personal.id}:venue==='home'&&state.day===1?goal(state):local||careerGoal(state)||goal(state)};
}
