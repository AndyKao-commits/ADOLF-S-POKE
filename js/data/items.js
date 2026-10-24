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

  // La 1.ª copia entera; las siguientes rinden menos. No es efecto × copias.
  const BASIC_STACK_WEIGHTS = [1, 0.70, 0.50, 0.30, 0.30, 0.15, 0.15, 0.15, 0.15, 0.15];
  function stackPower(count, weights) {
    const w = weights || BASIC_STACK_WEIGHTS;
    let total = 0;
    for (let i = 0; i < count && i < w.length; i++) total += w[i];
    return total;
  }
  function scaled(per, n, curve) {
    if (!n) return 0;
    return curve === 'dim' ? per * stackPower(n) : per * n;
  }
  function typeItemBonus(count) {
    if (count <= 0) return { typeDamage: 0, allDamage: 0 };
    return { typeDamage: 0.20 + Math.max(0, count - 1) * 0.05, allDamage: 0.02 + Math.max(0, count - 1) * 0.01 };
  }
  function leftRegen(n) { return n <= 0 ? 0 : 1.2 + Math.max(0, n - 1) * 0.4; }
  function noteAtk(p, id, factor) {
    p._atkPart = p._atkPart || {};
    p._atkPart[id] = factor;
    let prod = 1;
    for (const k in p._atkPart) prod *= p._atkPart[k] || 1;
    p._atkItemProd = prod;
  }

  function mul(field, per, id, curve) {
    return {
      on(p, n) {
        p._itemK = p._itemK || {};
        const prev = p._itemK[id] || 1, next = 1 + scaled(per, n, curve);
        p[field] = p[field] / prev * next;
        p._itemK[id] = next;
        if (field === 'atkMul') noteAtk(p, id, next);
      },
      off(p) {
        const prev = (p._itemK && p._itemK[id]) || 1;
        p[field] /= prev;
        if (p._itemK) p._itemK[id] = 1;
        if (field === 'atkMul') noteAtk(p, id, 1);
      }
    };
  }
  /* rate > 0 dispara más rápido (la recarga baja). */
  function haste(id, rate, curve) {
    return {
      on(p, n) {
        p._itemK = p._itemK || {};
        const prev = p._itemK[id] || 1, next = 1 / (1 + scaled(rate, n, curve));
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
  function flat(field, per, id, curve) {
    return {
      on(p, n) {
        p._itemF = p._itemF || {};
        const prev = p._itemF[id] || 0, next = scaled(per, n, curve);
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
    p._hpFrac = p._hpFrac || {};
    let others = 0;
    for (const k in p._hpFrac) if (k !== id && p._hpFrac[k] > 0) others += p._hpFrac[k];
    if (frac > 0) frac = Math.min(frac, Math.max(0, 1 - others));
    p._hpFrac[id] = frac;
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
    normal: '第一份：一般招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', fire: '第一份：火招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', water: '第一份：水招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。',
    grass: '第一份：草招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', electric: '第一份：電招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', ice: '第一份：冰招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。',
    fighting: '第一份：格鬥招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', poison: '第一份：毒招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', ground: '第一份：地面招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。',
    flying: '第一份：飛行招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', psychic: '第一份：超能力招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', bug: '第一份：蟲招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。',
    rock: '第一份：岩石招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', ghost: '第一份：幽靈招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', dragon: '第一份：龍招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。',
    dark: '第一份：惡招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', steel: '第一份：鋼招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。', fairy: '第一份：妖精招式 +20%，全部傷害 +2%。之後每份 +5% 與 +1%。'
  };
  for (const [id, name, zh, en, file, type] of TYPES) {
    const zd = TYPE_ZH[type];
    add(Object.assign({
      id, name, zh, en, file, tier: 1, max: 10, stackType: 'basic',
      desc: 'La primera copia: su tipo +20 % y todo el daño +2 %. Cada copia de más: +5 % de tipo y +1 % de daño.',
      zd, ed: 'First copy: its type +20% and all damage +2%. Each further copy: type +5% and all damage +1%.'
    }, {
      on(p, n) {
        const b = typeItemBonus(n);
        p.typeBonus = p.typeBonus || {};
        p._tb = p._tb || {};
        const prev = p._tb[id] || 0;
        p.typeBonus[type] = (p.typeBonus[type] || 0) - prev + b.typeDamage;
        p._tb[id] = b.typeDamage;
        p._itemK = p._itemK || {};
        const ida = id + '-a', prevK = p._itemK[ida] || 1, nextK = 1 + b.allDamage;
        p.atkMul = p.atkMul / prevK * nextK;
        p._itemK[ida] = nextK;
        noteAtk(p, ida, nextK);
      },
      off(p) {
        const prev = (p._tb && p._tb[id]) || 0;
        if (p.typeBonus) p.typeBonus[type] = (p.typeBonus[type] || 0) - prev;
        if (p._tb) p._tb[id] = 0;
        const ida = id + '-a';
        const prevK = (p._itemK && p._itemK[ida]) || 1;
        p.atkMul /= prevK;
        if (p._itemK) p._itemK[ida] = 1;
        noteAtk(p, ida, 1);
      }
    }));
  }

  function card(o, fx) { add(Object.assign(o, fx)); }

  card({ id: 'leftovers', name: 'Restos', zh: '吃剩的東西', en: 'Leftovers', file: 'leftovers.png', tier: 1, max: 1,
    desc: 'La primera copia recupera 1,2 de vida por segundo. Cada copia de más, +0,4.', zd: '第一份每秒恢復 1.2 HP，之後每份 +0.4。', ed: 'The first copy recovers 1.2 HP per second. Each further copy adds 0.4.' }, {
    on(p, n) {
      p._itemF = p._itemF || {};
      const prev = p._itemF.leftovers || 0, next = leftRegen(n);
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
    on(p, n) { bumpHp(p, 'oranberry', 15 * stackPower(n)); }, off(p) { bumpHp(p, 'oranberry', 0); }
  });
  card({ id: 'sitrusberry', name: 'Baya Zidra', zh: '文柚果', en: 'Sitrus Berry', file: 'sitrus-berry.png', tier: 2, max: 1,
    desc: 'Por debajo del 30 % de vida, recuperas un 25 %. Como mucho una vez cada 60 s. No se apila.',
    zd: 'HP 低於 30% 時恢復 25% HP，每 60 秒一次。不可重複。',
    ed: 'Below 30% HP, recover 25% HP, once every 60 seconds. Does not stack.' }, { on() {}, off() {} });
  card({ id: 'shellbell', name: 'Cascabel Concha', zh: '貝殼之鈴', en: 'Shell Bell', file: 'shell-bell.png', tier: 1, max: 1,
    desc: 'Recuperas el 1 % del daño que haces.', zd: '恢復所造成傷害的 1%。', ed: 'Recover 1% of the damage you deal.' }, { on() {}, off() {} });
  card({ id: 'rockyhelmet', name: 'Casco Dentado', zh: '凸凸頭盔', en: 'Rocky Helmet', file: 'rocky-helmet.png', tier: 1, max: 1,
    desc: 'Quien te toca recibe 25 de daño.', zd: '接觸你的敵人受到 25 傷害。', ed: 'An enemy that touches you takes 25 damage.' }, { on() {}, off() {} });
  card({ id: 'amuletcoin', name: 'Moneda Amuleto', zh: '護身金幣', en: 'Amulet Coin', file: 'amulet-coin.png', tier: 1, max: 1,
    desc: '+25 % de monedas, menos a partir de la segunda copia.', zd: '金幣 +25%，第二份起遞減。', ed: 'Coins +25%, less from the second copy.' }, mul('coinMul', 0.25, 'amuletcoin', 'dim'));
  card({ id: 'luckyegg', name: 'Huevo Suerte', zh: '幸運蛋', en: 'Lucky Egg', file: 'lucky-egg.png', tier: 1, max: 1,
    desc: '+15 % de experiencia, menos a partir de la segunda copia.', zd: '經驗 +15%，第二份起遞減。', ed: 'Experience +15%, less from the second copy.' }, mul('xpMul', 0.15, 'luckyegg', 'dim'));
  card({ id: 'quickclaw', name: 'Garra Rápida', zh: '先制之爪', en: 'Quick Claw', file: 'quick-claw.png', tier: 2, max: 1,
    desc: '+10 % de velocidad de ataque, menos a partir de la segunda copia.', zd: '攻擊速度 +10%，第二份起遞減。', ed: 'Attack speed +10%, less from the second copy.' }, haste('quickclaw', 0.10, 'dim'));
  card({ id: 'choicescarf', name: 'Pañuelo Elección', zh: '講究圍巾', en: 'Choice Scarf', file: 'choice-scarf.png', tier: 2, max: 1,
    desc: 'Cada copia: +10 % de velocidad de movimiento y +6 % de velocidad de ataque. Hasta x3.',
    zd: '每份移動速度 +10%、攻擊速度 +6%。最多 x3。', ed: 'Each copy: move speed +10% and attack speed +6%. Up to x3.' },
    both(mul('spdMul', 0.10, 'choicescarf'), haste('choicescarf-h', 0.06)));
  card({ id: 'muscleband', name: 'Cinta Fuerte', zh: '力量頭帶', en: 'Muscle Band', file: 'muscle-band.png', tier: 2, max: 1,
    desc: '+15 % de daño, menos a partir de la segunda copia. Hasta x5.', zd: '傷害 +15%，第二份起遞減。最多 x5。', ed: 'Damage +15%, less from the second copy. Up to x5.' }, mul('atkMul', 0.15, 'muscleband', 'dim'));
  card({ id: 'expertbelt', name: 'Cinta Experto', zh: '達人力帶', en: 'Expert Belt', file: 'expert-belt.png', tier: 2, max: 1,
    desc: '+30 % de daño a quien es débil a tu tipo.', zd: '對弱於招式屬性的目標傷害 +30%。',
    ed: 'Damage +30% against targets weak to the move\'s type.' }, { on() {}, off() {} });
  card({ id: 'assaultvest', name: 'Chaleco Asalto', zh: '突擊背心', en: 'Assault Vest', file: 'assault-vest.png', tier: 2, max: 1,
    desc: 'Cada copia: +10 de armadura y +8 % de vida máxima. Hasta x3.', zd: '每份護甲 +10、最大 HP +8%。最多 x3。', ed: 'Each copy: armor +10 and max HP +8%. Up to x3.' }, {
    on(p, n) { flat('armor', 10, 'assaultvest').on(p, n); pctHp(p, 'assaultvest', 0.08 * n); },
    off(p) { flat('armor', 10, 'assaultvest').off(p); pctHp(p, 'assaultvest', 0); }
  });
  card({ id: 'safetygoggles', name: 'Gafas de Seguridad', zh: '防塵護目鏡', en: 'Safety Goggles', file: 'safety-goggles.png', tier: 1, max: 1,
    desc: '+5 de armadura, menos a partir de la segunda copia.', zd: '護甲 +5，第二份起遞減。', ed: 'Armor +5, less from the second copy.' }, flat('armor', 5, 'safetygoggles', 'dim'));
  card({ id: 'focussash', name: 'Banda Focus', zh: '氣勢頭帶', en: 'Focus Sash', file: 'focus-sash.png', tier: 2, max: 1,
    desc: 'Un 15 % de las veces, un golpe mortal te deja con 1 de vida. Como mucho una vez cada 20 s.',
    zd: '15% 機率以 1 HP 抵擋致命一擊，每 20 秒一次。',
    ed: '15% chance to survive a fatal hit at 1 HP, once every 20 seconds.' }, { on() {}, off() {} });
  card({ id: 'razorclaw', name: 'Garra Afilada', zh: '銳利之爪', en: 'Razor Claw', file: 'razor-claw.png', tier: 2, max: 1,
    desc: '+6 % de probabilidad de crítico.', zd: '暴擊率 +6%。', ed: 'Critical hit chance +6%.' }, {
    on(p, n) { bumpCrit(p, 'razorclaw', 0.06 * stackPower(n)); }, off(p) { bumpCrit(p, 'razorclaw', 0); }
  });
  card({ id: 'scopelens', name: 'Periscopio', zh: '焦點鏡', en: 'Scope Lens', file: 'scope-lens.png', tier: 3, max: 1,
    desc: '+30 % de daño crítico.', zd: '暴擊傷害 +30%。', ed: 'Critical hit damage +30%.' }, { on() {}, off() {} });
  card({ id: 'choiceband', name: 'Cinta Elección', zh: '講究頭帶', en: 'Choice Band', file: 'choice-band.png', tier: 3, max: 1,
    desc: 'Cada copia: +15 % de daño y -4 % de velocidad de ataque. Hasta x3.', zd: '每份傷害 +15%、攻擊速度 -4%。最多 x3。',
    ed: 'Each copy: damage +15% and attack speed -4%. Up to x3.' }, both(mul('atkMul', 0.15, 'choiceband'), haste('choiceband-h', -0.04)));
  card({ id: 'lifeorb', name: 'Vidasfera', zh: '生命寶珠', en: 'Life Orb', file: 'life-orb.png', tier: 3, max: 1,
    desc: 'Cada copia: +15 % de daño y -5 % de vida máxima. Hasta x3.', zd: '每份傷害 +15%、最大 HP -5%。最多 x3。',
    ed: 'Each copy: damage +15% and max HP -5%. Up to x3.' }, {
    on(p, n) { mul('atkMul', 0.15, 'lifeorb').on(p, n); pctHp(p, 'lifeorb', -0.05 * n); },
    off(p) { mul('atkMul', 0.15, 'lifeorb').off(p); pctHp(p, 'lifeorb', 0); }
  });
  card({ id: 'metronome', name: 'Metrónomo', zh: '揮指公', en: 'Metronome', file: 'metronome.png', tier: 2, max: 1,
    desc: 'Cada 10 s sin recibir daño, +4 % de daño, hasta +40 %. Al recibirlo, vuelve a cero.',
    zd: '每 10 秒不受傷，傷害 +4%，最多 +40%。',
    ed: 'Every 10 seconds without taking damage, damage +4%, up to +40%.' }, { on() {}, off(p) { metro(p, 0); } });
  card({ id: 'widelens', name: 'Lupa', zh: '廣角鏡', en: 'Wide Lens', file: 'wide-lens.png', tier: 2, max: 1,
    desc: '+10 % de alcance.', zd: '範圍 +10%。', ed: 'Area +10%.' }, { on() {}, off() {} });
  card({ id: 'brightpowder', name: 'Polvo Brillo', zh: '光粉', en: 'Bright Powder', file: 'bright-powder.png', tier: 1, max: 1,
    desc: '+4 % de evasión, menos a partir de la segunda copia.', zd: '閃避 +4%，第二份起遞減。', ed: 'Evasion +4%, less from the second copy.' }, flat('evade', 0.04, 'brightpowder', 'dim'));
  card({ id: 'quickpowder', name: 'Polvo Veloz', zh: '速度粉', en: 'Quick Powder', file: 'quick-powder.png', tier: 2, max: 1,
    desc: '+7 % de velocidad de movimiento, menos a partir de la segunda copia.', zd: '移動速度 +7%，第二份起遞減。', ed: 'Move speed +7%, less from the second copy.' }, mul('spdMul', 0.07, 'quickpowder', 'dim'));
  card({ id: 'nugget', name: 'Pepita', zh: '金珠', en: 'Nugget', file: 'nugget.png', tier: 1, max: 1,
    desc: '+15 % de monedas, menos a partir de la segunda copia.', zd: '金幣 +15%，第二份起遞減。', ed: 'Coins +15%, less from the second copy.' }, mul('coinMul', 0.15, 'nugget', 'dim'));
  card({ id: 'bignugget', name: 'Pepita Grande', zh: '巨大金珠', en: 'Big Nugget', file: 'big-nugget.png', tier: 3, max: 5,
    desc: 'Las Poké Balls cuestan un 8 % menos, hasta un 40 %.', zd: '精靈球價格降低 8%，最多 40%。',
    ed: 'Poké Ball prices drop 8%, up to 40%.' }, {
    on(p, n) { p.ballCut = Math.min(0.40, 0.08 * n); },
    off(p) { p.ballCut = 0; }
  });
  card({ id: 'starpiece', name: 'Trozo Estrella', zh: '星星碎片', en: 'Star Piece', file: 'star-piece.png', tier: 2, max: 1,
    desc: '+20 de suerte, menos a partir de la segunda copia. Es la misma suerte que las mejoras.', zd: '幸運 +20，第二份起遞減。和永久強化是同一項幸運。', ed: 'Luck +20, less from the second copy. This is the same luck as upgrades.' }, flat('luck', 20, 'starpiece', 'dim'));
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
    desc: 'Prepara un levantamiento al 70 % de vida. Solo uno por partida, compartido.', zd: '倒下時恢復 70% HP。本局自動復活只限一次。',
    ed: 'Prepares a revival at 70% HP. Only one automatic revival per run, shared.', stackType: 'revive', reviveRatio: 0.70 }, { on() {}, off() {} });
  card({ id: 'rarecandy', name: 'Caramelo Raro', zh: '神奇糖果', en: 'Rare Candy', file: 'rare-candy.png', tier: 3, max: 1,
    desc: 'Subes 2 niveles al momento y +5 % de daño.', zd: '立即升級 +2，傷害 +5%。',
    ed: 'Level up by 2 right away, and damage +5%.' }, {
    on(p, n) {
      mul('atkMul', 0.05, 'rarecandy').on(p, 1);
      const prev = p._candy || 0;
      const add = Math.max(0, (n || 1) - prev);
      p._candy = Math.max(prev, n || 1);
      if (!add) return;
      let need = 0, lv = p.level, xp = p.xp, next = p.xpNext;
      for (let i = 0; i < add * 2; i++) { need += Math.max(1, next - xp); xp = 0; lv++; next = G.Player.xpFor(lv); }
      const got = p.gainXp(need);
      if (G.Game && G.Game.noteXp) G.Game.noteXp(got);
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
    desc: 'Cada copia: +1 proyectil y +10 % de alcance. Hasta x2.', zd: '每份彈體 +1、範圍 +10%。最多 x2。', ed: 'Each copy: projectiles +1 and area +10%. Up to x2.' }, { on() {}, off() {} });
  card({ id: 'maxpp', name: 'PP Máximos', zh: 'PP提升劑', en: 'Max PP', file: 'max-pp.png', tier: 2, max: 1,
    desc: 'Cada copia: +1 proyectil en disparos, órbitas y cadenas. Hasta x3.', zd: '每份讓彈射、環繞和連鎖招式彈體 +1。最多 x3。',
    ed: 'Each copy: shots, orbits and chains gain 1 projectile. Up to x3.' }, { on() {}, off() {} });
  card({ id: 'maxelixir', name: 'Elixir Máximo', zh: '極限全復藥', en: 'Max Elixir', file: 'max-elixir.png', tier: 2, max: 1,
    desc: 'Cada copia: +12 % de velocidad de ataque. Hasta x3.', zd: '每份攻擊速度 +12%。最多 x3。', ed: 'Each copy: attack speed +12%. Up to x3.' }, haste('maxelixir', 0.12));
  card({ id: 'shinystone', name: 'Piedra Día', zh: '光之石', en: 'Shiny Stone', file: 'shiny-stone.png', tier: 2, max: 1,
    desc: 'Cada copia: +10 % de daño y +8 % de alcance. Hasta x3.', zd: '每份傷害 +10%、範圍 +8%。最多 x3。', ed: 'Each copy: damage +10% and area +8%. Up to x3.' },
    mul('atkMul', 0.10, 'shinystone'));
  card({ id: 'duskstone', name: 'Piedra Noche', zh: '暗之石', en: 'Dusk Stone', file: 'dusk-stone.png', tier: 2, max: 1,
    desc: 'Cada copia: +5 % de probabilidad de crítico y +20 % de daño crítico. Hasta x3.', zd: '每份暴擊率 +5%、暴擊傷害 +20%。最多 x3。',
    ed: 'Each copy: critical chance +5% and critical damage +20%. Up to x3.' }, {
    on(p, n) { bumpCrit(p, 'duskstone', 0.05 * n); }, off(p) { bumpCrit(p, 'duskstone', 0); }
  });
  card({ id: 'honey', name: 'Miel', zh: '甜甜蜜', en: 'Honey', file: 'honey.png', tier: 3, max: 1,
    desc: 'Una Poké Ball ofrece 4 objetos en vez de 3.', zd: '精靈球提供 4 個道具而非 3 個。',
    ed: 'A Poké Ball offers 4 items instead of 3.' }, { on() {}, off() {} });
  card({ id: 'firestone', name: 'Piedra Fuego', zh: '火之石', en: 'Fire Stone', file: 'fire-stone.png', tier: 2, max: 1,
    desc: 'Un enemigo quemado explota al caer.', zd: '灼傷敵人倒下時爆炸。', ed: 'A burned enemy explodes when it falls.' }, { on() {}, off() {} });
  card({ id: 'icestone', name: 'Piedra Hielo', zh: '冰之石', en: 'Ice Stone', file: 'ice-stone.png', tier: 2, max: 1,
    desc: 'Un enemigo frenado explota al caer.', zd: '減速敵人倒下時爆炸。', ed: 'A slowed enemy explodes when it falls.' }, { on() {}, off() {} });
  card({ id: 'revive', name: 'Revivir', zh: '復活草', en: 'Revive', file: 'revive.png', tier: 3, max: 1,
    desc: 'Prepara un levantamiento al 50 % de vida. Solo uno por partida, compartido.', zd: '倒下時恢復 50% HP。本局自動復活只限一次。',
    ed: 'Prepares a revival at 50% HP. Only one automatic revival per run, shared.', stackType: 'revive', reviveRatio: 0.50 }, { on() {}, off() {} });
  card({ id: 'powerbracer', name: 'Brazal Firme', zh: '力量護腕', en: 'Power Bracer', file: 'power-bracer.png', tier: 3, max: 1,
    desc: '+30 % de daño y -15 % de velocidad de movimiento. Solo una copia.', zd: '傷害 +30%，移動速度 -15%。只能持有一份。',
    ed: 'Damage +30% and move speed -15%. Only one copy.' }, both(mul('atkMul', 0.30, 'powerbracer'), mul('spdMul', -0.15, 'powerbracer')));
  card({ id: 'expshare', name: 'Repartir Exp', zh: '學習裝置', en: 'Exp. Share', file: 'exp-share.png', tier: 2, max: 1,
    desc: 'Cada copia: +15 % de experiencia y +10 % de radio de recogida. Hasta x3.', zd: '每份經驗 +15%、拾取半徑 +10%。最多 x3。',
    ed: 'Each copy: experience +15% and pickup radius +10%. Up to x3.' }, both(mul('xpMul', 0.15, 'expshare'), mul('magnet', 0.10, 'expshare')));
  card({ id: 'lumberry', name: 'Baya Zonlan', zh: '木子果', en: 'Lum Berry', file: 'lum-berry.png', tier: 2, max: 1,
    desc: 'Cada 40 s recuperas un 15 % de vida. No se apila.', zd: '每 40 秒恢復 15% HP。不可重複。', ed: 'Every 40 seconds, recover 15% HP. Does not stack.' }, { on() {}, off() {} });
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
    desc: '+15 % de curación, menos a partir de la segunda copia.', zd: '治療 +15%，第二份起遞減。', ed: 'Healing +15%, less from the second copy.' }, mul('healMul', 0.15, 'bigroot', 'dim'));
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
    noteAtk(p, 'metro', 1 + next * 0.04);
  }
  function reaper(p, next) {
    const prev = p._reaper || 0;
    next = Math.max(0, Math.min(30, next));
    if (prev === next) return;
    p.atkMul = p.atkMul / (1 + prev * 0.01) * (1 + next * 0.01);
    p._reaper = next;
    noteAtk(p, 'reaper', 1 + next * 0.01);
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
  const KIND = {
    leftovers: ['basic', 10], oranberry: ['basic', 10], rockyhelmet: ['basic', 10], amuletcoin: ['basic', 10],
    luckyegg: ['basic', 10], quickclaw: ['basic', 10], muscleband: ['basic', 5], razorclaw: ['basic', 10],
    scopelens: ['basic', 10], widelens: ['basic', 10], brightpowder: ['basic', 10], quickpowder: ['basic', 10],
    nugget: ['basic', 10], starpiece: ['basic', 10], bigroot: ['basic', 10], safetygoggles: ['basic', 10],
    lightclay: ['basic', 10], stickybarb: ['basic', 5], bignugget: ['basic', 5],
    maxelixir: ['advanced', 3], assaultvest: ['advanced', 3], expshare: ['advanced', 3], shinystone: ['advanced', 3],
    duskstone: ['advanced', 3], moonstone: ['advanced', 2], maxpp: ['advanced', 3], powerbracer: ['advanced', 1],
    lifeorb: ['advanced', 3], choiceband: ['advanced', 3], choicescarf: ['advanced', 3], masterball: ['advanced', 1],
    rarecandy: ['advanced', 3], cometshard: ['advanced', 1], reapercloth: ['advanced', 1],
    honey: ['unique', 1], eviolite: ['unique', 1], focussash: ['unique', 1], metronome: ['unique', 1],
    firestone: ['unique', 1], icestone: ['unique', 1], smokeball: ['unique', 1], kingsrock: ['unique', 1],
    protectivepads: ['unique', 1], flameorb: ['unique', 1], toxicorb: ['unique', 1], snowball: ['unique', 1],
    expertbelt: ['unique', 1], shellbell: ['unique', 1], sitrusberry: ['unique', 1], lumberry: ['unique', 1],
    maxrevive: ['revive', 1], revive: ['revive', 1]
  };
  for (const it of LIST) {
    const h = HOLD[it.id];
    if (h) {
      it.max = h[0];
      it.rarity = h[1];
      it.shopBase = RARITY[h[1]].price;
    }
    const k = KIND[it.id];
    if (k) { it.stackType = k[0]; it.max = k[1]; }
    else if (!it.stackType) it.stackType = 'basic';
    if (it.id === 'maxrevive') it.reviveRatio = 0.70;
    if (it.id === 'revive') it.reviveRatio = 0.50;
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

  const RARITY_LUCK_CAP = { common: 1, uncommon: 1.3, rare: 1.6, legendary: 1.9, mythic: 2.2 };
  const LUCK_FULL = 80;
  function sealed(pl, id) { return !!(pl && pl.sealed && pl.sealed.has(id)); }
  function copies(pl, id) { return (pl && pl.stacks && pl.stacks[id]) || 0; }
  /** Una sola suerte: mejoras y objetos. itemLuck antiguo se absorbe una vez. */
  function luckOf(pl) {
    if (!pl) return 0;
    if (!pl._luckMerged) {
      pl.luck = Math.max(pl.luck || 0, pl.itemLuck || 0);
      pl.itemLuck = 0;
      pl._luckMerged = true;
    }
    return Math.max(0, pl.luck || 0);
  }
  function rarityWeight(rarity, luck) {
    const cap = RARITY_LUCK_CAP[rarity] || 1;
    const t = Math.max(0, Math.min(1, (luck || 0) / LUCK_FULL));
    return 1 + (cap - 1) * t;
  }
  function takeWeighted(bag, n, luck) {
    const pool = bag.slice(), out = [];
    while (out.length < n && pool.length) {
      let sum = 0;
      const w = pool.map(it => { const v = rarityWeight(it.rarity, luck); sum += v; return v; });
      let x = Math.random() * sum, i = 0;
      for (; i < pool.length - 1; i++) { x -= w[i]; if (x <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function canOffer(pl, it) {
    if (!it || !pl) return false;
    if (copies(pl, it.id) >= it.max) return false;
    if (sealed(pl, it.id)) return false;
    if (it.stackType === 'revive') {
      const c = pl.reviveCharge;
      if (c && c.used) return false;
      if (it.id === 'revive' && held(pl, 'maxrevive')) return false;
      if (c && (c.hpRatio || 0) >= (it.reviveRatio || 0)) return false;
    }
    return true;
  }
  function rollChoices(tier, pl, n = 3) {
    const ok = i => canOffer(pl, i);
    const pool = t => LIST.filter(i => i.tier === t && ok(i));
    let bag = pool(tier);
    if (bag.length < n) bag = bag.concat(pool(Math.max(1, tier - 1)).filter(i => !bag.includes(i)));
    if (bag.length < n) bag = bag.concat(LIST.filter(i => ok(i) && !bag.includes(i)));
    return takeWeighted(bag, Math.min(n, bag.length), luckOf(pl));
  }
  function choices(pl) { return held(pl, 'honey') ? 4 : 3; }

  function refreshRevive(p) {
    if (!p) return;
    if (!p.reviveCharge) p.reviveCharge = { source: null, hpRatio: 0, used: false };
    if (p.reviveCharge.used) return;
    let best = p.revival ? { source: 'upgrade', hpRatio: 0.35 } : { source: null, hpRatio: 0 };
    if (held(p, 'revive') && best.hpRatio < 0.50) best = { source: 'revive', hpRatio: 0.50 };
    if (held(p, 'maxrevive') && best.hpRatio < 0.70) best = { source: 'maxrevive', hpRatio: 0.70 };
    p.reviveCharge = { source: best.source, hpRatio: best.hpRatio, used: false };
  }
  function gain(p, id) {
    const it = BY[id];
    if (!it || !p || !canOffer(p, it)) return false;
    p.stacks = p.stacks || {};
    const n = p.stacks[id] || 0;
    if (n && it.off) it.off(p);
    p.stacks[id] = Math.min(it.max, n + 1);
    if (it.on) it.on(p, p.stacks[id]);
    if (it.stackType === 'revive') refreshRevive(p);
    p.item = id;
    return true;
  }
  function roll(except) {
    const pool = LIST.filter(i => i.id !== except);
    return G.U.pick(pool).id;
  }

  function shaped(pl, m) {
    if (!pl || !m) return m;
    const base = (G.Moves && G.Moves.BY_ID && G.Moves.BY_ID[m.id]) || m;
    let extra = 0;
    if (SHOTS[m.kind]) extra += copies(pl, 'moonstone');
    if (PP[m.kind]) extra += copies(pl, 'maxpp');
    extra = Math.min(4, extra);
    let range = 1;
    range *= 1 + 0.10 * copies(pl, 'moonstone');
    range *= 1 + 0.08 * copies(pl, 'shinystone');
    range *= 1 + 0.10 * stackPower(copies(pl, 'widelens'));
    range = Math.min(1.8, range);
    const dur = 1 + 0.20 * stackPower(copies(pl, 'lightclay'));
    const o = Object.assign({}, m);
    if (extra) o.count = Math.min((base.count | 0) + 4, (m.count | 0) + extra);
    if (range !== 1) {
      if (m.radius) o.radius = Math.min(m.radius * range, (base.radius || m.radius) * 1.8);
      if (m.size) o.size = Math.min(m.size * range, (base.size || m.size) * 1.8);
      if (m.width) o.width = Math.min(m.width * range, (base.width || m.width) * 1.8);
    } else if (base.radius && o.radius > base.radius * 1.8) o.radius = base.radius * 1.8;
    if ((o.bounce | 0) > (base.bounce | 0) + 5) o.bounce = (base.bounce | 0) + 5;
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
    const scope = stackPower(copies(pl, 'scopelens'));
    if (scope) k *= 1 + 0.30 * scope;
    const dusk = copies(pl, 'duskstone');
    if (dusk) k *= 1 + 0.20 * dusk;
    return k;
  }
  function thorns(pl) {
    const n = copies(pl, 'rockyhelmet');
    return n ? Math.round(25 * stackPower(n)) : 0;
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
    if (!p) return false;
    const c = p.reviveCharge;
    if (!c || c.used || !(c.hpRatio > 0)) return false;
    c.used = true;
    p.hp = Math.max(1, p.maxHp * c.hpRatio);
    p.dead = false;
    p.invuln = 1.5;
    p.reviveSafe = 1.5;
    p._hitBy = '';
    if (G.MasteryFX) G.MasteryFX.onRevive(p);
    say(p, Math.round(c.hpRatio * 100) + '%', '#7dffb3');
    return true;
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
      else if (now - p._lumAt >= 40000) { p._lumAt = now; p.heal(p.maxHp * 0.15); }
    }
    if (held(p, 'sitrusberry') && p.maxHp > 0 && p.hp / p.maxHp < 0.30 && now - (p._sitAt || 0) >= 60000) {
      p._sitAt = now;
      p.heal(p.maxHp * 0.25);
    }
    if (held(p, 'stickybarb')) {
      p._barbT = (p._barbT || 0) + dt;
      if (p._barbT >= 1) {
        p._barbT -= 1;
        for (const e of G.EnemyMgr.queryCircle(p.x, p.y, 80)) {
          if (e.dead) continue;
          if (G.Siege && G.Siege.ally && G.Siege.ally(e, p)) continue;
          e.hurt(Math.max(1, Math.round(15 * stackPower(copies(p, 'stickybarb')))), '#c9a06a', e.x - p.x, e.y - p.y, 0);
        }
      }
    }
  }
  function luckMul(pl) { return 1 + Math.max(0, (pl && pl.luck) || 0) / 100; }

  /** Sentencia, minuto 35: se caen todos los objetos de la partida (Banda Focus incluida). */
  function breakHeld(p) {
    if (!p) return;
    for (const id of Object.keys(p.stacks || {})) {
      const it = BY[id];
      if (it && it.off && p.stacks[id]) it.off(p);
    }
    p.stacks = {};
    p.item = null;
    p._candy = 0;
    refreshRevive(p);
  }

  function langOf() {
    const lang = (G.I18n && G.I18n.lang) || '';
    return String(lang).startsWith('zh') ? 'zh' : lang === 'en' ? 'en' : 'es';
  }
  function num(v) {
    const n = Math.round(v * 1000) / 10;
    const s = (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : String(n));
    return langOf() === 'es' ? s.replace('.', ',') : s;
  }
  function stackText(pl, it) {
    if (!it) return '';
    const lang = langOf();
    const n = copies(pl, it.id);
    if (it.stackType === 'unique') {
      return lang === 'zh' ? '持有上限：x1\n特殊效果不可重複' : lang === 'en' ? 'Hold limit: x1\nThis effect does not stack' : 'Tope: x1\nEl efecto no se repite';
    }
    if (it.stackType === 'revive') {
      const c = pl && pl.reviveCharge;
      const ratio = c && c.hpRatio ? c.hpRatio : (it.reviveRatio || 0);
      const who = c && c.source === 'maxrevive' ? (lang === 'zh' ? '活力塊' : lang === 'en' ? 'Max Revive' : 'Revivir Máximo')
        : c && c.source === 'revive' ? (lang === 'zh' ? '復活草' : lang === 'en' ? 'Revive' : 'Revivir')
        : c && c.source === 'upgrade' ? (lang === 'zh' ? '重新振作' : lang === 'en' ? 'Revival' : 'Reponerse')
        : (lang === 'zh' ? it.zh : lang === 'en' ? it.en : it.name);
      if (lang === 'zh') return '本局自動復活：' + who + '\n倒下時恢復 ' + Math.round(ratio * 100) + '% HP\n每局限一次';
      if (lang === 'en') return 'Automatic revival: ' + who + '\nGet up at ' + Math.round(ratio * 100) + '% HP\nOnce per run';
      return 'Levantarse: ' + who + '\nTe levantas con el ' + Math.round(ratio * 100) + ' %\nUna vez por partida';
    }
    const nowN = n || 0;
    const pair = effectPair(it, nowN, lang);
    const head = lang === 'zh' ? '目前持有：x' + nowN + '／x' + it.max : lang === 'en' ? 'Held: x' + nowN + '/' + it.max : 'Llevas: x' + nowN + '/' + it.max;
    if (!pair) return head;
    const cur = lang === 'zh' ? '目前效果：' + pair.now : lang === 'en' ? 'Now: ' + pair.now : 'Ahora: ' + pair.now;
    if (nowN >= it.max) return head + '\n' + cur + '\n' + (lang === 'zh' ? '已達持有上限' : lang === 'en' ? 'Hold limit reached' : 'Tope alcanzado');
    const nxt = lang === 'zh' ? '下一份效果：' + pair.next : lang === 'en' ? 'Next copy: ' + pair.next : 'La siguiente: ' + pair.next;
    return head + '\n' + cur + '\n' + nxt;
  }
  function effectPair(it, n, lang) {
    const a = effectValue(it.id, n), b = effectValue(it.id, Math.min(it.max, n + 1));
    if (!a) return null;
    const word = lang === 'zh' ? a.zh : lang === 'en' ? a.en : a.es;
    const show = v => a.flat ? String(Math.round(v * 10) / 10) : num(v) + (lang === 'es' ? ' %' : '%');
    return { now: word + ' +' + show(a.v), next: word + (lang === 'zh' ? '再 +' : lang === 'en' ? ' +' : ' +') + show(Math.max(0, b.v - a.v)) };
  }
  function effectValue(id, n) {
    if (!n) {
      const row = EFFECT[id] || (TYPES.some(t => t[0] === id) ? { zh: '屬性傷害', en: 'type damage', es: 'daño de tipo' } : null);
      return row ? { zh: row.zh, en: row.en, es: row.es, v: 0, flat: !!row.flat } : null;
    }
    const row = EFFECT[id];
    if (!row) {
      if (TYPES.some(t => t[0] === id)) {
        const b = typeItemBonus(n);
        return { zh: '屬性傷害', en: 'type damage', es: 'daño de tipo', v: b.typeDamage, flat: false };
      }
      return null;
    }
    const v = row.curve === 'dim' ? row.per * stackPower(n) : row.curve === 'left' ? leftRegen(n) : row.per * n;
    return { zh: row.zh, en: row.en, es: row.es, v, flat: !!row.flat };
  }
  const EFFECT = {
    muscleband: { per: 0.15, curve: 'dim', zh: '傷害', en: 'damage', es: 'daño' },
    leftovers: { per: 1.2, curve: 'left', flat: true, zh: '每秒恢復', en: 'HP/s', es: 'vida/s' },
    oranberry: { per: 15, curve: 'dim', flat: true, zh: '最大 HP', en: 'max HP', es: 'vida máxima' },
    amuletcoin: { per: 0.25, curve: 'dim', zh: '金幣', en: 'coins', es: 'monedas' },
    luckyegg: { per: 0.15, curve: 'dim', zh: '經驗', en: 'experience', es: 'experiencia' },
    quickclaw: { per: 0.10, curve: 'dim', zh: '攻擊速度', en: 'attack speed', es: 'velocidad de ataque' },
    razorclaw: { per: 0.06, curve: 'dim', zh: '暴擊率', en: 'critical chance', es: 'crítico' },
    choicescarf: { per: 0.10, curve: 'lin', zh: '移動速度', en: 'move speed', es: 'velocidad' },
    choiceband: { per: 0.15, curve: 'lin', zh: '傷害', en: 'damage', es: 'daño' },
    lifeorb: { per: 0.15, curve: 'lin', zh: '傷害', en: 'damage', es: 'daño' },
    maxelixir: { per: 0.12, curve: 'lin', zh: '攻擊速度', en: 'attack speed', es: 'velocidad de ataque' },
    shinystone: { per: 0.10, curve: 'lin', zh: '傷害', en: 'damage', es: 'daño' },
    expshare: { per: 0.15, curve: 'lin', zh: '經驗', en: 'experience', es: 'experiencia' },
    powerbracer: { per: 0.30, curve: 'lin', zh: '傷害', en: 'damage', es: 'daño' },
    masterball: { per: 0.25, curve: 'lin', zh: '傷害', en: 'damage', es: 'daño' },
    nugget: { per: 0.15, curve: 'dim', zh: '金幣', en: 'coins', es: 'monedas' },
    quickpowder: { per: 0.07, curve: 'dim', zh: '移動速度', en: 'move speed', es: 'velocidad' },
    bigroot: { per: 0.15, curve: 'dim', zh: '治療', en: 'healing', es: 'curación' },
    safetygoggles: { per: 5, curve: 'dim', flat: true, zh: '護甲', en: 'armor', es: 'armadura' },
    starpiece: { per: 20, curve: 'dim', flat: true, zh: '幸運', en: 'luck', es: 'suerte' },
    assaultvest: { per: 0.08, curve: 'lin', zh: '最大 HP', en: 'max HP', es: 'vida máxima' },
    moonstone: { per: 1, curve: 'lin', flat: true, zh: '彈體', en: 'projectiles', es: 'proyectiles' },
    maxpp: { per: 1, curve: 'lin', flat: true, zh: '彈體', en: 'projectiles', es: 'proyectiles' },
    widelens: { per: 0.10, curve: 'dim', zh: '範圍', en: 'area', es: 'alcance' },
    scopelens: { per: 0.30, curve: 'dim', zh: '暴擊傷害', en: 'critical damage', es: 'daño crítico' },
    duskstone: { per: 0.05, curve: 'lin', zh: '暴擊率', en: 'critical chance', es: 'crítico' }
  };

  return {
    LIST, BY, BALL, RARITY, roll, rollChoices, gain, text, ballName, choices, breakHeld, canOffer, stackText,
    shaped, outMul, critMul, onHit, onKill, sash, revive, onDamaged, tick, luckMul, canEvolve, thorns, stackPower, refreshRevive
  };
})();
