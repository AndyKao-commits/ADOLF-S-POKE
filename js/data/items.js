/* ============ items.js — objetos de la partida ============
 * Una bola deja elegir 1 de 3. La bola normal saca del nivel 1, la super del 2
 * y la ultra del 3. Se apilan hasta su tope y duran lo que dura la partida.
 * Los que reaccionan a un golpe los mira el jugador con pl.hasItem(id).
 */
G.Items = (() => {
  const LIST = [];

  function add(it) { LIST.push(it); }

  function tracked(p, id, bucket, apply) {
    p[bucket] = p[bucket] || {};
    return (n, fn) => {
      const prev = p[bucket][id] || 0;
      const next = fn(n);
      apply(prev, next);
      p[bucket][id] = next;
    };
  }

  const TYPES = [
    ['silkscarf', 'Pañuelo Seda', '絲綢圍巾', 'Los ataques Normal hacen más daño.', '一般系招式傷害提高。', 'normal'],
    ['charcoal', 'Carbón', '木炭', 'Los ataques Fuego hacen más daño.', '火系招式傷害提高。', 'fire'],
    ['mysticwater', 'Agua Mística', '神秘水滴', 'Los ataques Agua hacen más daño.', '水系招式傷害提高。', 'water'],
    ['miracleseed', 'Semilla Milagro', '奇蹟種子', 'Los ataques Planta hacen más daño.', '草系招式傷害提高。', 'grass'],
    ['magnet', 'Imán', '磁鐵', 'Los ataques Eléctrico hacen más daño.', '電系招式傷害提高。', 'electric'],
    ['nevermeltice', 'Antiderretir', '不融冰', 'Los ataques Hielo hacen más daño.', '冰系招式傷害提高。', 'ice'],
    ['blackbelt', 'Cinturón Negro', '黑帶', 'Los ataques Lucha hacen más daño.', '格鬥系招式傷害提高。', 'fighting'],
    ['poisonbarb', 'Flecha Venenosa', '毒針', 'Los ataques Veneno hacen más daño.', '毒系招式傷害提高。', 'poison'],
    ['softsand', 'Arena Fina', '柔軟沙子', 'Los ataques Tierra hacen más daño.', '地面系招式傷害提高。', 'ground'],
    ['sharpbeak', 'Pico Afilado', '銳利鳥嘴', 'Los ataques Volador hacen más daño.', '飛行系招式傷害提高。', 'flying'],
    ['twistedspoon', 'Cuchara Torcida', '彎曲湯匙', 'Los ataques Psíquico hacen más daño.', '超能力系招式傷害提高。', 'psychic'],
    ['silverpowder', 'Polvo Plata', '銀粉', 'Los ataques Bicho hacen más daño.', '蟲系招式傷害提高。', 'bug'],
    ['hardstone', 'Piedra Dura', '硬石頭', 'Los ataques Roca hacen más daño.', '岩石系招式傷害提高。', 'rock'],
    ['spelltag', 'Hechizo', '咒術護符', 'Los ataques Fantasma hacen más daño.', '幽靈系招式傷害提高。', 'ghost'],
    ['dragonfang', 'Colmillo Dragón', '龍之牙', 'Los ataques Dragón hacen más daño.', '龍系招式傷害提高。', 'dragon'],
    ['blackglasses', 'Gafas de Sol', '黑色眼鏡', 'Los ataques Siniestro hacen más daño.', '惡系招式傷害提高。', 'dark'],
    ['metalcoat', 'Revestimiento Metálico', '金屬膜', 'Los ataques Acero hacen más daño.', '鋼系招式傷害提高。', 'steel'],
    ['fairyfeather', 'Pluma Hada', '妖精之羽', 'Los ataques Hada hacen más daño.', '妖精系招式傷害提高。', 'fairy']
  ];
  for (const [id, name, zh, desc, zd, type] of TYPES) {
    add({
      id, name, zh, desc, zd, tier: 1, max: 8,
      on(p, n) {
        p.typeBonus = p.typeBonus || {};
        p._tb = p._tb || {};
        const prev = p._tb[id] || 0, next = 0.04 * n;
        p.typeBonus[type] = (p.typeBonus[type] || 0) - prev + next;
        p._tb[id] = next;
      },
      off(p) {
        const prev = (p._tb && p._tb[id]) || 0;
        if (p.typeBonus) p.typeBonus[type] = (p.typeBonus[type] || 0) - prev;
        if (p._tb) p._tb[id] = 0;
      }
    });
  }

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
  function flat(field, per, id) {
    return {
      on(p, n) {
        p._itemF = p._itemF || {};
        const prev = p._itemF[id] || 0, next = per * n;
        p[field] += next - prev;
        p._itemF[id] = next;
      },
      off(p) {
        const prev = (p._itemF && p._itemF[id]) || 0;
        p[field] -= prev;
        if (p._itemF) p._itemF[id] = 0;
      }
    };
  }

  add(Object.assign({ id: 'leftovers', name: 'Restos', zh: '吃剩的東西', desc: 'Recuperas vida cada segundo.', zd: '每秒回復一些生命。', tier: 1, max: 5 }, {
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
  }));
  add(Object.assign({ id: 'oranberry', name: 'Baya Aranja', zh: '橙橙果', desc: 'Más vida máxima en esta partida.', zd: '這一局的生命上限提高。', tier: 1, max: 8 }, {
    on(p, n) { bumpHp(p, 'oranberry', 8 * n); },
    off(p) { bumpHp(p, 'oranberry', 0); }
  }));
  add(Object.assign({ id: 'sitrusberry', name: 'Baya Zidra', zh: '文柚果', desc: 'Más vida máxima.', zd: '生命上限再提高一些。', tier: 2, max: 5 }, {
    on(p, n) { bumpHp(p, 'sitrusberry', 14 * n); },
    off(p) { bumpHp(p, 'sitrusberry', 0); }
  }));
  add({ id: 'shellbell', name: 'Cascabel Concha', zh: '貝殼之鈴', desc: 'Recuperas vida con el daño que haces.', zd: '造成傷害時回復一點生命。', tier: 1, max: 4, on() {}, off() {} });
  add({ id: 'rockyhelmet', name: 'Casco Dentado', zh: '凸凸頭盔', desc: 'Quien te golpea de cerca recibe daño.', zd: '近身打到你的對手會受傷。', tier: 1, max: 3, on() {}, off() {} });
  add(Object.assign({ id: 'amuletcoin', name: 'Moneda Amuleto', zh: '護身金幣', desc: 'Más monedas al recogerlas.', zd: '撿到的金幣變多。', tier: 1, max: 4 }, mul('coinMul', 0.2, 'amuletcoin')));
  add(Object.assign({ id: 'luckyegg', name: 'Huevo Suerte', zh: '幸運蛋', desc: 'Más experiencia.', zd: '獲得的經驗變多。', tier: 1, max: 4 }, mul('xpMul', 0.12, 'luckyegg')));
  add(Object.assign({ id: 'quickclaw', name: 'Garra Rápida', zh: '先制之爪', desc: 'Tus movimientos se recargan antes.', zd: '招式冷卻變短。', tier: 2, max: 4 }, mul('cdMul', -0.06, 'quickclaw')));
  add(Object.assign({ id: 'choicescarf', name: 'Pañuelo Elección', zh: '講究圍巾', desc: 'Te mueves más rápido.', zd: '移動速度提高。', tier: 2, max: 3 }, mul('spdMul', 0.12, 'choicescarf')));
  add(Object.assign({ id: 'muscleband', name: 'Cinta Fuerte', zh: '力量頭帶', desc: 'Más daño.', zd: '傷害提高。', tier: 2, max: 6 }, mul('atkMul', 0.05, 'muscleband')));
  add(Object.assign({ id: 'expertbelt', name: 'Cinta Experto', zh: '講究腰帶', desc: 'Más daño.', zd: '傷害提高。', tier: 2, max: 4 }, mul('atkMul', 0.08, 'expertbelt')));
  add(Object.assign({ id: 'assaultvest', name: 'Chaleco Asalto', zh: '突擊背心', desc: 'Recibes menos daño.', zd: '受到的傷害降低。', tier: 2, max: 4 }, flat('dmgReduce', 0.05, 'assaultvest')));
  add(Object.assign({ id: 'safetygoggles', name: 'Gafas de Seguridad', zh: '防塵護目鏡', desc: 'Un poco menos de daño recibido.', zd: '受到的傷害稍微降低。', tier: 1, max: 4 }, flat('dmgReduce', 0.03, 'safetygoggles')));
  add({ id: 'focussash', name: 'Banda Focus', zh: '氣勢頭帶', desc: 'Un golpe que te dejaría KO te deja con 1 de vida (cada 60 s).', zd: '致命一擊會留下 1 點生命（每 60 秒一次）。', tier: 2, max: 1, on() {}, off() {} });
  add(Object.assign({ id: 'razorclaw', name: 'Garra Afilada', zh: '銳利之爪', desc: 'Más probabilidad de golpe crítico.', zd: '會心一擊的機率提高。', tier: 2, max: 5 }, {
    on(p, n) { bumpCrit(p, 'razorclaw', 0.03 * n); },
    off(p) { bumpCrit(p, 'razorclaw', 0); }
  }));
  add(Object.assign({ id: 'scopelens', name: 'Periscopio', zh: '焦點鏡', desc: 'Bastante más probabilidad de crítico.', zd: '會心一擊的機率提高更多。', tier: 3, max: 3 }, {
    on(p, n) { bumpCrit(p, 'scopelens', 0.06 * n); },
    off(p) { bumpCrit(p, 'scopelens', 0); }
  }));
  add(Object.assign({ id: 'choiceband', name: 'Cinta Elección', zh: '講究頭帶', desc: 'Mucho más daño, pero no puedes cambiar de movimiento.', zd: '傷害大幅提高，但不能切換招式。', tier: 3, max: 1 }, mul('atkMul', 0.4, 'choiceband')));
  add(Object.assign({ id: 'lifeorb', name: 'Vidasfera', zh: '生命寶珠', desc: 'Más daño, pero cada ataque te quita un poco de vida.', zd: '傷害提高，但每次攻擊會扣一點生命。', tier: 3, max: 1 }, mul('atkMul', 0.3, 'lifeorb')));
  add(Object.assign({ id: 'metronome', name: 'Metrónomo', zh: '揮指公', desc: 'Más daño mientras lo llevas.', zd: '帶著它時傷害提高。', tier: 2, max: 5 }, mul('atkMul', 0.04, 'metronome')));
  add(Object.assign({ id: 'widelens', name: 'Lupa', zh: '廣角鏡', desc: 'Más daño.', zd: '傷害提高。', tier: 2, max: 4 }, mul('atkMul', 0.04, 'widelens')));
  add(Object.assign({ id: 'brightpowder', name: 'Polvo Brillo', zh: '光粉', desc: 'Te mueves un poco más rápido.', zd: '移動速度稍微提高。', tier: 1, max: 5 }, mul('spdMul', 0.04, 'brightpowder')));
  add(Object.assign({ id: 'quickpowder', name: 'Polvo Veloz', zh: '速度粉', desc: 'Te mueves más rápido.', zd: '移動速度提高。', tier: 2, max: 4 }, mul('spdMul', 0.07, 'quickpowder')));
  add({ id: 'nugget', name: 'Pepita', zh: '金珠', desc: 'Un puñado de monedas ahora mismo.', zd: '立刻得到一些金幣。', tier: 1, max: 99,
    on(p) { p.coins += 15; }, off() {} });
  add({ id: 'bignugget', name: 'Pepita Grande', zh: '巨大金珠', desc: 'Muchas monedas ahora mismo.', zd: '立刻得到不少金幣。', tier: 3, max: 99,
    on(p) { p.coins += 40; }, off() {} });
  add(Object.assign({ id: 'starpiece', name: 'Trozo Estrella', zh: '星星碎片', desc: 'Más experiencia.', zd: '經驗提高。', tier: 2, max: 4 }, mul('xpMul', 0.15, 'starpiece')));
  add(Object.assign({ id: 'eviolite', name: 'Mineral Evolutivo', zh: '進化奇石', desc: 'Más vida máxima.', zd: '生命上限提高。', tier: 2, max: 3 }, {
    on(p, n) { bumpHp(p, 'eviolite', 20 * n); },
    off(p) { bumpHp(p, 'eviolite', 0); }
  }));
  add(Object.assign({ id: 'masterball', name: 'Master Ball', zh: '大師球', desc: 'Más daño y más experiencia.', zd: '傷害和經驗都提高。', tier: 3, max: 1 }, {
    on(p, n) { mul('atkMul', 0.15, 'masterball-a').on(p, n); mul('xpMul', 0.15, 'masterball-x').on(p, n); },
    off(p) { mul('atkMul', 0.15, 'masterball-a').off(p); mul('xpMul', 0.15, 'masterball-x').off(p); }
  }));

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
    return it[key];
  }
  function ballName(tier) {
    const b = BALL[Math.max(0, Math.min(2, (tier | 0) - 1))];
    const lang = (G.I18n && G.I18n.lang) || '';
    return String(lang).startsWith('zh') ? b.zh : b.name;
  }

  /** Tres objetos de ese nivel que aún quepan. Si faltan, completa con el nivel de abajo. */
  function rollChoices(tier, pl, n = 3) {
    const have = id => (pl && pl.stacks && pl.stacks[id]) || 0;
    const pool = t => LIST.filter(i => i.tier === t && have(i.id) < i.max);
    let bag = pool(tier);
    if (bag.length < n) bag = bag.concat(pool(Math.max(1, tier - 1)).filter(i => !bag.includes(i)));
    if (bag.length < n) bag = bag.concat(LIST.filter(i => have(i.id) < i.max && !bag.includes(i)));
    return G.U.pickN(bag, Math.min(n, bag.length));
  }

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

  return { LIST, BY, BALL, roll, rollChoices, gain, text, ballName };
})();
