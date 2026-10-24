/* ============ run-ui.js — cartas de nivel, pausa y fin de run ============ */
G.RunUI = (() => {
  const $ = G.UI.$;
  let offers = null, offerCb = null, coopMode = false;

  /*
   * Al aparecer unas cartas (nivel, vínculo, objeto) no se pueden elegir
   * durante GUARD s y se ven apagadas: en plena pelea se pulsa 1-4 (o se toca
   * la pantalla) para cambiar de ataque y se elegía una carta sin querer.
   * Cambiar las cartas o el 2.º paso del vínculo no lo vuelven a poner: ahí ya
   * estás eligiendo a propósito.
   */
  const GUARD = 0.6;
  const PICK_MS = 20000;
  let guardUntil = 0, guardT = 0;
  let pickUntil = 0, pickTimer = 0;
  function guard(box) {
    guardUntil = performance.now() + GUARD * 1000;
    box.classList.add('guard');
    clearTimeout(guardT);
    guardT = setTimeout(() => document.querySelectorAll('.cards.guard').forEach(b => b.classList.remove('guard')), GUARD * 1000);
  }
  const guarded = () => performance.now() < guardUntil;

  /** @param coop  en grupo: tras elegir, se queda esperando a los demás */
  function showLevelUp(level, list, cb, coop = false) {
    offerCb = cb; coopMode = coop;
    $('lvl-num').textContent = level;
    $('lvl-wait').textContent = '';
    $('lvl-wait').classList.toggle('hidden', !coop);
    $('cards').classList.remove('done');
    renderCards(list);
    $('lvl-reroll').onclick = reroll;
    const sk = $('lvl-skip');
    if (sk) sk.onclick = skipCard;
    G.UI.show('scr-levelup');
    guard($('cards'));
    armClock();
  }

  /** 20 s para elegir. Si se acaba, se queda la primera carta. Cambiar opciones lo reinicia. */
  function armClock() {
    stopClock();
    pickUntil = performance.now() + PICK_MS;
    paintClock();
    pickTimer = setInterval(() => {
      if (!offers) { stopClock(); return; }
      paintClock();
      if (performance.now() >= pickUntil) {
        stopClock();
        pick(0, true);
      }
    }, 100);
  }

  function stopClock() {
    if (pickTimer) clearInterval(pickTimer);
    pickTimer = 0;
  }

  function paintClock() {
    const el = $('lvl-clock');
    const left = Math.max(0, pickUntil - performance.now());
    const secs = Math.ceil(left / 1000);
    if (el) {
      el.textContent = G.I18n.f('Te quedan {x} s', secs);
      el.classList.toggle('urgent', secs <= 5);
    }
    const bar = $('lvl-bar');
    const fill = bar && bar.querySelector('i');
    if (fill) fill.style.transform = 'scaleX(' + (left / PICK_MS) + ')';
  }

  /**
   * Cambiar las cartas: 1 vez gratis por partida y 1 más por cada jefe
   * derrotado (en grupo cuentan los jefes del equipo; cada uno tiene los suyos).
   */
  function rerollsLeft() {
    const p = G.Game.player;
    // 1 gratis + los comprados en Mejoras (antes, 1 más por cada jefe).
    return p ? Math.max(0, 1 + (p.rerollBonus || 0) - (p.rerolls || 0)) : 0;
  }

  function reroll() {
    if (!offers || rerollsLeft() <= 0) return;
    const p = G.Game.player;
    p.rerolls = (p.rerolls || 0) + 1;
    G.Audio.sfx('select');
    renderCards(G.LevelUp.offer(p));
    armClock();
  }

  function renderCards(list) {
    offers = list;
    const left = rerollsLeft();
    $('lvl-rr-n').textContent = left;
    $('lvl-reroll').classList.toggle('hidden', left <= 0);
    const box = $('cards');
    box.innerHTML = '';
    box.classList.toggle('n4', list.length >= 4);
    const sub = document.querySelector('#scr-levelup .sub');
    if (sub) {
      let k4 = sub.querySelector('[data-k4]');
      if (list.length >= 4) {
        if (!k4) {
          k4 = document.createElement('kbd');
          k4.dataset.k4 = '1';
          k4.textContent = '4';
          sub.appendChild(document.createTextNode(' '));
          sub.appendChild(k4);
        }
      } else if (k4) k4.remove();
    }
    const sk = $('lvl-skip'), leftSk = skipsLeft();
    if (sk) {
      sk.classList.toggle('hidden', leftSk <= 0);
      const n = $('lvl-sk-n');
      if (n) n.textContent = leftSk;
    }
    list.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'card';
      const tag = c.type === 'new'
        ? `<span class="tag-chip" style="background:${c.color}">Nuevo · ${c.tag}</span>${c.cat ? `<span class="tag-chip cat">${c.cat}</span>` : ''}`
        : c.type === 'up' || c.type === 'evo'
          ? `<span class="tag-chip" style="background:${c.color}">${c.tag}</span>`
          : `<span class="tag-chip" style="background:${c.color === '#ffd23f' ? '#ffd23f' : '#9fb1c9'}">${c.tag}</span>`;
      if (c.type === 'evo') el.classList.add('evo');
      el.innerHTML =
        `<div class="ico" style="background:${c.color}33">${G.Icons.html(c.icon, 32)}</div>
         <div class="txt"><div class="nm">${c.title} ${tag}</div><div class="ds">${c.desc}</div></div>
         <div class="key">${i + 1}</div>`;
      el.dataset.sfx = 'none';             // el juego pone su propio sonido al elegir
      el.onclick = () => pick(i);
      box.appendChild(el);
    });
  }

  function skipsLeft() {
    const p = G.Game.player;
    return p ? Math.max(0, (p.skipBonus || 0) - (p.skips || 0)) : 0;
  }

  /** Cierra las cartas sin aprender ninguna. El nivel ya está subido. */
  function skipCard() {
    if (!offers || skipsLeft() <= 0 || guarded()) return;
    const p = G.Game.player;
    if (p) p.skips = (p.skips || 0) + 1;
    G.Audio.sfx('back');
    stopClock();
    const cb = offerCb;
    offers = null; offerCb = null;
    $('lvl-reroll').classList.add('hidden');
    const sk = $('lvl-skip');
    if (sk) sk.classList.add('hidden');
    if (coopMode) $('cards').classList.add('done');
    else G.UI.hide('scr-levelup');
    if (cb) cb(null);
  }

  function pick(i, force) {
    if (!offers || !offers[i] || (!force && guarded())) return;
    stopClock();
    const c = offers[i], cb = offerCb;
    offers = null; offerCb = null;
    $('lvl-reroll').classList.add('hidden');
    const sk = $('lvl-skip');
    if (sk) sk.classList.add('hidden');
    if (coopMode) {
      // Se queda la carta elegida a la vista mientras eligen los demás.
      $('cards').querySelectorAll('.card').forEach((el, j) => el.classList.toggle('picked', j === i));
      $('cards').classList.add('done');
    } else G.UI.hide('scr-levelup');
    cb(c);
  }

  /** Cooperativo: quién falta por elegir. */
  function setWaiting(names) {
    const me = G.Social.me ? G.Social.me.name : '';
    const others = names.filter(n => n !== me);
    const list = a => new Intl.ListFormat(G.I18n.locale, { style: 'long', type: 'conjunction' }).format(a);
    $('lvl-wait').setAttribute('translate', 'no');
    $('lvl-wait').textContent = !names.length ? ''
      : !others.length ? G.T('Elige tu carta')
      : names.includes(me) ? G.I18n.f('Faltan por elegir: {x}', list([...others, G.T('tú')]))
      : G.I18n.f('Esperando a {x}…', list(others));
  }

  function closeLevelUp() {
    stopClock();
    offers = null; offerCb = null;
    $('cards').classList.remove('done');
    G.UI.hide('scr-levelup');
  }

  function showOver(r, onBack) {
    $('over-title').textContent = r.cause === 'castle-win' ? '¡Has protegido al cachorro!'
      : r.cause === 'castle' ? 'El cachorro ha caído…'
      : r.cause === 'siege-win' ? 'Eres el último en pie'
      : r.cause === 'siege-lose' ? 'Tu castillo ha caído…'
      : r.dead ? 'Has caído…' : 'Run terminada';
    $('over-stats').innerHTML = `
      <div><span>Modo</span><b>${r.sheet ? r.sheet.modeName : ''}</b></div>
      <div><span>Mapa</span><b translate="no">${r.sheet ? r.sheet.mapName : ''}</b></div>
      <div><span>Dificultad</span><b>${r.sheet ? r.sheet.diffName : '—'}</b></div>
      <div><span>Tiempo</span><b>${G.U.mmss(r.time)}</b></div>
      <div><span>Nivel</span><b>${r.level}</b></div>
      <div><span>Derrotados</span><b>${r.kills}</b></div>
      <div><span>Jefes</span><b>${r.bosses}</b></div>
      <div><span>Daño total</span><b>${r.sheet ? r.sheet.totalDamage : 0}</b></div>
      <div><span>Daño a jefes</span><b>${r.sheet ? r.sheet.bossDamage : 0}</b></div>
      ${r.judge ? `<div style="grid-column:1/-1"><span>Ante Arceus</span><b class="gold">${G.U.mmss(r.judge.time)} · ${r.judge.bosses} ${r.judge.bosses === 1 ? 'legendario' : 'legendarios'}${r.judge.dmg ? ' · ' + r.judge.dmg.toLocaleString(G.I18n.locale) : ''}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>Pokémonedas ganadas</span>
        <b class="gold"><span class="coin"></span> +${r.coins}</b>
        <div style="font-size:12px;color:var(--muted)">${r.breakdown}</div></div>
      <div><span>Caramelos conseguidos</span><b>${r.candyEarned || 0}</b></div>
      <div><span>Caramelos gastados</span><b>${r.candySpent || 0}</b></div>
      ${r.endless ? `<div><span>Oleada</span><b>${r.endless.wave}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>Caramelos que quedan</span>
        <b><img src="assets/future-use/candy/candy-token.png" alt="" style="height:14px;width:auto;image-rendering:pixelated;vertical-align:middle" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'◆'}))"> ${r.candyLeft || 0}</b>
        <div style="font-size:12px;color:var(--muted)">Los caramelos sólo valen en esta partida</div></div>
      ${r.t1 || r.t10 ? `<div style="grid-column:1/-1"><span>Tickets del gacha</span><b>
        ${r.t1 ? G.Icons.html('ticket', 22) + ' +' + r.t1 + ' ' : ''}${r.t10 ? G.Icons.html('ticket10', 22) + ' +' + r.t10 + ' ×10' : ''}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>Movimientos</span><b style="font-size:15px">
        ${r.moves.map(m => `${G.Icons.html('move:' + m.id, 16)} ${G.T(m.name, 'move')} Nv.${m.lvl}`).join(' · ') || '—'}</b></div>
      ${r.caught && r.caught.length ? `<div style="grid-column:1/-1" class="caught"><span>${G.Icons.html('shiny', 12)} Shinies conseguidos</span>
        <div class="caught-row" id="over-caught"></div></div>` : ''}
      ${r.record ? '<div style="grid-column:1/-1;text-align:center" class="gold">¡Nuevo récord de tiempo!</div>' : ''}
      ${r.sheet && r.sheet.record ? '<div style="grid-column:1/-1;text-align:center" class="gold">¡Nuevo récord de esta modalidad!</div>' : ''}
      ${r.endless && r.endless.record && !(r.sheet && r.sheet.record) ? '<div style="grid-column:1/-1;text-align:center" class="gold">¡Nuevo récord de la mazmorra sin fin!</div>' : ''}`;
    $('btn-again').onclick = onBack;
    if (r.caught && r.caught.length) {
      const row = $('over-caught');
      for (const c of r.caught) {
        const w = document.createElement('div');
        w.appendChild(G.UI.spriteCanvas(c.dex, 90, 72, { shiny: true, lively: true, scale: 2 }));
        w.insertAdjacentHTML('beforeend', `<small>${G.DEX_BY[c.dex].name}${c.isNew ? ' · ¡nuevo!' : ''}</small>`);
        row.appendChild(w);
      }
    }
    G.UI.show('scr-over');
  }

  /** Una bola: eliges 1 de 3 objetos de ese nivel. */
  function showBallChoice(tier, options, cb) {
    const head = document.querySelector('#scr-item h2');
    const sub = document.querySelector('#scr-item .sub');
    const lang = (G.I18n && G.I18n.lang) || '';
    const zh = String(lang).startsWith('zh');
    if (head) { head.setAttribute('translate', 'no'); head.textContent = G.Items.ballName(tier); }
    if (sub) {
      sub.setAttribute('translate', 'no');
      sub.textContent = zh ? '選一個。這一局先暫停。' : lang === 'en' ? 'Choose one. This run is paused.' : 'Elige uno. La partida está en pausa.';
    }
    const box = $('item-cards');
    box.innerHTML = '';
    options.forEach((it, i) => {
      const n = (G.Game.player && G.Game.player.stacks && G.Game.player.stacks[it.id]) || 0;
      const el = document.createElement('div');
      el.className = 'card' + (it.tier >= 3 ? ' evo' : '');
      el.innerHTML = `<div class="ico">${G.Icons.html(it.id, 36)}</div>
        <div class="txt"><div class="nm">${G.Items.text(it, 'name')} <span class="tag-chip">${n}/${it.max}</span></div><div class="ds">${G.Items.text(it, 'desc')}</div><div class="ds">${G.Items.stackText(G.Game.player, it).replace(/\n/g, '<br>')}</div></div>
        <div class="key">${i + 1}</div>`;
      el.onclick = () => { if (guarded()) return; G.UI.hide('scr-item'); cb(it.id); };
      box.appendChild(el);
    });
    G.UI.show('scr-item');
    guard(box);
  }

  /** Has encontrado un objeto llevando ya otro: ¿con cuál te quedas? */
  function showItemChoice(cur, next, cb) {
    const box = $('item-cards');
    box.innerHTML = '';
    [[cur, 'Quedarme con'], [next, 'Cambiar a']].forEach(([id, verb], i) => {
      const it = G.Items.BY[id];
      const el = document.createElement('div');
      el.className = 'card' + (i === 1 ? ' evo' : '');
      el.innerHTML = `<div class="ico">${G.Icons.html(id, 36)}</div>
        <div class="txt"><div class="nm">${verb} ${it.name}</div><div class="ds">${it.desc}</div></div>
        <div class="key">${i + 1}</div>`;
      el.onclick = () => { if (guarded()) return; G.UI.hide('scr-item'); cb(id); };
      box.appendChild(el);
    });
    G.UI.show('scr-item');
    guard(box);
  }

  // ---------------- vínculo: qué movimientos se fusionan ----------------

  let bond = null;          // { opt, cb, first, list }

  /**
   * @param opt  pl.bondOptions(): 'add' (uno suelto al grupo) o 'pair' (dos sueltos, en dos pasos)
   * @param cb   recibe la lista de movimientos que se juntan
   */
  function showBond(opt, cb) {
    bond = { opt, cb, first: null, list: [] };
    $('bond-back').onclick = bondBack;
    renderBond();
    G.UI.show('scr-bond');
    guard($('bond-cards'));
  }

  function renderBond() {
    const { opt, first } = bond;
    const names = ms => ms.map(m => G.T(m.name, 'move')).join(' + ');
    const step2 = opt.mode === 'pair' && first;
    $('bond-sub').textContent = opt.mode === 'add' ? 'Elige qué movimiento se une a ' + names(opt.group)
      : step2 ? '¿Con cuál unes ' + G.T(first.name, 'move') + '?' : 'Elige el primer movimiento que vas a unir';
    $('bond-back').classList.toggle('hidden', !step2);
    bond.list = step2 ? opt.loose.filter(m => m !== first) : opt.loose;
    const box = $('bond-cards');
    box.innerHTML = '';
    bond.list.forEach((m, i) => {
      const col = G.U.TYPE_COLOR[m.type];
      const desc = opt.mode === 'add' ? 'Se lanzará a la vez que ' + names(opt.group) + '.'
        : step2 ? 'Se lanzará a la vez que ' + G.T(first.name, 'move') + '. Queda un hueco libre.'
        : m.desc || '';
      const el = document.createElement('div');
      el.className = 'card' + (opt.mode === 'add' || step2 ? ' bond' : '');
      el.innerHTML =
        `<div class="ico" style="background:${col}33">${G.Icons.html('move:' + m.id, 32)}</div>
         <div class="txt"><div class="nm">${G.T(m.name, 'move')} <span class="tag-chip" style="background:${col}">Nv.${m.lvl}</span></div><div class="ds">${desc}</div></div>
         <div class="key">${i + 1}</div>`;
      el.dataset.sfx = 'none';
      el.onclick = () => pickBond(i);
      box.appendChild(el);
    });
  }

  function pickBond(i) {
    if (!bond || !bond.list[i] || guarded()) return;
    const m = bond.list[i];
    if (bond.opt.mode === 'pair' && !bond.first) {
      bond.first = m;
      G.Audio.sfx('select');
      renderBond();
      return;
    }
    const picked = bond.opt.mode === 'add' ? [m] : [bond.first, m];
    const cb = bond.cb;
    bond = null;
    G.UI.hide('scr-bond');
    cb(picked);
  }

  function bondBack() {
    if (!bond) return;
    bond.first = null;
    renderBond();
  }

  /*
   * Resumen de la partida en la pausa: tus ataques (categoría, daño hecho y
   * daño por segundo), tus estadísticas con todo lo subido y el objeto y las
   * cartas de mejora que llevas.
   */
  function pauseSummary() {
    const pl = G.Game.player;
    if (!pl) return '';
    const t = G.Game.st.time, n = v => Math.round(v).toLocaleString('es');
    const k2 = v => '×' + v.toFixed(2).replace('.', ',');
    const pct = v => Math.round(v * 100) + ' %';
    const moves = pl.moves.map(m => {
      const secs = Math.max(5, t - (m.since || 0)), col = G.U.TYPE_COLOR[m.type];
      const cat = m.cat ? `<span class="tag-chip" style="background:${col}">${G.Stats.NAME[m.cat]}</span>` : '<span class="sub">Mejora</span>';
      return `<tr><td>${G.Icons.html('move:' + m.id, 18)} ${G.T(m.name, 'move')} <small>Nv.${m.lvl}</small></td><td>${cat}</td>
        <td class="num">${m.cat ? n(m.dealt || 0) : '—'}</td><td class="num">${m.cat ? n((m.dealt || 0) / secs) + '/s' : '—'}</td></tr>`;
    }).join('');
    const mon = pl.mon, fis = 1 - G.Stats.taken(mon, 'physical'), esp = 1 - G.Stats.taken(mon, 'special');
    const guard = v => (v >= 0 ? '−' : '+') + Math.round(Math.abs(v) * 100) + ' %';
    const st = [
      ['Vida', n(pl.hp) + ' / ' + n(pl.maxHp)],
      ['Ataque', k2(pl.atkFor({ cat: 'physical' }))],
      ['At. Esp.', k2(pl.atkFor({ cat: 'special' }))],
      ['Defensa', mon.df + ' <small>' + guard(fis) + ' físico</small>'],
      ['Def. Esp.', mon.sd + ' <small>' + guard(esp) + ' especial</small>'],
      ['Velocidad', n(pl.spd)],
      ['Crítico', pct(pl.critChance || 0)],
      ['Reducción de daño', pct(pl.reduction)],
      ['Recarga', pl.cdMul < 0.995 ? '−' + pct(1 - pl.cdMul) : '0 %'],
      ['Regeneración', pl.regen.toFixed(1).replace('.', ',') + ' /s']
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    const it = pl.item && G.Items.BY[pl.item];
    const cards = Object.entries(pl.statsTaken || {}).map(([id, c]) => {
      const s = G.LevelUp.STATS.find(x => x.id === id);
      return s ? `<span class="chip">${G.Icons.html(s.icon, 12)} ${s.title} ×${c}</span>` : '';
    }).join('');
    return `<h3>Tus ataques</h3>
      <table class="sum-moves"><tr><th></th><th></th><th class="num">Daño</th><th class="num">Por segundo</th></tr>${moves}</table>
      <h3>Tus estadísticas</h3><div class="sum-stats">${st}</div>
      <h3>Objeto y cartas</h3>
      <p class="sub">${it ? G.Icons.html(pl.item, 18) + ' <b>' + it.name + '</b>: ' + it.desc : 'Sin objeto.'}</p>
      <div class="chips">${cards || '<span class="sub">Aún no has cogido cartas de mejora.</span>'}</div>`;
  }

  function showPause(coop = false) {
    $('pause-sum').innerHTML = pauseSummary();
    G.UI.soundControls($('pause-sound'));
    $('pause-coop').classList.toggle('hidden', !coop);
    $('btn-quit').textContent = coop ? 'Salir de la partida' : 'Abandonar run';
    G.UI.show('scr-pause');
  }

  function mapCopy() {
    const lang = (G.I18n && G.I18n.lang) || '';
    const zh = String(lang).startsWith('zh');
    const en = lang === 'en';
    const t = (z, e, s) => zh ? z : en ? e : s;
    const coop = G.Coop && G.Coop.active;
    return {
      title: t('地圖', 'Map', 'Mapa'),
      close: t('關閉', 'Close', 'Cerrar'),
      foot: coop
        ? t('M 或 Esc 關閉。其他人還在打。', 'M or Esc closes it. The others keep playing.', 'M o Esc para cerrar. Los demás siguen.')
        : t('M 或 Esc 關閉。這一局先暫停。', 'M or Esc closes it. This run is paused.', 'M o Esc para cerrar. La partida está en pausa.'),
      hint: t('點一個標記可以記方向，再點一次取消。', 'Click a marker to remember the way. Click it again to clear it.', 'Pulsa una marca para recordar el camino. Otra vez para quitarla.'),
      rows: [
        { shapes: [['mk-enemy', '#ff4d5a']], text: t('敵人。紅點。', 'Enemies. A red dot.', 'Enemigos. Un punto rojo.') },
        { shapes: [['mk-boss', '#e1061c']], text: t('Boss。比較大的紅點。', 'Bosses. The bigger red dot.', 'Jefes. El punto rojo más grande.') },
        { shapes: [['mk-egg', '#fff1c2']], text: t('孵化蛋。走過去就撿起來，先放進背包。', 'Hatching eggs. Walk over them. They go into the bag first.', 'Huevos de incubar. Se cogen al pasar y van primero a la mochila.') },
        { shapes: [['img', 'assets/future-use/balls/poke-ball.png'], ['img', 'assets/future-use/balls/great-ball.png'], ['img', 'assets/future-use/balls/ultra-ball.png']], text: t('精靈球。走過去後三選一。紅是一般、藍是超級、黃是高級。', 'Poké Balls. Walk over one and choose 1 of 3. Red is normal, blue is super, yellow is ultra.', 'Poké Balls. Al pasar eliges 1 de 3. Roja normal, azul super, amarilla ultra.') },
        { shapes: [['img', 'assets/future-use/shop/shop-only.png']], text: t('商店。紅白條紋的攤位。', 'Shops. The red and white stall.', 'Tiendas. El puesto de rayas rojas y blancas.') },
        { shapes: [['mk-mate', '#5fd4ff']], text: t('隊友。青色菱形。聯機時才會出現。', 'Teammates. A cyan diamond, only in co-op.', 'Compañeros. Un rombo cian, sólo en cooperativo.') }
      ]
    };
  }

  function showMap() {
    const box = $('scr-map');
    const copy = mapCopy();
    box.querySelector('h2').textContent = copy.title;
    box.querySelector('#map-close').textContent = copy.close;
    box.querySelector('.map-foot').textContent = copy.foot;
    box.querySelector('.map-hint').textContent = copy.hint;
    box.querySelector('#map-legend').innerHTML = copy.rows.map(row =>
      `<li><span class="map-icons">${row.shapes.map(([k, col]) => k === 'img'
        ? `<img class="map-swatch mk-img" src="${col}" alt="">`
        : `<i class="map-swatch ${k}" style="--c:${col}"></i>`).join('')}</span><span>${row.text}</span></li>`).join('');
    const cv = $('map-radar');
    if (cv && !cv._wired) {
      cv._wired = true;
      const pick = ev => {
        const pl = G.Game.player;
        if (!pl) return;
        const rect = cv.getBoundingClientRect();
        const x = (ev.clientX - rect.left) / rect.width * cv.width;
        const y = (ev.clientY - rect.top) / rect.height * cv.height;
        let best = null, bd = 20 * 20;
        for (const h of cv._hits || []) {
          const d = (h.sx - x) * (h.sx - x) + (h.sy - y) * (h.sy - y);
          if (d < bd) { bd = d; best = h; }
        }
        if (!best || (pl.mark && Math.hypot(pl.mark.x - best.x, pl.mark.y - best.y) < 28)) pl.mark = null;
        else pl.mark = { x: best.x, y: best.y, col: best.col };
      };
      cv.addEventListener('click', pick);
      cv.addEventListener('contextmenu', ev => { ev.preventDefault(); pick(ev); });
    }
    $('map-close').onclick = () => G.Game.toggleMap();
    G.UI.show('scr-map');
  }

  function wirePause(onResume, onQuit) {
    $('btn-resume').onclick = onResume;
    $('btn-quit').onclick = onQuit;
  }

  function showStall(shop, api) {
    const lang = (G.I18n && G.I18n.lang) || '';
    const zh = String(lang).startsWith('zh');
    const en = lang === 'en';
    $('stall-title').textContent = zh ? '喵喵的商店' : en ? "Meowth's shop" : 'Tienda de Meowth';
    $('stall-sub').textContent = G.I18n.f('Cada compra sube los precios {x} caramelos', 3);
    const pl = G.Game.player;
    const candyMark = '<img src="assets/future-use/candy/candy-token.png" alt="" style="height:14px;width:auto;image-rendering:pixelated;vertical-align:middle">';
    $('stall-coins').innerHTML = candyMark + ' ' + G.I18n.f('Tienes {x} caramelos', pl.runCandy | 0);
    const status = $('stall-status');
    if (status) status.textContent = api.note ? G.I18n.t(api.note) : '';
    const box = $('stall-cards');
    box.innerHTML = '';
    const have = id => (pl.stacks && pl.stacks[id]) || 0;
    (shop.stock || []).forEach(id => {
      const it = G.Items.BY[id];
      if (!it) return;
      const n = have(id);
      const price = G.Game.stallPrice(it, shop);
      const full = !G.Items.canOffer(pl, it);
      const rare = G.Items.RARITY[it.rarity] || G.Items.RARITY.common;
      const label = zh ? rare.zh : en ? rare.en : rare.es;
      const el = document.createElement('div');
      el.className = 'card stall-card' + (full ? ' off' : '');
      el.innerHTML = `<div class="ico">${G.Icons.html(it.id, 40)}</div>
        <div class="txt" style="flex:1">
          <div class="nm"><b>${G.Items.text(it, 'name')}</b> <span class="stall-rarity" style="background:${rare.color}">${label}</span><span class="stall-count">${G.I18n.f('Llevas x{x} · tope x{x}', n, it.max)}</span></div>
          <div class="ds">${G.Items.text(it, 'desc')}<br>${G.Items.stackText(pl, it).replace(/\n/g, '<br>')}</div>
          <div class="stall-price">${full ? G.I18n.t('Has llegado al tope de este objeto.') : candyMark + ' ' + G.I18n.f('Cuesta {x} caramelos', price)}</div>
        </div>`;
      el.onclick = () => { if (!full) api.buy(id); };
      box.appendChild(el);
    });
    const refresh = $('stall-refresh');
    const cost = 15;
    refresh.textContent = G.I18n.f('Cambiar: {x} caramelos', cost);
    refresh.disabled = (pl.runCandy | 0) < cost;
    refresh.onclick = () => api.refresh();
    $('stall-leave').textContent = zh ? '離開' : en ? 'Leave' : 'Salir';
    $('stall-leave').onclick = () => api.leave();
    G.UI.show('scr-stall');
  }

  return { showLevelUp, reroll, showItemChoice, showBallChoice, showBond, pickBond, bondBack, pick, skip: skipCard, setWaiting, closeLevelUp, showOver, wirePause, showPause, showMap, showStall };
})();
