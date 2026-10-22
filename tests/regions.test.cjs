const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function world() {
  const c = {console, G: {Sprites: {PX: 2}}}; c.window = c; vm.createContext(c);
  for (const f of ['js/core/util.js', 'js/world/tiles.js', 'js/world/regions.js', 'js/world/world.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
  return c.G;
}
test('nine regions preserve original biome/arena indices and valid palettes', () => {
  const G = world(); assert.equal(G.Regions.list.length, 9);
  assert.equal(G.Tiles.arenaBiome('normal'), 3);
  assert.equal(G.Tiles.arenaBiome('judgment'), 21);
  assert.equal(new Set(G.Regions.list.map(p => p.biome)).size, 9);
  for (const p of G.Regions.list) {
    const b = G.Tiles.BIOMES[p.biome];
    assert.ok(p.biome > 21);
    for (const key of ['floor','dirt','leaf','grass','rock','wallTop','wallFace','flowers'])
      assert.ok(b[key].every(v => /^#[0-9a-f]{6}$/i.test(v)), key);
  }
});
test('every regional world has clear spawn and connected walkable corridors across chunks', () => {
  const G = world();
  for (const seed of [1, 417, 99999]) for (const p of G.Regions.list) {
    G.World.reset(seed, p.id); G.World.setBiome(G.World.runBiome(0), true);
    for (let v = -100; v <= 100; v++) {
      assert.equal(G.World.walkable(v, 0), true, p.id + ' horizontal');
      assert.equal(G.World.walkable(0, v), true, p.id + ' vertical');
      assert.equal(G.World.walkable(v, 48), true, p.id + ' bridge');
    }
    assert.ok(G.World.isFree(0, 0, 12));
  }
});
test('terrain repeats by seed, differs by region, and arena return retains selected region', () => {
  const G = world(), signatures = new Set();
  for (const p of G.Regions.list) {
    const sample = () => { const a=[]; for(let y=-60;y<60;y+=3) for(let x=-60;x<60;x+=3) a.push(G.World.kindAt(x*32+16,y*32+16)); return a.join(','); };
    G.World.reset(417,p.id); const a=sample(); G.World.reset(417,p.id); assert.equal(sample(),a); signatures.add(a);
    G.World.setBiome(G.World.runBiome(0),true);
    G.World.setArena({tx:150,ty:150,r:12,type:'fire'});
    G.World.setBiome(G.Tiles.arenaBiome('fire'),true); assert.equal(G.World.liquidKind(),'lava');
    G.World.setArena(null); G.World.setBiome(G.World.runBiome(4),true); assert.equal(G.World.biome,p.biome);
  }
  assert.equal(signatures.size,9);
  G.World.reset(1); assert.equal(G.World.runBiome(2),2); assert.equal(G.World.runBiome(22),0);
  G.World.reset(1,'invalid'); assert.equal(G.World.runBiome(0),0);
});
