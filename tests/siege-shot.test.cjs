const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadProjectiles(siege) {
  const G = {
    LIFT: 18,
    U: {
      norm(x, y) { const m = Math.hypot(x, y); return m > 1e-6 ? [x / m, y / m] : [0, 0]; },
      damp(a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); },
      dist2(x, y, x2, y2) { const dx = x - x2, dy = y - y2; return dx * dx + dy * dy; }
    },
    Camera: { sees() { return false; } },
    Siege: siege
  };
  const src = fs.readFileSync(path.join(__dirname, '../js/entities/projectile.js'), 'utf8');
  new Function('G', src)(G);
  return G.Projectiles;
}

test('a homing shot locked onto a castle does not throw or stall the frame', () => {
  const castle = { x: 620, y: 0, r: 34, dead: false };
  const P = loadProjectiles({
    up: true, half: 832,
    ally() { return false; },
    marks() { return []; },
    pickAim() { return castle; }
  });
  const owner = { x: 400, y: 0, uid: 'me', r: 14 };
  P.spawn({ owner, x: 400, y: 0, vx: 280, vy: 0, homing: 6, life: 2.2, friendly: true, r: 6 });
  for (let i = 0; i < 200; i++) P.update(1 / 60, owner, []);
  assert.equal(P.count, 0);
});

test('nearest still finds a target that has no cy()', () => {
  const P = loadProjectiles({ up: false });
  const hit = P.nearest([{ x: 10, y: 4, dead: false }], 0, 0, 40);
  assert.equal(hit.x, 10);
});
