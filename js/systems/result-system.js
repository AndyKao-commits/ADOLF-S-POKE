/* ============ result-system.js — daño de la partida y récords separados ============
 * La pantalla final lee esto. El récord de un jugador, el de un grupo y el
 * del asedio no comparten sitio. No toca las tablas públicas del ranking.
 */
G.Result = (() => {
  let dealt = 0, bossDealt = 0;

  function reset() { dealt = 0; bossDealt = 0; }

  function note(amount, enemy) {
    const n = +amount || 0;
    if (!(n > 0) || !isFinite(n)) return;
    dealt += n;
    if (enemy && (enemy.boss || enemy.siegeBoss || enemy.arceus)) bossDealt += n;
  }

  function score(bucket, row) {
    if (!row) return -1;
    if (bucket === 'pvp') return row.win ? (1e9 - (row.survivalTime || 0)) : -1;
    if (row.mode === 'castle' || row.mode === 'castle20') return (row.wave || 0) * 100000 + (row.survivalTime || 0);
    return row.survivalTime || 0;
  }

  function better(bucket, prev, row) {
    if (bucket === 'pvp' && !row.win) return false;
    if (!prev) return score(bucket, row) >= 0;
    return score(bucket, row) > score(bucket, prev);
  }

  /**
   * Cierra la partida. Hay que llamarlo antes de apagar el cooperativo,
   * para saber si era un grupo.
   */
  function seal(o) {
    o = o || {};
    const siege = !!(G.Modes && G.Modes.is('siege'));
    const bucket = siege ? 'pvp' : (o.group ? 'coop' : 'solo');
    const mode = (G.Modes && G.Modes.id) || 'normal';
    const row = {
      bucket, mode,
      survivalTime: Math.max(0, Math.floor(o.time || 0)),
      wave: o.wave || 0,
      kills: (o.pl && o.pl.kills) || 0,
      bossKills: (o.pl && o.pl.bosses) || 0,
      totalDamage: Math.floor(dealt),
      bossDamage: Math.floor(bossDealt),
      candyEarned: (o.pl && o.pl.candyEarned) || 0,
      candySpent: (o.pl && o.pl.candySpent) || 0,
      candyLeft: (o.pl && o.pl.runCandy) || 0,
      mapId: o.mapId || '',
      diff: o.diff || '',
      win: !!o.win
    };
    const save = G.DB && G.DB.save;
    let record = false;
    if (save) {
      save.stats = save.stats || {};
      const boards = save.stats.runBoards || (save.stats.runBoards = { solo: {}, coop: {}, pvp: {} });
      const bag = boards[bucket] || (boards[bucket] = {});
      if (better(bucket, bag[mode], row)) {
        record = true;
        bag[mode] = {
          survivalTime: row.survivalTime, wave: row.wave, kills: row.kills, bossKills: row.bossKills,
          totalDamage: row.totalDamage, bossDamage: row.bossDamage,
          candyEarned: row.candyEarned, candySpent: row.candySpent, candyLeft: row.candyLeft,
          mapId: row.mapId, diff: row.diff, win: row.win
        };
      }
    }
    row.record = record;
    row.modeName = (G.Modes && G.Modes.row(mode)[1]) || mode;
    const reg = row.mapId && G.Regions && G.Regions.get(row.mapId);
    row.mapName = reg ? reg.name : (G.I18n ? G.I18n.t('Al azar') : 'Al azar');
    const names = { normal: 'Corriente', hard: 'Difícil', challenge: 'Reto', nightmare: 'Pesadilla' };
    row.diffName = row.diff ? (names[row.diff] || row.diff) : '—';
    return row;
  }

  return { reset, note, seal };
})();
