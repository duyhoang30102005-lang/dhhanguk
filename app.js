
const DB='korean-master-v2-db',LESSONS='lessons';let db,lessons=[],currentLessonId=null,filteredIds=[],position=0,adding=false,listMode='all';
const $=id=>document.getElementById(id);const allCards=()=>lessons.flatMap(l=>l.cards.map(c=>({...c,lessonId:l.id,lessonTitle:l.title})));
function showView(id){
document.querySelectorAll('.view').forEach(view=>view.classList.remove('active'));
const target=$(id);
if(target){
  target.classList.add('active');
  target.classList.remove('view-enter');
  requestAnimationFrame(()=>target.classList.add('view-enter'));
}
window.scrollTo({top:0,behavior:'smooth'})
}
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
  createAutoBackup();
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

  createAutoBackup();
  showView('homeView');
  alert(`Đã xóa bài học “${target.title}”.`);
}




let deferredInstallPrompt=null;

function updateGreeting(){
  const hour=new Date().getHours();
  const text=
    hour<11 ? '좋은 아침! Chào buổi sáng' :
    hour<18 ? '안녕하세요! Chào buổi chiều' :
    '좋은 저녁! Chào buổi tối';

  if($('greeting'))$('greeting').textContent=text;
}

function hideSplash(){
  const splash=$('splashScreen');
  if(!splash)return;
  setTimeout(()=>{
    splash.classList.add('hide');
    setTimeout(()=>splash.remove(),500);
  },650);
}

function setupInstallPrompt(){
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredInstallPrompt=event;
    $('installApp')?.classList.remove('hidden');
  });

  $('installApp')?.addEventListener('click',async()=>{
    if(!deferredInstallPrompt){
      alert('Trên iPhone: mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
    $('installApp').classList.add('hidden');
  });

  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    $('installApp')?.classList.add('hidden');
  });
}

function dateKey(date=new Date()){
  return date.toISOString().slice(0,10);
}

function getActivityLog(){
  try{return JSON.parse(localStorage.getItem('km-activity-log')||'{}')}
  catch{return {}}
}

function recordActivity(type='study',amount=1){
  const log=getActivityLog();
  const key=dateKey();
  const day=log[key]||{study:0,quiz:0,ocr:0};
  day[type]=(day[type]||0)+amount;
  log[key]=day;

  const keys=Object.keys(log).sort();
  while(keys.length>60){
    delete log[keys.shift()];
  }

  localStorage.setItem('km-activity-log',JSON.stringify(log));
  renderDailyGoal();
}

function getDailyGoal(){
  const value=Number(localStorage.getItem('km-daily-goal')||20);
  return Number.isFinite(value)&&value>0?value:20;
}

function todayStudyCount(){
  const day=getActivityLog()[dateKey()]||{};
  return (day.study||0)+(day.quiz||0);
}

function renderDailyGoal(){
  const goal=getDailyGoal();
  const current=todayStudyCount();
  const percent=Math.min(100,Math.round(current/goal*100));

  if($('dailyGoalText'))$('dailyGoalText').textContent=`${current} / ${goal} lượt học`;
  if($('dailyGoalBar'))$('dailyGoalBar').style.width=`${percent}%`;
}

function editDailyGoal(){
  const current=getDailyGoal();
  const raw=prompt('Mục tiêu số lượt học mỗi ngày:',String(current));
  if(raw===null)return;
  const value=Number(raw);
  if(!Number.isFinite(value)||value<1||value>500){
    alert('Hãy nhập số từ 1 đến 500.');
    return;
  }
  localStorage.setItem('km-daily-goal',String(Math.round(value)));
  renderDailyGoal();
}

function renderActivityChart(){
  const box=$('activityChart');
  if(!box)return;

  const log=getActivityLog();
  const days=[];

  for(let offset=6;offset>=0;offset--){
    const date=new Date();
    date.setDate(date.getDate()-offset);
    const key=dateKey(date);
    const data=log[key]||{};
    days.push({
      key,
      label:date.toLocaleDateString('vi-VN',{weekday:'short'}),
      value:(data.study||0)+(data.quiz||0)+(data.ocr||0)
    });
  }

  const max=Math.max(1,...days.map(day=>day.value));
  box.innerHTML='';

  days.forEach(day=>{
    const item=document.createElement('div');
    item.className='activity-day';
    item.innerHTML=
      `<div class="activity-value">${day.value}</div>`+
      `<div class="activity-bar-wrap"><span style="height:${Math.round(day.value/max*100)}%"></span></div>`+
      `<small>${day.label}</small>`;
    box.append(item);
  });

  const total=days.reduce((sum,day)=>sum+day.value,0);
  $('activitySummary').textContent=`${total} lượt trong 7 ngày`;
}

function createAutoBackup(){
  try{
    const payload=createBackup(lessons);
    const data=JSON.stringify(payload);
    if(data.length>4_000_000)return;

    localStorage.setItem('km-auto-backup',data);
    localStorage.setItem('km-auto-backup-time',new Date().toISOString());
    updateAutoBackupInfo();
  }catch(error){
    console.warn('Auto backup failed',error);
  }
}

function updateAutoBackupInfo(){
  const info=$('autoBackupInfo');
  if(!info)return;

  const time=localStorage.getItem('km-auto-backup-time');
  info.textContent=time
    ? `Bản tự động gần nhất: ${new Date(time).toLocaleString('vi-VN')}`
    : 'Chưa có bản sao lưu tự động.';
}

async function restoreAutoBackup(){
  const raw=localStorage.getItem('km-auto-backup');
  if(!raw){
    alert('Chưa có bản sao lưu tự động.');
    return;
  }

  if(!confirm('Khôi phục bản sao lưu tự động gần nhất? Dữ liệu hiện tại sẽ được thay thế.'))return;

  try{
    const backup=migrateBackup(JSON.parse(raw));
    lessons=backup.lessons;
    await putAllLessons(lessons);
    currentLessonId=lessons[0]?.id||null;

    if(backup.settings?.theme){
      localStorage.setItem('km-theme',backup.settings.theme);
      document.body.classList.toggle('dark',backup.settings.theme==='dark');
    }

    renderHome();
    renderReview();
    renderStats();
    alert('Đã khôi phục bản tự động.');
  }catch(error){
    alert(error.message||'Không thể khôi phục bản tự động.');
  }
}

function startRandomPractice(){
  const cards=allCards();
  if(!cards.length){
    alert('Chưa có từ để luyện.');
    return;
  }

  const shuffled=[...cards].sort(()=>Math.random()-0.5);
  const selected=shuffled.slice(0,Math.min(20,shuffled.length));
  const first=selected[0];

  currentLessonId=first.lessonId;
  filteredIds=selected
    .filter(card=>card.lessonId===currentLessonId)
    .map(card=>card.id);

  if(!filteredIds.length)filteredIds=[first.id];

  position=0;
  showView('studyView');
  render();
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
DhV9.sm2Grade(ensureSrs(card),grade);card.checked=true;
DhV9.addXp({again:1,hard:3,good:6,easy:10}[grade]||1);
await saveLessonState();recordActivity('study',1);createAutoBackup();
renderHome();renderReview();renderStats();
if(filteredIds.length>1)position=(position+1)%filteredIds.length;
render();
}


function renderLevel(){
  if(!window.DhV9)return;

  const info=DhV9.levelInfo();
  const currentStreak=Number(localStorage.getItem('km-streak')||1);
  const longest=DhV9.updateLongestStreak(currentStreak);

  if($('levelBadge'))$('levelBadge').textContent=`Lv.${info.level}`;
  if($('levelTitle'))$('levelTitle').textContent=`Level ${info.level}`;
  if($('levelXpText'))$('levelXpText').textContent=`${info.current} / ${info.target} EXP`;
  if($('levelProgress'))$('levelProgress').style.width=`${info.percent}%`;
  if($('longestStreak'))$('longestStreak').textContent=`${longest} ngày`;
}

function renderDailyChallenge(){
  if(!window.DhV10)return;

  const state=DhV10.challengeProgress();

  if($('dailyChallengeText')){
    $('dailyChallengeText').textContent=`${state.current} / ${state.target} lượt học`;
  }

  if($('dailyChallengeBar')){
    $('dailyChallengeBar').style.width=`${state.percent}%`;
  }

  if($('dailyChallengeAction')){
    $('dailyChallengeAction').textContent=
      state.claimed
        ? 'Đã nhận ✓'
        : state.complete
          ? 'Nhận 50 EXP'
          : 'Bắt đầu';

    $('dailyChallengeAction').disabled=state.claimed;
  }

  $('dailyChallengeCard')?.classList.toggle('complete',state.complete);
}

function handleDailyChallenge(){
  if(!window.DhV10)return;

  const state=DhV10.challengeProgress();

  if(state.claimed)return;

  if(state.complete){
    if(DhV10.claimChallenge()){
      renderLevel();
      renderDailyChallenge();
      alert('Bạn nhận được 50 EXP! 🎉');
    }
    return;
  }

  if(dueCards().length){
    renderReview();
    showView('reviewView');
  }else{
    startRandomPractice();
  }
}

function renderV10Insights(){
  if(!window.DhV10)return;

  const summary=DhV10.activitySummary(30);

  if($('insightActiveDays'))$('insightActiveDays').textContent=summary.activeDays;
  if($('insightStudy'))$('insightStudy').textContent=summary.study;
  if($('insightQuiz'))$('insightQuiz').textContent=summary.quiz;
  if($('insightOcr'))$('insightOcr').textContent=summary.ocr;
}

function openNoteDialog(){
  const card=current();
  if(!card)return;

  if($('noteWord'))$('noteWord').textContent=`${card.ko} · ${card.meaning}`;
  if($('noteText'))$('noteText').value=card.note||'';

  $('noteDialog')?.showModal();
}

async function saveCurrentNote(){
  const card=current();
  if(!card)return;

  card.note=$('noteText')?.value.trim()||'';

  await saveLessonState();
  createAutoBackup();
  $('noteDialog')?.close();
}

async function deleteCurrentNote(){
  const card=current();
  if(!card)return;

  card.note='';

  if($('noteText'))$('noteText').value='';

  await saveLessonState();
  createAutoBackup();
  $('noteDialog')?.close();
}


function renderHome(){renderDailyGoal();renderLevel();renderDailyChallenge();
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
function applySearch(q){filteredIds=lesson().cards.filter(c=>DhV9.smartSearchMatch(c,q)).map(c=>c.id);position=0;render()}
function speak(t){if(!speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.split('/')[0]);u.lang='ko-KR';u.rate=.82;speechSynthesis.speak(u)}
function fillLessons(){const s=$('fieldLesson');s.innerHTML='';lessons.forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=l.title;s.append(o)})}
function fill(c={}){fillLessons();$('fieldLesson').value=c.lessonId||currentLessonId||lessons[0]?.id;[['fieldKo','ko'],['fieldPron','pron'],['fieldMeaning','meaning'],['fieldExampleKo','example_ko'],['fieldExampleVi','example_vi'],['fieldTip','tip'],['fieldDialogKo','dialog_ko'],['fieldDialogVi','dialog_vi']].forEach(([a,b])=>$(a).value=c[b]||'')}
function editor(add){adding=add;$('editorTitle').textContent=add?'＋ Thêm từ mới':'✏️ Sửa flashcard';fill(add?{}:{...current(),lessonId:currentLessonId});$('editorDialog').showModal()}
async function saveEditor(){const ko=$('fieldKo').value.trim();if(!ko)return alert('Hãy nhập từ vựng tiếng Hàn');const targetId=$('fieldLesson').value,target=lessons.find(l=>l.id===targetId);const d={ko,pron:$('fieldPron').value.trim(),meaning:$('fieldMeaning').value.trim(),example_ko:$('fieldExampleKo').value.trim(),example_vi:$('fieldExampleVi').value.trim(),tip:$('fieldTip').value.trim(),dialog_ko:$('fieldDialogKo').value.trim(),dialog_vi:$('fieldDialogVi').value.trim()};
if(adding){target.cards.push({id:`card-${Date.now()}`,...d,checked:false,hard:false,favorite:false,order:target.cards.length+1})}else{const old=lesson(),idx=old.cards.findIndex(c=>c.id===current().id),keep={checked:current().checked,hard:current().hard,favorite:current().favorite,id:current().id,order:current().order};old.cards.splice(idx,1);target.cards.push({...d,...keep})}
await putAllLessons(lessons);currentLessonId=targetId;filteredIds=target.cards.map(c=>c.id);position=Math.max(0,target.cards.length-1);$('editorDialog').close();render();renderList()}
function renderList(){const q=$('listSearch').value.trim().toLowerCase(),list=$('wordList');list.innerHTML='';let m=allCards().filter(c=>DhV9.smartSearchMatch(c,q)||DhV9.normalize(c.lessonTitle).includes(DhV9.normalize(q)));if(listMode==='favorites')m=m.filter(c=>c.favorite);if(listMode==='hard')m=m.filter(c=>c.hard);if(listMode==='unchecked')m=m.filter(c=>!c.checked);if(!m.length){list.innerHTML='<div class="empty">Không có từ phù hợp</div>';return}m.forEach(c=>{const row=document.createElement('div');row.className='word-row';const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!c.checked;cb.onchange=async()=>{const l=lessons.find(x=>x.id===c.lessonId),x=l.cards.find(x=>x.id===c.id);x.checked=cb.checked;await putLesson(l);renderHome()};const main=document.createElement('div');main.className='word-main';main.innerHTML=`<b>${c.ko}</b><span>${c.pron} · ${c.meaning} · ${c.lessonTitle}</span>`;const a=document.createElement('div');a.className='row-actions';const e=document.createElement('button');e.textContent='✏️';e.onclick=()=>{currentLessonId=c.lessonId;filteredIds=lesson().cards.map(x=>x.id);position=lesson().cards.findIndex(x=>x.id===c.id);editor(false)};const d=document.createElement('button');d.textContent='🗑️';d.className='danger-button';d.onclick=async()=>{if(confirm(`Xóa “${c.ko}”?`)){const l=lessons.find(x=>x.id===c.lessonId);l.cards=l.cards.filter(x=>x.id!==c.id);await putLesson(l);renderList();renderHome()}};a.append(e,d);row.append(cb,main,a);list.append(row)})}
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
createAutoBackup();renderHome();renderReview();renderStats();
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
function renderStats(){renderActivityChart();renderV10Insights();
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


function loadImageFromFile(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror=()=>{
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src=url;
  });
}

function otsuThreshold(gray){
  const histogram=new Array(256).fill(0);
  gray.forEach(value=>histogram[value]++);
  const total=gray.length;

  let sum=0;
  for(let i=0;i<256;i++)sum+=i*histogram[i];

  let sumBackground=0;
  let weightBackground=0;
  let maxVariance=0;
  let threshold=160;

  for(let i=0;i<256;i++){
    weightBackground+=histogram[i];
    if(!weightBackground)continue;

    const weightForeground=total-weightBackground;
    if(!weightForeground)break;

    sumBackground+=i*histogram[i];

    const meanBackground=sumBackground/weightBackground;
    const meanForeground=(sum-sumBackground)/weightForeground;
    const variance=
      weightBackground*
      weightForeground*
      (meanBackground-meanForeground)*
      (meanBackground-meanForeground);

    if(variance>maxVariance){
      maxVariance=variance;
      threshold=i;
    }
  }

  return threshold;
}

async function preprocessOcrImage(file,mode='document'){
  const img=await loadImageFromFile(file);

  const maxWidth=2400;
  const scale=Math.max(1,Math.min(3,maxWidth/img.width));
  const width=Math.round(img.width*scale);
  const height=Math.round(img.height*scale);

  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;

  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,0,0,width,height);

  const imageData=ctx.getImageData(0,0,width,height);
  const data=imageData.data;
  const gray=new Uint8Array(width*height);

  for(let i=0,j=0;i<data.length;i+=4,j++){
    let value=Math.round(
      data[i]*0.299+
      data[i+1]*0.587+
      data[i+2]*0.114
    );

    const contrast=
      mode==='document' ? 1.65 :
      mode==='screen' ? 1.35 :
      1.2;

    value=Math.max(
      0,
      Math.min(255,(value-128)*contrast+128)
    );

    gray[j]=value;
  }

  if(mode==='document'){
    const threshold=otsuThreshold(gray);

    for(let i=0,j=0;i<data.length;i+=4,j++){
      const value=
        gray[j]>Math.min(220,threshold+18)
          ? 255
          : 0;

      data[i]=value;
      data[i+1]=value;
      data[i+2]=value;
      data[i+3]=255;
    }
  }else{
    for(let i=0,j=0;i<data.length;i+=4,j++){
      const value=gray[j];

      data[i]=value;
      data[i+1]=value;
      data[i+2]=value;
      data[i+3]=255;
    }
  }

  ctx.putImageData(imageData,0,0);

  const preview=$('ocrProcessedPreview');
  if(preview){
    preview.width=width;
    preview.height=height;
    preview.getContext('2d').drawImage(canvas,0,0);
    preview.classList.remove('hidden');
  }

  if($('ocrImagePreview')){
    $('ocrImagePreview').classList.add('hidden');
  }

  return canvas;
}

function levenshtein(a,b){
  const rows=a.length+1;
  const columns=b.length+1;
  const table=Array.from(
    {length:rows},
    ()=>new Array(columns).fill(0)
  );

  for(let row=0;row<rows;row++)table[row][0]=row;
  for(let column=0;column<columns;column++)table[0][column]=column;

  for(let row=1;row<rows;row++){
    for(let column=1;column<columns;column++){
      const cost=a[row-1]===b[column-1] ? 0 : 1;

      table[row][column]=Math.min(
        table[row-1][column]+1,
        table[row][column-1]+1,
        table[row-1][column-1]+cost
      );
    }
  }

  return table[a.length][b.length];
}

function compactHangul(text){
  return cleanOcrPart(text).replace(/\s+/g,'');
}

function enrichOcrRows(rows){
  const known=allCards()
    .map(card=>({
      ko:compactHangul(card.ko),
      originalKo:card.ko,
      pron:card.pron||'',
      meaning:card.meaning||''
    }))
    .filter(item=>item.ko);

  return rows.map(row=>{
    const compact=compactHangul(row.ko);
    const exact=known.find(item=>item.ko===compact);

    if(exact){
      return{
        ko:exact.originalKo,
        pron:row.pron||exact.pron,
        meaning:row.meaning||exact.meaning,
        suggestion:''
      };
    }

    let best=null;

    known.forEach(item=>{
      const distance=levenshtein(compact,item.ko);
      const limit=
        Math.max(compact.length,item.ko.length)<=3
          ? 1
          : 2;

      if(
        distance<=limit &&
        (!best || distance<best.distance)
      ){
        best={...item,distance};
      }
    });

    const smartFix=
      $('ocrSmartFix')
        ? $('ocrSmartFix').checked
        : true;

    if(smartFix && best){
      return{
        ko:best.originalKo,
        pron:row.pron||best.pron,
        meaning:row.meaning||best.meaning,
        suggestion:`Đã gợi ý từ gần nhất: ${best.originalKo}`
      };
    }

    return{
      ko:compact||row.ko,
      pron:row.pron||'',
      meaning:row.meaning||'',
      suggestion:''
    };
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
  recordActivity('ocr',addedCount);DhV9.addXp(Math.min(100,addedCount*2));
  createAutoBackup();
  renderHome();
  renderReview();
  renderStats();
  render();

  alert(
    `Đã nhập ${addedCount} từ vào ${target.title}` +
    (duplicateCount ? `; bỏ qua ${duplicateCount} từ trùng.` : '.')
  );
}


let quizState={questions:[],index:0,score:0,answered:false,mode:'all',requestedCount:30,timerSeconds:0,timerId:null,combo:0,bestCombo:0};

function shuffle(array){
  return [...array].sort(()=>Math.random()-0.5);
}

function quizPool(mode='all'){
  const cards=allCards().filter(card=>card.ko&&card.meaning);

  if(mode==='lesson'){
    const currentId=currentLessonId||lessons[0]?.id;
    return cards.filter(card=>card.lessonId===currentId);
  }

  if(mode==='review'){
    return cards.filter(card=>!card.checked);
  }

  if(mode==='favorite'){
    return cards.filter(card=>card.favorite);
  }

  if(mode==='hard'){
    return cards.filter(card=>card.hard);
  }

  return cards;
}

function updateQuizBestScore(){
  const mode=$('quizMode')?.value||quizState.mode||'all';
  const count=Number($('quizCount')?.value||30);const best=Number(localStorage.getItem(`km-quiz-best-${mode}-${count}`)||0);
  if($('quizBestScore')){
    $('quizBestScore').textContent=
      best>0 ? `Điểm cao nhất: ${best}/${Number($('quizCount')?.value||30)}` : 'Điểm cao nhất: chưa có';
  }
}

function saveQuizBestScore(){
  const mode=quizState.mode||'all';
  const count=Number($('quizCount')?.value||30);const key=`km-quiz-best-${mode}-${count}`;
  const previous=Number(localStorage.getItem(key)||0);
  if(quizState.score>previous){
    localStorage.setItem(key,String(quizState.score));
  }
  updateQuizBestScore();
}

function buildQuizQuestion(card,sourceCards){
  const wrongMeanings=shuffle(
    sourceCards.filter(item=>item.id!==card.id)
  )
    .map(item=>item.meaning)
    .filter((meaning,index,array)=>meaning&&array.indexOf(meaning)===index)
    .slice(0,3);

  return{
    card,
    options:shuffle([card.meaning,...wrongMeanings])
  };
}

function stopQuizTimer(){if(quizState.timerId){clearInterval(quizState.timerId);quizState.timerId=null}}
function startQuizTimer(){
stopQuizTimer();let remaining=Number(quizState.timerSeconds||0);
if(!remaining){if($('quizTimer'))$('quizTimer').textContent='';return}
const update=()=>{if($('quizTimer'))$('quizTimer').textContent=`⏱ ${remaining}s`;if(remaining<=0){stopQuizTimer();quizState.index=quizState.questions.length;renderQuizQuestion();return}remaining-=1};
update();quizState.timerId=setInterval(update,1000)
}
function startQuiz(mode){
  const selectedMode=mode||$('quizMode')?.value||'all';
  const pool=quizPool(selectedMode);

  if(pool.length<4){
    alert('Chế độ này cần ít nhất 4 từ có nghĩa. Hãy chọn chế độ khác hoặc thêm từ.');
    return;
  }

  const requestedCount=Number($('quizCount')?.value||30);
  const timerSeconds=Number($('quizTimerMode')?.value||0);
  const selected=shuffle(pool).slice(0,Math.min(requestedCount,pool.length));

  quizState={
    questions:selected.map(card=>buildQuizQuestion(card,pool)),
    index:0,
    score:0,
    answered:false,
    mode:selectedMode,requestedCount,timerSeconds,timerId:null,combo:0,bestCombo:0
  };

  if($('quizMode'))$('quizMode').value=selectedMode;
  updateQuizBestScore();if($('quizCombo'))$('quizCombo').textContent='🔥 Combo 0';DhV10.renderQuizHistory($('quizHistory'));
  showView('quizView');
  startQuizTimer();
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const total=quizState.questions.length;
  const q=quizState.questions[quizState.index];

  if(!q){
    stopQuizTimer();saveQuizBestScore();
    const accuracy=Math.round(quizState.score/Math.max(total,1)*100);
    DhV10.saveQuizResult({score:quizState.score,total,mode:quizState.mode,accuracy,bestCombo:quizState.bestCombo});
    DhV10.renderQuizHistory($('quizHistory'));
    if($('quizAccuracy'))$('quizAccuracy').textContent=`Độ chính xác: ${accuracy}% · Combo tốt nhất: ${quizState.bestCombo}`;

    $('quizProgress').textContent='Hoàn thành';
    $('quizProgressBar').style.width='100%';
    $('quizQuestion').textContent=`Bạn đúng ${quizState.score}/${total} câu`;
    $('quizOptions').innerHTML='';

    const percent=accuracy;
    $('quizFeedback').textContent=
      percent===100 ? 'Xuất sắc! 🎉' :
      percent>=80 ? 'Rất tốt! 🌟' :
      percent>=60 ? 'Làm tốt lắm!' :
      'Hãy ôn lại rồi thử tiếp nhé 💪';

    $('quizNext').textContent=`Làm lại ${quizState.requestedCount} câu`;
    $('quizNext').disabled=false;
    $('quizNext').onclick=()=>startQuiz(quizState.mode);
    return;
  }

  quizState.answered=false;

  $('quizProgress').textContent=`Câu ${quizState.index+1} / ${total}`;
  $('quizProgressBar').style.width=
    `${Math.round(quizState.index/Math.max(total,1)*100)}%`;
  $('quizQuestion').textContent=q.card.ko;
  $('quizFeedback').textContent='';
  $('quizNext').textContent='Câu tiếp theo';
  $('quizNext').disabled=true;
  $('quizNext').onclick=()=>{
    quizState.index+=1;
    renderQuizQuestion();
  };

  const box=$('quizOptions');
  box.innerHTML='';

  q.options.forEach(option=>{
    const button=document.createElement('button');
    button.textContent=option;

    button.onclick=()=>{
      if(quizState.answered)return;

      quizState.answered=true;
      recordActivity('quiz',1);DhV9.addXp(option===q.card.meaning?5:1);

      if(option===q.card.meaning){
        quizState.score+=1;quizState.combo+=1;quizState.bestCombo=Math.max(quizState.bestCombo,quizState.combo);
        button.classList.add('correct');
        $('quizFeedback').textContent=quizState.combo>=3?`Đúng rồi ✅ · Combo ${quizState.combo}!`:'Đúng rồi ✅';
      }else{
        quizState.combo=0;
        button.classList.add('wrong');
        $('quizFeedback').textContent=`Đáp án đúng: ${q.card.meaning}`;

        [...box.children].forEach(child=>{
          if(child.textContent===q.card.meaning){
            child.classList.add('correct');
          }
        });
      }

      [...box.children].forEach(child=>child.disabled=true);
      $('quizNext').disabled=false;renderLevel();if($('quizCombo'))$('quizCombo').textContent=`🔥 Combo ${quizState.combo}`;
      $('quizProgressBar').style.width=
        `${Math.round((quizState.index+1)/Math.max(total,1)*100)}%`;
    };

    box.append(button);
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
$('dailyChallengeAction').onclick=handleDailyChallenge;
$('noteCard').onclick=openNoteDialog;
$('closeNote').onclick=()=>$('noteDialog').close();
$('saveNote').onclick=saveCurrentNote;
$('deleteNote').onclick=deleteCurrentNote;
$('editDailyGoal').onclick=editDailyGoal;
$('openRandomPractice').onclick=startRandomPractice;
$('restoreAutoBackup').onclick=restoreAutoBackup;
$('srsAgain').onclick=()=>gradeCurrentCard('again');
$('srsHard').onclick=()=>gradeCurrentCard('hard');
$('srsGood').onclick=()=>gradeCurrentCard('good');
$('srsEasy').onclick=()=>gradeCurrentCard('easy');
$('openQuiz').onclick=()=>{DhV10.renderQuizHistory($('quizHistory'));startQuiz('all')};
$('restartQuiz').onclick=()=>startQuiz($('quizMode').value);
$('quizMode').onchange=updateQuizBestScore;$('quizCount').onchange=updateQuizBestScore;
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
$('backupBtn').onclick=()=>{updateAutoBackupInfo();$('backupDialog').showModal()};$('closeBackup').onclick=()=>$('backupDialog').close();$('exportData').onclick=exportData;$('importData').onclick=()=>$('importFile').click();$('importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0])};
const saved=localStorage.getItem('km-theme');if(saved==='dark')document.body.classList.add('dark');$('darkMode').textContent=document.body.classList.contains('dark')?'☀️':'🌙';$('darkMode').onclick=()=>{document.body.classList.toggle('dark');const d=document.body.classList.contains('dark');localStorage.setItem('km-theme',d?'dark':'light');$('darkMode').textContent=d?'☀️':'🌙'};
let x=0;$('flashcard').ontouchstart=e=>x=e.changedTouches[0].screenX;$('flashcard').ontouchend=e=>{const d=e.changedTouches[0].screenX-x;if(Math.abs(d)>65){d<0?$('next').click():$('previous').click()}};
}
(async()=>{
updateGreeting();
setupInstallPrompt();
try{
await init();
events();
renderHome();
renderDailyGoal();
updateAutoBackupInfo();
createAutoBackup();
render();
hideSplash();
if('serviceWorker'in navigator){
navigator.serviceWorker.register('service-worker.js').catch(console.error)
}
}catch(error){
console.error(error);
hideSplash();
document.body.innerHTML=`<main style="max-width:680px;margin:40px auto;padding:20px;font-family:system-ui"><h1>Không tải được dữ liệu</h1><p>${error.message}</p><p>Hãy tải lại trang sau khi Vercel deploy bản sửa mới.</p></main>`
}
})()
