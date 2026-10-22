/* ============ social.js — apodo, amigos, en línea, invitaciones y salas ============
 * Sólo funciona con cuenta en la nube (G.DB.online). Usa:
 *
 *   Firestore
 *     names/{apodo en minúsculas}  { uid }               apodos únicos
 *     profiles/{uid}               { name, lower, at }   apodo público
 *     friendships/{uidA_uidB}      { users, from, to, status: 'pending'|'ok', names, at }
 *
 *     pres/{uid}                   { on, at, room, play } en línea (aproximado)
 *     inv/{para_de}                { to, from, room, name, at } invitaciones
 *
 *   Realtime Database: SÓLO mientras estás en una sala o partida en grupo
 *     rooms/{id}          { host, open, at, m: { uid: { name, dex, shiny } }, q: ... }
 *                         la sala; q/ son los mensajes de net.js
 *
 * Por qué así: el plan gratuito de Firebase sólo admite 100 conexiones a la
 * vez a la Realtime Database. Si todo el mundo estuviera conectado para el
 * "en línea", ése sería el máximo de jugadores. Ahora sólo cuentan los que
 * están en una sala; el "en línea" va por Firestore con un latido cada 2 min
 * y se lee sólo al abrir Amigos o la sala (lo leído vale 1 min).
 *
 * El resto del juego escucha los cambios con G.Social.on(fn).
 */
G.Social = (() => {
  const VALID = /^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/;
  const MAX_PLAYERS = 10;
  // Seis caracteres, sin 0/O ni 1/I para que se puedan decir en voz alta.
  const CODE_ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const INVITE_TTL = 3 * 60 * 1000;
  /*
   * Hora real: la del servidor de la web (cabecera Date de version.json, gratis).
   * Si el reloj del aparato va adelantado (p. ej. la zona horaria mal puesta),
   * todas las invitaciones parecían caducadas y se borraban sin enseñarse, y
   * los amigos salían siempre desconectados (pasaba en 2026-10).
   */
  let skew = 0;
  const now = () => Date.now() + skew;
  function measureSkew() {
    const t0 = Date.now();
    fetch('version.json?t=' + t0, { method: 'HEAD', cache: 'no-store' }).then(r => {
      const d = Date.parse(r.headers.get('date') || '');
      if (!d) return;
      const s = d + 500 - (t0 + Date.now()) / 2;          // (la cabecera va en segundos)
      skew = Math.abs(s) > 60000 ? s : 0;
      if (skew) console.warn('[Social] el reloj de este aparato va desfasado', Math.round(skew / 60000), 'min: se corrige');
    }).catch(() => {});
  }
  // Este grupo es pequeño. Un latido cada 2 min; "en línea" si el último
  // es de hace menos de 5 min. Al cerrar la pestaña se marca desconectado.
  const BEAT = 2 * 60 * 1000;
  const ONLINE = 5 * 60 * 1000;
  const PRES_TTL = 60 * 1000;           // lo leído de los amigos vale 1 min

  let fb = null, uid = null;
  let me = null;                    // { uid, name }
  let friends = new Map();          // otherUid -> { uid, name, pid, status: 'ok'|'in'|'out', online, play }
  let unFriends = null;
  let beatT = 0, presAt = 0, unInv = null;
  const pres = new Map();           // otherUid -> { online, play, room, seen } (lo último leído)
  const sentInv = new Set();        // a quién invitaste (para retirarlo al salir)
  let room = null;                  // { id, host, isHost, members: [{ uid, name, dex, shiny }] }
  let discKey = '';
  let claiming = false;
  let roomRefs = [];
  const invites = new Map();        // fromUid -> { from, name, room, at }
  const listeners = new Set();
  let started = false;

  function emit(what) { listeners.forEach(fn => { try { fn(what); } catch (e) { console.warn(e); } }); }
  const ts = () => firebase.database.ServerValue.TIMESTAMP;
  const fts = () => firebase.firestore.FieldValue.serverTimestamp();
  const msOf = v => (v && v.toMillis ? v.toMillis() : +v || 0);
  const pidOf = (a, b) => (a < b ? a + '_' + b : b + '_' + a);

  // ---------------- arranque ----------------

  /** Tras iniciar sesión. → 'ok' | 'need-nick' | 'off' (sin nube) */
  async function start() {
    if (!G.DB.online) return 'off';
    if (started) return me ? 'ok' : 'need-nick';
    fb = G.DB.fb; uid = fb.uid;
    started = true;
    measureSkew();
    // El apodo no cambia nunca: se recuerda en este navegador y así no se lee
    // el perfil en cada visita (una lectura menos por jugador y sesión).
    const NICK = 'ps.nick.' + uid;
    let cachedNick = null;
    try { cachedNick = localStorage.getItem(NICK); } catch (e) { /* nada */ }
    const prof = cachedNick ? { name: cachedNick }
      : await fb.fs.collection('profiles').doc(uid).get().then(s => s.exists ? s.data() : null).catch(() => null);
    if (prof) {
      me = { uid, name: prof.name };
      if (G.DB.user !== prof.name) G.DB.setName(prof.name);
      try { localStorage.setItem(NICK, prof.name); } catch (e) { /* nada */ }
    }
    else if (G.DB.nameAccount) {
      // Cuentas de nombre y contraseña: su nombre ya es único, se usa de apodo.
      const r = await claimNick(G.DB.save.name);
      if (!r.ok) return 'need-nick';
    } else return 'need-nick';
    online();
    return 'ok';
  }

  /** Reserva un apodo único y crea el perfil público. */
  async function claimNick(name) {
    name = (name || '').trim();
    if (!VALID.test(name)) return { ok: false, error: 'El apodo debe tener 3-16 letras, números o _.' };
    const lower = name.toLowerCase();
    try {
      await fb.fs.runTransaction(async tx => {
        const nref = fb.fs.collection('names').doc(lower);
        const n = await tx.get(nref);
        if (n.exists && n.data().uid !== uid) throw { code: 'taken' };
        if (!n.exists) tx.set(nref, { uid });
        tx.set(fb.fs.collection('profiles').doc(uid),
          { name, lower, at: firebase.firestore.FieldValue.serverTimestamp() });
      });
    } catch (e) {
      if (e && e.code === 'taken') return { ok: false, error: 'Ese apodo ya lo tiene otro jugador.' };
      return { ok: false, error: 'No se pudo guardar el apodo (' + ((e && e.code) || 'error') + ').' };
    }
    me = { uid, name };
    try { localStorage.setItem('ps.nick.' + uid, name); } catch (e) { /* nada */ }
    G.DB.setName(name);
    if (started && !beatT) online();
    publishProfile(true);
    return { ok: true };
  }

  /*
   * Amigos e invitaciones. Nada de esto usa la Realtime Database.
   * Desde el 20-10-2026 la lista de amigos NO se carga al entrar (1 lectura por
   * amigo en cada carga de la página, para todos): sólo al abrir Amigos, la sala
   * o el ranking de amigos (ensureFriends). Las invitaciones sí se escuchan desde
   * el principio si este navegador sabe que tienes amigos (hasFrKey); el servidor
   * ya comprueba que sean de un amigo.
   */
  const hasFrKey = () => 'ps.hasfr.' + uid;
  function online() {
    if (beatT) return;                        // ya estaba en marcha
    if (fb.rtdb) fb.rtdb.goOffline();         // se conecta sólo al entrar en una sala
    writeStatus();
    beatT = setInterval(() => { if (document.visibilityState === 'visible') writeStatus(); }, BEAT);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    let known = false;
    try { known = localStorage.getItem(hasFrKey()) === '1'; } catch (e) { /* nada */ }
    if (known) listenInvites();
  }

  /** Carga la lista de amigos (y la sigue escuchando) la primera vez que hace falta. */
  let friendsReady = null;
  function ensureFriends() {
    if (!fb || !me) return Promise.resolve();
    if (!friendsReady) friendsReady = new Promise(res => listenFriends(res));
    return friendsReady;
  }

  /** Invitaciones a salas: sólo te pueden llegar de amigos, así que sin amigos no se escucha (lecturas). */
  function listenInvites() {
    if (unInv || !fb) return;
    unInv = fb.fs.collection('inv').where('to', '==', uid).onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        const v = ch.doc.data();
        if (ch.type === 'removed') { invites.delete(v.from); emit('invites'); return; }
        onInvite(ch.doc.ref, v);
      });
    }, e => console.warn('[Social] invitaciones:', e.code || e.message));
  }

  let playing = false, lastBeat = 0;
  /** ¿Hay alguien que pueda leer tu "en línea"? (sólo los amigos confirmados) */
  const hasFriends = () => [...friends.values()].some(f => f.status === 'ok');
  const mayPublish = () => {
    if (hasFriends()) return true;
    try { return localStorage.getItem(hasFrKey()) === '1'; } catch (e) { return false; }
  };
  const presKey = () => 'ps.pres.' + uid;
  function writeStatus(on = true) {
    if (!fb || !me || !mayPublish()) return;
    if (on) lastBeat = Date.now();
    fb.fs.collection('pres').doc(uid).set({
      on: !!on, at: fts(), room: room ? room.id : '', play: playing
    }).catch(() => {});
  }
  function setPlaying(p) { if (playing !== !!p) { playing = !!p; writeStatus(); } }
  function onVisible() { if (document.visibilityState === 'visible') writeStatus(true); }
  function onHide() { writeStatus(false); }

  async function stop(why) {
    if (!started) return;
    await leaveRoom().catch(() => {});
    if (unFriends) { unFriends(); unFriends = null; }
    if (unInv) { unInv(); unInv = null; }
    clearInterval(beatT); beatT = 0; friendsReady = null;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pagehide', onHide);
    if (me && fb) await fb.fs.collection('pres').doc(uid).delete().catch(() => {});
    try { localStorage.removeItem(presKey()); } catch (e) { /* nada */ }
    if (why === 'delete') {
      try { localStorage.removeItem('ps.nick.' + uid); } catch (e) { /* nada */ }
      await deleteAll().catch(e => console.warn('[Social] borrar:', e));
    }
    friends.clear(); invites.clear(); sentInv.clear(); pres.clear(); presAt = 0;
    me = null; started = false; fb = null; uid = null; playing = false;
    emit('stop');
  }

  /** Al borrar la cuenta: amistades, marcas del ranking, perfil y apodo. */
  async function deleteAll() {
    // Cada paso por separado: si uno falla, los demás se borran igual.
    const step = async (what, fn) => { try { await fn(); } catch (e) { console.warn('[Social] no se pudo borrar ' + what + ':', e.code || e.message); } };
    const del = async q => { const s = await q.get(); await Promise.all(s.docs.map(d => d.ref.delete().catch(() => {}))); };
    await step('amistades', () => del(fb.fs.collection('friendships').where('users', 'array-contains', uid)));
    await step('filas del ranking', () => G.Ranking.removeMine());
    await step('invitaciones', () => del(fb.fs.collection('inv').where('to', '==', uid)));
    await step('marcas', () => del(fb.fs.collectionGroup('e').where('uids', 'array-contains', uid)));
    await step('partida en curso', () => fb.fs.collection('runs').doc(uid).delete());
    await step('en línea', () => fb.fs.collection('pres').doc(uid).delete());
    await step('apodo', async () => {
      const prof = await fb.fs.collection('profiles').doc(uid).get();
      const lower = prof.exists ? prof.data().lower : me && me.name.toLowerCase();
      if (lower) await fb.fs.collection('names').doc(lower).delete().catch(() => {});
      if (prof.exists) await fb.fs.collection('profiles').doc(uid).delete();
    });
  }

  // ---------------- amigos ----------------

  function listenFriends(ready) {
    unFriends = fb.fs.collection('friendships').where('users', 'array-contains', uid).onSnapshot(snap => {
      const next = new Map();
      snap.forEach(d => {
        const f = d.data();
        const other = f.users[0] === uid ? f.users[1] : f.users[0];
        next.set(other, Object.assign({
          uid: other, pid: d.id, name: (f.names && f.names[other]) || '???',
          status: f.status === 'ok' ? 'ok' : f.to === uid ? 'in' : 'out',
          online: false, play: false, room: '', seen: 0
        }, pres.get(other) || {}));
      });
      friends = next;
      emit('friends');
      // Con amigos ya te pueden invitar (y este navegador lo recuerda para la próxima vez).
      try { if (hasFriends()) localStorage.setItem(hasFrKey(), '1'); else localStorage.removeItem(hasFrKey()); } catch (e) { /* nada */ }
      if (hasFriends() && Date.now() - lastBeat > BEAT) writeStatus();
      if (hasFriends()) listenInvites();
      if (ready) { ready(); ready = null; }
    }, e => { console.warn('[Social] amigos:', e.code || e.message); if (ready) { ready(); ready = null; } });
  }

  /** Lee el "en línea" de tus amigos (1 lectura por amigo). Lo leído vale 1 min. */
  async function refreshPresence(force = false) {
    if (!fb || (!force && Date.now() - presAt < PRES_TTL)) return;
    presAt = Date.now();
    const ok = [...friends.values()].filter(f => f.status === 'ok');
    const docs = await Promise.all(ok.map(f => fb.fs.collection('pres').doc(f.uid).get().catch(() => null)));
    const t = now();
    ok.forEach((f, i) => {
      const v = docs[i] && docs[i].exists ? docs[i].data() : null;
      const on = !!(v && v.on && t - msOf(v.at) < ONLINE);
      const p = { online: on, play: !!(on && v.play), room: on ? (v.room || '') : '', seen: v ? msOf(v.at) : 0 };
      pres.set(f.uid, p);
      const cur = friends.get(f.uid);
      if (cur) Object.assign(cur, p);
    });
    emit('presence');
  }

  /** Envía una solicitud de amistad (o acepta la que ya te había mandado). */
  async function request(name) {
    name = (name || '').trim();
    if (!me) return { ok: false, error: 'Primero elige tu apodo.' };
    if (!VALID.test(name)) return { ok: false, error: 'Escribe el apodo exacto de tu amigo.' };
    const n = await fb.fs.collection('names').doc(name.toLowerCase()).get().catch(() => null);
    if (!n || !n.exists) return { ok: false, error: 'No hay ningún jugador con ese apodo.' };
    const other = n.data().uid;
    if (other === uid) return { ok: false, error: 'Ese eres tú.' };
    const f = friends.get(other);
    if (f && f.status === 'ok') return { ok: false, error: 'Ya sois amigos.' };
    if (f && f.status === 'out') return { ok: false, error: 'Ya le enviaste una solicitud.' };
    if (f && f.status === 'in') return accept(other);
    const prof = await fb.fs.collection('profiles').doc(other).get().catch(() => null);
    const otherName = prof && prof.exists ? prof.data().name : name;
    const users = [uid, other].sort();
    try {
      await fb.fs.collection('friendships').doc(users[0] + '_' + users[1]).set({
        users, from: uid, to: other, status: 'pending',
        names: { [uid]: me.name, [other]: otherName },
        at: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true, msg: 'Solicitud enviada a ' + otherName };
    } catch (e) { return { ok: false, error: 'No se pudo enviar (' + (e.code || 'error') + ').' }; }
  }

  async function accept(other) {
    const f = friends.get(other);
    if (!f || f.status !== 'in') return { ok: false, error: 'No hay solicitud.' };
    try {
      await fb.fs.collection('friendships').doc(f.pid).update({
        status: 'ok', at: firebase.firestore.FieldValue.serverTimestamp(), ['names.' + uid]: me.name
      });
      return { ok: true, msg: 'Ahora eres amigo de ' + f.name };
    } catch (e) { return { ok: false, error: 'No se pudo aceptar (' + (e.code || 'error') + ').' }; }
  }

  async function remove(other) {
    const f = friends.get(other);
    if (!f) return { ok: false };
    try { await fb.fs.collection('friendships').doc(f.pid).delete(); return { ok: true }; }
    catch (e) { return { ok: false, error: 'No se pudo borrar (' + (e.code || 'error') + ').' }; }
  }

  // ---------------- salas ----------------

  function memberInfo() {
    const s = G.DB.save;
    return { name: me.name, dex: s.partner, shiny: !!s.partnerShiny && G.DB.ownsShiny(s.partner), at: ts() };
  }

  /**
   * La Realtime Database sólo se conecta mientras estás en una sala: cada
   * conexión abierta gasta descargas (se pagan a partir de 360 MB al día).
   * (El 11-10-2026 hubo un contador de gente en línea que la tenía siempre
   * conectada; se quitó por eso.)
   */
  function rtOn() { if (fb.rtdb) fb.rtdb.goOnline(); }
  function rtOff() { if (fb && fb.rtdb && !room) fb.rtdb.goOffline(); }

  function randomCode() {
    const buf = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 256);
    let s = '';
    for (let i = 0; i < 6; i++) s += CODE_ALPH[buf[i] % CODE_ALPH.length];
    return s;
  }
  function cleanCode(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  async function createRoom() {
    if (room) return room;
    rtOn();
    const rules = G.Coop.publicRules(G.Coop.rulesFromSettings());
    const base = memberInfo();
    // set(), no transacción: las reglas no dejan LEER una sala hasta ser miembro,
    // y la transacción tiene que leerla antes de crearla, así que fallaba siempre
    // (permission_denied) y nadie podía abrir sala ni invitar.
    for (let n = 0; n < 8; n++) {
      const code = randomCode();
      const ref = fb.rtdb.ref('rooms/' + code);
      try {
        await ref.set({
          host: uid, open: true, at: Date.now(), cap: rules.cap, rules, code,
          m: { [uid]: Object.assign({}, base, { at: Date.now() }) }
        });
      } catch (e) { continue; }
      enterRoom(code, uid);
      return room;
    }
    rtOff();
    throw new Error('No se pudo crear la sala.');
  }

  async function joinRoom(id) {
    id = cleanCode(id);
    if (id.length !== 6) return { ok: false, error: 'El código tiene 6 caracteres.' };
    if (room && room.id === id) return { ok: true };
    if (room) await leaveRoom();
    rtOn();
    let open = null, host = null;
    try {
      open = (await fb.rtdb.ref('rooms/' + id + '/open').get()).val();
      host = (await fb.rtdb.ref('rooms/' + id + '/host').get()).val();
    } catch (e) { /* sala borrada */ }
    if (!host) { rtOff(); return { ok: false, error: 'Esa sala ya no existe.' }; }
    if (open !== true) { rtOff(); return { ok: false, error: 'La partida de esa sala ya ha empezado.' }; }
    try { await fb.rtdb.ref('rooms/' + id + '/m/' + uid).set(memberInfo()); }
    catch (e) { rtOff(); return { ok: false, error: 'No se pudo entrar en la sala.' }; }
    const n = (await fb.rtdb.ref('rooms/' + id + '/m').get()).numChildren();
    const capVal = (await fb.rtdb.ref('rooms/' + id + '/cap').get()).val();
    const cap = G.Coop.clampCap(capVal == null ? 4 : capVal);
    if (n > cap || n > MAX_PLAYERS) {
      await fb.rtdb.ref('rooms/' + id + '/m/' + uid).remove();
      rtOff();
      return { ok: false, error: 'La sala está llena (máximo ' + cap + ').' };
    }
    enterRoom(id, host);
    return { ok: true };
  }

  function enterRoom(id, host) {
    room = { id, host, isHost: host === uid, members: [], open: true, cap: G.Coop.rulesFromSettings().cap, rules: G.Coop.rulesFromSettings() };
    watchRoomDisconnect();
    const mref = fb.rtdb.ref('rooms/' + id + '/m');
    mref.on('value', s => {
      if (!room || room.id !== id) return;
      const m = s.val() || {};
      // El anfitrión siempre primero; el resto por orden de llegada.
      room.members = Object.keys(m).map(k => Object.assign({ uid: k }, m[k]))
        .sort((a, b) => (a.uid === room.host ? -1 : b.uid === room.host ? 1 : (a.at || 0) - (b.at || 0)));
      // El anfitrión ya no está: el que llegó primero se queda con la sala.
      if (room.host && !room.members.some(x => x.uid === room.host)) {
        const next = nextHost(room.members, room.host);
        if (next && next.uid === uid) claimHost();
      }
      watchRoomDisconnect();
      emit('room');
    }, () => closedRoom());
    let seenHost = false, prevHost = host;
    const href = fb.rtdb.ref('rooms/' + id + '/host');
    href.on('value', s => {
      if (!room || room.id !== id) return;
      const h = s.val();
      if (!h) { closedRoom(); return; }
      const first = !seenHost;
      seenHost = true;
      const became = h === uid && !room.isHost;
      room.host = h;
      room.isHost = h === uid;
      if (!first && h !== prevHost) {
        G.UI.toast(became ? 'Ahora eres el anfitrión.' : 'Hay un anfitrión nuevo.', 3600);
        watchRoomDisconnect();
      }
      prevHost = h;
      emit('room');
    }, () => closedRoom());
    const oref = fb.rtdb.ref('rooms/' + id + '/open');
    oref.on('value', s => { if (room && room.id === id) { room.open = s.val() === true; emit('room'); } }, () => {});
    const cref = fb.rtdb.ref('rooms/' + id + '/cap');
    cref.on('value', s => {
      if (!room || room.id !== id) return;
      if (s.val() != null) room.cap = G.Coop.clampCap(s.val());
      emit('room');
    }, () => {});
    const rref = fb.rtdb.ref('rooms/' + id + '/rules');
    rref.on('value', s => {
      if (!room || room.id !== id) return;
      if (s.val()) room.rules = G.Coop.normalizeRules(Object.assign({ cap: room.cap }, s.val()));
      emit('room');
    }, () => {});
    roomRefs = [mref, href, oref, cref, rref];
    writeStatus();
    emit('room');
  }

  /** El siguiente anfitrión: el que lleva más tiempo en la sala. */
  function nextHost(members, oldHost) {
    return members.filter(m => m.uid !== oldHost)
      .sort((a, b) => (a.at || 0) - (b.at || 0) || (a.uid < b.uid ? -1 : 1))[0] || null;
  }

  /** Si se cierra el navegador: la sala se borra sólo si no queda nadie; si no, se queda tu plaza vacía y otro pasa a anfitrión. */
  function watchRoomDisconnect() {
    if (!room || !fb) return;
    const others = room.members.filter(m => m.uid !== uid).length;
    const key = (room.isHost ? 'h' : 'g') + (room.isHost && others === 0 ? ':solo' : ':slot');
    if (key === discKey) return;
    discKey = key;
    const roomRef = fb.rtdb.ref('rooms/' + room.id);
    const mine = fb.rtdb.ref('rooms/' + room.id + '/m/' + uid);
    roomRef.onDisconnect().cancel();
    mine.onDisconnect().cancel();
    if (room.isHost && others === 0) roomRef.onDisconnect().remove();
    else mine.onDisconnect().remove();
  }

  function claimHost() {
    if (!room || claiming || room.isHost) return;
    claiming = true;
    const id = room.id;
    fb.rtdb.ref('rooms/' + id + '/host').set(uid).catch(() => {}).finally(() => { claiming = false; });
  }

  function detachRoom() {
    for (const r of roomRefs) r.off();
    roomRefs = [];
    discKey = '';
  }

  function closedRoom() {
    if (!room) return;
    detachRoom();
    room = null;
    retractInvites();
    writeStatus();
    rtOff();
    emit('room-closed');
  }

  async function leaveRoom() {
    if (!room) return;
    const r = room;
    const others = nextHost(r.members, uid);
    detachRoom();
    room = null;
    const roomRef = fb.rtdb.ref('rooms/' + r.id);
    const mine = fb.rtdb.ref('rooms/' + r.id + '/m/' + uid);
    roomRef.onDisconnect().cancel().catch(() => {});
    mine.onDisconnect().cancel().catch(() => {});
    if (r.isHost && !others) await roomRef.remove().catch(() => {});
    else if (r.isHost) {
      // Primero el relevo, luego tu plaza: la sala no se cierra.
      await fb.rtdb.ref('rooms/' + r.id + '/host').set(others.uid).catch(() => {});
      await mine.remove().catch(() => {});
    } else await mine.remove().catch(() => {});
    retractInvites();
    writeStatus();
    rtOff();
    emit('room');
  }

  function roomCap() {
    if (room && room.cap) return G.Coop.clampCap(room.cap);
    return G.Coop.rulesFromSettings().cap;
  }

  /** El anfitrión publica el máximo y la dificultad de esta sala. */
  function pushRules() {
    if (!room || !room.isHost || !fb) return;
    const rules = G.Coop.publicRules(G.Coop.rulesFromSettings());
    if (room.members.length > rules.cap) return;
    room.cap = rules.cap;
    room.rules = G.Coop.normalizeRules(rules);
    fb.rtdb.ref('rooms/' + room.id).update({ cap: rules.cap, rules }).catch(() => {});
    emit('room');
  }

  /** El anfitrión cierra la sala a nuevos jugadores al empezar la partida. */
  function setOpen(open) {
    if (room && room.isHost) fb.rtdb.ref('rooms/' + room.id + '/open').set(!!open).catch(() => {});
  }

  /** Actualiza tu Pokémon en la sala (si cambias de compañero). */
  function refreshMember() {
    if (room && me) fb.rtdb.ref('rooms/' + room.id + '/m/' + uid).update(
      { dex: G.DB.save.partner, shiny: !!G.DB.save.partnerShiny && G.DB.ownsShiny(G.DB.save.partner) }).catch(() => {});
  }

  // ---------------- invitaciones ----------------

  async function invite(other) {
    const f = friends.get(other);
    if (!f || f.status !== 'ok') return { ok: false, error: 'Sólo puedes invitar a tus amigos.' };
    if (room && room.members.length >= roomCap()) return { ok: false, error: 'La sala está llena.' };
    if (room && !room.isHost) return { ok: false, error: 'Sólo el anfitrión de la sala puede invitar.' };
    if (!room) await createRoom();
    try {
      await fb.fs.collection('inv').doc(other + '_' + uid).set({ to: other, from: uid, room: room.id, name: me.name, at: fts() });
    } catch (e) { return { ok: false, error: 'No se pudo invitar (' + (e.code || 'error') + ').' }; }
    sentInv.add(other);
    return { ok: true, msg: 'Invitación enviada a ' + f.name };
  }

  /** Retira las invitaciones que mandaste (al salir de la sala). */
  function retractInvites() {
    if (!fb) return;
    for (const o of sentInv) fb.fs.collection('inv').doc(o + '_' + uid).delete().catch(() => {});
    sentInv.clear();
  }

  function onInvite(ref, v) {
    // Las caducadas se borran; sólo se aceptan de amigos confirmados.
    if (!v || (v.at && now() - msOf(v.at) > INVITE_TTL)) { ref.delete().catch(() => {}); return; }
    const f = friends.get(v.from);
    if (f && f.status !== 'ok') return;
    invites.set(v.from, { from: v.from, name: v.name, room: v.room, at: msOf(v.at) || now() });
    emit('invites');
  }

  const invDoc = from => fb.fs.collection('inv').doc(uid + '_' + from);

  async function acceptInvite(from) {
    const inv = invites.get(from);
    if (!inv || now() - inv.at > INVITE_TTL) { invites.delete(from); emit('invites'); return { ok: false, error: 'La invitación ha caducado.' }; }
    invites.delete(from);
    invDoc(from).delete().catch(() => {});
    emit('invites');
    return joinRoom(inv.room);
  }

  function declineInvite(from) {
    invites.delete(from);
    invDoc(from).delete().catch(() => {});
    emit('invites');
  }

  // ---------------- perfil público ----------------

  /** Lo que se enseña de ti (también para tu vista previa, sin subirlo). */
  function profileData() {
    const s = G.DB.save, st = s.stats, prof = s.profile || {};
    const unlocked = G.AchDefs.LIST.filter(a => s.ach && s.ach[a.id]);
    const medals = unlocked.slice().sort((a, b) => (b.tier - a.tier) || (s.ach[b.id] - s.ach[a.id])).slice(0, 8).map(a => a.id);
    return {
      name: me ? me.name : G.DB.user,
      favs: (prof.favs || []).slice(0, 3).map(f => ({ dex: f.dex | 0, shiny: !!f.shiny })),
      title: prof.title || '',
      best: { solo: st.bestTime | 0, group: st.bestGroupTime | 0, level: st.bestLevel | 0, bosses: st.bossesTotal | 0,
              legends: Object.keys(s.legends || {}).length, kills: st.totalKills | 0, medals: unlocked.length },
      medals
    };
  }

  let pubT = 0, pubAt = 0, pubLast = '';
  /**
   * Sube tu perfil (con un poco de espera, por si cambias varias cosas
   * seguidas), pero SÓLO si ha cambiado algo de lo que se ve a primera vista:
   * récords de tiempo y nivel, legendarios, medallas, título o favoritos.
   * Los jefes y derrotados (que cambian en cada partida) se suben con lo demás
   * cuando toca, no por sí solos: el perfil se escribía 200.000 veces al día
   * (13-10-2026). Si cambias favoritos o título (force), al momento.
   */
  function publishProfile(force = false) {
    if (!me || !fb) return;
    if (!force && Date.now() - pubAt < 2 * 3600 * 1000) return;    // como mucho cada 2 h (era 30 min)
    clearTimeout(pubT);
    pubT = setTimeout(() => {
      if (!me || !fb) return;
      const d = profileData();
      // Para decidir si se sube (se recuerda entre sesiones): sin jefes ni derrotados.
      const key = JSON.stringify(Object.assign({}, d, { best: Object.assign({}, d.best, { kills: 0, bosses: 0 }) }));
      const lsKey = 'ps.pub.' + uid;
      if (!pubLast) { try { pubLast = localStorage.getItem(lsKey) || ''; } catch (e) { /* nada */ } }
      if (key === pubLast) return;
      pubLast = key; pubAt = Date.now();
      try { localStorage.setItem(lsKey, key); } catch (e) { /* nada */ }
      fb.fs.collection('profiles').doc(uid).set(Object.assign(d, {
        name: me.name, lower: me.name.toLowerCase(), at: firebase.firestore.FieldValue.serverTimestamp()
      })).catch(e => { pubLast = ''; console.warn('[Social] perfil:', e.code || e.message); });
    }, 800);
  }

  /** El perfil de otro jugador, limpio (ver G.U.int / str): sólo lo que el juego sabe pintar. */
  function cleanProfile(d) {
    const U = G.U, b = d.best || {};
    return {
      name: U.str(d.name, 24), title: U.str(d.title, 40),
      favs: U.list(d.favs, 3).filter(f => f && G.DEX_BY[U.int(f.dex)]).map(f => ({ dex: U.int(f.dex), shiny: f.shiny === true })),
      best: { solo: U.int(b.solo, 86400), group: U.int(b.group, 86400), level: U.int(b.level, 999), bosses: U.int(b.bosses, 1e9),
              legends: U.int(b.legends, 999), kills: U.int(b.kills, 1e12), medals: U.int(b.medals, 999) },
      medals: U.list(d.medals, 8).map(x => U.str(x, 40))
    };
  }

  /** El perfil público de otro jugador. */
  const profCache = new Map();
  async function getProfile(other) {
    if (!fb) return null;
    // El tuyo sale de tu partida (sin leer nada y siempre al día).
    if (other === uid && me) return Object.assign(profileData(), { name: me.name });
    const c = profCache.get(other);
    if (c && Date.now() - c.at < 10 * 60 * 1000) return c.v;     // lo leído vale 10 min
    const d = await fb.fs.collection('profiles').doc(other).get().catch(() => null);
    const v = d && d.exists ? cleanProfile(d.data()) : null;
    profCache.set(other, { at: Date.now(), v });
    return v;
  }

  // Al cerrar sesión o borrar la cuenta.
  G.DB.onLeave(why => stop(why));

  return {
    start, stop, claimNick, request, accept, remove, publishProfile, getProfile, profileData,
    createRoom, joinRoom, leaveRoom, setOpen, refreshMember, setPlaying, refreshPresence, pushRules, cleanCode, ensureFriends,
    invite, acceptInvite, declineInvite,
    on(fn) { listeners.add(fn); }, off(fn) { listeners.delete(fn); },
    get me() { return me; },
    get started() { return started; },
    get friends() { return [...friends.values()]; },
    get invites() { return [...invites.values()]; },
    get room() { return room; },
    get uid() { return uid; },
    /** La hora real (corrige el reloj del aparato si va desfasado). */
    now,
    VALID, MAX_PLAYERS
  };
})();
