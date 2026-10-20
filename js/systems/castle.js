/* ============ castle.js — Protege al cachorro ============
 * El castillo se queda quieto. Los monstruos van a por él.
 * Si su vida llega a cero, se acaba la partida.
 */
G.Castle = (() => {
  const aim = { x: 0, y: 80, r: 34, _vx: 0, _vy: 0, level: 1, dead: false };
  let on = false, hp = 1, maxHp = 1, img = null;

  function begin() {
    on = true;
    aim.x = 0;
    aim.y = 80;
    aim.dead = false;
    maxHp = 7000;
    hp = maxHp;
    if (!img) {
      img = new Image();
      img.src = 'assets/castle-puppy.png?v=char';
    }
  }

  function end() { on = false; }

  /** Vida que manda el anfitrión (los demás sólo la dibujan). */
  function net(pair) {
    if (!on || !pair) return;
    hp = Math.max(0, +pair[0] || 0);
    maxHp = Math.max(1, +pair[1] || maxHp);
  }

  /** Los que ya están encima le quitan vida. true = ha caído. */
  function touch(dt) {
    if (!on || hp <= 0) return false;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.remote || e.behavior === 'thief' || e.stunT > 0) continue;
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
    // Personaje tumbado, del tamaño de los demás, no un cuadro.
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
    begin, end, net, touch, draw, aim,
    get up() { return on; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get y() { return aim.y; }
  };
})();
