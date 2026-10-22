/* ============ region-ui.js — elegir el mapa antes de una partida en solitario ============
 * Nueve regiones. El terreno lo pone G.Regions y los salvajes salen sólo de esa generación.
 * En una sala no se abre: el cooperativo sigue con el mapa de siempre.
 */
G.RegionUI = (() => {
  const $ = id => document.getElementById(id);

  function noise(x, y, salt) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const h = (ix, iy) => {
      let n = Math.imul((ix + salt * 19) ^ Math.imul(iy, 131), 2246822519);
      n = Math.imul(n ^ (n >>> 13), 3266489917);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // Misma semilla en todas las tarjetas: el dibujo no cambia al reabrir.
  const PREVIEW_SEED = 417;
  const PREVIEW_OX = 22, PREVIEW_OY = 10;
  const shown = new Map();

  function field(region) {
    return (x, y, salt) => noise(x, y, salt + PREVIEW_SEED + region.gen * 17);
  }

  /** Miniatura con el mismo pixel art del juego: suelo, orilla, árboles y rocas. */
  function paint(canvas, region) {
    if (shown.has(region.id)) {
      const prev = shown.get(region.id);
      canvas.width = prev.width;
      canvas.height = prev.height;
      canvas.getContext('2d').drawImage(prev, 0, 0);
      return;
    }
    const T = G.Tiles.T;
    const cols = 20, rows = 11;
    const sample = field(region);
    const KIND = ['floor', 'wall', 'liquid'];
    const at = (tx, ty) => KIND[G.Regions.terrain(region, tx + PREVIEW_OX, ty + PREVIEW_OY, sample)];
    const S = 6 * T;
    const dirt = (gx, gy) => noise(gx / S, gy / S, PREVIEW_SEED + 303);
    const ground = G.Tiles.paintChunk(0, 0, cols, at, dirt, region.biome, PREVIEW_SEED);
    const shot = document.createElement('canvas');
    shot.width = cols * T;
    shot.height = rows * T;
    const ctx = shot.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0, shot.width, shot.height, 0, 0, shot.width, shot.height);

    const props = [];
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
      const wx = tx + PREVIEW_OX, wy = ty + PREVIEW_OY;
      if (G.Regions.terrain(region, wx, wy, sample) !== 0 || G.Regions.path(wx, wy)) continue;
      let open = true;
      for (let b = -1; b <= 1 && open; b++) for (let a = -1; a <= 1; a++) {
        if (!a && !b) continue;
        if (G.Regions.terrain(region, wx + a, wy + b, sample) !== 0) open = false;
      }
      if (!open) continue;
      const h = G.U.hash(wx, wy, PREVIEW_SEED + 404);
      const grove = noise(wx / 10, wy / 10, PREVIEW_SEED + 505) > 0.55;
      let type = null;
      if (h < region.trees * (grove ? 3.2 : 1.8)) type = 'tree';
      else if (h > 0.965) type = 'rock';
      else if (h > 0.9) type = 'grass';
      if (type) props.push({ type, tx, ty });
    }
    props.sort((a, b) => a.ty - b.ty || a.tx - b.tx);
    for (const p of props) {
      const img = G.Tiles.propSprite(region.biome, p.type, 0);
      const x = p.tx * T + T / 2 - img.width / 2;
      const y = p.ty * T + T - img.height + (p.type === 'grass' ? 4 : 2);
      ctx.drawImage(img, Math.round(x), Math.round(y));
    }
    shown.set(region.id, shot);
    canvas.width = shot.width;
    canvas.height = shot.height;
    canvas.getContext('2d').drawImage(shot, 0, 0);
  }

  function selected() {
    return G.Regions.get(G.Settings.get('region')) || G.Regions.list[0];
  }

  function open() {
    const grid = $('region-grid');
    const cur = selected().id;
    grid.replaceChildren();
    for (const p of G.Regions.list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'region-card' + (p.id === cur ? ' on' : '');
      b.dataset.sfx = 'click';
      const canvas = document.createElement('canvas');
      paint(canvas, p);
      const name = document.createElement('b');
      name.setAttribute('translate', 'no');
      name.textContent = p.name;
      const sub = document.createElement('small');
      sub.setAttribute('translate', 'no');
      sub.textContent = p.subtitle;
      b.append(canvas, name, sub);
      b.onclick = () => {
        G.Settings.set('region', p.id);
        grid.querySelectorAll('.region-card').forEach(el => el.classList.toggle('on', el === b));
        $('region-picked').textContent = p.name;
      };
      grid.appendChild(b);
    }
    $('region-picked').textContent = selected().name;
    G.UI.show('scr-region', true);
  }

  function init() {
    $('region-back').onclick = () => G.MenuUI.open();
    $('region-start').onclick = () => G.Flow.play();
  }

  return { init, open };
})();
