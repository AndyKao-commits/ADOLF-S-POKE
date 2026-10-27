/* 百變怪：每局來一次。靠近後按 E，從身上已有的道具選一種，再複製一個。復活類不複製。 */
G.Ditto = (() => {
  const lang = (G.I18n && G.I18n.lang) || 'es';
  const texts = lang === 'zh-Hant' ? {
    'Ditto': '百變怪',
    '¡Ha llegado Ditto! Ve a buscarlo: puede copiar un objeto que ya llevas': '百變怪出現了，去找牠。牠可以複製你身上的一種道具',
    'Elige un objeto que ya llevas. Ditto copia uno. Revivir no se copia.': '選一種你現在帶的道具。百變怪會再複製一個。復活類不能複製。',
    'No llevas ningún objeto que se pueda copiar': '你現在沒有可以複製的道具',
    'Ditto ha copiado {x}': '百變怪複製了{x}'
  } : lang === 'zh-Hans' ? {
    'Ditto': '百变怪',
    '¡Ha llegado Ditto! Ve a buscarlo: puede copiar un objeto que ya llevas': '百变怪出现了，去找它。它可以复制你身上的一种道具',
    'Elige un objeto que ya llevas. Ditto copia uno. Revivir no se copia.': '选一种你现在带的道具。百变怪会再复制一个。复活类不能复制。',
    'No llevas ningún objeto que se pueda copiar': '你现在没有可以复制的道具',
    'Ditto ha copiado {x}': '百变怪复制了{x}'
  } : lang === 'en' ? {
    'Ditto': 'Ditto',
    '¡Ha llegado Ditto! Ve a buscarlo: puede copiar un objeto que ya llevas': 'Ditto is here. Find it. It can copy one item you already carry',
    'Elige un objeto que ya llevas. Ditto copia uno. Revivir no se copia.': 'Choose an item you already carry. Ditto copies one. Revives are not copied.',
    'No llevas ningún objeto que se pueda copiar': 'You have no item that can be copied',
    'Ditto ha copiado {x}': 'Ditto copied {x}'
  } : null;
  if (texts) G.I18n.add(texts);
  const DEX = 132, USE_R = 62;
  let npc = null, due = Infinity, used = false;

  function reset() {
    npc = null; used = false;
    due = G.U.rand(160, 420);
  }

  function freeNear(pl) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = G.U.rand(220, 360);
      const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d;
      if (G.World.isFree(x, y, 16)) return { x, y };
    }
    return { x: pl.x + 240, y: pl.y };
  }

  function spawn(pl) {
    const p = freeNear(pl);
    G.Sprites.preload([DEX]);
    let anim = null;
    try {
      anim = new G.Sprites.Animator(DEX, 1, false);
      anim.loop('Idle');
      anim.dir = G.Sprites.dirFromAngle(Math.PI / 2);
    } catch (e) { anim = null; }
    npc = { x: p.x, y: p.y, tx: p.x, ty: p.y, wait: 0, bob: 0, anim };
    if (G.MasteryFX) G.MasteryFX.paintNpc(npc, { dex: DEX, r: 12, bodyH: 24 });
    G.Audio.sfx('select');
    G.Spawner.say('¡Ha llegado Ditto! Ve a buscarlo: puede copiar un objeto que ya llevas', 4.5, true);
  }

  function update(dt, pl, time) {
    if (!pl || used || G.Modes.is('siege') || G.Modes.isCastle() || G.Rift.inArena || G.Judgment.active) return;
    if (!npc && time >= due) spawn(pl);
    if (!npc) return;
    npc.bob += dt;
    if (npc.anim) npc.anim.update(dt);
    if (G.MasteryFX) G.MasteryFX.update(npc, dt);
    npc.wait -= dt;
    if (npc.wait <= 0 || G.U.dist2(npc.x, npc.y, npc.tx, npc.ty) < 12 * 12) {
      npc.wait = G.U.rand(2.5, 5.5);
      const a = Math.random() * Math.PI * 2, d = G.U.rand(40, 110);
      const tx = npc.x + Math.cos(a) * d, ty = npc.y + Math.sin(a) * d;
      if (G.World.isFree(tx, ty, 16)) { npc.tx = tx; npc.ty = ty; }
    }
    const dx = npc.tx - npc.x, dy = npc.ty - npc.y, n = Math.hypot(dx, dy) || 1;
    const step = Math.min(n, 22 * dt);
    npc.x += dx / n * step;
    npc.y += dy / n * step;
    if (npc.anim && step > 0.4) npc.anim.dir = G.Sprites.dirFromAngle(Math.atan2(dy, dx));
  }

  function near(pl) {
    return !!(npc && !used && pl && !pl.dead && G.U.dist2(pl.x, pl.y, npc.x, npc.y) <= USE_R * USE_R);
  }

  function leave() {
    used = true;
    if (npc) {
      const pl = G.Game.player;
      if (pl && Array.isArray(pl.marks)) {
        pl.marks = pl.marks.filter(m => m.kind !== 'ditto' && G.U.dist2(m.x, m.y, npc.x, npc.y) >= 28 * 28);
        pl.mark = pl.marks.length ? pl.marks[pl.marks.length - 1] : null;
      }
      if (G.MasteryFX) G.MasteryFX.clear(npc);
      G.FX.ring(npc.x, npc.y - 16, 8, 64, '#f2a3d0', 0.55, 4);
      G.FX.burst(npc.x, npc.y - 20, '#ffd0ea', 18, 140);
    }
    npc = null;
  }

  function drawable() { return npc; }
  function draw(ctx) {
    if (!npc) return;
    const x = Math.round(npc.x), y = Math.round(npc.y + Math.sin(npc.bob * 3) * 1.5);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (G.MasteryFX) G.MasteryFX.drawNpc(ctx, npc);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (npc.anim) {
      G.Sprites.drawShadow(ctx, DEX, x, y, 1);
      npc.anim.draw(ctx, x, y);
    } else {
      ctx.fillStyle = '#e070b0'; ctx.beginPath(); ctx.ellipse(x, y - 12, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, y - 15, 2, 2); ctx.fillRect(x + 2, y - 15, 2, 2);
    }
    if (G.MasteryFX) G.MasteryFX.drawNpcFront(ctx, npc);
    ctx.font = '700 10px Pixelify, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd0ea'; ctx.strokeStyle = '#10162c'; ctx.lineWidth = 3;
    ctx.strokeText(G.T('Ditto'), x, y - 40); ctx.fillText(G.T('Ditto'), x, y - 40);
    ctx.restore();
  }

  return { reset, update, near, leave, drawable, draw, get position() { return npc; }, get used() { return used; } };
})();
