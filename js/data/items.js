/* ============ items.js — objetos de la partida ============
 * Una bola deja elegir 1 de 3 (4 con Miel). Cada objeto hace lo que dice su
 * ficha y se puede repetir hasta su máximo. Revivir sigue siendo una vez por
 * partida, y el Metrónomo y la Tela Terrible no suben su tope por copia.
 * Los iconos son assets/future-use/item-icons.
 */
G.Items = (() => {
  const LIST = [];
  const ICON = 'assets/future-use/item-icons/';
  const SHOTS = { projectile: 1, homing: 1, bounce: 1, nova: 1, boomerang: 1, chain: 1, orbit: 1, meteor: 1, mine: 1 };
  const PP = { projectile: 1, homing: 1, bounce: 1, orbit: 1, chain: 1 };
  /* Aún puede evolucionar y el de al lado no lo delata (cambia de tipo o salta de número). */
  const EVO_EXTRA = new Set([108, 112, 113, 114, 117, 123, 125, 126, 133, 137, 190, 193, 198, 200, 207, 215, 221, 233]);

  function add(it) { it.file = ICON + it.file; LIST.push(it); }

  function mul(field, per, id) {
    return {
      on(p, n) {
        p._itemK = p._itemK || {};
        const prev = p._itemK[id] || 1, next = 1 + per * n;
        p[field] = p[field] / prev * next;
        p._itemK[id] = next;
      },
      off(p) {
        const prev = (p._itemK && p._itemK[id]) || 1;
        p[field] /= prev;
        if (p._itemK) p._itemK[id] = 1;
      }
    };
  }
  /* rate > 0 dispara más rápido (la recarga baja). */
  function haste(id, rate) {
    return {
      on(p, n) {
        p._itemK = p._itemK || {};
        const prev = p._itemK[id] || 1, next = 1 / (1 + rate * n);
        p.cdMul = p.cdMul / prev * next;
        p._itemK[id] = next;
      },
      off(p) {
        const prev = (p._itemK && p._itemK[id]) || 1;
        p.cdMul /= prev;
        if (p._itemK) p._itemK[id] = 1;
      }
    };
  }
  function flat(field, per, id) {
    return {
      on(p, n) {
        p._itemF = p._itemF || {};
        const prev = p._itemF[id] || 0, next = per * n;
        p[field] = (p[field] || 0) + next - prev;
        p._itemF[id] = next;
      },
      off(p) {
        const prev = (p._itemF && p._itemF[id]) || 0;
        p[field] = (p[field] || 0) - prev;
        if (p._itemF) p._itemF[id] = 0;
      }
    };
  }
  function pctHp(p, id, frac) {
    p._hpPct = p._hpPct || {};
    const prev = p._hpPct[id] || 0;
    const bare = p.maxHp - prev;
    const next = bare * frac;
    const d = next - prev;
    if (d >= 0) { p.maxHp += d; p.hp += d; }
    else { p.maxHp = Math.max(1, p.maxHp + d); p.hp = Math.min(p.hp, p.maxHp); }
    p._hpPct[id] = next;
  }
  function bumpHp(p, id, next) {
    p._hpItem = p._hpItem || {};
    const prev = p._hpItem[id] || 0;
    const d = next - prev;
    if (d > 0) p.addMaxHp(d);
    else if (d < 0) { p.maxHp = Math.max(1, p.maxHp + d); p.hp = Math.min(p.hp, p.maxHp); }
    p._hpItem[id] = next;
  }
  function bumpCrit(p, id, next) {
    p._critItem = p._critItem || {};
    const prev = p._critItem[id] || 0;
    p.critChance += next - prev;
    p._critItem[id] = next;
  }
  function both(a, b) {
    return {
      on(p, n) { a.on(p, n); b.on(p, n); },
      off(p) { a.off(p); b.off(p); }
    };
  }

  const TYPES = [
    ['silkscarf', 'Pañuelo Seda', '絲綢圍巾', 'Silk Scarf', 'silk-scarf.png', 'normal'],
    ['charcoal', 'Carbón', '木炭', 'Charcoal', 'charcoal.png', 'fire'],
    ['mysticwater', 'Agua Mística', '神秘水滴', 'Mystic Water', 'mystic-water.png', 'water'],
    ['miracleseed', 'Semilla Milagro', '奇蹟種子', 'Miracle Seed', 'miracle-seed.png', 'grass'],
    ['magnet', 'Imán', '磁鐵', 'Magnet', 'magnet.png', 'electric'],
    ['nevermeltice', 'Antiderretir', '不融冰', 'Never-Melt Ice', 'never-melt-ice.png', 'ice'],
    ['blackbelt', 'Cinturón Negro', '黑帶', 'Black Belt', 'black-belt.png', 'fighting'],
    ['poisonbarb', 'Flecha Venenosa', '毒針', 'Poison Barb', 'poison-barb.png', 'poison'],
    ['softsand', 'Arena Fina', '柔軟沙子', 'Soft Sand', 'soft-sand.png', 'ground'],
    ['sharpbeak', 'Pico Afilado', '銳利鳥嘴', 'Sharp Beak', 'sharp-beak.png', 'flying'],
    ['twistedspoon', 'Cuchara Torcida', '彎曲湯匙', 'Twisted Spoon', 'twisted-spoon.png', 'psychic'],
    ['silverpowder', 'Polvo Plata', '銀粉', 'Silver Powder', 'silver-powder.png', 'bug'],
    ['hardstone', 'Piedra Dura', '硬石頭', 'Hard Stone', 'hard-stone.png', 'rock'],
    ['spelltag', 'Hechizo', '咒術護符', 'Spell Tag', 'spell-tag.png', 'ghost'],
    ['dragonfang', 'Colmillo Dragón', '龍之牙', 'Dragon Fang', 'dragon-fang.png', 'dragon'],
    ['blackglasses', 'Gafas de Sol', '黑色眼鏡', 'Black Glasses', 'black-glasses.png', 'dark'],
    ['metalcoat', 'Revestimiento Metálico', '金屬膜', 'Metal Coat', 'metal-coat.png', 'steel'],
    ['fairyfeather', 'Pluma Hada', '妖精之羽', 'Fairy Feather', 'fairy-feather.png', 'fairy']
  ];
  const TYPE_ZH = {
    normal: '一般招式傷害 +30%，傷害 +3%。', fire: '火招式傷害 +30%，傷害 +3%。', water: '水招式傷害 +30%，傷害 +3%。',
    grass: '草招式傷害 +30%，傷害 +3%。', electric: '電招式傷害 +30%，傷害 +3%。', ice: '冰招式傷害 +30%，傷害 +3%。',
    fighting: '格鬥招式傷害 +30%，傷害 +3%。', poison: '毒招式傷害 +30%，傷害 +3%。', ground: '地面招式傷害 +30%，傷害 +3%。',
    flying: '飛行招式傷害 +30%，傷害 +3%。', psychic: '超能力招式傷害 +30%，傷害 +3%。', bug: '蟲招式傷害 +30%，傷害 +3%。',
    rock: '岩石招式傷害 +30%，傷害 +3%。', ghost: '幽靈招式傷害 +30%，傷害 +3%。', dragon: '龍招式傷害 +30%，傷害 +3%。',
    dark: '惡招式傷害 +30%，傷害 +3%。', steel: '鋼招式傷害 +30%，傷害 +3%。', fairy: '妖精招式傷害 +30%，傷害 +3%。'
  };
  for (const [id, name, zh, en, file, type] of TYPES) {
    const zd = TYPE_ZH[type];
    add(Object.assign({
      id, name, zh, en, file, tier: 1, max: 1,
      desc: 'Los ataques de su tipo hacen un 30 % más, y todo el daño un 3 % más.',
      zd, ed: 'Moves of its type deal 30% more, and all damage is 3% higher.'
    }, {
      on(p, n) {
        p.typeBonus = p.typeBonus || {};
        p._tb = p._tb || {};
        const prev = p._tb[id] || 0, next = 0.30 * n;
        p.typeBonus[type] = (p.typeBonus[type] || 0) - prev + next;
        p._tb[id] = next;
        mul('atkMul', 0.03, id + '-a').on(p, n);
      },
      off(p) {
        const prev = (p._tb && p._tb[id]) || 0;
        if (p.typeBonus) p.typeBonus[type] = (p.typeBonus[type] || 0) - prev;
        if (p._tb) p._tb[id] = 0;
        mul('atkMul', 0.03, id + '-a').off(p);
      }
    }));
  }

  function card(o, fx) { add(Object.assign(o, fx)); }

  card({ id: 'leftovers', name: 'Restos', zh: '吃剩的東西', en: 'Leftovers', file: 'leftovers.png', tier: 1, max: 1,
    desc: 'Recuperas 1,2 de vida por segundo.', zd: '每秒恢復 +1.2 HP。', ed: 'Recover 1.2 HP per second.' }, {
    on(p, n) {
      p._itemF = p._itemF || {};
      const prev = p._itemF.leftovers || 0, next = 1.2 * n;
      p.regenFlat += next - prev;
      p._itemF.leftovers = next;
    },
    off(p) {
      p.regenFlat -= (p._itemF && p._itemF.leftovers) || 0;
      if (p._itemF) p._itemF.leftovers = 0;
    }
  });
  card({ id: 'oranberry', name: 'Baya Aranja', zh: '橙橙果', en: 'Oran Berry', file: 'oran-berry.png', tier: 1, max: 1,
    desc: '+15 de vida máxima.', zd: '最大 HP +15。', ed: 'Max HP +15.' }, {
    on(p, n) { bumpHp(p, 'oranberry', 15 * n); }, off(p) { bumpHp(p, 'oranberry', 0); }
  });
  card({ id: 'sitrusberry', name: 'Baya Zidra', zh: '文柚果', en: 'Sitrus Berry', file: 'sitrus-berry.png', tier: 2, max: 1,
    desc: 'Por debajo del 30 % de vida, recuperas un 35 %. Como mucho una vez cada 45 s.',
    zd: 'HP 低於 30% 時恢復 35% HP，每 45 秒一次。',
    ed: 'Below 30% HP, recover 35% HP, once every 45 seconds.' }, { on() {}, off() {} });
  card({ id: 'shellbell', name: 'Cascabel Concha', zh: '貝殼之鈴', en: 'Shell Bell', file: 'shell-bell.png', tier: 1, max: 1,
    desc: 'Recuperas el 1 % del daño que haces.', zd: '恢復所造成傷害的 1%。', ed: 'Recover 1% of the damage you deal.' }, { on() {}, off() {} });
  card({ id: 'rockyhelmet', name: 'Casco Dentado', zh: '凸凸頭盔', en: 'Rocky Helmet', file: 'rocky-helmet.png', tier: 1, max: 1,
    desc: 'Quien te toca recibe 25 de daño.', zd: '接觸你的敵人受到 25 傷害。', ed: 'An enemy that touches you takes 25 damage.' }, { on() {}, off() {} });
  card({ id: 'amuletcoin', name: 'Moneda Amuleto', zh: '護身金幣', en: 'Amulet Coin', file: 'amulet-coin.png', tier: 1, max: 1,
    desc: '+25 % de monedas.', zd: '金幣 +25%。', ed: 'Coins +25%.' }, mul('coinMul', 0.25, 'amuletcoin'));
  card({ id: 'luckyegg', name: 'Huevo Suerte', zh: '幸運蛋', en: 'Lucky Egg', file: 'lucky-egg.png', tier: 1, max: 1,
    desc: '+15 % de experiencia.', zd: '經驗 +15%。', ed: 'Experience +15%.' }, mul('xpMul', 0.15, 'luckyegg'));
  card({ id: 'quickclaw', name: 'Garra Rápida', zh: '先制之爪', en: 'Quick Claw', file: 'quick-claw.png', tier: 2, max: 1,
    desc: '+10 % de velocidad de ataque.', zd: '攻擊速度 +10%。', ed: 'Attack speed +10%.' }, haste('quickclaw', 0.10));
  card({ id: 'choicescarf', name: 'Pañuelo Elección', zh: '講究圍巾', en: 'Choice Scarf', file: 'choice-scarf.png', tier: 2, max: 1,
    desc: '+20 % de velocidad de movimiento y +10 % de velocidad de ataque.',
    zd: '移動速度 +20%，攻擊速度 +10%。', ed: 'Move speed +20%, attack speed +10%.' },
    both(mul('spdMul', 0.20, 'choicescarf'), haste('choicescarf-h', 0.10)));
  card({ id: 'muscleband', name: 'Cinta Fuerte', zh: '力量頭帶', en: 'Muscle Band', file: 'muscle-band.png', tier: 2, max: 1,
    desc: '+15 % de daño.', zd: '傷害 +15%。', ed: 'Damage +15%.' }, mul('atkMul', 0.15, 'muscleband'));
  card({ id: 'expertbelt', name: 'Cinta Experto', zh: '達人力帶', en: 'Expert Belt', file: 'expert-belt.png', tier: 2, max: 1,
    desc: '+30 % de daño a quien es débil a tu tipo.', zd: '對弱於招式屬性的目標傷害 +30%。',
    ed: 'Damage +30% against targets weak to the move\'s type.' }, { on() {}, off() {} });
  card({ id: 'assaultvest', name: 'Chaleco Asalto', zh: '突擊背心', en: 'Assault Vest', file: 'assault-vest.png', tier: 2, max: 1,
    desc: '+12 de armadura y +12 % de vida máxima.', zd: '護甲 +12，最大 HP +12%。', ed: 'Armor +12, max HP +12%.' }, {
    on(p, n) { flat('armor', 12, 'assaultvest').on(p, n); pctHp(p, 'assaultvest', 0.12 * n); },
    off(p) { flat('armor', 12, 'assaultvest').off(p); pctHp(p, 'assaultvest', 0); }
  });
  card({ id: 'safetygoggles', name: 'Gafas de Seguridad', zh: '防塵護目鏡', en: 'Safety Goggles', file: 'safety-goggles.png', tier: 1, max: 1,
    desc: '+5 de armadura.', zd: '護甲 +5。', ed: 'Armor +5.' }, flat('armor', 5, 'safetygoggles'));
  card({ id: 'focussash', name: 'Banda Focus', zh: '氣勢頭帶', en: 'Focus Sash', file: 'focus-sash.png', tier: 2, max: 1,
    desc: 'Un 15 % de las veces, un golpe mortal te deja con 1 de vida. Como mucho una vez cada 20 s.',
    zd: '15% 機率以 1 HP 抵擋致命一擊，每 20 秒一次。',
    ed: '15% chance to survive a fatal hit at 1 HP, once every 20 seconds.' }, { on() {}, off() {} });
  card({ id: 'razorclaw', name: 'Garra Afilada', zh: '銳利之爪', en: 'Razor Claw', file: 'razor-claw.png', tier: 2, max: 1,
    desc: '+6 % de probabilidad de crítico.', zd: '暴擊率 +6%。', ed: 'Critical hit chance +6%.' }, {
    on(p, n) { bumpCrit(p, 'razorclaw', 0.06 * n); }, off(p) { bumpCrit(p, 'razorclaw', 0); }
  });
  card({ id: 'scopelens', name: 'Periscopio', zh: '焦點鏡', en: 'Scope Lens', file: 'scope-lens.png', tier: 3, max: 1,
    desc: '+30 % de daño crítico.', zd: '暴擊傷害 +30%。', ed: 'Critical hit damage +30%.' }, { on() {}, off() {} });
  card({ id: 'choiceband', name: 'Cinta Elección', zh: '講究頭帶', en: 'Choice Band', file: 'choice-band.png', tier: 3, max: 1,
    desc: '+35 % de daño y -8 % de velocidad de ataque.', zd: '傷害 +35%，攻擊速度 -8%。',
    ed: 'Damage +35%, attack speed -8%.' }, both(mul('atkMul', 0.35, 'choiceband'), haste('choiceband-h', -0.08)));
  card({ id: 'lifeorb', name: 'Vidasfera', zh: '生命寶珠', en: 'Life Orb', file: 'life-orb.png', tier: 3, max: 1,
    desc: '+30 % de daño y -10 % de vida máxima.', zd: '傷害 +30%，最大 HP -10%。',
    ed: 'Damage +30%, max HP -10%.' }, {
    on(p, n) { mul('atkMul', 0.30, 'lifeorb').on(p, n); pctHp(p, 'lifeorb', -0.10 * n); },
    off(p) { mul('atkMul', 0.30, 'lifeorb').off(p); pctHp(p, 'lifeorb', 0); }
  });
  card({ id: 'metronome', name: 'Metrónomo', zh: '揮指公', en: 'Metronome', file: 'metronome.png', tier: 2, max: 1,
    desc: 'Cada 10 s sin recibir daño, +4 % de daño, hasta +40 %. Al recibirlo, vuelve a cero.',
    zd: '每 10 秒不受傷，傷害 +4%，最多 +40%。',
    ed: 'Every 10 seconds without taking damage, damage +4%, up to +40%.' }, { on() {}, off(p) { metro(p, 0); } });
  card({ id: 'widelens', name: 'Lupa', zh: '廣角鏡', en: 'Wide Lens', file: 'wide-lens.png', tier: 2, max: 1,
    desc: '+10 % de alcance.', zd: '範圍 +10%。', ed: 'Area +10%.' }, { on() {}, off() {} });
  card({ id: 'brightpowder', name: 'Polvo Brillo', zh: '光粉', en: 'Bright Powder', file: 'bright-powder.png', tier: 1, max: 1,
    desc: '+4 % de evasión.', zd: '閃避 +4%。', ed: 'Evasion +4%.' }, flat('evade', 0.04, 'brightpowder'));
  card({ id: 'quickpowder', name: 'Polvo Veloz', zh: '速度粉', en: 'Quick Powder', file: 'quick-powder.png', tier: 2, max: 1,
    desc: '+7 % de velocidad de movimiento.', zd: '移動速度 +7%。', ed: 'Move speed +7%.' }, mul('spdMul', 0.07, 'quickpowder'));
  card({ id: 'nugget', name: 'Pepita', zh: '金珠', en: 'Nugget', file: 'nugget.png', tier: 1, max: 1,
    desc: '+15 % de monedas.', zd: '金幣 +15%。', ed: 'Coins +15%.' }, mul('coinMul', 0.15, 'nugget'));
  card({ id: 'bignugget', name: 'Pepita Grande', zh: '巨大金珠', en: 'Big Nugget', file: 'big-nugget.png', tier: 3, max: 5,
    desc: 'Las Poké Balls cuestan un 8 % menos, hasta un 40 %.', zd: '精靈球價格降低 8%，最多 40%。',
    ed: 'Poké Ball prices drop 8%, up to 40%.' }, {
    on(p, n) { p.ballCut = Math.min(0.40, 0.08 * n); },
    off(p) { p.ballCut = 0; }
  });
  card({ id: 'starpiece', name: 'Trozo Estrella', zh: '星星碎片', en: 'Star Piece', file: 'star-piece.png', tier: 2, max: 1,
    desc: '+20 de suerte.', zd: '幸運 +20。', ed: 'Luck +20.' }, flat('luck', 20, 'starpiece'));
  card({ id: 'eviolite', name: 'Mineral Evolutivo', zh: '進化奇石', en: 'Eviolite', file: 'eviolite.png', tier: 2, max: 1,
    desc: 'Si tu compañero aún puede evolucionar: +50 % de armadura y +25 % de vida máxima.',
    zd: '伙伴仍可進化時：護甲 +50%，最大 HP +25%。',
    ed: 'While your partner can still evolve: armor +50%, max HP +25%.' }, {
    on(p) {
      if (!canEvolve(p.mon)) return;
      p.armorMul = (p.armorMul || 1) * 1.5;
      p._eviolite = true;
      pctHp(p, 'eviolite', 0.25);
    },
    off(p) {
      if (!p._eviolite) return;
      p.armorMul = (p.armorMul || 1.5) / 1.5;
      pctHp(p, 'eviolite', 0);
      p._eviolite = false;
    }
  });
  card({ id: 'masterball', name: 'Master Ball', zh: '大師球', en: 'Master Ball', file: 'master-ball.png', tier: 3, max: 1,
    desc: '+25 % de daño y +10 de suerte.', zd: '傷害 +25%，幸運 +10。', ed: 'Damage +25%, luck +10.' },
    both(mul('atkMul', 0.25, 'masterball'), flat('luck', 10, 'masterball')));

  card({ id: 'maxrevive', name: 'Revivir Máximo', zh: '活力塊', en: 'Max Revive', file: 'max-revive.png', tier: 3, max: 1,
    desc: 'Revivir una vez con el 60 % de vida. Una vez por partida.', zd: '以 60% HP 復活一次。每局一次。',
    ed: 'Revive once at 60% HP. Once per run.' }, { on() {}, off() {} });
  card({ id: 'rarecandy', name: 'Caramelo Raro', zh: '神奇糖果', en: 'Rare Candy', file: 'rare-candy.png', tier: 3, max: 1,
    desc: 'Subes 2 niveles al momento y +5 % de daño.', zd: '立即升級 +2，傷害 +5%。',
    ed: 'Level up by 2 right away, and damage +5%.' }, {
    on(p) {
      mul('atkMul', 0.05, 'rarecandy').on(p, 1);
      let need = 0, lv = p.level, xp = p.xp, next = p.xpNext;
      for (let i = 0; i < 2; i++) { need += Math.max(1, next - xp); xp = 0; lv++; next = G.Player.xpFor(lv); }
      const n = p.gainXp(need);
      if (G.Game && G.Game.noteXp) G.Game.noteXp(n);
    },
    off(p) { mul('atkMul', 0.05, 'rarecandy').off(p); }
  });
  card({ id: 'reapercloth', name: 'Tela Terrible', zh: '靈界之布', en: 'Reaper Cloth', file: 'reaper-cloth.png', tier: 3, max: 1,
    desc: 'Cada 100 enemigos derrotados, +1 % de daño, hasta +30 %.',
    zd: '每擊敗 100 個敵人傷害 +1%，最多 +30%。',
    ed: 'Every 100 enemies defeated, damage +1%, up to +30%.' }, { on() {}, off(p) { reaper(p, 0); } });
  card({ id: 'cometshard', name: 'Fragmento Cometa', zh: '彗星碎片', en: 'Comet Shard', file: 'comet-shard.png', tier: 3, max: 1,
    desc: '+40 % de monedas y +30 de suerte.', zd: '金幣 +40%，幸運 +30。', ed: 'Coins +40%, luck +30.' },
    both(mul('coinMul', 0.40, 'cometshard'), flat('luck', 30, 'cometshard')));
  card({ id: 'moonstone', name: 'Piedra Lunar', zh: '月之石', en: 'Moon Stone', file: 'moon-stone.png', tier: 2, max: 1,
    desc: '+2 proyectiles y +25 % de alcance.', zd: '彈體 +2，範圍 +25%。', ed: 'Projectiles +2, area +25%.' }, { on() {}, off() {} });
  card({ id: 'maxpp', name: 'PP Máximos', zh: 'PP提升劑', en: 'Max PP', file: 'max-pp.png', tier: 2, max: 1,
    desc: '+1 proyectil en disparos, órbitas y cadenas.', zd: '彈射、環繞和連鎖招式彈體 +1。',
    ed: 'Shots, orbits and chains gain 1 projectile.' }, { on() {}, off() {} });
  card({ id: 'maxelixir', name: 'Elixir Máximo', zh: '極限全復藥', en: 'Max Elixir', file: 'max-elixir.png', tier: 2, max: 1,
    desc: '+20 % de velocidad de ataque.', zd: '攻擊速度 +20%。', ed: 'Attack speed +20%.' }, haste('maxelixir', 0.20));
  card({ id: 'shinystone', name: 'Piedra Día', zh: '光之石', en: 'Shiny Stone', file: 'shiny-stone.png', tier: 2, max: 1,
    desc: '+15 % de daño y +15 % de alcance.', zd: '傷害 +15%，範圍 +15%。', ed: 'Damage +15%, area +15%.' },
    mul('atkMul', 0.15, 'shinystone'));
  card({ id: 'duskstone', name: 'Piedra Noche', zh: '暗之石', en: 'Dusk Stone', file: 'dusk-stone.png', tier: 2, max: 1,
    desc: '+40 % de daño crítico y +8 % de probabilidad de crítico.', zd: '暴擊傷害 +40%，暴擊率 +8%。',
    ed: 'Critical damage +40%, critical chance +8%.' }, {
    on(p, n) { bumpCrit(p, 'duskstone', 0.08 * n); }, off(p) { bumpCrit(p, 'duskstone', 0); }
  });
  card({ id: 'honey', name: 'Miel', zh: '甜甜蜜', en: 'Honey', file: 'honey.png', tier: 3, max: 1,
    desc: 'Una Poké Ball ofrece 4 objetos en vez de 3.', zd: '精靈球提供 4 個道具而非 3 個。',
    ed: 'A Poké Ball offers 4 items instead of 3.' }, { on() {}, off() {} });
  card({ id: 'firestone', name: 'Piedra Fuego', zh: '火之石', en: 'Fire Stone', file: 'fire-stone.png', tier: 2, max: 1,
    desc: 'Un enemigo quemado explota al caer.', zd: '灼傷敵人倒下時爆炸。', ed: 'A burned enemy explodes when it falls.' }, { on() {}, off() {} });
  card({ id: 'icestone', name: 'Piedra Hielo', zh: '冰之石', en: 'Ice Stone', file: 'ice-stone.png', tier: 2, max: 1,
    desc: 'Un enemigo frenado explota al caer.', zd: '減速敵人倒下時爆炸。', ed: 'A slowed enemy explodes when it falls.' }, { on() {}, off() {} });
  card({ id: 'revive', name: 'Revivir', zh: '復活草', en: 'Revive', file: 'revive.png', tier: 3, max: 1,
    desc: 'Revivir una vez con el 35 % de vida. Una vez por partida.', zd: '以 35% HP 復活一次。每局一次。',
    ed: 'Revive once at 35% HP. Once per run.' }, { on() {}, off() {} });
  card({ id: 'powerbracer', name: 'Brazal Firme', zh: '力量護腕', en: 'Power Bracer', file: 'power-bracer.png', tier: 3, max: 1,
    desc: '+40 % de daño y -15 % de velocidad de movimiento.', zd: '傷害 +40%，移動速度 -15%。',
    ed: 'Damage +40%, move speed -15%.' }, both(mul('atkMul', 0.40, 'powerbracer'), mul('spdMul', -0.15, 'powerbracer')));
  card({ id: 'expshare', name: 'Repartir Exp', zh: '學習裝置', en: 'Exp. Share', file: 'exp-share.png', tier: 2, max: 1,
    desc: '+25 % de experiencia y +20 % de radio de recogida.', zd: '經驗 +25%，拾取半徑 +20%。',
    ed: 'Experience +25%, pickup radius +20%.' }, both(mul('xpMul', 0.25, 'expshare'), mul('magnet', 0.20, 'expshare')));
  card({ id: 'lumberry', name: 'Baya Zonlan', zh: '木子果', en: 'Lum Berry', file: 'lum-berry.png', tier: 2, max: 1,
    desc: 'Cada 30 s recuperas un 20 % de vida.', zd: '每 30 秒恢復 20% HP。', ed: 'Every 30 seconds, recover 20% HP.' }, { on() {}, off() {} });
  card({ id: 'lightclay', name: 'Refleluz', zh: '光之黏土', en: 'Light Clay', file: 'light-clay.png', tier: 2, max: 1,
    desc: '+20 % de duración.', zd: '持續時間 +20%。', ed: 'Duration +20%.' }, { on() {}, off() {} });
  card({ id: 'smokeball', name: 'Bola Humo', zh: '煙霧球', en: 'Smoke Ball', file: 'smoke-ball.png', tier: 2, max: 1,
    desc: 'Al recibir un golpe, un 25 % de las veces desapareces 1,5 s.', zd: '受擊時 25% 機率隱身 1.5 秒。',
    ed: 'When hit, 25% chance to vanish for 1.5 seconds.' }, { on() {}, off() {} });
  card({ id: 'flameorb', name: 'Llamasfera', zh: '火焰寶珠', en: 'Flame Orb', file: 'flame-orb.png', tier: 1, max: 1,
    desc: 'Al golpear, un 5 % de quemar.', zd: '命中時 5% 機率灼傷。', ed: 'On hit, 5% chance to burn.' }, { on() {}, off() {} });
  card({ id: 'toxicorb', name: 'Toxisfera', zh: '劇毒寶珠', en: 'Toxic Orb', file: 'toxic-orb.png', tier: 1, max: 1,
    desc: 'Al golpear, un 5 % de envenenar.', zd: '命中時 5% 機率中毒。', ed: 'On hit, 5% chance to poison.' }, { on() {}, off() {} });
  card({ id: 'snowball', name: 'Bola de Nieve', zh: '雪球', en: 'Snowball', file: 'snowball.png', tier: 1, max: 1,
    desc: 'Al golpear, un 6 % de frenar.', zd: '命中時 6% 機率減速。', ed: 'On hit, 6% chance to slow.' }, { on() {}, off() {} });
  card({ id: 'bigroot', name: 'Raíz Grande', zh: '大根莖', en: 'Big Root', file: 'big-root.png', tier: 1, max: 1,
    desc: '+15 % de curación.', zd: '治療 +15%。', ed: 'Healing +15%.' }, mul('healMul', 0.15, 'bigroot'));
  card({ id: 'kingsrock', name: 'Roca del Rey', zh: '王者之證', en: "King's Rock", file: 'king-s-rock.png', tier: 2, max: 1,
    desc: 'Al golpear, un 6 % de aturdir 0,5 s.', zd: '命中時 6% 機率暈眩 0.5 秒。', ed: 'On hit, 6% chance to stun for 0.5 seconds.' }, { on() {}, off() {} });
  card({ id: 'protectivepads', name: 'Protectores', zh: '部位護具', en: 'Protective Pads', file: 'protective-pads.png', tier: 1, max: 1,
    desc: 'El daño de quien te toca baja un 30 %.', zd: '接觸敵人的傷害 -30%。', ed: 'Damage from enemies that touch you is 30% lower.' }, { on() {}, off() {} });
  card({ id: 'stickybarb', name: 'Pincho Pegado', zh: '附著針', en: 'Sticky Barb', file: 'sticky-barb.png', tier: 1, max: 1,
    desc: 'Los enemigos cercanos reciben 15 de daño por segundo.', zd: '附近敵人每秒受到 15 傷害。',
    ed: 'Nearby enemies take 15 damage per second.' }, { on() {}, off() {} });

  function canEvolve(mon) {
    if (!mon || mon.leg) return false;
    if (EVO_EXTRA.has(mon.dex)) return true;
    const nxt = G.DEX && G.DEX[mon.dex];
    if (!nxt || nxt.bst <= mon.bst) return false;
    const mine = mon.types || [];
    return (nxt.types || []).some(t => mine.indexOf(t) >= 0);
  }
  function metro(p, next) {
    const prev = p._metro || 0;
    if (prev === next) return;
    p.atkMul = p.atkMul / (1 + prev * 0.04) * (1 + next * 0.04);
    p._metro = next;
  }
  function reaper(p, next) {
    const prev = p._reaper || 0;
    next = Math.max(0, Math.min(30, next));
    if (prev === next) return;
    p.atkMul = p.atkMul / (1 + prev * 0.01) * (1 + next * 0.01);
    p._reaper = next;
  }
  function say(p, txt, col) {
    G.FX.dmgText(p.x, p.y - p.bodyH - 16, txt, col, true);
    G.FX.ring(p.x, p.y, 6, 70, col, 0.5, 4);
  }
  function blast(pl, e, color) {
    if (e._blasted) return;
    e._blasted = true;
    const R = 72;
    G.FX.ring(e.x, e.y, e.r || 10, R, color, 0.45, 4);
    G.FX.burst(e.x, e.y - (e.bodyH || 20) * 0.5, color, 16, 160);
    for (const o of G.EnemyMgr.queryCircle(e.x, e.y, R)) {
      if (o === e || o.dead) continue;
      if (G.Siege && G.Siege.ally && G.Siege.ally(o, pl)) continue;
      o.hurt(40, color, o.x - e.x, o.y - e.y, 40);
    }
  }

  const RARITY = {
    mythic: { zh: '神話', en: 'Mythic', es: 'Mítico', color: '#ffd23f', price: 120 },
    legendary: { zh: '傳說', en: 'Legendary', es: 'Legendario', color: '#c47bff', price: 90 },
    rare: { zh: '稀有', en: 'Rare', es: 'Raro', color: '#4fb4ff', price: 72 },
    uncommon: { zh: '優良', en: 'Uncommon', es: 'Poco común', color: '#5fe08a', price: 54 },
    common: { zh: '一般', en: 'Common', es: 'Normal', color: '#9aa6b5', price: 36 }
  };
  const HOLD = {
    maxrevive: [3, 'mythic'], rarecandy: [10, 'mythic'], masterball: [1, 'mythic'], reapercloth: [1, 'mythic'], cometshard: [1, 'mythic'], moonstone: [3, 'mythic'],
    maxpp: [10, 'legendary'], maxelixir: [10, 'legendary'], shinystone: [10, 'legendary'], duskstone: [10, 'legendary'], honey: [1, 'legendary'], firestone: [1, 'legendary'], icestone: [1, 'legendary'], revive: [3, 'legendary'], powerbracer: [3, 'legendary'],
    lifeorb: [5, 'rare'], choiceband: [5, 'rare'], choicescarf: [5, 'rare'], expertbelt: [10, 'rare'], assaultvest: [10, 'rare'], expshare: [10, 'rare'], starpiece: [10, 'rare'], metronome: [3, 'rare'], focussash: [1, 'rare'], lumberry: [3, 'rare'], eviolite: [1, 'rare'],
    quickclaw: [10, 'uncommon'], shellbell: [10, 'uncommon'], leftovers: [10, 'uncommon'], rockyhelmet: [10, 'uncommon'], amuletcoin: [10, 'uncommon'], luckyegg: [10, 'uncommon'], muscleband: [10, 'uncommon'], scopelens: [10, 'uncommon'], lightclay: [10, 'uncommon'], sitrusberry: [3, 'uncommon'], smokeball: [3, 'uncommon'], flameorb: [10, 'uncommon'], toxicorb: [10, 'uncommon'], snowball: [10, 'uncommon'], bigroot: [10, 'uncommon'], kingsrock: [10, 'uncommon'], protectivepads: [3, 'uncommon'], stickybarb: [5, 'uncommon'], silkscarf: [10, 'uncommon'],
    charcoal: [10, 'common'], mysticwater: [10, 'common'], miracleseed: [10, 'common'], magnet: [10, 'common'], nevermeltice: [10, 'common'], blackbelt: [10, 'common'], poisonbarb: [10, 'common'], softsand: [10, 'common'], sharpbeak: [10, 'common'], twistedspoon: [10, 'common'], silverpowder: [10, 'common'], hardstone: [10, 'common'], spelltag: [10, 'common'], dragonfang: [10, 'common'], blackglasses: [10, 'common'], metalcoat: [10, 'common'], fairyfeather: [10, 'common'],
    oranberry: [10, 'common'], quickpowder: [10, 'common'], brightpowder: [10, 'common'], razorclaw: [10, 'common'], widelens: [10, 'common'], safetygoggles: [10, 'common'], nugget: [10, 'common'], bignugget: [5, 'common']
  };
  for (const it of LIST) {
    const h = HOLD[it.id];
    if (!h) continue;
    it.max = h[0];
    it.rarity = h[1];
    it.shopBase = RARITY[h[1]].price;
  }

  const BY = {};
  for (const it of LIST) BY[it.id] = it;

  const BALL = [
    { tier: 1, name: 'Poké Ball', zh: '精靈球' },
    { tier: 2, name: 'Super Ball', zh: '超級球' },
    { tier: 3, name: 'Ultra Ball', zh: '高級球' }
  ];

  function text(it, key) {
    const lang = (G.I18n && G.I18n.lang) || '';
    if (String(lang).startsWith('zh')) return it[key === 'name' ? 'zh' : 'zd'] || it[key];
    if (lang === 'en') return it[key === 'name' ? 'en' : 'ed'] || it[key];
    return it[key];
  }
  function ballName(tier) {
    const b = BALL[Math.max(0, Math.min(2, (tier | 0) - 1))];
    const lang = (G.I18n && G.I18n.lang) || '';
    return String(lang).startsWith('zh') ? b.zh : b.name;
  }
  function held(pl, id) { return !!(pl && pl.hasItem && pl.hasItem(id)); }

  function rollChoices(tier, pl, n = 3) {
    const have = id => (pl && pl.stacks && pl.stacks[id]) || 0;
    const pool = t => LIST.filter(i => i.tier === t && have(i.id) < i.max);
    let bag = pool(tier);
    if (bag.length < n) bag = bag.concat(pool(Math.max(1, tier - 1)).filter(i => !bag.includes(i)));
    if (bag.length < n) bag = bag.concat(LIST.filter(i => have(i.id) < i.max && !bag.includes(i)));
    return G.U.pickN(bag, Math.min(n, bag.length));
  }
  function choices(pl) { return held(pl, 'honey') ? 4 : 3; }

  function gain(p, id) {
    const it = BY[id];
    if (!it || !p) return false;
    p.stacks = p.stacks || {};
    const n = p.stacks[id] || 0;
    if (n >= it.max) return false;
    if (n && it.off) it.off(p);
    p.stacks[id] = n + 1;
    if (it.on) it.on(p, n + 1);
    p.item = id;
    return true;
  }
  function roll(except) {
    const pool = LIST.filter(i => i.id !== except);
    return G.U.pick(pool).id;
  }

  function shaped(pl, m) {
    if (!pl || !m) return m;
    let extra = 0;
    if (held(pl, 'moonstone') && SHOTS[m.kind]) extra += 2;
    if (held(pl, 'maxpp') && PP[m.kind]) extra += 1;
    let range = 1;
    if (held(pl, 'moonstone')) range *= 1.25;
    if (held(pl, 'shinystone')) range *= 1.15;
    if (held(pl, 'widelens')) range *= 1.10;
    const dur = held(pl, 'lightclay') ? 1.2 : 1;
    if (!extra && range === 1 && dur === 1) return m;
    const o = Object.assign({}, m);
    if (extra) o.count = (m.count | 0) + extra;
    if (range !== 1) {
      if (m.radius) o.radius = m.radius * range;
      if (m.size) o.size = m.size * range;
      if (m.width) o.width = m.width * range;
    }
    if (dur !== 1) {
      if (m.life) o.life = m.life * dur;
      if (m.dur) o.dur = m.dur * dur;
    }
    return o;
  }
  function outMul(pl, type, e) {
    let k = 1;
    if (type && pl.typeBonus && pl.typeBonus[type]) k *= 1 + pl.typeBonus[type];
    if (type && e && held(pl, 'expertbelt') && G.Types.mult(type, e.types) > 1) k *= 1.30;
    return k;
  }
  function critMul(pl) {
    let k = 1;
    if (held(pl, 'scopelens')) k *= 1.30;
    if (held(pl, 'duskstone')) k *= 1.40;
    return k;
  }
  function onHit(pl, e) {
    if (!pl || !e || e.dead) return;
    if (held(pl, 'flameorb') && Math.random() < 0.05) e.applyBurn(1);
    if (held(pl, 'toxicorb') && Math.random() < 0.05) e.applyPoison(1);
    if (held(pl, 'snowball') && Math.random() < 0.06) e.applySlow(0.4);
    if (held(pl, 'kingsrock') && Math.random() < 0.06 && e.applyStun) e.applyStun(0.5);
  }
  function onKill(pl, e) {
    if (!pl || !e) return;
    if (held(pl, 'reapercloth')) reaper(pl, Math.floor(pl.kills / 100));
    if (held(pl, 'firestone') && e.burn > 0) blast(pl, e, '#ff7a3a');
    if (held(pl, 'icestone') && e.slow > 0) blast(pl, e, '#9fd8ff');
  }
  function sash(p) {
    if (!held(p, 'focussash') || Math.random() >= 0.15) return false;
    if (performance.now() - (p.sashT || 0) < 20000) return false;
    p.sashT = performance.now();
    p.hp = 1; p.invuln = Math.max(p.invuln || 0, 1.2);
    say(p, '1', '#ff9a3d');
    return true;
  }
  function revive(p) {
    if (held(p, 'maxrevive') && !p._maxRev) {
      p._maxRev = true;
      p.hp = p.maxHp * 0.60;
      p.dead = false;
      p.invuln = Math.max(p.invuln || 0, 1.2);
      say(p, '60%', '#7dffb3');
      return true;
    }
    if (held(p, 'revive') && !p._rev) {
      p._rev = true;
      p.hp = p.maxHp * 0.35;
      p.dead = false;
      p.invuln = Math.max(p.invuln || 0, 1.2);
      say(p, '35%', '#7dffb3');
      return true;
    }
    return false;
  }
  function onDamaged(p) {
    if (held(p, 'metronome')) { p._metroT = 0; metro(p, 0); }
    if (held(p, 'smokeball') && Math.random() < 0.25) p.invuln = Math.max(p.invuln || 0, 1.5);
  }
  function tick(p, dt) {
    if (p.dead) return;
    if (held(p, 'metronome')) {
      p._metroT = (p._metroT || 0) + dt;
      while (p._metroT >= 10 && (p._metro || 0) < 10) {
        p._metroT -= 10;
        metro(p, (p._metro || 0) + 1);
      }
    }
    const now = performance.now();
    if (held(p, 'lumberry')) {
      if (!p._lumAt) p._lumAt = now;
      else if (now - p._lumAt >= 30000) { p._lumAt = now; p.heal(p.maxHp * 0.20); }
    }
    if (held(p, 'sitrusberry') && p.maxHp > 0 && p.hp / p.maxHp < 0.30 && now - (p._sitAt || 0) >= 45000) {
      p._sitAt = now;
      p.heal(p.maxHp * 0.35);
    }
    if (held(p, 'stickybarb')) {
      p._barbT = (p._barbT || 0) + dt;
      if (p._barbT >= 1) {
        p._barbT -= 1;
        for (const e of G.EnemyMgr.queryCircle(p.x, p.y, 80)) {
          if (e.dead) continue;
          if (G.Siege && G.Siege.ally && G.Siege.ally(e, p)) continue;
          e.hurt(15, '#c9a06a', e.x - p.x, e.y - p.y, 0);
        }
      }
    }
  }
  function luckMul(pl) { return 1 + Math.max(0, (pl && pl.luck) || 0) / 100; }

  return {
    LIST, BY, BALL, RARITY, roll, rollChoices, gain, text, ballName, choices,
    shaped, outMul, critMul, onHit, onKill, sash, revive, onDamaged, tick, luckMul, canEvolve
  };
})();
