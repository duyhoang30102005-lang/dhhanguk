
window.DhDataHealth=(()=>{
  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function inspect(){
    const lessons=ctx().getLessons();
    const issues=[];
    const lessonIds=new Set();
    const cardIds=new Set();

    let totalCards=0;
    let missingMeanings=0;
    let missingKorean=0;
    let duplicateCards=0;

    lessons.forEach((item,lessonIndex)=>{
      if(!item.id)issues.push(`Bài học thứ ${lessonIndex+1} thiếu ID.`);
      if(item.id&&lessonIds.has(item.id))issues.push(`Trùng ID bài học: ${item.id}`);
      if(item.id)lessonIds.add(item.id);
      if(!item.title)issues.push(`Bài học ${item.id||lessonIndex+1} thiếu tên.`);

      if(!Array.isArray(item.cards)){
        issues.push(`Bài học ${item.title||item.id} không có danh sách cards hợp lệ.`);
        return;
      }

      item.cards.forEach((card,cardIndex)=>{
        totalCards+=1;

        if(!card.id)issues.push(`Từ thứ ${cardIndex+1} trong ${item.title} thiếu ID.`);
        if(card.id&&cardIds.has(card.id))duplicateCards+=1;
        if(card.id)cardIds.add(card.id);
        if(!String(card.ko||'').trim())missingKorean+=1;
        if(!String(card.meaning||'').trim())missingMeanings+=1;
      });
    });

    if(duplicateCards)issues.push(`${duplicateCards} ID flashcard bị trùng.`);
    if(missingKorean)issues.push(`${missingKorean} flashcard thiếu từ tiếng Hàn.`);
    if(missingMeanings)issues.push(`${missingMeanings} flashcard thiếu nghĩa.`);

    return{
      issues,
      totalLessons:lessons.length,
      totalCards
    };
  }

  function open(){
    const $=ctx().$;
    const report=inspect();
    const healthy=!report.issues.length;

    $('dataHealthSummary').textContent=
      healthy?'Dữ liệu tốt':`${report.issues.length} cảnh báo`;

    $('dataHealthResults').innerHTML=`
      <div class="data-health-overview ${healthy?'healthy':'warning'}">
        <b>${healthy?'✅ Dữ liệu đang ổn':'⚠️ Có cảnh báo cần xem'}</b>
        <span>${report.totalLessons} bài học · ${report.totalCards} flashcard</span>
      </div>
      ${
        healthy
          ? '<p>Không phát hiện ID trùng, bài học hỏng hoặc flashcard thiếu trường bắt buộc.</p>'
          : `<ul>${report.issues.map(issue=>`<li>${issue}</li>`).join('')}</ul>`
      }
      <p class="backup-note">Nên xuất một bản sao lưu trước khi sửa hoặc xóa nhiều dữ liệu.</p>
    `;

    $('dataHealthDialog').showModal();
  }

  return{
    inspect,
    open
  };
})();
