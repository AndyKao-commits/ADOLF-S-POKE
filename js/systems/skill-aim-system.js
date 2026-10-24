/* ============ skill-aim-system.js — apuntar ataques en el asedio ============
 * En el asedio cada ataque encendido es un botón a la derecha.
 * Un toque corto lo lanza hacia donde ya miras. Mantener o arrastrar apunta,
 * y soltar encima del botón lo cancela sin gastar la recarga.
 * El dibujo es sólo una vista previa: el golpe lo calcula el combate.
 * Fuera del asedio los ataques siguen saliendo solos.
 */
G.SkillAim = (() => {
  const AimState = { IDLE: 'idle', PRESSING: 'pressing', AIMING: 'aiming', CANCELLED: 'cancelled', CASTING: 'casting' };
  const HOLD_MS = 180;
  const DRAG_PX = 10;
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

  function layout(w, h, pl) {
    buttons = [];
    if (!manual() || !pl || pl.dead) return buttons;
    const moves = pl.enabledMoves ? pl.enabledMoves().filter(m => m.kind !== 'orbit') : [];
    const bs = 52, gap = 8;
    const sa = G.Touch && G.Touch.safeArea ? G.Touch.safeArea() : { right: 0, top: 0 };
    const touch = !!(G.Touch && G.Touch.active);
    const x = Math.max(8, w - bs - 16 - (sa.right || 0));
    const bottom = h - 54 - (touch ? 40 : 22) - gap;
    const top = 84 + (sa.top || 0);
    const need = moves.length * bs + Math.max(0, moves.length - 1) * gap;
    let y = Math.max(top, bottom - need);
    moves.forEach((m, i) => {
      const by = y + i * (bs + gap);
      buttons.push({
        move: m, x, y: by, w: bs, h: bs,
        cx: x + bs / 2, cy: by + bs / 2
      });
    });
    return buttons;
  }

  function buttonAt(x, y) {
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  function owned(pointerId) { return gestures.has(pointerId); }

  function pointerDown(p) {
    if (!manual() || p.pointerId == null) return false;
    if (gestures.has(p.pointerId)) return true;
    const hit = buttonAt(p.x, p.y);
    if (!hit) return false;
    const pl = G.Game.player;
    if (!pl || pl.dead || pl.frozen) return false;
    for (const g of gestures.values()) if (g.move === hit.move) return false;
    gestures.set(p.pointerId, {
      state: AimState.PRESSING, pointerId: p.pointerId, move: hit.move,
      t0: performance.now(), x0: p.x, y0: p.y, x: p.x, y: p.y,
      cx: hit.cx, cy: hit.cy, travel: 0, left: false, cancelled: false
    });
    return true;
  }

  function poke(g) {
    const dt = performance.now() - g.t0;
    g.travel = Math.max(g.travel, Math.hypot(g.x - g.x0, g.y - g.y0));
    const from = Math.hypot(g.x - g.cx, g.y - g.cy);
    if (from >= CANCEL_R) g.left = true;
    if (g.state === AimState.PRESSING && (dt >= HOLD_MS || g.travel >= DRAG_PX)) g.state = AimState.AIMING;
    g.cancelled = g.state === AimState.AIMING && !!g.left && from < CANCEL_R;
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

  function commit(g, quick) {
    const pl = G.Game.player;
    const m = g.move;
    if (!pl || pl.dead || pl.frozen || !m || m.t > 0) return false;
    const prof = profile(m);
    if (quick && !prof.quickCast) return false;
    let dir, want;
    if (quick || prof.aimType === 'self') {
      dir = defaultDirection(pl);
      want = prof.aimType === 'self' ? 0 : prof.castRange;
      if (pl.target && !pl.target.dead && prof.aimType !== 'self') {
        want = Math.min(prof.castRange, Math.hypot(pl.target.x - pl.x, pl.target.y - pl.y));
      }
    } else {
      const dx = g.x - g.cx, dy = g.y - g.cy, d = Math.hypot(dx, dy);
      dir = d > 0.001 ? { x: dx / d, y: dy / d } : defaultDirection(pl);
      want = (d / STICK_PX) * prof.castRange;
    }
    const aim = aimPoint(pl, m, dir, want);
    const req = {
      type: 'skill_cast_request',
      castId: uuid(),
      playerId: pl.uid || 'me',
      skillId: m.id,
      origin: { x: pl.x, y: pl.y },
      direction: { x: aim.dir.x, y: aim.dir.y },
      targetPoint: { x: aim.point.x, y: aim.point.y },
      clientTime: performance.now(),
      sequence: sequence + 1,
      level: m.lvl || 1
    };
    pl.aim = Math.atan2(aim.dir.y, aim.dir.x);
    const coop = G.Coop && G.Coop.active && G.Siege && G.Siege.up;
    if (coop && !G.Coop.isHost) {
      if (G.Combat && G.Combat.previewCast) G.Combat.previewCast(pl, m, aim.point);
      m.t = Math.max(0.05, (m.cd || 0.4) * Math.max(0.45, pl.cdMul || 1));
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
    const dt = performance.now() - g.t0;
    const tap = (g.state === AimState.PRESSING && dt < HOLD_MS && g.travel < DRAG_PX) || (g.state === AimState.AIMING && !g.left);
    const aimed = g.state === AimState.AIMING && g.left && !g.cancelled;
    g.state = tap || aimed ? AimState.CASTING : AimState.CANCELLED;
    if (tap || aimed) commit(g, tap);
    gestures.delete(p.pointerId);
    return true;
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
      const prof = profile(g.move);
      const dx = g.x - g.cx, dy = g.y - g.cy, d = Math.hypot(dx, dy);
      const aiming = g.state === AimState.AIMING && d >= CANCEL_R;
      const dir = aiming ? { x: dx / d, y: dy / d } : defaultDirection(pl);
      const want = aiming ? (d / STICK_PX) * prof.castRange : (prof.aimType === 'self' ? 0 : prof.castRange);
      const aim = aimPoint(pl, g.move, dir, want);
      out.push({ prof, aim, cancelled: g.state === AimState.AIMING && !!g.cancelled, move: g.move });
    }
    return out;
  }

  return {
    AimState, HOLD_MS, DRAG_PX, CANCEL_R, profile, defaultDirection, aimPoint, layout, buttonAt,
    pointerDown, pointerMove, pointerUp, pointerCancel, owned, reset, previews, manual,
    get buttons() { return buttons; },
    get lastRequest() { return lastRequest; },
    get sequence() { return sequence; },
    stateOf(id) { const g = gestures.get(id); return g ? g.state : AimState.IDLE; }
  };
})();
