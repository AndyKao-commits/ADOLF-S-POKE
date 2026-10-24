/* ============ difficulty-system.js — dificultad de una partida sola ============
 * Corriente, Difícil, Reto y Pesadilla. El asedio no las usa.
 * En una sala sólo valen si el modo es el normal.
 * Los objetos, la maestría y el precio de los caramelos no se tocan.
 */
G.Difficulty = (() => {
  const RUN_DIFFICULTY = {
    normal:    { enemyHp: 1,    enemyDamage: 1,    spawnRate: 1,    healing: 1 },
    hard:      { enemyHp: 1.15, enemyDamage: 1.08, spawnRate: 1.15, healing: 0.85 },
    challenge: { enemyHp: 1.35, enemyDamage: 1.15, spawnRate: 1.25, healing: 0.70 },
    nightmare: { enemyHp: 1.60, enemyDamage: 1.25, spawnRate: 1.35, healing: 0.55 }
  };
  const ONES = RUN_DIFFICULTY.normal;
  let zoneT = 48;

  function key() {
    const id = (G.Game && G.Game.diff) || 'normal';
    return RUN_DIFFICULTY[id] ? id : 'normal';
  }

  /** Una partida sola, o una sala en modo normal. El asedio no entra. */
  function solo() {
    if (G.Modes && G.Modes.is('siege')) return false;
    if (G.Coop && G.Coop.active && !(G.Modes && G.Modes.is('normal'))) return false;
    return true;
  }

  function row() { return solo() ? RUN_DIFFICULTY[key()] : ONES; }

  function combat() {
    const r = row();
    return { hp: r.enemyHp, dmg: r.enemyDamage, rate: r.spawnRate, healing: r.healing };
  }

  function healing() { return row().healing; }

  /** Cuánto se abre el abanico de una marea. Corriente vale 1. */
  function spread() {
    if (!solo()) return 1;
    if (key() === 'hard') return 1.45;
    if (key() === 'challenge') return 1.7;
    if (key() === 'nightmare') return 1.95;
    return 1;
  }

  function bossExtra() { return solo() && (key() === 'challenge' || key() === 'nightmare'); }
  function bossCombo() { return solo() && key() === 'nightmare'; }

  function pickMods(n) {
    const all = ['guard', 'haste', 'regen'];
    const got = {};
    let guard = 0;
    while (Object.keys(got).length < n && guard < 8) {
      got[all[(Math.random() * all.length) | 0]] = true;
      guard++;
    }
    return got;
  }

  /** Algunos enemigos normales salen élite. Reto lleva una dote; Pesadilla, a veces dos. */
  function dress(e) {
    if (!e || e.boss || e.siegeBoss || e.siegeCreep || !solo()) return;
    const tier = key();
    const chance = tier === 'hard' ? 0.08 : tier === 'challenge' ? 0.14 : tier === 'nightmare' ? 0.2 : 0;
    if (!chance || Math.random() >= chance) return;
    e.maxHp = e.hp = Math.round(e.maxHp * 1.22);
    e.dmg *= 1.12;
    if (!e.ring) e.ring = '#ffb04a';
    e.diffElite = true;
    const n = tier === 'hard' ? 0 : tier === 'nightmare' && Math.random() < 0.5 ? 2 : 1;
    if (n) e.eliteMods = pickMods(n);
  }

  function reset() { zoneT = 48; }

  /** Pesadilla: cada cierto rato una zona avisada. Se puede salir de ella. */
  function tick(dt) {
    if (!solo() || key() !== 'nightmare') return;
    if (G.Rift && G.Rift.inArena) return;
    if (G.Judgment && G.Judgment.active) return;
    const pl = G.Game && G.Game.player;
    if (!pl || pl.dead || !G.Hazards) return;
    zoneT -= dt;
    if (zoneT > 0) return;
    zoneT = 48;
    const a = Math.random() * 6.2832;
    G.Hazards.add({
      kind: 'zone',
      x: pl.x + Math.cos(a) * 110,
      y: pl.y + Math.sin(a) * 80,
      r: 68,
      delay: 1.2,
      dmg: Math.max(1, Math.round(pl.maxHp * 0.08)),
      type: 'normal',
      color: '#c47bff'
    });
    if (G.Spawner) G.Spawner.say('El suelo se agrieta. Sal de ahí.', 1.6);
  }

  return {
    RUN_DIFFICULTY, key, solo, combat, healing, spread, bossExtra, bossCombo, dress, reset, tick
  };
})();
