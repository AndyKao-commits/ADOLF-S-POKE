/* ============ social-ui.js — apodo, amigos, sala e invitaciones ============ */
(() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function ago(t) {
    const m = Math.max(1, Math.round((G.Social.now() - t) / 60000));
    if (m < 60) return 'hace ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 48) return 'hace ' + h + ' h';
    return 'hace ' + Math.round(h / 24) + ' días';
  }

  function stateText(f) {
    if (f.status === 'in') return 'Quiere ser tu amigo';
    if (f.status === 'out') return 'Solicitud enviada';
    if (!f.online) return f.seen ? 'Visto ' + ago(f.seen) : 'Desconectado';
    return f.play ? 'Jugando' : 'En línea';
  }

  /** ¿Se puede usar lo online? Si no, explica por qué. */
  function needOnline() {
    if (G.DB.online) return true;
    G.UI.toast(G.DB.guest ? 'Crea una cuenta para jugar con amigos y salir en el ranking.'
      : G.DB.mode !== 'cloud'
        ? 'Para jugar en línea abre https://aulf-friends-game.firebaseapp.com'
        : 'Entra con una cuenta para usar la nube. La base de datos ya está lista.', 4200);
    return false;
  }

  // ======================= APODO =======================

  G.NickUI = (() => {
    let then = null, skipped = false;

    function init() {
      $('nick-form').onsubmit = async e => {
        e.preventDefault();
        $('nick-err').textContent = '';
        $('nick-ok').disabled = true;
        const r = await G.Social.claimNick($('nick-in').value);
        $('nick-ok').disabled = false;
        if (!r.ok) { $('nick-err').textContent = r.error; G.Audio.sfx('error'); return; }
        G.Audio.sfx('confirm');
        G.UI.toast('Tu apodo es ' + G.Social.me.name);
        const cb = then; then = null;
        if (cb) cb(); else G.MenuUI.open();
      };
      $('nick-later').onclick = () => { skipped = true; then = null; G.MenuUI.open(); };
    }

    /** @param next  qué abrir después de elegirlo */
    function open(next) {
      then = next || null;
      G.UI.show('scr-nick');
      $('nick-err').textContent = '';
      $('nick-in').value = '';
      setTimeout(() => $('nick-in').focus(), 50);
    }

    return { init, open, get skipped() { return skipped; } };
  })();

  /** Abre `fn` si tienes apodo; si no, pide el apodo primero. */
  function withNick(fn) {
    if (!needOnline()) return;
    if (G.Social.me) { fn(); return; }
    G.Social.start().then(r => { if (r === 'ok') fn(); else G.NickUI.open(fn); });
  }

  // ======================= AMIGOS =======================

  G.FriendsUI = (() => {
    function init() {
      $('fr-add').onsubmit = async e => {
        e.preventDefault();
        const name = $('fr-name').value;
        msg('');
        const r = await G.Social.request(name);
        msg(r.ok ? r.msg : r.error, !r.ok);
        if (r.ok) $('fr-name').value = '';
      };
      $('fr-room').onclick = () => G.LobbyUI.open();
      G.Social.on(() => { if (G.UI.isOpen('scr-friends')) render(); });
    }

    function msg(t, bad) {
      $('fr-msg').textContent = t || '';
      $('fr-msg').style.color = bad ? '#ffb0b8' : '';
      if (t) G.Audio.sfx(bad ? 'error' : 'confirm');
    }

    function open() {
      withNick(() => {
        G.UI.show('scr-friends', true); msg(''); render();
        G.Social.ensureFriends().then(() => G.Social.refreshPresence(true)).then(() => { if (G.UI.isOpen('scr-friends')) render(); });
      });
    }

    function render() {
      const room = G.Social.room;
      $('fr-me').innerHTML = 'Tu apodo: <b class="gold" translate="no">' + esc(G.Social.me ? G.Social.me.name : '') + '</b> · dáselo a tus amigos para que te añadan.';
      $('fr-room').classList.toggle('hidden', !room);
      const list = G.Social.friends.sort((a, b) => {
        const rank = f => f.status === 'in' ? 0 : f.status === 'ok' ? (f.online ? (f.play ? 2 : 1) : 3) : 4;
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
      const box = $('fr-list');
      box.innerHTML = '';
      if (!list.length) {
        box.innerHTML = '<p class="sub">Aún no tienes amigos añadidos. Escribe arriba el apodo de un amigo.</p>';
        return;
      }
      for (const f of list) {
        const el = document.createElement('div');
        el.className = 'fr-row';
        const dot = f.status !== 'ok' ? 'pend' : !f.online ? 'off' : f.play ? 'play' : 'on';
        const inRoom = room && room.members.some(m => m.uid === f.uid);
        el.innerHTML = `<i class="dot ${dot}"></i><b translate="no"><a href="#" class="plink" title="Ver su perfil">${esc(f.name)}</a></b><span class="st">${inRoom ? 'En tu sala' : stateText(f)}</span><span class="grow"></span>`;
        if (f.status === 'ok') el.querySelector('.plink').onclick = e => { e.preventDefault(); G.ProfileUI.show(f.uid); };
        else el.querySelector('.plink').onclick = e => e.preventDefault();
        const btn = (txt, cls, fn) => {
          const b = document.createElement('button');
          b.className = 'btn small ' + cls; b.textContent = txt; b.onclick = fn; el.appendChild(b); return b;
        };
        if (f.status === 'in') {
          btn('Aceptar', 'gold', async () => { const r = await G.Social.accept(f.uid); msg(r.ok ? r.msg : r.error, !r.ok); });
          btn('Rechazar', 'ghost', () => G.Social.remove(f.uid));
        } else if (f.status === 'out') {
          btn('Cancelar', 'ghost', () => G.Social.remove(f.uid));
        } else {
          if (!inRoom && (!room || room.isHost)) {
            btn('Invitar', 'gold', async () => {
              const r = await G.Social.invite(f.uid);
              msg(r.ok ? r.msg : r.error, !r.ok);
              if (r.ok) G.LobbyUI.open();
            });
          }
          btn('Quitar', 'ghost', () => { if (confirm('¿Quitar a ' + f.name + ' de tus amigos?')) G.Social.remove(f.uid); });
        }
        box.appendChild(el);
      }
    }

    return { init, open, render };
  })();

  // ======================= SALA =======================

  G.LobbyUI = (() => {
    let membersKey = '';

    function init() {
      $('lobby-leave').onclick = async () => {
        await G.Social.leaveRoom();
        G.Net.close();
        G.MenuUI.open();
      };
      $('lobby-menu').onclick = () => G.MenuUI.open();
      $('lobby-start').onclick = start;
      $('lobby-start').dataset.sfx = 'confirm';
      // Conecta / desconecta la red al entrar o salir de una sala.
      G.Social.on(what => {
        const room = G.Social.room;
        if (room) {
          G.Net.open(room.id, room.isHost, room.host);
          G.Net.syncMembers(room.members.map(m => m.uid));
        } else if (G.Net.open_) G.Net.close();
        if (what === 'room-closed') {
          G.UI.toast('La sala se ha cerrado', 2600);
          if (G.UI.isOpen('scr-lobby')) G.MenuUI.open();
        }
        if (G.UI.isOpen('scr-lobby')) render();
      });
      G.Net.onPeer(() => { if (G.UI.isOpen('scr-lobby')) render(); });
    }

    function open() {
      if (!G.Social.room) { G.MenuUI.open(); return; }
      G.Social.refreshMember();
      G.Social.ensureFriends().then(() => G.Social.refreshPresence(true)).then(() => { if (G.UI.isOpen('scr-lobby')) { membersKey = ''; render(); } });
      G.UI.show('scr-lobby', true);
      membersKey = '';
      render();
    }

    function close() { G.UI.hide('scr-lobby'); }

    function connText(m, room) {
      if (m.uid === room.host) return 'Anfitrión';
      if (!room.isHost) return m.uid === G.Social.uid ? 'Tú' : 'En la sala';
      const mode = G.Net.mode(m.uid);
      return mode === 'direct' ? (G.Net.viaTurn(m.uid) ? 'Conectado (por servidor)' : 'Conectado') : mode === 'relay' ? 'Conectado (por servidor)' : mode === 'failed' ? 'No se pudo conectar (reintentando…)' : 'Conectando…';
    }

    function render() {
      const room = G.Social.room;
      if (!room) return;
      const ms = room.members;
      const cap = room.cap || G.Coop.rulesFromSettings().cap;
      $('lobby-sub').textContent = room.isHost
        ? 'Eres el anfitrión. Invita a tus amigos (hasta ' + cap + ') y empezad cuando estéis.'
        : 'Estás en la sala de ' + ((ms.find(m => m.uid === room.host) || {}).name || '…') + '. El anfitrión empezará la partida.';
      const codeEl = $('lobby-code');
      if (codeEl) {
        codeEl.textContent = room.id;
        codeEl.onclick = () => {
          const t = room.id;
          const done = () => G.UI.toast('Código copiado');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(done);
          else done();
        };
      }

      // Las tarjetas sólo se rehacen si cambian los miembros (los sprites no parpadean).
      const key = cap + '|' + ms.map(m => m.uid + ':' + m.dex + ':' + (m.shiny ? 1 : 0)).join('|');
      const box = $('lobby-members');
      if (key !== membersKey) {
        membersKey = key;
        box.innerHTML = '';
        for (let i = 0; i < cap; i++) {
          const m = ms[i];
          const c = document.createElement('div');
          c.className = 'lob-card' + (m ? '' : ' empty');
          if (m) {
            c.style.setProperty('--pc', G.Coop.COLORS[i]);
            c.appendChild(G.UI.spriteCanvas(m.dex, 120, 96, { scale: 2, lively: true, shiny: !!m.shiny }));
            c.insertAdjacentHTML('beforeend', `<b translate="no">${esc(m.name)}</b><small>${esc((G.DEX_BY[m.dex] || {}).name || '')}</small><span class="conn" data-u="${m.uid}"></span>`);
          } else c.innerHTML = '<span>Libre</span>';
          box.appendChild(c);
        }
      }
      box.querySelectorAll('.conn').forEach(el => {
        const m = ms.find(x => x.uid === el.dataset.u);
        if (!m) return;
        const t = connText(m, room);
        el.textContent = t;
        el.className = 'conn' + (t === 'Conectando…' ? ' wait' : '');
      });

      // Invitar (sólo el anfitrión y si queda sitio).
      const canInvite = room.isHost && ms.length < cap;
      $('lobby-inv-title').classList.toggle('hidden', !canInvite);
      const inv = $('lobby-invite');
      inv.classList.toggle('hidden', !canInvite);
      if (canInvite) {
        inv.innerHTML = '';
        const free = G.Social.friends.filter(f => f.status === 'ok' && !ms.some(m => m.uid === f.uid));
        if (!free.length) inv.innerHTML = '<p class="sub" style="margin:0">Aún no tienes amigos añadidos.</p>';
        for (const f of free) {
          const el = document.createElement('div');
          el.className = 'fr-row';
          const dot = !f.online ? 'off' : f.play ? 'play' : 'on';
          el.innerHTML = `<i class="dot ${dot}"></i><b translate="no">${esc(f.name)}</b><span class="st">${stateText(f)}</span><span class="grow"></span>`;
          const b = document.createElement('button');
          b.className = 'btn small gold'; b.textContent = 'Invitar';
          b.onclick = async () => { const r = await G.Social.invite(f.uid); G.UI.toast(r.ok ? r.msg : r.error); };
          el.appendChild(b);
          inv.appendChild(el);
        }
      }

      const btn = $('lobby-start');
      btn.classList.toggle('hidden', !room.isHost);
      const connecting = ms.some(m => m.uid !== room.host && G.Net.mode(m.uid) === 'connecting');
      const failed = ms.some(m => m.uid !== room.host && G.Net.mode(m.uid) === 'failed');
      btn.disabled = !room.isHost || ms.length < 2 || connecting || failed;
      btn.textContent = 'Empezar partida (' + ms.length + '/' + cap + ')';
      const modeBox = $('lobby-mode');
      if (modeBox) {
        const picked = room.isHost ? (G.Settings.get('runMode') || 'normal') : ((room.rules && room.rules.runMode) || 'normal');
        const key = (room.isHost ? 'h:' : 'g:') + picked;
        if (modeBox.dataset.key !== key) {
          modeBox.dataset.key = key;
          modeBox.innerHTML = '<b>Modo</b><div class="chips"></div>';
          G.Modes.mount(modeBox.querySelector('.chips'), null, {
            mode: picked,
            editable: room.isHost,
            onPick(id) {
              G.Settings.set('runMode', id);
              modeBox.dataset.key = '';
              G.Social.pushRules();
            }
          });
        }
      }
      const rulesBox = $('lobby-rules');
      if (rulesBox) G.PartyUI.sync(rulesBox, {
        editable: room.isHost,
        liveN: ms.length,
        rules: room.isHost ? G.Coop.rulesFromSettings() : (room.rules || G.Coop.normalizeRules({ mode: 'auto', cap }))
      });
      $('lobby-note').textContent = !room.isHost ? 'Cuando el anfitrión empiece, entraréis todos a la vez.'
        : ms.length < 2 ? 'Necesitas al menos un amigo en la sala.'
        : failed ? 'No se puede conectar con algún amigo: su red (o la tuya) no deja jugar en grupo. Probad con otra wifi o datos móviles; se reintenta solo.'
        : connecting ? 'Conectando con tus amigos…' : 'La partida empieza para todos a la vez.';
    }

    function start() {
      const room = G.Social.room;
      if (!room || !room.isHost || room.members.length < 2) return;
      const rm = G.Settings.get('runMode') || 'normal';
      if (rm === 'siege' && room.members.length > 4) {
        G.UI.toast('El asedio es de 2 a 4.');
        return;
      }
      const cfg = {
        k: 'start', seed: Math.floor(Math.random() * 1e6), host: room.host,
        members: room.members.map(m => ({ uid: m.uid, name: m.name, dex: m.dex, shiny: !!m.shiny, mr: G.MasteryFX ? G.MasteryFX.valid(m.mr) : '' })),
        rules: G.Coop.publicRules(Object.assign({}, room.rules || G.Coop.rulesFromSettings(), { runMode: rm })),
        mode: rm
      };
      G.Social.setOpen(false);
      G.Net.broadcast(cfg);
      G.Flow.startCoop(cfg);
    }

    return { init, open, close, render };
  })();

  // ======================= INVITACIONES =======================

  G.InvitePop = (() => {
    let cur = null;

    function init() {
      $('inv-yes').onclick = async () => {
        if (!cur) return;
        const from = cur.from;
        hide();
        const r = await G.Social.acceptInvite(from);
        if (!r.ok) { G.UI.toast(r.error, 3000); return; }
        G.LobbyUI.open();
      };
      $('inv-no').onclick = () => { if (cur) G.Social.declineInvite(cur.from); hide(); };
      G.Social.on(what => { if (what === 'invites' || what === 'room') refresh(); });
    }

    function hide() { cur = null; $('invite-pop').classList.add('hidden'); }

    /** Enseña la invitación más antigua si estás en los menús (no en plena partida). */
    function refresh() {
      const room = G.Social.room;
      const list = G.Social.invites.filter(i => !room || i.room !== room.id).sort((a, b) => a.at - b.at);
      if (!list.length || G.Game.state !== 'ui' || !G.DB.loggedIn) { hide(); return; }
      if (cur && cur.from === list[0].from) return;
      cur = list[0];
      $('inv-text').innerHTML = `${G.Icons.html('friends', 22)} <b class="gold" translate="no">${esc(cur.name)}</b> te invita a jugar en su sala`;
      $('invite-pop').classList.remove('hidden');
      G.Audio.sfx('shiny');
    }

    return { init, refresh };
  })();

  G.PartyUI = (() => {
    const viewKey = new WeakMap();

    function liveRules(opt) { return G.Coop.normalizeRules(opt.rules || G.Coop.rulesFromSettings()); }

    function sentence(opt) {
      const rules = liveRules(opt);
      const p = G.Coop.preview(opt.liveN || 1, rules);
      return 'Con ' + p.n + ': aparecen ×' + G.Coop.fmtMul(p.rate) + ', vida ×' + G.Coop.fmtMul(p.hp) + ' y la experiencia se reparte entre ' + G.Coop.fmtMul(p.xp) + '. Jefes: ' + rules.bossN + '.';
    }

    function html(opt) {
      const rules = liveRules(opt);
      const dis = opt.editable ? '' : ' disabled';
      const mode = (id, label) => `<button type="button" class="chip ${rules.mode === id ? 'on' : ''}" data-mode="${id}"${dis}>${label}</button>`;
      const slider = (key, min, max, step, value) =>
        `<input class="rule-slider" data-rule="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"${dis}>`;
      let extra = '';
      if (rules.mode === 'count') {
        extra = `<div class="set-row"><div class="grow"><b>Número para la fórmula</b><small>Aunque seáis otros, la dificultad es la de este número.</small></div><span class="rule-val" data-for="n">${rules.n}</span></div>`
          + slider('n', 1, 10, 1, rules.n);
      } else if (rules.mode === 'custom') {
        extra = `<div class="set-row"><div class="grow"><b>Enemigos que aparecen</b><small>1 es como jugar solo.</small></div><span class="rule-val" data-for="rate">${G.Coop.fmtMul(rules.rate)}</span></div>`
          + slider('rate', 0.25, 12, 0.05, rules.rate)
          + `<div class="set-row"><div class="grow"><b>Vida de los enemigos</b><small>1 es como jugar solo.</small></div><span class="rule-val" data-for="hp">${G.Coop.fmtMul(rules.hp)}</span></div>`
          + slider('hp', 0.25, 8, 0.05, rules.hp)
          + `<div class="set-row"><div class="grow"><b>Experiencia repartida entre</b><small>1 no la reparte. Con 4 personas toca 2.8.</small></div><span class="rule-val" data-for="xp">${G.Coop.fmtMul(rules.xp)}</span></div>`
          + slider('xp', 0.25, 12, 0.05, rules.xp);
      }
      return `<h3 class="set-h">Sala y dificultad</h3>`
        + `<p class="sub">En automático manda cuántos estáis. Con 4: aparecen ×3.25, vida ×1.9 y la experiencia se reparte entre 2.8.</p>`
        + `<div class="set-row"><div class="grow"><b>Máximo en la sala</b><small>De 1 a 10 personas.</small></div><span class="rule-val" data-for="cap">${rules.cap}</span></div>`
        + slider('cap', 1, 10, 1, rules.cap)
        + `<div class="chips set-chips">${mode('auto', 'Automática')}${mode('count', 'Por número')}${mode('custom', 'A medida')}</div>`
        + extra
        + `<div class="set-row"><div class="grow"><b>Asaltos de jefe</b><small>Cuántos jefes salen. Lo normal son 5, uno cada 3 minutos. 0 no saca ninguno.</small></div><span class="rule-val" data-for="boss">${rules.bossN}</span></div>`
        + slider('boss', 0, 10, 1, rules.bossN)
        + `<p class="note" data-preview>${esc(sentence(opt))}</p>`;
    }

    function paint(el, opt) {
      const node = el.querySelector('[data-preview]');
      if (node) node.textContent = sentence(opt);
      const rules = liveRules(opt);
      el.querySelectorAll('[data-for]').forEach(s => {
        const k = s.dataset.for;
        const v = k === 'cap' ? rules.cap : k === 'n' ? rules.n : k === 'boss' ? rules.bossN : k === 'rate' ? rules.rate : k === 'hp' ? rules.hp : rules.xp;
        s.textContent = k === 'cap' || k === 'n' || k === 'boss' ? String(v) : G.Coop.fmtMul(v);
      });
    }

    function commit(key, raw, el, opt) {
      const room = G.Social.room;
      if (key === 'cap') {
        const cap = G.Coop.clampCap(raw);
        if (room && room.isHost && room.members.length > cap) {
          G.UI.toast('Ya sois más que ese máximo.');
          const input = el.querySelector('[data-rule="cap"]');
          if (input) input.value = G.Settings.get('partyCap');
          return;
        }
        G.Settings.set('partyCap', cap);
      } else if (key === 'n') G.Settings.set('diffN', G.Coop.clampCap(raw));
      else if (key === 'rate') G.Settings.set('diffRate', Math.round(+raw * 100) / 100);
      else if (key === 'hp') G.Settings.set('diffHp', Math.round(+raw * 100) / 100);
      else if (key === 'xp') G.Settings.set('diffXp', Math.round(+raw * 100) / 100);
      else if (key === 'boss') G.Settings.set('bossN', Math.min(10, Math.max(0, Math.round(+raw))));
      if (room && room.isHost) G.Social.pushRules();
      opt.rules = G.Coop.rulesFromSettings();
      paint(el, opt);
    }

    function wire(el, opt) {
      el.querySelectorAll('[data-mode]').forEach(b => {
        b.onclick = () => {
          if (!opt.editable) return;
          G.Settings.set('diffMode', b.dataset.mode);
          if (G.Social.room && G.Social.room.isHost) G.Social.pushRules();
          viewKey.delete(el);
          sync(el, Object.assign({}, opt, { rules: G.Coop.rulesFromSettings() }));
        };
      });
      el.querySelectorAll('[data-rule]').forEach(input => {
        const apply = () => commit(input.dataset.rule, input.value, el, opt);
        input.oninput = apply;
        input.onchange = apply;
      });
    }

    function sync(el, opt) {
      opt = opt || { editable: true, liveN: 1 };
      const rules = liveRules(opt);
      const key = (opt.editable ? 'e:' : 'v:') + rules.mode + ':' + (opt.editable ? '' : JSON.stringify(G.Coop.publicRules(rules)));
      if (viewKey.get(el) !== key || !el.childElementCount) {
        viewKey.set(el, key);
        el.innerHTML = html(Object.assign({}, opt, { rules }));
        wire(el, opt);
      }
      paint(el, Object.assign({}, opt, { rules }));
    }

    return { sync };
  })();

  G.SocialUI = {
    init() { G.NickUI.init(); G.FriendsUI.init(); G.LobbyUI.init(); G.InvitePop.init(); },
    withNick, needOnline
  };
})();
