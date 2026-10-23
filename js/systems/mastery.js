/* ============ mastery.js — maestría de cada compañero ============
 * Se sube jugando con él. Los puntos salen de cuatro cifras guardadas:
 *   partidas × 10 + derrotas / 100 (sin el resto) + minutos enteros del mejor
 *   tiempo × 5 + evoluciones de especie × 15.
 * Bronce, plata, oro y diamante son un recuerdo. No cambian el daño, la vida
 * ni nada de la partida, y aquí no se suben estrellas (eso es Investigación).
 */
G.Mastery = (() => {
  const RANKS = [
    { id: 'bronze', at: 100, name: 'Bronce' },
    { id: 'silver', at: 400, name: 'Plata' },
    { id: 'gold', at: 1200, name: 'Oro' },
    { id: 'diamond', at: 2000, name: 'Diamante' }
  ];

  function blank() { return { r: 0, k: 0, b: 0, e: 0 }; }

  function row(dex) {
    const all = (G.DB.save && G.DB.save.pmas) || {};
    return all[dex] || blank();
  }

  function points(m) {
    m = m || blank();
    return (m.r | 0) * 10 + Math.floor((m.k | 0) / 100) + Math.floor((m.b | 0) / 60) * 5 + (m.e | 0) * 15;
  }

  /** La placa más alta ya conseguida, o '' si aún no llega a bronce. */
  function rankId(m) {
    const pts = points(m);
    let id = '';
    for (const r of RANKS) if (pts >= r.at) id = r.id;
    return id;
  }

  /** La siguiente placa, o null si ya está en diamante. */
  function nextRank(pts) {
    return RANKS.find(r => pts < r.at) || null;
  }

  function clock(sec) {
    sec = Math.max(0, sec | 0);
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    const p = n => String(n).padStart(2, '0');
    return h ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
  }

  /**
   * Una partida acabada con este compañero.
   * seconds = null no toca el mejor tiempo (el asedio, donde menos es mejor).
   * evos: evoluciones de especie en esa partida (aún no hay ninguna en el juego).
   */
  function note(dex, kills, seconds, evos) {
    if (!G.DB.save || !dex || (G.DEX_BY && !G.DEX_BY[dex])) return;
    const s = G.DB.save;
    s.pmas = s.pmas || {};
    const m = s.pmas[dex] || (s.pmas[dex] = blank());
    m.r += 1;
    m.k += Math.max(0, Math.floor(+kills) || 0);
    if (seconds != null) m.b = Math.max(m.b | 0, Math.max(0, Math.floor(+seconds) || 0));
    m.e += Math.max(0, Math.floor(+evos) || 0);
  }

  return { RANKS, row, points, rankId, nextRank, clock, note };
})();
