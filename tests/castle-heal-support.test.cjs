'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCastle() {
  const root = path.join(__dirname, '..');
  const code = fs.readFileSync(path.join(root, 'js/systems/castle.js'), 'utf8');
  const G = {
    U: {
      clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
      rand: (a, b) => (a + b) / 2,
      randInt: () => 0,
      dist2: () => 1e9,
      pick: a => a[0],
      hypot: Math.hypot
    },
    Modes: { isCastle: () => true, id: 'castle' },
    Coop: { active: false, isHost: true },
    FX: { dmgText() {}, ring() {}, burst() {} },
    Audio: { sfx() {} },
    Spawner: { say() {} },
    World: { setExtraShops() {}, isFree: () => true, collide() {}, pixelH: 900 },
    EnemyMgr: { all: () => [], add() {} },
    Enemies: { bagAt: () => [], bossMob: () => ({}) },
    Sprites: { Animator: function () {}, bodyHeight: () => 20, bodyRadius: () => 12 },
    Pickups: { drop() {} },
    Game: { player: null },
    I18n: { f: (s, ...a) => s, t: s => s },
    Camera: { kick() {} }
  };
  const sandbox = { G, Math, Image: function () { this.src = ''; }, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'castle.js' });
  return sandbox.G.Castle;
}

describe('castle heal support', () => {
  it('exposes heart/shop/altar constants', () => {
    const Castle = loadCastle();
    assert.equal(Castle.HEART_HEAL, 0.03);
    assert.equal(Castle.HEART_MAX_WAVE, 3);
    assert.equal(Castle.SHOP_HEAL, 0.15);
    assert.equal(Castle.ALTAR_MIN_FRAC, 0.35);
    assert.equal(Castle.PREP_SECS, 10);
    assert.equal(Castle.CORE_RANGE, 220);
    assert.equal(Castle.SHIELD_DUR, 4);
  });

  it('segment helpers match boss spacing', () => {
    const Castle = loadCastle();
    Castle.applyPreset('castle');
    assert.equal(Castle.segmentId(1), 0);
    assert.equal(Castle.segmentId(10), 0);
    assert.equal(Castle.segmentId(11), 1);
    assert.equal(Castle.isCoreDropWave(9), true);
    assert.equal(Castle.isCoreDropWave(10), false);
    Castle.applyPreset('castle20');
    assert.equal(Castle.segmentId(4), 0);
    assert.equal(Castle.segmentId(5), 1);
    assert.equal(Castle.isCoreDropWave(3), true);
    assert.equal(Castle.isCoreDropWave(19), true);
  });

  it('puppyheal item is castle-only', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js/data/items.js'), 'utf8');
    assert.match(src, /id: 'puppyheal'/);
    assert.match(src, /castleOnly:\s*true/);
  });

  it('guardian core API is present', () => {
    const Castle = loadCastle();
    assert.equal(typeof Castle.spawnGuardianCore, 'function');
    assert.equal(typeof Castle.useGuardianCore, 'function');
    assert.equal(typeof Castle.applyGuardianPulse, 'function');
    assert.equal(typeof Castle.interruptCastleBoss, 'function');
  });

  it('ditto uses normal scale and silver npc glow helpers exist', () => {
    const ditto = fs.readFileSync(path.join(__dirname, '..', 'js/systems/ditto.js'), 'utf8');
    assert.match(ditto, /Animator\(DEX,\s*1,/);
    assert.match(ditto, /paintNpc/);
    const fx = fs.readFileSync(path.join(__dirname, '..', 'js/systems/mastery-fx.js'), 'utf8');
    assert.match(fx, /function paintNpc/);
  });
});
