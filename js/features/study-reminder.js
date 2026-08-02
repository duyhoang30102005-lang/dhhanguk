
window.DhStudyReminder=(()=>{
  const STORAGE_KEY='dh-study-reminder';

  function ctx(){
    if(!window.DhAppContext)throw new Error('DhAppContext chưa sẵn sàng.');
    return window.DhAppContext;
  }

  function get(){
    try{
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY)||
        '{"enabled":false,"time":"20:00","lastShown":""}'
      );
    }catch{
      return {enabled:false,time:'20:00',lastShown:''};
    }
  }

  function renderSummary(){
    const $=ctx().$;
    const reminder=get();

    if($('reminderSummary')){
      $('reminderSummary').textContent=
        reminder.enabled?`Mỗi ngày ${reminder.time}`:'Chưa đặt';
    }
  }

  function openDialog(){
    const $=ctx().$;
    const reminder=get();

    $('reminderTime').value=reminder.time||'20:00';
    $('reminderEnabled').checked=Boolean(reminder.enabled);
    $('reminderDialog').showModal();
  }

  async function save(){
    const $=ctx().$;
    const enabled=$('reminderEnabled').checked;
    const time=$('reminderTime').value||'20:00';

    if(enabled&&'Notification' in window&&Notification.permission==='default'){
      try{
        await Notification.requestPermission();
      }catch{}
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled,
        time,
        lastShown:get().lastShown||''
      })
    );

    renderSummary();
    $('reminderDialog').close();
  }

  function clear(){
    const $=ctx().$;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled:false,
        time:'20:00',
        lastShown:''
      })
    );

    renderSummary();
    $('reminderDialog').close();
  }

  function check(){
    const context=ctx();
    const reminder=get();

    if(!reminder.enabled)return;

    const now=new Date();
    const [hours,minutes]=String(reminder.time||'20:00').split(':').map(Number);
    const due=new Date();

    due.setHours(hours||0,minutes||0,0,0);

    const today=context.dateKey();

    if(now<due||reminder.lastShown===today)return;

    const message='Đến giờ học tiếng Hàn rồi! Hãy hoàn thành mục tiêu hôm nay nhé.';

    if('Notification' in window&&Notification.permission==='granted'){
      try{
        new Notification('Dh한국',{
          body:message,
          icon:'icon-192.png'
        });
      }catch{
        alert(message);
      }
    }else{
      alert(message);
    }

    reminder.lastShown=today;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(reminder));
  }

  return{
    get,
    renderSummary,
    openDialog,
    save,
    clear,
    check
  };
})();
