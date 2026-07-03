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
let POS_SVGS=null;   // 라이엇 공식 포지션 아이콘 (런타임 로드, 실패 시 자체 아이콘)
function laneSVG(pos){
  if(POS_SVGS&&POS_SVGS[pos]) return POS_SVGS[pos];
  const inner={
    TOP:'<path d="M4 4h12.2l-3.1 3.1H7.1v6L4 16.2z" fill="currentColor"/>'
       +'<path d="M20 20H7.8l3.1-3.1h6v-6L20 7.8z" fill="currentColor" opacity=".32"/>'
       +'<rect x="9.4" y="9.4" width="5.2" height="5.2" fill="currentColor"/>',
    JG:'<path d="M12 1.8c2.9 4.7 3.5 10.6.7 17.6L12 21l-.7-1.6C8.5 12.4 9.1 6.5 12 1.8z" fill="currentColor"/>'
      +'<path d="M6.2 5.5c2 1.7 3.4 4 3.9 6.9-1.3 2.1-2.1 4.5-2.4 7.2C4.9 15.7 4.4 10.2 6.2 5.5z" fill="currentColor" opacity=".55"/>'
      +'<path d="M17.8 5.5c1.8 4.7 1.3 10.2-1.5 14.1-.3-2.7-1.1-5.1-2.4-7.2.5-2.9 1.9-5.2 3.9-6.9z" fill="currentColor" opacity=".55"/>',
    MID:'<path d="M4 20v-4.9L15.1 4H20v4.9L8.9 20z" fill="currentColor"/>'
       +'<path d="M4 4h8.4L9.3 7.1H7.1v2.2L4 12.4z" fill="currentColor" opacity=".32"/>'
       +'<path d="M20 20h-8.4l3.1-3.1h2.2v-2.2L20 11.6z" fill="currentColor" opacity=".32"/>',
    ADC:'<path d="M20 20H7.8l3.1-3.1h6v-6L20 7.8z" fill="currentColor"/>'
       +'<path d="M4 4h12.2l-3.1 3.1H7.1v6L4 16.2z" fill="currentColor" opacity=".32"/>'
       +'<rect x="9.4" y="9.4" width="5.2" height="5.2" fill="currentColor"/>',
    SUP:'<path d="M12 3.4l3.5 2v4.1c0 3.3-1.3 5.8-3.5 7.6-2.2-1.8-3.5-4.3-3.5-7.6V5.4z" fill="currentColor"/>'
       +'<path d="M2.4 8c2.4-.6 4.5-.4 6.2.6-.5 1-.8 2.2-.9 3.4C5.5 11.6 3.8 10.2 2.4 8z" fill="currentColor" opacity=".55"/>'
       +'<path d="M21.6 8c-1.4 2.2-3.1 3.6-5.3 4-.1-1.2-.4-2.4-.9-3.4 1.7-1 3.8-1.2 6.2-.6z" fill="currentColor" opacity=".55"/>'
       +'<path d="M12 17.8l1.5 2L12 22.2l-1.5-2.4z" fill="currentColor" opacity=".7"/>',
  }[pos];
  return `<svg viewBox="0 0 24 24" fill="none">${inner}</svg>`;
}
// 대표 티어 문장(엠블럼) — 라이엇 공식 미니 문장, 실패 시 자체 문장으로 폴백
function crestFallbackSVG(tierKey){
  const c=tierColor(tierKey);
  return `<svg viewBox="0 0 24 24" class="crest" style="color:${c}">`
    +`<path d="M12 3.6l2.3 3.5 4.9-1.8-1.6 5.1L21.8 13c-2.5 3.1-5.2 4.8-9.8 6.6C7.4 17.8 4.7 16.1 2.2 13l4.2-2.6-1.6-5.1 4.9 1.8z" fill="currentColor" opacity=".92"/>`
    +`<path d="M12 8.3l1.3 2 2.3-.6-.8 2.4 1.9 1.2c-1.3 1.5-2.8 2.4-4.7 3.2-1.9-.8-3.4-1.7-4.7-3.2l1.9-1.2-.8-2.4 2.3.6z" fill="#04070d" opacity=".5"/>`
    +`</svg>`;
}
window.__crestFB=function(el,tierKey){ el.outerHTML=crestFallbackSVG(tierKey); };
function tierCrest(tierKey){
  const t=String(tierKey).toLowerCase();
  return `<img class="crest img" alt="${TIER_MAP[tierKey].name}" title="${TIER_MAP[tierKey].name}"`
    +` src="https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${t}.svg"`
    +` onerror="window.__crestFB(this,'${tierKey}')">`;
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
    wins:Math.max(0,parseInt(p.wins,10)||0),
    losses:Math.max(0,parseInt(p.losses,10)||0),
    hist:Array.isArray(p.hist)?p.hist.slice(0,30):[],
    mvp:Math.max(0,parseInt(p.mvp,10)||0),
    honor:Math.max(0,parseInt(p.honor,10)||0),
    customTitles:Array.isArray(p.customTitles)?p.customTitles.map(t=>String(t).slice(0,12)).slice(0,4):[],
    mostChamps:Array.isArray(p.mostChamps)?p.mostChamps.map(t=>String(t).slice(0,16)).slice(0,3):[],
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
  if(window.CLOUD.onVote) window.CLOUD.onVote(applyVoteData);   // 실시간 MVP 투표 구독
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

//============ 같은 팀 묶기 (pairs) ============
const PAIR_MAX=4;
const PAIR_COLORS=['#0ac8b9','#e3bb58','#b95fd6','#e25555'];
let pairs=(function(){try{const a=JSON.parse(localStorage.getItem('lol_pairs')||'[]');
  return Array.isArray(a)?a.filter(x=>Array.isArray(x)&&x.length===2):[];}catch(e){return[];}})();
let pairMode=false;                 // 묶기 모드 on/off
let pairBuf=null;                   // 묶기 모드에서 첫 번째로 고른 선수
function persistPairs(){try{localStorage.setItem('lol_pairs',JSON.stringify(pairs));}catch(e){}}
function pairIndexOf(id){return pairs.findIndex(pr=>pr.includes(id));}
function removePairWith(id){const i=pairIndexOf(id);if(i>=0){pairs.splice(i,1);persistPairs();}}
function cleanPairs(){ // 명단/선택에서 빠진 선수가 낀 묶기는 자동 해제
  const before=pairs.length;
  pairs=pairs.filter(pr=>pr.every(id=>selected.has(id)&&roster.find(p=>p.id===id)));
  if(pairs.length!==before)persistPairs();
}

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
document.querySelectorAll('.tab[data-tab]').forEach(t=>{
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
    wins:0, losses:0, hist:[], mvp:0, honor:0, customTitles:[], mostChamps:[],
  };
  if(editingId){ const old=roster.find(p=>p.id===editingId);
    if(old){ rec.wins=old.wins||0; rec.losses=old.losses||0; rec.hist=old.hist||[];
      rec.mvp=old.mvp||0; rec.honor=old.honor||0; rec.customTitles=old.customTitles||[];
      rec.mostChamps=old.mostChamps||[]; } }
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
  list.innerHTML=roster.map(p=>{
    const g=(p.wins||0)+(p.losses||0);
    const rec=g?`<span class="recmini">${p.wins||0}승 ${p.losses||0}패</span>`:'';
    return `
    <div class="rcard">
      <span class="nm click" data-info="${p.id}" title="선수 정보 보기">${esc(p.name)}${rec}</span>
      <span class="lanes">
        ${laneMini(p.mainLane,p.mainTier,p.mainScore,'m')}
        ${laneMini(p.subLane,p.subTier,p.subScore,'s')}
      </span>
      <span class="acts">
        <button class="iconbtn" title="수정" data-edit="${p.id}">${ICON_EDIT}</button>
        <button class="iconbtn del" title="삭제" data-del="${p.id}">${ICON_DEL}</button>
      </span>
    </div>`;}).join('');
  list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
  list.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delPlayer(b.dataset.del));
  list.querySelectorAll('.nm[data-info]').forEach(el=>el.onclick=()=>openInfo(el.dataset.info));
}
function flash(el){el.style.borderColor='var(--red)';setTimeout(()=>el.style.borderColor='',600);}

//============ 칭호 (titles) ============
const TITLE_DEFS=[
  {k:'top',  e:'👑', n:'정상의 자리', c:'#f3cb6e', d:'리더보드 1위 (1판 이상)'},
  {k:'place',e:'🐣', n:'배치중',     c:'#e3bb58', d:'내전 3판 미만'},
  {k:'hot',  e:'🔥', n:'연승가도',   c:'#ff8a5c', d:'최근 3연승 중'},
  {k:'swamp',e:'💦', n:'연패의늪',   c:'#7fa8ff', d:'최근 3연패 중'},
  {k:'carry',e:'👨‍🍳', n:'캐리머신',   c:'#0ac8b9', d:'5판 이상 · 승률 70% 이상'},
  {k:'grief',e:'🌧️', n:'억까당함',   c:'#9fb1bd', d:'5판 이상 · 승률 30% 이하'},
  {k:'pog',  e:'🎖️', n:'POG 콜렉터', c:'#b95fd6', d:'POG/MVP 3회 이상'},
  {k:'flex', e:'🧩', n:'만능 일꾼',  c:'#4cb6ac', d:'주·부가 아닌 라인(자동 배치)으로 3판 이상'},
  {k:'iron', e:'🦾', n:'개근왕',     c:'#c8aa6e', d:'내전 10판 이상 참여'},
];
const TD=Object.fromEntries(TITLE_DEFS.map(t=>[t.k,t]));
function titlesOf(p,rank){
  const w=p.wins||0,l=p.losses||0,g=w+l,h=p.hist||[],t=[];
  const streak =n=>h.length>=n&&h.slice(0,n).every(x=>x.win);
  const lstreak=n=>h.length>=n&&h.slice(0,n).every(x=>!x.win);
  if(rank===1&&g>0)t.push(TD.top);
  if(g<3)t.push(TD.place);
  if(streak(3))t.push(TD.hot);
  if(lstreak(3))t.push(TD.swamp);
  if(g>=5&&w/g>=0.7)t.push(TD.carry);
  if(g>=5&&w/g<=0.3)t.push(TD.grief);
  if((p.mvp||0)>=3)t.push(TD.pog);
  if(h.filter(x=>x.role==='auto').length>=3)t.push(TD.flex);
  if(g>=10)t.push(TD.iron);
  return t;
}
function titleBadge(t){return `<span class="tbadge" style="color:${t.c};border-color:${t.c}" title="${esc(t.d||'')}">${t.e}${esc(t.n)}</span>`;}
function customBadge(name){return `<span class="tbadge custom" title="사용자 지정 칭호">🏷️${esc(name)}</span>`;}
function badgesHTML(p,rank,max){
  const arr=(p.customTitles||[]).map(customBadge).concat(titlesOf(p,rank).map(titleBadge));
  return arr.slice(0,max||99).join('')||'<span class="tbadge none">—</span>';
}

//============ 모스트 챔프 아이콘 (Riot DDragon) ============
let CHAMP_MAP=null;
function fillChampDL(){
  const dl=document.getElementById('champDL');
  if(!dl||!CHAMP_MAP||!Array.isArray(CHAMP_MAP._names))return;
  dl.innerHTML=CHAMP_MAP._names.map(n=>`<option value="${esc(n)}">`).join('');
}
function loadChampMap(){
  try{
    const cached=localStorage.getItem('lol_champ_map_v2');
    if(cached){ CHAMP_MAP=JSON.parse(cached); fillChampDL(); return; }
  }catch(e){}
  if(typeof fetch!=='function')return;
  fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    .then(r=>r.json())
    .then(vers=>fetch(`https://ddragon.leagueoflegends.com/cdn/${vers[0]}/data/ko_KR/champion.json`)
      .then(r=>r.json()).then(data=>{
        const m={_ver:vers[0],_names:[]};
        Object.values(data.data).forEach(c=>{
          m._names.push(c.name);
          m[c.name.replace(/\s/g,'').toLowerCase()]=c.id;   // 한글 이름
          m[c.id.toLowerCase()]=c.id;                        // 영문 키
        });
        m._names.sort();
        CHAMP_MAP=m;
        try{localStorage.setItem('lol_champ_map_v2',JSON.stringify(m));}catch(e){}
        fillChampDL(); renderRoster();
        if(battle){try{renderBattle();}catch(e){}}
      }))
    .catch(()=>{});
}
// 라이엇 공식 포지션 아이콘 로드 (SVG를 인라인해 currentColor로 색을 물들임)
function loadPosIcons(){
  try{
    const cached=localStorage.getItem('lol_pos_svgs_v1');
    if(cached){ POS_SVGS=JSON.parse(cached); return; }
  }catch(e){}
  if(typeof fetch!=='function')return;
  const FILE={TOP:'top',JG:'jungle',MID:'middle',ADC:'bottom',SUP:'utility'};
  const base='https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/svg/position-';
  Promise.all(POS.map(p=>fetch(base+FILE[p]+'.svg').then(r=>{if(!r.ok)throw 0;return r.text();})))
    .then(texts=>{
      const m={};
      POS.forEach((p,i)=>{
        let t=texts[i]
          .replace(/<\?xml[\s\S]*?\?>/g,'')
          .replace(/<script[\s\S]*?<\/script>/gi,'')
          .replace(/\s(width|height)="[^"]*"/g,'')
          .replace(/fill="[^"]*"/g,'fill="currentColor"')
          .replace(/fill:\s*#[0-9a-fA-F]+/g,'fill:currentColor');
        if(!/^<svg/.test(t.trim()))throw 0;
        m[p]=t.trim();
      });
      POS_SVGS=m;
      try{localStorage.setItem('lol_pos_svgs_v1',JSON.stringify(m));}catch(e){}
      renderRoster();
      if(battle){try{renderBattle();}catch(e){}}
    })
    .catch(()=>{});
}
function champIcon(name,count){
  const raw=String(name);
  const k=raw.replace(/\s/g,'').toLowerCase();
  const id=CHAMP_MAP&&CHAMP_MAP[k];
  const tip=count?`${esc(raw)} · ${count}회 플레이`:esc(raw);
  if(id&&CHAMP_MAP._ver)
    return `<img class="champ" loading="lazy" src="https://ddragon.leagueoflegends.com/cdn/${CHAMP_MAP._ver}/img/champion/${id}.png" alt="${esc(raw)}" title="${tip}">`;
  return `<span class="champ txt" title="${tip}">${esc(raw.slice(0,3))}</span>`;
}
// 내전에서 실제 플레이한 챔피언 기반 모스트 (기록 없으면 예전 수동 입력값 폴백)
function mostChampsOf(p){
  const cnt={};
  (p.hist||[]).forEach(h=>{
    if(h.champ){ const k=String(h.champ).trim(); if(k)cnt[k]=(cnt[k]||0)+1; }
  });
  const played=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(played.length) return played;                              // [[이름,횟수],...]
  return (p.mostChamps||[]).slice(0,3).map(n=>[n,0]);
}
function champsHTML(p){
  const arr=mostChampsOf(p);
  return arr.length?arr.map(([n,c])=>champIcon(n,c)).join(''):'<span class="champ none">—</span>';
}

//============ 선수 순위 ============//============ 선수 순위 ============
let lbLane='ALL';   // 리더보드 포지션 필터
function renderLbFilter(){
  const f=document.getElementById('lbFilter'); if(!f)return;
  f.innerHTML=`<button data-lane="ALL" class="${lbLane==='ALL'?'on':''}" title="전체"><span class="all">✦</span></button>`
    +LANES.map(l=>`<button data-lane="${l.key}" class="${lbLane===l.key?'on':''}" title="${l.name}">${laneSVG(l.key)}</button>`).join('');
  f.querySelectorAll('button').forEach(b=>b.onclick=()=>{lbLane=b.dataset.lane;renderRanking();});
}
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
  renderLbFilter();
  const rankedAll=roster.map(p=>({p,rep:repOf(p)})).sort((a,b)=>b.rep.score-a.rep.score);
  const globalRank={}; rankedAll.forEach((r,i)=>globalRank[r.p.id]=i+1);
  const ranked=lbLane==='ALL'?rankedAll
    :rankedAll.filter(r=>r.p.mainLane===lbLane||r.p.subLane===lbLane);
  if(cntEl) cntEl.textContent=lbLane==='ALL'?roster.length+'명':`${LANE_NAME[lbLane]} ${ranked.length}명`;
  if(ranked.length===0){
    listEl.innerHTML='<div class="notice">이 포지션을 주·부 라인으로 등록한 선수가 없어요.</div>';
    return;
  }
  const head=`<div class="lbhead"><span>순위</span><span>소환사</span><span class="c">MMR</span><span class="c">명예</span><span class="c">티어</span><span>상태</span><span class="c">내전 승률</span><span class="c">포지션</span><span class="c">모스트 챔프</span></div>`;
  listEl.innerHTML=head+ranked.map((r,i)=>{
    const {p,rep}=r, rank=i+1;               // 필터 내 순위 (메달 표시용)
    const gRank=globalRank[p.id];            // 전체 순위 (칭호 판정용)
    const topCls=rank<=3?` top${rank}`:'';
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const w=p.wins||0,l=p.losses||0,g=w+l;
    const wr=g?Math.round(w/g*100):0;
    return `<div class="lbrow${topCls}" data-info="${p.id}" title="선수 정보 보기">
      <span class="rk">${medal}</span>
      <span class="who">
        <div class="nm">${esc(p.name)}</div>
        <div class="sub">주 ${LANE_NAME[p.mainLane]} ${scoreBadge(p.mainTier,p.mainScore)}<span class="sep">·</span>부 ${LANE_NAME[p.subLane]} ${scoreBadge(p.subTier,p.subScore)}</div>
      </span>
      <span class="mmr" style="color:${tierColor(rep.tierKey)}">${rep.score}</span>
      <span class="honor">${p.honor||0}</span>
      <span class="tieric" title="${TIER_MAP[rep.tierKey].name}">${tierCrest(rep.tierKey)}</span>
      <span class="status">${badgesHTML(p,gRank,3)}</span>
      <span class="wr">
        ${g?`<div class="pct">${wr}%</div><div class="cnt">${g}전 ${w}승 ${l}패</div>`:`<div class="pct none">—</div><div class="cnt">기록 없음</div>`}
        <div class="bar"><span style="width:${g?wr:0}%"></span></div>
      </span>
      <span class="posic" title="주 라인 ${LANE_NAME[p.mainLane]}">${laneSVG(p.mainLane)}</span>
      <span class="champs">${champsHTML(p)}</span>
    </div>`;
  }).join('');
  listEl.querySelectorAll('[data-info]').forEach(el=>el.onclick=()=>openInfo(el.dataset.info));
}

//============ balance pick grid ============
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
  cleanPairs();
  g.classList.toggle('pairmode',pairMode);
  g.innerHTML=roster.map(p=>{
    const pi=pairIndexOf(p.id);
    const pc=pi>=0?PAIR_COLORS[pi%PAIR_COLORS.length]:'';
    const ptag=pi>=0?`<span class="pairtag" style="color:${pc};border-color:${pc}">🔗${pi+1}</span>`:'';
    const buf=pairBuf===p.id?' pairing':'';
    return `
    <div class="pcard ${selected.has(p.id)?'on':''}${buf}" data-pick="${p.id}">
      <span class="chk">${CHK}</span>
      <span class="info">
        <div class="pn">${esc(p.name)}${ptag}</div>
        <div class="pl">
          <span style="color:${tierColor(p.mainTier)}">${LANE_NAME[p.mainLane]} ${TIER_MAP[p.mainTier].name} ${p.mainScore}</span>
        </div>
      </span>
      <button class="infoic" data-info="${p.id}" title="선수 정보">i</button>
    </div>`;}).join('');
  g.querySelectorAll('[data-pick]').forEach(c=>{
    c.onclick=()=>{
      const id=c.dataset.pick;
      if(pairMode){ handlePairClick(id); return; }
      if(selected.has(id)){ selected.delete(id); removePairWith(id); }
      else{ if(selected.size>=10) return; selected.add(id); }
      renderPickGrid();
    };
  });
  g.querySelectorAll('[data-info]').forEach(b=>b.onclick=e=>{e.stopPropagation();openInfo(b.dataset.info);});
  renderPairBox();
  updateSelCount();
}

//---- 묶기 모드 상호작용 ----
function handlePairClick(id){
  if(!selected.has(id)){
    if(selected.size>=10){toast('묶으려면 먼저 참여 10명 안에 있어야 해요');return;}
    selected.add(id);
  }
  const existing=pairIndexOf(id);
  if(existing>=0){ pairs.splice(existing,1); persistPairs(); pairBuf=null; toast('묶기를 해제했어요'); renderPickGrid(); return; }
  if(pairBuf===null){ pairBuf=id; renderPickGrid(); return; }
  if(pairBuf===id){ pairBuf=null; renderPickGrid(); return; }
  if(pairs.length>=PAIR_MAX){ toast(`묶기는 최대 ${PAIR_MAX}쌍까지예요`); pairBuf=null; renderPickGrid(); return; }
  pairs.push([pairBuf,id]); pairBuf=null; persistPairs();
  toast('두 선수를 같은 팀으로 묶었어요');
  renderPickGrid();
}
function renderPairBox(){
  const box=document.getElementById('pairBox'); if(!box)return;
  const btn=document.getElementById('pairBtn');
  if(btn){ btn.textContent=pairMode?'✅ 묶기 완료':'🔗 같은 팀 묶기'; btn.classList.toggle('on',pairMode); }
  if(!pairMode && pairs.length===0){ box.style.display='none'; box.innerHTML=''; return; }
  box.style.display='';
  const chips=pairs.map((pr,i)=>{
    const names=pr.map(id=>{const p=roster.find(x=>x.id===id);return p?esc(p.name):'?';}).join(' + ');
    const pc=PAIR_COLORS[i%PAIR_COLORS.length];
    return `<span class="pair-chip" style="border-color:${pc}"><b style="color:${pc}">🔗${i+1}</b> ${names}<button data-unpair="${i}" title="해제">✕</button></span>`;
  }).join('');
  const hint=pairMode
    ? '<div class="pair-hint">같은 팀이 되어야 하는 두 선수를 차례로 클릭하세요. 묶인 선수를 다시 클릭하면 해제됩니다.</div>'
    : '';
  box.innerHTML=`<div class="pair-chips">${chips||'<span class="pair-empty">아직 묶은 선수가 없어요</span>'}</div>${hint}`;
  box.querySelectorAll('[data-unpair]').forEach(b=>b.onclick=()=>{pairs.splice(+b.dataset.unpair,1);persistPairs();renderPickGrid();});
}
function updateSelCount(){
  document.getElementById('selCount').textContent=selected.size;
  document.getElementById('makeBtn').disabled=(selected.size!==10);
}
document.getElementById('clearSel').onclick=()=>{
  selected.clear(); pairs=[]; persistPairs(); pairBuf=null; battle=null;
  document.getElementById('result').innerHTML=''; renderPickGrid();
};
const pairBtnEl=document.getElementById('pairBtn');
if(pairBtnEl) pairBtnEl.onclick=()=>{ pairMode=!pairMode; pairBuf=null; renderPickGrid(); };
document.getElementById('randPick').onclick=()=>{
  if(roster.length<10){toast('명단이 10명 이상이어야 해요');return;}
  selected.clear();
  const ids=roster.map(p=>p.id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  ids.slice(0,10).forEach(id=>selected.add(id));
  pairs=[]; persistPairs(); pairBuf=null;
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
function bestSplit(res,cons){
  const byPos={TOP:[],JG:[],MID:[],ADC:[],SUP:[]};
  for(const id in res) byPos[res[id].pos].push({id,...res[id]});
  // 묶인 두 명이 같은 포지션에 배치되면(=무조건 반대팀) 이 배치 자체가 불가
  if(cons&&cons.length){
    for(const pr of cons){ if(res[pr[0]]&&res[pr[1]]&&res[pr[0]].pos===res[pr[1]].pos) return null; }
  }
  let best=null;
  for(let mask=0;mask<32;mask++){
    const team={};
    const blue=[],red=[];let bt=0,rt=0;
    POS.forEach((pos,idx)=>{
      const [a,b]=byPos[pos];
      if((mask>>idx)&1){blue.push({...a,pos});red.push({...b,pos});bt+=a.score;rt+=b.score;team[a.id]='B';team[b.id]='R';}
      else{blue.push({...b,pos});red.push({...a,pos});bt+=b.score;rt+=a.score;team[b.id]='B';team[a.id]='R';}
    });
    if(cons&&cons.some(pr=>team[pr[0]]!==team[pr[1]])) continue; // 묶기 위반 조합 제외
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
  const idset=new Set(P.map(p=>p.id));
  const cons=pairs.filter(pr=>pr.every(id=>idset.has(id))); // 이번 10명에 해당하는 묶기만 적용
  let best=null;const pool=[];
  const ITER=3500;
  for(let it=0;it<ITER;it++){
    const res=randomAssign(P);if(!res)continue;
    const split=bestSplit(res,cons);if(!split)continue;
    const ok=objKey(res,split);
    const sol={res,split,ok,players:P};
    if(!best||ok.key<best.ok.key) best=sol;
    if(pool.length<900) pool.push(sol);
    else if(Math.random()<0.25) pool[Math.floor(Math.random()*pool.length)]=sol;
  }
  if(!best) return null; // 묶기 조건을 만족하는 조합이 없음
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
  if(!sol){ toast('같은 팀 묶기 조건을 만족하는 조합을 못 찾았어요 — 묶기를 줄여보세요'); return; }
  roundHistory.push({team:teamMapOf(sol),lane:laneMapOf(sol)});
  if(roundHistory.length>HISTORY_MAX) roundHistory.shift();
  battle={
    blue: sol.split.blue.map(r=>({id:r.id,pos:r.pos,role:r.role,score:r.score})),
    red:  sol.split.red.map(r=>({id:r.id,pos:r.pos,role:r.role,score:r.score})),
    pm: pmap(sol.players),
    pairsApplied: pairs.filter(pr=>pr.every(id=>sol.players.find(p=>p.id===id)))
      .map(pr=>pr.map(id=>sol.players.find(p=>p.id===id).name)),
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
      snap.push({id:p.id,lane:laneKey,prev:cur,w:p.wins||0,l:p.losses||0});
      const next=clampToTier(tierKey,cur+d);    // 티어 범위 밖으로는 절대 안 나감
      if(laneKey==='main') p.mainScore=next; else p.subScore=next;
      // 개인 전적 기록 (선수 정보창에 표시)
      if(won) p.wins=(p.wins||0)+1; else p.losses=(p.losses||0)+1;
      p.hist=[{t:Date.now(),win:won,pos:r.pos,role:r.role,d:next-cur,champ:(r.champ||'')}].concat(p.hist||[]).slice(0,30);
    });
  }
  adj(battle.blue, rAvg, winner==='blue');
  adj(battle.red,  bAvg, winner==='red');
  undoStack.push({snap,winner});
  persist();
  battle.settled=winner;
  // 실시간 공유 중이면 MVP는 참가자 투표로, 아니면 진행자가 직접 선택
  if(startVote(winner)) battle.voteMode=true;
  refreshBattle(); renderBattle(); renderRoster();
  toast(`${winner==='blue'?'1팀(블루)':'2팀(레드)'} 승리 반영 완료 — 점수가 조금 조정됐어요`);
}
function pickMvp(id){
  if(!battle||!battle.settled||battle.mvpDone)return;
  battle.mvpDone=true;
  if(id){
    const p=roster.find(x=>x.id===id);
    if(p){
      p.mvp=(p.mvp||0)+1; p.honor=(p.honor||0)+10;
      battle.mvpId=id;
      const last=undoStack[undoStack.length-1]; if(last)last.mvpId=id;
      persist();
      toast(`${p.name} — POG/MVP! 명예 +10`);
    }
  }
  renderBattle(); renderRoster();
}
function undoWin(){
  const last=undoStack.pop(); if(!last){toast('되돌릴 결과가 없어요');return;}
  if(voteState&&voteState.active) cancelVote();
  if(battle) battle.voteMode=false;
  if(last.mvpId){
    const mp=roster.find(x=>x.id===last.mvpId);
    if(mp){ mp.mvp=Math.max(0,(mp.mvp||0)-1); mp.honor=Math.max(0,(mp.honor||0)-10); }
  }
  last.snap.forEach(s=>{const p=roster.find(x=>x.id===s.id);if(!p)return;
    if(s.lane==='main')p.mainScore=s.prev; else p.subScore=s.prev;
    if(typeof s.w==='number')p.wins=s.w; if(typeof s.l==='number')p.losses=s.l;
    if(Array.isArray(p.hist)&&p.hist.length)p.hist.shift();});
  persist();
  if(battle){ battle.settled=false; battle.mvpDone=false; battle.mvpId=null; }
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
    const champCell = battle.settled
      ? (r.champ?`<span class="champtag">${champIcon(r.champ)}</span>`:'')
      : `<input class="champin" list="champDL" data-champ="${r.id}" placeholder="챔피언" maxlength="16" value="${esc(r.champ||'')}">`;
    return `<div class="prow${sw}${picked}" data-id="${r.id}"${drag}>
      <span class="lico">${laneSVG(r.pos)}</span>
      <span class="pmain">
        <span class="top"><span class="rl ${roleCls}">${roleTxt}</span><span class="nm">${esc(p.name)}</span></span>
        <span class="bot">${LANE_NAME[r.pos]} · ${scoreBadge(tierKey,r.score)}</span>
      </span>
      ${champCell}
      <span class="pscore">${r.score}</span>
    </div>`;
  }).join('');
  return {html:`<div class="team ${cls}"><div class="thead"><span class="tname">${label}</span><span class="ttot">TEAM MMR : ${total}</span></div><div class="tbody">${body}</div></div>`, total};
}

function renderBattle(){
  const res=document.getElementById('result');
  if(!battle){ res.innerHTML=''; return; }
  const B=teamPanel('blue','BLUE TEAM',battle.blue);
  const R=teamPanel('red','RED TEAM',battle.red);
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
    let mvpBlock='';
    if(battle.voteMode&&!battle.mvpDone){
      mvpBlock=`<div class="mvp-done">🗳️ 참가자 투표로 MVP를 뽑는 중이에요 — 상단 투표 배너에서 한 표!</div>`;
    }else if(!battle.mvpDone){
      const winners=[...battle[battle.settled]].sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos));
      mvpBlock=`<div class="mvp-pick"><span class="lbl">🏆 이 판의 POG / MVP</span>`
        +winners.map(r=>`<button class="mvpbtn" data-mvp="${r.id}">${esc(battle.pm[r.id].name)}</button>`).join('')
        +`<button class="mvpbtn skip" data-mvp="">건너뛰기</button></div>`;
    }else if(battle.mvpId){
      mvpBlock=`<div class="mvp-done">🏆 POG/MVP — <b>${esc(battle.pm[battle.mvpId]?battle.pm[battle.mvpId].name:'')}</b> (명예 +10)</div>`;
    }
    controls=`<div class="settled">🏆 ${w} 승리 반영됨 — 점수가 티어 범위 안에서 조정되었어요</div>
      ${mvpBlock}
      <div class="winrow"><button class="btn ghost" id="undoWin">되돌리기</button></div>`;
  }
  const swapHint = battle.settled?'':'<div class="swap-hint">선수를 클릭(또는 드래그)해 위치를 맞바꾸고, 챔피언 칸에 플레이할 챔피언을 적어두면 전적·모스트 챔프에 기록돼요</div>';
  const pairNote = (battle.pairsApplied&&battle.pairsApplied.length)?`<div class="pair-note">🔗 같은 팀 고정 적용 — ${battle.pairsApplied.map(pr=>pr.map(esc).join(' + ')).join(' · ')}</div>`:'';
  const autoNote = auto>0?`<div class="auto-note">⚠ 주·부 라인에 없는 포지션은 자동으로 배치했어요(자동 ${auto}명, 점수 ×0.8 보정). 예: 서폿 가능자가 부족하면 누군가 서폿으로 자동 배치돼요.</div>`:'';
  const histLink = roundHistory.length>1?`<button class="minilink" id="resetHistory">섞기 기록 초기화 (최근 ${roundHistory.length}판 기억 중)</button>`:'';

  res.innerHTML=`
  <div class="panel battle" style="padding:2px;border-color:var(--gold-dim)">
    <div style="padding:16px 18px 0;text-align:center"><div class="cs-label">Champion Select</div></div>
    <div style="padding:18px">
      <div class="vs-wrap">${B.html}<div class="vsmid"><div class="vline"></div><div class="vs">VS</div><div class="vline"></div></div>${R.html}</div>
      ${swapHint}
      ${pairNote}
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
  res.querySelectorAll('.champin').forEach(inp=>{
    inp.onclick=e=>e.stopPropagation();
    inp.onmousedown=e=>e.stopPropagation();
    inp.ondragstart=e=>{e.preventDefault();e.stopPropagation();};
    inp.onchange=()=>{
      const row=[...battle.blue,...battle.red].find(r=>r.id===inp.dataset.champ);
      if(row)row.champ=inp.value.trim().slice(0,16);
    };
  });
  res.querySelectorAll('.prow.swappable').forEach(el=>{
    el.onclick=e=>{ if(e.target.closest('.champin'))return; onRowClick(el.dataset.id); };
    el.ondragstart=e=>{e.dataTransfer.setData('text/plain',el.dataset.id);el.classList.add('dragging');};
    el.ondragend=()=>el.classList.remove('dragging');
    el.ondragover=e=>{e.preventDefault();el.classList.add('dragover');};
    el.ondragleave=()=>el.classList.remove('dragover');
    el.ondrop=e=>{e.preventDefault();el.classList.remove('dragover');
      const from=e.dataTransfer.getData('text/plain');
      if(from&&from!==el.dataset.id){ doSwap(from,el.dataset.id); swapPick=null; renderBattle(); }};
  });
  res.querySelectorAll('[data-win]').forEach(b=>b.onclick=()=>applyWin(b.dataset.win));
  res.querySelectorAll('[data-mvp]').forEach(b=>b.onclick=()=>pickMvp(b.dataset.mvp||null));
  const u=document.getElementById('undoWin'); if(u)u.onclick=undoWin;
  const rm=document.getElementById('battleRemake'); if(rm)rm.onclick=makeBattle;
  const cp=document.getElementById('copyTeams'); if(cp)cp.onclick=copyTeams;
  const rh=document.getElementById('resetHistory'); if(rh)rh.onclick=()=>{roundHistory=[];renderBattle();toast('섞기 기록을 비웠어요');};

  res.scrollIntoView({behavior:'smooth',block:'nearest'});
}

document.getElementById('makeBtn').onclick=makeBattle;

//============ 실시간 MVP 투표 (POG VOTE) ============
const VOTE_MINUTES=5;
let voteState=null;        // Firestore liveVote 문서 미러
let voteTick=null;         // 1초 카운트다운 타이머
let voteFinalizing=false;  // 이중 정산 방지
const voterId=(function(){
  try{
    let v=localStorage.getItem('lol_voter_id');
    if(!v){ v='v'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); localStorage.setItem('lol_voter_id',v); }
    return v;
  }catch(e){ return 'v'+Math.random().toString(36).slice(2,10); }
})();

function startVote(winnerTeamKey){
  if(!cloudActive||!window.CLOUD||!window.CLOUD.saveVote) return false;
  const winners=[...battle[winnerTeamKey]].sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos));
  const data={
    active:true,
    winnerTeam:winnerTeamKey,
    starter:voterId,
    startedAt:Date.now(),
    endsAt:Date.now()+VOTE_MINUTES*60*1000,
    candidates:winners.map(r=>({id:r.id,name:battle.pm[r.id].name,pos:r.pos})),
    votes:{},
  };
  voteFinalizing=false;
  window.CLOUD.saveVote(data);
  toast(`🗳️ MVP 투표 시작! ${VOTE_MINUTES}분 동안 진행돼요`);
  return true;
}
function applyVoteData(v){
  voteState=v;
  if(v&&v.active){
    if(Date.now()>=v.endsAt){ finalizeVote(); return; }
    if(!voteTick) voteTick=setInterval(voteHeartbeat,1000);
  }else{
    if(voteTick){clearInterval(voteTick);voteTick=null;}
  }
  renderVoteBanner();
  if(battle&&battle.settled){try{renderBattle();}catch(e){}}
}
function voteHeartbeat(){
  if(!voteState||!voteState.active){ if(voteTick){clearInterval(voteTick);voteTick=null;} return; }
  if(Date.now()>=voteState.endsAt){ finalizeVote(); return; }
  const t=document.getElementById('voteTimer');
  if(t)t.textContent=fmtCountdown(voteState.endsAt-Date.now());
}
function fmtCountdown(ms){
  const s=Math.max(0,Math.ceil(ms/1000));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function voteTally(v){
  const tally={};(v.candidates||[]).forEach(c=>tally[c.id]=0);
  Object.values(v.votes||{}).forEach(id=>{ if(id in tally)tally[id]++; });
  return tally;
}
function castMyVote(candId){
  if(!voteState||!voteState.active||Date.now()>=voteState.endsAt)return;
  if(window.CLOUD&&window.CLOUD.castVote) window.CLOUD.castVote(voterId,candId);
}
function finalizeVote(){
  const v=voteState;
  if(!v||!v.active||voteFinalizing)return;
  voteFinalizing=true;
  if(voteTick){clearInterval(voteTick);voteTick=null;}
  const tally=voteTally(v);
  let winner=null,best=-1;
  (v.candidates||[]).forEach(c=>{ if(tally[c.id]>best){best=tally[c.id];winner=c;} }); // 동률: 탑→서폿 순 우선
  const total=Object.keys(v.votes||{}).length;
  const done={active:false,winnerTeam:v.winnerTeam,finishedAt:Date.now(),
    winnerId:winner?winner.id:null,winnerName:winner?winner.name:null,votesTotal:total,
    winnerVotes:winner?tally[winner.id]:0,candidates:v.candidates,votes:v.votes||{}};
  if(winner&&total>0){
    const p=roster.find(x=>x.id===winner.id);
    if(p){
      p.mvp=(p.mvp||0)+1; p.honor=(p.honor||0)+10;
      const last=undoStack[undoStack.length-1]; if(last&&!last.mvpId)last.mvpId=winner.id;
      persist();
    }
    if(battle&&battle.settled){battle.mvpDone=true;battle.mvpId=winner.id;}
    toast(`🏆 투표 결과: ${winner.name} MVP! (${tally[winner.id]}표) 명예 +10`);
  }else{
    if(battle&&battle.settled)battle.mvpDone=true;
    toast('투표가 0표로 마감됐어요 — MVP 없이 넘어갑니다');
  }
  if(window.CLOUD&&window.CLOUD.saveVote)window.CLOUD.saveVote(done);
  voteState=done;
  renderVoteBanner(); renderRoster();
  if(battle){try{renderBattle();}catch(e){}}
}
function cancelVote(){
  if(!voteState||!voteState.active)return;
  voteFinalizing=true;
  if(voteTick){clearInterval(voteTick);voteTick=null;}
  if(window.CLOUD&&window.CLOUD.saveVote)window.CLOUD.saveVote({active:false,cancelled:true,finishedAt:Date.now()});
  if(battle&&battle.settled)battle.mvpDone=true;
  toast('투표를 취소했어요');
}
function renderVoteBanner(){
  let el=document.getElementById('voteBanner');
  const v=voteState;
  const showResult=v&&!v.active&&v.winnerName&&v.finishedAt&&(Date.now()-v.finishedAt<45000);
  if(!v||(!v.active&&!showResult)){ if(el)el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='voteBanner'; document.body.appendChild(el); }
  if(v.active){
    const tally=voteTally(v);
    const mine=(v.votes||{})[voterId];
    const isStarter=v.starter===voterId;
    el.innerHTML=`
      <div class="vb-head">🏆 MVP 투표 진행 중! <span id="voteTimer" class="vb-timer">${fmtCountdown(v.endsAt-Date.now())}</span></div>
      <div class="vb-cands">${(v.candidates||[]).map(c=>
        `<button class="vb-btn${mine===c.id?' my':''}" data-vote="${c.id}">
          ${laneSVG(c.pos)}<span class="nm">${esc(c.name)}</span><span class="ct">${tally[c.id]}</span>
        </button>`).join('')}</div>
      <div class="vb-foot">${mine?'투표 완료! 마감 전까지 바꿀 수 있어요':'이긴 팀에서 최고 활약을 골라주세요 (브라우저당 1표)'}
        ${isStarter?`<span class="vb-host"><button id="voteEnd">지금 마감</button><button id="voteCancel">취소</button></span>`:''}
      </div>`;
    el.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>castMyVote(b.dataset.vote));
    const ve=document.getElementById('voteEnd'); if(ve)ve.onclick=finalizeVote;
    const vc=document.getElementById('voteCancel'); if(vc)vc.onclick=cancelVote;
  }else{
    el.innerHTML=`<div class="vb-head done">🏆 MVP — <b>${esc(v.winnerName)}</b> (${v.winnerVotes}표 / 총 ${v.votesTotal}표) · 명예 +10</div>`;
    setTimeout(renderVoteBanner,46000);
  }
}

//============ player info modal (선수 정보창) ============
const pModalBg=document.getElementById('pModalBg');
function fmtDay(t){const d=new Date(t);return `${d.getMonth()+1}/${d.getDate()}`;}
function openInfo(id){
  const p=roster.find(x=>x.id===id); if(!p||!pModalBg)return;
  const ranked=roster.map(x=>({id:x.id,s:repOf(x).score})).sort((a,b)=>b.s-a.s);
  const rank=ranked.findIndex(x=>x.id===p.id)+1;
  const rp=repOf(p);
  const w=p.wins||0,l=p.losses||0,g=w+l;
  const wr=g?Math.round(w/g*100):0;
  const chips=(p.hist&&p.hist.length)
    ? p.hist.slice(0,10).map(h=>`<span class="mchip ${h.win?'w':'l'}" title="${LANE_NAME[h.pos]||''} ${h.d>=0?'+':''}${h.d}">${h.win?'승':'패'}</span>`).join('')
    : '<span class="mchip none">기록 없음</span>';
  const laneRow=(role,lane,tier,div,score)=>`
    <div class="pi-lane">
      <span class="rl ${role==='주'?'m':'s'}">${role}</span>
      <span class="li">${laneSVG(lane)}</span>
      <span class="ln">${LANE_NAME[lane]}</span>
      <span class="tb" style="color:${tierColor(tier)}">${tierLabel(tier,div)}</span>
      <span class="sc">${score}</span>
    </div>`;
  const histRows=(p.hist&&p.hist.length)?p.hist.map(h=>`
    <div class="pi-h">
      <span class="r ${h.win?'w':'l'}">${h.win?'승':'패'}</span>
      <span class="pos">${LANE_NAME[h.pos]||''}<i>${h.role==='main'?'주':h.role==='sub'?'부':'자동'}</i></span>
      <span class="dl ${h.d>=0?'up':'dn'}">${h.d>=0?'+':''}${h.d}</span>
      <span class="dt">${fmtDay(h.t)}</span>
    </div>`).join('')
    :'<div class="pi-empty">아직 내전 기록이 없어요. 승패를 반영하면 여기에 쌓입니다.</div>';
  const customs=(p.customTitles||[]);
  document.getElementById('pmName').innerHTML=
    `${esc(p.name)} <span class="pm-rep" style="color:${tierColor(rp.tierKey)}">${tierCrest(rp.tierKey)} ${TIER_MAP[rp.tierKey].name}</span>`;
  document.getElementById('pmBody').innerHTML=`
    <div class="pi-titles">${badgesHTML(p,rank)}</div>

    <div class="pi-sec">RECENT MATCHES</div>
    <div class="pi-chips">${chips}</div>

    <div class="pi-mvpbox"><span class="ico">🏆</span><span class="lbl">POG / MVP</span><span class="val">${p.mvp||0}<i>TIMES</i></span></div>

    <div class="pi-stats">
      <div class="st"><div class="k">WIN RATE</div><div class="v" style="color:var(--blue)">${g?wr+'%':'—'}</div></div>
      <div class="st"><div class="k">RECORD</div><div class="v">${w}W - ${l}L</div></div>
      <div class="st"><div class="k">MMR RATING</div><div class="v" style="color:${tierColor(rp.tierKey)}">${rp.score}</div></div>
      <div class="st"><div class="k">HONOR SCORE</div><div class="v" style="color:#7de08d">${p.honor||0}</div></div>
    </div>

    <div class="pi-lanes">
      ${laneRow('주',p.mainLane,p.mainTier,p.mainDiv,p.mainScore)}
      ${laneRow('부',p.subLane,p.subTier,p.subDiv,p.subScore)}
    </div>

    <div class="pi-sec">모스트 챔피언 <span>내전 플레이 기록 기준</span></div>
    <div class="pi-champs">${champsHTML(p)}</div>

    <div class="pi-sec">최근 경기 상세 <span>${p.hist?p.hist.length:0}판</span></div>
    <div class="pi-hist">${histRows}</div>

    <div class="pi-sec">사용자 지정 칭호 <span>최대 4개</span></div>
    <div class="ct-list">${customs.length?customs.map((t,i)=>`<span class="tbadge custom">🏷️${esc(t)}<button data-ctdel="${i}" title="삭제">✕</button></span>`).join(''):'<span class="tbadge none">아직 없어요</span>'}</div>
    <div class="ct-add"><input id="ctInput" maxlength="12" placeholder="예: 맛집인증"><button class="btn" id="ctAdd">추가</button></div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn" id="pmEdit">⚙ EDIT INFO</button>
      <button class="btn ghost" id="pmClose2">닫기</button>
    </div>`;
  pModalBg.classList.add('open');
  document.getElementById('pmClose2').onclick=closeInfo;
  document.getElementById('pmEdit').onclick=()=>{
    closeInfo();
    document.querySelector('.tab[data-tab="roster"]').click();
    startEdit(p.id);
  };
  document.getElementById('ctAdd').onclick=()=>{
    const v=document.getElementById('ctInput').value.trim().slice(0,12);
    if(!v)return;
    p.customTitles=(p.customTitles||[]);
    if(p.customTitles.length>=4){toast('사용자 지정 칭호는 최대 4개예요');return;}
    if(p.customTitles.includes(v)){toast('이미 있는 칭호예요');return;}
    p.customTitles.push(v); persist(); renderRoster(); openInfo(p.id);
  };
  document.getElementById('pmBody').querySelectorAll('[data-ctdel]').forEach(b=>b.onclick=()=>{
    p.customTitles.splice(+b.dataset.ctdel,1); persist(); renderRoster(); openInfo(p.id);
  });
}
function closeInfo(){ if(pModalBg)pModalBg.classList.remove('open'); }
if(pModalBg){
  pModalBg.onclick=e=>{if(e.target===pModalBg)closeInfo();};
  const x=document.getElementById('pmClose'); if(x)x.onclick=closeInfo;
}

//============ 칭호 도감 modal ============
const dexModalBg=document.getElementById('dexModalBg');
function openDex(){
  if(!dexModalBg)return;
  document.getElementById('dexBody').innerHTML=
    `<p class="dex-intro">칭호는 내전 기록에 따라 <b>자동으로 획득/해제</b>됩니다. 선수 정보창에서 나만의 칭호도 직접 달아줄 수 있어요.</p>`
    +`<div class="dex-list">`
    +TITLE_DEFS.map(t=>`<div class="dex-row"><span class="tbadge" style="color:${t.c};border-color:${t.c}">${t.e}${esc(t.n)}</span><span class="cond">${esc(t.d)}</span></div>`).join('')
    +`<div class="dex-row"><span class="tbadge custom">🏷️사용자 지정</span><span class="cond">선수 정보창에서 직접 부여 (선수당 최대 4개)</span></div>`
    +`</div>`;
  dexModalBg.classList.add('open');
}
if(dexModalBg){
  dexModalBg.onclick=e=>{if(e.target===dexModalBg)dexModalBg.classList.remove('open');};
  const x=document.getElementById('dexClose'); if(x)x.onclick=()=>dexModalBg.classList.remove('open');
}
const dexBtnEl=document.getElementById('dexBtn');
if(dexBtnEl)dexBtnEl.onclick=openDex;

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
  loadChampMap();   // 모스트 챔프 아이콘 (Riot DDragon)
  loadPosIcons();   // 라이엇 공식 포지션 아이콘
})();
