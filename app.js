
const DB='korean-master-v2-db',LESSONS='lessons';let db,lessons=[],currentLessonId=null,filteredIds=[],position=0,adding=false,listMode='all';
const $=id=>document.getElementById(id);const allCards=()=>lessons.flatMap(l=>l.cards.map(c=>({...c,lessonId:l.id,lessonTitle:l.title})));
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(id).classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(LESSONS))r.result.createObjectStore(LESSONS,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function store(mode='readonly'){return db.transaction(LESSONS,mode).objectStore(LESSONS)}
function getAllLessons(){return new Promise((res,rej)=>{const r=store().getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function putLesson(l){return new Promise((res,rej)=>{const r=store('readwrite').put(l);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function putAllLessons(list){return Promise.all(list.map(putLesson))}
function deleteLessonRecord(id){
  return new Promise((res,rej)=>{
    const r=store('readwrite').delete(id);
    r.onsuccess=()=>res();
    r.onerror=()=>rej(r.error);
  });
}
async function init(){
db=await openDB();
lessons=await getAllLessons();
if(!lessons.length){
const response=await fetch('lessons.json',{cache:'no-store'});
if(!response.ok)throw new Error(`Không tải được lessons.json (${response.status})`);
const contentType=response.headers.get('content-type')||'';
if(!contentType.includes('json'))throw new Error('lessons.json đang bị máy chủ trả về sai định dạng');
lessons=await response.json();
if(!Array.isArray(lessons)||!lessons.length)throw new Error('Dữ liệu bài học trống');
await putAllLessons(lessons)
}
currentLessonId=lessons[0]?.id||null
}
function lesson(){return lessons.find(l=>l.id===currentLessonId)}function current(){const id=filteredIds[position];return lesson()?.cards.find(c=>c.id===id)}


function openLessonDialog(id=null){
  editingLessonId=id;
  const target=id?lessons.find(item=>item.id===id):null;
  $('lessonDialogTitle').textContent=target?'✏️ Sửa bài học':'＋ Thêm bài học';
  $('lessonTitle').value=target?.title||'';
  $('lessonBook').value=target?.book||'Giáo trình 1A';
  $('lessonDialog').showModal();
}

async function saveLessonDialog(){
  const title=$('lessonTitle').value.trim();
  if(!title)return alert('Hãy nhập tên bài');

  if(editingLessonId){
    const target=lessons.find(item=>item.id===editingLessonId);
    if(!target)return;
    target.title=title;
    target.book=$('lessonBook').value.trim()||'Giáo trình 1A';
    await putLesson(target);
  }else{
    const lessonItem={
      id:`lesson-${Date.now()}`,
      title,
      book:$('lessonBook').value.trim()||'Giáo trình 1A',
      cards:[]
    };
    lessons.push(lessonItem);
    await putLesson(lessonItem);
  }

  editingLessonId=null;
  $('lessonDialog').close();
  renderHome();
  renderList();
}

async function moveLesson(id,direction){
  const index=lessons.findIndex(item=>item.id===id);
  const targetIndex=index+direction;
  if(index<0||targetIndex<0||targetIndex>=lessons.length)return;
  [lessons[index],lessons[targetIndex]]=[lessons[targetIndex],lessons[index]];
  await putAllLessons(lessons);
  renderHome();
}

async function deleteLesson(id){
  const target=lessons.find(item=>item.id===id);
  if(!target)return;

  if(lessons.length<=1){
    alert('Cần giữ lại ít nhất 1 bài học.');
    return;
  }

  const wordCount=target.cards.length;
  const message=
    `Xóa bài học “${target.title}”?\n\n`+
    `Bài này có ${wordCount} từ. Toàn bộ từ trong bài sẽ bị xóa khỏi thiết bị.`;

  if(!confirm(message))return;

  await deleteLessonRecord(id);
  lessons=lessons.filter(item=>item.id!==id);

  if(currentLessonId===id){
    currentLessonId=lessons[0]?.id||null;
    filteredIds=[];
    position=0;
  }

  renderHome();
  renderReview();
  renderStats();
  renderList();

  showView('homeView');
  alert(`Đã xóa bài học “${target.title}”.`);
}


function ensureSrs(card){
  if(!card.srs){
    card.srs={interval:0,ease:2.5,due:new Date().toISOString(),repetitions:0,lapses:0,lastGrade:null};
  }
  return card.srs;
}
function dueCards(){
  const now=Date.now();
  return allCards().filter(card=>new Date(ensureSrs(card).due).getTime()<=now);
}
function addDays(date,days){return new Date(date.getTime()+days*86400000)}
function formatDue(dateText){
  const diff=new Date(dateText).getTime()-Date.now();
  if(diff<=0)return 'Đến hạn ngay';
  const hours=Math.max(1,Math.round(diff/3600000));
  return hours<24?`Ôn lại sau khoảng ${hours} giờ`:`Ôn lại sau khoảng ${Math.round(hours/24)} ngày`;
}
async function gradeCurrentCard(grade){
  const card=current();if(!card)return;
  const srs=ensureSrs(card),now=new Date();
  if(grade==='again'){
    srs.interval=0.01;srs.lapses+=1;srs.repetitions=0;srs.ease=Math.max(1.3,srs.ease-0.2);
  }else if(grade==='hard'){
    srs.interval=Math.max(1,Math.round((srs.interval||1)*1.2));srs.repetitions+=1;srs.ease=Math.max(1.3,srs.ease-0.05);
  }else if(grade==='good'){
    srs.interval=srs.repetitions===0?1:srs.repetitions===1?3:Math.max(1,Math.round(srs.interval*srs.ease));srs.repetitions+=1;
  }else{
    srs.interval=srs.repetitions===0?4:Math.max(4,Math.round((srs.interval||1)*srs.ease*1.3));srs.repetitions+=1;srs.ease=Math.min(3.2,srs.ease+0.15);
  }
  srs.lastGrade=grade;srs.due=addDays(now,srs.interval).toISOString();card.checked=true;
  await saveLessonState();renderHome();renderReview();renderStats();
  if(filteredIds.length>1)position=(position+1)%filteredIds.length;
  render();
}

function renderHome(){
const list=$('lessonList');list.innerHTML='';
lessons.forEach((l,index)=>{
const checked=l.cards.filter(c=>c.checked).length;
const wrap=document.createElement('div');
wrap.className='lesson-card-wrap';

const b=document.createElement('button');
b.className='lesson-card';
b.innerHTML=`<div class="lesson-card-top"><div><strong>📘 ${l.title}</strong><small>${l.book}</small></div><span>${l.cards.length} từ</span></div><div class="progress"><span style="width:${checked/Math.max(l.cards.length,1)*100}%"></span></div>`;
b.onclick=()=>openLesson(l.id);

const controls=document.createElement('div');
controls.className='lesson-controls';

const up=document.createElement('button');
up.type='button';up.textContent='↑';up.title='Đưa bài lên';
up.disabled=index===0;
up.onclick=e=>{e.stopPropagation();moveLesson(l.id,-1)};

const down=document.createElement('button');
down.type='button';down.textContent='↓';down.title='Đưa bài xuống';
down.disabled=index===lessons.length-1;
down.onclick=e=>{e.stopPropagation();moveLesson(l.id,1)};

const edit=document.createElement('button');
edit.type='button';edit.textContent='✏️';edit.title='Sửa bài học';
edit.onclick=e=>{e.stopPropagation();openLessonDialog(l.id)};

const remove=document.createElement('button');
remove.type='button';
remove.className='delete-lesson-button';
remove.title='Xóa bài học';
remove.setAttribute('aria-label',`Xóa bài học ${l.title}`);
remove.textContent='🗑️';
remove.onclick=e=>{e.stopPropagation();deleteLesson(l.id)};

controls.append(up,down,edit,remove);
wrap.append(b,controls);
list.append(wrap)
});
const a=allCards(),learned=a.filter(c=>c.checked).length,review=a.filter(c=>!c.checked).length;
$('hardCount').textContent=`${a.filter(c=>c.hard).length} từ`;$('favoriteCount').textContent=`${a.filter(c=>c.favorite).length} từ`;$('reviewCount').textContent=`${dueCards().length} từ đến hạn`;
$('totalCards').textContent=a.length;$('learnedCards').textContent=learned;$('reviewCards').textContent=review;
const today=new Date().toISOString().slice(0,10),last=localStorage.getItem('km-last-open'),streak=Number(localStorage.getItem('km-streak')||1);
if(last!==today){localStorage.setItem('km-last-open',today);localStorage.setItem('km-streak',String(last?streak+1:1))}
$('streakDays').textContent=localStorage.getItem('km-streak')||'1';const ac=calculateAchievements();if($('achievementCount'))$('achievementCount').textContent=`${ac.filter(x=>x.unlocked).length} huy hiệu`;
renderReview();renderStats();
}
function openLesson(id,mode='all'){currentLessonId=id;let cs=lesson().cards;if(mode==='hard')cs=cs.filter(c=>c.hard);if(mode==='favorites')cs=cs.filter(c=>c.favorite);if(mode==='unchecked')cs=cs.filter(c=>!c.checked);filteredIds=cs.map(c=>c.id);position=0;showView('studyView');render()}
function render(){renderHome();const c=current();if(!c){$('korean').textContent='Không có từ';$('pronunciation').textContent='';$('meaning').textContent='';return}$('korean').textContent=c.ko;$('pronunciation').textContent=c.pron;$('meaning').textContent=c.meaning;$('exampleKo').textContent=c.example_ko;$('exampleVi').textContent='→ '+c.example_vi;$('tip').textContent=c.tip;$('dialogKo').textContent=c.dialog_ko;$('dialogVi').textContent=c.dialog_vi;$('counter').textContent=`${position+1} / ${filteredIds.length}`;const l=lesson(),n=l.cards.filter(x=>x.checked).length;$('checkedSummary').textContent=`Đã check: ${n} / ${l.cards.length}`;$('progressBar').style.width=`${n/Math.max(l.cards.length,1)*100}%`;$('favorite').textContent=c.favorite?'♥ Yêu thích':'♡ Yêu thích';$('favorite').classList.toggle('active',c.favorite);$('hard').textContent=c.hard?'★ Từ khó':'☆ Từ khó';$('hard').classList.toggle('hard',c.hard);$('checked').textContent=c.checked?'✓ Đã check':'✓ Chưa check';$('checked').classList.toggle('done',c.checked);$('flashcard').classList.remove('flipped');if($('srsDueInfo'))$('srsDueInfo').textContent=formatDue(ensureSrs(c).due)}
async function saveLessonState(){await putLesson(lesson());renderHome()}async function update(ch){Object.assign(current(),ch);await saveLessonState();render()}
function applySearch(q){q=q.trim().toLowerCase();filteredIds=lesson().cards.filter(c=>`${c.ko} ${c.pron} ${c.meaning}`.toLowerCase().includes(q)).map(c=>c.id);position=0;render()}
function speak(t){if(!speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.split('/')[0]);u.lang='ko-KR';u.rate=.82;speechSynthesis.speak(u)}
function fillLessons(){const s=$('fieldLesson');s.innerHTML='';lessons.forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.title;s.append(o)})}
function fill(c={}){fillLessons();$('fieldLesson').value=c.lessonId||currentLessonId||lessons[0]?.id;[['fieldKo','ko'],['fieldPron','pron'],['fieldMeaning','meaning'],['fieldExampleKo','example_ko'],['fieldExampleVi','example_vi'],['fieldTip','tip'],['fieldDialogKo','dialog_ko'],['fieldDialogVi','dialog_vi']].forEach(([a,b])=>$(a).value=c[b]||'')}
function editor(add){adding=add;$('editorTitle').textContent=add?'＋ Thêm từ mới':'✏️ Sửa flashcard';fill(add?{}:{...current(),lessonId:currentLessonId});$('editorDialog').showModal()}
async function saveEditor(){const ko=$('fieldKo').value.trim();if(!ko)return alert('Hãy nhập từ vựng tiếng Hàn');const targetId=$('fieldLesson').value,target=lessons.find(l=>l.id===targetId);const d={ko,pron:$('fieldPron').value.trim(),meaning:$('fieldMeaning').value.trim(),example_ko:$('fieldExampleKo').value.trim(),example_vi:$('fieldExampleVi').value.trim(),tip:$('fieldTip').value.trim(),dialog_ko:$('fieldDialogKo').value.trim(),dialog_vi:$('fieldDialogVi').value.trim()};
if(adding){target.cards.push({id:`card-${Date.now()}`,...d,checked:false,hard:false,favorite:false,order:target.cards.length+1})}else{const old=lesson(),idx=old.cards.findIndex(c=>c.id===current().id),keep={checked:current().checked,hard:current().hard,favorite:current().favorite,id:current().id,order:current().order};old.cards.splice(idx,1);target.cards.push({...d,...keep})}
await putAllLessons(lessons);currentLessonId=targetId;filteredIds=target.cards.map(c=>c.id);position=Math.max(0,target.cards.length-1);$('editorDialog').close();render();renderList()}
function renderList(){const q=$('listSearch').value.trim().toLowerCase(),list=$('wordList');list.innerHTML='';let m=allCards().filter(c=>`${c.ko} ${c.pron} ${c.meaning} ${c.lessonTitle}`.toLowerCase().includes(q));if(listMode==='favorites')m=m.filter(c=>c.favorite);if(listMode==='hard')m=m.filter(c=>c.hard);if(listMode==='unchecked')m=m.filter(c=>!c.checked);if(!m.length){list.innerHTML='<div class="empty">Không có từ phù hợp</div>';return}m.forEach(c=>{const row=document.createElement('div');row.className='word-row';const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!c.checked;cb.onchange=async()=>{const l=lessons.find(x=>x.id===c.lessonId),x=l.cards.find(x=>x.id===c.id);x.checked=cb.checked;await putLesson(l);renderHome()};const main=document.createElement('div');main.className='word-main';main.innerHTML=`<b>${c.ko}</b><span>${c.pron} · ${c.meaning} · ${c.lessonTitle}</span>`;const a=document.createElement('div');a.className='row-actions';const e=document.createElement('button');e.textContent='✏️';e.onclick=()=>{currentLessonId=c.lessonId;filteredIds=lesson().cards.map(x=>x.id);position=lesson().cards.findIndex(x=>x.id===c.id);editor(false)};const d=document.createElement('button');d.textContent='🗑️';d.className='danger-button';d.onclick=async()=>{if(confirm(`Xóa “${c.ko}”?`)){const l=lessons.find(x=>x.id===c.lessonId);l.cards=l.cards.filter(x=>x.id!==c.id);await putLesson(l);renderList();renderHome()}};a.append(e,d);row.append(cb,main,a);list.append(row)})}
function exportData(){
const payload=createBackup(lessons);
const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
const u=URL.createObjectURL(b),a=document.createElement('a');
a.href=u;a.download=`Korean_Master_Backup_${new Date().toISOString().slice(0,10)}.kmdata`;
a.click();URL.revokeObjectURL(u)
}
async function importData(f){
try{
const raw=JSON.parse(await f.text()),backup=migrateBackup(raw);
lessons=backup.lessons;
await putAllLessons(lessons);
currentLessonId=lessons[0]?.id||null;
if(backup.settings?.theme){
localStorage.setItem('km-theme',backup.settings.theme);
document.body.classList.toggle('dark',backup.settings.theme==='dark')
}
renderHome();renderReview();renderStats();
alert('Đã khôi phục dữ liệu thành công')
}catch(e){alert(e.message||'File không hợp lệ')}
}

function renderReview(){
  const list=$('reviewList');if(!list)return;
  list.innerHTML='';
  const items=dueCards();
  $('reviewSummary').textContent=items.length?`${items.length} từ đến hạn ôn.`:'Không có từ nào đến hạn.';
  if(!items.length){list.innerHTML='<div class="empty">Hôm nay chưa có từ cần ôn 🎉</div>';return}
  items.forEach(card=>{
    const row=document.createElement('div');row.className='review-row';
    const main=document.createElement('div');main.className='word-main';
    main.innerHTML=`<b>${card.ko}</b><span>${card.pron} · ${card.meaning} · ${card.lessonTitle}</span>`;
    const open=document.createElement('button');open.textContent='Ôn';
    open.onclick=()=>{
      currentLessonId=card.lessonId;
      filteredIds=lesson().cards.filter(item=>new Date(ensureSrs(item).due).getTime()<=Date.now()).map(item=>item.id);
      if(!filteredIds.length)filteredIds=[card.id];
      position=Math.max(0,filteredIds.indexOf(card.id));showView('studyView');render();
    };
    row.append('🧠',main,open);list.append(row);
  });
}
function renderStats(){
  const box = $('statsCards');
  if (!box) return;

  box.innerHTML = '';

  lessons.forEach(item => {
    const checked = item.cards.filter(card => card.checked).length;
    const percent = Math.round(
      checked / Math.max(item.cards.length, 1) * 100
    );

    const card = document.createElement('article');
    card.className = 'stat-card';
    card.innerHTML =
      `<div class="stat-top"><b>${item.title}</b><span>${percent}%</span></div>` +
      `<div class="progress"><span style="width:${percent}%"></span></div>` +
      `<small>${checked} / ${item.cards.length} từ đã check</small>`;

    box.append(card);
  });
}


let ocrSelectedFile = null;
let ocrSelectedFiles = [];
let ocrParsedRows = [];
let editingLessonId = null;

function fillOcrLessons(){
  const select = $('ocrLesson');
  if(!select) return;
  select.innerHTML = lessons.map(item =>
    `<option value="${item.id}">${item.title} · ${item.book}</option>`
  ).join('');
  select.value = currentLessonId || lessons[0]?.id || '';
}

function openOcrDialog(){
  fillOcrLessons();
  ocrSelectedFile = null;
  ocrSelectedFiles = [];
  ocrParsedRows = [];
  $('ocrImagePreview').removeAttribute('src');$('ocrImagePreview').classList.remove('hidden');$('ocrProcessedPreview').classList.add('hidden');
  $('ocrPreviewWrap').classList.add('hidden');
  $('ocrProgressWrap').classList.add('hidden');
  $('ocrResultSection').classList.add('hidden');
  $('runOcr').disabled = true;
  $('ocrRows').innerHTML = '';
  $('ocrRawText').value = '';
  $('ocrProgressBar').style.width = '0%';
  $('ocrProgressText').textContent = 'Đang chuẩn bị OCR…';
  $('ocrFileSummary').textContent='';
  $('ocrFileSummary').classList.add('hidden');
  $('ocrDialog').showModal();
}

function selectOcrImage(file){
  if(!file)return;
  selectOcrImages([file]);
}

function selectOcrImages(files){
  const valid=Array.from(files||[]).filter(file=>file.type.startsWith('image/'));
  if(!valid.length){
    alert('Hãy chọn file ảnh.');
    return;
  }

  ocrSelectedFiles=valid;
  ocrSelectedFile=valid[0];

  const url=URL.createObjectURL(valid[0]);
  $('ocrImagePreview').src=url;
  $('ocrImagePreview').onload=()=>URL.revokeObjectURL(url);

  $('ocrFileSummary').textContent=
    valid.length===1?`Đã chọn: ${valid[0].name}`:`Đã chọn ${valid.length} ảnh`;
  $('ocrFileSummary').classList.remove('hidden');
  $('ocrPreviewWrap').classList.remove('hidden');
  $('ocrImagePreview').classList.remove('hidden');
  $('ocrProcessedPreview').classList.add('hidden');
  $('ocrResultSection').classList.add('hidden');
  $('runOcr').disabled=false;
}

function containsHangul(text){
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text || '');
}

function cleanOcrPart(text){
  return String(text || '')
    .replace(/[|¦]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[•·▪◦\-–—:;,.\s]+|[•·▪◦\-–—:;,.\s]+$/g, '')
    .trim();
}

function parseOcrText(raw){
  const rows = [];
  const seen = new Set();

  String(raw || '').split(/\r?\n/).forEach(originalLine => {
    let line = originalLine.trim();
    if(!line || line.length < 2) return;

    line = line
      .replace(/^\d+[\s.)\-]+/, '')
      .replace(/[■□◆◇●○▶▷►]/g, ' ')
      .trim();

    if(!containsHangul(line)) return;

    let parts = line
      .split(/\t+|\s{2,}|[|]/)
      .map(cleanOcrPart)
      .filter(Boolean);

    if(parts.length < 2){
      const separatorMatch = line.match(
        /^(.+?[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F].*?)\s*[:=–—-]\s*(.+)$/
      );
      if(separatorMatch){
        parts = [cleanOcrPart(separatorMatch[1]), cleanOcrPart(separatorMatch[2])];
      }
    }

    let ko = '';
    let meaning = '';

    if(parts.length >= 2){
      const hangulIndex = parts.findIndex(containsHangul);
      if(hangulIndex >= 0){
        ko = parts[hangulIndex];
        meaning = parts
          .filter((_, index) => index !== hangulIndex)
          .join(' · ');
      }
    } else {
      const tokens = line.split(/\s+/);
      const koreanTokens = [];
      const otherTokens = [];
      tokens.forEach(token => {
        if(containsHangul(token)) koreanTokens.push(token);
        else otherTokens.push(token);
      });
      ko = cleanOcrPart(koreanTokens.join(' '));
      meaning = cleanOcrPart(otherTokens.join(' '));
    }

    ko = cleanOcrPart(ko);
    meaning = cleanOcrPart(meaning);

    if(!ko || !containsHangul(ko)) return;

    const key = `${ko.toLowerCase()}|${meaning.toLowerCase()}`;
    if(seen.has(key)) return;
    seen.add(key);
    rows.push({ko, meaning});
  });

  return rows;
}

function renderOcrRows(){
  const container=$('ocrRows');
  container.innerHTML='';

  if(!ocrParsedRows.length){
    container.innerHTML=
      '<div class="ocr-empty">Chưa tách được từ nào. Mở “Xem chữ OCR gốc”, sửa rồi bấm “Tách lại danh sách”.</div>';
    return;
  }

  ocrParsedRows.forEach((row,index)=>{
    const item=document.createElement('div');
    item.className='ocr-row';

    const ko=document.createElement('input');
    ko.className='ocr-ko';
    ko.placeholder='Tiếng Hàn';
    ko.value=row.ko||'';
    ko.oninput=event=>ocrParsedRows[index].ko=event.target.value;

    const pron=document.createElement('input');
    pron.className='ocr-pron';
    pron.placeholder='Phiên âm';
    pron.value=row.pron||'';
    pron.oninput=event=>ocrParsedRows[index].pron=event.target.value;

    const meaning=document.createElement('input');
    meaning.className='ocr-meaning';
    meaning.placeholder='Nghĩa tiếng Việt';
    meaning.value=row.meaning||'';
    meaning.oninput=event=>ocrParsedRows[index].meaning=event.target.value;

    const remove=document.createElement('button');
    remove.type='button';
    remove.className='ocr-row-remove';
    remove.textContent='🗑';
    remove.onclick=()=>{
      ocrParsedRows.splice(index,1);
      renderOcrRows();
    };

    item.append(ko,pron,meaning,remove);

    if(row.suggestion){
      const note=document.createElement('small');
      note.className='ocr-suggestion';
      note.textContent=row.suggestion;
      item.append(note);
    }

    container.append(item);
  });
}

async function recognizeOneImage(file,mode,imageNumber,totalImages){
  const processed=await preprocessOcrImage(file,mode);
  let worker;

  try{
    worker=await Tesseract.createWorker('kor+vie+eng',1,{
      logger(message){
        const progress=Math.max(0,Math.min(1,message.progress||0));
        if(message.status==='recognizing text'){
          const overall=((imageNumber-1)+progress)/totalImages;
          $('ocrProgressBar').style.width=`${Math.round(overall*100)}%`;
          $('ocrProgressText').textContent=
            `Đang đọc ảnh ${imageNumber}/${totalImages}… ${Math.round(progress*100)}%`;
        }
      }
    });

    await worker.setParameters({
      tessedit_pageseg_mode:'6',
      preserve_interword_spaces:'1',
      user_defined_dpi:'300'
    });

    const first=await worker.recognize(processed,{rotateAuto:true});
    let raw=first?.data?.text||'';

    if(mode==='document' && (raw.match(/[\uAC00-\uD7A3]/g)||[]).length<3){
      const second=await worker.recognize(file,{rotateAuto:true});
      const rawSecond=second?.data?.text||'';
      if((rawSecond.match(/[\uAC00-\uD7A3]/g)||[]).length >
         (raw.match(/[\uAC00-\uD7A3]/g)||[]).length){
        raw=rawSecond;
      }
    }
    return raw;
  }finally{
    if(worker)await worker.terminate();
  }
}

async function runImageOcr(){
  const files=ocrSelectedFiles.length?ocrSelectedFiles:(ocrSelectedFile?[ocrSelectedFile]:[]);
  if(!files.length)return;
  if(!window.Tesseract){
    alert('Không tải được bộ OCR. Hãy kiểm tra mạng rồi thử lại.');
    return;
  }

  $('runOcr').disabled=true;
  $('ocrProgressWrap').classList.remove('hidden');
  $('ocrResultSection').classList.add('hidden');
  $('ocrProgressBar').style.width='1%';

  try{
    const mode=$('ocrMode')?.value||'document';
    const rawParts=[];

    for(let i=0;i<files.length;i++){
      $('ocrProgressText').textContent=`Đang chuẩn bị ảnh ${i+1}/${files.length}…`;
      const raw=await recognizeOneImage(files[i],mode,i+1,files.length);
      rawParts.push(`--- Ảnh ${i+1}: ${files[i].name} ---\n${raw}`);
    }

    const raw=rawParts.join('\n\n');
    $('ocrRawText').value=raw;
    ocrParsedRows=enrichOcrRows(parseOcrText(raw));
    renderOcrRows();

    $('ocrProgressBar').style.width='100%';
    $('ocrProgressText').textContent=
      `Hoàn tất ${files.length} ảnh: tìm thấy ${ocrParsedRows.length} dòng có chữ Hàn.`;
    $('ocrResultSection').classList.remove('hidden');
  }catch(error){
    console.error(error);
    alert(`OCR chưa thực hiện được: ${error.message||error}`);
    $('ocrProgressText').textContent='OCR thất bại. Hãy thử ảnh rõ hơn.';
  }finally{
    $('runOcr').disabled=false;
  }
}

async function saveOcrCards(){
  const targetId = $('ocrLesson').value;
  const target = lessons.find(item => item.id === targetId);
  if(!target){
    alert('Không tìm thấy bài học.');
    return;
  }

  const validRows = ocrParsedRows
    .map(row => ({
      ko: cleanOcrPart(row.ko),
      pron: cleanOcrPart(row.pron),
      meaning: cleanOcrPart(row.meaning)
    }))
    .filter(row => row.ko && containsHangul(row.ko));

  if(!validRows.length){
    alert('Chưa có từ tiếng Hàn hợp lệ để nhập.');
    return;
  }

  const existing = new Set(target.cards.map(card => card.ko.trim().toLowerCase()));
  let addedCount = 0;
  let duplicateCount = 0;

  validRows.forEach(row => {
    const key = row.ko.toLowerCase();
    if(existing.has(key)){
      duplicateCount += 1;
      return;
    }
    existing.add(key);
    target.cards.push({
      id: `card-${Date.now()}-${addedCount}`,
      ko: row.ko,
      pron: row.pron,
      meaning: row.meaning,
      example_ko: '',
      example_vi: '',
      tip: '',
      dialog_ko: '',
      dialog_vi: '',
      checked: false,
      hard: false,
      favorite: false,
      order: target.cards.length + 1
    });
    addedCount += 1;
  });

  if(!addedCount){
    alert(`Không thêm từ mới. Có ${duplicateCount} từ đã tồn tại.`);
    return;
  }

  await putLesson(target);
  currentLessonId = target.id;
  filteredIds = target.cards.map(card => card.id);
  position = Math.max(0, target.cards.length - addedCount);

  $('ocrDialog').close();
  renderHome();
  renderReview();
  renderStats();
  render();

  alert(
    `Đã nhập ${addedCount} từ vào ${target.title}` +
    (duplicateCount ? `; bỏ qua ${duplicateCount} từ trùng.` : '.')
  );
}


let quizState={questions:[],index:0,score:0,answered:false};
function shuffle(array){return [...array].sort(()=>Math.random()-0.5)}
function startQuiz(){
  const cards=allCards().filter(card=>card.ko&&card.meaning);
  if(cards.length<4)return alert('Cần ít nhất 4 từ có nghĩa để tạo quiz.');
  const selected=shuffle(cards).slice(0,Math.min(10,cards.length));
  quizState={questions:selected.map(card=>({card,options:shuffle([card.meaning,...shuffle(cards.filter(x=>x.id!==card.id)).slice(0,3).map(x=>x.meaning)])})),index:0,score:0,answered:false};
  showView('quizView');renderQuizQuestion();
}
function renderQuizQuestion(){
  const q=quizState.questions[quizState.index];
  if(!q){
    $('quizProgress').textContent='Hoàn thành';
    $('quizQuestion').textContent=`Bạn đúng ${quizState.score}/${quizState.questions.length} câu`;
    $('quizOptions').innerHTML='';$('quizFeedback').textContent=quizState.score===quizState.questions.length?'Xuất sắc! 🎉':'Làm tốt lắm!';
    $('quizNext').textContent='Làm lại';$('quizNext').disabled=false;$('quizNext').onclick=startQuiz;return;
  }
  quizState.answered=false;$('quizProgress').textContent=`Câu ${quizState.index+1} / ${quizState.questions.length}`;
  $('quizQuestion').textContent=q.card.ko;$('quizFeedback').textContent='';$('quizNext').textContent='Câu tiếp theo';$('quizNext').disabled=true;
  $('quizNext').onclick=()=>{quizState.index+=1;renderQuizQuestion()};
  const box=$('quizOptions');box.innerHTML='';
  q.options.forEach(option=>{
    const b=document.createElement('button');b.textContent=option;
    b.onclick=()=>{
      if(quizState.answered)return;quizState.answered=true;
      if(option===q.card.meaning){quizState.score+=1;b.classList.add('correct');$('quizFeedback').textContent='Đúng rồi ✅'}
      else{b.classList.add('wrong');$('quizFeedback').textContent=`Đáp án đúng: ${q.card.meaning}`;[...box.children].forEach(x=>{if(x.textContent===q.card.meaning)x.classList.add('correct')})}
      $('quizNext').disabled=false;
    };box.append(b);
  });
}
function calculateAchievements(){
  const cards=allCards(),checked=cards.filter(c=>c.checked).length,favorites=cards.filter(c=>c.favorite).length,hard=cards.filter(c=>c.hard).length,streak=Number(localStorage.getItem('km-streak')||1),reviewed=cards.filter(c=>ensureSrs(c).repetitions>0).length;
  return[
    {icon:'🌱',title:'Bắt đầu',desc:'Có ít nhất 1 từ',unlocked:cards.length>=1},
    {icon:'✅',title:'Học 10 từ',desc:'Check ít nhất 10 từ',unlocked:checked>=10},
    {icon:'📚',title:'Học 50 từ',desc:'Check ít nhất 50 từ',unlocked:checked>=50},
    {icon:'🔥',title:'Chuỗi 7 ngày',desc:'Mở app 7 ngày',unlocked:streak>=7},
    {icon:'🧠',title:'Ôn tập',desc:'Đánh giá SRS ít nhất 10 từ',unlocked:reviewed>=10},
    {icon:'❤️',title:'Bộ sưu tập',desc:'Yêu thích 10 từ',unlocked:favorites>=10},
    {icon:'⭐',title:'Chinh phục từ khó',desc:'Đánh dấu 10 từ khó',unlocked:hard>=10}
  ];
}
function renderAchievements(){
  const list=$('achievementList');if(!list)return;list.innerHTML='';
  calculateAchievements().forEach(item=>{
    const card=document.createElement('article');card.className=`achievement-card ${item.unlocked?'unlocked':'locked'}`;
    card.innerHTML=`<span>${item.icon}</span><div><b>${item.title}</b><small>${item.desc}</small></div><em>${item.unlocked?'Đã mở':'Chưa mở'}</em>`;
    list.append(card);
  });
}

function events(){
$('srsAgain').onclick=()=>gradeCurrentCard('again');
$('srsHard').onclick=()=>gradeCurrentCard('hard');
$('srsGood').onclick=()=>gradeCurrentCard('good');
$('srsEasy').onclick=()=>gradeCurrentCard('easy');
$('openQuiz').onclick=startQuiz;
$('openAchievements').onclick=()=>{renderAchievements();showView('achievementsView')};

$('openOcr').onclick=openOcrDialog;
$('manageOcr').onclick=openOcrDialog;
$('closeOcr').onclick=()=>$('ocrDialog').close();
$('cancelOcr').onclick=()=>$('ocrDialog').close();
$('takePhoto').onclick=()=>$('ocrCameraInput').click();
$('choosePhoto').onclick=()=>$('ocrFileInput').click();
$('ocrCameraInput').onchange=e=>selectOcrImage(e.target.files[0]);
$('ocrFileInput').onchange=e=>selectOcrImages(e.target.files);
$('runOcr').onclick=runImageOcr;
$('parseRawAgain').onclick=()=>{
  ocrParsedRows=enrichOcrRows(parseOcrText($('ocrRawText').value));
  renderOcrRows();
};
$('addOcrRow').onclick=()=>{
  ocrParsedRows.push({ko:'',pron:'',meaning:'',suggestion:''});
  renderOcrRows();
};
$('saveOcrCards').onclick=saveOcrCards;


document.querySelectorAll('.bottom-nav button').forEach(btn=>btn.onclick=()=>{const v=btn.dataset.view;if(v==='studyView'&&(!filteredIds.length)){currentLessonId=lessons[0]?.id;filteredIds=lesson()?.cards.map(c=>c.id)||[];position=0;render()}if(v==='reviewView')renderReview();if(v==='statsView')renderStats();if(v==='manageView'){listMode='all';renderList()}showView(v);document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===btn))});

$('backHome').onclick=()=>showView('homeView');$('manageBack').onclick=()=>showView('homeView');$('openAllCards').onclick=()=>{currentLessonId=lessons[0].id;openLesson(currentLessonId)};
$('openManage').onclick=()=>{listMode='all';renderList();showView('manageView')};$('openHard').onclick=()=>{listMode='hard';renderList();showView('manageView')};$('openFavorites').onclick=()=>{listMode='favorites';renderList();showView('manageView')};$('openReview').onclick=()=>{listMode='unchecked';renderList();showView('manageView')};
$('addLesson').onclick=()=>openLessonDialog();$('saveLesson').onclick=saveLessonDialog;
$('manageAdd').onclick=()=>editor(true);$('addCard').onclick=()=>editor(true);$('editCard').onclick=()=>editor(false);$('saveCard').onclick=saveEditor;
$('flashcard').onclick=e=>{if(!e.target.closest('button'))$('flashcard').classList.toggle('flipped')};$('previous').onclick=()=>{position=(position-1+filteredIds.length)%filteredIds.length;render()};$('next').onclick=()=>{position=(position+1)%filteredIds.length;render()};
$('speakFront').onclick=e=>{e.stopPropagation();speak(current().ko)};$('speakBack').onclick=e=>{e.stopPropagation();speak(current().ko)};$('favorite').onclick=()=>update({favorite:!current().favorite});$('hard').onclick=()=>update({hard:!current().hard});$('checked').onclick=()=>update({checked:!current().checked});
$('search').oninput=e=>applySearch(e.target.value);$('showAll').onclick=()=>{filteredIds=lesson().cards.map(c=>c.id);position=0;render()};$('listSearch').oninput=renderList;$('toggleAll').onclick=async()=>{const all=allCards().every(c=>c.checked);lessons.forEach(l=>l.cards.forEach(c=>c.checked=!all));await putAllLessons(lessons);renderList();renderHome()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{listMode=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderList()});
$('backupBtn').onclick=()=>$('backupDialog').showModal();$('closeBackup').onclick=()=>$('backupDialog').close();$('exportData').onclick=exportData;$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0])};
const saved=localStorage.getItem('km-theme');if(saved==='dark')document.body.classList.add('dark');$('darkMode').textContent=document.body.classList.contains('dark')?'☀️':'🌙';$('darkMode').onclick=()=>{document.body.classList.toggle('dark');const d=document.body.classList.contains('dark');localStorage.setItem('km-theme',d?'dark':'light');$('darkMode').textContent=d?'☀️':'🌙'};
let x=0;$('flashcard').ontouchstart=e=>x=e.changedTouches[0].screenX;$('flashcard').ontouchend=e=>{const d=e.changedTouches[0].screenX-x;if(Math.abs(d)>65){d<0?$('next').click():$('previous').click()}};
}
(async()=>{
try{
await init();
events();
renderHome();
render();
if('serviceWorker'in navigator){
navigator.serviceWorker.register('service-worker.js').catch(console.error)
}
}catch(error){
console.error(error);
document.body.innerHTML=`<main style="max-width:680px;margin:40px auto;padding:20px;font-family:system-ui"><h1>Không tải được dữ liệu</h1><p>${error.message}</p><p>Hãy tải lại trang sau khi Vercel deploy bản sửa mới.</p></main>`
}
})()
