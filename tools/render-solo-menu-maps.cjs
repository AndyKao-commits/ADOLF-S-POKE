/* Render the nine selector thumbnails from the same regional terrain code used by the game. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createCanvas } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas')
  : '@napi-rs/canvas');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/prototypes/solo-menu/maps');
fs.mkdirSync(out, { recursive: true });
const sandbox = { console, G: { Sprites: { PX: 2 } }, document: { createElement: () => createCanvas(1, 1) } };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of ['js/core/util.js', 'js/world/tiles.js', 'js/world/regions.js', 'js/world/region-art.js', 'js/world/world.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
}
sandbox.G.FX = { twinkle() {} };
for (const region of sandbox.G.Regions.list) {
  sandbox.G.World.reset(417, region.id);
  sandbox.G.World.setBiome(region.biome, true);
  const canvas = createCanvas(360, 210);
  const ctx = canvas.getContext('2d');
  const camera = { w: 360, h: 210, left: () => 470, top: () => 485, sees: () => true };
  ctx.imageSmoothingEnabled = false;
  ctx.translate(-camera.left(), -camera.top());
  sandbox.G.World.drawGround(ctx, camera);
  for (const prop of sandbox.G.World.visibleProps(camera).sort((a, b) => a.y - b.y)) {
    sandbox.G.World.drawProp(ctx, prop, 0);
  }
  fs.writeFileSync(path.join(out, `${region.id}.png`), canvas.toBuffer('image/png'));
}
console.log(`Rendered ${sandbox.G.Regions.list.length} region thumbnails to ${path.relative(root, out)}`);
