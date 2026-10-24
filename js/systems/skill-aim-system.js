/* ============ skill-aim-system.js — apuntar ataques en el asedio ============
 * En el asedio no hay ataque automático. El móvil (pantalla táctil) arrastra
 * el icono del ataque para apuntar y suelta para lanzar. El ordenador elige
 * con 1–4 y apunta con el ratón. Fuera del asedio los ataques siguen solos.
 */
G.SkillAim = (() => {
  const AimState = { IDLE: 'idle', PRESSING: 'pressing', AIMING: 'aiming', CANCELLED: 'cancelled', CASTING: 'casting' };
  const HOLD_MS = 150;
  const DRAG_PX = 8;
  const CANCEL_R = 22;
  const STICK_PX = 64;

  const gestures = new Map();
  let buttons = [];
  let lastDir = null;
  let sequence = 0;
  let lastRequest = null;

  function manual() {
    return !!(G.Siege && G.Siege.up && G.Game && G.Game.state === 'playing');
  }

  function lineRange(m) {
    if (m.speed && m.life) return Math.max(80, Math.min(520, m.speed * m.life));
    if (m.radius) return m.radius;
    return 320;
  }

  function profile(m) {
    const kind = (m && m.kind) || 'projectile';
    if (kind === 'melee' || kind === 'cone') {
      const len = kind === 'cone' ? Math.max(70, (m.speed || 200) * (m.life || 0.4)) : (m.radius || 70);
      return { aimType: 'cone', castRange: len, effectRadius: m.radius || len, coneAngle: ((m.arc || 0.9) * 180) / Math.PI, quickCast: true };
    }
    if (kind === 'buff' || kind === 'orbit' || kind === 'aura' || kind === 'nova' || kind === 'spin') {
      return { aimType: 'self', castRange: 0, effectRadius: m.radius || 80, coneAngle: 0, quickCast: true };
    }
    if (kind === 'meteor' || kind === 'mine' || kind === 'stun' || kind === 'vortex' || kind === 'turret' || kind === 'chain') {
      return { aimType: 'circle', castRange: m.range || 320, effectRadius: m.radius || 70, coneAngle: 0, quickCast: true };
    }
    return { aimType: 'line', castRange: lineRange(m), effectRadius: m.size || 18, coneAngle: 0, quickCast: true };
  }

  function unit(x, y) {
    const d = Math.hypot(x, y);
    if (d < 0.001) return null;
    return { x: x / d, y: y / d };
  }

  /** 1 blanco actual, 2 último paso, 3 último ataque, 4 hacia donde mira. */
  function defaultDirection(pl) {
    if (!pl) return { x: 1, y: 0 };
    if (pl.target && !pl.target.dead) {
      const u = unit(pl.target.x - pl.x, pl.target.y - pl.y);
      if (u) return u;
    }
    if (pl.walking && Number.isFinite(pl.moveAngle)) return { x: Math.cos(pl.moveAngle), y: Math.sin(pl.moveAngle) };
    if (lastDir) return { x: lastDir.x, y: lastDir.y };
    if (Number.isFinite(pl.aim)) return { x: Math.cos(pl.aim), y: Math.sin(pl.aim) };
    return { x: 1, y: 0 };
  }

  function aimPoint(pl, m, dir, want) {
    const prof = profile(m);
    const u = unit(dir.x, dir.y) || defaultDirection(pl);
    if (prof.aimType === 'self') return { dir: u, point: { x: pl.x, y: pl.y }, dist: 0, over: false, prof };
    const dist = Math.max(0, Math.min(prof.castRange, want));
    return {
      dir: u, prof, dist, over: want > prof.castRange + 0.5,
      point: { x: pl.x + u.x * dist, y: pl.y + u.y * dist }
    };
  }

  function layout() { buttons = []; return buttons; }

  function selected(pl) {
    if (!pl || !pl.slots) return null;
    const g = pl.slots[pl.focus || 0];
    const m = g && g[0];
    return m && m.kind !== 'orbit' ? m : null;
  }

  function worldAt(sx, sy) {
    const k = (G.Camera && G.Camera.scale) || 1;
    return { x: G.Camera.left() + sx / k, y: G.Camera.top() + sy / k };
  }

  function ready(m) { return !!(m && !(m.t > 0) && !m._pending); }

  /** Teléfono o tablet: el puntero principal es el dedo, no un ratón. */
  function finger() { return !!(G.Settings && G.Settings.touch); }

  function aimOf(g, pl) {
    if (g.finger) {
      const dx = g.x - g.cx, dy = g.y - g.cy, d = Math.hypot(dx, dy);
      const dir = d > 0.001 ? { x: dx / d, y: dy / d } : defaultDirection(pl);
      const prof = profile(g.move);
      const want = prof.aimType === 'self' ? 0 : (d / STICK_PX) * prof.castRange;
      return aimPoint(pl, g.move, dir, want);
    }
    const world = g.world || worldAt(g.x, g.y);
    const dx = world.x - pl.x, dy = world.y - pl.y;
    return aimPoint(pl, g.move, unit(dx, dy) || defaultDirection(pl), Math.hypot(dx, dy));
  }

  function liveDir() {
    for (const g of gestures.values()) {
      if (!g.finger || g.state !== AimState.AIMING) continue;
      const u = unit(g.x - g.cx, g.y - g.cy);
      if (u) return u;
    }
    return null;
  }

  function owned(pointerId) { return gestures.has(pointerId); }

  function fingerDown(p, pl) {
    const b = G.Touch && G.Touch.buttonAt && G.Touch.buttonAt(p.x, p.y);
    const tag = b && b.tag || '';
    if (tag.indexOf('skill:') !== 0) return false;
    const i = +tag.slice(6);
    if (pl.selectSlot) pl.selectSlot(i);
    const slot = pl.slots[i];
    const m = slot && slot[0];
    if (!ready(m) || m.kind === 'orbit') return true;
    gestures.set(p.pointerId, {
      state: AimState.PRESSING, pointerId: p.pointerId, move: m, finger: true,
      t0: performance.now(), x0: p.x, y0: p.y, x: p.x, y: p.y,
      cx: b.x + b.w / 2, cy: b.y + b.h / 2, travel: 0
    });
    return true;
  }

  function pointerDown(p) {
    if (!manual() || p.pointerId == null) return false;
    if (!finger() && p.button === 2) { gestures.clear(); return true; }
    if (p.button != null && p.button !== 0) return false;
    const pl = G.Game.player;
    if (!pl || pl.dead || pl.frozen) { gestures.clear(); return false; }
    if (finger()) return fingerDown(p, pl);
    if (G.Touch && G.Touch.hits && G.Touch.hits(p.x, p.y)) return false;
    if (gestures.has(p.pointerId)) return true;
    const m = selected(pl);
    if (!ready(m)) return false;
    gestures.set(p.pointerId, {
      state: AimState.PRESSING, pointerId: p.pointerId, move: m, finger: false,
      t0: performance.now(), x0: p.x, y0: p.y, x: p.x, y: p.y,
      world: worldAt(p.x, p.y), travel: 0
    });
    return true;
  }

  function poke(g) {
    const dt = performance.now() - g.t0;
    g.travel = Math.max(g.travel, Math.hypot(g.x - g.x0, g.y - g.y0));
    g.world = worldAt(g.x, g.y);
    if (g.state === AimState.PRESSING && (dt >= HOLD_MS || g.travel >= DRAG_PX)) g.state = AimState.AIMING;
  }

  function pointerMove(p) {
    const g = gestures.get(p.pointerId);
    if (!g) return false;
    const pl = G.Game.player;
    if (!pl || pl.dead || pl.frozen || !manual()) { gestures.delete(p.pointerId); return true; }
    g.x = p.x; g.y = p.y;
    poke(g);
    return true;
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function commit(g) {
    const pl = G.Game.player;
    const m = g.move;
    if (!pl || pl.dead || pl.frozen || !ready(m)) return false;
    const aim = aimOf(g, pl);
    const req = {
      type: 'skill_cast_request',
      castId: uuid(),
      playerId: pl.uid || 'me',
      skillId: m.id,
      origin: { x: pl.x, y: pl.y },
      direction: { x: aim.dir.x, y: aim.dir.y },
      targetPoint: { x: aim.point.x, y: aim.point.y },
      inputType: g.state === AimState.AIMING ? 'hold' : 'quick',
      clientTime: performance.now(),
      sequence: sequence + 1,
      level: m.lvl || 1
    };
    pl.aim = Math.atan2(aim.dir.y, aim.dir.x);
    const coop = G.Coop && G.Coop.active && G.Siege && G.Siege.up;
    if (coop && !G.Coop.isHost) {
      m._pending = true;
      m._pendingAt = performance.now();
      if (G.Combat && G.Combat.previewCast) G.Combat.previewCast(pl, m, aim.point);
      sequence += 1;
      lastDir = { x: aim.dir.x, y: aim.dir.y };
      lastRequest = req;
      if (G.CombatAuthority) G.CombatAuthority.watch(req.castId, m);
      G.Coop.noteSkill(req);
      return true;
    }
    if (coop && G.Coop.isHost && G.CombatAuthority) {
      const verdict = G.CombatAuthority.validate(req, pl);
      if (!verdict.ok) return false;
      pl._castId = req.castId;
      const ok = G.Combat && G.Combat.castNow ? G.Combat.castNow(pl, m, verdict.point, { silent: true }) : false;
      pl._castId = '';
      if (!ok) { G.CombatAuthority.undo(req); return false; }
      sequence += 1;
      lastDir = { x: aim.dir.x, y: aim.dir.y };
      lastRequest = req;
      if (G.Coop.confirmSkill) G.Coop.confirmSkill(verdict.confirm);
      return true;
    }
    const ok = G.Combat && G.Combat.castNow ? G.Combat.castNow(pl, m, aim.point) : false;
    if (!ok) return false;
    sequence += 1;
    lastDir = { x: aim.dir.x, y: aim.dir.y };
    lastRequest = req;
    return true;
  }

  function pointerUp(p) {
    const g = gestures.get(p.pointerId);
    if (!g) return false;
    g.x = p.x; g.y = p.y;
    poke(g);
    let cast = g.state === AimState.PRESSING || g.state === AimState.AIMING;
    if (g.finger) {
      const from = Math.hypot(g.x - g.cx, g.y - g.cy);
      cast = g.state === AimState.AIMING && from >= CANCEL_R;
    }
    if (cast) commit(g);
    gestures.delete(p.pointerId);
    return true;
  }

  function cancelKeyboard() {
    if (!gestures.size) return false;
    gestures.clear();
    return true;
  }

  function guard() {
    const pl = G.Game && G.Game.player;
    if (!manual() || !pl || pl.dead || pl.frozen) {
      if (gestures.size) gestures.clear();
    }
    if (!pl || !pl.slots) return;
    const now = performance.now();
    for (const g of pl.slots) for (const m of g) {
      if (m && m._pending && m._pendingAt && now - m._pendingAt > 2500) {
        m._pending = false;
        m._pendingAt = 0;
      }
    }
  }

  function pointerCancel(p) {
    if (!gestures.has(p.pointerId)) return false;
    gestures.delete(p.pointerId);
    return true;
  }

  function reset() {
    gestures.clear();
    buttons = [];
    lastDir = null;
    sequence = 0;
    lastRequest = null;
  }

  function previews() {
    const pl = G.Game && G.Game.player;
    if (!pl || !manual()) return [];
    const out = [];
    for (const g of gestures.values()) {
      if (g.state !== AimState.AIMING) continue;
      const aim = aimOf(g, pl);
      out.push({ prof: aim.prof, aim, cancelled: false, move: g.move });
    }
    return out;
  }

  return {
    AimState, HOLD_MS, DRAG_PX, CANCEL_R, profile, defaultDirection, aimPoint, layout,
    pointerDown, pointerMove, pointerUp, pointerCancel, owned, reset, previews, manual, guard, cancelKeyboard, finger, liveDir,
    get buttons() { return buttons; },
    get lastRequest() { return lastRequest; },
    get sequence() { return sequence; },
    stateOf(id) { const g = gestures.get(id); return g ? g.state : AimState.IDLE; }
  };
})();
