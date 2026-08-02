
window.DhV11Dashboard=(()=>{
  const WEEKLY_GOAL_KEY='dh-v11-weekly-goal';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function activityLog(){
    try{
      return JSON.parse(localStorage.getItem('km-activity-log')||'{}');
    }catch{
      return {};
    }
  }

  function weeklyGoal(){
    const saved=Number(localStorage.getItem(WEEKLY_GOAL_KEY)||100);
    return Number.isFinite(saved)&&saved>0?saved:100;
  }

  function setWeeklyGoal(value){
    const goal=Math.max(10,Math.min(1000,Number(value)||100));
    localStorage.setItem(WEEKLY_GOAL_KEY,String(goal));
    return goal;
  }

  function localDateKey(date=new Date()){
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,'0');
    const day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }

  function lastSevenDays(){
    const log=activityLog();
    const days=[];

    for(let offset=6;offset>=0;offset--){
      const date=new Date();
      date.setDate(date.getDate()-offset);
      const key=localDateKey(date);
      const item=log[key]||{};
      const study=Number(item.study||0);
      const quiz=Number(item.quiz||0);
      const ocr=Number(item.ocr||0);

      days.push({
        key,
        label:date.toLocaleDateString('vi-VN',{weekday:'short'}),
        study,
        quiz,
        ocr,
        total:study+quiz+ocr
      });
    }

    return days;
  }

  function lessonProgress(){
    return ctx().getLessons().map(lesson=>{
      const cards=Array.isArray(lesson.cards)?lesson.cards:[];
      const learned=cards.filter(card=>card.checked).length;
      const percent=cards.length?Math.round(learned/cards.length*100):0;

      return{
        id:lesson.id,
        title:lesson.title,
        total:cards.length,
        learned,
        percent
      };
    });
  }

  function summary(){
    const days=lastSevenDays();
    const weeklyTotal=days.reduce((sum,day)=>sum+day.total,0);
    const activeDays=days.filter(day=>day.total>0).length;
    const goal=weeklyGoal();
    const lessons=lessonProgress();

    return{
      days,
      weeklyTotal,
      activeDays,
      goal,
      goalPercent:Math.min(100,Math.round(weeklyTotal/goal*100)),
      completedLessons:lessons.filter(item=>item.total>0&&item.percent===100).length,
      lessons
    };
  }

  function render(){
    const $=ctx().$;
    const data=summary();

    if($('weeklyGoalText')){
      $('weeklyGoalText').textContent=`${data.weeklyTotal} / ${data.goal} hoạt động`;
    }

    if($('weeklyGoalBar')){
      $('weeklyGoalBar').style.width=`${data.goalPercent}%`;
    }

    if($('weeklyActiveDays')){
      $('weeklyActiveDays').textContent=String(data.activeDays);
    }

    if($('weeklyCompletedLessons')){
      $('weeklyCompletedLessons').textContent=String(data.completedLessons);
    }

    if($('weeklyActivityTotal')){
      $('weeklyActivityTotal').textContent=String(data.weeklyTotal);
    }

    const chart=$('weeklyActivityChart');

    if(chart){
      const max=Math.max(1,...data.days.map(day=>day.total));

      chart.innerHTML=data.days.map(day=>`
        <article class="weekly-bar-item" title="${day.total} hoạt động">
          <div class="weekly-bar-track">
            <span style="height:${Math.max(day.total?10:0,Math.round(day.total/max*100))}%"></span>
          </div>
          <b>${day.total}</b>
          <small>${day.label}</small>
        </article>
      `).join('');
    }

    const lessonList=$('lessonProgressList');

    if(lessonList){
      lessonList.innerHTML=data.lessons.length
        ? data.lessons.map(item=>`
          <button class="lesson-progress-item" data-lesson-id="${item.id}">
            <div>
              <b>${item.title}</b>
              <small>${item.learned}/${item.total} từ đã check</small>
            </div>
            <div class="lesson-progress-value">${item.percent}%</div>
            <span class="lesson-progress-track"><i style="width:${item.percent}%"></i></span>
          </button>
        `).join('')
        : '<div class="empty">Chưa có bài học.</div>';

      lessonList.querySelectorAll('.lesson-progress-item').forEach(button=>{
        button.onclick=()=>{
          ctx().openLesson(button.dataset.lessonId);
          $('progressDialog')?.close();
        };
      });
    }
  }

  function openProgress(){
    render();
    ctx().$('progressDialog').showModal();
  }

  function saveGoal(){
    const $=ctx().$;
    setWeeklyGoal($('weeklyGoalInput').value);
    render();
    $('weeklyGoalInput').value=String(weeklyGoal());
  }

  function openGoal(){
    const $=ctx().$;
    $('weeklyGoalInput').value=String(weeklyGoal());
    $('weeklyGoalDialog').showModal();
  }

  return{
    summary,
    render,
    openProgress,
    saveGoal,
    openGoal
  };
})();
