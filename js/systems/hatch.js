/* ============ hatch.js — huevos de incubar (no el objeto Huevo Suerte) ============
 * En la partida caen según la rareza del Pokémon derrotado. Al pasar se guardan
 * en la mochila. Desde la incubadora se meten en un hueco (hay 3). Cada partida
 * suma sus pasos, derrotas y objetos a los huevos que ya están dentro. Se abren
 * a mano, con la animación de assets/future-use/egg-hatching.
 */
G.Hatch = (() => {
  const TIERS = ['common', 'rare', 'legendary', 'epic'];
  const NAME = { common: 'Huevo común', rare: 'Huevo raro', legendary: 'Huevo legendario', epic: 'Huevo épico' };
  const NEED = { steps: 2000, kills: 2000, items: 30 };
  // Rareza del monstruo (1 común … 5 legendario) → nivel del huevo (1 común, 2 raro, 3 legendario, 4 épico).
  const FROM = { 1: 1, 2: 2, 3: 2, 4: 4, 5: 3 };
  const RATE = { 1: 0.04, 2: 0.03, 3: 0.03, 4: 0.02, 5: 0.025 };
  const REWARD = { common: 1, rare: 3, legendary: 5, epic: 4 };
  const SRC = 'assets/future-use/hatching-eggs/hatching-egg-';

  const pics = {};
  for (const t of TIERS) {
    const img = new Image();
    img.src = SRC + t + '.png';
    pics[t] = img;
  }

  function tierName(n) { return TIERS[(n | 0) - 1] || ''; }
  function tierOf(rarity) { return FROM[rarity] || 0; }
  function rateOf(rarity) { return RATE[rarity] || 0; }

  function blank() { return { bag: {}, slots: [null, null, null] }; }
  function data() {
    const s = G.DB && G.DB.save;
    if (!s) return null;
    if (!s.hatch || typeof s.hatch !== 'object') s.hatch = blank();
    if (!s.hatch.bag || typeof s.hatch.bag !== 'object') s.hatch.bag = {};
    if (!Array.isArray(s.hatch.slots)) s.hatch.slots = [null, null, null];
    while (s.hatch.slots.length < 3) s.hatch.slots.push(null);
    s.hatch.slots.length = 3;
    return s.hatch;
  }

  function collect(tier) {
    const name = tierName(tier);
    const h = data();
    if (!h || !name) return;
    h.bag[name] = Math.min(99, (h.bag[name] | 0) + 1);
  }

  const CONDS = ['steps', 'kills', 'items'];
  function condOf(slot) {
    if (!slot) return 'steps';
    if (!CONDS.includes(slot.cond)) slot.cond = CONDS[Math.floor(Math.random() * CONDS.length)];
    return slot.cond;
  }

  function ready(slot) {
    if (!slot) return false;
    const c = condOf(slot);
    return slot[c] >= NEED[c];
  }

  function place(name) {
    const h = data();
    if (!h || !h.bag[name]) return 'none';
    const i = h.slots.findIndex(s => !s);
    if (i < 0) return 'full';
    h.bag[name]--;
    if (!h.bag[name]) delete h.bag[name];
    h.slots[i] = { tier: name, steps: 0, kills: 0, items: 0, dex: 0, cond: CONDS[Math.floor(Math.random() * CONDS.length)] };
    G.DB.commit();
    return 'ok';
  }

  /** Al acabar la partida: lo de esta run se suma a los huevos ya colocados. */
  function noteRun(pl) {
    const h = data();
    if (!h || !pl) return;
    const steps = Math.floor(pl.hatchSteps || 0);
    const kills = Math.floor(pl.kills || 0);
    const items = Math.floor(pl.hatchItems || 0);
    if (!steps && !kills && !items) return;
    for (const slot of h.slots) {
      if (!slot || slot.dex) continue;
      const c = condOf(slot);
      slot[c] += c === 'steps' ? steps : c === 'kills' ? kills : items;
    }
  }

  function roll(name) {
    const want = REWARD[name];
    const pool = (G.DEX || []).filter(p => p.rarity === want);
    const save = G.DB.save;
    const missing = pool.filter(p => save && !save.owned[p.dex]);
    const list = missing.length ? missing : pool;
    if (!list.length) return 0;
    return list[Math.floor(Math.random() * list.length)].dex;
  }

  let anim = null, playing = -1, resultDex = 0, resultAnim = null, raf = 0, last = 0;

  function reduced() {
    return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function stopAnim(cancel) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (cancel && anim) anim.cancel();
    anim = null;
    playing = -1;
    const fx = document.getElementById('hatch-fx');
    if (fx) fx.classList.add('hidden');
  }

  function drawResult(ctx, x, y) {
    if (!resultAnim) return;
    resultAnim.draw(ctx, x, y + 28);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (resultAnim) resultAnim.update(dt);
    const canvas = document.getElementById('hatch-canvas');
    if (!canvas || !anim) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = pics[tierName(0)] || null;
    const slot = data() && data().slots[playing];
    anim.update(dt);
    if (!anim) return;
    anim.draw(ctx, {
      x: canvas.width / 2, y: canvas.height / 2 - 8, scale: 2,
      eggImage: slot ? pics[slot.tier] : img,
      drawResult
    });
  }

  function finish(i) {
    const h = data();
    const slot = h && h.slots[i];
    if (!slot || !slot.dex) { stopAnim(true); render(); return; }
    const dex = slot.dex;
    if (G.Research) G.Research.addPct(dex, 5);
    h.slots[i] = null;
    G.DB.commit();
    const mon = G.DEX_BY[dex];
    G.UI.toast(G.I18n.f('Investigación +5 %: {x}', mon ? mon.name : ''));
    stopAnim(false);
    render();
  }

  function openFx(i) {
    const h = data();
    const slot = h && h.slots[i];
    if (!slot || !window.EggHatching) return;
    const img = pics[slot.tier];
    if (!img || !img.complete || !img.naturalWidth) {
      G.UI.toast('Vuelve a intentarlo');
      return;
    }
    if (!slot.dex) {
      slot.dex = roll(slot.tier);
      if (!slot.dex) { G.UI.toast('Vuelve a intentarlo'); return; }
      G.DB.commit();
    }
    resultDex = slot.dex;
    resultAnim = new G.Sprites.Animator(resultDex, 2);
    G.Sprites.preload([resultDex]);
    playing = i;
    anim = EggHatching.create({ onComplete: () => finish(i) });
    anim.start({ tier: slot.tier, reducedMotion: reduced() });
    const fx = document.getElementById('hatch-fx');
    const label = document.getElementById('hatch-result');
    if (label) label.textContent = (G.DEX_BY[resultDex] || {}).name || '';
    if (fx) fx.classList.remove('hidden');
    last = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function bar(label, v, max) {
    const pct = Math.max(0, Math.min(100, v / max * 100));
    return `<div class="hatch-line"><span>${label}</span><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div><b>${Math.floor(v)} / ${max}</b></div>`;
  }

  function render() {
    const h = data();
    const slots = document.getElementById('hatch-slots');
    const bag = document.getElementById('hatch-bag');
    if (!h || !slots || !bag) return;
    slots.innerHTML = h.slots.map((slot, i) => {
      if (!slot) return `<div class="hatch-card"><p class="empty">Hueco libre</p></div>`;
      const img = SRC + slot.tier + '.png';
      const btn = slot.dex
        ? `<button class="btn gold" type="button" data-open="${i}">Abrir el huevo</button>`
        : ready(slot)
          ? `<button class="btn gold" type="button" data-open="${i}">Incubar</button>`
          : '';
      const c = condOf(slot);
      const lab = c === 'kills' ? 'Derrotas' : c === 'items' ? 'Objetos' : 'Pasos';
      return `<div class="hatch-card">
        <img src="${img}" width="40" height="48" alt="${NAME[slot.tier]}" style="image-rendering:pixelated">
        <b>${NAME[slot.tier]}</b>
        ${bar(lab, slot[c], NEED[c])}
        ${btn}
      </div>`;
    }).join('');
    slots.querySelectorAll('[data-open]').forEach(b => {
      b.onclick = () => openFx(+b.dataset.open);
    });
    const held = TIERS.filter(t => h.bag[t] > 0);
    bag.innerHTML = held.length ? held.map(t => `
      <button class="hatch-egg" type="button" data-tier="${t}">
        <img src="${SRC + t}.png" width="40" height="48" alt="${NAME[t]}" style="image-rendering:pixelated">
        <b>${NAME[t]}</b>
        <small>${h.bag[t]}</small>
      </button>`).join('') : `<p class="empty">Aún no tienes huevos de incubar.</p>`;
    bag.querySelectorAll('[data-tier]').forEach(b => {
      b.onclick = () => {
        const r = place(b.dataset.tier);
        if (r === 'full') G.UI.toast('El incubador está lleno.');
        render();
      };
    });
  }

  function open() {
    stopAnim(true);
    G.UI.show('scr-hatch', true);
    render();
  }

  function init() {
    const back = document.getElementById('hatch-back');
    if (back) back.onclick = () => { stopAnim(true); G.MenuUI.open(); };
    const skip = document.getElementById('hatch-skip');
    if (skip) skip.onclick = () => { if (anim) anim.skip(); };
  }

  return { init, open, collect, noteRun, tierOf, rateOf, tierName, NEED, pics };
})();
