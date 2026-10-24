/* ============ pvp-boss-system.js — jefe del centro en el asedio ============
 * Números propios. No usa la dificultad de una partida de un jugador.
 * El asedio llama a estas cuentas; el anfitrión sigue siendo quien mueve al jefe.
 */
G.PvpBoss = (() => {
  const PVP_BOSS_CONFIG = {
    firstSpawnAt: 90,
    respawnDelay: 120,
    maxSpawnCount: 3,
    warningSeconds: 10,

    baseHp: 1800,
    baseDamage: 14,

    hpPerExtraPlayer: 0.35,
    hpPerRespawn: 0.45,
    hpPerAverageLevel: 0.04,

    damagePerRespawn: 0.18,
    damagePerAverageLevel: 0.015,

    participationThreshold: 0.03
  };

  const REWARDS = [
    { xp: 120, candy: 30, kind: 'creep' },
    { xp: 180, candy: 45, kind: 'shield' },
    { xp: 250, candy: 60, kind: 'push' }
  ];

  function calculatePvpBossHp(playerCount, averageLevel, spawnIndex) {
    const playerScale = 1 + Math.max(0, playerCount - 2) * PVP_BOSS_CONFIG.hpPerExtraPlayer;
    const respawnScale = 1 + spawnIndex * PVP_BOSS_CONFIG.hpPerRespawn;
    const levelScale = 1 + Math.max(0, averageLevel - 5) * PVP_BOSS_CONFIG.hpPerAverageLevel;
    return Math.round(PVP_BOSS_CONFIG.baseHp * playerScale * respawnScale * levelScale);
  }

  function calculatePvpBossDamage(averageLevel, spawnIndex) {
    const respawnScale = 1 + spawnIndex * PVP_BOSS_CONFIG.damagePerRespawn;
    const levelScale = 1 + Math.max(0, averageLevel - 5) * PVP_BOSS_CONFIG.damagePerAverageLevel;
    return Math.round(PVP_BOSS_CONFIG.baseDamage * respawnScale * levelScale);
  }

  /**
   * Reparte el bote de caramelos entre quien llegó al 3 % de la vida del jefe.
   * El que más daño hizo se lleva el resto del redondeo y 10 caramelos más.
   * Devuelve la lista y la suma, que tiene que ser bote + 10 si hubo alguien.
   */
  function splitCandy(pool, entries, maxHp) {
    const thr = Math.max(1, maxHp * PVP_BOSS_CONFIG.participationThreshold);
    const valid = (entries || []).filter(e => e && e.uid && e.uid !== 'rival' && e.dmg >= thr);
    const sum = valid.reduce((s, e) => s + e.dmg, 0);
    if (!sum || pool <= 0) return { rows: [], total: 0 };
    const rows = valid.map(e => ({
      uid: e.uid,
      dmg: e.dmg,
      candy: Math.floor(pool * e.dmg / sum)
    }));
    rows.sort((a, b) => b.dmg - a.dmg || (a.uid < b.uid ? -1 : 1));
    const used = rows.reduce((s, e) => s + e.candy, 0);
    rows[0].candy += pool - used + 10;
    rows[0].top = true;
    return { rows, total: rows.reduce((s, e) => s + e.candy, 0) };
  }

  /** Equipo (castillo) con más daño. Empate: el uid que va antes. */
  function winningTeam(entries) {
    let best = null, dmg = -1;
    for (const e of entries || []) {
      if (!e || e.uid === 'rival' || e.dmg <= 0) continue;
      if (e.dmg > dmg || (e.dmg === dmg && best && e.uid < best)) {
        dmg = e.dmg;
        best = e.uid;
      }
    }
    return best;
  }

  function rewardFor(spawnIndex) {
    return REWARDS[spawnIndex] || null;
  }

  return {
    PVP_BOSS_CONFIG, REWARDS,
    calculatePvpBossHp, calculatePvpBossDamage, splitCandy, winningTeam, rewardFor
  };
})();
