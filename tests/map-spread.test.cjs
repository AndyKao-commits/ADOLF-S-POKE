const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const hud = fs.readFileSync(path.join(root, 'js/ui/hud.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');

test('paid balls start in near and far rings and later rotate through three distance bands', () => {
  assert.match(game, /placeField\(\{ min: 420, max: 780, paid: true \}\)/);
  assert.match(game, /placeField\(\{ min: 1250, max: 1900, paid: true \}\)/);
  assert.match(game, /\[\[420, 780\], \[780, 1250\], \[1250, 1900\]\]/);
  assert.match(game, /if \(n >= 6\) return/);
});

test('large map has a distance-sorted object list and supports three tracked targets', () => {
  assert.match(html, /id="map-objects"/);
  assert.match(hud, /out\.sort\(\(a, b\) => a\.d - b\.d\)/);
  assert.match(hud, /if \(marks\.length >= 3\) marks\.shift\(\)/);
});

test('the object list keeps NPCs, balls and eggs, and a dead target drops its track', () => {
  assert.match(hud, /drawMonIcon/);
  assert.doesNotMatch(hud, /add\(e\.x, e\.y, e\.boss \? 'boss' : 'enemy'/);
  assert.match(hud, /function syncMarks/);
  assert.match(hud, /if \(!live\) continue/);
  assert.doesNotMatch(html, /id="map-legend"/);
});

test('Move Forgetter is shown in the radar, object list and edge indicator', () => {
  assert.match(hud, /G\.MoveForgetter\.position/);
  assert.match(hud, /kind === 'forgetter'/);
  assert.match(hud, /遺忘爺爺/);
});
