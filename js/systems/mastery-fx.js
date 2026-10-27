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

  const BRONZE = { ring: '#FF9A3C', bright: '#FFE7C2', duration: 1.35, startRadius: 14, particles: 8, maxAlpha: 1 };
  const SILVER = {
    colors: ['#FFFFFF', '#EAF4FF', '#FFFFFF'], maxParticles: 14,
    spawnMin: 0.06, spawnMax: 0.12, lifeMin: 0.8, lifeMax: 1.35,
    sizeMin: 3, sizeMax: 5.2, maxAlpha: 1,
    glowColor: '#FFFFFF', glowAlphaMin: 0.42, glowAlphaMax: 0.66, breatheSeconds: 1.6,
    groundColor: '#F4F8FF'
  };
  const GOLD = {
    glowColor: '#FFD24A', glowAlphaMin: 0.66, glowAlphaMax: 0.92, breatheSeconds: 1.5,
    particleColors: ['#FFD24A', '#FFFFFF'], maxParticles: 18,
    spawnMin: 0.05, spawnMax: 0.10, lifeMin: 0.9, lifeMax: 1.5, sizeMin: 3.2, sizeMax: 5.6,
    riseMin: 22, riseMax: 40, groundColor: '#FFD24A'
  };
  const DIAMOND = {
    glowColor: '#FFB400', glowAlphaMin: 0.82, glowAlphaMax: 1, breatheSeconds: 1.15,
    particleColors: ['#FFD35A', '#FFF6C8', '#FFFFFF'], maxParticles: 26,
    spawnMin: 0.03, spawnMax: 0.07, lifeMin: 0.8, lifeMax: 1.45, sizeMin: 3.4, sizeMax: 6.2,
    riseMin: 24, riseMax: 46, groundColor: '#FFC83A', groundAlphaMin: 0.68, groundAlphaMax: 0.95
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
    if (!onScreen(p) || s.parts.length >= cap(SILVER.maxParticles)) return;
    const slow = moving ? 1 : 1.8;
    if (due(s, dt, SILVER.spawnMin * slow, SILVER.spawnMax * slow)) {
      if (s.parts.length < cap(SILVER.maxParticles)) pushMote(s, p, SILVER, moving);
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
    const reach = cfg === DIAMOND ? 4.4 : cfg === GOLD ? 3.7 : 3.1;
    const rx = Math.max(cfg === DIAMOND ? 78 : cfg === GOLD ? 64 : 52, p.r * reach);
    const ry = Math.max(cfg === DIAMOND ? 64 : cfg === GOLD ? 52 : 42, (p.bodyH || 28) * (cfg === DIAMOND ? 1.35 : cfg === GOLD ? 1.15 : 1));
    const y = p.y - (p.bodyH || 28) * 0.48;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, y);
    ctx.scale(1, ry / rx);
    const gradient = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
    gradient.addColorStop(0, withAlpha(cfg.glowColor, alpha));
    gradient.addColorStop(0.38, withAlpha(cfg.glowColor, alpha * 0.72));
    gradient.addColorStop(0.72, withAlpha(cfg.glowColor, alpha * 0.28));
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
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    s.parts.forEach((q, i) => {
      if (!!q.front !== front) return;
      const a = maxAlpha * (1 - q.t / q.life) * mul;
      if (a <= 0.01) return;
      const sz = q.size;
      ctx.fillStyle = withAlpha(q.color, a * 0.55);
      ctx.fillRect(q.x - sz, q.y - sz, sz * 2, sz * 2);
      ctx.fillStyle = withAlpha(q.color, a);
      ctx.fillRect(q.x - sz * 0.5, q.y - sz * 0.5, sz, sz);
      if (p.masteryRank === 'diamond' && i % 2 === 0) {
        ctx.fillRect(q.x - sz * 1.6, q.y - sz * 0.32, sz * 3.2, sz * 0.64);
        ctx.fillRect(q.x - sz * 0.32, q.y - sz * 1.6, sz * 0.64, sz * 3.2);
      }
    });
    ctx.restore();
  }
  function drawBronze(ctx, p, mul) {
    const beat = breathe(gameTime() + masterySeed(p) * 0.01, 1.7);
    const rad = Math.max(42, p.r * 2.6);
    const a = (0.82 + beat * 0.18) * mul;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = withAlpha(BRONZE.ring, a * 0.28);
    ctx.beginPath();
    ctx.ellipse(0, 0, rad, rad * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(BRONZE.ring, a * 0.7);
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 1.16, rad * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(BRONZE.bright, a);
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad, rad * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    const spin = gameTime() * 1.8;
    for (let i = 0; i < 6; i++) {
      const ang = spin + i * Math.PI / 3;
      ctx.fillStyle = withAlpha(BRONZE.bright, a);
      ctx.fillRect(Math.cos(ang) * rad - 2.2, Math.sin(ang) * rad * 0.42 - 2.2, 4.4, 4.4);
    }
    const s = pool.get(p);
    if (s && s.ring) {
      const k = Math.min(1, s.ring.t / BRONZE.duration);
      const endR = Math.max(52, p.r * 3.1);
      const burst = BRONZE.startRadius + (endR - BRONZE.startRadius) * k;
      const ba = BRONZE.maxAlpha * (1 - k) * mul;
      ctx.strokeStyle = withAlpha(BRONZE.bright, ba);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, burst, burst * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const b of s.ring.bits) {
        const d = burst * (0.45 + 0.5 * k);
        ctx.fillStyle = withAlpha(BRONZE.bright, ba);
        ctx.fillRect(Math.cos(b.a) * d - 1.5, Math.sin(b.a) * d * 0.42 - 1.5, b.size + 1.2, b.size + 1.2);
      }
    }
    ctx.restore();
  }
  function drawDiamondGround(ctx, p, mul) {
    const beat = pulse(p, DIAMOND);
    const alpha = (DIAMOND.groundAlphaMin + (DIAMOND.groundAlphaMax - DIAMOND.groundAlphaMin) * beat) * mul;
    const w = Math.max(74, p.r * 4.2);
    const h = w * 0.36;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
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
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = withAlpha(DIAMOND.groundColor, Math.min(1, alpha + 0.28));
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha('#FFF6C8', Math.min(1, alpha + 0.15));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.32, h * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawGoldGround(ctx, p, mul) {
    const beat = pulse(p, GOLD);
    const alpha = (0.72 + beat * 0.28) * mul;
    const w = Math.max(58, p.r * 3.3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y);
    ctx.fillStyle = withAlpha(GOLD.groundColor, alpha * 0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(GOLD.groundColor, alpha);
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawSilverGround(ctx, p, mul) {
    const beat = pulse(p, SILVER);
    const alpha = (0.55 + beat * 0.3) * mul;
    const w = Math.max(50, p.r * 2.9);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = withAlpha(SILVER.groundColor, alpha);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
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
      case 'silver': drawSilverGround(ctx, p, mul); break;
      case 'gold': drawGoldGround(ctx, p, mul); break;
      case 'diamond': drawDiamondGround(ctx, p, mul); break;
    }
  }
  function drawBehind(ctx, p) {
    if (!showing()) return;
    const mul = masteryFxAlpha(p);
    if (mul <= 0) return;
    switch (p.masteryRank) {
      case 'silver': drawGlow(ctx, p, SILVER, mul); drawParts(ctx, p, false, SILVER.maxAlpha, mul); break;
      case 'gold': drawGlow(ctx, p, GOLD, mul); drawParts(ctx, p, false, 1, mul); break;
      case 'diamond': drawGlow(ctx, p, DIAMOND, mul); drawParts(ctx, p, false, 1, mul); break;
    }
  }
  function drawFront(ctx, p) {
    if (!showing()) return;
    const mul = masteryFxAlpha(p);
    if (mul <= 0) return;
    switch (p.masteryRank) {
      case 'silver': drawParts(ctx, p, true, SILVER.maxAlpha, mul); break;
      case 'gold': drawParts(ctx, p, true, 1, mul); break;
      case 'diamond': drawParts(ctx, p, true, 1, mul); break;
    }
  }

  /** NPC de visita (Ditto, Abuelo…): mismo brillo plata para reconocerlos de lejos. */
  function paintNpc(obj, opt) {
    if (!obj) return obj;
    opt = opt || {};
    obj.masteryRank = 'silver';
    if (obj.r == null) obj.r = opt.r != null ? opt.r : 14;
    if (obj.bodyH == null) obj.bodyH = opt.bodyH != null ? opt.bodyH : 28;
    if (obj.dex == null) obj.dex = opt.dex != null ? opt.dex : 0;
    obj.dead = false;
    init(obj);
    return obj;
  }
  function drawNpc(ctx, obj) {
    if (!obj) return;
    drawGround(ctx, obj);
    drawBehind(ctx, obj);
  }
  function drawNpcFront(ctx, obj) {
    if (!obj) return;
    drawFront(ctx, obj);
  }

  return { valid, init, update, drawGround, drawBehind, drawFront, onSpawn, onRevive, clear, reset, paintNpc, drawNpc, drawNpcFront };
})();
