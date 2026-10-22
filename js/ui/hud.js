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

  function radar(ctx, w, h, pl) {
    const R = 52, cx = w - R - 14, cy = G.Touch.active ? 118 : 72;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
    ctx.fillStyle = 'rgba(6, 16, 32, .72)';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.strokeStyle = 'rgba(244,248,255,.18)';
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, 6.2832); ctx.stroke();
    const REACH = 820;
    const dot = (x, y, col, rad) => {
      const dx = (x - pl.x) / REACH * (R - 4), dy = (y - pl.y) / REACH * (R - 4);
      if (dx * dx + dy * dy > (R - 4) * (R - 4)) return;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx + dx, cy + dy, rad, 0, 6.2832); ctx.fill();
    };
    if (G.World.shops) for (const s of G.World.shops) dot(s.x, s.y, '#ffd23f', 3.5);
    for (const p of G.Pickups.all()) {
      if (p.kind === 'egg') dot(p.x, p.y, '#ffe08a', 3);
      else if (p.kind === 'ball') dot(p.x, p.y, p.value >= 3 ? '#d7c6ff' : p.value === 2 ? '#7eb6ff' : '#ff6b6b', 3);
    }
    for (const e of G.EnemyMgr.all()) if (!e.dead) dot(e.x, e.y, e.boss ? '#ff3b4e' : '#ff8a96', e.boss ? 3.2 : 2.2);
    if (G.Coop && G.Coop.active && G.Coop.puppets) {
      for (const m of G.Coop.puppets()) if (!m.dead) dot(m.x, m.y, '#5fd4ff', 3);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, 6.2832); ctx.fill();
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
    const dot = (wx, wy, col, rad, sq) => {
      const [sx, sy] = at(wx, wy);
      ctx.fillStyle = col;
      if (sq) ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
      else { ctx.beginPath(); ctx.arc(sx, sy, rad, 0, 6.2832); ctx.fill(); }
      hits.push({ sx, sy, x: wx, y: wy, col });
    };
    if (G.World.shops) for (const s of G.World.shops) dot(s.x, s.y, '#ffd23f', 6, true);
    for (const p of G.Pickups.all()) {
      if (p.kind === 'egg') dot(p.x, p.y, '#ffe08a', 5, false);
      else if (p.kind === 'ball') dot(p.x, p.y, p.value >= 3 ? '#d7c6ff' : p.value === 2 ? '#7eb6ff' : '#ff6b6b', 5, false);
    }
    for (const e of G.EnemyMgr.all()) if (!e.dead) dot(e.x, e.y, e.boss ? '#ff3b4e' : '#ff8a96', e.boss ? 6 : 4, false);
    if (G.Coop && G.Coop.active && G.Coop.puppets) {
      for (const m of G.Coop.puppets()) if (!m.dead) dot(m.x, m.y, '#5fd4ff', 5, false);
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

  function dashButton(ctx, w, h, pl, touch) {
    const bs = 54;
    const bx = w - bs - 18, by = h - bs - (touch ? 28 : 18);
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
    const zh = String((G.I18n && G.I18n.lang) || '').startsWith('zh');
    ctx.fillText(zh ? '衝刺' : (touch ? '衝刺' : 'SPACE'), bx + bs / 2, by + bs + 14);
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
        if (n > 1) {
          ctx.font = F(800, 10);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,.75)';
          ctx.strokeText(String(n), ix + icon + 1, iy + icon + 1);
          ctx.fillStyle = '#ffd23f';
          ctx.fillText(String(n), ix + icon + 1, iy + icon + 1);
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

    // ---------- reloj / bioma / kills ----------
    ctx.textAlign = 'center';
    ctx.font = F(800, 26);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fillText(G.U.mmss(st.time), w / 2, 42);
    ctx.font = F(600, 10);
    ctx.fillStyle = '#8fa3c4';
    ctx.fillText(G.World.biomeName().toUpperCase() + '  ·  ' + pl.kills + ' DERROTADOS  ·  ' + pl.coins + ' MONEDAS', w / 2, 58);

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
      ctx.fillText('GRIETA · ' + G.U.mmss(G.Rift.timeLeft), w / 2, boss ? 98 : 76);
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
    const S = 54, GAP = 9;
    const n = Math.max(1, pl.slots.length);
    const totalW = n * S + (n - 1) * GAP;
    let sx = (w - totalW) / 2;
    // Por encima de la barra de inicio del iPhone (allí los toques a veces no llegan).
    let sy = h - S - 18 - (touch ? Math.min(28, G.Touch.safeArea().bottom) : 0);
    // En móvil, donde la haya puesto el jugador: el bloque objeto + todos los
    // huecos (aunque aún no estén llenos), por su centro, como en el editor
    // (layout-ui.js); los ataques nuevos van saliendo hacia la derecha.
    const pb = touch && G.Touch.spot('bar');
    if (pb) {
      const nAll = Math.max(n, pl.maxMoves), bw = nAll * S + (nAll - 1) * GAP;
      sx = G.U.clamp(pb[0] * w - bw / 2, 6, Math.max(6, w - bw - 6));
      sy = G.U.clamp(pb[1] * h - S / 2, 24, h - S - 6);
    }
    const BOND = '#ff8ad8';
    const cdOf = m => m.kind === 'orbit' ? 0 : G.U.clamp(m.t / (m.cd * pl.cdMul), 0, 1);

    for (let i = 0; i < n; i++) {
      const g = pl.slots[i] || [];
      const m = g[0];
      const fused = g.length > 1;
      const on = g.on !== false;
      const focused = i === (pl.focus || 0);
      const x = sx + i * (S + GAP);
      const y = on ? sy - 6 : sy;
      // Un toque enciende o apaga. Al aprenderlo ya está encendido.
      if (m) G.Touch.addButton(x, y, S, S, () => { if (G.Game.state === 'playing') pl.toggleSlot(i); }, GAP / 2 + 3);
      const col = m ? G.U.TYPE_COLOR[m.type] : '#4a5468';

      // fondo
      roundRect(ctx, x, y, S, S, 12);
      ctx.fillStyle = on ? 'rgba(20,30,50,.95)' : 'rgba(10,16,28,.8)';
      ctx.fill();
      ctx.lineWidth = on ? 2.5 : fused || (m && m.evolved) ? 2 : 1.2;
      // Vínculo: borde rosa. Evolucionado: dorado.
      ctx.strokeStyle = fused ? BOND : m && m.evolved ? '#ffd23f' : on ? col : 'rgba(140,170,210,.22)';
      ctx.stroke();

      if (!m) continue;

      if (fused) {
        // Vínculo: los movimientos en una cuadrícula de 2×2, cada uno con su recarga.
        const C = 22, P = (S - C * 2) / 3;
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
        G.Icons.draw(ctx, 'move:' + m.id, x + (S - 32) / 2, y + (S - 32) / 2 - 2, 32);

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
      if (!on) {
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
      const bx = sx + totalW + 12, by = sy + S / 2 - 12;
      G.Icons.draw(ctx, 'bond', bx, by, 24);
      if (pl.bonds > 1) {
        ctx.font = F(800, 10);
        ctx.textAlign = 'left';
        ctx.fillStyle = BOND;
        ctx.fillText('×' + pl.bonds, bx + 25, by + 20);
      }
    }

    radar(ctx, w, h, pl);
    pinArrow(ctx, w, h, pl);
    if (G.UI.isOpen('scr-map')) paintMap(document.getElementById('map-radar'), pl);
    dashButton(ctx, w, h, pl, touch);

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
      ctx.fillText(touch ? '拖曳移動  ·  點招式開關  ·  右上角地圖  ·  右下角衝刺'
                         : 'WASD move  ·  1-4 toggle moves  ·  M map  ·  Space dash  ·  Esc pause', w / 2, h - 4);
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
      const label = o.dead ? G.I18n.f('¡{x} necesita ayuda! · {x} m', m.name, metres) : m.name + ' · ' + metres + ' m';
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
      const msg = G.Coop.players().every(p => p.dead) ? 'Habéis caído todos…' : 'Has caído: un compañero puede levantarte';
      ctx.strokeText(msg, w / 2, h * 0.62);
      ctx.fillStyle = '#ffb0b8';
      ctx.fillText(msg, w / 2, h * 0.62);
      const f = (pl.reviveT || 0) / G.Player.REVIVE_TIME;
      if (f > 0) bar(ctx, w / 2 - 110, h * 0.62 + 12, 220, 10, f, '#5fe08a');
      // Mirar a un compañero vivo mientras tanto (botón, Q / E o LB / RB).
      const w0 = G.Game.watching;
      if (w0 || G.Coop.puppets().some(p => !p.dead)) {
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

  return { draw, roundRect, bar };
})();
