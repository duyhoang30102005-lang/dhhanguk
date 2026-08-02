
window.DhWordEditor=(()=>{
  const DRAFT_KEY='dh-word-editor-draft';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function fieldIds(){
    return[
      'fieldKo',
      'fieldPron',
      'fieldMeaning',
      'fieldExampleKo',
      'fieldExampleVi',
      'fieldTip',
      'fieldDialogKo',
      'fieldDialogVi'
    ];
  }

  function values(){
    const $=ctx().$;
    return{
      lessonId:$('fieldLesson')?.value||'',
      ko:$('fieldKo')?.value.trim()||'',
      pron:$('fieldPron')?.value.trim()||'',
      meaning:$('fieldMeaning')?.value.trim()||'',
      example_ko:$('fieldExampleKo')?.value.trim()||'',
      example_vi:$('fieldExampleVi')?.value.trim()||'',
      tip:$('fieldTip')?.value.trim()||'',
      dialog_ko:$('fieldDialogKo')?.value.trim()||'',
      dialog_vi:$('fieldDialogVi')?.value.trim()||''
    };
  }

  function saveDraft(){
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...values(),
        savedAt:new Date().toISOString()
      })
    );
    renderDraftStatus('Đã lưu nháp');
  }

  function getDraft(){
    try{
      return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    }catch{
      return null;
    }
  }

  function clearDraft(){
    localStorage.removeItem(DRAFT_KEY);
    renderDraftStatus('Không có bản nháp');
  }

  function renderDraftStatus(text){
    const target=ctx().$('editorDraftStatus');
    if(target)target.textContent=text;
  }

  function restoreDraft(){
    const $=ctx().$;
    const draft=getDraft();

    if(!draft){
      alert('Không có bản nháp để khôi phục.');
      return;
    }

    $('fieldLesson').value=draft.lessonId||$('fieldLesson').value;
    $('fieldKo').value=draft.ko||'';
    $('fieldPron').value=draft.pron||'';
    $('fieldMeaning').value=draft.meaning||'';
    $('fieldExampleKo').value=draft.example_ko||'';
    $('fieldExampleVi').value=draft.example_vi||'';
    $('fieldTip').value=draft.tip||'';
    $('fieldDialogKo').value=draft.dialog_ko||'';
    $('fieldDialogVi').value=draft.dialog_vi||'';

    updatePreview();
    renderDraftStatus('Đã khôi phục bản nháp');
  }

  function allCards(){
    return ctx().getLessons().flatMap(lesson=>
      (lesson.cards||[]).map(card=>({
        lessonId:lesson.id,
        lessonTitle:lesson.title,
        card
      }))
    );
  }

  function duplicateMatches(){
    const data=values();
    const normalizedKo=String(data.ko).trim().toLowerCase();

    if(!normalizedKo)return[];

    return allCards().filter(item=>
      String(item.card.ko||'').trim().toLowerCase()===normalizedKo
    );
  }

  function renderDuplicateWarning(){
    const target=ctx().$('editorDuplicateWarning');
    if(!target)return;

    const duplicates=duplicateMatches();

    if(!duplicates.length){
      target.textContent='';
      target.hidden=true;
      return;
    }

    target.hidden=false;
    target.textContent=`⚠️ Đã có ${duplicates.length} từ trùng: ${duplicates.map(item=>item.lessonTitle).join(', ')}`;
  }

  function updatePreview(){
    const $=ctx().$;
    const data=values();

    $('editorPreviewKo').textContent=data.ko||'단어';
    $('editorPreviewPron').textContent=data.pron||'Phiên âm';
    $('editorPreviewMeaning').textContent=data.meaning||'Nghĩa tiếng Việt';
    $('editorPreviewExampleKo').textContent=data.example_ko||'Ví dụ tiếng Hàn';
    $('editorPreviewExampleVi').textContent=data.example_vi||'Dịch ví dụ';

    renderDuplicateWarning();
  }

  function bind(){
    const $=ctx().$;

    for(const id of fieldIds()){
      $(id)?.addEventListener('input',()=>{
        updatePreview();
        window.clearTimeout(bind.timer);
        bind.timer=window.setTimeout(saveDraft,500);
      });
    }

    $('fieldLesson')?.addEventListener('change',saveDraft);
    $('restoreEditorDraft')?.addEventListener('click',restoreDraft);
    $('clearEditorDraft')?.addEventListener('click',clearDraft);
  }

  function open(){
    updatePreview();
    const draft=getDraft();

    renderDraftStatus(
      draft
        ? `Có bản nháp lúc ${new Date(draft.savedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}`
        : 'Không có bản nháp'
    );
  }

  function saved(){
    clearDraft();
  }

  return{
    bind,
    open,
    saved,
    saveDraft,
    clearDraft,
    restoreDraft,
    updatePreview,
    duplicateMatches
  };
})();
