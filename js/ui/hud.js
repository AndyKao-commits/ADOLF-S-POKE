/* ============ hud.js — interfaz dentro del canvas ============
 * Se dibuja en coordenadas de PANTALLA (sin la transformación de cámara).
 */
G.HUD = (() => {
  const F = (w, s) => `${w} ${s}px Pixelify,"Segoe UI",system-ui,sans-serif`;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function orbTip(ctx, id, cx, by, full, w) {
    const o = G.Orbs.BY[id], name = G.T(o.name);
    const lines = [];
    if (full) {
      ctx.font = F(600, 11);
      let cur = '';
      for (const word of G.T(o.desc).split(' ')) {
        const t = cur ? cur + ' ' + word : word;
        if (ctx.measureText(t).width > 240 && cur) { lines.push(cur); cur = word; } else cur = t;
      }
      if (cur) lines.push(cur);
    }
    ctx.font = F(800, 12);
    let bw = ctx.measureText(name).width;
    ctx.font = F(600, 11);
    for (const l of lines) bw = Math.max(bw, ctx.measureText(l).width);
    bw += 16;
    const bh = 20 + lines.length * 14, bx = G.U.clamp(cx - bw / 2, 4, w - bw - 4), y = by - bh;
    ctx.save();
    roundRect(ctx, bx, y, bw, bh, 8);
    ctx.fillStyle = 'rgba(10,14,28,.92)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = o.col; ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = F(800, 12); ctx.fillStyle = o.col;
    ctx.fillText(name, bx + bw / 2, y + 14);
    ctx.font = F(600, 11); ctx.fillStyle = '#e6ecff';
    lines.forEach((l, k) => ctx.fillText(l, bx + bw / 2, y + 28 + k * 14));
    ctx.restore();
  }

  /**
   * Vida (verde) y experiencia (azul) del diseño. El PNG trae el relleno a
   * medias, así que se separan el marco y un tramo de rayas y el relleno
   * se recorta según la vida o la experiencia de esta partida.
   */
  const barImg = new Image();
  let barParts = null;
  barImg.onload = () => { barParts = makeBars(barImg); };
  barImg.src = 'assets/future-use/status-bars/hp-and-blue-bar-design.png';

  function sliceBar(img, s) {
    const frame = document.createElement('canvas');
    frame.width = s.w; frame.height = s.h;
    const g = frame.getContext('2d');
    const sliceX = s.x + s.w - s.cap - 16;
    g.drawImage(img, sliceX, s.y, 8, s.h, s.cap, 0, s.w - s.cap * 2, s.h);
    g.drawImage(img, s.x + s.w - s.cap, s.y, s.cap, s.h, s.w - s.cap, 0, s.cap, s.h);
    g.save();
    g.translate(s.cap, 0);
    g.scale(-1, 1);
    g.drawImage(img, s.x + s.w - s.cap, s.y, s.cap, s.h, 0, 0, s.cap, s.h);
    g.restore();

    const fill = document.createElement('canvas');
    fill.width = s.w; fill.height = s.h;
    const fg = fill.getContext('2d');
    const innerR = s.w - s.cap;
    for (let dx = s.cap; dx < innerR; dx += s.tileW) {
      const dw = Math.min(s.tileW, innerR - dx);
      fg.drawImage(img, s.tileX, s.y + s.top, dw, s.fh, dx, s.top, dw, s.fh);
    }
    return { frame, fill, cap: s.cap, top: s.top, fh: s.fh, w: s.w, h: s.h };
  }

  function makeBars(img) {
    return {
      hp: sliceBar(img, { x: 79, y: 303, w: 2022, h: 122, cap: 50, top: 29, fh: 71, tileX: 288, tileW: 141 }),
      xp: sliceBar(img, { x: 80, y: 437, w: 2020, h: 72, cap: 36, top: 29, fh: 28, tileX: 213, tileW: 137 })
    };
  }

  /** @returns {boolean} false si el diseño todavía no ha cargado. */
  function artBar(ctx, x, y, w, h, frac, key) {
    const b = barParts && barParts[key];
    if (!b) return false;
    const f = G.U.clamp(frac, 0, 1);
    ctx.drawImage(b.frame, x, y, w, h);
    if (f > 0) {
      const cap = b.cap / b.w * w;
      const top = b.top / b.h * h;
      const fh = b.fh / b.h * h;
      const inner = Math.max(0, w - cap * 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + cap, y + top, Math.max(1, inner * f), fh);
      ctx.clip();
      ctx.drawImage(b.fill, x, y, w, h);
      ctx.restore();
    }
    return true;
  }

  /** Barra con cortes, como la de vida de la foto: el relleno y unas rayas encima. */
  function segBar(ctx, x, y, w, h, frac, col) {
    const r = Math.min(6, h / 2);
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(8,16,28,.72)';
    ctx.fill();
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    const fw = w * G.U.clamp(frac, 0, 1);
    if (fw > 0) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, fw, h);
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(x, y, fw, Math.max(2, h * 0.34));
    }
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    for (let sx = x + 16; sx < x + w - 4; sx += 16) ctx.fillRect(sx, y, 2, h);
    ctx.restore();
  }

  /**
   * Cabeza del Pokémon que está jugando, mirando al frente. El recorte sale
   * de la parte de arriba del sprite de Idle, así cambia con quien saques.
   */
  function portrait(ctx, pl, x, y, size) {
    const cx = x + size / 2, cy = y + size / 2, rad = size / 2 - 1;
    const m = G.Sprites.animMeta(pl.dex, 'Idle', pl.shiny);
    const s = G.Sprites.sheet(pl.dex, 'Idle', pl.shiny);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, 6.2832);
    ctx.clip();
    ctx.fillStyle = '#1a2740';
    ctx.fillRect(x, y, size, size);
    if (m && s && s.ready) {
      // Del alto del cuerpo (pies en ay): la cabeza arriba, los pies se salen del círculo.
      const bodyH = Math.max(12, Math.round(m.ay || m.h * 0.6));
      const bodyW = Math.max(10, Math.min(m.w, Math.round(bodyH * 0.92)));
      const sx = Math.round(G.U.clamp(m.ax - bodyW / 2, 0, Math.max(0, m.w - bodyW)));
      const scale = size / Math.min(bodyW, bodyH);
      const dw = bodyW * scale, dh = bodyH * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(s.img, sx, 0, bodyW, bodyH, x + (size - dw) / 2, y - 1, dw, dh);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, 6.2832);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(244,248,255,.92)';
    ctx.stroke();
  }

  function bar(ctx, x, y, w, h, frac, col, bg = 'rgba(0,0,0,.55)') {
    roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    if (frac > 0) {
      ctx.save();
      roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w * G.U.clamp(frac, 0, 1), h);
      ctx.restore();
    }
  }

  /** Color used when a map pin points at this kind of mark. */
  const MARK_COL = {
    enemy: '#ff4d5a', boss: '#e1061c', egg: '#fff1c2',
    ball1: '#e23d3d', ball2: '#3a7ee0', ball3: '#f0d24a', ball4: '#7b4ec8', curse: '#c47bff',
    shop: '#ffd23f', mate: '#5fd4ff'
  };

  /** One shape per thing. s = 1 on the corner radar, larger on the pause map. */
  function drawMark(ctx, x, y, kind, s) {
    ctx.save();
    if (kind === 'enemy') {
      ctx.fillStyle = MARK_COL.enemy;
      ctx.beginPath(); ctx.arc(x, y, 2.2 * s, 0, 6.2832); ctx.fill();
    } else if (kind === 'boss') {
      ctx.fillStyle = MARK_COL.boss;
      ctx.beginPath(); ctx.arc(x, y, 4.4 * s, 0, 6.2832); ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.7);
      ctx.strokeStyle = '#6e0010';
      ctx.stroke();
    } else if (kind === 'egg') {
      ctx.fillStyle = MARK_COL.egg;
      ctx.beginPath(); ctx.ellipse(x, y, 2.3 * s, 3.5 * s, 0, 0, 6.2832); ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.55);
      ctx.strokeStyle = '#c9a24a';
      ctx.stroke();
    } else if (kind === 'ball1' || kind === 'ball2' || kind === 'ball3' || kind === 'ball4') {
      const tier = kind === 'ball4' ? 4 : kind === 'ball3' ? 3 : kind === 'ball2' ? 2 : 1;
      const img = G.Pickups.ballImg && G.Pickups.ballImg(tier);
      const sz = 5.4 * s;
      if (img) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x - sz, y - sz, sz * 2, sz * 2);
      }
    } else if (kind === 'curse') {
      const img = G.Pickups.curseImg && G.Pickups.curseImg();
      const sz = 5.4 * s;
      if (img) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x - sz, y - sz, sz * 2, sz * 2);
      }
    } else if (kind === 'shop') {
      const img = G.World.shopImg && G.World.shopImg();
      const wdt = 8 * s, hgt = wdt * 112 / 128;
      if (img) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x - wdt / 2, y - hgt * 0.72, wdt, hgt);
      }
    } else if (kind === 'mate') {
      const r = 3.2 * s;
      ctx.fillStyle = MARK_COL.mate;
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.8, y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function radar(ctx, w, h, pl) {
    const R = 52, cx = w - R - 14, cy = G.Touch.active ? 118 : 72;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
    ctx.fillStyle = 'rgba(6, 16, 32, .72)';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.strokeStyle = 'rgba(244,248,255,.18)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, 6.2832); ctx.stroke();
    const REACH = 820;
    const blot = (x, y, kind) => {
      const dx = (x - pl.x) / REACH * (R - 6), dy = (y - pl.y) / REACH * (R - 6);
      if (dx * dx + dy * dy > (R - 6) * (R - 6)) return;
      drawMark(ctx, cx + dx, cy + dy, kind, 1);
    };
    if (G.World.shops) for (const s of G.World.shops) blot(s.x, s.y, 'shop');
    for (const p of G.Pickups.all()) {
      if (p.kind === 'egg') blot(p.x, p.y, 'egg');
      else if (p.kind === 'ball' || p.kind === 'vend') blot(p.x, p.y, p.kind === 'vend' ? 'ball1' : p.value >= 4 ? 'ball4' : p.value >= 3 ? 'ball3' : p.value === 2 ? 'ball2' : 'ball1');
      else if (p.kind === 'curse') blot(p.x, p.y, 'curse');
    }
    for (const e of G.EnemyMgr.all()) if (!e.dead) blot(e.x, e.y, e.boss ? 'boss' : 'enemy');
    if (G.Coop && G.Coop.active && G.Coop.puppets) {
      for (const m of G.Coop.puppets()) if (!m.dead) blot(m.x, m.y, 'mate');
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, 6.2832); ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832);
    ctx.strokeStyle = 'rgba(244,248,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
    G.Touch.addButton(cx - R, cy - R, R * 2, R * 2, () => {
      if (G.Game.state === 'playing' && G.Game.toggleMap) G.Game.toggleMap();
    }, 4);
  }

  /** Mapa grande (la pantalla de pausa): anillos y las mismas marcas que el radar. */
  function paintMap(canvas, pl) {
    if (!canvas || !pl) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 18;
    const REACH = 2200;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0c1730';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(150, 190, 230, .38)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, 6.2832); ctx.stroke();
    }
    const hits = [];
    const at = (wx, wy) => {
      let dx = (wx - pl.x) / REACH * R, dy = (wy - pl.y) / REACH * R;
      const d = Math.hypot(dx, dy);
      if (d > R - 8) { const k = (R - 8) / (d || 1); dx *= k; dy *= k; }
      return [cx + dx, cy + dy];
    };
    const mark = (wx, wy, kind) => {
      const [sx, sy] = at(wx, wy);
      drawMark(ctx, sx, sy, kind, 3);
      hits.push({ sx, sy, x: wx, y: wy, col: MARK_COL[kind] });
    };
    if (G.World.shops) for (const s of G.World.shops) mark(s.x, s.y, 'shop');
    for (const p of G.Pickups.all()) {
      if (p.kind === 'egg') mark(p.x, p.y, 'egg');
      else if (p.kind === 'ball' || p.kind === 'vend') mark(p.x, p.y, p.kind === 'vend' ? 'ball1' : p.value >= 4 ? 'ball4' : p.value >= 3 ? 'ball3' : p.value === 2 ? 'ball2' : 'ball1');
      else if (p.kind === 'curse') mark(p.x, p.y, 'curse');
    }
    for (const e of G.EnemyMgr.all()) if (!e.dead) mark(e.x, e.y, e.boss ? 'boss' : 'enemy');
    if (G.Coop && G.Coop.active && G.Coop.puppets) {
      for (const m of G.Coop.puppets()) if (!m.dead) mark(m.x, m.y, 'mate');
    }
    if (pl.mark) {
      const [sx, sy] = at(pl.mark.x, pl.mark.y);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 6.2832); ctx.stroke();
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7);
    ctx.stroke();
    canvas._hits = hits;
  }

  /** Flecha hacia la marca puesta en el mapa. */
  function pinArrow(ctx, w, h, pl) {
    const mk = pl.mark;
    if (!mk) return;
    const cam = G.Camera;
    const sx = (mk.x - cam.left()) * cam.scale, sy = (mk.y - cam.top()) * cam.scale;
    const on = sx > 28 && sx < w - 28 && sy > 64 && sy < h - 86;
    ctx.save();
    ctx.fillStyle = mk.col || '#fff';
    if (on) {
      ctx.translate(sx, sy - 16);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(-7, -7); ctx.lineTo(7, -7); ctx.closePath();
      ctx.fill();
    } else {
      const M = 58;
      const ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 36, h - M);
      const a = Math.atan2(sy - ey, sx - ex);
      ctx.translate(ex, ey); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, 9); ctx.lineTo(-10, -9); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function interactButton(ctx, w, h, touch, place) {
    const shop = G.Game.nearestShop && G.Game.nearestShop();
    const field = G.Game.nearestField && G.Game.nearestField();
    if (!shop && !field) return;
    const dash = 54, bs = place ? place.s : 46, gap = 14;
    const dashX = w - dash - 18;
    const dashY = h - dash - (touch ? 28 : 18);
    const bx = place ? place.x : dashX - gap - bs;
    const by = place ? place.y : dashY + (dash - bs) / 2;
    const cx = bx + bs / 2, cy = by + bs / 2;
    ctx.beginPath(); ctx.arc(cx, cy, bs / 2, 0, 6.2832);
    ctx.fillStyle = 'rgba(10,16,28,.82)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = F(800, 18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('E', cx, cy + 1);
    G.Touch.addButton(bx, by, bs, bs, () => { if (G.Game.useNear) G.Game.useNear(); }, 8);
  }

  function dashButton(ctx, w, h, pl, touch, place) {
    const bs = place ? place.s : 54;
    const bx = place ? place.cx - bs / 2 : w - bs - 18;
    const by = place ? place.cy - bs / 2 : h - bs - (touch ? 28 : 18);
    const cd = pl.dashCd || 0, ready = cd <= 0 && !(pl.dashT > 0);
    ctx.beginPath(); ctx.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, 6.2832);
    ctx.fillStyle = ready ? '#ffd23f' : 'rgba(10,16,28,.82)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = ready ? '#fff6d0' : 'rgba(244,248,255,.45)'; ctx.stroke();
    if (!ready && cd > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4;
      ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 - 4, -Math.PI / 2, -Math.PI / 2 + (1 - cd / 2.5) * 6.2832);
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = F(800, 14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cd.toFixed(1), bx + bs / 2, by + bs / 2);
    } else {
      ctx.fillStyle = '#1a1404'; ctx.font = F(800, 18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('>>', bx + bs / 2, by + bs / 2);
    }
    ctx.font = F(700, 10); ctx.fillStyle = '#f4f8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(touch ? 'Esprint' : 'Espacio', bx + bs / 2, by + bs + 14);
    G.Touch.addButton(bx, by, bs, bs, () => { if (G.Game.state === 'playing' && pl.tryDash) pl.tryDash(); }, 8);
  }

  function draw(ctx, w, h, pl, st) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    G.Touch.clearButtons();
    const touch = G.Touch.active;

    // ---------- cabeza, nivel, vida y experiencia ----------
    const sa = G.Touch.safeArea();
    const px = 12 + sa.left, py = 12 + sa.top;
    const size = 48;
    portrait(ctx, pl, px, py, size);
    // Nivel: círculo amarillo sobre la cabeza, como en la foto.
    const lx = px + 5, ly = py + size - 3;
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, 6.2832);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a1404';
    ctx.stroke();
    ctx.font = F(800, 11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1404';
    ctx.fillText(String(pl.level), lx, ly + 1);

    const bx0 = px + size + 8;
    const barW = Math.max(96, Math.min(188, w / 2 - bx0 - 36));
    ctx.font = F(800, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.strokeText(pl.mon.name, bx0, py + 15);
    ctx.fillStyle = '#f4f8ff';
    ctx.fillText(pl.mon.name, bx0, py + 15);

    const hpY = py + 20, hpH = 16;
    const hpFrac = pl.maxHp > 0 ? pl.hp / pl.maxHp : 0;
    if (!artBar(ctx, bx0, hpY, barW, hpH, hpFrac, 'hp'))
      segBar(ctx, bx0, hpY, barW, hpH, hpFrac, hpFrac < 0.28 ? '#ff5f6d' : '#3ddc6a');
    ctx.font = F(800, 12);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.65)';
    const hpTxt = Math.ceil(pl.hp) + '/' + Math.round(pl.maxHp);
    ctx.strokeText(hpTxt, bx0 + barW / 2, hpY + hpH / 2 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(hpTxt, bx0 + barW / 2, hpY + hpH / 2 + 1);

    const xpY = hpY + hpH + 4, xpH = 9;
    if (!artBar(ctx, bx0, xpY, barW, xpH, pl.xpNext > 0 ? pl.xp / pl.xpNext : 0, 'xp'))
      segBar(ctx, bx0, xpY, barW, xpH, pl.xpNext > 0 ? pl.xp / pl.xpNext : 0, '#7ad7ff');
    // Objetos de esta partida, bajo la experiencia. Se quedan todos y se apilan.
    const held = [];
    const stacks = pl.stacks || {};
    for (const it of G.Items.LIST) {
      const n = stacks[it.id] || 0;
      if (n > 0) held.push([it, n]);
    }
    if (held.length) {
      const icon = 22, igap = 3;
      const per = Math.max(1, Math.floor((barW + igap) / (icon + igap)));
      held.forEach(([it, n], i) => {
        const ix = bx0 + (i % per) * (icon + igap);
        const iy = xpY + xpH + 4 + Math.floor(i / per) * (icon + 2);
        G.Icons.draw(ctx, it.id, ix, iy, icon);
        if (n > 0) {
          ctx.font = F(800, 10);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,.75)';
          const label = n + '/' + it.max;
          ctx.strokeText(label, ix + icon + 1, iy + icon + 1);
          ctx.fillStyle = n >= it.max ? '#9aa6b5' : '#ffd23f';
          ctx.fillText(label, ix + icon + 1, iy + icon + 1);
        }
      });
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const row = py + size + 6;

    // buffs activos
    const COL = { atk: '#ff6b4d', patk: '#ff6b4d', satk: '#c47bff', spd: '#7fe0ff', def: '#b0b8c8', regen: '#5fe08a' };
    const LBL = { atk: 'ATK', patk: 'ATK', satk: 'AT.E', spd: 'VEL', def: 'DEF', regen: 'REG' };
    let bx = px;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const k in pl.buffs) {
      const b = pl.buffs[k];
      if (b.n <= 0) continue;
      ctx.font = F(800, 9);
      const txt = LBL[k] + ' ×' + b.n;
      const tw = ctx.measureText(txt).width + 12;
      roundRect(ctx, bx, row, tw, 15, 7);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
      ctx.fillStyle = COL[k];
      ctx.fillText(txt, bx + 6, row + 11);
      bx += tw + 5;
    }

    // ---------- reloj, mapa, derrotas y monedas ----------
    drawRunPlate(ctx, w, sa, pl, st);
    drawHudExtra(ctx, w, sa, st);

    // ---------- clima (arriba a la derecha) ----------
    const wx = G.Weather.current;
    if (wx) {
      ctx.font = F(800, 11);
      ctx.textAlign = 'left';
      const txt = wx.name.toUpperCase() + ' · ' + Math.ceil(wx.left) + 's';
      const tw = ctx.measureText(txt).width + 40;
      const x0 = w - tw - 16 - sa.right - (touch ? 56 : 0), y0 = 14 + sa.top;
      roundRect(ctx, x0, y0, tw, 26, 9);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill();
      G.Icons.draw(ctx, wx.icon, x0 + 6, y0 + 3, 20);
      ctx.fillStyle = wx.color;
      ctx.fillText(txt, x0 + 32, y0 + 17);
    }

    // ---------- barra del jefe ----------
    const boss = G.EnemyMgr.all().find(e => e.boss && !e.dead);
    if (boss) {
      const bw = Math.min(420, w - 80);
      const by = Math.max(78, row + 8);
      bar(ctx, (w - bw) / 2, by, bw, 12, boss.hp / boss.maxHp, '#ffcb3d');
      ctx.font = F(800, 10);
      ctx.fillStyle = '#20160a';
      ctx.fillText(boss.name.toUpperCase(), w / 2, by + 10);
    }
    if (G.Castle.up) {
      const bw = Math.min(420, w - 80);
      const y = boss ? Math.max(96, row + 26) : Math.max(78, row + 8);
      bar(ctx, (w - bw) / 2, y, bw, 12, G.Castle.hp / G.Castle.maxHp, '#5fe08a');
      ctx.font = F(800, 10);
      ctx.fillStyle = '#06210f';
      ctx.fillText('Oleada ' + (G.Castle.wave || 1) + ' de 50', w / 2, y + 10);
    }

    // ---------- aviso ----------
    // ---------- shinies fuera de pantalla: destello en el borde ----------
    // En el modo shiny todos lo son: marcarlos sólo tapa la pantalla.
    const cam = G.Camera, pulse = 0.6 + Math.sin(performance.now() / 160) * 0.4;
    const parade = G.Modes && G.Modes.is('shiny');
    for (const e of (parade ? [] : G.EnemyMgr.shinies())) {
      const sx = (e.x - cam.left()) * cam.scale, sy = (e.y - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 34;
      const ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 60, h - M - 70);
      const a = Math.atan2(sy - ey, sx - ex);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.translate(ex, ey);
      ctx.fillStyle = '#9ae6ff';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.lineTo(Math.cos(a + 2.5) * 12, Math.sin(a + 2.5) * 12);
      ctx.lineTo(Math.cos(a - 2.5) * 12, Math.sin(a - 2.5) * 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      G.Icons.draw(ctx, 'shiny', -12, -12, 24);
      ctx.restore();
    }

    // Poder de altar activo.
    if (pl.power) {
      const pw = pl.power, txt = pw.def.name.toUpperCase() + ' ' + Math.ceil(pw.t) + 's';
      ctx.font = F(800, 9);
      ctx.textAlign = 'left';
      const tw = ctx.measureText(txt).width + 12;
      roundRect(ctx, bx, row, tw, 15, 7);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fill();
      ctx.fillStyle = pw.def.color;
      ctx.fillText(txt, bx + 6, row + 11);
      bx += tw + 5;
    }

    if (G.Coop.active) drawCoop(ctx, w, h, pl, px, row + (bx > px ? 20 : 2));

    // Grieta: flecha grande que late en el borde si no se ve, y si se ve, una
    // flecha que bota encima; en la arena, cuenta atrás.
    const rift = G.Rift.rift;
    if (rift) {
      const sx = (rift.x - cam.left()) * cam.scale, sy = (rift.y - 40 - cam.top()) * cam.scale;
      const now = performance.now() / 1000, beat = 0.5 + Math.sin(now * 7) * 0.5;
      const label = 'GRIETA · ' + Math.round(G.U.dist(pl.x, pl.y, rift.x, rift.y) / 32) + ' m · ' + Math.ceil(rift.ttl) + ' s';
      const off = sx < 0 || sx > w || sy < 0 || sy > h;
      ctx.save();
      if (off) {
        const M = 52, ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 70, h - M - 80);
        const a = Math.atan2(sy - ey, sx - ex), ca = Math.cos(a), sa = Math.sin(a);
        ctx.translate(ex, ey);
        // Halo que late.
        ctx.globalAlpha = 0.18 + beat * 0.22;
        ctx.fillStyle = '#b48aff';
        ctx.beginPath(); ctx.arc(0, 0, 30 + beat * 8, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        const tri = (k) => {
          ctx.beginPath();
          ctx.moveTo(ca * 40 * k, sa * 40 * k);
          ctx.lineTo(Math.cos(a + 2.45) * 20 * k, Math.sin(a + 2.45) * 20 * k);
          ctx.lineTo(Math.cos(a - 2.45) * 20 * k, Math.sin(a - 2.45) * 20 * k);
          ctx.closePath();
        };
        tri(1.12); ctx.fillStyle = '#1a0b33'; ctx.fill();
        tri(1); ctx.fillStyle = beat > 0.5 ? '#e2d0ff' : '#a06bff'; ctx.fill();
        ctx.font = F(800, 12);
        ctx.textAlign = ca > 0.3 ? 'right' : ca < -0.3 ? 'left' : 'center';
        const lx = -ca * 34, ly = -sa * 30 + 4;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.strokeText(label, lx, ly);
        ctx.fillStyle = '#e2d0ff';
        ctx.fillText(label, lx, ly);
      } else {
        // Encima de la grieta: flecha hacia abajo que bota.
        const by = sy - 46 - Math.abs(Math.sin(now * 4)) * 10;
        ctx.translate(sx, by);
        ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(15, -12); ctx.lineTo(0, 8); ctx.closePath();
        ctx.lineWidth = 4; ctx.strokeStyle = '#1a0b33'; ctx.stroke();
        ctx.fillStyle = beat > 0.5 ? '#e2d0ff' : '#a06bff'; ctx.fill();
        ctx.font = F(800, 11); ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.85)';
        const l2 = 'GRIETA · ' + Math.ceil(rift.ttl) + ' s';
        ctx.strokeText(l2, 0, -18); ctx.fillStyle = '#e2d0ff'; ctx.fillText(l2, 0, -18);
      }
      ctx.restore();
    }
    if (G.Rift.inArena) {
      ctx.textAlign = 'center';
      ctx.font = F(800, 12);
      ctx.fillStyle = '#d9c2ff';
      ctx.fillText('GRIETA · ' + G.U.mmss(G.Rift.timeLeft), w / 2, boss ? 108 : Math.max(86, sa.top + 70));
    }

    // Eventos: cuenta atrás, flecha al Pokémon perdido / a la marca y a los duendes.
    G.Events.drawHud(ctx, w, h, pl, F);

    // Aviso propio al abrirse una grieta (no lo tapan los otros avisos).
    if (rift && rift.t < 4.5) {
      const a = Math.min(1, rift.t * 4, (4.5 - rift.t) * 2), pop = 1 + Math.max(0, 0.25 - rift.t) * 1.6;
      const y0 = h * 0.2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, y0); ctx.scale(pop, pop);
      ctx.font = F(800, 20);
      const t1 = '¡SE HA ABIERTO UNA GRIETA!', t2 = 'Sigue la flecha morada: dentro te espera un legendario';
      const bw = Math.min(w - 24, Math.max(ctx.measureText(t1).width, (ctx.font = F(700, 11), ctx.measureText(t2).width)) + 36);
      roundRect(ctx, -bw / 2, -26, bw, 52, 10);
      ctx.fillStyle = 'rgba(26,11,51,.88)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#b48aff'; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = F(800, 20); ctx.fillStyle = '#e2d0ff'; ctx.fillText(t1, 0, -2);
      ctx.font = F(700, 11); ctx.fillStyle = '#c9b0ff'; ctx.fillText(t2, 0, 16);
      ctx.restore();
    }

    const ban = G.Spawner.banner();
    if (ban) {
      const a = Math.min(1, ban.t * 1.6);
      ctx.save();
      ctx.globalAlpha = a;
      // Siempre centrado (antes heredaba la alineación de lo último dibujado, p.
      // ej. la flecha de un duende del tesoro, y salía descolocado).
      ctx.textAlign = 'center';
      ctx.font = F(800, 22);
      ctx.fillStyle = '#ffcb3d';
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4;
      ctx.strokeText(ban.text, w / 2, h * 0.3);
      ctx.fillText(ban.text, w / 2, h * 0.3);
      ctx.restore();
    }

    // ---------- ranura de movimientos ----------
    const siegeHud = !!(G.Siege && G.Siege.up);
    const short = Math.min(w, h);
    const S = siegeHud ? Math.round(G.U.clamp(short * 0.105, 44, 76)) : 54, GAP = 9;
    const n = siegeHud ? Math.max(pl.maxMoves || 4, pl.slots.length) : Math.max(1, pl.slots.length);
    const totalW = n * S + (n - 1) * GAP;
    let sx = (w - totalW) / 2;
    // Por encima de la barra de inicio del iPhone (allí los toques a veces no llegan).
    let sy = h - S - 18 - (touch ? Math.min(28, G.Touch.safeArea().bottom) : 0);
    // En móvil, donde la haya puesto el jugador: el bloque objeto + todos los
    // huecos (aunque aún no estén llenos), por su centro, como en el editor
    // (layout-ui.js); los ataques nuevos van saliendo hacia la derecha.
    const pb = !siegeHud && touch && G.Touch.spot('bar');
    if (pb) {
      const nAll = Math.max(n, pl.maxMoves), bw = nAll * S + (nAll - 1) * GAP;
      sx = G.U.clamp(pb[0] * w - bw / 2, 6, Math.max(6, w - bw - 6));
      sy = G.U.clamp(pb[1] * h - S / 2, 24, h - S - 6);
    }
    // Asedio: nada en el centro. El sprint queda abajo a la derecha y los
    // ataques salen en abanico hacia arriba e izquierda. El tamaño sigue la pantalla.
    let slotAt = null, dashAt = null;
    if (siegeHud) {
      const dashS = Math.round(S * 1.12);
      const margin = 14 + (touch ? Math.min(22, G.Touch.safeArea().bottom) : 0);
      const dcx = w - margin - dashS / 2;
      const dcy = h - margin - dashS / 2;
      const a0 = Math.PI, a1 = Math.PI / 2;
      const span = a0 - a1;
      const step = n <= 1 ? span : span / (n - 1);
      const clear = dashS / 2 + S / 2 + 16;
      const need = (S + 16) / (2 * Math.sin(step / 2));
      const maxR = Math.max(clear, Math.min(dcx - S / 2 - 12, dcy - 72 - S / 2));
      const radius = Math.min(maxR, Math.max(clear, need));
      slotAt = [];
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? Math.PI * 0.75 : a0 + (a1 - a0) * (i / (n - 1));
        slotAt.push({
          x: G.U.clamp(dcx + Math.cos(a) * radius - S / 2, 8, Math.max(8, w - S - 8)),
          y: G.U.clamp(dcy - Math.sin(a) * radius - S / 2, 64, Math.max(64, h - S - 28))
        });
      }
      dashAt = { cx: dcx, cy: dcy, s: dashS };
    }
    const BOND = '#ff8ad8';
    const cdOf = m => m.kind === 'orbit' ? 0 : G.U.clamp(m.t / (m.cd * Math.max(0.45, pl.cdMul)), 0, 1);

    if (G.Orbs) {
      const orbs = pl.orbs || [], ob = pl.orbBuff || {};
      const buffs = Object.keys(ob).filter(id => ob[id] > 0);
      if (orbs.some(Boolean) || buffs.length) {
        const OS = siegeHud ? Math.round(G.U.clamp(S * 0.72, 34, 52)) : 40, OG = 6;
        const ow = G.Orbs.SLOTS * OS + (G.Orbs.SLOTS - 1) * OG;
        const ox = sx + totalW / 2 - ow / 2, oy = sy - 30 - OS;
        const orbAt = i => {
          if (!slotAt || !dashAt) return { x: ox + i * (OS + OG), y: oy };
          const t = G.Orbs.SLOTS <= 1 ? 0.5 : i / (G.Orbs.SLOTS - 1);
          const a = Math.PI * (1.08 - 0.38 * t);
          const radius = dashAt.s / 2 + S + OS * 0.7;
          return {
            x: G.U.clamp(dashAt.cx + Math.cos(a) * radius - OS / 2, 8, Math.max(8, w - OS - 8)),
            y: G.U.clamp(dashAt.cy - Math.sin(a) * radius - OS / 2, 56, Math.max(56, h - OS - 8))
          };
        };
        const cdF = G.U.clamp(G.Orbs.cd, 0, 1);
        for (let i = 0; i < G.Orbs.SLOTS; i++) {
          const o = orbs[i], box = orbAt(i), x = box.x, y = box.y;
          const ic = Math.round(OS * 0.6);
          roundRect(ctx, x, y, OS, OS, 9);
          ctx.fillStyle = o ? 'rgba(20,24,44,.88)' : 'rgba(10,16,28,.45)';
          ctx.fill();
          const pick = o && !!G.Pad.name && i === G.Orbs.sel;
          ctx.lineWidth = pick ? 2.5 : 1.2;
          ctx.strokeStyle = pick ? '#ffd23f' : o ? G.Orbs.BY[o.id].col : 'rgba(140,170,210,.18)';
          ctx.stroke();
          if (!o) continue;
          G.Touch.addButton(x, y, OS, OS, () => G.Orbs.use(pl, i), OG / 2 + 2);
          G.Icons.draw(ctx, 'orb:' + o.id, x + (OS - ic) / 2, y + (OS - ic) / 2, ic);
          if (cdF > 0) {
            ctx.save(); roundRect(ctx, x, y, OS, OS, 9); ctx.clip();
            ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, OS, OS * cdF);
            ctx.restore();
          }
          ctx.font = F(800, 9);
          if (!touch) { ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(180,200,230,.7)'; ctx.fillText(String(i + 5), x + 3, y + 10); }
          if (o.n > 1) { ctx.textAlign = 'right'; ctx.fillStyle = '#f4f8ff'; ctx.fillText('×' + o.n, x + OS - 3, y + OS - 4); }
        }
        const mo = G.Input.mouse(), fresh = pl.orbNew && performance.now() - pl.orbNew.at < 3000 ? pl.orbNew.i : -1;
        let tip = -1, full = false;
        if (!touch) for (let i = 0; i < G.Orbs.SLOTS; i++) {
          const b = orbAt(i);
          if (orbs[i] && mo.x >= b.x && mo.x <= b.x + OS && mo.y >= b.y && mo.y <= b.y + OS) { tip = i; full = true; }
        }
        if (tip < 0 && G.Pad.name && orbs[G.Orbs.sel]) tip = G.Orbs.sel;
        if (tip < 0 && fresh >= 0 && orbs[fresh]) tip = fresh;
        if (fresh >= 0 && orbs[fresh]) {
          const b = orbAt(fresh), a = 1 - (performance.now() - pl.orbNew.at) / 3000;
          ctx.save(); ctx.globalAlpha = a;
          roundRect(ctx, b.x - 2, b.y - 2, OS + 4, OS + 4, 11);
          ctx.lineWidth = 3; ctx.strokeStyle = G.Orbs.BY[orbs[fresh].id].col; ctx.stroke();
          ctx.restore();
        }
        if (tip >= 0) { const b = orbAt(tip); orbTip(ctx, orbs[tip].id, b.x + OS / 2, b.y - 8, full, w); }
        buffs.forEach((id, k) => {
          const anchor = orbAt(G.Orbs.SLOTS - 1);
          const bx = anchor.x + OS + 10 + k * 30, by = anchor.y + 4;
          G.Icons.draw(ctx, 'orb:' + id, bx, by, 24);
          ctx.font = F(800, 10); ctx.textAlign = 'center';
          ctx.fillStyle = G.Orbs.BY[id].col;
          ctx.fillText(Math.ceil(ob[id]) + 's', bx + 12, by + 35);
        });
      }
    }

    for (let i = 0; i < n; i++) {
      const g = pl.slots[i] || [];
      const m = g[0];
      const fused = g.length > 1;
      const on = siegeHud ? true : g.on !== false;
      const focused = i === (pl.focus || 0);
      const x = slotAt ? slotAt[i].x : sx + i * (S + GAP);
      const y = slotAt ? slotAt[i].y : (on ? sy - 6 : sy);
      // Asedio: el toque sólo elige el hueco. Fuera, enciende o apaga.
      G.Touch.addButton(x, y, S, S, () => {
        if (G.Game.state !== 'playing') return;
        if (siegeHud) pl.selectSlot(i);
        else if (m) pl.toggleSlot(i);
      }, GAP / 2 + 3, siegeHud ? 'skill:' + i : '');
      const col = m ? G.U.TYPE_COLOR[m.type] : '#4a5468';

      // fondo
      roundRect(ctx, x, y, S, S, 12);
      ctx.fillStyle = on ? 'rgba(20,30,50,.95)' : 'rgba(10,16,28,.8)';
      ctx.fill();
      ctx.lineWidth = siegeHud && focused ? 4 : on ? 2.5 : fused || (m && m.evolved) ? 2 : 1.2;
      // Vínculo: borde rosa. Evolucionado: dorado.
      ctx.strokeStyle = siegeHud && focused ? '#ffd23f' : fused ? BOND : m && m.evolved ? '#ffd23f' : on ? col : 'rgba(140,170,210,.22)';
      ctx.stroke();

      if (!m) {
        if (siegeHud) {
          ctx.font = F(800, 12);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = focused ? '#ffd23f' : 'rgba(180,200,230,.4)';
          ctx.fillText(String(i + 1), x + S / 2, y + S / 2);
        }
        continue;
      }

      if (fused) {
        // Vínculo: los movimientos en una cuadrícula de 2×2, cada uno con su recarga.
        const C = slotAt ? Math.round(S * 0.4) : 22, P = (S - C * 2) / 3;
        g.forEach((gm, k) => {
          const cx = x + P + (k % 2) * (C + P), cy = y + P + Math.floor(k / 2) * (C + P);
          G.Icons.draw(ctx, 'move:' + gm.id, cx, cy, C);
          const f = cdOf(gm);
          if (f > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx, cy, C, C * f); }
          if (gm.evolved) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, C - 1, C - 1); }
          // Destello al lanzarse.
          const fl = 1 - (performance.now() - (gm.castAt || 0)) / 180;
          if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (fl * 0.55).toFixed(2) + ')'; ctx.fillRect(cx, cy, C, C); }
        });
      } else {
        // recarga: se vacía de abajo a arriba
        const cdFrac = cdOf(m);
        if (cdFrac > 0) {
          ctx.save();
          roundRect(ctx, x, y, S, S, 12); ctx.clip();
          ctx.fillStyle = 'rgba(0,0,0,.6)';
          ctx.fillRect(x, y, S, S * cdFrac);
          ctx.restore();
        }

        // emblema del tipo + insignia de la familia
        const ic = slotAt ? Math.round(S * 0.58) : 32;
        G.Icons.draw(ctx, 'move:' + m.id, x + (S - ic) / 2, y + (S - ic) / 2 - 2, ic);

        // nivel del movimiento (puntitos)
        const dots = m.def.maxLvl;
        const dw = 4, dgap = 2;
        const tw = dots * dw + (dots - 1) * dgap;
        for (let d = 0; d < dots; d++) {
          ctx.fillStyle = d < m.lvl ? col : 'rgba(255,255,255,.18)';
          ctx.fillRect(x + (S - tw) / 2 + d * (dw + dgap), y + S - 9, dw, 3);
        }
      }

      // tecla
      ctx.font = F(800, 9);
      ctx.fillStyle = fused ? BOND : on ? col : 'rgba(180,200,230,.45)';
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), x + 3, y + 10);
      if (!on && !siegeHud) {
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + S - 12, y + S - 12); ctx.stroke();
      }

      // nombre encima del resaltado (con un vínculo: "Ascuas +2")
      if (focused) {
        ctx.font = F(700, 10);
        ctx.textAlign = 'center';
        ctx.fillStyle = fused ? BOND : col;
        ctx.fillText(fused ? G.T(m.name, 'move') + ' +' + (g.length - 1) : G.T(m.name, 'move'), x + S / 2, y - 7);
      }
    }

    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------
    if (pl.bonds > 0) {
      const top = slotAt && slotAt.reduce((a, p) => p.y < a.y ? p : a);
      const bx = top ? top.x + S + 8 : sx + totalW + 12;
      const by = top ? top.y : sy + S / 2 - 12;
      G.Icons.draw(ctx, 'bond', bx, by, 24);
      if (pl.bonds > 1) {
        ctx.font = F(800, 10);
        ctx.textAlign = 'left';
        ctx.fillStyle = BOND;
        ctx.fillText('×' + pl.bonds, bx + 25, by + 20);
      }
    }

    if (!siegeHud) radar(ctx, w, h, pl);
    pinArrow(ctx, w, h, pl);
    if (G.UI.isOpen('scr-map')) paintMap(document.getElementById('map-radar'), pl);
    const useAt = slotAt && slotAt.reduce((a, p) => p.x < a.x ? p : a);
    interactButton(ctx, w, h, touch, useAt ? {
      x: G.U.clamp(useAt.x - Math.round(S * 0.9) - 12, 8, w - S),
      y: useAt.y,
      s: Math.round(S * 0.85)
    } : null);
    dashButton(ctx, w, h, pl, touch, dashAt);

    // ---------- botón de pausa (táctil) ----------
    if (touch) {
      const sa = G.Touch.safeArea();
      const pp = G.Touch.spot('pause');
      const bx = pp ? G.U.clamp(pp[0] * w - 20, 4, w - 44) : w - 52 - Math.min(44, sa.right);
      const by = pp ? G.U.clamp(pp[1] * h - 20, 10, h - 44) : 12 + Math.min(20, sa.top), bs = 40;
      roundRect(ctx, bx, by, bs, bs, 10);
      ctx.fillStyle = 'rgba(10,16,28,.7)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(244,248,255,.8)'; ctx.stroke();
      ctx.fillStyle = '#f4f8ff';
      ctx.fillRect(bx + 13, by + 11, 5, 18); ctx.fillRect(bx + 22, by + 11, 5, 18);
      G.Touch.addButton(bx, by, bs, bs, () => G.Game.togglePause(), 8);
    }

    // pista de controles
    if (st.time < 14) {
      ctx.font = F(600, 10);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,200,230,.55)';
      ctx.fillText(touch
        ? (siegeHud
          ? 'Arrastra para moverte · toca un ataque para encenderlo o apagarlo · sprint abajo a la derecha'
          : 'Arrastra para moverte · toca un ataque para encenderlo o apagarlo · mapa arriba a la derecha · sprint abajo a la derecha')
        : (siegeHud
          ? 'WASD mover · 1-4 encender o apagar · Espacio sprint · Esc pausa'
          : 'WASD mover · 1-4 encender o apagar · M mapa · Espacio sprint · Esc pausa'), w / 2, h - 4);
    }

    ctx.restore();
  }

  // ---------------- cooperativo ----------------

  /**
   * - Vida de cada compañero debajo de la tuya.
   * - Flecha en el borde de la pantalla hacia los que no se ven, con su nombre
   *   y a cuántos metros están (roja y parpadeando si está caído).
   * - Si has caído tú: aviso y barra de "te están levantando".
   */
  function drawCoop(ctx, w, h, pl, px, top) {
    const cam = G.Camera;
    const t = performance.now() / 1000;
    let y = top;
    ctx.textAlign = 'left';
    for (const m of G.Coop.mates) {
      if (!m.connected) continue;
      const o = m.pl;
      ctx.font = F(800, 10);
      ctx.fillStyle = m.color;
      G.I18n.rawCanvas(ctx, 'fillText', m.name, px, y + 9);
      const lx = px + 78;
      bar(ctx, lx, y + 1, 110, 8, o.dead ? 0 : o.hp / o.maxHp, o.dead ? '#ff5f6d' : '#5fe08a');
      if (o.dead) {
        ctx.font = F(800, 9);
        ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ff8a96' : '#ffd0d5';
        ctx.fillText('CAÍDO', lx + 116, y + 9);
      }
      y += 15;
    }

    // Flechas hacia los compañeros fuera de la vista.
    for (const m of G.Coop.mates) {
      if (!m.connected) continue;
      const o = m.pl;
      const sx = (o.x - cam.left()) * cam.scale, sy = (o.y - o.bodyH * 0.5 - cam.top()) * cam.scale;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue;
      const M = 42;
      const ex = G.U.clamp(sx, M, w - M), ey = G.U.clamp(sy, M + 70, h - M - 80);
      const a = Math.atan2(sy - ey, sx - ex);
      const metres = Math.round(G.U.dist(pl.x, pl.y, o.x, o.y) / 32);
      const col = o.dead ? (Math.sin(t * 8) > 0 ? '#ff5f6d' : '#ffd0d5') : m.color;
      ctx.save();
      ctx.translate(ex, ey);
      // Flecha
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.2832); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a + 2.4) * 14, Math.sin(a + 2.4) * 14);
      ctx.lineTo(Math.cos(a - 2.4) * 14, Math.sin(a - 2.4) * 14);
      ctx.closePath(); ctx.fill();
      // Inicial del compañero dentro del círculo
      ctx.font = F(800, 14);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      G.I18n.rawCanvas(ctx, 'fillText', m.name.charAt(0).toUpperCase(), 0, 5);
      // Nombre y distancia: al lado contrario de la flecha, para que no se salga
      const lx = -Math.cos(a) * 30, ly = -Math.sin(a) * 26 + 4;
      ctx.font = F(800, 12);
      const label = o.dead
        ? (G.Siege && G.Siege.up ? m.name + ' · K.O.' : G.I18n.f('¡{x} necesita ayuda! · {x} m', m.name, metres))
        : m.name + ' · ' + metres + ' m';
      ctx.textAlign = Math.cos(a) > 0.3 ? 'right' : Math.cos(a) < -0.3 ? 'left' : 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
      G.I18n.rawCanvas(ctx, 'strokeText', label, lx, ly);
      ctx.fillStyle = col;
      G.I18n.rawCanvas(ctx, 'fillText', label, lx, ly);
      ctx.restore();
    }

    // Tú, caído.
    if (pl.dead) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = F(800, 20);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.75)';
      const siege = !!(G.Siege && G.Siege.up);
      const left = siege && G.Siege.respawnLeft ? Math.max(1, Math.ceil(G.Siege.respawnLeft())) : 0;
      const msg = siege ? G.I18n.f('Has caído · reapareces en {x}', left)
        : G.Coop.players().every(p => p.dead) ? 'Habéis caído todos…' : 'Has caído: un compañero puede levantarte';
      ctx.strokeText(msg, w / 2, h * 0.62);
      ctx.fillStyle = '#ffb0b8';
      ctx.fillText(msg, w / 2, h * 0.62);
      const f = siege ? 0 : (pl.reviveT || 0) / G.Player.REVIVE_TIME;
      if (!siege && f > 0) bar(ctx, w / 2 - 110, h * 0.62 + 12, 220, 10, f, '#5fe08a');
      // Mirar a un compañero vivo mientras tanto (botón, Q / E o LB / RB).
      const w0 = G.Game.watching;
      if (!siege && (w0 || G.Coop.puppets().some(p => !p.dead))) {
        const m = w0 && G.Coop.mates.find(x => x.pl === w0);
        const label = (m ? G.I18n.f('Viendo a {x}', m.name) + ' · ' + G.I18n.t('cambiar') : G.I18n.t('Ver a un compañero'))
          + (G.Touch.active ? '' : '  (E)');
        ctx.font = F(800, 13);
        const bw = ctx.measureText(label).width + 28, bh = 28, bx = w / 2 - bw / 2, by = h * 0.62 + 32;
        roundRect(ctx, bx, by, bw, bh, 8);
        ctx.fillStyle = 'rgba(10,16,28,.75)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = m ? m.color : 'rgba(244,248,255,.8)'; ctx.stroke();
        ctx.fillStyle = '#f4f8ff';
        G.I18n.rawCanvas(ctx, 'fillText', label, w / 2, by + 19);
        G.Touch.addButton(bx, by, bw, bh, () => G.Game.cycleWatch(1), 8);
      }
      ctx.restore();
    }
  }

  /** Bajo el reloj: oleada, cuenta del jefe y, en el asedio, la vida del castillo propio. */
  function drawHudExtra(ctx, w, sa, st) {
    const bits = [];
    if (G.Endless && G.Endless.on()) bits.push(G.I18n.f('Oleada {x}', G.Endless.waveOf(st.time)));
    let left = null;
    if (G.Siege && G.Siege.up && G.Siege.bossSoon) left = G.Siege.bossSoon();
    else if (G.Spawner && G.Spawner.nextBossIn) left = G.Spawner.nextBossIn(st.time);
    if (left != null && left > 0 && left <= 15) bits.push(G.I18n.f('Jefe: {x}', Math.ceil(left)));
    let y = 6 + sa.top + 68;
    if (bits.length) {
      ctx.font = F(800, 13);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      const text = bits.join(' · ');
      G.I18n.rawCanvas(ctx, 'strokeText', text, w / 2, y);
      ctx.fillStyle = '#9fd4ff';
      G.I18n.rawCanvas(ctx, 'fillText', text, w / 2, y);
      y += 16;
    }
    if (!(G.Siege && G.Siege.up && G.Siege.self)) return;
    const c = G.Siege.self();
    if (!c || !(c.maxHp > 0)) return;
    const bw = Math.min(220, w * 0.42), bh = 12;
    const x = (w - bw) / 2;
    const frac = c.hp / c.maxHp;
    bar(ctx, x, y, bw, bh, frac, frac > 0.35 ? '#5fe08a' : '#ff5f6d');
    if (c.shield > 0) {
      const sh = Math.min(Math.max(0, 1 - frac), c.shield / c.maxHp);
      ctx.fillStyle = '#8fd4ff';
      ctx.fillRect(x + bw * frac, y, bw * sh, bh);
    }
    ctx.font = F(800, 10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#06210f';
    ctx.fillText(Math.ceil(c.hp) + '/' + Math.round(c.maxHp), w / 2, y + bh / 2 + 1);
  }

  /** Placa oscura del centro: tiempo, mapa, derrotas y monedas. */
  function drawRunPlate(ctx, w, sa, pl, st) {
    const id = G.World.regionId && G.World.regionId();
    const map = id ? id.toUpperCase() : (G.World.biomeName() || '').toUpperCase();
    const rawMap = !!id;
    const time = G.U.mmss(st.time);
    const kills = String(pl.kills | 0);
    const candy = String((pl.runCandy || 0) | 0);
    const icon = 15, candyH = 12, candyW = Math.round(candyH * (1322 / 652)), gap = 12;
    ctx.font = F(800, 13);
    const mapW = (rawMap ? G.I18n.rawCanvas(ctx, 'measureText', map) : ctx.measureText(map)).width;
    ctx.font = F(800, 15);
    const kW = ctx.measureText(kills).width;
    const cW = ctx.measureText(candy).width;
    ctx.font = F(800, 22);
    const timeW = ctx.measureText(time).width;
    const rowW = mapW + gap + icon + 4 + kW + gap + candyW + 4 + cW;
    const topW = 16 + 8 + timeW;
    const padX = 16;
    const boxW = Math.ceil(Math.max(topW, rowW) + padX * 2);
    const boxH = 54;
    const x = Math.round((w - boxW) / 2);
    const y = Math.round(6 + sa.top);
    roundRect(ctx, x, y, boxW, boxH, 12);
    ctx.fillStyle = 'rgba(6, 18, 52, .92)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(120, 176, 240, .7)';
    ctx.stroke();

    const cx = x + boxW / 2;
    const dropX = cx - topW / 2 + 8;
    const timeY = y + 18;
    ctx.save();
    ctx.translate(dropX, timeY);
    ctx.fillStyle = '#3ec6ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.bezierCurveTo(7, -2, 7, 4, 0, 8);
    ctx.bezierCurveTo(-7, 4, -7, -2, 0, -8);
    ctx.fill();
    ctx.fillStyle = '#e9f8ff';
    ctx.beginPath();
    ctx.arc(-2.2, -1.5, 1.7, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    ctx.font = F(800, 22);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f7fbff';
    ctx.fillText(time, dropX + 12, timeY + 1);

    let bx = cx - rowW / 2;
    const by = y + 40;
    ctx.font = F(800, 13);
    ctx.fillStyle = '#ffe08a';
    if (rawMap) G.I18n.rawCanvas(ctx, 'fillText', map, bx, by);
    else ctx.fillText(map, bx, by);
    bx += mapW + gap;
    G.Icons.draw(ctx, 'star', bx, by - 12, icon);
    bx += icon + 4;
    ctx.font = F(800, 15);
    ctx.fillStyle = '#f7fbff';
    ctx.fillText(kills, bx, by);
    bx += kW + gap;
    const pop = pl.candyT > 0 ? 1 + (pl.candySign > 0 ? 0.16 : -0.08) * Math.max(0, pl.candyT / 0.45) : 1;
    ctx.save();
    ctx.translate(bx + candyW / 2, by);
    ctx.scale(pop, pop);
    if (G.Pickups.drawCandy) G.Pickups.drawCandy(ctx, 0, 0, candyH);
    ctx.restore();
    bx += candyW + 4;
    ctx.fillStyle = pl.candyT > 0 && pl.candySign > 0 ? '#bfe4ff' : '#f7fbff';
    ctx.fillText(candy, bx, by);
    if (pl.candyT > 0 && pl.candyNote) {
      ctx.font = F(800, 11);
      ctx.fillStyle = pl.candySign > 0 ? '#9fd4ff' : '#ffb4c0';
      ctx.fillText(pl.candyNote, bx + cW + 4, by - 11);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  return { draw, roundRect, bar };
})();
