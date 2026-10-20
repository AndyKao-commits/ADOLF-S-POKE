/* ============ siege.js — asedio ============
 * Cada jugador tiene un castillo. Se ataca el de los demás.
 * Los monstruos se pueden derrotar, pero no tocan castillos.
 * Si caes, vuelves al tuyo. El mapa tiene borde.
 * Gana quien derriba un castillo. Separado de «Protege al cachorro».
 */
G.Siege = (() => {
  const HALF = 520;
  const MAX_HP = 4500;
  const RESPAWN = 2.4;
  let on = false, castles = [], img = null, ended = false, respawnT = 0, bumpT = 0;

  function slots(n) {
    if (n <= 2) return [{ x: -380, y: 0 }, { x: 380, y: 0 }];
    if (n === 3) return [{ x: 0, y: -360 }, { x: -320, y: 250 }, { x: 320, y: 250 }];
    return [{ x: -300, y: -300 }, { x: 300, y: -300 }, { x: -300, y: 300 }, { x: 300, y: 300 }];
  }

  function meId() { return G.Coop.active ? G.Net.uid : 'me'; }

  function placeAt(pl, c) {
    const d = Math.hypot(c.x, c.y) || 1;
    pl.x = c.x - c.x / d * 70;
    pl.y = c.y - c.y / d * 70;
  }

  function begin(members) {
    on = true; ended = false; respawnT = 0; bumpT = 0;
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
      x: pos[i].x, y: pos[i].y, r: 26, hp: MAX_HP, maxHp: MAX_HP, cd: 0
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
    G.Spawner.say('Asedio: derriba el castillo rival. El tuyo no se toca.', 4);
  }

  function end() { on = false; castles = []; ended = false; }

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
    let win = attackerUid && attackerUid !== c.uid ? attackerUid : null;
    if (!win) {
      const left = castles.find(o => o !== c && o.uid !== 'rival' && o.hp > 0);
      win = left ? left.uid : meId();
    }
    if (G.Game.siegeOver) G.Game.siegeOver({ win, fallen: c.uid });
  }

  /** El anfitrión (o el solo) aplica el golpe. */
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
    if (G.Coop.isHost) G.Coop.broadcast(['ph', uid, dmg]);
    else G.Coop.toHost(['ph', uid, dmg]);
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

  /** Un disparo tuyo. phits evita pegar dos veces con el mismo tiro. */
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

  function tick(dt, pl) {
    if (!on || !pl) return;
    if (pl.dead) {
      respawnT += dt;
      if (respawnT >= RESPAWN) {
        const c = castles.find(x => x.uid === meId());
        if (c) placeAt(pl, c);
        pl.revive(1);
        respawnT = 0;
      }
      return;
    }
    respawnT = 0;
    for (const c of castles) if (c.cd > 0) c.cd -= dt;
    bumpT -= dt;
    const who = meId();
    for (const c of castles) {
      if (c.uid === who || c.hp <= 0 || c.cd > 0) continue;
      if (G.U.dist2(pl.x, pl.y, c.x, c.y) > (pl.r + c.r) * (pl.r + c.r)) continue;
      c.cd = 0.45;
      localHit(c, 8 + pl.level * 2);
    }
    if (G.Coop.active && bumpT <= 0) {
      for (const o of G.Coop.puppets()) {
        if (o.dead) continue;
        if (G.U.dist2(pl.x, pl.y, o.x, o.y) > (pl.r + o.r) * (pl.r + o.r)) continue;
        bumpT = 0.55;
        poke(o.uid, 6 + pl.level * 1.5);
        break;
      }
    }
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

  /** El castillo enemigo más cercano, para que los ataques apunten hacia él. */
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
    begin, end, clamp, contain, smack, strike, tick, net, snapshot, target, drawBorder, drawables, applyHit,
    get up() { return on; },
    get half() { return HALF; }
  };
})();
