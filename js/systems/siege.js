/* ============ siege.js — asedio ============
 * Cada jugador tiene un castillo y sube de nivel por su cuenta.
 * Los monstruos salen de cada castillo: atacan a los demás, no a los suyos.
 * A los 3 minutos un jefe en el centro ataca sólo a jugadores.
 * Gana quien derriba un castillo (un jugador, o el dueño de sus monstruos).
 */
G.Siege = (() => {
  const HALF = 832;
  const MAX_HP = 2400;
  const RESPAWN = 2.4;
  const CREEP_CAP = 4;
  const BOSS_AT = 180;
  let on = false, castles = [], img = null, ended = false, respawnT = 0, bumpT = 0;
  let bossSpawned = false, bossHit = new Map(), bestUid = null, best = 0;
  const pk = {};

  function slots(n) {
    if (n <= 2) return [{ x: -620, y: 0 }, { x: 620, y: 0 }];
    if (n === 3) return [{ x: 0, y: -580 }, { x: -520, y: 400 }, { x: 520, y: 400 }];
    return [{ x: -480, y: -480 }, { x: 480, y: -480 }, { x: -480, y: 480 }, { x: 480, y: 480 }];
  }

  function meId() { return G.Coop.active ? G.Net.uid : 'me'; }
  function authority() { return !G.Coop.active || G.Coop.isHost; }

  /** Monstruo de este jugador: sus ataques lo atraviesan y no le hacen nada. */
  function ally(e, who) {
    if (!on || !e || !e.siegeCreep || !e.owner) return false;
    const uid = !who ? meId() : (typeof who === 'string' ? who : (who.uid || 'me'));
    return e.owner === uid;
  }

  function placeAt(pl, c) {
    const d = Math.hypot(c.x, c.y) || 1;
    pl.x = c.x - c.x / d * 70;
    pl.y = c.y - c.y / d * 70;
  }

  function begin(members) {
    on = true; ended = false; respawnT = 0; bumpT = 0;
    bossSpawned = false; bossHit = new Map(); bestUid = null; best = 0;
    for (const k in pk) delete pk[k];
    let people;
    if (G.Coop.active && members && members.length) {
      people = members.slice(0, 4).map((m, i) => ({
        uid: m.uid, name: m.name || '?', color: G.Coop.COLORS[i % G.Coop.COLORS.length]
      }));
    } else {
      const name = (G.Social.me && G.Social.me.name) || 'Tú';
      people = [
        { uid: 'me', name, color: '#ffcb3d' },
        { uid: 'rival', name: 'Castillo rival', color: '#ff6b6b' }
      ];
    }
    const pos = slots(people.length);
    castles = people.map((p, i) => ({
      uid: p.uid, name: p.name, color: p.color,
      x: pos[i].x, y: pos[i].y, r: 26, hp: MAX_HP, maxHp: MAX_HP, cd: 0, spawnT: 0.35
    }));
    const mine = castles.find(c => c.uid === meId()) || castles[0];
    const pl = G.Game.player;
    if (pl && mine) placeAt(pl, mine);
    if (G.Coop.active) {
      for (const c of castles) {
        if (c.uid === meId()) continue;
        const m = G.Coop.mate(c.uid);
        if (!m || !m.pl) continue;
        placeAt(m.pl, c);
        if (m.pl.net) { m.pl.net.x = m.pl.x; m.pl.net.y = m.pl.y; }
      }
    }
    if (!img) { img = new Image(); img.src = 'assets/castle-puppy.png?v=char'; }
    G.Spawner.say('Asedio: los monstruos salen de los castillos. El jefe del centro no toca castillos.', 4);
  }

  function end() {
    on = false; castles = []; ended = false; bossSpawned = false;
    bossHit = new Map(); bestUid = null; best = 0;
  }

  function clamp(e) {
    if (!on || !e) return;
    const r = e.r || 12;
    e.x = G.U.clamp(e.x, -HALF + r, HALF - r);
    e.y = G.U.clamp(e.y, -HALF + r, HALF - r);
  }

  function contain() {
    if (!on) return;
    if (G.Game.player) clamp(G.Game.player);
    for (const e of G.EnemyMgr.all()) clamp(e);
  }

  function clampDmg(n) { return Math.max(1, Math.min(800, Math.round(+n || 0))); }

  function fall(c, attackerUid) {
    if (ended) return;
    ended = true;
    let win = attackerUid && attackerUid !== c.uid && attackerUid !== 'rival' ? attackerUid : null;
    if (!win) {
      const left = castles.find(o => o !== c && o.uid !== 'rival' && o.hp > 0);
      win = left ? left.uid : '';
    }
    if (G.Game.siegeOver) G.Game.siegeOver({ win: win || '', fallen: c.uid });
  }

  /** El anfitrión (o el solo) aplica el golpe. El jefe no pasa por aquí. */
  function applyHit(uid, dmg, attackerUid) {
    if (!on || ended) return;
    const c = castles.find(x => x.uid === uid);
    if (!c || c.hp <= 0 || attackerUid === c.uid) return;
    dmg = clampDmg(dmg);
    c.hp = Math.max(0, c.hp - dmg);
    G.FX.dmgText(c.x + G.U.rand(-8, 8), c.y - 40, dmg, '#ff8b8b');
    if (c.hp <= 0) fall(c, attackerUid);
  }

  function localHit(c, dmg) {
    const who = meId();
    if (c.uid === who) return;
    if (!G.Coop.active || G.Coop.isHost) applyHit(c.uid, dmg, who);
    else G.Coop.toHost(['sg', c.uid, clampDmg(dmg), who]);
  }

  function poke(uid, dmg) {
    if (!G.Coop.active || uid === meId()) return;
    dmg = clampDmg(dmg);
    const ev = ['ph', uid, dmg, meId()];
    if (G.Coop.isHost) G.Coop.broadcast(ev);
    else G.Coop.toHost(ev);
  }

  function smack(pl, reach, dmg) {
    if (!on || ended || !pl || pl.dead) return;
    const who = meId();
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      if (G.U.dist2(pl.x, pl.y, c.x, c.y) > (reach + c.r) * (reach + c.r)) continue;
      localHit(c, dmg);
    }
    if (!G.Coop.active) return;
    for (const o of G.Coop.puppets()) {
      if (o.dead) continue;
      if (G.U.dist2(pl.x, pl.y, o.x, o.y) <= (reach + o.r) * (reach + o.r)) poke(o.uid, dmg * 0.55);
    }
  }

  function strike(p) {
    if (!on || ended || !p || p.ghost || !p.friendly) return;
    if (!p.phits) p.phits = new Set();
    const who = meId();
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      const key = 'sg' + c.uid;
      if (p.phits.has(key)) continue;
      if (G.U.dist2(p.x, p.y, c.x, c.y) > (p.r + c.r) * (p.r + c.r)) continue;
      p.phits.add(key);
      localHit(c, p.dmg);
    }
    if (!G.Coop.active) return;
    for (const o of G.Coop.puppets()) {
      if (o.dead) continue;
      const key = 'pl' + o.uid;
      if (p.phits.has(key)) continue;
      if (G.U.dist2(p.x, p.y, o.x, o.y) > (p.r + o.r) * (p.r + o.r)) continue;
      p.phits.add(key);
      poke(o.uid, p.dmg * 0.65);
    }
  }

  function grant(uid, xp, coins) {
    xp = Math.max(0, Math.round(+xp || 0));
    coins = Math.max(0, Math.round(+coins || 0));
    if (!uid || uid === 'rival' || (!xp && !coins)) return;
    if (uid === meId()) {
      const pl = G.Game.player;
      if (!pl) return;
      if (xp && G.Game.noteXp) G.Game.noteXp(pl.gainXp(xp));
      if (coins) pl.coins += coins;
      if (xp) G.FX.dmgText(pl.x, pl.y - pl.bodyH - 18, '+' + xp, '#7ec8ff');
      if (coins) G.FX.dmgText(pl.x, pl.y - pl.bodyH - 6, '+' + coins, '#ffd23f');
      return;
    }
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['rw', uid, xp, coins]);
  }

  function grantItem(uid, id) {
    if (!uid || uid === 'rival' || !id) return;
    if (uid === meId()) { if (G.Game.giveItem) G.Game.giveItem(id); return; }
    if (G.Coop.active && G.Coop.isHost) G.Coop.broadcast(['it', uid, id]);
  }

  function onCreepDown(e) {
    if (!authority() || !e) return;
    const who = e.lastUid;
    if (!who || who === e.owner || who === 'rival') return;
    grant(who, 6, 0);
  }

  function noteBoss(uid, dmg) {
    if (!on || !uid || uid === 'rival' || dmg <= 0) return;
    let row = bossHit.get(uid);
    if (!row) bossHit.set(uid, row = { dmg: 0 });
    row.dmg += dmg;
    if (row.dmg > best) { best = row.dmg; bestUid = uid; }
  }

  function onBossDown() {
    if (!authority()) return;
    let sum = 0;
    for (const row of bossHit.values()) sum += row.dmg;
    if (sum > 0) {
      for (const [uid, row] of bossHit) {
        if (row.dmg <= 0) continue;
        const xp = Math.round(80 * row.dmg / sum);
        const coins = Math.round(40 * row.dmg / sum);
        grant(uid, xp > 0 ? xp : 1, coins > 0 ? coins : 1);
      }
      if (bestUid) grantItem(bestUid, G.Items.roll());
    }
    bossHit = new Map(); bestUid = null; best = 0;
  }

  /** Matar a un jugador: poca experiencia, y menos si es siempre el mismo. */
  function playerDown(attacker, victim) {
    if (!on || !attacker || !victim || attacker === victim || attacker === 'rival') return;
    if (G.Coop.active && !G.Coop.isHost) { G.Coop.toHost(['pk', attacker, victim]); return; }
    const key = attacker + '|' + victim;
    const n = pk[key] || 0;
    pk[key] = n + 1;
    grant(attacker, n === 0 ? 18 : n === 1 ? 9 : 4, 0);
  }

  function owned(uid) {
    let n = 0;
    for (const e of G.EnemyMgr.all()) if (!e.dead && e.siegeCreep && e.owner === uid) n++;
    return n;
  }

  function summon(c, time) {
    const SKIP = new Set(['thief', 'healer', 'shielder', 'summoner', 'bomber']);
    let bag = G.Enemies.bagAt(Math.min(160, time || 0)).filter(d => !SKIP.has(d.behavior));
    if (!bag.length) bag = G.Enemies.bagAt(0);
    const def = G.U.pick(bag);
    const d = Math.hypot(c.x, c.y) || 1;
    const dist = 56 + Math.random() * 16;
    const x = G.U.clamp(c.x - c.x / d * dist, -HALF + 24, HALF - 24);
    const y = G.U.clamp(c.y - c.y / d * dist, -HALF + 24, HALF - 24);
    const e = new G.Enemy(def, x, y, { hp: 1, dmg: 1, spd: 1 });
    const grow = Math.floor((time || 0) / 45);
    e.maxHp = e.hp = 18 + grow * 6;
    e.dmg = 4 + grow;
    e.spd = 64;
    e.xp = 6;
    e.flying = true;
    e.owner = c.uid;
    e.ring = c.color;
    e.siegeCreep = true;
    G.EnemyMgr.add(e);
  }

  function maybeBoss(time) {
    if (bossSpawned || time < BOSS_AT) return;
    bossSpawned = true;
    const def = G.Enemies.bossMob(0);
    const e = new G.Enemy(def, 0, 0, { hp: 1, dmg: 1, spd: 1 }, true);
    e.maxHp = e.hp = 1200;
    e.dmg = 12;
    e.spd = 68;
    e.xp = 0;
    e.siegeBoss = true;
    G.EnemyMgr.add(e);
    G.Spawner.say('¡Jefe en el centro! Sólo ataca a jugadores.', 3.4);
    G.Audio.sfx('boss');
    G.Camera.kick(1.1);
  }

  function creepTouch(dt) {
    for (const e of G.EnemyMgr.all()) {
      if (!on || e.dead || e.remote || !e.siegeCreep) continue;
      if ((e.castleCd || 0) > 0) { e.castleCd -= dt; continue; }
      for (const c of castles) {
        if (c.uid === e.owner || c.hp <= 0) continue;
        const reach = e.r + c.r;
        if (G.U.dist2(e.x, e.y, c.x, c.y) > reach * reach) continue;
        e.castleCd = 0.5;
        applyHit(c.uid, Math.max(2, Math.round(e.dmg)), e.owner);
        if (!on) return;
        break;
      }
    }
  }

  function tickWorld(dt, time) {
    if (!on) return;
    for (const c of castles) {
      if (!on || c.hp <= 0) continue;
      c.spawnT -= dt;
      if (c.spawnT > 0) continue;
      if (owned(c.uid) >= CREEP_CAP) { c.spawnT = 0.45; continue; }
      c.spawnT = 1.65;
      summon(c, time);
    }
    if (on) creepTouch(dt);
    if (on) maybeBoss(time);
  }

  function tick(dt, pl, time) {
    if (!on || !pl) return;
    if (pl.dead) {
      respawnT += dt;
      if (respawnT >= RESPAWN) {
        const c = castles.find(x => x.uid === meId());
        if (c) placeAt(pl, c);
        pl.revive(1);
        respawnT = 0;
      }
    } else {
      respawnT = 0;
      for (const c of castles) if (c.cd > 0) c.cd -= dt;
      bumpT -= dt;
      const who = meId();
      for (const c of castles) {
        if (!on || c.uid === who || c.hp <= 0 || c.cd > 0) continue;
        if (G.U.dist2(pl.x, pl.y, c.x, c.y) > (pl.r + c.r) * (pl.r + c.r)) continue;
        c.cd = 0.45;
        localHit(c, 8 + pl.level * 2);
      }
      if (on && G.Coop.active && bumpT <= 0) {
        for (const o of G.Coop.puppets()) {
          if (o.dead) continue;
          if (G.U.dist2(pl.x, pl.y, o.x, o.y) > (pl.r + o.r) * (pl.r + o.r)) continue;
          bumpT = 0.55;
          poke(o.uid, 6 + pl.level * 1.5);
          break;
        }
      }
    }
    if (on && authority()) tickWorld(dt, time || 0);
  }

  /** A quién va este monstruo: nunca a su castillo, a su dueño ni a otros monstruos. El jefe, al jugador vivo más cercano. */
  function aimFor(e, players) {
    if (!on || !e || e.dead) return null;
    if (e.siegeBoss) {
      let best = null, bd = Infinity;
      for (const p of players) {
        if (!p || p.dead) continue;
        const d = G.U.dist2(e.x, e.y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    if (!e.siegeCreep) return null;
    let best = null, bd = Infinity, castle = false;
    for (const c of castles) {
      if (c.uid === e.owner || c.hp <= 0) continue;
      const d = G.U.dist2(e.x, e.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; castle = true; }
    }
    for (const p of players) {
      if (!p || p.dead) continue;
      if ((p.uid || 'me') === e.owner) continue;
      const d = G.U.dist2(e.x, e.y, p.x, p.y);
      if (d < bd) { bd = d; best = p; castle = false; }
    }
    if (!best) return null;
    if (!castle) return best;
    return { x: best.x, y: best.y, r: best.r, dead: false, level: 1, _vx: 0, _vy: 0, hurt() {} };
  }

  function net(list) {
    if (!on || !list) return;
    list.forEach((pair, i) => {
      if (!castles[i] || !pair) return;
      castles[i].hp = Math.max(0, +pair[0] || 0);
      castles[i].maxHp = Math.max(1, +pair[1] || castles[i].maxHp);
    });
  }

  function snapshot() { return castles.map(c => [Math.ceil(c.hp), Math.ceil(c.maxHp)]); }

  function target(x, y, range) {
    if (!on || ended) return null;
    const who = meId();
    let best = null, bd = range * range;
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0) continue;
      const d = G.U.dist2(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? { x: best.x, y: best.y, r: best.r, dead: false } : null;
  }

  function drawOne(ctx, c) {
    const H = 46;
    const ready = img && img.complete && img.naturalWidth;
    const W = ready ? Math.round(H * img.naturalWidth / img.naturalHeight) : 96;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(0, -1, 34, 10, 0, 0, 6.2832);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 7, 0, 0, 6.2832);
    ctx.fill();
    if (ready) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, -W / 2, -H, W, H);
      ctx.imageSmoothingEnabled = false;
    }
    const frac = c.maxHp > 0 ? c.hp / c.maxHp : 0;
    const bw = 54, by = -H - 6;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(-bw / 2, by, bw, 3.4);
    ctx.fillStyle = frac > 0.35 ? '#5fe08a' : '#ff5f6d';
    ctx.fillRect(-bw / 2, by, bw * frac, 3.4);
    ctx.font = '700 8px Pixelify,"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(c.name, 0, by - 2);
    ctx.fillStyle = c.color;
    ctx.fillText(c.name, 0, by - 2);
    ctx.restore();
  }

  function drawBorder(ctx) {
    if (!on) return;
    const B = 2400;
    ctx.save();
    ctx.fillStyle = 'rgba(6,14,8,.72)';
    ctx.fillRect(-HALF - B, -HALF - B, HALF * 2 + B * 2, B);
    ctx.fillRect(-HALF - B, HALF, HALF * 2 + B * 2, B);
    ctx.fillRect(-HALF - B, -HALF, B, HALF * 2);
    ctx.fillRect(HALF, -HALF, B, HALF * 2);
    ctx.strokeStyle = '#e2b657';
    ctx.lineWidth = 8;
    ctx.strokeRect(-HALF, -HALF, HALF * 2, HALF * 2);
    ctx.restore();
  }

  function drawables() {
    if (!on) return [];
    return castles.map(c => ({ y: c.y, ent: { draw(ctx) { drawOne(ctx, c); } } }));
  }

  return {
    begin, end, clamp, contain, smack, strike, tick, net, snapshot, target, aimFor, drawBorder, drawables, applyHit,
    onCreepDown, onBossDown, noteBoss, playerDown, ally,
    get up() { return on; },
    get half() { return HALF; }
  };
})();
