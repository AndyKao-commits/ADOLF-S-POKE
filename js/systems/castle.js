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
      img.src = 'assets/castle-puppy.png';
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
      G.FX.dmgText(aim.x + G.U.rand(-10, 10), aim.y - 70, Math.ceil(dmg), '#ff8b8b');
      if (hp <= 0) return true;
    }
    return false;
  }

  function draw(ctx) {
    if (!on) return;
    const H = 96;
    const W = img && img.complete && img.naturalWidth ? Math.round(H * img.naturalWidth / img.naturalHeight) : 104;
    ctx.save();
    ctx.translate(aim.x, aim.y);
    // Sombra y marco, para que se lea como el sitio que hay que proteger.
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, -4, W * 0.42, 10, 0, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = '#e2b657';
    ctx.lineWidth = 3;
    ctx.strokeRect(-W / 2 - 2, -H - 2, W + 4, H + 4);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, -W / 2, -H, W, H);
    else {
      ctx.fillStyle = '#1a2744';
      ctx.fillRect(-W / 2, -H, W, H);
    }
    const frac = maxHp > 0 ? hp / maxHp : 0;
    const bw = W + 8;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(-bw / 2, 8, bw, 8);
    ctx.fillStyle = frac > 0.35 ? '#5fe08a' : '#ff5f6d';
    ctx.fillRect(-bw / 2, 8, bw * frac, 8);
    ctx.font = '700 11px Pixelify,"Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('Protege al cachorro', 0, 28);
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
