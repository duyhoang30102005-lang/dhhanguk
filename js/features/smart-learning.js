
window.DhSmartLearning=(()=>{
  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function allItems(){
    return ctx().getLessons().flatMap(lesson=>
      lesson.cards.map(card=>({
        lessonId:lesson.id,
        lessonTitle:lesson.title,
        card
      }))
    );
  }

  function dueTimestamp(card){
    const value=card.srs&&card.srs.due;
    const timestamp=value?new Date(value).getTime():0;
    return Number.isFinite(timestamp)?timestamp:0;
  }

  function scoreItem(item){
    const card=item.card;
    let score=0;
    const reasons=[];

    if(!card.checked){
      score+=45;
      reasons.push('chưa check');
    }

    if(card.hard){
      score+=35;
      reasons.push('từ khó');
    }

    if(card.favorite){
      score+=8;
    }

    const due=dueTimestamp(card);

    if(due&&due<=Date.now()){
      score+=50;
      reasons.push('đến hạn ôn');
    }

    const lapses=Number(card.srs&&card.srs.lapses||0);

    if(lapses>0){
      score+=Math.min(30,lapses*6);
      reasons.push(`sai ${lapses} lần`);
    }

    if(!String(card.example_ko||'').trim()){
      score+=4;
    }

    return{
      ...item,
      score,
      reasons
    };
  }

  function ranked(){
    return allItems()
      .map(scoreItem)
      .sort((a,b)=>b.score-a.score||String(a.card.ko).localeCompare(String(b.card.ko),'ko'));
  }

  function summary(){
    const items=ranked();

    return{
      total:items.length,
      priority:items.filter(item=>item.score>=40).length,
      due:items.filter(item=>dueTimestamp(item.card)&&dueTimestamp(item.card)<=Date.now()).length,
      hard:items.filter(item=>item.card.hard).length,
      unchecked:items.filter(item=>!item.card.checked).length
    };
  }

  function renderSummary(){
    const $=ctx().$;
    const data=summary();

    if($('smartLearningSummary')){
      $('smartLearningSummary').textContent=
        data.priority?`${data.priority} từ cần ưu tiên`:'Đã ổn định';
    }
  }

  function open(){
    const $=ctx().$;
    const data=summary();
    const items=ranked().filter(item=>item.score>0).slice(0,20);

    $('smartLearningOverview').innerHTML=`
      <article><b>${data.priority}</b><small>Cần ưu tiên</small></article>
      <article><b>${data.due}</b><small>Đến hạn</small></article>
      <article><b>${data.hard}</b><small>Từ khó</small></article>
      <article><b>${data.unchecked}</b><small>Chưa check</small></article>
    `;

    $('smartLearningList').innerHTML=items.length
      ? items.map(item=>`
        <button class="smart-learning-item" data-lesson-id="${item.lessonId}" data-card-id="${item.card.id}">
          <span>
            <b>${item.card.ko}</b>
            <small>${item.card.meaning||'Chưa có nghĩa'} · ${item.lessonTitle}</small>
          </span>
          <span class="smart-learning-score">${item.score}</span>
          <em>${item.reasons.join(' · ')||'cần luyện thêm'}</em>
        </button>
      `).join('')
      : '<div class="empty">Không có từ nào cần ưu tiên lúc này.</div>';

    $('smartLearningList').querySelectorAll('.smart-learning-item').forEach(button=>{
      button.onclick=()=>{
        const context=ctx();
        context.openLesson(button.dataset.lessonId);
        const position=context.getFilteredIds().indexOf(button.dataset.cardId);

        if(position>=0){
          context.setPosition(position);
          render();
        }

        $('smartLearningDialog').close();
      };
    });

    $('smartLearningDialog').showModal();
  }

  function openCollection(predicate){
    const context=ctx();
    const items=ranked().filter(predicate);

    if(!items.length){
      alert('Không có từ phù hợp cho phiên học này.');
      return;
    }

    const first=items[0];
    context.openLesson(first.lessonId);

    filteredIds=items
      .filter(item=>item.lessonId===first.lessonId)
      .map(item=>item.card.id);

    position=0;
    render();
    $('smartLearningDialog').close();
  }

  function startPriority(){
    openCollection(item=>item.score>=40);
  }

  function startDue(){
    openCollection(item=>{
      const due=dueTimestamp(item.card);
      return due&&due<=Date.now();
    });
  }

  function startHard(){
    openCollection(item=>item.card.hard);
  }

  function startUnchecked(){
    openCollection(item=>!item.card.checked);
  }

  return{
    ranked,
    summary,
    renderSummary,
    open,
    startPriority,
    startDue,
    startHard,
    startUnchecked
  };
})();
