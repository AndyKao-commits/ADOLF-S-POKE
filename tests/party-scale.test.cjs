const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot() {
  const ctx = {
    G: { Net: { on() {}, onPeer() {} } },
    console,
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false }),
    document: { addEventListener() {}, hidden: false }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const load = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  load('js/core/settings.js');
  load('js/net/coop.js');
  return ctx.G;
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('la fórmula de 1, 4 y 10 personas', () => {
  const { Coop } = boot();
  assert.ok(near(Coop.autoRate(1), 1));
  assert.ok(near(Coop.autoHp(1), 1));
  assert.ok(near(Coop.autoXp(1), 1));
  assert.ok(near(Coop.autoRate(4), 3.25));
  assert.ok(near(Coop.autoHp(4), 1.9));
  assert.ok(near(Coop.autoXp(4), 2.8));
  assert.ok(near(Coop.autoRate(10), 7.75));
  assert.ok(near(Coop.autoHp(10), 3.7));
  assert.ok(near(Coop.autoXp(10), 6.4));
});

test('en automático manda la gente que hay, y el máximo llega a 10', () => {
  const { Coop, Settings } = boot();
  assert.equal(Settings.get('diffMode'), 'auto');
  assert.equal(Settings.get('partyCap'), 10);
  Coop.lockRun(null, true);
  assert.ok(near(Coop.scaleRate(1), 1));
  assert.ok(near(Coop.scaleRate(4), 3.25));
  assert.ok(near(Coop.scaleHp(4), 1.9));
  assert.ok(near(Coop.preview(4).xp, 2.8));
  assert.ok(near(Coop.scaleRate(10), 7.75));
  assert.equal(Coop.clampCap(0), 1);
  assert.equal(Coop.clampCap(99), 10);
});

test('se puede fijar el número o los tres valores', () => {
  const { Coop, Settings } = boot();
  Settings.set('diffMode', 'count');
  Settings.set('diffN', 4);
  Coop.lockRun(null, true);
  assert.ok(near(Coop.scaleRate(1), 3.25));
  assert.ok(near(Coop.scaleHp(2), 1.9));
  assert.ok(near(Coop.preview(1).xp, 2.8));

  Settings.set('diffMode', 'custom');
  Settings.set('diffRate', 5);
  Settings.set('diffHp', 2);
  Settings.set('diffXp', 3);
  Coop.lockRun(null, true);
  assert.equal(Coop.scaleRate(8), 5);
  assert.equal(Coop.scaleHp(8), 2);
  assert.equal(Coop.preview(8).xp, 3);
});
