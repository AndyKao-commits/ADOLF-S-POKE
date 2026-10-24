/* ============ endless-system.js — mazmorra sin fin ============
 * No llama a la Sentencia de Arceus. La partida sigue hasta que caes.
 * Cada oleada cambia el peligro (especies, élites, el jefe, el suelo,
 * el lado o la velocidad). La vida sólo sube un poco y tiene tope:
 * si no, el final sería sólo aguantar números.
 * El asedio y el castillo no entran. La dificultad de un jugador, si la hay,
 * se aplica aparte.
 */
G.Endless = (() => {
  const STEP = 150;
  const FOCUS = ['combo', 'elite', 'boss', 'event', 'place', 'speed'];
  const PAT = ['ring', 'cross', 'rain'];
  const MODS = ['guard', 'haste', 'regen'];
  let said = 1, eventT = 40, dealt = 0, mixWave = -1, mix = null;

  function on() { return !!(G.Modes && G.Modes.is('endless')); }
  function waveOf(t) { return 1 + Math.floor(Math.max(0, t || 0) / STEP); }
  function focus(wave) { return FOCUS[(Math.max(1, wave) - 1) % FOCUS.length]; }
  function now() { return (G.Game && G.Game.st && G.Game.st.time) || 0; }

  /** La curva normal sigue hasta el minuto 12. Después la vida sólo suma un 4 % por oleada, hasta +36 %. */
  function tune(sc, t) {
    if (!on() || !sc) return sc;
    const wave = waveOf(t);
    const capped = G.Enemies.scale(Math.min(t, 12 * 60));
    const hp = capped.hp * (1 + Math.min(0.36, Math.max(0, wave - 1) * 0.04));
    let spd = capped.spd * (1 + Math.min(0.1, Math.max(0, wave - 1) * 0.012));
    if (focus(wave) === 'speed') spd *= 1.16;
    return { hp, dmg: capped.dmg, spd };
  }

  /** Oleada de combinación: sólo dos especies de las que ya tocaban. */
  function bag(src, t) {
    if (!on() || !src || focus(waveOf(t)) !== 'combo') return null;
    const w = waveOf(t);
    if (mixWave !== w) {
      mixWave = w;
      const uniq = [];
      const seen = {};
      for (const d of src) {
        if (!d || seen[d.dex]) continue;
        seen[d.dex] = 1;
        uniq.push(d);
      }
      mix = uniq.length >= 2 ? G.U.pickN(uniq, 2) : null;
    }
    return mix;
  }

  /** Oleada de élites: una dote, y un poco más de vida. No es el élite de la dificultad. */
  function dress(e) {
    if (!on() || !e || e.boss || e.eliteMods) return;
    if (focus(waveOf(now())) !== 'elite') return;
    if (Math.random() > 0.45) return;
    e.eliteMods = { [MODS[(Math.random() * MODS.length) | 0]]: true };
    if (!e.ring) e.ring = '#7dffa6';
    e.maxHp = e.hp = Math.round(e.maxHp * 1.08);
  }

  function fan(t) {
    return on() && focus(waveOf(t)) === 'place' ? 1.8 : 1;
  }

  /** Oleada de posición: salen por un lado fijo. Si no toca, null. */
  function side(t) {
    if (!on() || focus(waveOf(t)) !== 'place') return null;
    return ((waveOf(t) - 1) % 4) * Math.PI / 2;
  }

  function markBoss(e, refill) {
    if (!on() || !e) return;
    const w = waveOf(now());
    if (!refill && focus(w) !== 'boss') return;
    e.endlessAtk = PAT[(w - 1) % PAT.length];
  }

  function tick(dt, time) {
    if (!on()) return;
    if (G.Rift && G.Rift.inArena) return;
    const w = waveOf(time);
    if (w !== said) {
      said = w;
      if (G.Spawner) G.Spawner.say('Nueva oleada.', 2.2);
    }
    if (focus(w) !== 'event') return;
    if (G.Coop && G.Coop.active && !G.Coop.isHost) return;
    const pl = G.Game && G.Game.player;
    if (!pl || pl.dead || !G.Hazards) return;
    eventT -= dt;
    if (eventT > 0) return;
    eventT = 40;
    const a = Math.random() * 6.2832;
    G.Hazards.add({
      kind: 'zone',
      x: pl.x + Math.cos(a) * 120,
      y: pl.y + Math.sin(a) * 90,
      r: 64,
      delay: 1.2,
      dmg: Math.max(1, Math.round(pl.maxHp * 0.08)),
      type: 'normal',
      color: '#ffb04a'
    });
    if (G.Spawner) G.Spawner.say('El suelo se agrieta. Sal de ahí.', 1.6);
  }

  function noteDmg(n) {
    if (!on() || !(n > 0) || !isFinite(n)) return;
    dealt += n;
  }

  function snapshot(pl, time) {
    return {
      survivalTime: Math.max(0, Math.floor(time || 0)),
      wave: waveOf(time || 0),
      kills: (pl && pl.kills) || 0,
      bossKills: (pl && pl.bosses) || 0,
      totalDamage: Math.floor(dealt),
      candyEarned: (pl && pl.candyEarned) || 0
    };
  }

  function reset() {
    said = 1; eventT = 40; dealt = 0; mixWave = -1; mix = null;
  }

  return { on, waveOf, focus, tune, bag, dress, fan, side, markBoss, tick, noteDmg, snapshot, reset };
})();
