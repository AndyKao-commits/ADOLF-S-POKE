/* 遺忘爺爺：每局只抽一次是否來訪；素材完成前以可辨識的像素風暫代外觀顯示。 */
G.MoveForgetter = (() => {
  const lang = (G.I18n && G.I18n.lang) || 'es';
  const texts = lang === 'zh-Hant' ? {
    'Abuelo Olvido': '遺忘爺爺',
    '¡Ha llegado el Abuelo Olvido! Ve a buscarlo para olvidar un movimiento': '遺忘爺爺到來，快去找他遺忘技能！',
    'Elige el movimiento que quieres olvidar. Debes conservar al menos uno.': '選擇要遺忘的招式，至少必須保留一個招式。',
    'Ahora no': '暫時不要', 'No puedes olvidar tu único movimiento': '只剩一個招式時無法遺忘',
    'Has olvidado {x}': '已遺忘 {x}'
  } : lang === 'zh-Hans' ? {
    'Abuelo Olvido': '遗忘爷爷',
    '¡Ha llegado el Abuelo Olvido! Ve a buscarlo para olvidar un movimiento': '遗忘爷爷到来，快去找他遗忘技能！',
    'Elige el movimiento que quieres olvidar. Debes conservar al menos uno.': '选择要遗忘的招式，至少必须保留一个招式。',
    'Ahora no': '暂时不要', 'No puedes olvidar tu único movimiento': '只剩一个招式时无法遗忘',
    'Has olvidado {x}': '已遗忘 {x}'
  } : lang === 'en' ? {
    'Abuelo Olvido': 'Move Forgetter',
    '¡Ha llegado el Abuelo Olvido! Ve a buscarlo para olvidar un movimiento': 'The Move Forgetter has arrived! Find him to forget a move',
    'Elige el movimiento que quieres olvidar. Debes conservar al menos uno.': 'Choose a move to forget. You must keep at least one.',
    'Ahora no': 'Not now', 'No puedes olvidar tu único movimiento': 'You cannot forget your only move',
    'Has olvidado {x}': 'Forgot {x}'
  } : null;
  if (texts) G.I18n.add(texts);
  const CHANCE = 0.45;
  const USE_R = 62;
  const sprite = new Image();
  sprite.src = 'assets/future-use/npc/move-forgetter/move-forgetter.png';
  let npc = null, due = Infinity, used = false, announced = false;

  function reset() {
    npc = null; used = false; announced = false;
    due = Math.random() < CHANCE ? G.U.rand(180, 480) : Infinity;
  }

  function freeNear(pl) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = G.U.rand(220, 360);
      const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d;
      if (G.World.isFree(x, y, 16)) return { x, y };
    }
    return { x: pl.x + 220, y: pl.y };
  }

  function spawn(pl) {
    const p = freeNear(pl);
    npc = { x: p.x, y: p.y, tx: p.x, ty: p.y, wait: 0, bob: 0, leaving: false };
    if (G.MasteryFX) G.MasteryFX.paintNpc(npc, { dex: 0, r: 14, bodyH: 48 });
    announced = true;
    G.Audio.sfx('select');
    G.Spawner.say('¡Ha llegado el Abuelo Olvido! Ve a buscarlo para olvidar un movimiento', 4.5, true);
  }

  function update(dt, pl, time) {
    if (!pl || used || G.Modes.is('siege') || G.Modes.isCastle() || G.Rift.inArena || G.Judgment.active) return;
    if (!npc && time >= due) spawn(pl);
    if (!npc) return;
    npc.bob += dt;
    if (G.MasteryFX) G.MasteryFX.update(npc, dt);
    npc.wait -= dt;
    if (npc.wait <= 0 || G.U.dist2(npc.x, npc.y, npc.tx, npc.ty) < 12 * 12) {
      npc.wait = G.U.rand(2.5, 5.5);
      const a = Math.random() * Math.PI * 2, d = G.U.rand(45, 120);
      const tx = npc.x + Math.cos(a) * d, ty = npc.y + Math.sin(a) * d;
      if (G.World.isFree(tx, ty, 16)) { npc.tx = tx; npc.ty = ty; }
    }
    const dx = npc.tx - npc.x, dy = npc.ty - npc.y, n = Math.hypot(dx, dy) || 1;
    npc.x += dx / n * Math.min(n, 24 * dt);
    npc.y += dy / n * Math.min(n, 24 * dt);
  }

  function near(pl) {
    return !!(npc && !used && pl && !pl.dead && G.U.dist2(pl.x, pl.y, npc.x, npc.y) <= USE_R * USE_R);
  }

  function leave() {
    used = true;
    if (npc) {
      const pl = G.Game.player;
      if (pl && Array.isArray(pl.marks)) {
        pl.marks = pl.marks.filter(m => m.kind !== 'forgetter' && G.U.dist2(m.x, m.y, npc.x, npc.y) >= 28 * 28);
        pl.mark = pl.marks.length ? pl.marks[pl.marks.length - 1] : null;
      }
      if (G.MasteryFX) G.MasteryFX.clear(npc);
      G.FX.ring(npc.x, npc.y - 18, 8, 64, '#bba7ff', 0.55, 4);
      G.FX.burst(npc.x, npc.y - 24, '#d7caff', 20, 150);
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
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (sprite.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, x - 29, y - 63, 58, 63);
    } else {
      // 素材還沒載入或路徑失效時仍保留可互動的暫代人物。
      ctx.fillStyle = '#573f78'; ctx.fillRect(x - 10, y - 29, 20, 27);
      ctx.fillStyle = '#d8c7ff'; ctx.fillRect(x - 8, y - 45, 16, 17);
      ctx.fillStyle = '#f2efff'; ctx.fillRect(x - 11, y - 30, 22, 8);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 40, 4, 4); ctx.fillRect(x + 2, y - 40, 4, 4);
      ctx.fillStyle = '#33264c'; ctx.fillRect(x - 5, y - 39, 2, 2); ctx.fillRect(x + 3, y - 39, 2, 2);
    }
    if (G.MasteryFX) G.MasteryFX.drawNpcFront(ctx, npc);
    ctx.font = '700 10px Pixelify, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3b0'; ctx.strokeStyle = '#10162c'; ctx.lineWidth = 3;
    ctx.strokeText(G.T('Abuelo Olvido'), x, y - 70); ctx.fillText(G.T('Abuelo Olvido'), x, y - 70);
    ctx.restore();
  }

  return { reset, update, near, leave, drawable, draw, get position() { return npc; }, get used() { return used; }, get announced() { return announced; } };
})();
