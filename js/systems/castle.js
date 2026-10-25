/* ============ castle.js — Protege al cachorro ============
 * El castillo se queda quieto. Las oleadas 1 a 50 van a por él.
 * Cada 10 sale un jefe. Los de 10, 20, 30 y 40 dan un vínculo. El de la 50 acaba la partida.
 * Limpiar la oleada abre la siguiente. La 50 ganada acaba la partida.
 * Si su vida llega a cero, se pierde.
 */
G.Castle = (() => {
  const aim = { x: 0, y: 80, r: 34, _vx: 0, _vy: 0, level: 1, dead: false };
  const WAVES = 50, BASE_CAP = 16;
  const PUPPY_MAX_HP = 4500;
  const FINAL_WAVE = 50;
  const FINAL_HP_MUL = 2.4;
  const FINAL_VISUAL_MUL = 4.2;
  const FINAL_MIN_PUPPY_HP = 0.40;
  let on = false, hp = 1, maxHp = 1, img = null;
  let wave = 1, queued = 0, acc = 0, won = false, bondWave = 0, warn = 0;

  function playerCount() {
    if (!G.Coop || !G.Coop.active || !G.Coop.players) return 1;
    return Math.max(1, Math.min(10, G.Coop.players().filter(Boolean).length || 1));
  }

  /**
   * Escalado propio del modo. Dos jugadores aportan mucho más que el doble de
   * daño por cobertura y sinergia, por eso el jefe crece más que la tropa.
   */
  function partyScale(n) {
    n = Math.max(1, Math.min(10, Math.round(+n || 1)));
    const extra = n - 1;
    return {
      players: n,
      count: 1 + extra * 0.22,
      mobHp: 1 + extra * 0.30,
      bossHp: 1 + 1.10 * Math.pow(extra, 0.82),
      damage: 1 + extra * 0.08,
      cap: Math.min(34, BASE_CAP + extra * 2)
    };
  }

  function spec(w) {
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    const party = partyScale(playerCount());
    return {
      n: Math.max(1, Math.round((6 + Math.round(w * 0.62)) * (1.18 + Math.min(0.20, w * 0.004)) * m.rate * party.count)),
      hp: Math.round(22 + w * 13 + Math.pow(w, 1.32) * 0.9),
      dmg: Math.round((3.6 + w * 0.72) * 10) / 10,
      spd: Math.min(104, Math.round(48 + w * 1.05)),
      gap: Math.max(0.26, 0.8 - w * 0.01),
      party
    };
  }

  function begin() {
    on = true;
    aim.x = 0;
    aim.y = 80;
    aim.dead = false;
    maxHp = PUPPY_MAX_HP;
    hp = maxHp;
    wave = 1;
    queued = 0;
    acc = 0;
    won = false;
    bondWave = 0;
    if (!img) {
      img = new Image();
      img.src = 'assets/castle-puppy.png?v=char';
    }
    openWave(1);
  }

  function end() { on = false; won = false; queued = 0; }

  function openWave(w) {
    wave = w;
    const s = spec(w);
    const boss = w % 10 === 0;
    if (w === FINAL_WAVE) hp = Math.max(hp, Math.round(maxHp * FINAL_MIN_PUPPY_HP));
    queued = w === FINAL_WAVE ? 0 : boss ? Math.max(6, Math.round(s.n * 0.6)) : s.n;
    acc = boss ? 0.35 : s.gap;
    if (boss) spawnBoss(s, w);
    if (G.Spawner) G.Spawner.say(boss ? ('Oleada ' + w + ' de 50 · ¡Jefe!') : ('Oleada ' + w + ' de 50'), 2.6);
  }

  /** Un vínculo en este ordenador (el anfitrión avisa a los demás). */
  function giveBond() {
    const pl = G.Game && G.Game.player;
    if (!pl || pl.dead) return;
    pl.bonds++;
    G.FX.dmgText(pl.x, pl.y - pl.bodyH - 10, '¡Vínculo!', '#ff8ad8', true);
    G.FX.ring(pl.x, pl.y, 8, 90, '#ff8ad8', 0.7, 5);
    if (G.Game.offerBond) G.Game.offerBond();
  }

  function onBossDown() {
    if (!on || bondWave === wave) return;
    bondWave = wave;
    // Los cuatro jefes previos reparan un poco lo defendido. El jefe final
    // termina la partida y no abre una elección de vínculo a destiempo.
    if (wave < FINAL_WAVE) hp = Math.min(maxHp, hp + Math.round(maxHp * 0.05));
    if (wave === FINAL_WAVE) return;
    giveBond();
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['cb']);
  }

  function living() {
    let n = 0;
    for (const e of G.EnemyMgr.all()) if (!e.dead && e.castleWave === wave) n++;
    return n;
  }

  function spot() {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.2832;
      const d = 240 + Math.random() * 140;
      const x = Math.cos(a) * d;
      const y = aim.y + Math.sin(a) * d * 0.85;
      if (G.World.isFree(x, y, 14)) return [x, y];
    }
    const a = Math.random() * 6.2832;
    return [Math.cos(a) * 280, aim.y + Math.sin(a) * 220];
  }

  function spawnOne(s) {
    let bag = G.Enemies.bagAt(wave * 24);
    const rest = bag.filter(d => d.behavior !== 'thief');
    if (rest.length) bag = rest;
    if (!bag.length) return;
    const def = G.U.pick(bag);
    const pt = spot();
    const e = new G.Enemy(def, pt[0], pt[1], { hp: 1, dmg: 1, spd: 1 });
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    e.maxHp = e.hp = Math.round(s.hp * m.hp * s.party.mobHp);
    e.dmg = s.dmg * m.dmg * s.party.damage;
    e.spd = s.spd;
    e.xp = 4 + wave;
    e.castleWave = wave;
    if (G.Difficulty) G.Difficulty.dress(e);
    G.EnemyMgr.add(e);
  }

  function spawnBoss(s, w) {
    const tier = w / 10;
    const def = G.Enemies.bossMob(w * 12);
    const pt = spot();
    const e = new G.Enemy(def, pt[0], pt[1], { hp: 1, dmg: 1, spd: 1 }, true);
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    const final = w === FINAL_WAVE;
    e.maxHp = e.hp = Math.round(s.hp * (8 + tier) * m.hp * s.party.bossHp * (final ? FINAL_HP_MUL : 1));
    e.dmg = s.dmg * 1.35 * m.dmg * s.party.damage;
    e.spd = Math.min(92, Math.round(s.spd * 0.82));
    e.xp = 16 + w;
    e.castleWave = w;
    e.castleBoss = true;
    e.castleBossTier = tier;
    e.castleBossSiegeCd = 2.5;
    e.castleBossWindup = null;
    if (final) dressFinalBoss(e);
    G.EnemyMgr.add(e);
    G.Audio.sfx('boss');
    G.Camera.kick(0.8);
  }

  /** Tamaño visual enorme; el cuerpo físico queda limitado para poder esquivarlo. */
  function dressFinalBoss(e) {
    if (!e || e.finalCastleBoss) return e;
    e.finalCastleBoss = true;
    e.scale *= FINAL_VISUAL_MUL;
    e.anim = new G.Sprites.Animator(e.dex, e.scale, !!e.shiny);
    e.bodyH = G.Sprites.bodyHeight(e.dex, e.scale);
    e.r = Math.min(88, G.Sprites.bodyRadius(e.dex, e.scale));
    e.finalBaseSpd = e.spd;
    e.finalCastleCd = 2.5;
    e.finalCastleWindup = null;
    e.finalPhase = 1;
    e.ring = '#ffcb3d';
    return e;
  }

  function updateFinalPhase(e) {
    if (!e || !e.finalCastleBoss || e.dead || e.maxHp <= 0) return;
    const frac = e.hp / e.maxHp;
    const phase = frac <= 0.35 ? 3 : frac <= 0.70 ? 2 : 1;
    if (phase !== e.finalPhase) {
      e.finalPhase = phase;
      e.skillCd = Math.min(e.skillCd || 3, phase === 3 ? 1 : 1.8);
      G.Camera.kick(phase === 3 ? 1.2 : 0.75);
      G.FX.ring(e.x, e.y, e.r, e.r * 3.2, phase === 3 ? '#ff4a4a' : '#ff9b4a', 0.7, 7);
    }
    e.spd = e.finalBaseSpd * (phase === 3 ? 1.20 : phase === 2 ? 1.10 : 1);
    e.ring = phase === 3 ? '#ff4a4a' : phase === 2 ? '#ff9b4a' : '#ffcb3d';
  }

  /** El aviso rojo lo ve toda la sala: el anfitrión lo mide, los demás lo copian. */
  function warnLeft() {
    const mine = !(G.Coop && G.Coop.active && !G.Coop.isHost);
    if (mine && G.EnemyMgr) {
      for (const e of G.EnemyMgr.all()) {
        if (e.dead || !e.castleBoss) continue;
        const w = e.finalCastleWindup > 0 ? e.finalCastleWindup : e.castleBossWindup;
        if (w > 0) return w;
      }
      return 0;
    }
    return warn;
  }

  /** Sólo el anfitrión (o el solo) saca la oleada y decide cuándo se ha limpiado. */
  function tick(dt) {
    if (!on || won || hp <= 0) return;
    if (G.Coop.active && !G.Coop.isHost) {
      for (const e of G.EnemyMgr.all()) if (e.finalCastleBoss && !e.dead) updateFinalPhase(e);
      return;
    }
    const s = spec(wave);
    const finalBoss = G.EnemyMgr.all().find(e => !e.dead && e.finalCastleBoss);
    if (finalBoss) updateFinalPhase(finalBoss);
    if (queued > 0) {
      acc += dt;
      let made = 0;
      while (queued > 0 && living() < s.party.cap && acc >= s.gap && made < 2) {
        acc -= s.gap;
        spawnOne(s);
        queued--;
        made++;
      }
      return;
    }
    if (living() > 0) return;
    if (wave >= WAVES) {
      won = true;
      if (G.Game.castleClear) G.Game.castleClear();
      return;
    }
    openWave(wave + 1);
  }

  /** Vida que manda el anfitrión (los demás sólo la dibujan). */
  function net(pair) {
    if (!on || !pair) return;
    hp = Math.max(0, +pair[0] || 0);
    maxHp = Math.max(1, +pair[1] || maxHp);
    if (pair[2]) wave = Math.max(1, Math.min(WAVES, +pair[2] || wave));
    warn = Math.max(0, +pair[3] || 0);
  }

  function snapshot() {
    let wind = 0;
    if (G.EnemyMgr) {
      for (const e of G.EnemyMgr.all()) {
        if (e.dead || !e.castleBoss) continue;
        const w = e.finalCastleWindup > 0 ? e.finalCastleWindup : e.castleBossWindup;
        if (w > wind) wind = w;
      }
    }
    return [Math.ceil(hp), Math.ceil(maxHp), wave, Math.round(wind * 10) / 10];
  }

  /** Los que ya están encima le quitan vida. true = ha caído. */
  function touch(dt) {
    if (!on || hp <= 0) return false;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.behavior === 'thief' || e.siegeBoss) continue;
      if (e.finalCastleBoss && e.remote) { updateFinalPhase(e); continue; }
      if (e.remote || e.stunT > 0) continue;
      if (e.castleBoss && !e.finalCastleBoss) {
        if (e.castleBossSiegeCd > 0) { e.castleBossSiegeCd -= dt; continue; }
        const reach = e.r + aim.r + 16;
        if (G.U.dist2(e.x, e.y, aim.x, aim.y) > reach * reach) {
          e.castleBossWindup = null;
          continue;
        }
        if (e.castleBossWindup == null) {
          e.castleBossWindup = 1.1;
          G.FX.ring(aim.x, aim.y, aim.r, aim.r * 2.2, '#ff654f', 1.1, 5);
          if (e.strike) e.strike(aim);
          continue;
        }
        e.castleBossWindup -= dt;
        if (e.castleBossWindup > 0) continue;
        const tier = Math.max(1, Math.min(4, e.castleBossTier || wave / 10));
        const pct = 0.03 + tier * 0.01;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
        e.castleBossWindup = null;
        e.castleBossSiegeCd = Math.max(5.5, 7.5 - tier * 0.5);
        G.Camera.kick(0.8);
        G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 62, dmg, '#ff654f');
        if (hp <= 0) return true;
        continue;
      }
      if (e.finalCastleBoss) {
        updateFinalPhase(e);
        if (e.finalCastleCd > 0) { e.finalCastleCd -= dt; continue; }
        const reach = e.r + aim.r + 18;
        if (G.U.dist2(e.x, e.y, aim.x, aim.y) > reach * reach) {
          e.finalCastleWindup = null;
          continue;
        }
        if (e.finalCastleWindup == null) {
          e.finalCastleWindup = 1.2;
          G.FX.ring(aim.x, aim.y, aim.r, aim.r * 2.4, '#ff4a4a', 1.2, 6);
          if (e.strike) e.strike(aim);
          continue;
        }
        e.finalCastleWindup -= dt;
        if (e.finalCastleWindup > 0) continue;
        const pct = e.finalPhase === 3 ? 0.08 : 0.06;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
        e.finalCastleWindup = null;
        e.finalCastleCd = e.finalPhase === 3 ? 4.5 : 6;
        G.Camera.kick(1.1);
        G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 62, dmg, '#ff5f6d');
        if (hp <= 0) return true;
        continue;
      }
      if ((e.castleCd || 0) > 0) { e.castleCd -= dt; continue; }
      const reach = e.r + aim.r;
      if (G.U.dist2(e.x, e.y, aim.x, aim.y) > reach * reach) continue;
      e.castleCd = 0.55;
      const dmg = Math.max(1, e.dmg || 1);
      hp = Math.max(0, hp - dmg);
      G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 62, Math.ceil(dmg), '#ff8b8b');
      if (hp <= 0) return true;
    }
    return false;
  }

  function draw(ctx) {
    if (!on) return;
    const H = 58;
    const ready = img && img.complete && img.naturalWidth;
    const W = ready ? Math.round(H * img.naturalWidth / img.naturalHeight) : 120;
    ctx.save();
    ctx.translate(aim.x, aim.y);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, -1, Math.min(46, W * 0.38), 6, 0, 0, 6.2832);
    ctx.fill();
    if (ready) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, -W / 2, -H, W, H);
      ctx.imageSmoothingEnabled = false;
    }
    const bw = 64;
    const by = -H - 7;
    const frac = maxHp > 0 ? hp / maxHp : 0;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-bw / 2, by, bw, 3.4);
    ctx.fillStyle = frac > 0.35 ? '#5fe08a' : '#ff5f6d';
    ctx.fillRect(-bw / 2, by, bw * frac, 3.4);
    ctx.font = '700 8px Pixelify,"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText('Protege al cachorro', 0, by - 2);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('Protege al cachorro', 0, by - 2);
    ctx.restore();
    const left = warnLeft();
    if (left > 0) {
      ctx.save();
      ctx.translate(aim.x, aim.y);
      ctx.globalAlpha = 0.45 + ((Math.floor(left * 8) % 2) ? 0.4 : 0);
      ctx.strokeStyle = '#ff4a4a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, -4, aim.r * 2.3, aim.r * 0.95, 0, 0, 6.2832);
      ctx.stroke();
      ctx.restore();
    }
  }

  return {
    begin, end, net, snapshot, touch, tick, draw, aim, onBossDown, giveBond, partyScale, dressFinalBoss,
    balance: { puppyHp: PUPPY_MAX_HP, finalWave: FINAL_WAVE, finalHpMul: FINAL_HP_MUL,
      finalVisualMul: FINAL_VISUAL_MUL, finalMinPuppyHp: FINAL_MIN_PUPPY_HP,
      baseCap: BASE_CAP, maxCap: 34, bossEscortRatio: 0.6 },
    get up() { return on; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get y() { return aim.y; },
    get wave() { return wave; },
    get cleared() { return won; }
  };
})();
