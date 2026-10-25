/* ============ coop.js — partida cooperativa (de 1 a 10 jugadores) ============
 *
 * Quién manda en qué:
 *   ANFITRIÓN   enemigos (aparición, IA, vida, muerte), objetos del suelo,
 *               experiencia y nivel del equipo, reloj, fin de la partida.
 *   CADA UNO    su propio Pokémon: posición, vida, ataques y lo que le golpea.
 *               Sus golpes a enemigos se mandan al anfitrión, que los aplica.
 *
 * Los invitados ven COPIAS de los enemigos del anfitrión (enemy.remote) y los
 * ataques de los compañeros como "fantasmas" que no hacen daño (ver combat.js).
 *
 * Quién está eligiendo (objeto o vínculo) y quién ha elegido carta de nivel va
 * además en CADA envío (no sólo en un aviso suelto): si un aviso se pierde
 * porque la conexión parpadea, el siguiente envío lo arregla y nadie se queda
 * esperando a otro para siempre (pasaba en 2026-10).
 *
 * Mensajes (por net.js, unas 15 veces por segundo; 5 si va por el relé):
 *   invitado -> anfitrión  { k:'f', p:[estado], ev:[eventos] }
 *   anfitrión -> invitado  { k:'f', t, lv, xp, xn, ki, bo, co, p:{uid:[estado]},
 *                            e:[[id,x,y,vida,anim,dir,estados]], ev:[eventos],
 *                            ja:[x,y,anim,dir] (Arceus, sólo en la Sentencia) }
 *   anfitrión -> todos     { k:'start', seed, host, members:[{uid,name,dex,shiny}] }
 */
G.Coop = (() => {
  const ANIMS = ['Idle', 'Walk', 'Attack', 'Shoot', 'Charge', 'Hurt', 'Faint'];
  const COLORS = ['#ffcb3d', '#5fc8ff', '#7ee07a', '#ff8ad8', '#ff8a4a', '#c79bff', '#7dffd2', '#ff6b6b', '#e8e08a', '#8ad0ff'];
  const ABS_MAX = 10;
  // La misma curva de siempre. Con 4 personas: aparecen ×3.25, vida ×1.9,
  // experiencia repartida entre 2.8. Con 1 persona los tres valen 1.
  const autoRate = n => 1 + 0.75 * (n - 1);
  const autoHp = n => 1 + 0.3 * (n - 1);
  const autoXp = n => 1 + 0.6 * (n - 1);
  // Mensajes por segundo: 15 por la conexión directa y 3 si hace falta el relé.
  const RATE_FAST = 1 / 15, RATE_SLOW = 1 / 3;
  const rateFor = u => (G.Net.slow(u) ? RATE_SLOW : RATE_FAST);
  const NEAR = 950;                     // radio de enemigos que se mandan a cada uno

  let active = false, host = false, me = null, hostUid = null;
  let local = null;                     // tu Player
  const mates = new Map();              // uid -> { uid, name, color, pl, connected, q:[], flushT, xpMul }
  let outEv = [];                       // invitado: eventos para el anfitrión
  let flushT = 0;
  let hitFrom = null;                   // invitado cuyo golpe se está aplicando (no repetirle el número)
  let api = {};                         // callbacks del juego (game.js)
  let waiting = new Set();              // subida de nivel: quién falta por elegir
  let holds = new Set();                // quién está eligiendo una fusión (la partida se para para todos)
  // El anfitrión mueve a los enemigos: si cambia de pestaña (o se le congela),
  // todo se para para todos. Antes los enemigos se quedaban quietos y los demás
  // seguían jugando con una ventaja enorme.
  let hostAway = false, stalled = false, lastHostAt = 0, hostLostAt = 0;
  // Cartas de nivel: número de la ronda (anfitrión), la última que te ha llegado
  // y la última que has elegido (invitado). Y el último "quién elige" aplicado.
  let levelSeq = 0, levelNow = 1, seenSeq = 0, doneSeq = 0, lastHo = '';
  const STALL_MS = 2500;
  let members = [];
  let spendPending = 0, hostCandy = 0;
  let wipeLeft = null;

  // ---------------- escalado de dificultad ----------------
  // mode 'auto': la fórmula usa a los que estáis. 'count': usa un número fijo
  // del 1 al 10. 'custom': los tres valores se ponen a mano y no se mueven.

  let runRules = null;

  function clampCap(n) {
    n = Math.round(+n);
    if (!isFinite(n)) return 4;
    return Math.min(ABS_MAX, Math.max(1, n));
  }
  function clampMul(v, min, max, fallback) {
    v = Math.round(+v * 100) / 100;
    if (!isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  }
  function normalizeRules(r) {
    r = r || {};
    const mode = r.mode === 'count' || r.mode === 'custom' ? r.mode : 'auto';
    let cap = clampCap(r.cap == null ? 4 : r.cap);
    const runMode = r.runMode === 'shiny' || r.runMode === 'boss' || r.runMode === 'castle' || r.runMode === 'siege' ? r.runMode : 'normal';
    const diff = r.diff === 'hard' || r.diff === 'challenge' || r.diff === 'nightmare' ? r.diff : 'normal';
    // Asedio es una plantilla oficial 1 contra 1. No hereda el límite
    // configurable de las salas cooperativas.
    if (runMode === 'siege') cap = 2;
    const n = clampCap(r.n == null ? 4 : r.n);
    const bossRaw = Math.round(+r.bossN);
    return {
      cap, mode, n,
      rate: clampMul(r.rate, 0.25, 12, autoRate(4)),
      hp: clampMul(r.hp, 0.25, 8, autoHp(4)),
      xp: clampMul(r.xp, 0.25, 12, autoXp(4)),
      bossN: Math.min(10, Math.max(0, isFinite(bossRaw) ? bossRaw : 5)),
      runMode, diff
    };
  }
  function rulesFromSettings() {
    return normalizeRules({
      cap: G.Settings.get('partyCap'),
      mode: G.Settings.get('diffMode'),
      n: G.Settings.get('diffN'),
      rate: G.Settings.get('diffRate'),
      hp: G.Settings.get('diffHp'),
      xp: G.Settings.get('diffXp'),
      bossN: G.Settings.get('bossN'),
      runMode: G.Settings.get('runMode'),
      diff: G.Settings.get('soloDiff')
    });
  }
  function publicRules(r) {
    const n = normalizeRules(r);
    return { cap: n.cap, mode: n.mode, n: n.n, rate: n.rate, hp: n.hp, xp: n.xp, bossN: n.bossN, runMode: n.runMode, diff: n.diff };
  }
  /** Fija la dificultad de esta partida. Sin rules y useSettings, la de este aparato. */
  function lockRun(rules, useSettings) {
    runRules = normalizeRules(rules || (useSettings ? rulesFromSettings() : { mode: 'auto', cap: 4 }));
  }
  function unlockRun() { runRules = null; }
  function activeRules() { return runRules || rulesFromSettings(); }
  function nOf(actual, rules) {
    if (rules.mode === 'count') return rules.n;
    const n = Math.round(+actual);
    return clampCap(isFinite(n) && n > 0 ? n : 1);
  }
  function scaleRate(actual) {
    const rules = activeRules();
    if (rules.mode === 'custom') return rules.rate;
    return autoRate(nOf(actual, rules));
  }
  function scaleHp(actual) {
    const rules = activeRules();
    if (rules.mode === 'custom') return rules.hp;
    return autoHp(nOf(actual, rules));
  }
  function xpDivisor(actual) {
    const rules = activeRules();
    if (rules.mode === 'custom') return rules.xp;
    return autoXp(nOf(actual, rules));
  }
  /** Lo que se ve en la sala: los tres números ya resueltos. */
  function preview(actual, rules) {
    rules = normalizeRules(rules || activeRules());
    const n = rules.mode === 'custom' ? nOf(actual, { mode: 'auto' }) : nOf(actual, rules);
    return {
      n,
      rate: rules.mode === 'custom' ? rules.rate : autoRate(rules.mode === 'count' ? rules.n : n),
      hp: rules.mode === 'custom' ? rules.hp : autoHp(rules.mode === 'count' ? rules.n : n),
      xp: rules.mode === 'custom' ? rules.xp : autoXp(rules.mode === 'count' ? rules.n : n)
    };
  }
  function fmtMul(v) {
    const n = Math.round(v * 100) / 100;
    return String(n);
  }

  // ---------------- arranque / fin ----------------

  /**
   * @param cfg   { seed, host, members }
   * @param pl    tu Player (ya creado)
   * @param cb    { levelStart(lv), resume(), waiting(names), over(data), lost(msg), team(t), shiny(dex) }
   */
  function begin(cfg, pl, cb) {
    lockRun(cfg && cfg.rules, false);
    active = true;
    me = G.Net.uid; hostUid = cfg.host;
    host = me === hostUid;
    local = pl;
    api = cb;
    members = cfg.members;
    mates.clear();
    outEv = []; flushT = 0; waiting = new Set(); holds = new Set();
    spendPending = 0; hostCandy = 0;
    hostAway = false; stalled = false; lastHostAt = performance.now(); hostLostAt = 0;
    if (G.CombatAuthority) G.CombatAuthority.reset();
    levelSeq = 0; levelNow = 1; seenSeq = 0; doneSeq = 0; lastHo = '';
    cfg.members.forEach((m, i) => {
      const x = (i - (cfg.members.length - 1) / 2) * 34, y = 0;
      if (m.uid === me) { pl.x = x; pl.y = y; pl.uid = me; pl.coopHost = host; pl.tagColor = COLORS[i]; return; }
      const mon = G.DEX_BY[m.dex] || G.DEX_BY[25];
      const p = new G.Player(mon, {}, !!m.shiny);
      p.remote = true; p.uid = m.uid; p.tag = m.name; p.tagColor = COLORS[i]; p.revLabel = 'Quédate a su lado';
      p.masteryRank = G.MasteryFX ? G.MasteryFX.valid(m.mr) : '';
      if (G.MasteryFX) { G.MasteryFX.init(p); G.MasteryFX.onSpawn(p); }
      p.x = x; p.y = y;
      p.net = { x, y, ang: Math.PI / 2, walk: 0, hp: p.maxHp, maxHp: p.maxHp, dead: 0, mv: G.baseStartOf(mon.dex), ml: 1, mag: 78, aim: Math.PI / 2, rev: 0 };
      G.Sprites.preload([mon.dex], 8000, p.shiny);
      mates.set(m.uid, { uid: m.uid, name: m.name, color: COLORS[i], pl: p, connected: true, q: [], flushT: 0, xpMul: 1, candy: 0 });
    });
  }

  function end() {
    active = false; host = false; local = null;
    mates.clear(); outEv = []; waiting = new Set(); holds = new Set();
    spendPending = 0; hostCandy = 0; hostLostAt = 0;
    if (G.CombatAuthority) G.CombatAuthority.reset();
  }
  function leave() {
    if (!active) return;
    if (host) {
      // Si se va el anfitrión, la partida termina para todos.
      emit(['ov', Object.assign(api.summary ? api.summary() : {}, { why: 'host' })]);
      flushAll();
    } else {
      outEv.push(['bye']);
      flushClient(true);
    }
    end();
  }

  // ---------------- lista de jugadores ----------------

  function players() {
    const out = [local];
    for (const m of mates.values()) if (m.connected) out.push(m.pl);
    return out;
  }
  function puppets() { const out = []; for (const m of mates.values()) if (m.connected) out.push(m.pl); return out; }

  /**
   * Multiplicador de la experiencia del equipo: la media de los bonus de
   * cada uno, y repartida entre los que sois (en grupo cae mucho más, y si no
   * se subiría de nivel el triple de rápido que en solitario).
   */
  function xpFactor() {
    let s = local.xpMul, n = 1;
    for (const m of mates.values()) if (m.connected) { s += m.xpMul || 1; n++; }
    return (s / n) / local.xpMul / xpDivisor(n);
  }

  // ---------------- estado de un jugador ----------------

  const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;

  function myState() {
    // Con un vínculo se manda la órbita si la hay (es lo único que los demás no ven por los 'c').
    const g = local.activeGroup();
    const m = g.find(x => x.kind === 'orbit') || g[0];
    return [r1(local.x), r1(local.y), r2(local.moveAngle), local.walking ? 1 : 0, r1(local.hp), r1(local.maxHp),
            local.dead ? 1 : 0, m ? m.id : '', m ? m.lvl : 1, r1(local.magnet), r2(local.aim), r2(local.xpMul),
            r2(local.reviveT || 0), api.choosing && api.choosing() ? 1 : 0, doneSeq, api.watching ? api.watching() : '',
            r1(local.level || 1),
            local.enabledMoves().filter(x => x.kind !== 'orbit' || (G.Siege && G.Siege.up)).map(x => x.id + ':' + (x.lvl || 1)).join(',').slice(0, 180),
            G.Items && G.Items.reviveCode ? G.Items.reviveCode(local) : 0];
  }

  /** Número que llega por la red: si no es un número de verdad vale `def`, y si se pasa se queda en el tope. */
  const num = (v, def, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;

  // Lo que manda otro jugador no se cree a ciegas: un xpMul de 1e309 colgaba al anfitrión al subir de nivel.
  function readState(a) {
    if (!Array.isArray(a)) a = [];
    return { x: num(a[0], 0, -1e6, 1e6), y: num(a[1], 0, -1e6, 1e6), ang: num(a[2], 0, -10, 10), walk: a[3] ? 1 : 0,
             hp: num(a[4], 0, 0, 1e6), maxHp: num(a[5], 1, 1, 1e6), dead: a[6] ? 1 : 0,
             mv: typeof a[7] === 'string' ? a[7].slice(0, 40) : '', ml: num(a[8], 1, 1, 99),
             mag: num(a[9], 0, 0, 5000), aim: num(a[10], 0, -10, 10), xpMul: num(a[11], 1, 0.1, 20),
             rev: num(a[12], 0, 0, 60), ch: a[13] === undefined ? undefined : a[13] ? 1 : 0, ld: num(a[14], 0, 0, 1e9),
             wa: typeof a[15] === 'string' ? a[15].slice(0, 64) : '', lv: num(a[16], 1, 1, 9999),
             skills: typeof a[17] === 'string' ? a[17].slice(0, 180) : '', rk: num(a[18], 0, 0, 26) };
  }

  /** Anfitrión: dónde mira un invitado (él mismo, o el compañero vivo que mira estando caído). */
  function viewOf(m) {
    const w = m.pl.dead && m.pl.net && m.pl.net.wa;
    if (!w) return m.pl;
    if (w === me) return local.dead ? m.pl : local;
    const o = mates.get(w);
    return o && o.connected && !o.pl.dead ? o.pl : m.pl;
  }

  // ---------------- envío ----------------

  /** Anfitrión: evento para todos los invitados (menos `except`). */
  function emit(ev, except) {
    if (!host) return;
    for (const m of mates.values()) if (m.connected && m.linked !== false && m.uid !== except) m.q.push(ev);
  }

  /** Anfitrión: evento sólo para los que están cerca (números de daño). */
  function emitNear(ev, x, y, except) {
    for (const m of mates.values()) {
      if (!m.connected || m.uid === except) continue;
      const v = viewOf(m);
      if (G.U.dist2(v.x, v.y, x, y) > 700 * 700) continue;
      if (m.q.length > 400) continue;
      m.q.push(ev);
    }
  }

  function enemyList(near) {
    const out = [];
    const r2n = NEAR * NEAR;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || G.U.dist2(e.x, e.y, near.x, near.y) > r2n) continue;
      const a = ANIMS.indexOf(e.anim.cur);
      out.push([e.id, r1(e.x), r1(e.y), Math.ceil(e.hp), a < 0 ? 0 : a, e.anim.dir,
                (e.burn > 0 ? 1 : 0) | (e.poison > 0 ? 2 : 0) | (e.shield > 0 ? 4 : 0) | (e.slow > 0 ? 8 : 0) | (e.sleepT > 0 ? 16 : 0)]);
    }
    return out;
  }

  function hostFrame(m) {
    const st = api.team();
    const p = { [me]: myState() };
    for (const o of mates.values()) {
      if (o.connected && o.uid !== m.uid && o.state) p[o.uid] = o.state;
    }
    const ev = m.q; m.q = [];
    const f = { k: 'f', t: r2(st.time), lv: st.level, xp: r2(st.xp), xn: st.xpNext, ki: st.kills, bo: st.bosses, co: st.coins, cy: m.candy || 0, tk: [st.t1, st.t10],
                p, e: enemyList(viewOf(m)), ev };
    const ja = G.Judgment.netState();       // Arceus en la Sentencia
    if (ja) f.ja = ja;
    if (G.Castle && G.Castle.up) f.ch = G.Castle.snapshot();
    if (wipeLeft != null) f.wd = r2(wipeLeft);
    if (G.Siege && G.Siege.up) f.sg = G.Siege.snapshot();
    // Siempre: quién está eligiendo y, si hay cartas de nivel, cuáles (ver arriba).
    f.ho = holdNames();
    if (waiting.size) f.lu = [levelSeq, levelNow];
    return f;
  }

  function flushAll() { for (const m of mates.values()) if (m.connected && m.linked !== false) G.Net.send(m.uid, hostFrame(m)); }

  function flushClient(force) {
    if (!force && !outEv.length && flushT > 0) return;
    G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
    outEv = [];
  }

  /** Cada fotograma (también en la pantalla de subida de nivel). */
  function tick(dt) {
    if (!active) return;
    if (host !== (me === hostUid)) host = me === hostUid;
    const now = performance.now();
    if (host) {
      for (const m of mates.values()) {
        if (m.goneAt && G.CombatAuthority && G.CombatAuthority.due(m.goneAt, now)) mateGone(m.uid);
      }
      for (const m of mates.values()) {
        if (!m.connected || m.linked === false) continue;
        m.flushT -= dt;
        if (m.flushT > 0) continue;
        m.flushT = rateFor(m.uid);
        G.Net.send(m.uid, hostFrame(m));
      }
    } else {
      if (hostLostAt && G.CombatAuthority && G.CombatAuthority.due(hostLostAt, now)) {
        const cb = api && api.lost;
        end();
        if (cb) cb('Se ha perdido la conexión con el anfitrión.');
        return;
      }
      if (!stalled && now - lastHostAt > STALL_MS) { stalled = true; updateAway(); }
      flushT -= dt;
      if (flushT <= 0) {
        flushT = rateFor(hostUid);
        G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
        outEv = [];
      }
    }
  }

  // ---------------- recepción ----------------

  G.Net.on((from, msg) => {
    if (!msg) return;
    if (msg.k === 'start') { if (G.Flow.startCoop) G.Flow.startCoop(msg); return; }
    if (!active || msg.k !== 'f') return;
    if (host) onClientFrame(from, msg); else if (from === hostUid) onHostFrame(msg);
  });

  G.Net.onPeer((u, mode) => {
    if (!active) return;
    const down = mode === 'closed' || mode === 'failed';
    if (host) {
      const m = mates.get(u);
      if (!m || !m.connected) return;
      if (down) {
        if (!m.goneAt) m.goneAt = performance.now();
        m.linked = false;
      } else {
        m.goneAt = 0;
        m.linked = true;
      }
      return;
    }
    if (u !== hostUid) return;
    if (down) { if (!hostLostAt) hostLostAt = performance.now(); }
    else hostLostAt = 0;
  });

  function mateGone(u) {
    const m = mates.get(u);
    if (!m || !m.connected) return;
    m.connected = false;
    if (G.MasteryFX) G.MasteryFX.clear(m.pl);
    G.Projectiles.clearOrbs(m.pl);
    G.Spawner.say(m.name + ' ha dejado la partida', 2.6);
    if (waiting.has(u)) picked(u);
    if (holds.has(u)) holdOff(u);
    if (api.mateLeft) api.mateLeft(m);
  }

  // --- en el anfitrión ---

  function onClientFrame(from, msg) {
    const m = mates.get(from);
    if (!m || !m.connected) return;
    if (msg.p) { m.state = msg.p; m.pl.net = readState(msg.p); m.xpMul = m.pl.net.xpMul || 1; reconcile(from, m.pl.net); }
    for (const ev of msg.ev || []) {
      switch (ev[0]) {
        case 'h': {
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead || e.remote) break;
          hitFrom = from;
          if (G.Enemy.setStriker) G.Enemy.setStriker(from);
          e.hurt(ev[2], ev[3], ev[4], ev[5], ev[6]);
          if (G.Enemy.setStriker) G.Enemy.setStriker(null);
          hitFrom = null;
          break;
        }
        case 's': {
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead) break;
          if (ev[2] === 'b') e.applyBurn(ev[3]);
          else if (ev[2] === 'p') e.applyPoison(ev[3]);
          else if (ev[2] === 's') e.applySlow(ev[3]);
          else if (ev[2] === 't') e.applyStun(ev[3]);
          break;
        }
        case 'c':
          G.Combat.ghostCast(m.pl, ev[1], ev[2], ev[3], ev[4]);
          emit(['c', from, ev[1], ev[2], ev[3], ev[4]], from);
          break;
        case 'sk':
          applySkill(from, ev);
          break;
        case 'pb':
          G.World.breakAt(ev[1], ev[2]);
          emit(['pb', ev[1], ev[2]], from);
          break;
        case 'lp': picked(from); break;
        case 'hs': holdOn(from, ev[1]); break;
        case 'he': holdOff(from); break;
        case 'ou': {
          const x = +ev[2] || 0, y = +ev[3] || 0, z = +ev[4] || 1;
          if (typeof ev[1] === 'string' && G.Orbs && G.Orbs.onMateUse(m.pl, ev[1], x, y, z)) emit(['ob', ev[1], x, y, z], from);
          break;
        }
        case 're': G.Rift.enterRequest(); break;
        case 'bye': mateGone(from); break;
        case 'ft':
          if (G.CombatAuthority && !G.CombatAuthority.claimPickup(ev[1])) break;
          if (G.Pickups.removeId(ev[1])) pickupGone(ev[1]);
          break;
        case 'csp': {
          const n = Math.floor(+ev[1] || 0);
          if (n > 0 && (m.candy || 0) >= n) m.candy -= n;
          else if (n < 0) m.candy = Math.max(0, (m.candy || 0) - n);
          break;
        }
        case 'cu':
          if (m && m.pl) G.Spawner.eliteWave(m.pl);
          break;
        case 'ru': resolveRevive(from, ev[1]); break;
        case 'rg': markGiveUp(from); break;
        case 'rno': {
          const who = mates.get(from);
          if (who && who.pl) who.pl._reviveLock = false;
          break;
        }
        case 'sg':
          if (G.Siege && G.Siege.up) G.Siege.applyHit(ev[1], ev[2], ev[3] || from);
          break;
        case 'ph':
          if (ev[3] && ev[3] === ev[1]) break;
          if (ev[1] === me) {
            if (local && !local.dead) {
              local._hitBy = ev[3] || from;
              local.hurt(Math.max(1, Math.min(160, +ev[2] || 1)));
            }
          } else emit(['ph', ev[1], ev[2], ev[3] || from], from);
          break;
        case 'pk':
          if (G.Siege && G.Siege.up) G.Siege.payDeath(ev[2] || from, ev[1]);
          break;
        case 'pd':
          if (G.Siege && G.Siege.up) G.Siege.payDeath(ev[1], ev[2] || '');
          break;
      }
    }
  }

  /** Anfitrión: lo que dice cada envío del invitado manda sobre avisos que se hayan perdido. */
  function reconcile(from, n) {
    if (n.ch === undefined) return;                        // versión vieja del juego
    if (n.ch && !holds.has(from)) holdOn(from);
    else if (!n.ch && holds.has(from)) holdOff(from);
    if (waiting.has(from) && n.ld >= levelSeq) picked(from);
  }

  // --- en el invitado ---

  /** Invitado: se para (o sigue) según si el anfitrión está. */
  function updateAway() { if (api.away) api.away(hostAway || stalled ? nameOf(hostUid) : null); }

  // Anfitrión: al irse de la pestaña avisa a todos al momento (después ya no
  // podrá mandar nada) y al volver, que sigue.
  document.addEventListener('visibilitychange', () => {
    if (!active || !host) return;
    emit(['ha', document.hidden ? 1 : 0]);
    flushAll();
  });

  function onHostFrame(msg) {
    lastHostAt = performance.now();
    if (stalled) { stalled = false; updateAway(); }
    for (const ev of msg.ev || []) applyHostEvent(ev);
    if (msg.ja) G.Judgment.netApply(msg.ja);
    if (msg.ch && G.Castle && G.Castle.up) G.Castle.net(msg.ch);
    if (typeof msg.wd === 'number') { if (api.downLeft) api.downLeft(msg.wd); }
    else if (api.downLeft) api.downLeft(null);
    if (msg.sg && G.Siege && G.Siege.up) G.Siege.net(msg.sg);
    // Quién elige y las cartas de nivel, aunque se haya perdido algún aviso.
    if (msg.ho && !(G.Siege && G.Siege.up)) {
      const k = msg.ho.join('|');
      if (k !== lastHo) { lastHo = k; api.hold && api.hold(msg.ho); }
      // Hay cartas abiertas que aún no has elegido y no las tienes delante (eran
      // nuevas, o algo te las cerró al elegir muy deprisa): se abren otra vez.
      // Antes sólo se miraba si eran nuevas y te podías quedar fuera de la ronda
      // con los demás esperándote.
      const showing = api.inLevelUp && api.inLevelUp();
      if (msg.lu && msg.lu[0] > doneSeq && (msg.lu[0] > seenSeq || !showing)) { seenSeq = msg.lu[0]; api.levelStart(msg.lu[1]); }
      else if (!msg.lu && showing) api.resume();
    }
    api.syncTeam({ time: msg.t, level: msg.lv, xp: msg.xp, xpNext: msg.xn, kills: msg.ki, bosses: msg.bo, coins: msg.co,
                   t1: (msg.tk || [])[0], t10: (msg.tk || [])[1] });
    if (typeof msg.cy === 'number') applyHostCandy(msg.cy);
    for (const u in msg.p || {}) {
      const m = mates.get(u);
      if (m) m.pl.net = readState(msg.p[u]);
    }
    const now = performance.now();
    for (const a of msg.e || []) {
      const e = G.EnemyMgr.get(a[0]);
      if (!e || !e.remote || e.dead) continue;
      const n = e.net;
      const dts = (now - (n.last || now)) / 1000;
      if (dts > 0.02 && dts < 1) {
        n.vx = G.U.clamp((a[1] - n.x) / dts, -600, 600);
        n.vy = G.U.clamp((a[2] - n.y) / dts, -600, 600);
      } else { n.vx = 0; n.vy = 0; }
      n.x = a[1]; n.y = a[2]; n.age = 0; n.last = now;
      e.hp = Math.min(e.maxHp, a[3]);
      n.anim = a[4]; n.dir = a[5]; n.st = a[6];
    }
  }

  function applyHostEvent(ev) {
    switch (ev[0]) {
      case 'ne':
        G.EnemyMgr.addRemote({ id: ev[1], dex: ev[2], x: ev[3], y: ev[4], boss: !!ev[5], shiny: !!ev[6], hp: ev[7], dmg: ev[8], beh: ev[9], owner: ev[10], ring: ev[11], siegeBoss: !!ev[12], finalCastleBoss: !!ev[13] });
        break;
      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;
      case 'eg': G.EnemyMgr.removeRemote(ev[1], false); break;
      case 'hn': { const e = G.EnemyMgr.get(ev[1]); if (e && !e.dead) e.showHurt(ev[2], ev[3]); break; }
      case 'es':
        G.Projectiles.spawn({ x: ev[1], y: ev[2], vx: ev[3], vy: ev[4], dmg: ev[5], r: ev[6], life: ev[7],
                              friendly: false, color: '#ff7a9e', vis: G.VFX.forType(ev[8]), mtype: ev[8], cat: ev[9], side: ev[10] || '' });
        break;
      case 'c': { const m = mates.get(ev[1]); if (m) G.Combat.ghostCast(m.pl, ev[2], ev[3], ev[4], ev[5]); break; }
      case 'sk': break;
      case 'ok':
        if (ev[2] === me) { if (G.CombatAuthority) G.CombatAuthority.acceptLocal(ev[1]); }
        else {
          const mate = mates.get(ev[2]);
          if (mate && G.Combat) {
            const point = ev[9] !== '' && ev[9] != null && ev[10] !== '' && ev[10] != null ? { x: +ev[9], y: +ev[10] } : null;
            G.Combat.ghostCast(mate.pl, ev[3], 1, Math.atan2(+ev[6] || 0, +ev[5] || 1), 0, point);
          }
        }
        break;
      case 'no':
        if (ev[2] === me && G.CombatAuthority) G.CombatAuthority.rejectLocal(ev[1]);
        break;
      case 'item': api.item(ev[1]); break;
      case 'ball': if (api.ball) api.ball(ev[1]); break;
      case 'egg': if (api.egg) api.egg(ev[1]); break;
      case 'orb': if (typeof ev[1] === 'string' && api.orb) api.orb(ev[1]); break;
      case 'ob': if (typeof ev[1] === 'string' && G.Orbs) G.Orbs.nearBuff(ev[1], +ev[2] || 0, +ev[3] || 0); break;
      case 'coin': if (api.coin) api.coin(ev[1]); break;
      case 'candy': if (api.candy) api.candy(ev[1]); break;
      case 'pv': if (G.Pickups.setValue) G.Pickups.setValue(ev[1], ev[2]); break;
      case 'pk': G.Pickups.addRemote(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
      case 'pc': G.Pickups.removeId(ev[1]); break;
      case 'mag': G.Pickups.pullAll(); G.FX.ring(local.x, local.y, 10, 420, '#ff9ed8', 0.6, 4); break;
      case 'bomb':
        G.FX.ring(ev[1], ev[2], 20, G.Camera.outerRadius(), '#ff7b3d', 0.5, 6);
        if (G.U.dist2(ev[1], ev[2], local.x, local.y) < 500 * 500) G.Camera.kick(0.8);
        G.Audio.sfx('break');
        break;
      case 'pb': G.World.breakAt(ev[1], ev[2]); break;
      case 'say': G.Spawner.say(ev[1], ev[2]); break;
      case 'heal': if (!local.dead) { local.heal(local.maxHp * ev[1]); G.FX.ring(local.x, local.y, 6, 60, '#5fe08a', 0.4, 3); } break;
      case 'lu': if (!(G.Siege && G.Siege.up) && (!ev[2] || ev[2] > seenSeq)) { seenSeq = ev[2] || seenSeq; api.levelStart(ev[1]); } break;
      case 'lw': api.waiting(ev[1]); break;
      case 'lr': api.resume(); break;
      case 'hp': lastHo = (ev[1] || []).join('|'); api.hold && api.hold(ev[1], ev[2] || ''); break;
      case 'ha': hostAway = !!ev[1]; updateAway(); break;
      case 'sh': api.shiny(ev[1]); break;
      case 'ov': { const cb = api.over; const d = ev[1]; end(); cb(d); break; }
      case 'rok':
        if (ev[1] === me && local) {
          const ok = local.dead && G.Items && G.Items.useRevive(local, ev[2]);
          if (!ok) {
            local.revivePick = '';
            local.reviveAsk = '';
            if (!host) { outEv.push(['rno']); flushClient(true); }
          }
        }
        break;
      case 'rno':
        if (ev[1] === me && local && local.dead) { local.revivePick = ''; local.reviveAsk = ''; }
        break;
      case 'rg': {
        const who = ev[1] === me ? local : ((mates.get(ev[1]) || {}).pl);
        if (who) who.reviveGiveUp = true;
        break;
      }
      case 'ph':
        if (ev[3] && ev[3] === ev[1]) break;
        if (ev[1] === me && local && !local.dead) {
          local._hitBy = ev[3] || '';
          local.hurt(Math.max(1, Math.min(160, +ev[2] || 1)));
        }
        break;
      case 'rw':
        if (ev[1] === me && local) {
          if (ev[2] && G.Game.noteXp) G.Game.noteXp(local.gainXp(ev[2]));
          if (ev[3]) local.coins += ev[3];
        }
        break;
      case 'it':
        if (ev[1] === me && api.item) api.item(ev[2]);
        break;
      case 'cb':
        if (G.Castle && G.Castle.giveBond) G.Castle.giveBond();
        break;
      case 'so':
        if (G.Siege && G.Siege.knockOut) G.Siege.knockOut(ev[1]);
        break;
      case 'rift': case 'riftx': case 'arena': case 'aw': case 'al': G.Rift.onEvent(ev); break;
      case 'jd': case 'jk': case 'jb': G.Judgment.onEvent(ev); break;
      case 'wx': G.Weather.onEvent(ev); break;
      case 'ev': G.Events.onNet(ev); break;
      case 'hz': G.Hazards.add(ev[1], true); break;
      case 'fxr':
        if (typeof ev[4] === 'string') G.FX.ring(num(ev[1], 0, -1e6, 1e6), num(ev[2], 0, -1e6, 1e6), 8, num(ev[3], 8, 0, 2000), ev[4], 0.5, 3);
        break;
    }
  }

  // ---------------- ganchos que llaman los módulos del juego ----------------

  /** Tu ataque: los demás lo repiten como fantasma. */
  function cast(pl, m) {
    if (!active || pl !== local) return;
    if (host) emit(['c', me, m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0]);
    else outEv.push(['c', m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0]);
  }

  // invitado
  function hit(e, d, color, dx, dy, knock) { outEv.push(['h', e.id, d, color, r1(dx), r1(dy), knock || 0]); }
  function status(e, kind, val) { outEv.push(['s', e.id, kind, val]); }

  // anfitrión
  function hurtShown(e, d, color) { emitNear(['hn', e.id, d, color], e.x, e.y, hitFrom); }
  function enemyAdded(e) {
    emit(['ne', e.id, e.dex, r1(e.x), r1(e.y), e.boss ? 1 : 0, e.shiny ? 1 : 0, Math.ceil(e.maxHp), r2(e.dmg), e.behavior || '', e.owner || '', e.ring || '', e.siegeBoss ? 1 : 0, e.finalCastleBoss ? 1 : 0]);
  }
  function enemyGone(e, died) { emit([died ? 'ed' : 'eg', e.id]); }
  function enemyShot(p, type) { emit(['es', r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), r2(p.dmg), p.r, p.life, type, p.cat, p.side || '']); }
  function pickupAdded(o) { emit(['pk', o.id, o.kind, r1(o.x), r1(o.y), o.value]); }
  function pickupGone(id) { emit(['pc', id]); }
  function say(text, secs) { emit(['say', text, secs]); }

  function propBroken(p) {
    if (host) emit(['pb', p.tx, p.ty]);
    else outEv.push(['pb', p.tx, p.ty]);
  }

  /** Anfitrión: alguien ha cogido un objeto. Devuelve true si es para ti. */
  function collected(p, who) {
    if (G.CombatAuthority && p && p.id && !G.CombatAuthority.claimPickup(p.id)) return;
    emit(['pc', p.id]);
    if (p.kind === 'magnet') emit(['mag']);
    if (p.kind === 'bomb') emit(['bomb', r1(who.x), r1(who.y)]);
    if (who !== local) {
      const m = mates.get(who.uid);
      if (m && p.kind === 'heal') m.q.push(['heal', p.value > 0 ? p.value : 0.25]);
      else if (m && p.kind === 'item') m.q.push(['item', p.value]);
      else if (m && p.kind === 'ball') m.q.push(['ball', p.value]);
      else if (m && p.kind === 'egg') m.q.push(['egg', p.value]);
      else if (m && p.kind === 'coin') m.q.push(['coin', p.value]);
      else if (m && p.kind === 'candy') {
        m.candy = (m.candy || 0) + Math.max(0, p.value | 0);
        m.q.push(['candy', p.value | 0]);
      }
      else if (m && p.kind === 'sphere') m.q.push(['orb', p.value]);
    }
  }

  function shinyCaught(e) { emit(['sh', e.dex]); }

  function orbUsed(id, x, y, z) {
    if (!active || !G.Orbs) return;
    if (host) emit(['ob', id, r1(x), r1(y), Math.round(z * 100) / 100]);
    else outEv.push(['ou', id, r1(x), r1(y), Math.round(z * 100) / 100]);
  }

  // ---------------- subida de nivel compartida ----------------

  function levelStart(level) {
    waiting = new Set([me]);
    for (const m of mates.values()) if (m.connected) waiting.add(m.uid);
    levelSeq++; levelNow = level;
    emit(['lu', level, levelSeq]);
    flushAll();
    api.levelStart(level);
    sendWaiting();
  }

  function nameOf(u) { return u === me ? (G.Social.me ? G.Social.me.name : 'Tú') : (mates.get(u) || {}).name || '?'; }

  function sendWaiting() {
    const names = [...waiting].map(nameOf);
    emit(['lw', names]);
    api.waiting(names);
  }

  /** Alguien ha elegido carta (anfitrión). */
  function picked(u) {
    if (!waiting.delete(u)) return;
    if (waiting.size) { sendWaiting(); return; }
    emit(['lr']);
    flushAll();
    api.resume();
  }

  // ---------------- fusiones: pausa para todos ----------------
  // Mientras alguien elige qué movimientos fusiona (vínculo de un legendario),
  // la partida se para para todos, como con las cartas de nivel.

  function holdNames() { return [...holds].map(nameOf); }

  /** Anfitrión: `u` empieza a elegir. */
  function holdOn(u, why) {
    holds.add(u);
    emit(['hp', holdNames(), why || '']); flushAll();
    api.hold && api.hold(holdNames(), why || '');
  }

  /** Anfitrión: `u` ha terminado (o se ha ido). */
  function holdOff(u) {
    if (!holds.delete(u)) return;
    emit(['hp', holdNames()]); flushAll();
    api.hold && api.hold(holdNames());
  }

  /** Tú empiezas / terminas de elegir fusión. */
  function holdStart(why) { if (host) holdOn(me, why); else { outEv.push(['hs', why || '']); flushClient(true); } }
  function holdEnd() { if (host) holdOff(me); else { outEv.push(['he']); flushClient(true); } }

  /** Has elegido tu carta. */
  function localPicked() {
    if (host) picked(me);
    else { doneSeq = seenSeq; outEv.push(['lp']); flushClient(true); }
  }

  /** Anfitrión: se acabó para todos. */
  function over(data) {
    emit(['ov', data]);
    flushAll();
    end();
  }

  function noteCandySpend(n) {
    if (!active || host) return;
    n = Math.floor(+n || 0);
    if (!n) return;
    spendPending += n;
    outEv.push(['csp', n]);
    flushClient(true);
  }
  function applyHostCandy(v) {
    v = Math.max(0, Math.floor(+v || 0));
    if (v < hostCandy) spendPending = Math.max(0, spendPending - (hostCandy - v));
    hostCandy = v;
    if (local) local.runCandy = Math.max(0, v - spendPending);
  }
  function grantCandy(uid, amount) {
    amount = Math.max(0, Math.floor(+amount || 0));
    if (!amount || !active || !host) return;
    if (uid === me && local) { G.Game.addCandy(local, amount); return; }
    const m = mates.get(uid);
    if (!m) return;
    m.candy = (m.candy || 0) + amount;
    m.q.push(['candy', amount]);
  }
  function noteSkill(req) {
    if (!active || !req || host) return;
    const pack = ['sk', req.castId, req.skillId, r1(req.origin.x), r1(req.origin.y),
      r2(req.direction.x), r2(req.direction.y), r1(req.targetPoint.x), r1(req.targetPoint.y),
      req.sequence | 0, req.level | 0, req.inputType === 'hold' ? 'hold' : 'quick'];
    outEv.push(pack);
  }
  function confirmSkill(c) {
    if (!active || !host || !c) return;
    emit(['ok', c.castId, c.playerId, c.skillId, r1(c.serverOrigin.x), r1(c.serverOrigin.y), r2(c.direction.x), r2(c.direction.y), r2(c.hostTime || 0),
      c.point ? r1(c.point.x) : '', c.point ? r1(c.point.y) : '']);
  }
  function rejectSkill(castId, playerId) {
    if (!active || !host) return;
    emit(['no', castId, playerId]);
  }
  function applySkill(from, ev) {
    if (!host || !G.CombatAuthority || !G.Combat) return;
    const mate = mates.get(from);
    if (!mate || !mate.pl) { rejectSkill(ev[1], from); return; }
    const req = {
      type: 'skill_cast_request', castId: String(ev[1] || ''), playerId: from, skillId: String(ev[2] || ''),
      origin: { x: +ev[3] || 0, y: +ev[4] || 0 }, direction: { x: +ev[5] || 0, y: +ev[6] || 0 },
      targetPoint: { x: +ev[7] || 0, y: +ev[8] || 0 }, sequence: ev[9] | 0, level: ev[10] | 0,
      inputType: ev[11] === 'hold' ? 'hold' : 'quick'
    };
    const verdict = G.CombatAuthority.validate(req, mate.pl);
    if (!verdict.ok) { rejectSkill(req.castId, from); return; }
    const pl = mate.pl;
    const m = G.Moves.instance(verdict.skillId, verdict.level);
    pl.aim = Math.atan2(verdict.dir.y, verdict.dir.x);
    pl._castId = req.castId;
    const ok = G.Combat.castNow(pl, m, verdict.point, { asAuthority: true, silent: true });
    pl._castId = '';
    if (!ok) { G.CombatAuthority.undo(req); rejectSkill(req.castId, from); return; }
    confirmSkill(verdict.confirm);
  }
  function setWipe(v) { wipeLeft = v == null ? null : Math.max(0, v); }
  function askRevive(kind) {
    if (!active || (G.Modes && G.Modes.is('siege'))) return;
    if (host) resolveRevive(me, kind);
    else { outEv.push(['ru', kind]); flushClient(true); }
  }
  function giveUpRevive() {
    if (!active) return;
    if (local) local.reviveGiveUp = true;
    if (host) markGiveUp(me);
    else { outEv.push(['rg']); flushClient(true); }
  }
  function markGiveUp(uid) {
    const p = uid === me ? local : ((mates.get(uid) || {}).pl);
    if (p) p.reviveGiveUp = true;
    emit(['rg', uid], uid);
  }
  function resolveRevive(uid, kind) {
    if (!host || !active || (G.Modes && G.Modes.is('siege'))) return;
    if (kind !== 'revive' && kind !== 'maxrevive' && kind !== 'revival') return;
    const p = uid === me ? local : ((mates.get(uid) || {}).pl);
    if (!p || !p.dead || p._reviveLock) return;
    const code = uid === me ? (G.Items && G.Items.reviveCode(local)) : ((p.net && p.net.rk) || 0);
    if (!G.Items || !G.Items.kitHas(code, kind)) { emit(['rno', uid]); return; }
    p._reviveLock = true;
    if (uid === me) {
      if (!G.Items.useRevive(local, kind)) {
        p._reviveLock = false;
        local.revivePick = '';
        local.reviveAsk = '';
        return;
      }
    }
    emit(['rok', uid, kind]);
  }
  function pickupValue(o) {
    if (active && host && o) emit(['pv', o.id, o.value | 0]);
  }

  return {
    ANIMS, COLORS, ABS_MAX, begin, end, leave, tick, players, puppets, xpFactor, scaleRate, scaleHp,
    clampCap, normalizeRules, rulesFromSettings, publicRules, lockRun, unlockRun, activeRules, preview, fmtMul, autoRate, autoHp, autoXp,
    cast, hit, status, hurtShown, enemyAdded, enemyGone, enemyShot, pickupAdded, pickupGone, say,
    propBroken, collected, shinyCaught, orbUsed, levelStart, localPicked, over, holdStart, holdEnd,
    /** Anfitrión: evento para todos. Invitado: evento para el anfitrión. */
    broadcast(ev) { emit(ev); },
    toHost(ev) { if (active && !host) { outEv.push(ev); flushClient(true); } },
    noteCandySpend, grantCandy, pickupValue, noteSkill, confirmSkill, rejectSkill, applySkill,
    askRevive, giveUpRevive, setWipe,
    mate(u) { return mates.get(u); },
    get mates() { return [...mates.values()]; },
    get members() { return members; },
    get active() { return active; },
    get isHost() { return active && host; },
    get local() { return local; }
  };
})();
