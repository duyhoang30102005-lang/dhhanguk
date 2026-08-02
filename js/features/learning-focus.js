
window.DhLearningFocus=(()=>{
  const WRONG_KEY='dh-v11-wrong-answer-stats';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function readWrongStats(){
    try{
      return JSON.parse(localStorage.getItem(WRONG_KEY)||'{}');
    }catch{
      return {};
    }
  }

  function writeWrongStats(stats){
    localStorage.setItem(WRONG_KEY,JSON.stringify(stats));
  }

  function recordWrong(cardId){
    if(!cardId)return;
    const stats=readWrongStats();
    const item=stats[cardId]||{count:0,lastWrong:''};
    item.count+=1;
    item.lastWrong=new Date().toISOString();
    stats[cardId]=item;
    writeWrongStats(stats);
  }

  function recordCorrect(cardId){
    if(!cardId)return;
    const stats=readWrongStats();
    const item=stats[cardId];
    if(!item)return;
    item.count=Math.max(0,item.count-1);
    stats[cardId]=item;
    writeWrongStats(stats);
  }

  function allItems(){
    return ctx().getLessons().flatMap(lesson=>
      (lesson.cards||[]).map(card=>({
        lessonId:lesson.id,
        lessonTitle:lesson.title,
        card
      }))
    );
  }

  function favoriteItems(){
    return allItems().filter(item=>item.card.favorite);
  }

  function wrongItems(){
    const wrong=readWrongStats();

    return allItems()
      .map(item=>({
        ...item,
        wrongCount:Number(wrong[item.card.id]?.count||0),
        lastWrong:wrong[item.card.id]?.lastWrong||''
      }))
      .filter(item=>item.wrongCount>0)
      .sort((a,b)=>b.wrongCount-a.wrongCount||String(a.card.ko).localeCompare(String(b.card.ko),'ko'));
  }

  function openCollection(items,emptyMessage){
    const context=ctx();

    if(!items.length){
      alert(emptyMessage);
      return;
    }

    const first=items[0];
    context.openLesson(first.lessonId);

    filteredIds=items
      .filter(item=>item.lessonId===first.lessonId)
      .map(item=>item.card.id);

    position=0;
    render();
  }

  function openFavorites(){
    openCollection(favoriteItems(),'Bạn chưa có từ yêu thích.');
  }

  function openWrongAnswers(){
    openCollection(wrongItems(),'Chưa có từ nào được ghi nhận là trả lời sai.');
  }

  function summary(){
    const wrong=wrongItems();
    const favorites=favoriteItems();
    const all=allItems();
    const checked=all.filter(item=>item.card.checked).length;
    const hard=all.filter(item=>item.card.hard).length;

    return{
      total:all.length,
      checked,
      unchecked:Math.max(0,all.length-checked),
      hard,
      favorites:favorites.length,
      wrong:wrong.length,
      wrongAttempts:wrong.reduce((sum,item)=>sum+item.wrongCount,0)
    };
  }

  function renderSummary(){
    const $=ctx().$;
    const data=summary();

    if($('focusFavoriteCount'))$('focusFavoriteCount').textContent=String(data.favorites);
    if($('focusWrongCount'))$('focusWrongCount').textContent=String(data.wrong);
    if($('focusUncheckedCount'))$('focusUncheckedCount').textContent=String(data.unchecked);
    if($('focusHardCount'))$('focusHardCount').textContent=String(data.hard);
    if($('learningFocusSummary')){
      $('learningFocusSummary').textContent=
        data.wrong?`${data.wrong} từ cần luyện lại`:'Không có lỗi tồn đọng';
    }
  }

  function renderWrongList(){
    const $=ctx().$;
    const items=wrongItems();
    const target=$('wrongAnswerList');

    if(!target)return;

    target.innerHTML=items.length
      ? items.slice(0,50).map(item=>`
        <button class="focus-list-item" data-lesson-id="${item.lessonId}" data-card-id="${item.card.id}">
          <span>
            <b>${item.card.ko}</b>
            <small>${item.card.meaning||'Chưa có nghĩa'} · ${item.lessonTitle}</small>
          </span>
          <strong>${item.wrongCount} lần sai</strong>
        </button>
      `).join('')
      : '<div class="empty">Chưa có từ nào bị trả lời sai.</div>';

    target.querySelectorAll('.focus-list-item').forEach(button=>{
      button.onclick=()=>{
        const context=ctx();
        context.openLesson(button.dataset.lessonId);
        const index=context.getFilteredIds().indexOf(button.dataset.cardId);

        if(index>=0){
          context.setPosition(index);
          render();
        }

        $('learningFocusDialog')?.close();
      };
    });
  }

  function open(){
    const $=ctx().$;
    renderSummary();
    renderWrongList();
    $('learningFocusDialog').showModal();
  }

  return{
    recordWrong,
    recordCorrect,
    favoriteItems,
    wrongItems,
    summary,
    renderSummary,
    openFavorites,
    openWrongAnswers,
    open
  };
})();
