
window.DhContinueLearning=(()=>{
  const STORAGE_KEY='dh-last-study';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function getLastStudy(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    }catch{
      return null;
    }
  }

  function rememberStudyPosition(){
    const context=ctx();
    const card=context.getCurrentCard();
    const lessonId=context.getCurrentLessonId();

    if(!lessonId||!card)return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lessonId,
        cardId:card.id,
        savedAt:new Date().toISOString()
      })
    );
  }

  function continueLearning(){
    const context=ctx();
    const lessons=context.getLessons();
    const saved=getLastStudy();
    const targetLesson=saved&&lessons.find(item=>item.id===saved.lessonId);

    if(!targetLesson){
      const first=lessons[0];

      if(!first){
        alert('Chưa có bài học để tiếp tục.');
        return;
      }

      context.openLesson(first.id);
      return;
    }

    context.openLesson(targetLesson.id);

    const cardIndex=context.getFilteredIds().indexOf(saved.cardId);

    if(cardIndex>=0){
      context.setPosition(cardIndex);
      render();
    }
  }

  return{
    getLastStudy,
    rememberStudyPosition,
    continueLearning
  };
})();
