/* ============ castle.js — Protege al cachorro (50 oleadas / 20 rápidas) ============
 * El cachorro está abajo; si llega a 0, la partida se acaba.
 * Tras cada jefe (salvo el final) hay un Vínculo. El anfitrión lleva la vida.
 * Curación (corazones / tienda / altar) y Núcleo Guardián: autoridad del anfitrión.
 */
G.Castle = (() => {
  const PRESETS = {
    castle: {
      id: 'castle', waves: 50, bossEvery: 10, puppyHp: 4500, baseCap: 16,
      escort: 0.60, dense: false, bite: 'classic', mapPressure: false,
      finalHpMul: 2.8, heartRate: 0.10, shopHeal: 0.15
    },
    castle20: {
      id: 'castle20', waves: 20, bossEvery: 4, puppyHp: 3200, baseCap: 18,
      escort: 0.50, dense: true, bite: 'sprint', mapPressure: true,
      finalHpMul: 2.4, heartRate: 0.08, shopHeal: 0.12
    }
  };
  const BOSS_HP_BASE = 22;
  const BOSS_HP_TIER = 4.5;
  const BOSS_DMG_MUL = 1.75;
  const FINAL_VISUAL_MUL = 4.2;
  const HEART_HEAL = 0.03;
  const HEART_MAX_WAVE = 3;
  const SHOP_HP_CAP = 0.85;
  const SHOP_PRICE_GROW = 1.25;
  const ALTAR_MIN_FRAC = 0.35;
  const ALTAR_CHANNEL = 2;
  const PREP_SECS = 10;
  const CORE_RANGE = 220;
  const SHIELD_DUR = 4;
  const BOSS_KB_IMMUNE = 8;

  let cfg = PRESETS.castle;
  let on = false, hp = 0, maxHp = 0, wave = 0, won = false;
  let queued = 0, acc = 0, bondWave = 0, warn = 0;
  let prepT = 0, pendingBoss = null, bossLive = false;
  let heartsThisWave = 0, shopUsedInSegment = false, altarUsesInSegment = 0;
  let shopMul = 1, lastSeg = -1;
  let altar = null, altarChannel = null;
  let guardianCoreHeld = false, guardianCoreOnGround = false, guardianCoreDroppedForSegment = false;
  let guardianPickup = null;
  let puppyShield = { active: false, left: 0, bossBlockReady: false };
  let pulseFx = 0, usingCore = false;
  const img = new Image();
  img.src = 'assets/castle-puppy.png?v=char';
  const aim = { x: 0, y: 80, r: 34, bodyH: 40 };

  function applyPreset(id) {
    cfg = PRESETS[id] || PRESETS.castle;
    return cfg;
  }

  function playerCount() {
    if (!G.Coop || !G.Coop.active || !G.Coop.players) return 1;
    return Math.max(1, Math.min(10, G.Coop.players().filter(Boolean).length || 1));
  }

  function partyScale(n) {
    n = Math.max(1, Math.min(10, Math.round(+n || playerCount())));
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

  function pressureOf(w) {
    const waves = cfg.waves;
    w = Math.max(1, Math.min(waves, Math.round(+w || 1)));
    if (!cfg.mapPressure || waves <= 1) return w;
    return 1 + (w - 1) * ((50 - 1) / (waves - 1));
  }

  function segmentId(w) {
    return Math.floor((Math.max(1, w) - 1) / Math.max(1, cfg.bossEvery));
  }

  function isBossWave(w) { return w > 0 && w % cfg.bossEvery === 0; }

  function isCoreDropWave(w) {
    return w > 0 && (w + 1) % cfg.bossEvery === 0 && w < cfg.waves;
  }

  function bossTier(w) {
    return Math.max(1, Math.min(5, Math.round(w / cfg.bossEvery)));
  }

  function authority() {
    return !(G.Coop && G.Coop.active) || !!G.Coop.isHost;
  }

  function meId() {
    return (G.Coop && G.Coop.selfId) || 'local';
  }

  function healMul() {
    return G.Difficulty ? G.Difficulty.healing() : 1;
  }

  function resetSegment(w) {
    const seg = segmentId(w);
    if (seg === lastSeg) return;
    lastSeg = seg;
    shopUsedInSegment = false;
    altarUsesInSegment = 0;
    guardianCoreDroppedForSegment = false;
    altarChannel = null;
  }

  function begin(modeId) {
    applyPreset(modeId || (G.Modes && G.Modes.isCastle() ? G.Modes.id : 'castle'));
    on = true;
    won = false;
    wave = 0;
    bondWave = 0;
    warn = 0;
    prepT = 0;
    pendingBoss = null;
    bossLive = false;
    heartsThisWave = 0;
    shopUsedInSegment = false;
    altarUsesInSegment = 0;
    shopMul = 1;
    lastSeg = -1;
    altarChannel = null;
    guardianCoreHeld = false;
    guardianCoreOnGround = false;
    guardianCoreDroppedForSegment = false;
    guardianPickup = null;
    puppyShield = { active: false, left: 0, bossBlockReady: false };
    pulseFx = 0;
    usingCore = false;
    maxHp = hp = cfg.puppyHp;
    // El cachorro queda junto al punto de aparición del jugador (0,0), como antes.
    aim.x = 0;
    aim.y = 80;
    altar = { x: aim.x + 54, y: aim.y - 8 };
    openWave(1);
  }

  function end() {
    on = false;
    warn = 0;
    prepT = 0;
    pendingBoss = null;
    bossLive = false;
    altar = null;
    altarChannel = null;
    guardianPickup = null;
    puppyShield.active = false;
  }

  function canHeal() { return on && hp > 0 && hp < maxHp; }

  function heal(amount) {
    if (!on || hp <= 0) return 0;
    const need = Math.max(0, maxHp - hp);
    const got = Math.min(Math.max(0, Math.round(+amount || 0)), need);
    if (got <= 0) return 0;
    hp = Math.min(maxHp, hp + got);
    G.FX.ring(aim.x, aim.y, 10, 70, '#ff8ad8', 0.55, 4);
    G.FX.dmgText(aim.x, aim.y - 70, '+' + got, '#ff8ad8', true);
    return got;
  }

  function healPuppy(frac) {
    return heal(Math.round(maxHp * Math.max(0, +frac || 0) * healMul()));
  }

  function requestHeal(frac, source) {
    if (!authority()) {
      G.Coop.toHost(['chl', Math.max(0, +frac || 0), source || '']);
      return true;
    }
    return healPuppy(frac) > 0;
  }

  function tryHeartDrop(enemy) {
    if (!on || !authority() || !enemy || enemy.castleBoss || enemy.boss || enemy.isBoss) return false;
    if (heartsThisWave >= HEART_MAX_WAVE) return false;
    if (Math.random() >= (cfg.heartRate || 0.1)) return false;
    if (G.Pickups) G.Pickups.drop('heart', enemy.x + G.U.rand(-10, 10), enemy.y + G.U.rand(-8, 8), HEART_HEAL);
    return true;
  }

  function takeHeart(frac) {
    if (!on) return false;
    if (!authority()) {
      G.Coop.toHost(['chl', Math.max(0, +frac || HEART_HEAL), 'heart']);
      return true;
    }
    if (heartsThisWave >= HEART_MAX_WAVE) return false;
    if (!canHeal()) return false;
    if (healPuppy(frac || HEART_HEAL) <= 0) return false;
    heartsThisWave++;
    return true;
  }

  /** Corazón en suelo con cachorro lleno → caramelos (no se pierde). */
  function heartToCandy(pl) {
    if (!on || !pl || pl.dead) return 0;
    const n = 3 + Math.floor(Math.random() * 3);
    if (G.Game && G.Game.addCandy) G.Game.addCandy(pl, n);
    else pl.runCandy = (pl.runCandy || 0) + n;
    G.FX.dmgText(pl.x, pl.y - pl.bodyH - 8, '+' + n, '#ffd23f', true);
    return n;
  }

  function shopOpen() {
    return on && prepT > 0 && isBossWave(wave) && !bossLive;
  }

  function shopHealPct() {
    return (cfg.shopHeal || 0.15) * healMul();
  }

  function canBuyHeal() {
    if (!on || !shopOpen()) return false;
    if (shopUsedInSegment) return false;
    if (!canHeal()) return false;
    if (hp / maxHp > SHOP_HP_CAP) return false;
    return true;
  }

  /** La tienda ya ha cobrado los caramelos; aquí sólo se cura y se marca el tramo. */
  function buyHeal() {
    if (!authority()) {
      if (!canBuyHeal()) return false;
      G.Coop.toHost(['csh']);
      return true;
    }
    if (!canBuyHeal()) return false;
    if (healPuppy(cfg.shopHeal || 0.15) <= 0) return false;
    shopUsedInSegment = true;
    shopMul *= SHOP_PRICE_GROW;
    if (G.Coop.active && G.Coop.isHost) {
      G.Coop.broadcast(['css', shopHealPct(), shopMul, 1]);
    }
    return true;
  }

  function syncShop(frac, priceMul, used) {
    if (authority()) return;
    if (priceMul != null) shopMul = Math.max(1, +priceMul || shopMul);
    if (used != null) shopUsedInSegment = !!used;
    healPuppy(frac || cfg.shopHeal || 0.15);
  }

  function altarHealPct() {
    return altarUsesInSegment <= 0 ? 0.05 : 0.10;
  }

  function altarActualHeal() {
    if (!canHeal()) return 0;
    return Math.min(
      Math.round(maxHp * altarHealPct() * healMul()),
      Math.max(0, maxHp - hp)
    );
  }

  function playerAlive(pl) {
    return !!(pl && !pl.dead && !(pl.downed) && !(pl.spectating) && !(pl.invulnT > 0 && pl.hp <= 0));
  }

  function canUseAltar(pl) {
    if (!on || !altar || !pl || !playerAlive(pl)) return false;
    if (!canHeal()) return false;
    if (altarUsesInSegment >= 2) return false;
    if (pl.hp / Math.max(1, pl.maxHp) < ALTAR_MIN_FRAC) return false;
    return true;
  }

  function interruptAltar() { altarChannel = null; }

  function tickAltar(dt, pl) {
    if (!on || !altar || !pl || pl.dead) {
      altarChannel = null;
      return;
    }
    const near = G.U.dist2(pl.x, pl.y, altar.x, altar.y) <= Math.max(34, 14 + pl.r) ** 2;
    if (!near || !canUseAltar(pl)) {
      altarChannel = null;
      return;
    }
    if (altarChannel && altarChannel.hpWatch != null && pl.hp < altarChannel.hpWatch) {
      altarChannel = null;
      return;
    }
    if (!altarChannel) {
      altarChannel = { t: 0, need: ALTAR_CHANNEL, hpWatch: pl.hp };
      return;
    }
    altarChannel.hpWatch = Math.min(altarChannel.hpWatch, pl.hp);
    altarChannel.t += dt;
    if (altarChannel.t < altarChannel.need) return;
    altarChannel = null;
    useAltar(pl.uid || meId());
  }

  function useAltar(uid) {
    uid = uid || meId();
    if (!authority()) {
      G.Coop.toHost(['cal', uid]);
      return true;
    }
    return applyAltar(uid);
  }

  function applyAltar(uid) {
    uid = uid || meId();
    if (!canHeal() || altarUsesInSegment >= 2) return false;
    const pl = G.Game && G.Game.player;
    if (uid === meId() && !canUseAltar(pl)) return false;
    const pct = altarHealPct();
    const got = healPuppy(pct);
    if (got <= 0 && !canHeal()) return false;
    altarUsesInSegment++;
    if (uid === meId()) payBlood(uid, pct);
    if (G.Coop.active && G.Coop.isHost) {
      G.Coop.broadcast(['cab', uid, pct, wave, altarUsesInSegment]);
    }
    if (G.Spawner && uid === meId()) {
      G.Spawner.say(G.I18n && G.I18n.f
        ? G.I18n.f('Altar: -{x}% vida → +{x}% al cachorro', Math.round(pct * 100), Math.round(pct * 100))
        : ('Altar: -' + Math.round(pct * 100) + '% → +' + Math.round(pct * 100) + '%'), 2.6, true);
    }
    return true;
  }

  function payBlood(uid, pct) {
    if (uid !== meId()) return;
    const pl = G.Game && G.Game.player;
    if (!pl || pl.dead) return;
    const cost = Math.max(1, Math.round(pl.maxHp * Math.max(0, +pct || 0)));
    const before = pl.hp;
    pl.hp = Math.max(0, pl.hp - cost);
    if (pl.hp <= 0) pl.hp = 0;
    const lost = before - pl.hp;
    if (lost > 0) {
      G.FX.dmgText(pl.x, pl.y - pl.bodyH - 8, '-' + Math.ceil(lost), '#ff5f6d');
      G.FX.ring(pl.x, pl.y, 6, 50, '#ff5f6d', 0.4, 3);
    }
  }

  function syncAltar(uid, pct, w, uses) {
    if (authority() || !uid) return;
    if (uses != null) altarUsesInSegment = Math.max(altarUsesInSegment, +uses || 0);
    payBlood(uid, pct);
  }

  function spawnGuardianCore(x, y) {
    if (!on || !authority()) return false;
    if (guardianCoreHeld || guardianCoreOnGround || guardianCoreDroppedForSegment) return false;
    const px = x != null ? x : aim.x;
    const py = y != null ? y : aim.y - 40;
    if (G.Pickups) G.Pickups.drop('guardian', px, py, 1);
    guardianCoreOnGround = true;
    guardianCoreDroppedForSegment = true;
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['cgd', px, py]);
    if (G.Spawner) {
      G.Spawner.say(G.I18n ? G.I18n.t('¡Núcleo Guardián disponible!') : '¡Núcleo Guardián disponible!', 2.4, true);
    }
    return true;
  }

  function syncCoreDrop(x, y) {
    if (authority()) return;
    guardianCoreOnGround = true;
    guardianCoreDroppedForSegment = true;
  }

  function pickupGuardianCore(player) {
    if (!on || !guardianCoreOnGround) return false;
    if (!authority()) {
      G.Coop.toHost(['cgp']);
      return true;
    }
    if (guardianCoreHeld) return false;
    guardianCoreHeld = true;
    guardianCoreOnGround = false;
    guardianPickup = null;
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['cgh', 1]);
    if (G.Spawner) {
      G.Spawner.say(G.I18n ? G.I18n.t('Núcleo Guardián recogido') : 'Núcleo Guardián recogido', 2.0, true);
    }
    return true;
  }

  function syncCoreHeld(v) {
    guardianCoreHeld = !!v;
    if (guardianCoreHeld) {
      guardianCoreOnGround = false;
      guardianPickup = null;
    }
  }

  function canUseGuardianCore(player) {
    if (!on || hp <= 0 || !guardianCoreHeld) return false;
    if (puppyShield.active) return false;
    if (!player || !playerAlive(player)) return false;
    return G.U.dist2(player.x, player.y, aim.x, aim.y) <= CORE_RANGE * CORE_RANGE;
  }

  function coreBlockReason(player) {
    if (!on) return '';
    if (!guardianCoreHeld) return G.I18n ? G.I18n.t('Aún no tienes el Núcleo Guardián') : 'Aún no tienes el Núcleo Guardián';
    if (puppyShield.active) return G.I18n ? G.I18n.t('Escudo ya activo') : 'Escudo ya activo';
    if (!player || !playerAlive(player)) return '';
    if (G.U.dist2(player.x, player.y, aim.x, aim.y) > CORE_RANGE * CORE_RANGE) {
      return G.I18n ? G.I18n.t('Acércate al cachorro') : 'Acércate al cachorro';
    }
    return '';
  }

  function useGuardianCore(player) {
    if (!on) return false;
    if (!authority()) {
      if (!canUseGuardianCore(player)) return false;
      G.Coop.toHost(['cgu']);
      return true;
    }
    if (usingCore || !canUseGuardianCore(player)) return false;
    usingCore = true;
    guardianCoreHeld = false;
    puppyShield = { active: true, left: SHIELD_DUR, bossBlockReady: true };
    pulseFx = 0.55;
    applyGuardianPulse();
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['cgu', 1, aim.x, aim.y]);
    if (G.Spawner) {
      G.Spawner.say(G.I18n ? G.I18n.t('¡Escudo del cachorro activado!') : '¡Escudo del cachorro activado!', 2.2, true);
    }
    usingCore = false;
    return true;
  }

  function syncCoreUse() {
    if (authority()) return;
    guardianCoreHeld = false;
    puppyShield = { active: true, left: SHIELD_DUR, bossBlockReady: true };
    pulseFx = 0.55;
  }

  function pushEnemy(e, distMin, distMax, stun) {
    if (!e || e.dead) return;
    if ((e.castleKnockImmune || 0) > 0 && e.castleBoss) return;
    const dx = e.x - aim.x, dy = e.y - aim.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    const dist = G.U.rand(distMin, distMax);
    const ox = e.x, oy = e.y;
    let ok = false;
    for (let i = 0; i < 6; i++) {
      const f = 1 - i * 0.2;
      e.x = ox + nx * dist * f;
      e.y = oy + ny * dist * f;
      if (G.World && G.World.collide) G.World.collide(e);
      if (G.World && G.World.isFree && !G.World.isFree(e.x, e.y, e.r || 12)) {
        e.x = ox; e.y = oy;
        continue;
      }
      ok = true;
      break;
    }
    if (!ok) { e.x = ox; e.y = oy; }
    if (stun > 0 && e.applyStun && !e.finalCastleBoss) e.applyStun(stun);
    if (e.castleBoss) e.castleKnockImmune = BOSS_KB_IMMUNE;
    interruptCastleBoss(e);
  }

  function applyGuardianPulse() {
    G.FX.ring(aim.x, aim.y, 12, 160, '#9ad8ff', 0.55, 6);
    G.FX.ring(aim.x, aim.y, 20, 220, '#d7f1ff', 0.4, 4);
    G.Camera.kick(0.55);
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.behavior === 'thief') continue;
      if (e.finalCastleBoss) {
        pushEnemy(e, 40, 60, 0);
        G.Camera.kick(0.85);
        G.FX.dmgText(e.x, e.y - e.bodyH - 8, G.I18n ? G.I18n.t('Ataque interrumpido') : 'Ataque interrumpido', '#9ad8ff', true);
        continue;
      }
      if (e.castleBoss) {
        pushEnemy(e, 70, 90, 0.5);
        G.FX.dmgText(e.x, e.y - e.bodyH - 8, G.I18n ? G.I18n.t('Ataque interrumpido') : 'Ataque interrumpido', '#9ad8ff', true);
        continue;
      }
      if (e.isElite || e.elite) pushEnemy(e, 90, 120, 0.8);
      else pushEnemy(e, 140, 180, 1.2);
      G.FX.burst(e.x, e.y - (e.bodyH || 20) * 0.4, '#ffffff', 8, 90);
    }
  }

  function interruptCastleBoss(enemy) {
    if (!enemy || !enemy.castleBoss) return false;
    let hit = false;
    if (enemy.castleBossWindup != null && enemy.castleBossWindup > 0) {
      enemy.castleBossWindup = null;
      enemy.castleBossSiegeCd = 2.5;
      hit = true;
    }
    if (enemy.finalCastleWindup != null && enemy.finalCastleWindup > 0) {
      enemy.finalCastleWindup = null;
      enemy.finalCastleCd = 1.8;
      hit = true;
    }
    return hit;
  }

  function updateGuardianShield(dt) {
    if (!puppyShield.active) return;
    puppyShield.left -= dt;
    if (puppyShield.left <= 0) {
      puppyShield.active = false;
      puppyShield.left = 0;
      puppyShield.bossBlockReady = false;
    }
  }

  function blockBossHit() {
    if (!(puppyShield.active && puppyShield.bossBlockReady)) return false;
    puppyShield.bossBlockReady = false;
    puppyShield.active = false;
    puppyShield.left = 0;
    G.FX.ring(aim.x, aim.y, 16, 90, '#9ad8ff', 0.5, 7);
    G.FX.burst(aim.x, aim.y - 20, '#d7f1ff', 14);
    G.Camera.kick(0.7);
    if (G.Spawner) {
      G.Spawner.say(G.I18n ? G.I18n.t('¡Escudo roto!') : '¡Escudo roto!', 1.8, true);
    }
    return true;
  }

  function mobBiteMul() {
    return puppyShield.active ? 0.30 : 1;
  }

  function maybeDropCoreAtWaveClear() {
    if (!authority() || !isCoreDropWave(wave)) return;
    if (guardianCoreHeld || guardianCoreOnGround || guardianCoreDroppedForSegment) return;
    spawnGuardianCore(aim.x, aim.y - 36);
  }

  function startBossCombat(s, w) {
    bossLive = true;
    pendingBoss = null;
    const final = w === cfg.waves;
    queued = final ? 0 : Math.max(cfg.dense ? 8 : 6, Math.round(s.n * cfg.escort));
    acc = cfg.dense ? 0.25 : 0.35;
    spawnBoss(s, w);
    if (G.Spawner) {
      G.Spawner.say(G.I18n && G.I18n.f
        ? G.I18n.f('Oleada {x} de {x} · ¡Jefe!', w, cfg.waves)
        : ('Oleada ' + w + ' de ' + cfg.waves + ' · ¡Jefe!'), cfg.dense ? 2.2 : 2.6);
    }
  }

  function openWave(w) {
    wave = w;
    heartsThisWave = 0;
    bossLive = false;
    pendingBoss = null;
    altarChannel = null;
    resetSegment(w);
    const s = spec(w);
    const boss = isBossWave(w);
    if (boss) {
      queued = 0;
      acc = 0;
      prepT = PREP_SECS;
      pendingBoss = s;
      if (G.Spawner) {
        G.Spawner.say(G.I18n && G.I18n.f
          ? G.I18n.f('Oleada {x}: {x} s para comprar o usar el altar', w, PREP_SECS)
          : ('Oleada ' + w + ': ' + PREP_SECS + ' s para comprar o usar el altar'), 3.2);
      }
      return;
    }
    prepT = 0;
    queued = s.n;
    acc = s.gap;
    if (G.Spawner) {
      G.Spawner.say(G.I18n && G.I18n.f
        ? G.I18n.f('Oleada {x} de {x}', w, cfg.waves)
        : ('Oleada ' + w + ' de ' + cfg.waves), cfg.dense ? 2.2 : 2.6);
    }
  }

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
    bossLive = false;
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
    const hpMul = final ? (cfg.finalHpMul || 2.8) : 1;
    e.maxHp = e.hp = Math.round(s.hp * (BOSS_HP_BASE + tier * BOSS_HP_TIER) * m.hp * s.party.bossHp * hpMul);
    e.dmg = s.dmg * BOSS_DMG_MUL * m.dmg * s.party.damage;
    e.spd = Math.min(cfg.dense ? 108 : 100, Math.round(s.spd * (cfg.dense ? 0.95 : 0.92)));
    e.xp = 16 + Math.round(pw);
    e.castleWave = w;
    e.castleBoss = true;
    e.castleBossTier = tier;
    e.castleBossSiegeCd = cfg.dense ? 1.8 : 2.5;
    e.castleBossWindup = null;
    e.castleKnockImmune = 0;
    if (final) dressFinalBoss(e);
    G.EnemyMgr.add(e);
    G.Audio.sfx('boss');
    G.Camera.kick(0.8);
  }

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

  function tick(dt) {
    if (!on || won || hp <= 0) return;
    if (pulseFx > 0) pulseFx -= dt;
    updateGuardianShield(dt);
    if (G.EnemyMgr) {
      for (const e of G.EnemyMgr.all()) {
        if (e.castleKnockImmune > 0) e.castleKnockImmune -= dt;
      }
    }
    const pl = G.Game && G.Game.player;
    if (pl) tickAltar(dt, pl);
    if (G.Coop.active && !G.Coop.isHost) {
      for (const e of G.EnemyMgr.all()) if (e.finalCastleBoss && !e.dead) updateFinalPhase(e);
      return;
    }
    if (prepT > 0) {
      prepT -= dt;
      if (prepT <= 0) {
        prepT = 0;
        if (pendingBoss) startBossCombat(pendingBoss, wave);
      }
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
    maybeDropCoreAtWaveClear();
    if (wave >= cfg.waves) {
      won = true;
      if (G.Game.castleClear) G.Game.castleClear();
      return;
    }
    openWave(wave + 1);
  }

  function net(pair) {
    if (!on || !pair) return;
    hp = Math.max(0, +pair[0] || 0);
    maxHp = Math.max(1, +pair[1] || maxHp);
    if (pair[2]) wave = Math.max(1, Math.min(cfg.waves, +pair[2] || wave));
    warn = Math.max(0, +pair[3] || 0);
    if (pair[4] != null) prepT = Math.max(0, +pair[4] || 0);
    if (pair[5] != null) bossLive = !!pair[5];
    if (pair[6] != null) guardianCoreHeld = !!pair[6];
    if (pair[7] != null) {
      const sh = +pair[7] || 0;
      if (sh > 0) {
        puppyShield.active = true;
        puppyShield.left = sh;
        puppyShield.bossBlockReady = !!pair[8];
      } else if (!authority()) {
        puppyShield.active = false;
        puppyShield.left = 0;
        puppyShield.bossBlockReady = false;
      }
    }
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
    return [
      Math.ceil(hp), Math.ceil(maxHp), wave, Math.round(wind * 10) / 10,
      Math.round(prepT * 10) / 10, bossLive ? 1 : 0,
      guardianCoreHeld ? 1 : 0,
      puppyShield.active ? Math.round(puppyShield.left * 10) / 10 : 0,
      puppyShield.bossBlockReady ? 1 : 0
    ];
  }

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
        e.castleBossWindup = null;
        e.castleBossSiegeCd = Math.max(3.4, 5.4 - (e.castleBossTier || 1) * 0.4);
        if (blockBossHit()) continue;
        const tier = Math.max(1, Math.min(4, e.castleBossTier || bossTier(wave)));
        const pct = 0.06 + tier * 0.015;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
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
        e.finalCastleWindup = null;
        e.finalCastleCd = e.finalPhase === 3 ? 3.2 : 4.4;
        if (blockBossHit()) continue;
        const pct = e.finalPhase === 3 ? 0.14 : 0.10;
        const dmg = Math.round(maxHp * pct);
        hp = Math.max(0, hp - dmg);
        G.Camera.kick(1.1);
        G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 62, dmg, '#ff5f6d');
        if (hp <= 0) return true;
        continue;
      }
      if ((e.castleCd || 0) > 0) { e.castleCd -= dt; continue; }
      const reach = e.r + aim.r;
      if (G.U.dist2(e.x, e.y, aim.x, aim.y) > reach * reach) continue;
      const pw = pressureOf(wave);
      let dmg, cd;
      if (cfg.bite === 'sprint') {
        cd = 0.40;
        const basePct = Math.min(0.05, 0.009 + pw * 0.00082);
        const difficultyMul = G.Difficulty ? G.Difficulty.combat().dmg : 1;
        const finalPct = Math.min(0.065, basePct * difficultyMul);
        dmg = Math.round(maxHp * finalPct * mobBiteMul());
      } else {
        cd = 0.42;
        const flat = Math.max(2, Math.round((e.dmg || 1) * (1.55 + pw * 0.025)));
        const pctBite = Math.round(maxHp * (0.0035 + pw * 0.00014));
        dmg = Math.round((flat + pctBite) * mobBiteMul());
      }
      e.castleCd = cd;
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
    const t = (G.Game && G.Game.st && G.Game.st.time) || 0;
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
    if (puppyShield.active) {
      const a = 0.22 + Math.sin(t * 6) * 0.06;
      const life = Math.max(0, Math.min(1, puppyShield.left / SHIELD_DUR));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#9ad8ff';
      ctx.beginPath();
      ctx.ellipse(0, -H * 0.35, 42, 36, 0, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#d7f1ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -H * 0.35, 40, -Math.PI / 2, -Math.PI / 2 + life * 6.2832);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (pulseFx > 0) {
      const k = 1 - pulseFx / 0.55;
      ctx.globalAlpha = 0.55 * (1 - k);
      ctx.strokeStyle = '#9ad8ff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -10, 30 + k * 160, 0, 6.2832);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const bw = 64;
    const by = -H - 7;
    const frac = maxHp > 0 ? hp / maxHp : 0;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-bw / 2, by, bw, 3.4);
    ctx.fillStyle = frac > 0.35 ? '#5fe08a' : '#ff5f6d';
    ctx.fillRect(-bw / 2, by, bw * frac, 3.4);
    if (puppyShield.active) {
      ctx.fillStyle = '#9ad8ff';
      ctx.fillRect(bw / 2 + 3, by - 1, 5, 5);
    }
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
    if (altar) drawAltar(ctx);
    if (prepT > 0) {
      ctx.save();
      ctx.font = '700 12px Pixelify,"Segoe UI",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      const msg = G.I18n && G.I18n.f
        ? G.I18n.f('Preparación: {x} s', Math.max(1, Math.ceil(prepT)))
        : ('Preparación: ' + Math.max(1, Math.ceil(prepT)) + ' s');
      ctx.strokeText(msg, aim.x, aim.y + 36);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(msg, aim.x, aim.y + 36);
      ctx.restore();
    }
  }

  function drawAltar(ctx) {
    const t = (G.Game && G.Game.st && G.Game.st.time) || 0;
    const actual = altarActualHeal();
    const show = actual > 0 ? Math.round(100 * actual / maxHp) : Math.round(altarHealPct() * 100);
    ctx.save();
    ctx.translate(altar.x, altar.y);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 6, 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 0.28 + Math.sin(t * 3) * 0.08;
    ctx.fillStyle = '#ff5f6d';
    ctx.beginPath();
    ctx.arc(0, -18, 16, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (G.Icons) G.Icons.draw(ctx, 'heart', -10, -30, 20);
    ctx.font = '700 8px Pixelify,"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(show + '%', 0, -34);
    ctx.fillStyle = '#ffd3d8';
    ctx.fillText(show + '%', 0, -34);
    if (altarChannel) {
      const p = Math.min(1, altarChannel.t / altarChannel.need);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(-18, 8, 36, 5);
      ctx.fillStyle = '#ff8ad8';
      ctx.fillRect(-18, 8, 36 * p, 5);
    }
    ctx.restore();
  }

  function balanceOf(id) {
    const p = PRESETS[id] || cfg || PRESETS.castle;
    return {
      mode: p.id, puppyHp: p.puppyHp, waves: p.waves, finalWave: p.waves, bossEvery: p.bossEvery,
      winWave: p.waves + 1, finalHpMul: p.finalHpMul, finalVisualMul: FINAL_VISUAL_MUL,
      bossHpBase: BOSS_HP_BASE, bossHpTier: BOSS_HP_TIER, bossDmgMul: BOSS_DMG_MUL,
      baseCap: p.baseCap, maxCap: 34, bossEscortRatio: p.escort, dense: !!p.dense, bite: p.bite,
      heartRate: p.heartRate, shopHeal: p.shopHeal, heartHeal: HEART_HEAL, heartMaxWave: HEART_MAX_WAVE
    };
  }

  return {
    begin, end, net, snapshot, touch, tick, draw, aim, onBossDown, giveBond, partyScale, dressFinalBoss,
    applyPreset, balanceOf, pressureOf, PRESETS, segmentId, isBossWave, isCoreDropWave,
    heal, canHeal, healPuppy, requestHeal, tryHeartDrop, takeHeart, heartToCandy,
    shopOpen, canBuyHeal, buyHeal, syncShop, shopHealPct,
    canUseAltar, useAltar, applyAltar, payBlood, syncAltar, interruptAltar, altarActualHeal, altarHealPct,
    spawnGuardianCore, pickupGuardianCore, canUseGuardianCore, useGuardianCore, coreBlockReason,
    applyGuardianPulse, updateGuardianShield, interruptCastleBoss,
    syncCoreDrop, syncCoreHeld, syncCoreUse,
    HEART_HEAL, HEART_MAX_WAVE, HEART_RATE: 0.10, SHOP_HEAL: 0.15, ALTAR_MIN_FRAC, PREP_SECS,
    CORE_RANGE, SHIELD_DUR,
    get balance() { return balanceOf(cfg.id); },
    get up() { return on; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get y() { return aim.y; },
    get wave() { return wave; },
    get cleared() { return won; },
    get prepLeft() { return prepT; },
    get bossFight() { return bossLive; },
    get coreHeld() { return guardianCoreHeld; },
    get coreOnGround() { return guardianCoreOnGround; },
    get shield() { return puppyShield; },
    get shopUsed() { return shopUsedInSegment; },
    get shopPriceMul() { return shopMul; },
    get altarUses() { return altarUsesInSegment; },
    get heartsWave() { return heartsThisWave; },
    get warnBoss() { return warnLeft() > 0; },
    get channel() { return altarChannel; }
  };
})();
