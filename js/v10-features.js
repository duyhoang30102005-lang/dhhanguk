
window.DhV10=(()=>{
  const QUIZ_HISTORY='dh-v10-quiz-history';
  const CHALLENGE='dh-v10-challenge';

  function localDateKey(date=new Date()){
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,'0');
    const day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function getQuizHistory(){
    try{
      return JSON.parse(localStorage.getItem(QUIZ_HISTORY)||'[]');
    }catch{
      return [];
    }
  }

  function saveQuizResult(result){
    const history=getQuizHistory();

    history.unshift({
      date:new Date().toISOString(),
      score:Number(result.score||0),
      total:Number(result.total||0),
      mode:result.mode||'all',
      accuracy:Number(result.accuracy||0),
      bestCombo:Number(result.bestCombo||0)
    });

    localStorage.setItem(QUIZ_HISTORY,JSON.stringify(history.slice(0,30)));
  }

  function modeLabel(mode){
    return {
      all:'Tất cả từ',
      lesson:'Bài hiện tại',
      review:'Chưa thuộc',
      favorite:'Yêu thích',
      hard:'Từ khó'
    }[mode]||mode;
  }

  function renderQuizHistory(container){
    if(!container)return;

    const history=getQuizHistory().slice(0,5);

    if(!history.length){
      container.innerHTML='<div class="empty">Chưa có lịch sử Quiz.</div>';
      return;
    }

    container.innerHTML=history.map(item=>{
      const date=new Date(item.date).toLocaleString('vi-VN',{
        day:'2-digit',
        month:'2-digit',
        hour:'2-digit',
        minute:'2-digit'
      });

      return `
        <article class="quiz-history-item">
          <div>
            <b>${item.score}/${item.total}</b>
            <small>${modeLabel(item.mode)} · ${date}</small>
          </div>
          <div>
            <span>${item.accuracy}%</span>
            <small>Combo ${item.bestCombo}</small>
          </div>
        </article>
      `;
    }).join('');
  }

  function activitySummary(days=30){
    let log={};

    try{
      log=JSON.parse(localStorage.getItem('km-activity-log')||'{}');
    }catch{}

    let study=0;
    let quiz=0;
    let ocr=0;
    let activeDays=0;

    for(let offset=0;offset<days;offset++){
      const date=new Date();
      date.setDate(date.getDate()-offset);

      const item=log[localDateKey(date)];

      if(item){
        const total=(item.study||0)+(item.quiz||0)+(item.ocr||0);

        if(total>0)activeDays+=1;

        study+=item.study||0;
        quiz+=item.quiz||0;
        ocr+=item.ocr||0;
      }
    }

    return {study,quiz,ocr,activeDays,total:study+quiz+ocr};
  }

  function dailyChallenge(){
    const today=localDateKey();
    let data={};

    try{
      data=JSON.parse(localStorage.getItem(CHALLENGE)||'{}');
    }catch{}

    if(data.date!==today){
      data={date:today,target:20,claimed:false};
      localStorage.setItem(CHALLENGE,JSON.stringify(data));
    }

    return data;
  }

  function challengeProgress(){
    const challenge=dailyChallenge();
    let log={};

    try{
      log=JSON.parse(localStorage.getItem('km-activity-log')||'{}');
    }catch{}

    const item=log[challenge.date]||{};
    const current=(item.study||0)+(item.quiz||0);

    return {
      ...challenge,
      current,
      percent:Math.min(100,Math.round(current/challenge.target*100)),
      complete:current>=challenge.target
    };
  }

  function claimChallenge(){
    const state=challengeProgress();

    if(!state.complete)return false;

    localStorage.setItem(
      CHALLENGE,
      JSON.stringify({
        date:state.date,
        target:state.target,
        claimed:true
      })
    );

    if(window.DhV9)DhV9.addXp(50);

    return true;
  }

  return {
    getQuizHistory,
    saveQuizResult,
    renderQuizHistory,
    activitySummary,
    challengeProgress,
    claimChallenge
  };
})();
