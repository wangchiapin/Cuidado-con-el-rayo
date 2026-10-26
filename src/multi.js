/* ====================== 連線模式（最多 15 人，一條命）======================
   流程：首頁 👥 → 開房（房主選難度）或輸入 4 位數房號加入 → 等人 → 房主按開始
   → 全部人同題、同時作答、同時揭曉：打錯或時間到就被雷劈、出局（可留下觀賽）→ 爬完 10 階或全部出局就結算。
   資料在 Firebase（下面 module 的 window.RM）：房主負責推進回合，每個人只寫自己的答題結果。 */
var MP={on:false};
function mpFresh(){
  return {on:false,code:'',host:false,uid:'',room:null,pl:{},unsub:null,inGame:false,key:'',lobbyKey:'',canType:false,
    countT:0,lastC:0,wait:0,H:{t:0,key:'',busy:false},stall:0,stallShown:false,figs:{},pos:{},shown:'',playsN:-1,t0:0,msg:''};
}
MP=mpFresh();
var mpLv="normal", MAXP=15;
function waitRM(){
  return new Promise(function(res){
    var n=0; (function chk(){ if(window.RM) return res(window.RM); if(++n>50) return res(null); setTimeout(chk,100); })();
  });
}
function mpTxt(k,n){ return plain(k).replace(/%n/g,n); }
function mpShort(name,n){ return Array.from(String(name||'?')).slice(0,n).join(''); }
function mpRoster(){ return (MP.room&&MP.room.ro)||[]; }
function mpElim(){ return (MP.room&&MP.room.elim)||{}; }
function mpAmIn(){ return mpRoster().indexOf(MP.uid)>=0; }
function mpAlive(){ var e=mpElim(); return mpRoster().filter(function(u){ return e[u]===undefined; }); }
/* 等人階段的名單：不是觀賽的人，依加入順序 */
function mpPlayersSorted(){
  var a=Object.keys(MP.pl).map(function(u){ return MP.pl[u]; });
  a.sort(function(x,y){ var dx=+x.joinedAt||0, dy=+y.joinedAt||0; return dx-dy || (x.uid<y.uid?-1:1); });
  return a;
}
function mpTs(t){ return t&&typeof t.toMillis==='function'?t.toMillis():(+t||0); }

/* ---------- 首頁入口 ---------- */
function mpOpen(prefill){
  var ov=$('ov'); ov.hidden=false; if(!mpLv||!LEVELS[mpLv]) mpLv=cfg.lv;
  ov.innerHTML='<div class="panel"><h2>👥 '+zh('mpTitle')+(tl('mpTitle')?'<span class="tl">'+tl('mpTitle')+'</span>':'')+'</h2>'+
    '<p class="lbNote">'+plain('mpIntro')+'</p>'+
    '<div class="grp"><div class="lab">'+plain('secName')+'</div><input class="nameIn" id="mpName" type="text" maxlength="14" autocomplete="off" spellcheck="false"></div>'+
    '<div class="mpBox"><h3>'+plain('mpMake')+'</h3><div class="seg" id="mpSegLv"></div><div class="btns"><button class="big" id="mpMake" type="button">'+H('mpMakeGo')+'</button></div></div>'+
    '<div class="mpBox"><h3>'+plain('mpJoinT')+'</h3><input class="nameIn" id="mpCode" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="'+zh('mpCodePh')+'">'+
    '<label class="mpChk"><input type="checkbox" id="mpWatch"> '+plain('mpWatch')+'</label>'+
    '<div class="btns"><button class="big" id="mpGo" type="button">'+H('mpJoinGo')+'</button></div></div>'+
    '<p class="lbSt" id="mpMsg"></p>'+
    '<div class="btns"><button class="ghost" id="mpBack" type="button">'+H('lbBack')+'</button></div></div>';
  $('mpName').value=getName();
  if(prefill) $('mpCode').value=String(prefill).replace(/\D/g,'').slice(0,4);
  seg('mpSegLv',['easy','normal','hard'].map(function(k){ return {v:k,h:secLabel(k,LEVELS[k].T)}; }),mpLv,function(v){ mpLv=v; mpOpen($('mpCode').value); });
  $('mpName').addEventListener('input',function(){ setName(this.value); if($('inName')) $('inName').value=getName(); });
  $('mpCode').addEventListener('input',function(){ this.value=this.value.replace(/\D/g,'').slice(0,4); });
  $('mpBack').addEventListener('click',function(){ ov.hidden=true; ov.innerHTML=''; });
  $('mpMake').addEventListener('click',mpMake);
  $('mpGo').addEventListener('click',function(){ mpJoin($('mpCode').value,$('mpWatch').checked); });
}
function mpMsg(k){ var m=$('mpMsg'); if(m) m.innerHTML=k?'<b>'+plain(k)+'</b>':''; }
function mpBusy(on){ ['mpMake','mpGo'].forEach(function(i){ var b=$(i); if(b) b.disabled=!!on; }); }
function mpMe(want){ return {name:getName(),g:cfg.g,ci:ci,want:!!want}; }
function mpMake(){
  if(!getName()){ mpMsg('mpNeedName'); return; }
  mpBusy(true); mpMsg('lbLoading');
  waitRM().then(function(rm){
    if(!rm) throw 0;
    var me=mpMe(false); me.level=mpLv;
    return rm.create(me).then(function(code){ mpEnter(code,true); });
  }).catch(function(){ mpBusy(false); mpMsg('mpErr'); });
}
function mpJoin(code,want){
  if(!getName()){ mpMsg('mpNeedName'); return; }
  if(!/^[0-9]{4}$/.test(code||'')){ mpMsg('mpNone'); return; }
  mpBusy(true); mpMsg('lbLoading');
  waitRM().then(function(rm){
    if(!rm) throw 0;
    return rm.join(code,mpMe(want)).then(function(r){
      if(!r.ok){ mpBusy(false); mpMsg(r.why==='full'?'mpFull':r.why==='closed'?'mpClosedMsg':'mpNone'); return; }
      mpEnter(code,false);
    });
  }).catch(function(){ mpBusy(false); mpMsg('mpErr'); });
}

/* ---------- 進房、離房 ---------- */
function mpEnter(code,host){
  waitRM().then(function(rm){
    return rm.uid().then(function(uid){
      MP=mpFresh(); MP.on=true; MP.code=code; MP.host=host; MP.uid=uid; MP.t0=Date.now();
      MP.unsub=rm.listen(code,function(r){ if(MP.code!==code) return; MP.room=r; MP.gotRoom=true; mpSync(); },
        function(list){ if(MP.code!==code) return; MP.pl={}; list.forEach(function(p){ p.joinedAt=mpTs(p.joinedAt); MP.pl[p.uid]=p; }); MP.gotPl=true; mpSync(); },
        function(){ if(MP.code===code) mpExit('mpErr'); });
      $('ov').hidden=false; $('ov').innerHTML='<div class="panel"><p class="lbSt">'+plain('lbLoading')+'</p></div>';
    });
  }).catch(function(){ mpExit('mpErr'); });
}
function mpExit(msgKey){
  var was=MP.on; try{ if(MP.unsub) MP.unsub(); }catch(e){}
  S.running=false; S.over=true;
  MP=mpFresh();
  $('crowd').innerHTML=''; $('mpStrip').hidden=true; $('player').hidden=false; $('btnPause').textContent='❚❚';
  $('scene').classList.remove('mp'); $('play').hidden=true; $('start').hidden=false; $('kb').classList.remove('locked'); setStorm(0);
  try{ history.replaceState(null,'',location.pathname+location.hash); }catch(e){}
  ci=Math.floor(Math.random()*5); pickBg(); renderStart();
  var ov=$('ov');
  if(msgKey&&was){ ov.hidden=false; ov.innerHTML='<div class="panel"><p class="lbSt"><b>'+plain(msgKey)+'</b></p><div class="btns"><button class="big" id="mpOk" type="button">'+H('mpOk')+'</button></div></div>'; $('mpOk').addEventListener('click',function(){ ov.hidden=true; ov.innerHTML=''; }); }
  else { ov.hidden=true; ov.innerHTML=''; }
}
function mpLeave(){
  var code=MP.code, host=MP.host, waiting=MP.room&&MP.room.status==='waiting';
  waitRM().then(function(rm){ if(rm) return rm.leave(code,{host:host,waiting:waiting}); }).catch(function(){});
  mpExit();
}
function mpLeaveAsk(){
  var ov=$('ov'); ov.hidden=false;
  ov.innerHTML='<div class="panel"><h2>'+plain('mpLeaveAsk')+'</h2>'+(MP.host?'<p class="lbNote">'+plain('mpLeaveHost')+'</p>':'')+
    '<div class="btns"><button class="big" id="mpStay" type="button">'+H('mpStay')+'</button><button class="ghost" id="mpOut" type="button">'+H('mpLeave')+'</button></div></div>';
  $('mpStay').addEventListener('click',function(){ ov.hidden=true; ov.innerHTML=''; mpSyncOverlay(); });
  $('mpOut').addEventListener('click',mpLeave);
}

/* ---------- 房間資料一變就來這裡 ---------- */
function mpSync(){
  if(!MP.on||!MP.gotRoom||!MP.gotPl) return;
  var r=MP.room;
  if(!r){ mpExit('mpNone'); return; }
  if(r.status==='closed'){ mpExit(MP.host?'':'mpClosedMsg'); return; }
  if(r.status==='waiting'){
    if(MP.inGame) mpBackToLobby();
    mpResetMe(); mpLobby(); return;
  }
  mpGame();
}
/* 再來一局後，每個人把自己的答題結果清掉，觀賽狀態回到自己當初的選擇 */
function mpResetMe(){
  var me=MP.pl[MP.uid]; if(!me) return;
  var dirty=Object.keys(me.a||{}).length>0 || me.spec!==!!me.want;
  if(!dirty||MP.resetting) return; MP.resetting=true;
  waitRM().then(function(rm){ return rm.me(MP.code,{a:{},spec:!!me.want}); }).catch(function(){}).then(function(){ MP.resetting=false; });
}
function mpLink(){ return location.origin==='null'||location.protocol==='file:' ? location.href.split('?')[0]+'?room='+MP.code : location.origin+location.pathname+'?room='+MP.code; }
function mpLobby(){
  var r=MP.room, ov=$('ov'); ov.hidden=false; $('start').hidden=false; $('play').hidden=true;
  var list=mpPlayersSorted(), n=list.length, roster=list.filter(function(p){ return !p.spec; }).length;
  var key=JSON.stringify([r.level,list.map(function(p){ return [p.uid,p.name,p.spec]; }),cfg.kb,Settings.script,Settings.lang,roster]);
  if(MP.lobbyKey===key&&$('mpLobby')) return; MP.lobbyKey=key;
  var rows=list.map(function(p){
    var tag=p.uid===r.hostUid?'<span class="plTag">'+zh('mpHostTag')+'</span>':'';
    if(p.spec) tag+='<span class="plTag w">'+zh('mpWatcherTag')+'</span>';
    return '<div class="plRow'+(p.uid===MP.uid?' me':'')+'"><span class="plFig">'+(CHARS[p.g]&&CHARS[p.g][p.ci]||'')+'</span><span class="lbName">'+esc(p.name)+'</span>'+tag+'</div>';
  }).join('');
  var lvl=MP.host?'<div class="seg" id="mpSegLv2"></div>':'<div class="lbSt">'+plain('mpLevelIs')+'：<b>'+plain(r.level)+' · '+LEVELS[r.level].T+' s</b></div>';
  var act=MP.host?(roster>=2?'<button class="big" id="mpStart" type="button">'+H('mpStartGo')+'</button>':'<button class="big" id="mpStart" type="button" disabled>'+H('mpStartGo')+'</button><p class="lbNote">'+plain('mpNeed2')+'</p>'):'<p class="lbSt">'+plain('mpWaitHost')+'</p>';
  ov.innerHTML='<div class="panel" id="mpLobby"><div class="lab">'+plain('mpRoom')+'</div><div class="codeBig">'+esc(MP.code)+'</div>'+
    '<button class="ghost" id="mpCopy" type="button">'+zh('mpCopy')+(tl('mpCopy')?' · '+tl('mpCopy'):'')+'</button>'+
    '<div class="grp" style="text-align:left"><div class="lab">'+plain('mpLevelIs')+'</div>'+lvl+'</div>'+
    '<div class="grp" style="text-align:left"><div class="lab">'+plain('mpKb')+'</div><div class="seg" id="mpSegKb"></div></div>'+
    '<div class="grp" style="text-align:left"><div class="lab">'+plain('mpPlayers')+' '+n+'/'+MAXP+'</div><div class="plList">'+rows+'</div></div>'+
    '<div class="btns">'+act+'<button class="ghost" id="mpLeaveBtn" type="button">'+H('mpLeave')+'</button></div></div>';
  seg('mpSegKb',[{v:'pinyin',h:'拼音<span class="tl">pīnyīn</span>'},{v:'zhuyin',h:'注音<span class="tl">ㄅㄆㄇㄈ</span>'}],cfg.kb,function(v){ cfg.kb=v; saveCfg(); MP.lobbyKey=''; mpLobby(); });
  if(MP.host) seg('mpSegLv2',['easy','normal','hard'].map(function(k){ return {v:k,h:secLabel(k,LEVELS[k].T)}; }),r.level,function(v){
    if(v!==r.level) waitRM().then(function(rm){ return rm.hostSet(MP.code,{level:v}); }).catch(function(){});
  });
  $('mpCopy').addEventListener('click',function(){
    var b=this, link=mpLink();
    function ok(){ b.textContent=zh('mpCopied'); }
    try{ navigator.clipboard.writeText(link).then(ok,function(){ b.textContent=link; }); }catch(e){ b.textContent=link; }
  });
  $('mpLeaveBtn').addEventListener('click',mpLeaveAsk);
  if(MP.host&&$('mpStart')) $('mpStart').addEventListener('click',mpStart);
}
function mpPick(level){
  var set={}; LEVELS[level].pool.forEach(function(l){ set[l]=1; });
  var pool=WORDS.filter(function(w){ return w.n ? level==='hard' : set[w.lv]; }), out=[];
  while(out.length<NSTEP&&pool.length>out.length){ var w=pool[Math.floor(Math.random()*pool.length)]; if(out.indexOf(w.c)<0) out.push(w.c); }
  return out;
}
function mpStart(){
  var r=MP.room; if(!MP.host||!r||r.status!=='waiting') return;
  var ro=mpPlayersSorted().filter(function(p){ return !p.spec; }).slice(0,MAXP).map(function(p){ return p.uid; });
  if(ro.length<2) return;
  $('mpStart').disabled=true;
  waitRM().then(function(rm){
    return rm.hostSet(MP.code,{status:'playing',ph:'ready',rd:0,qs:mpPick(r.level),ro:ro,elim:{},final:[]});
  }).catch(function(){ if($('mpStart')) $('mpStart').disabled=false; });
}

/* ---------- 比賽畫面 ---------- */
function mpBackToLobby(){
  MP.inGame=false; MP.key=''; MP.shown=''; MP.lobbyKey=''; S.running=false; S.over=true;
  $('crowd').innerHTML=''; MP.figs={}; $('mpStrip').hidden=true; $('scene').classList.remove('mp');
  $('play').hidden=true; $('start').hidden=false; setStorm(0);
}
function mpSetup(){
  MP.inGame=true; var r=MP.room; setBg(mpBgIdx(r));
  P=LEVELS[r.level]; S.running=true; S.paused=false; S.over=false; S.locked=true; S.q=null; S.buf=''; S.phase='wait'; S.step=0; S.strikes=0; S.correct=0; S.T=P.T; S.tLeft=P.T;
  $('start').hidden=true; $('play').hidden=false; $('ov').hidden=true;
  $('player').hidden=true; $('scene').classList.add('mp'); $('btnPause').textContent='✕'; $('mpStrip').hidden=false;
  renderKb(); $('kb').classList.add('locked');
  measure(); mpBuildFigs(); mpLayout(false);
  requestAnimationFrame(function(){ measure(); mpLayout(false); last=performance.now(); requestAnimationFrame(tick); });
  setInfo(''); $('typedTxt').className=''; renderTyped();
  if(mpAmIn()&&MP.playsN!==r.n){ MP.playsN=r.n; try{ HGPlays.start('room-'+r.level+'-'+cfg.kb,getName()); }catch(e){} }
}
function mpBuildFigs(){
  var c=$('crowd'); c.innerHTML=''; MP.figs={};
  var ro=mpRoster(), N=ro.length;
  ro.forEach(function(u){
    var p=MP.pl[u]||{name:'?',g:'m',ci:0};
    var d=document.createElement('div'); d.className='fig'+(u===MP.uid?' me':'');
    d.innerHTML='<span class="nm">'+esc(mpShort(p.name,N>8?3:4))+'</span>'+(CHARS[p.g]&&CHARS[p.g][p.ci]||'');
    c.appendChild(d); MP.figs[u]=d;
  });
  mpStrip();
}
function mpStrip(){
  var e=mpElim(), s=$('mpStrip'); s.innerHTML=mpRoster().map(function(u){
    var p=MP.pl[u]||{name:'?'};
    return '<span class="sc'+(u===MP.uid?' me':'')+(e[u]!==undefined?' out':'')+'">'+(e[u]!==undefined?'⚡':'')+esc(p.name)+'</span>';
  }).join('');
}
function mpStepOf(u){
  var r=MP.room, e=mpElim();
  if(e[u]!==undefined) return +e[u];
  return r.status==='finished'?NSTEP:r.rd;
}
function mpLayout(anim){
  var r=MP.room, ro=mpRoster(), N=ro.length; if(!N||!r) return;
  var fac=N<=2?1:N<=4?.92:N<=7?.82:N<=10?.74:.66;
  var nf=Math.max(9,Math.min(12,12*fac+1)), nch=N>8?3:4, nameW=nch*nf*1.02+8, rowStep=Math.max(11,SPC*geo.s*.95);
  var groups={}; ro.forEach(function(u){ var st=mpStepOf(u); (groups[st]=groups[st]||[]).push(u); });
  MP.pos={};
  Object.keys(groups).forEach(function(st){
    var g=groups[st], k=g.length, f=footPos(+st), h=geo.hC*fac*f.sc, w=h*60/102;
    var span=(310-160*Math.min(+st,NSTEP)/NSTEP)*geo.s;                       // 這一階的石階寬度（越高越窄）
    var maxCols=Math.max(1,Math.floor(span/nameW)), rows=1; while(Math.ceil(k/rows)>maxCols&&rows<4) rows++;
    var cols=Math.ceil(k/rows), colSp=Math.min(span/cols,Math.max(w*1.4,nameW));
    g.forEach(function(u,i){
      var row=Math.floor(i/cols), col=i%cols, inRow=Math.min(cols,k-row*cols);
      var cx=f.x+(col-(inRow-1)/2)*colSp, fy=f.y-row*rowStep;
      var d=MP.figs[u]; if(!d) return;
      d.classList.toggle('mv',!!anim);
      d.style.width=w.toFixed(1)+'px'; d.style.height=h.toFixed(1)+'px'; d.style.zIndex=String(Math.round(fy)+(u===MP.uid?1:0));
      d.style.setProperty('--nf',nf.toFixed(1)+'px');
      d.style.transform='translate('+(cx-w/2).toFixed(1)+'px,'+(fy-.956*h).toFixed(1)+'px)';
      MP.pos[u]={x:cx,y:fy,h:h};
    });
  });
  var e=mpElim(); ro.forEach(function(u){ var d=MP.figs[u]; if(d){ d.classList.toggle('hit',e[u]!==undefined); d.classList.toggle('out',e[u]!==undefined); } });
}
window.addEventListener('resize',function(){ if(MP.on&&MP.inGame){ measure(); mpLayout(false); } });

function mpGame(){
  var r=MP.room;
  if(!MP.inGame){ mpSetup(); }
  var key=[r.status,r.n,r.rd,r.ph].join('|');
  mpStrip(); mpHud();
  if(key===MP.key){ mpLayout(true); return; }
  var prev=MP.key; MP.key=key; MP.stall=0; MP.stallShown=false;
  if(r.status==='finished'){ mpFinish(); return; }
  if(r.ph==='ready'){ MP.countT=3; MP.lastC=0; S.phase='wait'; S.locked=true; MP.wait=99; $('kb').classList.add('locked'); setInfo('<div class="tag">'+plain('mpReady')+'</div>'); $('ch').textContent='3'; mpLayout(true); return; }
  if(r.ph==='ask'){ mpLayout(true); S.phase='wait'; S.locked=true; MP.wait=prev&&r.rd>0?.85:.3; $('kb').classList.add('locked'); $('typedTxt').className=''; S.buf=''; renderTyped(); setInfo(''); setStorm(0); return; }
  if(r.ph==='reveal'){ mpReveal(); return; }
}
function mpHud(){
  var r=MP.room, al=mpAlive().length, tot=mpRoster().length;
  $('stStep').innerHTML=zh('qLab')+'<br><b>'+Math.min(NSTEP,r.rd+1)+'/'+NSTEP+'</b>';
  $('stStrike').innerHTML=zh('mpAlive')+'<br><b>'+al+'/'+tot+'</b>';
}
function mpShowQ(){
  var r=MP.room, ch=r.qs[r.rd], w=BYCH[ch]; if(!w) return;
  var e=mpElim();
  MP.canType=mpAmIn()&&e[MP.uid]===undefined;
  S.q=w; S.buf=''; S.phase='ask'; S.locked=!MP.canType; S.T=S.tLeft=P.T; S.lastSec=Math.ceil(P.T);
  $('ch').textContent=chText(w); $('typedTxt').className=''; renderTyped(); renderTimer(); setStorm(0);
  $('kb').classList.toggle('locked',!MP.canType);
  setInfo(MP.canType?'':'<span class="wt">'+plain(mpAmIn()?'mpOut':'mpWatching')+'</span>');
}
function mpSubmitted(ok){      // 打字送出（submit() 會呼叫）；先不揭曉，等房主宣布
  S.phase='ask'; $('kb').classList.add('locked'); setInfo('<span class="wt">'+plain('mpSent')+'</span>');
  var rd=MP.room.rd, code=MP.code;
  waitRM().then(function(rm){ return rm.answer(code,rd,ok); }).catch(function(){});
}
function mpTimeUp(){
  if(S.locked||!MP.canType) return;
  S.locked=true; S.tLeft=0; renderTimer(); $('kb').classList.add('locked');
  setInfo('<span class="wt">'+plain('timeup')+'</span>');
  var rd=MP.room.rd, code=MP.code;
  waitRM().then(function(rm){ return rm.answer(code,rd,false); }).catch(function(){});
}
function mpBolts(list){
  var parts=[], W=geo.W, Hh=geo.H;
  list.forEach(function(u){
    var p=MP.pos[u]; if(!p) return;
    var hx=p.x, hy=p.y-p.h*.86, pts=[[hx+(Math.random()*18-9),-12]], n=6;
    for(var i=1;i<n;i++) pts.push([hx+(Math.random()*26-13)*(1-i/n),-12+(hy+12)*i/n]);
    pts.push([hx,hy]);
    var ps=pts.map(function(q){ return q[0].toFixed(1)+','+q[1].toFixed(1); }).join(' ');
    parts.push('<polyline points="'+ps+'" fill="none" stroke="#F3D98A" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><polyline points="'+ps+'" fill="none" stroke="#FFFDF0" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="'+hx.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(p.h*.3).toFixed(0)+'" fill="#FFF3B0" opacity=".5"/>');
  });
  var b=$('bolt'); b.setAttribute('viewBox','0 0 '+W+' '+Hh); b.innerHTML=parts.join('');
  b.classList.remove('on'); b.getBoundingClientRect(); b.classList.add('on');
}
function mpReveal(){
  var r=MP.room, rd=r.rd, e=mpElim(), q=BYCH[r.qs[rd]];
  if(q){ S.q=q; $('ch').textContent=chText(q); }
  S.phase='reveal'; S.locked=true; $('kb').classList.add('locked');
  var struck=mpRoster().filter(function(u){ return e[u]===rd; });
  var surv=mpAlive();
  mpLayout(false); mpStrip(); mpHud();
  var ans=q?q.r.map(readingText).join(' / '):'';
  var mine=e[MP.uid]===rd, inGame=mpAmIn();
  if(struck.length){
    mpBolts(struck); sfx('hit'); shake($('scene')); setStorm(1);
    var f=$('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
    struck.forEach(function(u){ var d=MP.figs[u]; if(d){ d.classList.remove('zap'); void d.offsetWidth; d.classList.add('zap'); } });
  }else{ setStorm(0); }
  if(surv.length){ surv.forEach(function(u){ var d=MP.figs[u]; if(d){ d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop'); } }); if(!struck.length) sfx('ok'); }
  var head;
  if(inGame&&mine){ head='<div class="tag">'+plain('struck')+'</div>'; $('typedTxt').className='bad'; }
  else if(inGame&&e[MP.uid]===undefined){ head='<span class="good">✓ '+(q?chText(q):'')+'</span>　'; $('typedTxt').className='done'; }
  else head='';
  setInfo(head+(mine||!inGame||e[MP.uid]!==undefined?plain('answer')+'：<span class="ans">'+ans+'</span>':ans));
  if(inGame&&!mine&&e[MP.uid]===undefined){ setInfo('<span class="good">✓ '+(q?chText(q):'')+'　'+ans+'</span>'); }
  S.tLeft=0; renderTimer();
}
function mpFinish(){
  var r=MP.room; S.phase='end'; S.locked=true; $('kb').classList.add('locked');
  mpLayout(true); mpStrip(); mpHud(); setStorm(0);
  if(MP.shown==='res'+r.n) return; MP.shown='res'+r.n;
  var e=mpElim(), mineR=e[MP.uid]!==undefined?+e[MP.uid]:NSTEP;
  if(mpAmIn()){ try{ HGPlays.end({score:mineR,secs:Math.round((Date.now()-MP.t0)/1000),name:getName()}); }catch(x){} }
  setTimeout(function(){ if(MP.on&&MP.inGame&&MP.room&&MP.room.status==='finished'&&MP.room.n===r.n) mpResults(); },1500);
  sfx('done');
}
function mpResults(){
  var r=MP.room, fin=(r.final||[]).slice().sort(function(a,b){ return b.r-a.r; });
  var ov=$('ov'); ov.hidden=false; MP.resultsUp=true;
  var medals=['🥇','🥈','🥉'];
  var rows=fin.map(function(x){
    var rk=1+fin.filter(function(y){ return y.r>x.r; }).length;
    return '<div class="lbRow'+(x.uid===MP.uid?' me':'')+'"><span class="lbRank">'+(rk<=3?medals[rk-1]:rk)+'</span><span class="lbName">'+esc(x.name)+'</span><span class="lbVal"><b>'+(x.r>=NSTEP?'🏔 '+zh('mpTop'):mpTxt('mpSteps',x.r))+'</b></span></div>';
  }).join('');
  ov.innerHTML='<div class="panel"><h2>'+plain('mpResult')+'</h2><div class="lbBox"><div class="lbList">'+rows+'</div></div><div class="btns">'+
    (MP.host?'<button class="big" id="mpAgain" type="button">'+H('mpAgain')+'</button>':'<p class="lbSt">'+plain('mpWaitAgain')+'</p>')+
    '<button class="ghost" id="mpLeaveBtn" type="button">'+H('mpLeave')+'</button></div></div>';
  if(MP.host) $('mpAgain').addEventListener('click',function(){
    this.disabled=true;
    waitRM().then(function(rm){ return rm.hostSet(MP.code,{status:'waiting',ph:'',rd:0,qs:[],ro:[],elim:{},final:[],n:r.n+1}); }).catch(function(){ if($('mpAgain')) $('mpAgain').disabled=false; });
  });
  $('mpLeaveBtn').addEventListener('click',mpLeave);
}
/* 「繼續留下」之後，把原本該顯示的浮層補回去（比賽結果） */
function mpSyncOverlay(){ if(MP.on&&MP.room&&MP.room.status==='finished'&&MP.shown==='res'+MP.room.n) mpResults(); }

/* ---------- 每一格畫面：倒數、作答時間、房主推進回合 ---------- */
function mpFrame(dt){
  var r=MP.room; if(!r||!MP.inGame||r.status==='waiting') return;
  if(r.status==='playing'&&r.ph==='ready'){
    MP.countT-=dt; var c=Math.max(1,Math.ceil(MP.countT));
    if(c!==MP.lastC){ MP.lastC=c; $('ch').textContent=String(c); sfx('tick'); }
  }
  if(S.phase==='wait'&&r.ph==='ask'){ MP.wait-=dt; if(MP.wait<=0) mpShowQ(); }
  else if(S.phase==='ask'&&r.ph==='ask'){
    S.tLeft=Math.max(0,S.tLeft-dt);
    var sec=Math.ceil(S.tLeft); if(sec!==S.lastSec){ S.lastSec=sec; if(sec>0&&sec<=3&&MP.canType&&!S.locked) sfx('tick'); }
    renderTimer(); setStorm(Math.pow(1-S.tLeft/S.T,1.6)*(MP.canType?1:.6));
    if(S.tLeft<=0&&!S.locked&&MP.canType) mpTimeUp();
  }
  if(r.status==='playing'){
    MP.stall+=dt;
    if(!MP.stallShown&&MP.stall>P.T+20){ MP.stallShown=true; setInfo('<span class="wt">'+plain('mpStall')+'</span>'); }
  }
  if(MP.host) mpHostFrame(dt);
}
function mpHostFrame(dt){
  var r=MP.room, H=MP.H, key=[r.status,r.ph,r.rd,r.n].join('|');
  if(H.key!==key){ H.key=key; H.t=0; H.busy=false; }
  H.t+=dt;
  if(H.busy||r.status!=='playing') return;
  function go(patch){ H.busy=true; waitRM().then(function(rm){ return rm.hostSet(MP.code,patch); }).catch(function(){ setTimeout(function(){ H.busy=false; },1500); }); }
  var e=mpElim(), ro=mpRoster(), rd=r.rd;
  if(r.ph==='ready'){ if(H.t>=3.2) go({ph:'ask'}); return; }
  if(r.ph==='ask'){
    var alive=ro.filter(function(u){ return e[u]===undefined; });
    var all=alive.every(function(u){ var p=MP.pl[u]; return p&&p.a&&p.a[String(rd)]!==undefined; });
    if((all&&H.t>=.9)||H.t>=P.T+.85+2.5){
      var ne={}; Object.keys(e).forEach(function(u){ ne[u]=e[u]; });
      alive.forEach(function(u){ var p=MP.pl[u]; if(!(p&&p.a&&p.a[String(rd)]===1)) ne[u]=rd; });
      go({ph:'reveal',elim:ne});
    }
    return;
  }
  if(r.ph==='reveal'){
    if(H.t<3.2) return;
    var left=ro.filter(function(u){ return e[u]===undefined; });
    if(rd>=NSTEP-1||!left.length){
      var fin=ro.map(function(u){ var p=MP.pl[u]||{name:'?',g:'m',ci:0}; return {uid:u,name:p.name,g:p.g,ci:p.ci,r:e[u]!==undefined?+e[u]:NSTEP}; }).sort(function(a,b){ return b.r-a.r; });
      go({status:'finished',ph:'end',final:fin});
    }else go({ph:'ask',rd:rd+1});
  }
}
