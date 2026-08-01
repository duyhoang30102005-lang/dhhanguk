
window.DhV9=(()=>{
  const XP='dh-v9-xp', LONGEST='dh-v9-longest-streak';

  const getXp=()=>Number(localStorage.getItem(XP)||0);

  const addXp=amount=>{
    const value=Math.max(0,getXp()+Number(amount||0));
    localStorage.setItem(XP,String(value));
    return value;
  };

  const levelInfo=()=>{
    const xp=getXp();
    const level=Math.floor(xp/500)+1;
    const current=xp%500;
    return {xp,level,current,target:500,percent:Math.round(current/5)};
  };

  const updateLongestStreak=current=>{
    const previous=Number(localStorage.getItem(LONGEST)||0);
    const value=Math.max(previous,Number(current||0));
    localStorage.setItem(LONGEST,String(value));
    return value;
  };

  const normalize=text=>String(text||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d')
    .replace(/Đ/g,'D')
    .toLowerCase()
    .trim();

  const initials=text=>{
    const list=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    return [...String(text||'')].map(char=>{
      const code=char.charCodeAt(0);
      return code>=0xAC00&&code<=0xD7A3
        ? list[Math.floor((code-0xAC00)/588)]||''
        : '';
    }).join('');
  };

  const smartSearchMatch=(card,query)=>{
    const q=normalize(query);
    if(!q)return true;

    return [
      card.ko,
      card.pron,
      card.meaning,
      card.example_ko,
      card.example_vi,
      initials(card.ko)
    ].map(normalize).some(value=>value.includes(q));
  };

  function sm2Grade(srs,grade){
    const quality=grade==='again'?1:grade==='hard'?3:grade==='easy'?5:4;

    srs.ease=Number(srs.ease||2.5);
    srs.repetitions=Number(srs.repetitions||0);
    srs.interval=Number(srs.interval||0);
    srs.lapses=Number(srs.lapses||0);

    if(quality<3){
      srs.repetitions=0;
      srs.interval=grade==='again'?0.01:1;
      srs.lapses+=1;
    }else{
      if(srs.repetitions===0)srs.interval=1;
      else if(srs.repetitions===1)srs.interval=grade==='easy'?4:3;
      else{
        const modifier=grade==='hard'?0.85:grade==='easy'?1.3:1;
        srs.interval=Math.max(1,Math.round(srs.interval*srs.ease*modifier));
      }
      srs.repetitions+=1;
    }

    const delta=0.1-(5-quality)*(0.08+(5-quality)*0.02);
    srs.ease=Math.max(1.3,Math.min(3.2,srs.ease+delta));
    srs.lastGrade=grade;
    srs.due=new Date(Date.now()+srs.interval*86400000).toISOString();

    return srs;
  }

  return {
    getXp,
    addXp,
    levelInfo,
    updateLongestStreak,
    normalize,
    initials,
    smartSearchMatch,
    sm2Grade
  };
})();
