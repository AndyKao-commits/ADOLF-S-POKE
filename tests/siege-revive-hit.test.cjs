const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('puppet netUpdate lowers reviveSafe so a revived rival is hittable again in siege', () => {
  const src = fs.readFileSync(path.join(__dirname, '../js/entities/player.js'), 'utf8');
  const net = src.slice(src.indexOf('netUpdate(dt)'), src.indexOf('\n  draw(ctx)'));
  assert.match(net, /else if \(!n\.dead && this\.dead\) this\.revive\(/);
  assert.match(net, /if \(this\.reviveSafe > 0\) this\.reviveSafe -= dt;/);
  assert.match(net, /if \(this\.invuln > 0\) this\.invuln -= dt;/);
  assert.match(net, /if \(this\.spawnGuard > 0\) this\.spawnGuard -= dt;/);
  const afterAlive = net.slice(net.indexOf('if (this.dead) return;'));
  assert.match(afterAlive, /reviveSafe -= dt/);
});

test('siege skips rivals only while reviveSafe or spawnGuard is still up', () => {
  const src = fs.readFileSync(path.join(__dirname, '../js/systems/siege.js'), 'utf8');
  assert.match(src, /if \(\(o\.spawnGuard \|\| 0\) > 0 \|\| \(o\.reviveSafe \|\| 0\) > 0\) continue;/);
  assert.match(src, /if \(\(body\.spawnGuard \|\| 0\) > 0 \|\| \(body\.reviveSafe \|\| 0\) > 0\) return;/);
});
