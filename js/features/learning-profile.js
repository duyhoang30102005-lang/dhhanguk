
window.DhLearningProfile=(()=>{
  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function cards(){
    return ctx().getLessons().flatMap(lesson=>
      (lesson.cards||[]).map(card=>({
        lessonId:lesson.id,
        lessonTitle:lesson.title,
        card
      }))
    );
  }

  function profile(){
    const items=cards();
    const total=items.length;
    const checked=items.filter(item=>item.card.checked).length;
    const hard=items.filter(item=>item.card.hard).length;
    const favorites=items.filter(item=>item.card.favorite).length;
    const withExamples=items.filter(item=>String(item.card.example_ko||'').trim()).length;
    const due=items.filter(item=>{
      const dueValue=item.card.srs&&item.card.srs.due;
      return dueValue&&new Date(dueValue).getTime()<=Date.now();
    }).length;

    let stage='Mới bắt đầu';
    let advice='Hãy học đều 10–20 từ mỗi ngày và sử dụng nút check khi đã nhớ.';

    const learnedRate=total?checked/total:0;

    if(learnedRate>=0.8){
      stage='Tiến bộ tốt';
      advice='Bạn đã nhớ phần lớn từ hiện có. Hãy tập trung vào từ khó, Quiz và ôn SRS.';
    }else if(learnedRate>=0.4){
      stage='Đang xây nền';
      advice='Tiếp tục học đều và ưu tiên các từ chưa check hoặc đã đánh dấu khó.';
    }else if(total>=30){
      stage='Giai đoạn làm quen';
      advice='Hãy dùng Học thông minh để app chọn các từ cần ưu tiên trước.';
    }

    return{
      total,
      checked,
      hard,
      favorites,
      withExamples,
      due,
      learnedRate:Math.round(learnedRate*100),
      stage,
      advice
    };
  }

  function render(){
    const $=ctx().$;
    const data=profile();

    $('profileStage').textContent=data.stage;
    $('profileAdvice').textContent=data.advice;
    $('profileLearned').textContent=`${data.learnedRate}%`;
    $('profileDue').textContent=String(data.due);
    $('profileHard').textContent=String(data.hard);
    $('profileFavorites').textContent=String(data.favorites);
    $('profileExampleCoverage').textContent=
      data.total?`${Math.round(data.withExamples/data.total*100)}%`:'0%';
  }

  function open(){
    render();
    ctx().$('learningProfileDialog').showModal();
  }

  return{
    profile,
    render,
    open
  };
})();
