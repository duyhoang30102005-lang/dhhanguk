
const DB='korean-master-v2-db',LESSONS='lessons';let db,lessons=[],currentLessonId=null,filteredIds=[],position=0,adding=false,listMode='all';
const $=id=>document.getElementById(id);const allCards=()=>lessons.flatMap(l=>l.cards.map(c=>({...c,lessonId:l.id,lessonTitle:l.title})));
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(id).classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(LESSONS))r.result.createObjectStore(LESSONS,{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function store(mode='readonly'){return db.transaction(LESSONS,mode).objectStore(LESSONS)}
function getAllLessons(){return new Promise((res,rej)=>{const r=store().getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function putLesson(l){return new Promise((res,rej)=>{const r=store('readwrite').put(l);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
function putAllLessons(list){return Promise.all(list.map(putLesson))}
async function init(){db=await openDB();lessons=await getAllLessons();if(!lessons.length){lessons=await fetch('lessons.json').then(r=>r.json());await putAllLessons(lessons)}currentLessonId=lessons[0]?.id||null}
function lesson(){return lessons.find(l=>l.id===currentLessonId)}function current(){const id=filteredIds[position];return lesson()?.cards.find(c=>c.id===id)}
function renderHome(){
const list=$('lessonList');list.innerHTML='';
lessons.forEach(l=>{const checked=l.cards.filter(c=>c.checked).length;const b=document.createElement('button');b.className='lesson-card';b.innerHTML=`<div class="lesson-card-top"><div><strong>📘 ${l.title}</strong><small>${l.book}</small></div><span>${l.cards.length} từ</span></div><div class="progress"><span style="width:${checked/Math.max(l.cards.length,1)*100}%"></span></div>`;b.onclick=()=>openLesson(l.id);list.append(b)});
const a=allCards(),learned=a.filter(c=>c.checked).length,review=a.filter(c=>!c.checked).length;
$('hardCount').textContent=`${a.filter(c=>c.hard).length} từ`;$('favoriteCount').textContent=`${a.filter(c=>c.favorite).length} từ`;$('reviewCount').textContent=`${review} từ`;
$('totalCards').textContent=a.length;$('learnedCards').textContent=learned;$('reviewCards').textContent=review;
const today=new Date().toISOString().slice(0,10),last=localStorage.getItem('km-last-open'),streak=Number(localStorage.getItem('km-streak')||1);
if(last!==today){localStorage.setItem('km-last-open',today);localStorage.setItem('km-streak',String(last?streak+1:1))}
$('streakDays').textContent=localStorage.getItem('km-streak')||'1';
renderReview();renderStats();
}
function openLesson(id,mode='all'){currentLessonId=id;let cs=lesson().cards;if(mode==='hard')cs=cs.filter(c=>c.hard);if(mode==='favorites')cs=cs.filter(c=>c.favorite);if(mode==='unchecked')cs=cs.filter(c=>!c.checked);filteredIds=cs.map(c=>c.id);position=0;showView('studyView');render()}
function render(){renderHome();const c=current();if(!c){$('korean').textContent='Không có từ';$('pronunciation').textContent='';return}$('korean').textContent=c.ko;$('pronunciation').textContent=c.pron;$('meaning').textContent=c.meaning;$('exampleKo').textContent=c.example_ko;$('exampleVi').textContent='→ '+c.example_vi;$('tip').textContent=c.tip;$('dialogKo').textContent=c.dialog_ko;$('dialogVi').textContent=c.dialog_vi;$('counter').textContent=`${position+1} / ${filteredIds.length}`;const l=lesson(),n=l.cards.filter(x=>x.checked).length;$('checkedSummary').textContent=`Đã check: ${n} / ${l.cards.length}`;$('progressBar').style.width=`${n/Math.max(l.cards.length,1)*100}%`;$('favorite').textContent=c.favorite?'♥ Yêu thích':'♡ Yêu thích';$('favorite').classList.toggle('active',c.favorite);$('hard').textContent=c.hard?'★ Từ khó':'☆ Từ khó';$('hard').classList.toggle('hard',c.hard);$('checked').textContent=c.checked?'✓ Đã check':'✓ Chưa check';$('checked').classList.toggle('done',c.checked);$('flashcard').classList.remove('flipped')}
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
function events(){

document.querySelectorAll('.bottom-nav button').forEach(btn=>btn.onclick=()=>{const v=btn.dataset.view;if(v==='studyView'&&(!filteredIds.length)){currentLessonId=lessons[0]?.id;filteredIds=lesson()?.cards.map(c=>c.id)||[];position=0;render()}if(v==='reviewView')renderReview();if(v==='statsView')renderStats();if(v==='manageView'){listMode='all';renderList()}showView(v);document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===btn))});

$('backHome').onclick=()=>showView('homeView');$('manageBack').onclick=()=>showView('homeView');$('openAllCards').onclick=()=>{currentLessonId=lessons[0].id;openLesson(currentLessonId)};
$('openManage').onclick=()=>{listMode='all';renderList();showView('manageView')};$('openHard').onclick=()=>{listMode='hard';renderList();showView('manageView')};$('openFavorites').onclick=()=>{listMode='favorites';renderList();showView('manageView')};$('openReview').onclick=()=>{listMode='unchecked';renderList();showView('manageView')};
$('addLesson').onclick=()=>$('lessonDialog').showModal();$('saveLesson').onclick=async()=>{const title=$('lessonTitle').value.trim();if(!title)return alert('Hãy nhập tên bài');const l={id:`lesson-${Date.now()}`,title,book:$('lessonBook').value.trim()||'Giáo trình 1A',cards:[]};lessons.push(l);await putLesson(l);$('lessonDialog').close();renderHome()};
$('manageAdd').onclick=()=>editor(true);$('addCard').onclick=()=>editor(true);$('editCard').onclick=()=>editor(false);$('saveCard').onclick=saveEditor;
$('flashcard').onclick=e=>{if(!e.target.closest('button'))$('flashcard').classList.toggle('flipped')};$('previous').onclick=()=>{position=(position-1+filteredIds.length)%filteredIds.length;render()};$('next').onclick=()=>{position=(position+1)%filteredIds.length;render()};
$('speakFront').onclick=e=>{e.stopPropagation();speak(current().ko)};$('speakBack').onclick=e=>{e.stopPropagation();speak(current().ko)};$('favorite').onclick=()=>update({favorite:!current().favorite});$('hard').onclick=()=>update({hard:!current().hard});$('checked').onclick=()=>update({checked:!current().checked});
$('search').oninput=e=>applySearch(e.target.value);$('showAll').onclick=()=>{filteredIds=lesson().cards.map(c=>c.id);position=0;render()};$('listSearch').oninput=renderList;$('toggleAll').onclick=async()=>{const all=allCards().every(c=>c.checked);lessons.forEach(l=>l.cards.forEach(c=>c.checked=!all));await putAllLessons(lessons);renderList();renderHome()};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{listMode=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderList()});
$('backupBtn').onclick=()=>$('backupDialog').showModal();$('closeBackup').onclick=()=>$('backupDialog').close();$('exportData').onclick=exportData;$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0])};
const saved=localStorage.getItem('km-theme');if(saved==='dark')document.body.classList.add('dark');$('darkMode').textContent=document.body.classList.contains('dark')?'☀️':'🌙';$('darkMode').onclick=()=>{document.body.classList.toggle('dark');const d=document.body.classList.contains('dark');localStorage.setItem('km-theme',d?'dark':'light');$('darkMode').textContent=d?'☀️':'🌙'};
let x=0;$('flashcard').ontouchstart=e=>x=e.changedTouches[0].screenX;$('flashcard').ontouchend=e=>{const d=e.changedTouches[0].screenX-x;if(Math.abs(d)>65){d<0?$('next').click():$('previous').click()}};
}
(async()=>{await init();events();renderHome();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{})})()
