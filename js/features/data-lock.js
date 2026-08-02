
window.DhDataLock=(()=>{
  const EXPECTED={
    "card-24":"nê / a ni yô",
    "card-26":"tràn hoa bon hô",
    "card-38":"yò hêng an lê uôn"
  };

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function flattenLessons(){
    return ctx().getLessons().flatMap(lesson=>lesson.cards||[]);
  }

  function verify(){
    const cards=flattenLessons();
    const byId=new Map(cards.map(card=>[card.id,card]));
    const checks=Object.entries(EXPECTED).map(([id,expected])=>{
      const card=byId.get(id);
      return{
        id,
        expected,
        actual:card&&card.pron||'',
        ok:Boolean(card&&card.pron===expected)
      };
    });

    return{
      ok:checks.every(item=>item.ok),
      checks,
      total:cards.length
    };
  }

  function renderStatus(){
    const $=ctx().$;
    const report=verify();
    const target=$('dataLockStatus');

    if(target){
      target.textContent=report.ok
        ? `Đã khóa dữ liệu · ${report.total} từ`
        : 'Cảnh báo: phiên âm chưa khớp';
      target.classList.toggle('warning',!report.ok);
    }

    return report;
  }

  function open(){
    const $=ctx().$;
    const report=renderStatus();

    $('dataLockResults').innerHTML=`
      <div class="data-lock-overview ${report.ok?'healthy':'warning'}">
        <b>${report.ok?'✅ Phiên âm đang đúng':'⚠️ Phát hiện phiên âm không khớp'}</b>
        <span>${report.total} từ đang được tải trong ứng dụng</span>
      </div>
      <div class="data-lock-checks">
        ${report.checks.map(item=>`
          <article class="${item.ok?'ok':'bad'}">
            <b>${item.id}</b>
            <small>Mong đợi: ${item.expected}</small>
            <small>Đang hiển thị: ${item.actual||'(trống)'}</small>
          </article>
        `).join('')}
      </div>
      <p class="backup-note">
        Bản V11.1 dùng đúng cards.json và lessons.json bạn vừa gửi.
      </p>
    `;

    $('dataLockDialog').showModal();
  }

  return{
    verify,
    renderStatus,
    open
  };
})();
