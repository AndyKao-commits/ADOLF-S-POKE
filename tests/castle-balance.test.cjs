const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot() {
  const ctx = { G: {}, console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js/systems/castle.js'), 'utf8'),
    ctx,
    { filename: 'js/systems/castle.js' }
  );
  return ctx.G.Castle;
}

test('保护小奶狗的双人 Boss 生命约为单人的 2.1 倍', () => {
  const Castle = boot();
  assert.equal(Castle.partyScale(1).bossHp, 1);
  assert.ok(Math.abs(Castle.partyScale(2).bossHp - 2.1) < 1e-9);
});

test('普通小怪的多人增幅低于 Boss，且场上上限会增加', () => {
  const Castle = boot();
  const duo = Castle.partyScale(2);
  assert.equal(duo.mobHp, 1.3);
  assert.equal(duo.count, 1.22);
  assert.equal(duo.damage, 1.08);
  assert.equal(duo.cap, 14);
  assert.ok(duo.bossHp > duo.mobHp);
});

test('十人房不会让场上上限超过 30', () => {
  const Castle = boot();
  assert.equal(Castle.partyScale(99).players, 10);
  assert.equal(Castle.partyScale(10).cap, 30);
});

test('小奶狗与第 50 波最终决战采用新的固定规则', () => {
  const Castle = boot();
  assert.equal(Castle.balance.puppyHp, 4500);
  assert.equal(Castle.balance.finalWave, 50);
  assert.equal(Castle.balance.finalHpMul, 2.4);
  assert.equal(Castle.balance.finalVisualMul, 4.2);
  assert.equal(Castle.balance.finalMinPuppyHp, 0.4);
});
