// A successful checkbox action completes this lesson, independently of the health threshold.
export function autoPotionLearned(state){return !!(state.tutorial?.autoPotionLearned||state.tutorial?.autoHealLessonVersion>=2||state.autoItems?.potion?.enabled);}
export function rememberAutoPotionLesson(store){if(store.state.tutorial?.autoPotionLearned||!autoPotionLearned(store.state))return;store.transact(store.newId('auto-potion-lesson'),s=>{s.tutorial||={};s.tutorial.autoPotionLearned=true;});}
