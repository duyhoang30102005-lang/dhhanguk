
window.DhDataSourceInfo=(()=>{
  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function open(){
    const $=ctx().$;
    const lessons=ctx().getLessons();
    const cards=lessons.flatMap(item=>item.cards||[]);
    const nurse=cards.find(card=>card.id==='card-41');

    $('dataSourceResults').innerHTML=`
      <div class="data-source-card">
        <b>✅ Dữ liệu nguồn đã đồng bộ từ backup</b>
        <span>${lessons.length} bài học · ${cards.length} từ</span>
      </div>
      <p><b>간호사:</b> ${nurse?.pron||'(không tìm thấy)'}</p>
      <p class="backup-note">
        Khi cập nhật bản mới, dữ liệu trong trình duyệt được ưu tiên.
        Source chỉ bổ sung bài hoặc từ mới, không ghi đè phiên âm bạn đã sửa.
      </p>
    `;

    $('dataSourceDialog').showModal();
  }

  return{open};
})();
