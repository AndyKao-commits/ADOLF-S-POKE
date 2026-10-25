/* ============ upgrades.js — mejoras permanentes entre runs ============
 * Se compran con Pokémonedas en el menú. `per` es lo que da cada nivel.
 */
G.Upgrades = (() => {
  const LIST = [
    { id: 'hp',     icon: 'heart', name: 'Vitalidad',      unit: '+8 vida',            max: 10, base: 60,  grow: 1.35 },
    { id: 'atk',    icon: 'fist', name: 'Fuerza',         unit: '+4% daño',           max: 10, base: 80,  grow: 1.38 },
    { id: 'spd',    icon: 'boot', name: 'Zancada',        unit: '+3% velocidad',      max: 8,  base: 70,  grow: 1.4 },
    { id: 'cd',     icon: 'clock', name: 'Reflejos',       unit: '-3% recarga',        max: 8,  base: 90,  grow: 1.42 },
    { id: 'def',    icon: 'shield', name: 'Coraza',         unit: '+2% defensa',        max: 8,  base: 80,  grow: 1.4 },
    { id: 'regen',  icon: 'sprout', name: 'Síntesis',       unit: '+0.2 vida/s',        max: 5,  base: 120, grow: 1.5 },
    { id: 'magnet', icon: 'magnet', name: 'Imán',           unit: '+12% recogida',      max: 6,  base: 50,  grow: 1.4 },
    { id: 'xp',     icon: 'book', name: 'Sabiduría',      unit: '+5% experiencia',    max: 8,  base: 100, grow: 1.42 },
    { id: 'coins',  icon: 'coin', name: 'Fortuna',        unit: '+8% Pokémonedas',    max: 8,  base: 120, grow: 1.45 },
    { id: 'moves',  icon: 'cards', name: 'Repertorio',     unit: 'Empiezas con 2 movimientos', max: 1, base: 1500, grow: 1 },
    { id: 'crit',   icon: 'star', name: 'Golpe Crítico',  unit: '+3% de críticos (x1,75 de daño)', max: 10, base: 90, grow: 1.4 },
    { id: 'reroll', icon: 'up', name: 'Cambio de cartas', unit: '+1 cambio de cartas de nivel por run', max: 5, base: 150, grow: 1.6 },
    // 23-10-2026: el precio de la ficha ya es el de pantalla. cost() lo parte
    // por la mitad, así que la base es el doble (300 se ve 300, no 150).
    { id: 'ban',    icon: 'ban', name: 'Veto',           unit: 'Bloquea 1 movimiento: no te sale en las cartas', max: 3, base: 600, grow: 1.9 },
    // 19-10-2026: se compra una vez y luego se elige gratis (save.pstart, ver G.startMoveOf).
    { id: 'start',  icon: 'cursor', name: 'Movimiento inicial', unit: 'Eliges con qué ataque empiezas la partida', max: 1, base: 400, grow: 1 },
    // 20-10-2026: igual, para el segundo de Repertorio (save.pstart2, ver G.startMove2Of). Sin Repertorio no se compra.
    { id: 'start2', icon: 'cursor', name: 'Segundo movimiento inicial', unit: 'Eliges el segundo ataque con el que empiezas (necesita Repertorio)', max: 1, base: 400, grow: 1, needs: 'moves' },
    { id: 'luck', icon: 'star', name: 'Suerte', unit: '+5 de suerte por nivel. La misma suerte sube un poco la rareza, las Poké Balls y los huevos.', max: 6, base: 280, grow: 10 / 7 },
    { id: 'skip', icon: 'cards', name: 'Saltar', unit: '+1 salto de carta de nivel por partida.', max: 5, base: 160, grow: 1.5 },
    { id: 'fourth', icon: 'cards', name: 'Cuarta carta', unit: 'Al subir de nivel salen 4 cartas en vez de 3.', max: 1, base: 6000, grow: 1 },
    { id: 'revival', icon: 'heart', name: 'Reponerse', unit: 'Una vez por partida, al caer puedes elegir revivir con el 35 % de vida.', max: 1, base: 10000, grow: 1 },
    { id: 'seal', icon: 'ban', name: 'Sellar', unit: '+1 objeto que deja de salir. Hay que elegir cuáles.', max: 2, base: 1600, grow: 1.6 }
  ];
  const BY = {};
  for (const u of LIST) BY[u.id] = u;

  function cost(id, lvl) {
    const u = BY[id];
    if (!u || u.priced === false) return null;
    const full = Math.round(u.base * Math.pow(u.grow, lvl) / 10) * 10;
    // 朋友房：強化一律半價，再取到 10 的倍數（至少 10）。
    return Math.max(10, Math.floor(full / 2 / 10) * 10);
  }

  /** Niveles comprados -> modificadores para G.Player. */
  function perks(levels = {}) {
    // Nunca por encima del máximo (una partida editada a mano no da más poder).
    const L = id => Math.max(0, Math.min(BY[id].max, Math.floor(+levels[id] || 0)));
    return {
      hp: L('hp') * 8,
      atkMul: 1 + L('atk') * 0.04,
      spdMul: 1 + L('spd') * 0.03,
      cdMul: 1 - L('cd') * 0.03,
      dmgReduce: L('def') * 0.02,
      regen: L('regen') * 0.2,
      magnetMul: 1 + L('magnet') * 0.12,
      xpMul: 1 + L('xp') * 0.05,
      coinMul: 1 + L('coins') * 0.08,
      startMoves: 1 + L('moves'),
      crit: L('crit') * 0.03,
      rerolls: L('reroll'),
      bans: L('ban'),
      luck: L('luck') * 5,
      skips: L('skip'),
      fourth: L('fourth') > 0 ? 1 : 0,
      revival: L('revival') > 0 ? 1 : 0,
      seals: L('seal')
    };
  }

  return { LIST, BY, cost, perks };
})();
