//============ data ============
const LANES=[
  {key:'TOP',name:'탑'},
  {key:'JG',name:'정글'},
  {key:'MID',name:'미드'},
  {key:'ADC',name:'원딜'},
  {key:'SUP',name:'서폿'},
];
const POS=LANES.map(l=>l.key);
const LANE_NAME=Object.fromEntries(LANES.map(l=>[l.key,l.name]));

// 티어별 차등 점수 — 다이아까지 400점 단위, 마스터 이상 1000점 단위
const TIERS=[
  {key:'IRON',name:'아이언',color:'#7d756f',div:true},
  {key:'BRONZE',name:'브론즈',color:'#b3744a',div:true},
  {key:'SILVER',name:'실버',color:'#9fb1bd',div:true},
  {key:'GOLD',name:'골드',color:'#e3bb58',div:true},
  {key:'PLATINUM',name:'플래티넘',color:'#4cb6ac',div:true},
  {key:'EMERALD',name:'에메랄드',color:'#2cc173',div:true},
  {key:'DIAMOND',name:'다이아',color:'#5a78de',div:true},
  {key:'MASTER',name:'마스터',color:'#b95fd6',div:false},
  {key:'GRANDMASTER',name:'그랜드마스터',color:'#e54b4b',div:false},
  {key:'CHALLENGER',name:'챌린저',color:'#f3cb6e',div:false},
];
TIERS.forEach((t,i)=>{t.idx=i;});
const TIER_MAP=Object.fromEntries(TIERS.map(t=>[t.key,t]));

// 아이언~마스터(idx 0~7): 400점 단위 → 아이언 0 ... 다이아 2400, 마스터 2800
// 그마 이상(idx 8~): 마스터 2800 기준 1000점 단위 → 그마 3800, 챌린저 4800
const MASTER_IDX=TIER_MAP['MASTER'].idx;                          // 7
function tierBase(key){
  const idx=TIER_MAP[key].idx;
  if(idx<=MASTER_IDX) return idx*400;                             // 다이아 2400, 마스터 2800
  return MASTER_IDX*400 + (idx-MASTER_IDX)*1000;                  // 그마 3800, 챌린저 4800
}
// 마스터 이상은 점수 폭을 1000으로 (마스터 2800–3800, 그마 3800–4800 …), 그 외는 티어당 400
function tierBand(key){const b=tierBase(key);return TIER_MAP[key].div ? [b,b+399] : [b,b+1000];}
function divOffset(div){return (4-div)*100;}                     // 4→0, 3→100, 2→200, 1→300
function baseScoreOf(key,div){const t=TIER_MAP[key];return t.div ? tierBase(key)+divOffset(div) : tierBase(key);}
function clampToTier(key,score){const [lo,hi]=tierBand(key);return Math.max(lo,Math.min(hi,Math.round(score)));}
function tierColor(key){return TIER_MAP[key].color;}
function tierLabel(tierKey,div){const t=TIER_MAP[tierKey];return t.div?`${t.name} ${div}`:t.name;}
function scoreBadge(tierKey,score){return `<span class="tierbadge" style="color:${tierColor(tierKey)}">${TIER_MAP[tierKey].name} ${score}</span>`;}

//============ lane icons (구별 잘 되게: 위화살표/잎/엑스/조준/하트) ============
function laneSVG(pos){
  const inner={
    TOP:'<path d="M12 19V6M7 11l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    JG:'<path d="M12 21C6.3 17.4 6.3 8.6 12 4.5c5.7 4.1 5.7 12.9 0 16.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 6.5v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    MID:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    ADC:'<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    SUP:'<path d="M12 20C4.6 14.6 5.6 7.6 9.7 7.6c1.6 0 2.3 1.3 2.3 1.3s.7-1.3 2.3-1.3c4.1 0 5.1 7-2.3 12.4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  }[pos];
  return `<svg viewBox="0 0 24 24" fill="none">${inner}</svg>`;
}
const CHK='<svg viewBox="0 0 12 12" fill="none"><path d="M2 6.5l2.6 2.6L10 3.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_EDIT='<svg viewBox="0 0 24 24" fill="none"><path d="M14 5l5 5-9 9-5 1 1-5 8-10z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const ICON_DEL='<svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

//============ storage (v3) ============
const KEY='lol_inhouse_roster_v3';
const OLD_KEY='lol_inhouse_roster_v2';
let roster=[];
let memOnly=false;
let cloudActive=false;     // Firebase 실시간 동기화 켜짐 여부

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function normalizePlayer(p){
  const mt=p.mainTier||'GOLD', md=+p.mainDiv||2, st=p.subTier||'SILVER', sd=+p.subDiv||2;
  let ms=(typeof p.mainScore==='number')?p.mainScore:baseScoreOf(mt,md);
  let ss=(typeof p.subScore==='number')?p.subScore:baseScoreOf(st,sd);
  return {
    id:p.id||('p'+Date.now()+Math.random().toString(36).slice(2,6)),
    name:String(p.name).slice(0,18),
    mainLane:p.mainLane, mainTier:mt, mainDiv:md, mainScore:clampToTier(mt,ms),
    subLane:p.subLane, subTier:st, subDiv:sd, subScore:clampToTier(st,ss),
  };
}
function loadRoster(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){ const old=localStorage.getItem(OLD_KEY); if(old) raw=old; } // v2 명단 자동 이전
    if(!raw) return [];
    const arr=JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.filter(p=>p&&p.name&&p.mainLane&&p.subLane).map(normalizePlayer);
  }catch(e){ return []; }
}
function persist(){
  try{ localStorage.setItem(KEY, JSON.stringify(roster)); memOnly=false; }
  catch(e){ memOnly=true; }
  // 내가 바꾼 내용은 클라우드에도 올림 (연결돼 있을 때만)
  if(cloudActive && window.CLOUD){ try{ window.CLOUD.save(roster); }catch(e){} }
}

//============ cloud sync (Firebase 실시간) ============
// 클라우드에서 내려온 명단으로 화면을 갱신. (여기선 절대 persist/CLOUD.save 호출 안 함 → 되돌아오는 무한루프 방지)
function applyCloudData(players){
  roster = Array.isArray(players)
    ? players.filter(p=>p&&p.name&&p.mainLane&&p.subLane).map(normalizePlayer)
    : [];
  try{ localStorage.setItem(KEY, JSON.stringify(roster)); }catch(e){}   // 오프라인 대비 캐시
  [...selected].forEach(id=>{ if(!roster.find(p=>p.id===id)) selected.delete(id); }); // 사라진 선택 정리
  renderRoster();
  const balTab=document.querySelector('.tab[data-tab="balance"]');
  if(balTab && balTab.classList.contains('active')) renderPickGrid();
  if(battle){ try{ refreshBattle(); renderBattle(); }catch(e){} }
}
// index.html 의 Firebase 모듈이 준비되면 이 함수를 호출함
window.startCloudSync=function(){
  if(cloudActive || !window.CLOUD) return;
  cloudActive=true;
  const cs=document.getElementById('cloudStatus'); if(cs) cs.hidden=false;
  window.CLOUD.onData(function(players){
    if(players===null){
      // 클라우드에 아직 명단이 없으면, 지금 이 브라우저의 명단으로 최초 1회 올림(씨앗)
      try{ window.CLOUD.save(roster); }catch(e){}
      return;
    }
    applyCloudData(players);
  });
};

//============ state ============
let editingId=null;
let mainLane=null, subLane=null;
const selected=new Set();
let roundHistory=[];                // 최근 판들 {team, lane} — 팀/라인 겹침 방지
const HISTORY_MAX=5;
let battle=null;                    // 현재 결과 {blue, red, pm, settled}
let swapPick=null;                  // 수동 교체용 선택중인 선수
let undoStack=[];                   // 승리 되돌리기
// 티어별 승리 점수 변동 계수.
// 점수 폭이 400인 티어는 K=32, 마스터 이상(폭 1000)은 폭에 비례해 크게 → 스윙이 "폭의 약 8%"로 일정.
// (예전에는 마스터도 K=32라, 폭이 넓은 고티어에선 기대승률이 포화돼 +1밖에 안 올랐음)
function eloParams(tierKey){
  const idx=TIER_MAP[tierKey].idx;
  if(idx>=MASTER_IDX) return {K:80, D:1000, minStep:8};  // 마스터+ : 크게 움직이고, 최소 ±8 보장
  return {K:32, D:400, minStep:1};                       // 그 외 티어 : 기존과 동일
}
let balanceTol=30;                  // 밸런스 허용 점수차 (수동 조절 가능)

//============ toast ============
function toast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),1700);
}

//============ build form controls ============
function buildLanePick(containerId,which){
  const c=document.getElementById(containerId);
  c.innerHTML=LANES.map(l=>
    `<button type="button" data-lane="${l.key}">${laneSVG(l.key)}<span>${l.name}</span></button>`).join('');
  c.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      c.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      if(which==='main') mainLane=b.dataset.lane; else subLane=b.dataset.lane;
    };
  });
}
function fillTierSelect(sel){sel.innerHTML=TIERS.map(t=>`<option value="${t.key}">${t.name}</option>`).join('');}
function fillDivSelect(sel){sel.innerHTML=[4,3,2,1].map(d=>`<option value="${d}">${d}</option>`).join('');}
function syncTierMode(tierSel,divWrap,ptsWrap){
  const isDiv=TIER_MAP[tierSel.value].div;
  divWrap.style.display=isDiv?'':'none';
  ptsWrap.style.display=isDiv?'none':'';
}

buildLanePick('mainLanePick','main');
buildLanePick('subLanePick','sub');
fillTierSelect(document.getElementById('mainTier'));
fillTierSelect(document.getElementById('subTier'));
fillDivSelect(document.getElementById('mainDiv'));
fillDivSelect(document.getElementById('subDiv'));
document.getElementById('mainTier').value='GOLD';
document.getElementById('subTier').value='SILVER';
const mainTierEl=document.getElementById('mainTier'),mainDivWrap=document.getElementById('mainDivWrap'),mainPtsWrap=document.getElementById('mainPtsWrap'),mainPts=document.getElementById('mainPts');
const subTierEl=document.getElementById('subTier'),subDivWrap=document.getElementById('subDivWrap'),subPtsWrap=document.getElementById('subPtsWrap'),subPts=document.getElementById('subPts');
mainTierEl.onchange=()=>syncTierMode(mainTierEl,mainDivWrap,mainPtsWrap);
subTierEl.onchange=()=>syncTierMode(subTierEl,subDivWrap,subPtsWrap);
syncTierMode(mainTierEl,mainDivWrap,mainPtsWrap);syncTierMode(subTierEl,subDivWrap,subPtsWrap);

// 마스터+ LP 입력 → 실제 점수 (점수 폭 1000에 맞춰 LP 0~1000)
function laneScoreFromForm(tier,divVal,ptsEl){
  if(TIER_MAP[tier].div) return baseScoreOf(tier,divVal);
  const lp=Math.max(0,Math.min(1000, parseInt(ptsEl.value,10)||0));
  return clampToTier(tier, tierBase(tier)+lp);
}

// 밸런스 허용 점수차(TOL) 컨트롤
const tolInput=document.getElementById('tolInput');
function setTol(v){
  v=Math.max(0,Math.min(500,Math.round(v||0)));
  balanceTol=v; if(tolInput) tolInput.value=v;
  try{localStorage.setItem('lol_tol',v);}catch(e){}
  document.querySelectorAll('.tol-presets button').forEach(b=>b.classList.toggle('on',+b.dataset.tol===v));
}
if(tolInput){
  tolInput.onchange=()=>setTol(+tolInput.value);
  document.querySelectorAll('.tol-presets button').forEach(b=>b.onclick=()=>setTol(+b.dataset.tol));
}

// 점수표 legend 채우기
(function(){
  const lb=document.getElementById('legendBody');
  lb.innerHTML=TIERS.map(t=>{
    const [lo,hi]=tierBand(t.key);
    const rg = t.div ? `${lo}–${tierBase(t.key)+399}` : `${lo}–${hi} · LP 입력`;
    return `<div class="lg-row"><span class="nm" style="color:${t.color}">${t.name}</span><span class="rg">${rg}</span></div>`;
  }).join('');
})();

//============ tabs ============
document.querySelectorAll('.tab').forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('view-'+t.dataset.tab).classList.add('active');
    if(t.dataset.tab==='balance') renderPickGrid();
    if(t.dataset.tab==='ranking') renderRanking();
  };
});

//============ roster CRUD ============
const saveBtn=document.getElementById('saveBtn');
const cancelEdit=document.getElementById('cancelEdit');
const fName=document.getElementById('fName');

function resetForm(){
  editingId=null; mainLane=null; subLane=null;
  fName.value='';
  document.querySelectorAll('#mainLanePick button,#subLanePick button').forEach(b=>b.classList.remove('on'));
  mainTierEl.value='GOLD'; subTierEl.value='SILVER';
  document.getElementById('mainDiv').value='2'; document.getElementById('subDiv').value='2';
  mainPts.value=''; subPts.value='';
  syncTierMode(mainTierEl,mainDivWrap,mainPtsWrap);syncTierMode(subTierEl,subDivWrap,subPtsWrap);
  document.getElementById('formTitle').textContent='선수 등록';
  saveBtn.textContent='명단에 추가';
  cancelEdit.style.display='none';
}
cancelEdit.onclick=resetForm;

saveBtn.onclick=()=>{
  const name=fName.value.trim();
  if(!name){ flash(fName); return; }
  if(!mainLane){ alert('주 라인을 선택하세요.'); return; }
  if(!subLane){ alert('부 라인을 선택하세요.'); return; }
  const dup=roster.find(p=>p.name===name && p.id!==editingId);
  if(dup){ alert('같은 닉네임이 이미 있어요.'); return; }
  const mt=mainTierEl.value, md=+document.getElementById('mainDiv').value;
  const st=subTierEl.value, sd=+document.getElementById('subDiv').value;
  // 점수 산정: 마스터+ 는 LP 입력값, 그 외는 티어+단계. 단계가 그대로면 쌓인 점수 유지.
  let mainScore, subScore;
  if(TIER_MAP[mt].div){
    const cur=editingId&&roster.find(p=>p.id===editingId);
    mainScore=(cur && cur.mainTier===mt && cur.mainDiv===md && typeof cur.mainScore==='number')?cur.mainScore:baseScoreOf(mt,md);
  }else{
    mainScore=laneScoreFromForm(mt,md,mainPts);
  }
  if(TIER_MAP[st].div){
    const cur=editingId&&roster.find(p=>p.id===editingId);
    subScore=(cur && cur.subTier===st && cur.subDiv===sd && typeof cur.subScore==='number')?cur.subScore:baseScoreOf(st,sd);
  }else{
    subScore=laneScoreFromForm(st,sd,subPts);
  }
  const rec={
    id: editingId||('p'+Date.now()+Math.random().toString(36).slice(2,6)),
    name,
    mainLane, mainTier:mt, mainDiv:md, mainScore:clampToTier(mt,mainScore),
    subLane,  subTier:st, subDiv:sd, subScore:clampToTier(st,subScore),
  };
  if(editingId){ const i=roster.findIndex(p=>p.id===editingId); roster[i]=rec; }
  else roster.push(rec);
  persist(); resetForm(); renderRoster();
};

function startEdit(id){
  const p=roster.find(x=>x.id===id); if(!p)return;
  editingId=id;
  fName.value=p.name;
  mainLane=p.mainLane; subLane=p.subLane;
  document.querySelectorAll('#mainLanePick button').forEach(b=>b.classList.toggle('on',b.dataset.lane===p.mainLane));
  document.querySelectorAll('#subLanePick button').forEach(b=>b.classList.toggle('on',b.dataset.lane===p.subLane));
  mainTierEl.value=p.mainTier; subTierEl.value=p.subTier;
  document.getElementById('mainDiv').value=p.mainDiv; document.getElementById('subDiv').value=p.subDiv;
  mainPts.value=TIER_MAP[p.mainTier].div?'':(p.mainScore-tierBase(p.mainTier));
  subPts.value =TIER_MAP[p.subTier].div ?'':(p.subScore -tierBase(p.subTier));
  syncTierMode(mainTierEl,mainDivWrap,mainPtsWrap);syncTierMode(subTierEl,subDivWrap,subPtsWrap);
  document.getElementById('formTitle').textContent='선수 수정';
  saveBtn.textContent='수정 완료';
  cancelEdit.style.display='';
  document.getElementById('view-roster').scrollIntoView({behavior:'smooth',block:'start'});
}
function delPlayer(id){
  const p=roster.find(x=>x.id===id); if(!p)return;
  if(!confirm(`'${p.name}' 선수를 명단에서 삭제할까요?`))return;
  roster=roster.filter(x=>x.id!==id);
  selected.delete(id);
  if(editingId===id) resetForm();
  persist(); renderRoster();
}

function laneMini(lane,tierKey,score,role){
  return `<span class="lpair"><span class="role ${role==='m'?'m':'s'}">${role==='m'?'주':'부'}</span>`
    +`<span class="li">${laneSVG(lane)}</span><span class="lname">${LANE_NAME[lane]}</span>${scoreBadge(tierKey,score)}</span>`;
}
function renderRoster(){
  document.getElementById('rosterCount').textContent=roster.length+'명';
  renderRanking();   // 명단이 바뀔 때마다(승리 반영 포함) 순위도 실시간 갱신
  const list=document.getElementById('rosterList');
  if(roster.length===0){
    list.innerHTML='<div class="notice">아직 등록된 선수가 없어요.<br>위에서 닉네임과 주·부 라인을 입력해 명단을 만들어보세요.'
      +(memOnly?'<br><br><span style="color:#b3744a">⚠ 이 환경에서는 자동 저장이 안 될 수 있어요. 「데이터 백업」으로 따로 보관하세요.</span>':'')+'</div>';
    return;
  }
  list.innerHTML=roster.map(p=>`
    <div class="rcard">
      <span class="nm">${esc(p.name)}</span>
      <span class="lanes">
        ${laneMini(p.mainLane,p.mainTier,p.mainScore,'m')}
        ${laneMini(p.subLane,p.subTier,p.subScore,'s')}
      </span>
      <span class="acts">
        <button class="iconbtn" title="수정" data-edit="${p.id}">${ICON_EDIT}</button>
        <button class="iconbtn del" title="삭제" data-del="${p.id}">${ICON_DEL}</button>
      </span>
    </div>`).join('');
  list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
  list.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delPlayer(b.dataset.del));
}
function flash(el){el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',600);}

//============ 선수 순위 ============
// 대표 점수 = 주/부 라인 중 더 높은 점수
function repOf(p){
  return (p.mainScore>=p.subScore)
    ? {tierKey:p.mainTier,score:p.mainScore}
    : {tierKey:p.subTier, score:p.subScore};
}
function renderRanking(){
  const listEl=document.getElementById('rankList');
  if(!listEl) return;                       // 순위 탭이 없는 페이지 방어
  const cntEl=document.getElementById('rankCount');
  if(cntEl) cntEl.textContent=roster.length+'명';
  if(roster.length===0){
    listEl.innerHTML='<div class="notice">아직 등록된 선수가 없어요.<br>「선수 명단」 탭에서 선수를 등록하면 순위가 표시됩니다.</div>';
    return;
  }
  const ranked=roster.map(p=>({p,rep:repOf(p)})).sort((a,b)=>b.rep.score-a.rep.score);
  listEl.innerHTML=ranked.map((r,i)=>{
    const {p,rep}=r, rank=i+1;
    const topCls=rank<=3?` top${rank}`:'';
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const mainTxt=`주 ${LANE_NAME[p.mainLane]} ${scoreBadge(p.mainTier,p.mainScore)}`;
    const subTxt =`부 ${LANE_NAME[p.subLane]} ${scoreBadge(p.subTier,p.subScore)}`;
    return `<div class="rkrow${topCls}">
      <span class="rk">${medal}</span>
      <span class="who">
        <div class="nm">${esc(p.name)}</div>
        <div class="sub">${mainTxt}<span class="sep">·</span>${subTxt}</div>
      </span>
      <span class="rep">
        <div class="val" style="color:${tierColor(rep.tierKey)}">${rep.score}</div>
        <div class="lab">${TIER_MAP[rep.tierKey].name} · 대표점수</div>
      </span>
    </div>`;
  }).join('');
}

//============ balance pick grid ============
function renderPickGrid(){
  const g=document.getElementById('pickGrid');
  const note=document.getElementById('pickNote');
  const rc=document.getElementById('rosterCountBal');
  if(rc) rc.textContent='명단 '+roster.length+'명';

  if(roster.length===0){
    note.style.display='none';
    g.innerHTML=`<div class="empty-hint" style="grid-column:1/-1">아직 등록된 선수가 없어요. 「선수 명단」 탭에서 먼저 명단을 만들어주세요.</div>`;
    updateSelCount(); return;
  }
  if(roster.length<10){
    note.style.display='';
    note.innerHTML=`현재 명단 <b>${roster.length}명</b> · 팀을 짜려면 최소 10명이 필요해요. 그날 참가자를 체크하는 방식이라, 명단은 계속 쌓아두면 됩니다.`;
  }else{
    note.style.display='none';
  }
  g.innerHTML=roster.map(p=>`
    <div class="pcard ${selected.has(p.id)?'on':''}" data-pick="${p.id}">
      <span class="chk">${CHK}</span>
      <span class="info">
        <div class="pn">${esc(p.name)}</div>
        <div class="pl">
          <span style="color:${tierColor(p.mainTier)}">${LANE_NAME[p.mainLane]} ${TIER_MAP[p.mainTier].name} ${p.mainScore}</span>
        </div>
      </span>
    </div>`).join('');
  g.querySelectorAll('[data-pick]').forEach(c=>{
    c.onclick=()=>{
      const id=c.dataset.pick;
      if(selected.has(id)) selected.delete(id);
      else{ if(selected.size>=10) return; selected.add(id); }
      c.classList.toggle('on',selected.has(id));
      updateSelCount();
    };
  });
  updateSelCount();
}
function updateSelCount(){
  document.getElementById('selCount').textContent=selected.size;
  document.getElementById('makeBtn').disabled=(selected.size!==10);
}
document.getElementById('clearSel').onclick=()=>{
  selected.clear(); battle=null; document.getElementById('result').innerHTML=''; renderPickGrid();
};
document.getElementById('randPick').onclick=()=>{
  if(roster.length<10){toast('명단이 10명 이상이어야 해요');return;}
  selected.clear();
  const ids=roster.map(p=>p.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  ids.slice(0,10).forEach(id=>selected.add(id));
  renderPickGrid();
};

//============ balance algorithm ============
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function prep(players){
  return players.map(p=>{
    const ms=p.mainScore, ss=p.subScore;
    return {...p, mainScore:ms, subScore:ss,
      autoScore:Math.round(Math.min(ms,ss)*0.8),
      lowTier: ms<=ss?{t:p.mainTier,score:ms}:{t:p.subTier,score:ss}};
  });
}
function roleScore(p,pos){
  if(pos===p.mainLane) return {role:'main',score:p.mainScore};
  if(pos===p.subLane)  return {role:'sub', score:p.subScore};
  return {role:'auto', score:Math.round(Math.min(p.mainScore,p.subScore)*0.8)};
}

function randomAssign(players){
  const cap={TOP:2,JG:2,MID:2,ADC:2,SUP:2};
  const order=shuffle(players.slice());
  const res={};
  function bt(i){
    if(i===order.length)return true;
    const p=order[i];
    const prefs=[];
    if(cap[p.mainLane]>0) prefs.push({pos:p.mainLane,role:'main',score:p.mainScore});
    if(p.subLane!==p.mainLane && cap[p.subLane]>0) prefs.push({pos:p.subLane,role:'sub',score:p.subScore});
    if(prefs.length===2 && Math.random()<0.32) prefs.reverse();
    const autos=[];
    for(const pos of POS){ if(cap[pos]>0 && pos!==p.mainLane && pos!==p.subLane) autos.push({pos,role:'auto',score:p.autoScore}); }
    shuffle(autos);
    for(const c of prefs.concat(autos)){
      cap[c.pos]--; res[p.id]=c;
      if(bt(i+1))return true;
      cap[c.pos]++; delete res[p.id];
    }
    return false;
  }
  return bt(0)?res:null;
}
function bestSplit(res){
  const byPos={TOP:[],JG:[],MID:[],ADC:[],SUP:[]};
  for(const id in res) byPos[res[id].pos].push({id,...res[id]});
  let best=null;
  for(let mask=0;mask<32;mask++){
    const blue=[],red=[];let bt=0,rt=0;
    POS.forEach((pos,idx)=>{
      const [a,b]=byPos[pos];
      if((mask>>idx)&1){blue.push({...a,pos});red.push({...b,pos});bt+=a.score;rt+=b.score;}
      else{blue.push({...b,pos});red.push({...a,pos});bt+=b.score;rt+=a.score;}
    });
    const diff=Math.abs(bt-rt);
    if(!best||diff<best.diff) best={blue,red,blueTotal:bt,redTotal:rt,diff};
  }
  return best;
}
function objKey(res,split){
  let auto=0,sub=0;
  for(const id in res){if(res[id].role==='auto')auto++;else if(res[id].role==='sub')sub++;}
  return {auto,sub,diff:split.diff,key:auto*1e7+split.diff*10+sub};
}
function teamMapOf(sol){const m={};sol.split.blue.forEach(r=>m[r.id]='B');sol.split.red.forEach(r=>m[r.id]='R');return m;}
function laneMapOf(sol){const m={};for(const id in sol.res)m[id]=sol.res[id].pos;return m;}
function varietyPenalty(sol){
  if(roundHistory.length===0) return 0;
  const tm=teamMapOf(sol), lm=laneMapOf(sol);
  const ids=Object.keys(tm);
  let pen=0;
  roundHistory.forEach((h,idx)=>{
    const w=idx+1;
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      const a=ids[i],b=ids[j];
      if(h.team[a]!==undefined && h.team[b]!==undefined && tm[a]===tm[b] && h.team[a]===h.team[b]) pen+=3*w;
    }
    ids.forEach(id=>{ if(h.lane[id]!==undefined && h.lane[id]===lm[id]) pen+=1*w; });
  });
  return pen;
}
function generate(players){
  const P=prep(players);
  let best=null;const pool=[];
  const ITER=3500;
  for(let it=0;it<ITER;it++){
    const res=randomAssign(P);if(!res)continue;
    const split=bestSplit(res);
    const ok=objKey(res,split);
    const sol={res,split,ok,players:P};
    if(!best||ok.key<best.ok.key) best=sol;
    if(pool.length<900) pool.push(sol);
    else if(Math.random()<0.25) pool[Math.floor(Math.random()*pool.length)]=sol;
  }
  const TOL=balanceTol;
  let cand=pool.filter(s=>s.ok.auto===best.ok.auto && s.ok.diff<=best.ok.diff+TOL);
  if(cand.length===0) cand=[best];
  cand.forEach(s=>{ s.variety=varietyPenalty(s); });
  cand.sort((a,b)=> a.variety-b.variety || a.ok.diff-b.ok.diff || (Math.random()-0.5));
  return cand[0];
}

//============ battle (결과 + 수동 교체 + 승리) ============
function verdict(diff){
  if(diff<=20)return{t:'완벽한 밸런스',c:'var(--blue)'};
  if(diff<=80)return{t:'아주 좋음',c:'var(--gold)'};
  if(diff<=160)return{t:'무난함',c:'var(--gold)'};
  return{t:'다소 차이 있음',c:'var(--red)'};
}
function pmap(P){const m={};P.forEach(p=>m[p.id]=p);return m;}

function makeBattle(){
  const players=roster.filter(p=>selected.has(p.id));
  if(players.length!==10){toast('정확히 10명을 선택하세요');return;}
  const sol=generate(players);
  roundHistory.push({team:teamMapOf(sol),lane:laneMapOf(sol)});
  if(roundHistory.length>HISTORY_MAX) roundHistory.shift();
  battle={
    blue: sol.split.blue.map(r=>({id:r.id,pos:r.pos,role:r.role,score:r.score})),
    red:  sol.split.red.map(r=>({id:r.id,pos:r.pos,role:r.role,score:r.score})),
    pm: pmap(sol.players),
    settled:false,
  };
  swapPick=null;
  renderBattle();
}

function refreshBattle(){
  const ids=[...battle.blue,...battle.red].map(r=>r.id);
  battle.pm=pmap(prep(roster.filter(p=>ids.includes(p.id))));
  [...battle.blue,...battle.red].forEach(r=>{ const rs=roleScore(battle.pm[r.id],r.pos); r.role=rs.role; r.score=rs.score; });
}

function findRow(id){
  for(const r of battle.blue) if(r.id===id) return {row:r,team:'blue'};
  for(const r of battle.red)  if(r.id===id) return {row:r,team:'red'};
  return null;
}
function doSwap(idA,idB){
  if(!battle||battle.settled||idA===idB)return;
  const all=[...battle.blue.map(r=>({...r,team:'blue'})),...battle.red.map(r=>({...r,team:'red'}))];
  const ra=all.find(r=>r.id===idA), rb=all.find(r=>r.id===idB);
  if(!ra||!rb)return;
  const tmp={team:ra.team,pos:ra.pos};
  ra.team=rb.team; ra.pos=rb.pos;
  rb.team=tmp.team; rb.pos=tmp.pos;
  [ra,rb].forEach(r=>{ const rs=roleScore(battle.pm[r.id],r.pos); r.role=rs.role; r.score=rs.score; });
  battle.blue=all.filter(r=>r.team==='blue').map(({team,...r})=>r);
  battle.red =all.filter(r=>r.team==='red').map(({team,...r})=>r);
}
function onRowClick(id){
  if(!battle||battle.settled)return;
  if(swapPick===null){ swapPick=id; }
  else if(swapPick===id){ swapPick=null; }
  else { doSwap(swapPick,id); swapPick=null; }
  renderBattle();
}

// 승리 반영: 친 라인의 점수만, 그 티어 범위 안에서만 변동 (티어 이동 없음)
function applyWin(winner){
  if(!battle||battle.settled)return;
  const bAvg=battle.blue.reduce((s,r)=>s+r.score,0)/5;
  const rAvg=battle.red.reduce((s,r)=>s+r.score,0)/5;
  const snap=[];
  function adj(rows,oppAvg,won){
    rows.forEach(r=>{
      const p=roster.find(x=>x.id===r.id); if(!p)return;
      const laneKey = r.role==='sub'?'sub' : r.role==='main'?'main' : (p.mainScore<=p.subScore?'main':'sub');
      const cur = laneKey==='main'?p.mainScore:p.subScore;
      const tierKey = laneKey==='main'?p.mainTier:p.subTier;
      const {K,D,minStep}=eloParams(tierKey);          // 티어별 계수 (마스터+는 크게)
      const E=1/(1+Math.pow(10,(oppAvg-cur)/D));
      let d=Math.round(K*((won?1:0)-E));
      if(won&&d<minStep)d=minStep; if(!won&&d>-minStep)d=-minStep;  // 이기면 최소 +minStep, 지면 최소 -minStep
      snap.push({id:p.id,lane:laneKey,prev:cur});
      const next=clampToTier(tierKey,cur+d);    // 티어 범위 밖으로는 절대 안 나감
      if(laneKey==='main') p.mainScore=next; else p.subScore=next;
    });
  }
  adj(battle.blue, rAvg, winner==='blue');
  adj(battle.red,  bAvg, winner==='red');
  undoStack.push({snap,winner});
  persist();
  battle.settled=winner;
  refreshBattle(); renderBattle(); renderRoster();
  toast(`${winner==='blue'?'1팀(블루)':'2팀(레드)'} 승리 반영 완료 — 점수가 조금 조정됐어요`);
}
function undoWin(){
  const last=undoStack.pop(); if(!last){toast('되돌릴 결과가 없어요');return;}
  last.snap.forEach(s=>{const p=roster.find(x=>x.id===s.id);if(!p)return; if(s.lane==='main')p.mainScore=s.prev; else p.subScore=s.prev;});
  persist();
  if(battle) battle.settled=false;
  refreshBattle(); renderBattle(); renderRoster();
  toast('승리 반영을 되돌렸어요');
}
function copyTeams(){
  const line=rows=>[...rows].sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos))
    .map(r=>{const p=battle.pm[r.id];return `${LANE_NAME[r.pos]} ${p.name}(${r.score})`;}).join(', ');
  const bt=battle.blue.reduce((s,r)=>s+r.score,0), rt=battle.red.reduce((s,r)=>s+r.score,0);
  const txt=`[블루팀/1팀] 합계 ${bt}\n${line(battle.blue)}\n\n[레드팀/2팀] 합계 ${rt}\n${line(battle.red)}`;
  try{navigator.clipboard.writeText(txt);}catch(e){
    const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');}catch(_){}document.body.removeChild(ta);
  }
  toast('팀 구성을 복사했어요');
}

function teamPanel(cls,label,rows){
  const sorted=[...rows].sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos));
  const total=sorted.reduce((s,r)=>s+r.score,0);
  const body=sorted.map(r=>{
    const p=battle.pm[r.id];
    const roleCls=r.role==='main'?'m':r.role==='sub'?'s':'a';
    const roleTxt=r.role==='main'?'주':r.role==='sub'?'부':'자동';
    const tierKey = r.role==='main'?p.mainTier : r.role==='sub'?p.subTier : (p.mainScore<=p.subScore?p.mainTier:p.subTier);
    const picked = swapPick===r.id?' picked':'';
    const sw = battle.settled?'':' swappable';
    const drag = battle.settled?'':' draggable="true"';
    return `<div class="prow${sw}${picked}" data-id="${r.id}"${drag}>
      <span class="lico">${laneSVG(r.pos)}</span>
      <span class="pmain">
        <span class="top"><span class="rl ${roleCls}">${roleTxt}</span><span class="nm">${esc(p.name)}</span></span>
        <span class="bot">${LANE_NAME[r.pos]} · ${scoreBadge(tierKey,r.score)}</span>
      </span>
      <span class="pscore">${r.score}</span>
    </div>`;
  }).join('');
  return {html:`<div class="team ${cls}"><div class="thead"><span class="tname">${label}</span><span class="ttot">${total}</span></div><div class="tbody">${body}</div></div>`, total};
}

function renderBattle(){
  const res=document.getElementById('result');
  if(!battle){ res.innerHTML=''; return; }
  const B=teamPanel('blue','블루팀 · 1팀',battle.blue);
  const R=teamPanel('red','레드팀 · 2팀',battle.red);
  const diff=Math.abs(B.total-R.total);
  const v=verdict(diff);
  const tot=B.total+R.total, bp=tot?Math.round(B.total/tot*100):50;
  const auto=[...battle.blue,...battle.red].filter(r=>r.role==='auto').length;

  let controls;
  if(!battle.settled){
    controls=`<div class="winrow">
      <button class="btn winblue" data-win="blue">1팀(블루) 승리</button>
      <button class="btn winred" data-win="red">2팀(레드) 승리</button>
    </div>`;
  }else{
    const w=battle.settled==='blue'?'1팀(블루)':'2팀(레드)';
    controls=`<div class="settled">🏆 ${w} 승리 반영됨 — 점수가 티어 범위 안에서 조정되었어요</div>
      <div class="winrow"><button class="btn ghost" id="undoWin">되돌리기</button></div>`;
  }
  const swapHint = battle.settled?'':'<div class="swap-hint">선수를 클릭(또는 드래그)해 다른 선수와 위치를 맞바꿀 수 있어요</div>';
  const autoNote = auto>0?`<div class="auto-note">⚠ 주·부 라인에 없는 포지션은 자동으로 배치했어요(자동 ${auto}명, 점수 ×0.8 보정). 예: 서폿 가능자가 부족하면 누군가 서폿으로 자동 배치돼요.</div>`:'';
  const histLink = roundHistory.length>1?`<button class="minilink" id="resetHistory">섞기 기록 초기화 (최근 ${roundHistory.length}판 기억 중)</button>`:'';

  res.innerHTML=`
  <div class="panel battle" style="padding:2px;border-color:var(--gold-dim)">
    <div style="padding:16px 18px 0;text-align:center"><div class="cs-label">Champion Select</div></div>
    <div style="padding:18px">
      <div class="vs-wrap">${B.html}<div class="vsmid"><div class="vline"></div><div class="vs">VS</div><div class="vline"></div></div>${R.html}</div>
      ${swapHint}
      ${autoNote}
      <div class="balbar-wrap">
        <div class="balbar"><span class="b" style="width:${bp}%"></span><span class="r" style="width:${100-bp}%"></span></div>
        <div class="baltxt">점수 차이 <span class="diff">${diff}</span><span class="verdict" style="color:${v.c};border-color:${v.c}">${v.t}</span></div>
        <div style="font-size:11px;color:var(--text-mute);margin-top:8px">블루 ${B.total} · 레드 ${R.total}${auto?` · 자동배치 ${auto}명`:''}</div>
      </div>
      ${controls}
      <div class="btn-row" style="justify-content:center;margin-top:16px">
        <button class="btn solid" id="battleRemake">현재 멤버로 다시 짜기</button>
        <button class="btn ghost" id="copyTeams">팀 구성 복사</button>
      </div>
      ${histLink?`<div style="text-align:center;margin-top:10px">${histLink}</div>`:''}
    </div>
  </div>`;

  // bind
  res.querySelectorAll('.prow.swappable').forEach(el=>{
    el.onclick=()=>onRowClick(el.dataset.id);
    el.ondragstart=e=>{e.dataTransfer.setData('text/plain',el.dataset.id);el.classList.add('dragging');};
    el.ondragend=()=>el.classList.remove('dragging');
    el.ondragover=e=>{e.preventDefault();el.classList.add('dragover');};
    el.ondragleave=()=>el.classList.remove('dragover');
    el.ondrop=e=>{e.preventDefault();el.classList.remove('dragover');
      const from=e.dataTransfer.getData('text/plain');
      if(from&&from!==el.dataset.id){ doSwap(from,el.dataset.id); swapPick=null; renderBattle(); }};
  });
  res.querySelectorAll('[data-win]').forEach(b=>b.onclick=()=>applyWin(b.dataset.win));
  const u=document.getElementById('undoWin'); if(u)u.onclick=undoWin;
  const rm=document.getElementById('battleRemake'); if(rm)rm.onclick=makeBattle;
  const cp=document.getElementById('copyTeams'); if(cp)cp.onclick=copyTeams;
  const rh=document.getElementById('resetHistory'); if(rh)rh.onclick=()=>{roundHistory=[];renderBattle();toast('섞기 기록을 비웠어요');};

  res.scrollIntoView({behavior:'smooth',block:'nearest'});
}

document.getElementById('makeBtn').onclick=makeBattle;

//============ backup modal ============
const modalBg=document.getElementById('modalBg');
document.getElementById('backupBtn').onclick=()=>{
  document.getElementById('backupArea').value=JSON.stringify(roster,null,2);
  modalBg.classList.add('open');
};
document.getElementById('closeModal').onclick=()=>modalBg.classList.remove('open');
modalBg.onclick=e=>{if(e.target===modalBg)modalBg.classList.remove('open');};
document.getElementById('copyData').onclick=()=>{
  const ta=document.getElementById('backupArea');ta.select();
  try{navigator.clipboard.writeText(ta.value);}catch(e){document.execCommand('copy');}
  const b=document.getElementById('copyData');const o=b.textContent;b.textContent='복사됨!';setTimeout(()=>b.textContent=o,1200);
};
document.getElementById('importData').onclick=()=>{
  try{
    const data=JSON.parse(document.getElementById('backupArea').value);
    if(!Array.isArray(data))throw 0;
    roster=data.filter(p=>p&&p.name&&p.mainLane&&p.subLane).map(normalizePlayer);
    persist(); selected.clear(); battle=null;
    renderRoster(); renderPickGrid();
    document.getElementById('result').innerHTML='';
    modalBg.classList.remove('open');
    toast('명단을 불러왔어요');
  }catch(e){alert('형식이 올바르지 않아요. 백업한 JSON 텍스트를 그대로 붙여넣어 주세요.');}
};

//============ init ============
(function init(){
  roster=loadRoster();
  try{ localStorage.setItem('lol_probe','1'); localStorage.removeItem('lol_probe'); }
  catch(e){ memOnly=true; }
  try{ const tv=localStorage.getItem('lol_tol'); setTol(tv!=null?+tv:30); }catch(e){ setTol(30); }
  persist(); // v2 → v3 마이그레이션 결과 저장 (점수 필드 포함)
  renderRoster();
})();
