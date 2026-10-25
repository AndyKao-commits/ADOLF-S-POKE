const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadTouch() {
  const bag = { win: {}, doc: {}, cv: {} };
  const add = (map, type, fn) => { (map[type] ||= []).push(fn); };
  const canvas = {
    clientWidth: 800, clientHeight: 400,
    addEventListener(type, fn) { add(bag.cv, type, fn); },
    setPointerCapture() {},
    releasePointerCapture() {}
  };
  const document = {
    body: { classList: { add() {}, remove() {} } },
    addEventListener(type, fn) { add(bag.doc, type, fn); },
    createElement() { return { style: {}, remove() {} }; }
  };
  const G = {
    Settings: { touch: true, get(k) { return k === 'stick' ? 1 : null; } },
    Game: { state: 'playing' }
  };
  const src = fs.readFileSync(path.join(__dirname, '../js/core/touch.js'), 'utf8');
  new Function('G', 'document', 'addEventListener', 'performance', src)(
    G, document, (type, fn) => add(bag.win, type, fn), { now: () => 0 }
  );
  G.Touch.init(canvas);
  return { G, bag };
}

function fire(list, e) { for (const fn of list || []) fn(e); }

function pointer(id, x, y, type = 'touch') {
  return { pointerType: type, pointerId: id, clientX: x, clientY: y, preventDefault() {} };
}

/** Igual que el navegador: la ventana oye el dedo antes que el lienzo. */
function press(env, id, x, y) {
  const e = pointer(id, x, y);
  fire(env.bag.win.pointerdown, e);
  fire(env.bag.cv.pointerdown, e);
  return e;
}

function drag(env, id, x, y) {
  fire(env.bag.cv.pointermove, pointer(id, x, y));
}

test('lifting the finger on the card, not the canvas, stops the joystick', () => {
  const env = loadTouch();
  press(env, 4, 80, 200);
  drag(env, 4, 150, 200);
  assert.ok(env.G.Touch.vector()[0] > 0.5);
  // La carta tapa el lienzo: sólo la ventana recibe el "soltar".
  fire(env.bag.win.pointerup, pointer(4, 150, 200));
  assert.equal(env.G.Touch.vector(), null);
  assert.equal(env.G.Touch.stick, null);
});

test('opening a skill card drops the direction even if the finger never sends pointerup', () => {
  const env = loadTouch();
  press(env, 7, 80, 220);
  drag(env, 7, 160, 220);
  assert.ok(env.G.Touch.vector()[0] > 0.5);
  env.G.Game.state = 'levelup';
  env.G.Touch.reset();
  env.G.Game.state = 'playing';
  assert.equal(env.G.Touch.vector(), null);
  press(env, 8, 200, 220);
  drag(env, 8, 200, 300);
  assert.ok(env.G.Touch.vector()[1] > 0.5);
});

test('a cancelled touch does not keep the old direction', () => {
  const env = loadTouch();
  press(env, 3, 90, 180);
  drag(env, 3, 170, 180);
  fire(env.bag.doc.touchcancel, { changedTouches: [{ identifier: 3 }] });
  assert.equal(env.G.Touch.vector(), null);
});

test('the level-up screen is one of the screens that releases the joystick', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../js/ui/ui.js'), 'utf8');
  assert.match(ui, /scr-levelup/);
  assert.match(ui, /G\.Touch\.reset\(\)/);
});
