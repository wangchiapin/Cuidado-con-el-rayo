  /* ===== 連線房間 window.RM =====
     rayo_rooms/{4位數房號}            ← 房主寫（難度、題目、第幾題、誰被淘汰…）
     rayo_rooms/{房號}/players/{uid}   ← 每個人只寫自己的（暱稱、角色、答題結果 a）
     規則見 firestore.rules.txt。一間房最多 15 人，房間 6 小時後過期。 */
  const MAXP = 15, ROOM_MS = 6 * 3600 * 1000;
  const roomRef = code => doc(db, 'rayo_rooms', code);
  const meRef = (code, uid) => doc(db, 'rayo_rooms', code, 'players', uid);
  const cleanName = s => [...String(s || '').replace(/\s+/g, ' ').trim()].slice(0, 14).join('');
  const tsMs = t => (t && typeof t.toMillis === 'function') ? t.toMillis() : (+t || 0);
  const plain = d => { const o = d.data(); return { ...o, uid: d.id }; };
  window.RM = {
    MAXP,
    uid: ensureUid,
    /* 開房：隨機 4 位數房號，撞到還沒過期的房間就換一個 */
    async create(o){
      const uid = await ensureUid(), name = cleanName(o.name);
      if(!name) throw new Error('noname');
      for(let i = 0; i < 12; i++){
        const code = String(Math.floor(1000 + Math.random() * 9000));
        const snap = await getDoc(roomRef(code));
        if(snap.exists()){
          const d = snap.data();
          if(tsMs(d.expireAt) > Date.now() && d.status !== 'closed') continue;
          // 舊房間留下的玩家資料清掉（房主才能刪，所以要等新房間建好再清）
        }
        const data = { code, hostUid: uid, hostName: name, level: o.level, nq: [10,15,20,25].includes(o.nq) ? o.nq : 10, status: 'waiting', ph: '', rd: 0, n: 0,
          qs: [], ro: [], elim: {}, final: [], createdAt: serverTimestamp(), expireAt: Timestamp.fromMillis(Date.now() + ROOM_MS) };
        await setDoc(roomRef(code), data);
        if(snap.exists()){
          try{ const old = await getDocs(collection(db, 'rayo_rooms', code, 'players'));
               await Promise.all(old.docs.map(d => deleteDoc(d.ref))); }catch(e){}
        }
        await setDoc(meRef(code, uid), { name, g: o.g, ci: o.ci, want: !!o.want, spec: !!o.want, a: {}, joinedAt: serverTimestamp() });
        return code;
      }
      throw new Error('nocode');
    },
    /* 加入：回傳 {ok, spec} 或 {ok:false, why:'none'|'closed'|'full'} */
    async join(code, o){
      const uid = await ensureUid(), name = cleanName(o.name);
      if(!/^[0-9]{4}$/.test(code)) return { ok:false, why:'none' };
      const snap = await getDoc(roomRef(code));
      if(!snap.exists()) return { ok:false, why:'none' };
      const r = snap.data();
      if(r.status === 'closed' || tsMs(r.expireAt) < Date.now()) return { ok:false, why:'closed' };
      const ps = await getDocs(collection(db, 'rayo_rooms', code, 'players'));
      const mine = ps.docs.find(d => d.id === uid);
      if(!mine && ps.size >= MAXP) return { ok:false, why:'full' };
      if(mine) return { ok:true, spec: !!mine.data().spec, again:true };
      const spec = !!o.want || r.status !== 'waiting';
      await setDoc(meRef(code, uid), { name, g: o.g, ci: o.ci, want: !!o.want, spec, a: {}, joinedAt: serverTimestamp() });
      return { ok:true, spec };
    },
    /* 即時收房間與玩家名單；回傳取消用的函式 */
    listen(code, onRoom, onPlayers, onErr){
      const u1 = onSnapshot(roomRef(code), s => onRoom(s.exists() ? { ...s.data({ serverTimestamps:'estimate' }), code } : null), e => onErr && onErr(e));
      const u2 = onSnapshot(collection(db, 'rayo_rooms', code, 'players'), s => onPlayers(s.docs.map(d => ({ ...d.data({ serverTimestamps:'estimate' }), uid: d.id }))), e => onErr && onErr(e));
      return () => { try{ u1(); }catch(e){} try{ u2(); }catch(e){} };
    },
    async hostSet(code, patch){ await updateDoc(roomRef(code), patch); },
    async me(code, patch){ const uid = await ensureUid(); await updateDoc(meRef(code, uid), patch); },
    async answer(code, rd, ok){ const uid = await ensureUid(); await updateDoc(meRef(code, uid), { ['a.' + rd]: ok ? 1 : 0 }); },
    /* 離開：房主＝關房間；一般玩家＝等人階段把自己刪掉，比賽中保留紀錄（沒答題會被當成答錯） */
    async leave(code, o){
      const uid = await ensureUid();
      if(o.host){ await updateDoc(roomRef(code), { status:'closed' }); return; }
      if(o.waiting){ await deleteDoc(meRef(code, uid)); }
    }
  };
