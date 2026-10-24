/* ============ spawner.js — oleadas, jefes y shinies ============
 * Los enemigos aparecen en un anillo justo fuera de la vista, así que nunca
 * se materializan en pantalla. Cada ~45 s hay una "marea": una avalancha
 * concentrada desde un lado concreto, para romper el ritmo.
 *
 * Cada enemigo tiene 1/4096 de salir shiny (como en los juegos clásicos).
 * Una run mata 1.500–4.000, así que sale uno cada 1–3 partidas.
 *
 * Cooperativo (sólo en el anfitrión): aparecen alrededor de un jugador vivo
 * al azar, fuera de la vista de TODOS, y hay más y más fuertes según cuántos
 * jugáis (ver G.Coop.scaleRate / scaleHp).
 */
G.Spawner = (() => {
  // Tope de enemigos a la vez (antes 420: con tantos se ralentizaba). Cuando
  // se llega al tope, los que siguen saliendo son "élite" (más vida, daño y
  // experiencia), así la dificultad no baja.
  const CAP = 64, ELITE_FROM = 0.85;
  // Menos Pokémon pero más fuertes (la pantalla no se satura): salen ~24% de
  // los de antes, cada uno con más vida, daño y experiencia.
  const DENSITY = 0.24, DMG_K = 2.4, XP_K = 5.6;
  // La resistencia extra crece con la run: al principio ×3,3 y hasta ×5
  // hacia el minuto 6, cuando ya tienes ataques para tumbarlos.
  const hpK = t => 3.3 + Math.min(1.7, t / 210);
  const SHINY_RATE = 1 / 4096;
  let acc = 0, bossIdx = 0, surgeT = 32, announce = null, announceT = 0, preloadT = 0;
  let forceShiny = 0;           // para pruebas: los N próximos salen shiny
  let eliteSeq = 0, endlessBossT = 90;

  function reset() {
    acc = 0; bossIdx = 0; surgeT = 32; announce = null; announceT = 0; preloadT = 0;
    eliteSeq = 0; endlessBossT = 90;
    G.Enemies.rollRun();
    G.Sprites.preload(G.Enemies.upcomingDex(0, 80));
  }

  /** Enemigos por segundo según el minuto de la run. */
  function rate(t) {
    return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY;
  }

  /** Difícil / Reto / Pesadilla, sólo en una partida sola. El asedio no entra. */
  function diffMul() { return G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1, healing: 1 }; }

  function ringPoint(pl, angle) {
    const d = G.Camera.outerRadius() + G.U.rand(10, 70);
    return [pl.x + Math.cos(angle) * d, pl.y + Math.sin(angle) * d * 0.9];
  }

  let players = [];

  /** ¿Lo vería algún jugador? (para no aparecer delante de nadie) */
  function seenByAnyone(x, y) {
    const r = G.Camera.outerRadius() - 30;
    return players.some(o => G.U.dist2(o.x, o.y, x, y) < r * r);
  }

  /** Cerca del jugador, para la oleada de la bola maldita. */
  function nearPoint(pl, angle, flying) {
    for (let i = 0; i < 8; i++) {
      const a = angle + (i === 0 ? 0 : G.U.rand(-0.4, 0.4));
      const d = 78 + i * 14;
      const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d * 0.9;
      if (flying || G.World.isFree(x, y, 14)) return [x, y];
    }
    return [pl.x + Math.cos(angle) * 100, pl.y + Math.sin(angle) * 90];
  }

  /** Punto del anillo donde quepa: no dentro de paredes ni en el agua. */
  function freePoint(pl, angle, flying) {
    for (let i = 0; i < 8; i++) {
      const a = angle + (i === 0 ? 0 : G.U.rand(-0.9, 0.9));
      const [x, y] = ringPoint(pl, a);
      if (players.length > 1 && seenByAnyone(x, y)) continue;
      if (flying || G.World.isFree(x, y, 14)) return [x, y];
    }
    return null;
  }

  /** Jugador alrededor del que sale el siguiente enemigo (nunca uno que aún vuelve de la grieta). */
  function anchor() {
    if (G.Castle && G.Castle.up) return G.Castle.aim;
    const alive = players.filter(o => !o.dead && !G.Rift.leftBehind(o));
    return alive.length ? G.U.pick(alive) : players[0];
  }

  function shinyLook(def) {
    return !!(G.Modes && G.Modes.is('shiny') && G.Sprites.hasShiny(def.dex));
  }

  function scaled(sc, k) { return k === 1 ? sc : Object.assign({}, sc, { hp: sc.hp * k }); }

  function isFlyer(def) { return G.Sprites.hovers(def.dex); }

  function rollShiny(dex) {
    if (!G.Sprites.hasShiny(dex)) return false;
    if (forceShiny > 0) { forceShiny--; return true; }
    return Math.random() < SHINY_RATE;
  }

  // Como mucho 3 curanderos, 3 escuderos y 3 invocadores vivos a la vez
  // (18-10-2026: juntos dejaban a la horda, y a los jefes, casi inmortales).
  // Si ya hay 3 de uno, sale otro del elenco.
  const SUPPORT_MAX = 3, SUPPORT = new Set(['healer', 'shielder', 'summoner']);
  /** Tipos de apoyo que ya tienen 3 vivos. */
  function supportFull() {
    const n = {}, full = new Set();
    for (const e of G.EnemyMgr.all()) {
      if (!e.dead && SUPPORT.has(e.behavior) && (n[e.behavior] = (n[e.behavior] || 0) + 1) >= SUPPORT_MAX) full.add(e.behavior);
    }
    return full;
  }

  function spawnOne(pl, t, angle, opts) {
    let bag = G.Enemies.bagAt(t);
    const mix = G.Endless && G.Endless.bag(bag, t);
    if (mix) bag = mix;
    if (G.Modes && G.Modes.is('shiny')) {
      const only = bag.filter(d => G.Sprites.hasShiny(d.dex));
      if (only.length) bag = only;
    }
    let def = G.U.pick(bag);
    if (SUPPORT.has(def.behavior)) {
      const full = supportFull();
      if (full.has(def.behavior)) {
        const rest = bag.filter(d => !full.has(d.behavior));
        if (!rest.length) return null;
        def = G.U.pick(rest);
      }
    }
    const ang = angle != null ? angle
      : (G.Endless && G.Endless.side(t) != null ? G.Endless.side(t) + G.U.rand(-0.7, 0.7) : Math.random() * 6.2832);
    const pt = opts && opts.near ? nearPoint(pl, ang, isFlyer(def)) : freePoint(pl, ang, isFlyer(def));
    if (!pt) return null;
    const forced = shinyLook(def);
    const shiny = forced || rollShiny(def.dex);
    const m = diffMul();
    const grown = G.Endless ? G.Endless.tune(G.Enemies.scale(t), t) : G.Enemies.scale(t);
    const e = new G.Enemy(def, pt[0], pt[1], scaled(grown, G.Coop.scaleHp(players.length) * hpK(t) * m.hp));
    e.dmg *= DMG_K * m.dmg; e.xp = Math.round(e.xp * XP_K);
    if (G.EnemyMgr.count >= CAP * ELITE_FROM) { e.maxHp = e.hp = Math.round(e.maxHp * 1.6); e.dmg *= 1.25; e.xp = Math.round(e.xp * 1.6); }
    if (shiny) e.makeShiny(forced);
    if (G.Events.golden) e.makeGolden();
    if (G.Difficulty) G.Difficulty.dress(e);
    if (G.Endless) G.Endless.dress(e);
    if (opts && opts.elite) {
      e.maxHp = e.hp = Math.round(e.maxHp * 1.3);
      e.dmg *= 1.3;
      e.eliteWave = opts.elite;
      e.eliteOwner = opts.owner || 'me';
      e.ring = '#c47bff';
    }
    G.EnemyMgr.add(e);
    if (shiny && !forced) {
      say('¡Un ' + e.name + ' shiny anda cerca!', 3.4);
      G.Audio.sfx('shiny');
    }
    return e;
  }

  function spawnBoss(pl, t, b) {
    const [x, y] = ringPoint(pl, Math.random() * 6.2832);
    const m = diffMul();
    const e = new G.Enemy(b, x, y, scaled(G.Enemies.bossScale(t), G.Coop.scaleHp(players.length) * (players.length > 1 ? 1.4 : 1) * m.hp), true);
    e.dmg *= m.dmg;
    const forced = shinyLook(b);
    if (forced || rollShiny(b.dex)) e.makeShiny(forced);
    G.EnemyMgr.add(e);
    say('¡' + e.name + (e.shiny ? ' shiny' : '') + ' salvaje apareció!', 3.2);
    G.Camera.kick(1.1);
    G.Audio.sfx('boss');
    if (G.Endless) G.Endless.markBoss(e, false);
    return e;
  }

  /** @param who  el jugador o la lista de jugadores (cooperativo) */
  function update(dt, who, t) {
    players = Array.isArray(who) ? who : [who];
    if (announceT > 0) announceT -= dt;
    // En la arena de la grieta no sale nada más (y el reloj de jefes espera).
    // En la Sentencia de Arceus, sólo sus legendarios (systems/judgment.js).
    if (G.Rift.inArena || G.Judgment.active) return;

    // Precarga lo que va a salir en el próximo minuto.
    preloadT -= dt;
    if (preloadT <= 0) { preloadT = 10; G.Sprites.preload(G.Enemies.upcomingDex(t, 60)); }

    // Asedio: los monstruos salen de cada castillo (siege.js).
    // Protege al cachorro: las oleadas las saca el castillo (castle.js).
    if (G.Modes && (G.Modes.is('siege') || G.Modes.is('castle'))) return;

    // Desafío de jefes: nada de hordas. Como mucho tres jefes vivos.
    // El tramo (en la mazmorra, uno cada 3 min) y la curva de vida y daño
    // avanzan el doble de rápido. En el segundo 0 salen igual de fuertes.
    if (G.Modes && G.Modes.is('boss')) {
      const clock = t * 2;
      while (G.EnemyMgr.count < 3) {
        const mob = G.Enemies.bossMob(clock);
        const [x, y] = ringPoint(anchor(), Math.random() * 6.2832);
        const m = diffMul();
        const e = new G.Enemy(mob, x, y, scaled(G.Enemies.bossScale(clock), G.Coop.scaleHp(players.length) * m.hp), true);
        e.dmg *= m.dmg;
        const forced = shinyLook(mob);
        if (forced || rollShiny(mob.dex)) e.makeShiny(forced);
        G.EnemyMgr.add(e);
      }
      return;
    }

    // --- jefes ---
    const b = G.Enemies.BOSSES[bossIdx];
    if (b && t >= b.at) { spawnBoss(anchor(), t, b); bossIdx++; }
    else if (G.Endless && G.Endless.on() && bossIdx >= G.Enemies.BOSSES.length && !G.EnemyMgr.bossAlive()) {
      endlessBossT -= dt;
      if (endlessBossT <= 0) {
        endlessBossT = 90;
        const mob = G.Enemies.bossMob(Math.min(t, 12 * 60));
        const e = spawnBoss(anchor(), Math.min(t, 12 * 60), mob);
        if (e) G.Endless.markBoss(e, true);
      }
    }

    // Combate de jefe: las oleadas bajan al 25% y no hay mareas, para que el
    // jefe sea un momento propio y se le pueda apuntar entre la multitud.
    const bossFight = G.EnemyMgr.bossAlive();

    // --- goteo normal ---
    if (G.EnemyMgr.count < CAP) {
      acc += rate(t) * G.Coop.scaleRate(players.length) * diffMul().rate * (bossFight ? 0.25 : 1) * dt;
      let n = Math.floor(acc);
      acc -= n;
      while (n-- > 0 && G.EnemyMgr.count < CAP) spawnOne(anchor(), t);
    }

    // --- marea ---
    if (!bossFight) surgeT -= dt;
    if (surgeT <= 0) {
      surgeT = G.U.rand(38, 56);
      const base = Math.random() * 6.2832;
      const target = anchor();
      const fan = 0.55 * (G.Difficulty ? G.Difficulty.spread() : 1) * (G.Endless ? G.Endless.fan(t) : 1);
      const n = Math.min(CAP - G.EnemyMgr.count, Math.round((14 + Math.floor(t / 22)) * G.Coop.scaleRate(players.length) * diffMul().rate * 0.4));
      for (let i = 0; i < n; i++) spawnOne(target, t, base + G.U.rand(-fan, fan));
      say('¡Marea de Pokémon!', 2.2);
      G.Audio.sfx('surge');
    }
  }

  /** Unos cuantos de golpe desde un lado (al empezar una horda). */
  function burst(n) {
    const base = Math.random() * 6.2832, target = anchor() || G.Game.player, t = G.Game.st.time;
    const fan = 0.6 * (G.Difficulty ? G.Difficulty.spread() : 1);
    for (let i = 0; i < n && G.EnemyMgr.count < CAP + 10; i++) spawnOne(target, t, base + G.U.rand(-fan, fan));
  }

  /**
   * Un rezagado vuelve a salir por delante del jugador (hacia donde corre),
   * fuera de la vista. Devuelve false si no hay sitio (entonces se quita).
   */
  function ahead(e, pl) {
    if (!players.length) players = [pl];
    const sp = Math.hypot(pl._vx || 0, pl._vy || 0);
    const a0 = sp > 20 ? Math.atan2(pl._vy, pl._vx) : Math.random() * 6.2832;
    const pt = freePoint(pl, a0 + G.U.rand(-0.9, 0.9), e.flying);
    if (!pt) return false;
    e.x = pt[0]; e.y = pt[1]; e.kx = e.ky = 0;
    e.phase = 'walk'; e.pt = 0; e.jump = null; e.jumpLift = 0;
    return true;
  }

  /** Seis élites junto a quien usó la bola maldita. Un poco más fuertes que la horda de ese minuto. */
  function eliteWave(center) {
    if (!center) return;
    if (!players.length) players = [center];
    const id = ++eliteSeq;
    const t = (G.Game.st && G.Game.st.time) || 0;
    const owner = center.uid || 'me';
    const base = Math.random() * 6.2832;
    for (let i = 0; i < 6; i++) spawnOne(center, t, base + (i / 6) * 6.2832, { near: true, elite: id, owner });
    say('¡Han salido élites: acaba con ellas!', 4);
  }

  /** Al caer la última de esa oleada, suelta una bola azul. Si quien la llamó ya cayó, no. */
  function eliteDown(e) {
    const id = e.eliteWave;
    if (!id) return;
    if (G.EnemyMgr.all().some(o => o !== e && !o.dead && o.eliteWave === id)) return;
    const owner = e.eliteOwner || 'me';
    const who = (G.Game.everyone ? G.Game.everyone() : []).find(p => (p.uid || 'me') === owner);
    if (who && who.dead) return;
    G.Pickups.drop('ball', e.x, e.y, 2);
  }

  /** Aviso grande en pantalla (también lo usan el bioma y los shinies). */
  /** @param local  sólo en este ordenador (no se manda a los compañeros) */
  function say(text, secs = 2.6, local = false) {
    announce = text; announceT = secs;
    if (G.Coop.isHost && !local) G.Coop.say(text, secs);
  }

  function banner() { return announceT > 0 ? { text: announce, t: announceT } : null; }

  /** Invitado en cooperativo: sólo corre el reloj del aviso. */
  function tickBanner(dt) { if (announceT > 0) announceT -= dt; }

  function nextBossIn(t) {
    if (G.Modes && (G.Modes.is('siege') || G.Modes.is('castle') || G.Modes.is('boss'))) return null;
    if (G.EnemyMgr && G.EnemyMgr.bossAlive && G.EnemyMgr.bossAlive()) return null;
    const b = G.Enemies.BOSSES[bossIdx];
    if (b) return Math.max(0, b.at - t);
    if (G.Endless && G.Endless.on()) return Math.max(0, endlessBossT);
    return null;
  }

  return { reset, update, ahead, burst, tickBanner, banner, say, eliteWave, eliteDown, rate, nextBossIn, SHINY_RATE, CAP,
           debugForceShiny(n = 1) { forceShiny = n; } };
})();
