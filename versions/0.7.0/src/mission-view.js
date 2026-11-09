import {careerGoal,careerGoals} from './career.js';
import {goal} from './model.js';
import {diningQuests} from './dining.js';
import {QUESTS} from './growth.js';
// Presentation registry: future chapters can add quests without changing the touch panel.
// Never store translated strings or UI tab/selection in the gameplay save.
export function missionBoard(state,trackedId=null){
  const cards=state.day<2?[]:(state.day>=3?diningQuests(state):QUESTS).map(q=>{
    const value=Math.min(q.max,state.day>=3?q.value():q.value(state)),claimed=(state.day>=3?state.dining.claimed:state.day2.claimed).includes(q.id);
    return {...q,value,claimed,ready:!claimed&&value>=q.max&&(q.id!=='lunch'||state.day2.event.best>=14),progress:value/q.max};
  });
  const personal=careerGoals(state).find(q=>q.id===trackedId&&!state.career.claimed.includes(q.id));
  const tracked=cards.find(q=>q.id===trackedId&&!q.claimed);
  return {cards,ready:cards.filter(q=>q.ready).length,claimed:cards.filter(q=>q.claimed).length,
    active:tracked?{text:tracked.title,value:tracked.value,max:tracked.max,quest:tracked.id}:personal?{text:personal.title,value:personal.value(),max:personal.max,quest:personal.id}:careerGoal(state)||goal(state)};
}
