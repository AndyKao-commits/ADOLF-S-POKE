/* ============ castle.js — Protege al cachorro ============
 * El castillo se queda quieto. Las oleadas 1 a 50 van a por él.
 * Cada 10 (10, 20, 30, 40 y 50) sale un jefe: al caer, un vínculo para fusionar.
 * Limpiar la oleada abre la siguiente. La 50 ganada acaba la partida.
 * Si su vida llega a cero, se pierde.
 */
G.Castle = (() => {
  const aim = { x: 0, y: 80, r: 34, _vx: 0, _vy: 0, level: 1, dead: false };
  const WAVES = 50, CAP = 12;
  let on = false, hp = 1, maxHp = 1, img = null;
  let wave = 1, queued = 0, acc = 0, won = false, bondWave = 0;

  function spec(w) {
    const m = G.Difficulty ? G.Difficulty.combat() : { hp: 1, dmg: 1, rate: 1 };
    return {
      n: Math.max(1, Math.round((6 + Math.round(w * 0.62)) * m.rate)),
      hp: Math.round(22 + w * 13 + Math.pow(w, 1.32) * 0.9),
      dmg: Math.round((3.6 + w * 0.72) * 10) / 10,
      spd: Math.min(104, Math.round(48 + w * 1.05)),
      gap: Math.max(0.26, 0.8 - w * 0.01)
    };
  }

  function begin() {
    on = true;
    aim.x = 0;
    aim.y = 80;
    aim.dead = false;
    maxHp = 7000;
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
    queued = boss ? Math.max(4, Math.round(s.n * 0.4)) : s.n;
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
    e.maxHp = e.hp = Math.round(s.hp * m.hp);
    e.dmg = s.dmg * m.dmg;
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
    e.maxHp = e.hp = Math.round(s.hp * (8 + tier) * m.hp);
    e.dmg = s.dmg * 1.35 * m.dmg;
    e.spd = Math.min(92, Math.round(s.spd * 0.82));
    e.xp = 16 + w;
    e.castleWave = w;
    e.castleBoss = true;
    G.EnemyMgr.add(e);
    G.Audio.sfx('boss');
    G.Camera.kick(0.8);
  }

  /** Sólo el anfitrión (o el solo) saca la oleada y decide cuándo se ha limpiado. */
  function tick(dt) {
    if (!on || won || hp <= 0) return;
    if (G.Coop.active && !G.Coop.isHost) return;
    const s = spec(wave);
    if (queued > 0) {
      acc += dt;
      let made = 0;
      while (queued > 0 && living() < CAP && acc >= s.gap && made < 2) {
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
  }

  function snapshot() { return [Math.ceil(hp), Math.ceil(maxHp), wave]; }

  /** Los que ya están encima le quitan vida. true = ha caído. */
  function touch(dt) {
    if (!on || hp <= 0) return false;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.remote || e.behavior === 'thief' || e.stunT > 0 || e.siegeBoss) continue;
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
  }

  return {
    begin, end, net, snapshot, touch, tick, draw, aim, onBossDown, giveBond,
    get up() { return on; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get y() { return aim.y; },
    get wave() { return wave; },
    get cleared() { return won; }
  };
})();
