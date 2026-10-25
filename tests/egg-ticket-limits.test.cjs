const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function hatch() {
  const ctx = { G: {}, Image: class Image {}, console };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'js/systems/hatch.js'), 'utf8'),
    ctx,
    { filename: 'js/systems/hatch.js' }
  );
  return ctx.G.Hatch;
}

test('四種孵化蛋使用各自的研究進度範圍', () => {
  const Hatch = hatch();
  assert.deepEqual({ ...Hatch.researchRange('common') }, { min: 5, max: 10 });
  assert.deepEqual({ ...Hatch.researchRange('rare') }, { min: 8, max: 13 });
  assert.deepEqual({ ...Hatch.researchRange('legendary') }, { min: 11, max: 16 });
  assert.deepEqual({ ...Hatch.researchRange('epic') }, { min: 15, max: 20 });
});

test('孵化蛋研究進度亂數包含上下限', () => {
  const Hatch = hatch();
  assert.equal(Hatch.rollResearch('common', () => 0), 5);
  assert.equal(Hatch.rollResearch('common', () => 0.999999), 10);
  assert.equal(Hatch.rollResearch('epic', () => 0), 15);
  assert.equal(Hatch.rollResearch('epic', () => 0.999999), 20);
});

test('每局一般券與十連券在共同拾取入口限制為 25 與 2', () => {
  const game = fs.readFileSync(path.join(__dirname, '..', 'js/game.js'), 'utf8');
  const ui = fs.readFileSync(path.join(__dirname, '..', 'js/ui/run-ui.js'), 'utf8');
  assert.match(game, /TICKET_LIMIT = Object\.freeze\(\{ t1: 25, t10: 2 \}\)/);
  assert.match(game, /pl\[key\] >= TICKET_LIMIT\[key\]/);
  assert.match(game, /Math\.min\(TICKET_LIMIT\[key\]/);
  assert.match(ui, /\$\{r\.t1 \|\| 0\}\/\$\{ticketLimit\.t1\}/);
  assert.match(ui, /\$\{r\.t10 \|\| 0\}\/\$\{ticketLimit\.t10\}/);
});

