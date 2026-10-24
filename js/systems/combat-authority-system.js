/* ============ combat-authority-system.js — el asedio lo calcula el anfitrión ============
 * El invitado puede enseñar la animación, pero el golpe, la recarga y el
 * premio los confirma el anfitrión. Un mismo aviso no se cobra dos veces.
 * Nadie pasa a ser anfitrión a mitad de partida.
 */
G.CombatAuthority = (() => {
  const GONE_MS = 10000;
  const KEEP_MS = 20000;
  const POS_SLACK = 220;

  const casts = new Map();
  const pickups = new Map();
  const rewards = new Map();
  const hits = new Map();
  const cooldown = new Map();
  const lastSeq = new Map();
  const pending = new Map();

  function sweep(map, now) {
    for (const [k, t] of map) if (t <= now) map.delete(k);
  }
  function sweepAll(now) {
    sweep(casts, now); sweep(pickups, now); sweep(rewards, now); sweep(hits, now); sweep(cooldown, now);
  }
  function claim(map, id, now) {
    if (!id) return false;
    sweep(map, now);
    if (map.has(id)) return false;
    map.set(id, now + KEEP_MS);
    return true;
  }

  function due(since, now) { return since > 0 && now - since >= GONE_MS; }

  function parseSkills(raw) {
    const out = [];
    if (!raw || typeof raw !== 'string') return out;
    for (const part of raw.split(',')) {
      const bits = part.split(':');
      if (!bits[0]) continue;
      out.push({ id: bits[0], lvl: Math.max(1, (+bits[1] || 1) | 0) });
    }
    return out;
  }

  function rowsOf(actor) {
    if (actor && actor.remote && actor.net && actor.net.skills) {
      const fromNet = parseSkills(actor.net.skills);
      if (fromNet.length) return fromNet;
    }
    if (actor && actor.enabledMoves) {
      const list = actor.enabledMoves().filter(m => m && m.kind !== 'orbit');
      if (list.length) return list.map(m => ({ id: m.id, lvl: m.lvl || 1 }));
    }
    return parseSkills(actor && actor.net && actor.net.skills);
  }

  function unit(x, y) {
    const d = Math.hypot(x, y);
    if (!Number.isFinite(d) || d < 0.2 || d > 1.5) return null;
    return { x: x / d, y: y / d };
  }

  /** Las diez comprobaciones. No cobra nada: sólo dice si vale. */
  function inspect(req, actor, now) {
    if (!req || !actor) return { ok: false, reason: 'who' };
    if (actor.dead || (actor.net && actor.net.dead) || (actor.hp != null && actor.hp <= 0)) return { ok: false, reason: 'dead' };
    if (actor.frozen) return { ok: false, reason: 'frozen' };
    const row = rowsOf(actor).find(r => r.id === req.skillId);
    if (!row || !G.Moves || !G.Moves.BY_ID[req.skillId]) return { ok: false, reason: 'locked' };
    const cdKey = (req.playerId || '') + '|' + req.skillId;
    if ((cooldown.get(cdKey) || 0) > now) return { ok: false, reason: 'cd' };
    const dx = actor.x - (req.origin && req.origin.x || 0);
    const dy = actor.y - (req.origin && req.origin.y || 0);
    if (Math.hypot(dx, dy) > POS_SLACK) return { ok: false, reason: 'pos' };
    const dir = unit(req.direction && req.direction.x, req.direction && req.direction.y);
    if (!dir) return { ok: false, reason: 'dir' };
    if (!req.castId || casts.has(req.castId)) return { ok: false, reason: 'cast' };
    const prev = lastSeq.get(req.playerId) || 0;
    if (!(req.sequence > prev)) return { ok: false, reason: 'seq' };
    const sample = G.Moves.instance(row.id, row.lvl);
    const prof = G.SkillAim ? G.SkillAim.profile(sample) : { castRange: 320, aimType: 'line' };
    const tx = req.targetPoint ? req.targetPoint.x : actor.x;
    const ty = req.targetPoint ? req.targetPoint.y : actor.y;
    const dist = Math.hypot(tx - (req.origin && req.origin.x || actor.x), ty - (req.origin && req.origin.y || actor.y));
    if (prof.castRange > 0 && dist > prof.castRange * 1.2) return { ok: false, reason: 'range' };
    const reach = prof.aimType === 'self' ? 0 : Math.min(prof.castRange, dist || prof.castRange);
    return {
      ok: true, skillId: row.id, level: row.lvl, dir, reach, sample,
      point: { x: actor.x + dir.x * reach, y: actor.y + dir.y * reach },
      confirm: {
        type: 'skill_cast_confirmed', castId: req.castId, playerId: req.playerId, skillId: row.id,
        serverOrigin: { x: actor.x, y: actor.y }, direction: dir, hostTime: now
      }
    };
  }

  function accept(req, verdict, now) {
    casts.set(req.castId, now + KEEP_MS);
    lastSeq.set(req.playerId, req.sequence);
    const wait = Math.max(50, (verdict.sample.cd || 0.4) * 1000);
    cooldown.set((req.playerId || '') + '|' + req.skillId, now + wait);
  }

  function undo(req) {
    if (!req) return;
    casts.delete(req.castId);
    cooldown.delete((req.playerId || '') + '|' + req.skillId);
    if ((lastSeq.get(req.playerId) || 0) === req.sequence) lastSeq.delete(req.playerId);
  }

  function validate(req, actor) {
    const now = performance.now();
    sweepAll(now);
    const verdict = inspect(req, actor, now);
    if (!verdict.ok) return verdict;
    accept(req, verdict, now);
    return verdict;
  }

  function watch(castId, move) { if (castId && move) pending.set(castId, move); }
  function acceptLocal(castId) { pending.delete(castId); }
  function rejectLocal(castId) {
    const m = pending.get(castId);
    pending.delete(castId);
    if (m) m.t = 0;
  }

  function claimPickup(id) { return claim(pickups, id, performance.now()); }
  function claimReward(id) { return claim(rewards, id, performance.now()); }
  function claimDamage(castId, targetId) {
    if (!castId || targetId == null) return true;
    return claim(hits, castId + '>' + targetId, performance.now());
  }

  function reset() {
    casts.clear(); pickups.clear(); rewards.clear(); hits.clear();
    cooldown.clear(); lastSeq.clear(); pending.clear();
  }

  return {
    GONE_MS, due, inspect, validate, undo, watch, acceptLocal, rejectLocal,
    claimPickup, claimReward, claimDamage, reset, rowsOf
  };
})();
