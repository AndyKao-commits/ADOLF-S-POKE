/* ============ castle.js — Protege al cachorro ============
 * Dos modos (G.Modes):
 *   castle    50 oleadas, jefe cada 10
 *   castle20  20 oleadas (~10 min), jefe cada 4
 * Limpiar la oleada abre la siguiente. Si su vida llega a cero, se pierde.
 * En la partida corta, la dificultad interna sigue la curva 1–50 (pressureOf).
 */
G.Castle = (() => {
  const aim = { x: 0, y: 80, r: 34, _vx: 0, _vy: 0, level: 1, dead: false };
  const FINAL_HP_MUL = 2.8;
  const FINAL_VISUAL_MUL = 4.2;
  // Jefes de oleada: más duros que la tropa (vida, daño al jugador y mordisco al cachorro).
  const BOSS_HP_BASE = 12;
  const BOSS_HP_TIER = 2;
  const BOSS_DMG_MUL = 1.75;
  const PRESETS = {
    castle: {
      id: 'castle', waves: 50, bossEvery: 10, puppyHp: 4500, baseCap: 16,
      escort: 0.6, dense: false, bite: 'classic', mapPressure: false
    },
    castle20: {
      id: 'castle20', waves: 20, bossEvery: 4, puppyHp: 3000, baseCap: 18,
      escort: 0.7, dense: true, bite: 'sprint', mapPressure: true
    }
  };
  let cfg = PRESETS.castle;
  let on = false, hp = 1, maxHp = 1, img = null;
  let wave = 1, queued = 0, acc = 0, won = false, bondWave = 0, warn = 0;

  function applyPreset(id) {
    cfg = PRESETS[id] || PRESETS.castle;
    return cfg;
  }

  /** En castle20 mapea 1..20 a la curva vieja 1..50; en castle es la propia oleada. */
  function pressureOf(w) {
    const waves = cfg.waves;
    w = Math.max(1, Math.min(waves, Math.round(+w || 1)));
    if (!cfg.mapPressure || waves <= 1) return w;
    return 1 + (w - 1) * ((50 - 1) / (waves - 1));
  }
  function isBossWave(w) { return w > 0 && w % cfg.bossEvery === 0; }
  function bossTier(w) { return w / cfg.bossEvery; }

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
      cap: Math.min(34, cfg.baseCap + extra * 2)
    };
  }

  function spec(w) {
    const pw = pressureOf(w);
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    const party = partyScale(playerCount());
    if (cfg.dense) {
      return {
        n: Math.max(1, Math.round((8 + Math.round(pw * 0.72)) * (1.22 + Math.min(0.22, pw * 0.0045)) * m.rate * party.count)),
        hp: Math.round(22 + pw * 13 + Math.pow(pw, 1.32) * 0.9),
        dmg: Math.round((5.2 + pw * 1.05) * 10) / 10,
        spd: Math.min(118, Math.round(54 + pw * 1.2)),
        gap: Math.max(0.16, 0.58 - pw * 0.007),
        party,
        pressure: pw
      };
    }
    return {
      n: Math.max(1, Math.round((6 + Math.round(pw * 0.62)) * (1.18 + Math.min(0.20, pw * 0.004)) * m.rate * party.count)),
      hp: Math.round(22 + pw * 13 + Math.pow(pw, 1.32) * 0.9),
      dmg: Math.round((3.6 + pw * 0.72) * 10) / 10,
      spd: Math.min(104, Math.round(48 + pw * 1.05)),
      gap: Math.max(0.26, 0.8 - pw * 0.01),
      party,
      pressure: pw
    };
  }

  function begin() {
    applyPreset(G.Modes && G.Modes.isCastle() ? G.Modes.id : 'castle');
    on = true;
    aim.x = 0;
    aim.y = 80;
    aim.dead = false;
    maxHp = cfg.puppyHp;
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
    const boss = isBossWave(w);
    const final = w === cfg.waves;
    queued = final ? 0 : boss ? Math.max(cfg.dense ? 8 : 6, Math.round(s.n * cfg.escort)) : s.n;
    acc = boss ? (cfg.dense ? 0.25 : 0.35) : s.gap;
    if (boss) spawnBoss(s, w);
    if (G.Spawner) {
      const total = cfg.waves;
      const line = boss
        ? (G.I18n && G.I18n.f ? G.I18n.f('Oleada {x} de {x} · ¡Jefe!', w, total) : ('Oleada ' + w + ' de ' + total + ' · ¡Jefe!'))
        : (G.I18n && G.I18n.f ? G.I18n.f('Oleada {x} de {x}', w, total) : ('Oleada ' + w + ' de ' + total));
      G.Spawner.say(line, cfg.dense ? 2.2 : 2.6);
    }
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
    // El jefe final termina la partida y no abre un vínculo a destiempo.
    // Los de 10, 20, 30 y 40 ya no curan al cachorro: sólo dan el vínculo.
    if (wave === cfg.waves) return;
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
    const pw = s.pressure || pressureOf(wave);
    let bag = G.Enemies.bagAt(pw * 24);
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
    e.xp = 4 + Math.round(pw);
    e.castleWave = wave;
    if (G.Difficulty) G.Difficulty.dress(e);
    G.EnemyMgr.add(e);
  }

  function spawnBoss(s, w) {
    const tier = bossTier(w);
    const pw = s.pressure || pressureOf(w);
    const def = G.Enemies.bossMob(pw * 12);
    const pt = spot();
    const e = new G.Enemy(def, pt[0], pt[1], { hp: 1, dmg: 1, spd: 1 }, true);
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    const final = w === cfg.waves;
    e.maxHp = e.hp = Math.round(s.hp * (BOSS_HP_BASE + tier * BOSS_HP_TIER) * m.hp * s.party.bossHp * (final ? FINAL_HP_MUL : 1));
    e.dmg = s.dmg * BOSS_DMG_MUL * m.dmg * s.party.damage;
    e.spd = Math.min(cfg.dense ? 108 : 100, Math.round(s.spd * (cfg.dense ? 0.95 : 0.92)));
    e.xp = 16 + Math.round(pw);
    e.castleWave = w;
    e.castleBoss = true;
    e.castleBossTier = tier;
    e.castleBossSiegeCd = cfg.dense ? 1.8 : 2.5;
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
    if (wave >= cfg.waves) {
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
    if (pair[2]) wave = Math.max(1, Math.min(cfg.waves, +pair[2] || wave));
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
        const tier = Math.max(1, Math.min(4, e.castleBossTier || bossTier(wave)));
        const pct = 0.06 + tier * 0.015;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
        e.castleBossWindup = null;
        e.castleBossSiegeCd = Math.max(3.4, 5.4 - tier * 0.4);
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
        const pct = e.finalPhase === 3 ? 0.14 : 0.10;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
        e.finalCastleWindup = null;
        e.finalCastleCd = e.finalPhase === 3 ? 3.2 : 4.4;
        G.Camera.kick(1.1);
        G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 62, dmg, '#ff5f6d');
        if (hp <= 0) return true;
        continue;
      }
      if ((e.castleCd || 0) > 0) { e.castleCd -= dt; continue; }
      const reach = e.r + aim.r;
      if (G.U.dist2(e.x, e.y, aim.x, aim.y) > reach * reach) continue;
      // Mordisco de tropa: en la partida rápida pega más; en la de 50 también se nota.
      const pw = pressureOf(wave);
      let flat, pctBite, cd;
      if (cfg.bite === 'sprint') {
        cd = 0.32;
        flat = Math.max(4, Math.round((e.dmg || 1) * (2.4 + pw * 0.04)));
        pctBite = Math.round(maxHp * (0.006 + pw * 0.00022));
      } else {
        cd = 0.42;
        flat = Math.max(2, Math.round((e.dmg || 1) * (1.55 + pw * 0.025)));
        pctBite = Math.round(maxHp * (0.0035 + pw * 0.00014));
      }
      e.castleCd = cd;
      const dmg = flat + pctBite;
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

  function balanceOf(id) {
    const p = PRESETS[id] || cfg || PRESETS.castle;
    return {
      mode: p.id, puppyHp: p.puppyHp, waves: p.waves, finalWave: p.waves, bossEvery: p.bossEvery,
      winWave: p.waves + 1, finalHpMul: FINAL_HP_MUL, finalVisualMul: FINAL_VISUAL_MUL,
      bossHpBase: BOSS_HP_BASE, bossHpTier: BOSS_HP_TIER, bossDmgMul: BOSS_DMG_MUL,
      baseCap: p.baseCap, maxCap: 34, bossEscortRatio: p.escort, dense: !!p.dense, bite: p.bite
    };
  }

  return {
    begin, end, net, snapshot, touch, tick, draw, aim, onBossDown, giveBond, partyScale, dressFinalBoss,
    applyPreset, balanceOf, pressureOf, PRESETS,
    get balance() { return balanceOf(cfg.id); },
    get up() { return on; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get y() { return aim.y; },
    get wave() { return wave; },
    get cleared() { return won; }
  };
})();
