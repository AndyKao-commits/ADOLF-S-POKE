/* Regional survival arenas. Append-only biome registration preserves saved arena indices.
 * Geography references and design decisions: docs/region-maps.md.
 * These are representative procedural fields, not reproductions of canonical town maps.
 */
G.Regions = (() => {
  const tint = (hex, k) => '#' + hex.slice(1).match(/../g).map(v =>
    Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * k))).toString(16).padStart(2, '0')).join('');
  const defs = [
    ['kanto', '關都 Kanto', '常青林道', 'forest', '#44813d', '#86704a', '#45943f', '#3b7fc6', 'tree', 'water', .045],
    ['johto', '城都 Johto', '古林與遺跡石庭', 'ruins', '#718451', '#a49376', '#a48643', '#579aac', 'tree', 'water', .03],
    ['hoenn', '豐緣 Hoenn', '雨林水道與火山岩岸', 'river', '#50965c', '#c0aa71', '#398b51', '#31a4bf', 'tree', 'water', .035],
    ['sinnoh', '神奧 Sinnoh', '雪原與天冠山道', 'ridge', '#cfdeea', '#9eafbd', '#a4c2d4', '#9fd8f0', 'crystal', 'ice', .02],
    ['unova', '合眾 Unova', '都會街廓與河岸公園', 'city', '#6f8177', '#9ba3a4', '#648e55', '#477d9e', 'tree', 'water', .015],
    ['kalos', '卡洛斯 Kalos', '幾何花園與噴泉步道', 'garden', '#789b64', '#d4c4a4', '#ca86b3', '#75bcd0', 'tree', 'water', .025],
    ['alola', '阿羅拉 Alola', '熱帶沙灘與環礁', 'coast', '#cbbd83', '#e4d3a0', '#4daf68', '#28b7c5', 'tree', 'water', .025],
    ['galar', '伽勒爾 Galar', '曠野草原與湖畔石陣', 'moor', '#76955c', '#9c8c67', '#668b50', '#608baf', 'tree', 'water', .012],
    ['paldea', '帕底亞 Paldea', '高原荒地與環形盆地', 'crater', '#a6a16a', '#bd956c', '#93bbba', '#66b6ce', 'crystal', 'water', .012]
  ];
  const originalCount = G.Tiles.BIOMES.length;
  const list = defs.map(([id, name, subtitle, layout, floor, dirt, leaf, water, prop, liquid, trees], i) => {
    const base = G.Tiles.BIOMES[0];
    const palette = Object.assign({}, base, {
      name: name + ' · ' + subtitle, liquid, prop,
      floor: [.94, 1, 1.05].map(k => tint(floor, k)),
      dirt: [.94, 1, 1.06].map(k => tint(dirt, k)),
      speck: tint(floor, .8), light: tint(floor, 1.18),
      leaf: [.6, .8, 1, 1.2].map(k => tint(leaf, k)),
      grass: [.65, .88, 1.1].map(k => tint(leaf, k)),
      rock: [.65, .85, 1.05].map(k => tint(dirt, k)),
      wallTop: [.65, .72, .8].map(k => tint(dirt, k)),
      wallLight: tint(dirt, 1.1), wallEdge: tint(dirt, .3),
      wallFace: [.48, .4].map(k => tint(dirt, k)), wallFaceDark: tint(dirt, .28),
      liq: water, liqDeep: tint(water, .78), foam: tint(water, 1.6), shore: tint(floor, .7),
      flowers: layout === 'garden' ? ['#f6a1cb', '#e3b6ff', '#fff1b5'] : base.flowers.slice()
    });
    const biome = G.Tiles.BIOMES.push(palette) - 1;
    return { id, name, subtitle, layout, biome, trees };
  });
  const byId = Object.fromEntries(list.map(p => [p.id, p]));
  const get = id => byId[id] || null;
  const mod = (v, n) => ((v % n) + n) % n;
  // Connected 5-tile-wide routes every 48 tiles: walking routes stay reachable
  // across water, ridges and city blocks; no props spawn on these routes.
  function path(x, y) { return Math.abs(x) < 3 || Math.abs(y) < 3 || mod(x + 2, 48) < 5 || mod(y + 2, 48) < 5; }
  function terrain(p, x, y, noise) {
    if (Math.hypot(x, y) < 9 || path(x, y)) return 0;
    const n = noise(x / 12, y / 12, 101), h = noise(x / 7, y / 7, 202);
    const river = Math.abs(Math.sin(y / 19) * 8 - mod(x + 24, 48) + 24);
    switch (p.layout) {
      case 'forest': return n < .21 ? 2 : h > .82 ? 1 : 0;
      case 'ruins': return mod(x, 24) < 3 && mod(y, 24) < 13 ? 1 : n < .16 ? 2 : 0;
      case 'river': return river < 4.5 || n < .2 ? 2 : h > .88 ? 1 : 0;
      case 'ridge': return Math.abs(Math.sin(x / 9 + y / 22)) < .16 ? 1 : n < .28 ? 2 : 0;
      case 'city': return mod(x, 24) > 7 && mod(x, 24) < 15 && mod(y, 24) > 7 && mod(y, 24) < 15 ? 1 : river < 2.2 ? 2 : 0;
      case 'garden': return mod(x + 12, 24) < 4 && mod(y + 12, 24) < 4 ? 2 : 0;
      case 'coast': return Math.sin(x / 16) + Math.cos(y / 19) + (n - .5) * 2 < -.7 ? 2 : h > .92 ? 1 : 0;
      case 'moor': return n < .24 ? 2 : h > .91 ? 1 : 0;
      case 'crater': { const d = Math.hypot(mod(x + 48, 96) - 48, mod(y + 48, 96) - 48); return d > 27 && d < 30 ? 1 : d < 9 ? 2 : 0; }
      default: return 0;
    }
  }
  return { list, get, path, terrain, originalCount };
})();
