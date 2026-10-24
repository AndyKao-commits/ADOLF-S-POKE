/* ============ mastery-fx.js — brillo de la maestría en la partida ============
 * Solo se ve. No cambia el daño, la vida, la velocidad ni los objetos.
 * Cada jugador enseña un único rango, el más alto, y el de arriba sustituye
 * al de abajo. Las partículas se dibujan aquí: no se sincronizan por la red.
 */
G.MasteryFX = (() => {
  const VALID = new Set(['', 'bronze', 'silver', 'gold', 'diamond']);
  const MIN_WALK = 18;
  const pool = new Map();
  const spare = [];

  const BRONZE = { ring: '#B87333', bright: '#D49A62', duration: 1.2, startRadius: 8, particles: 4, maxAlpha: 0.55 };
  const SILVER = {
    colors: ['#D7DEE8', '#F4F7FF', '#FFFFFF'], maxParticles: 3,
    spawnMin: 0.35, spawnMax: 0.55, lifeMin: 0.5, lifeMax: 0.8,
    sizeMin: 1.5, sizeMax: 2.8, maxAlpha: 0.55
  };
  const GOLD = {
    glowColor: '#FFF1C7', glowAlphaMin: 0.12, glowAlphaMax: 0.18, breatheSeconds: 2.4,
    particleColors: ['#FFF1C7', '#FFFFFF'], maxParticles: 5,
    spawnMin: 0.25, spawnMax: 0.45, lifeMin: 1.2, lifeMax: 2.2, sizeMin: 1.5, sizeMax: 3,
    riseMin: 10, riseMax: 22
  };
  const DIAMOND = {
    glowColor: '#FFD35A', glowAlphaMin: 0.22, glowAlphaMax: 0.32, breatheSeconds: 1.8,
    particleColors: ['#FFD35A', '#FFF0A0', '#FFFFFF'], maxParticles: 12,
    spawnMin: 0.10, spawnMax: 0.22, lifeMin: 1.0, lifeMax: 2.0, sizeMin: 2, sizeMax: 4,
    riseMin: 10, riseMax: 22, groundColor: '#FFD35A', groundAlphaMin: 0.16, groundAlphaMax: 0.24
  };

  function valid(v) { return VALID.has(v) ? v : ''; }

  function slot(p) {
    let s = pool.get(p);
    if (!s) { s = { parts: [], ring: null, wait: 0 }; pool.set(p, s); }
    return s;
  }

  function take() {
    return spare.pop() || { x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, size: 2, color: '#fff', front: false, sway: 0, ph: 0 };
  }
  function recycle(q) { if (spare.length < 64) spare.push(q); }

  function cap(n) {
    if (G.Settings && G.Settings.fx === 0) return Math.max(1, Math.floor(n / 2));
    return n;
  }
  function onScreen(p) {
    return !G.Camera || !G.Camera.sees || G.Camera.sees(p.x, p.y, 80);
  }
  function gameTime() {
    return (G.Game && G.Game.st && G.Game.st.time) || 0;
  }
  function masterySeed(p) {
    let h = (p.dex | 0) * 17;
    const u = p.uid || '';
    for (let i = 0; i < u.length; i++) h = (h * 33 + u.charCodeAt(i)) >>> 0;
    return h % 200;
  }
  function breathe(time, seconds) {
    return 0.5 + Math.sin(time * Math.PI * 2 / seconds) * 0.5;
  }
  function masteryFxAlpha(p) {
    if (!p || p.dead) return 0;
    let alpha = 1;
    if (p.flash > 0) alpha *= 0.35;
    if (p.invuln > 0) alpha *= 0.45;
    if (p.reviveSafe > 0) alpha *= 0.30;
    return alpha;
  }
  function withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const k = a < 0 ? 0 : a > 1 ? 1 : a;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + k.toFixed(3) + ')';
  }
  function pulse(p, cfg) {
    return breathe(gameTime() + masterySeed(p) * 0.01, cfg.breatheSeconds);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function clear(p) {
    const s = pool.get(p);
    if (!s) return;
    for (const q of s.parts) recycle(q);
    s.parts.length = 0;
    s.ring = null;
    s.wait = 0;
  }
  function reset() { pool.clear(); spare.length = 0; }

  function init(p) {
    if (!p) return;
    p.masteryRank = valid(p.masteryRank);
    clear(p);
  }

  function startBronze(p) {
    const s = slot(p);
    const n = cap(3 + ((Math.random() * 2) | 0));
    const bits = [];
    for (let i = 0; i < n && i < BRONZE.particles; i++) bits.push({ a: Math.random() * Math.PI * 2, size: rand(1.6, 2.6) });
    s.ring = { t: 0, bits };
  }
  function onSpawn(p) { if (p && p.masteryRank === 'bronze' && !p.dead) startBronze(p); }
  function onRevive(p) { if (p && p.masteryRank === 'bronze' && !p.dead) startBronze(p); }

  function tick(parts, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.t += dt;
      q.x += q.vx * dt;
      q.y += (q.vy + Math.sin(q.t * 4 + q.ph) * q.sway) * dt;
      if (q.t >= q.life) { recycle(q); parts.splice(i, 1); }
    }
  }
  function due(s, dt, min, max) {
    if (!s.wait) s.wait = rand(min, max);
    s.wait -= dt;
    if (s.wait > 0) return false;
    s.wait = rand(min, max);
    return true;
  }
  function pushMote(s, p, cfg, behindFeet) {
    const q = take();
    if (behindFeet) {
      const back = (p.moveAngle || 0) + Math.PI;
      q.x = p.x + Math.cos(back) * rand(2, 7);
      q.y = p.y + Math.sin(back) * rand(1, 4) * 0.4;
      q.vx = Math.cos(back) * rand(6, 14);
      q.vy = Math.sin(back) * rand(4, 10) - rand(6, 12);
    } else {
      q.x = p.x + (Math.random() * 2 - 1) * p.r * 1.6;
      q.y = p.y - Math.random() * (p.bodyH || 28) * 0.75;
      q.vx = rand(-8, 8);
      q.vy = -rand(cfg.riseMin, cfg.riseMax);
    }
    q.t = 0;
    q.life = rand(cfg.lifeMin, cfg.lifeMax);
    q.size = rand(cfg.sizeMin, cfg.sizeMax);
    q.color = pick(cfg.colors || cfg.particleColors);
    q.front = Math.random() < 0.18;
    q.sway = rand(4, 10);
    q.ph = Math.random() * 6.28;
    s.parts.push(q);
  }

  function updateBronze(p, dt) {
    const s = slot(p);
    if (!s.ring) return;
    s.ring.t += dt;
    if (s.ring.t >= BRONZE.duration) s.ring = null;
  }
  function updateSilver(p, dt) {
    const s = slot(p);
    tick(s.parts, dt);
    const moving = !!(p.walking && p.spd > MIN_WALK);
    if (!moving) { s.wait = 0; return; }
    if (!onScreen(p) || s.parts.length >= cap(SILVER.maxParticles)) return;
    if (due(s, dt, SILVER.spawnMin, SILVER.spawnMax)) {
      if (s.parts.length < cap(SILVER.maxParticles)) pushMote(s, p, SILVER, true);
    }
  }
  function updateMotes(p, dt, cfg) {
    const s = slot(p);
    tick(s.parts, dt);
    const lim = cap(cfg.maxParticles);
    while (s.parts.length > lim) recycle(s.parts.pop());
    if (!onScreen(p) || s.parts.length >= lim) return;
    if (due(s, dt, cfg.spawnMin, cfg.spawnMax) && s.parts.length < lim) pushMote(s, p, cfg, false);
  }
  function updateGold(p, dt) { updateMotes(p, dt, GOLD); }
  function updateDiamond(p, dt) { updateMotes(p, dt, DIAMOND); }

  function update(p, dt) {
    if (!p) return;
    if (p.dead) { clear(p); return; }
    switch (p.masteryRank) {
      case 'bronze': updateBronze(p, dt); break;
      case 'silver': updateSilver(p, dt); break;
      case 'gold': updateGold(p, dt); break;
      case 'diamond': updateDiamond(p, dt); break;
      default: clear(p);
    }
  }

  function drawGlow(ctx, p, cfg, mul) {
    const beat = pulse(p, cfg);
    const alpha = (cfg.glowAlphaMin + (cfg.glowAlphaMax - cfg.glowAlphaMin) * beat) * mul;
    const rx = Math.max(cfg === DIAMOND ? 38 : 30, p.r * (cfg === DIAMOND ? 2.6 : 2.2));
    const ry = Math.max(cfg === DIAMOND ? 30 : 24, (p.bodyH || 28) * (cfg === DIAMOND ? 0.82 : 0.72));
    const y = p.y - (p.bodyH || 28) * 0.45;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.scale(1, ry / rx);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gradient.addColorStop(0, withAlpha(cfg.glowColor, alpha));
    gradient.addColorStop(0.45, withAlpha(cfg.glowColor, alpha * 0.55));
    gradient.addColorStop(1, withAlpha(cfg.glowColor, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawParts(ctx, p, front, maxAlpha, mul) {
    const s = pool.get(p);
    if (!s) return;
    for (const q of s.parts) {
      if (!!q.front !== front) continue;
      const a = maxAlpha * (1 - q.t / q.life) * mul;
      if (a <= 0.01) continue;
      ctx.fillStyle = withAlpha(q.color, a);
      ctx.fillRect(q.x - q.size * 0.5, q.y - q.size * 0.5, q.size, q.size);
    }
  }
  function drawBronze(ctx, p, mul) {
    const s = pool.get(p);
    if (!s || !s.ring) return;
    const k = Math.min(1, s.ring.t / BRONZE.duration);
    const endR = Math.max(42, p.r * 2.6);
    const rad = BRONZE.startRadius + (endR - BRONZE.startRadius) * k;
    const a = BRONZE.maxAlpha * (1 - k) * mul;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = withAlpha(BRONZE.bright, a);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(BRONZE.ring, a * 0.85);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.86, rad * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const b of s.ring.bits) {
      const d = rad * (0.45 + 0.5 * k);
      ctx.fillStyle = withAlpha(BRONZE.bright, a);
      ctx.fillRect(Math.cos(b.a) * d - 1, Math.sin(b.a) * d * 0.4 - 1, b.size, b.size);
    }
    ctx.restore();
  }
  function drawDiamondGround(ctx, p, mul) {
    const beat = pulse(p, DIAMOND);
    const alpha = (DIAMOND.groundAlphaMin + (DIAMOND.groundAlphaMax - DIAMOND.groundAlphaMin) * beat) * mul;
    const w = Math.max(42, p.r * 2.8);
    const h = w * 0.28;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, w * 0.15, 0, 0, w * 0.5);
    g.addColorStop(0, withAlpha(DIAMOND.groundColor, alpha));
    g.addColorStop(1, withAlpha(DIAMOND.groundColor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function showing() {
    const s = G.Game && G.Game.state;
    return s !== 'over' && s !== 'ui';
  }
  function drawGround(ctx, p) {
    if (!showing()) return;
    const mul = masteryFxAlpha(p);
    if (mul <= 0) return;
    switch (p.masteryRank) {
      case 'bronze': drawBronze(ctx, p, mul); break;
      case 'diamond': drawDiamondGround(ctx, p, mul); break;
    }
  }
  function drawBehind(ctx, p) {
    if (!showing()) return;
    const mul = masteryFxAlpha(p);
    if (mul <= 0) return;
    switch (p.masteryRank) {
      case 'silver': drawParts(ctx, p, false, SILVER.maxAlpha, mul); break;
      case 'gold': drawGlow(ctx, p, GOLD, mul); drawParts(ctx, p, false, 0.7, mul); break;
      case 'diamond': drawGlow(ctx, p, DIAMOND, mul); drawParts(ctx, p, false, 0.85, mul); break;
    }
  }
  function drawFront(ctx, p) {
    if (!showing()) return;
    const mul = masteryFxAlpha(p);
    if (mul <= 0) return;
    switch (p.masteryRank) {
      case 'silver': drawParts(ctx, p, true, SILVER.maxAlpha, mul); break;
      case 'gold': drawParts(ctx, p, true, 0.7, mul); break;
      case 'diamond': drawParts(ctx, p, true, 0.85, mul); break;
    }
  }

  return { valid, init, update, drawGround, drawBehind, drawFront, onSpawn, onRevive, clear, reset };
})();
