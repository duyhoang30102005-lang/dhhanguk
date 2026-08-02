
window.DhGlobalSearch=(()=>{
  const FILTER_KEY='dh-global-search-filter';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function pool(){
    return ctx().getLessons().flatMap(item=>
      item.cards.map(card=>({
        lessonId:item.id,
        lessonTitle:item.title,
        lessonBook:item.book,
        card
      }))
    );
  }

  function matches(card,query){
    if(window.DhV9)return DhV9.smartSearchMatch(card,query);

    return `${card.ko} ${card.pron} ${card.meaning}`
      .toLowerCase()
      .includes(String(query||'').toLowerCase());
  }

  function render(){
    const context=ctx();
    const $=context.$;
    const query=$('globalSearchInput').value.trim();
    const filter=localStorage.getItem(FILTER_KEY)||'all';
    const lessonFilter=$('globalSearchLesson')?.value||'all';
    const sort=$('globalSearchSort')?.value||'relevance';
    const resultsContainer=$('globalSearchResults');

    if(!query){
      $('globalSearchCount').textContent='Nhập từ khóa để tìm.';
      resultsContainer.innerHTML='<div class="empty">Bạn có thể tìm tiếng Hàn, tiếng Việt, phiên âm hoặc nội dung ví dụ.</div>';
      return;
    }

    let results=pool().filter(item=>matches(item.card,query));

    if(filter==='favorites')results=results.filter(item=>item.card.favorite);
    if(filter==='hard')results=results.filter(item=>item.card.hard);
    if(filter==='unchecked')results=results.filter(item=>!item.card.checked);
    if(lessonFilter!=='all')results=results.filter(item=>item.lessonId===lessonFilter);

    if(sort==='korean'){
      results.sort((a,b)=>String(a.card.ko||'').localeCompare(String(b.card.ko||''),'ko'));
    }else if(sort==='meaning'){
      results.sort((a,b)=>String(a.card.meaning||'').localeCompare(String(b.card.meaning||''),'vi'));
    }else if(sort==='lesson'){
      results.sort((a,b)=>String(a.lessonTitle||'').localeCompare(String(b.lessonTitle||''),'vi'));
    }

    $('globalSearchCount').textContent=`Tìm thấy ${results.length} kết quả`;

    if(!results.length){
      resultsContainer.innerHTML='<div class="empty">Không tìm thấy từ phù hợp.</div>';
      return;
    }

    resultsContainer.innerHTML=results.slice(0,100).map(item=>`
      <button class="global-search-result" data-lesson-id="${item.lessonId}" data-card-id="${item.card.id}">
        <span class="global-search-word">${item.card.ko}</span>
        <span class="global-search-meaning">${item.card.meaning||'Chưa có nghĩa'}</span>
        <small>${item.lessonTitle}${item.lessonBook?` · ${item.lessonBook}`:''}</small>
        <span class="global-search-flags">${item.card.favorite?'❤️ ':''}${item.card.hard?'⭐ ':''}${item.card.checked?'✅':''}</span>
      </button>
    `).join('');

    resultsContainer.querySelectorAll('.global-search-result').forEach(button=>{
      button.onclick=()=>{
        context.openLesson(button.dataset.lessonId);

        const index=context.getFilteredIds().indexOf(button.dataset.cardId);

        if(index>=0){
          context.setPosition(index);
          render();
        }

        $('globalSearchDialog').close();
      };
    });
  }

  function open(){
    const $=ctx().$;
    $('globalSearchInput').value='';

    if($('globalSearchLesson')){
      $('globalSearchLesson').innerHTML=
        '<option value="all">Tất cả bài học</option>'+
        ctx().getLessons().map(item=>`<option value="${item.id}">${item.title}</option>`).join('');
    }
    const filter=localStorage.getItem(FILTER_KEY)||'all';

    document.querySelectorAll('[data-global-filter]').forEach(button=>{
      button.classList.toggle('active',button.dataset.globalFilter===filter);
    });

    render();
    $('globalSearchDialog').showModal();
    setTimeout(()=>$('globalSearchInput').focus(),60);
  }

  function setFilter(filter){
    localStorage.setItem(FILTER_KEY,filter);
  }

  return{
    render,
    open,
    setFilter
  };
})();
