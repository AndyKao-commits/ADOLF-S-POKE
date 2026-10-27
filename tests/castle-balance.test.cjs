const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot() {
  const ctx = { G: {}, console, Image: function () { this.src = ''; } };
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
  Castle.applyPreset('castle');
  const duo = Castle.partyScale(2);
  assert.equal(duo.mobHp, 1.3);
  assert.equal(duo.count, 1.22);
  assert.equal(duo.damage, 1.08);
  assert.equal(duo.cap, 18);
  assert.ok(duo.bossHp > duo.mobHp);
});

test('十人房不会让场上上限超过 34', () => {
  const Castle = boot();
  Castle.applyPreset('castle');
  assert.equal(Castle.partyScale(99).players, 10);
  assert.equal(Castle.partyScale(10).cap, 34);
});

test('50 波与 20 波是两套固定规则', () => {
  const Castle = boot();
  const full = Castle.balanceOf('castle');
  const fast = Castle.balanceOf('castle20');
  assert.equal(full.waves, 50);
  assert.equal(full.bossEvery, 10);
  assert.equal(full.puppyHp, 4500);
  assert.equal(full.winWave, 51);
  assert.equal(full.bite, 'classic');
  assert.equal(full.finalHpMul, 2.8);
  assert.equal(full.bossEscortRatio, 0.60);
  assert.equal(full.heartRate, 0.10);
  assert.equal(full.shopHeal, 0.15);
  assert.equal(fast.waves, 20);
  assert.equal(fast.bossEvery, 4);
  assert.equal(fast.puppyHp, 3200);
  assert.equal(fast.winWave, 21);
  assert.equal(fast.bite, 'sprint');
  assert.equal(fast.finalHpMul, 2.4);
  assert.equal(fast.bossEscortRatio, 0.50);
  assert.equal(fast.heartRate, 0.08);
  assert.equal(fast.shopHeal, 0.12);
  assert.equal(fast.bossDmgMul, 1.75);
});

test('20 波把压力映射到旧的 1–50 曲线', () => {
  const Castle = boot();
  Castle.applyPreset('castle20');
  assert.equal(Castle.pressureOf(1), 1);
  assert.ok(Math.abs(Castle.pressureOf(20) - 50) < 1e-9);
  Castle.applyPreset('castle');
  assert.equal(Castle.pressureOf(46), 46);
});

test('20 波普通怪咬伤使用独立百分比，间隔不少于 0.40', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js/systems/castle.js'), 'utf8');
  assert.match(source, /bite === 'sprint'/);
  assert.match(source, /cd = 0\.40/);
  assert.match(source, /Math\.min\(0\.05, 0\.009 \+ pw \* 0\.00082\)/);
  assert.match(source, /Math\.min\(0\.065, basePct \* difficultyMul\)/);
});

test('Boss 波保留可预警的奶狗百分比伤害，不使用随机秒杀', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js/systems/castle.js'), 'utf8');
  assert.match(source, /e\.castleBossWindup = 1\.1/);
  assert.match(source, /const pct = 0\.06 \+ tier \* 0\.015/);
  assert.doesNotMatch(source, /Math\.random\(\).*hp\s*=\s*0/);
});

test('Modes 同时提供 castle 与 castle20', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js/systems/modes.js'), 'utf8');
  assert.match(src, /'castle20'/);
  assert.match(src, /isCastle/);
  assert.match(src, /Cachorro rápido/);
});
