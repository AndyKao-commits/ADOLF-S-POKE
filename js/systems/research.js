/* ============ research.js — investigación, fragmentos y estrellas ============
 * Derrotar a una especie llena su investigación. Al 100 % se convierte en
 * un fragmento y el resto sigue hacia el siguiente. Dos fragmentos suben
 * una estrella (máximo 4). Cada estrella, al salir con esa especie:
 * daño +3 % y PS máximos +3 % (4 estrellas: +12 % y +12 %).
 * Guardado: save.res[dex] = { k: derrotas, t: % acumulado, s: estrellas }.
 */
G.Research = (() => {
  const NEED = { 1: 40, 2: 80, 3: 150, 4: 300 };

  function row(dex) {
    const s = G.DB.save;
    if (!s) return null;
    s.res = s.res || {};
    if (!s.res[dex]) s.res[dex] = { k: 0, t: 0, s: 0 };
    return s.res[dex];
  }

  function add(dex, pct, kill) {
    const p = G.DEX_BY && G.DEX_BY[dex];
    if (!p || !(pct > 0)) return;
    const r = row(dex);
    if (!r) return;
    if (kill) r.k = (r.k | 0) + 1;
    r.t = Math.round(((+r.t || 0) + pct) * 100) / 100;
  }

  /** Una baja. Los de rareza 5 sólo cuentan en la grieta, y cada uno suma 34 %. */
  function noteKill(dex, rift) {
    const p = G.DEX_BY && G.DEX_BY[dex];
    if (!p) return;
    if (p.rarity >= 5) {
      if (rift) add(dex, 34, true);
      return;
    }
    add(dex, 100 / (NEED[p.rarity] || 40), true);
  }

  /** Porcentaje sorteado por el nivel del huevo de incubar. */
  function addPct(dex, pct) { add(dex, pct, false); }

  function view(dex) {
    const r = (G.DB.save && G.DB.save.res && G.DB.save.res[dex]) || { k: 0, t: 0, s: 0 };
    const stars = Math.max(0, Math.min(4, r.s | 0));
    const frags = Math.max(0, Math.floor((+r.t || 0) / 100) - stars * 2);
    let pct = (+r.t || 0) % 100;
    if ((+r.t || 0) > 0 && pct < 0.05) pct = 100;
    return { k: r.k | 0, t: +r.t || 0, stars, frags, pct };
  }

  /** Gasta 2 fragmentos de esa especie en una estrella. */
  function raise(dex) {
    const v = view(dex);
    if (v.frags < 2 || v.stars >= 4) return false;
    const r = row(dex);
    if (!r) return false;
    r.s = v.stars + 1;
    if (G.DB.commit) G.DB.commit();
    return true;
  }

  function need(rarity) { return NEED[rarity] || 0; }

  /** La especie con la que sales: cada estrella es +3 % de daño y de PS. */
  function apply(pl) {
    if (!pl || pl.remote) return;
    const stars = view(pl.dex).stars;
    if (!stars) return;
    const k = 1 + stars * 0.03;
    pl.atkMul *= k;
    pl.maxHp *= k;
    pl.hp = pl.maxHp;
  }

  return { noteKill, addPct, view, raise, need, apply };
})();
