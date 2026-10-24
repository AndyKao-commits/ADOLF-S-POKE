/* ============ watch.js — modo de prueba ?monitor ============
 * No cambia la partida. Sólo mira si la pantalla se queda parada o el estado
 * no coincide con lo que se ve. Se enciende con ?monitor en la dirección.
 */
G.Watch = (() => {
  const on = /[?&]monitor\b/.test(location.search);
  if (!on) return { on: false };

  const log = [];
  const MAX = 40;
  let lastBeat = performance.now();
  let lastState = '';
  let stateSince = performance.now();
  let warn = '';
  let warnSince = 0;

  function note(msg) {
    const row = { t: new Date().toISOString().slice(11, 19), msg };
    log.push(row);
    if (log.length > MAX) log.shift();
    if (warn !== msg) { warn = msg; warnSince = performance.now(); }
    console.warn('[monitor]', row.t, msg);
  }

  function beat() {
    lastBeat = performance.now();
    requestAnimationFrame(beat);
  }
  requestAnimationFrame(beat);

  function openScr() {
    return [...document.querySelectorAll('.scr:not(.hidden)')].map(el => el.id).filter(Boolean);
  }
  function has(id) {
    const el = document.getElementById(id);
    return !!(el && !el.classList.contains('hidden'));
  }

  function tick() {
    const now = performance.now();
    const gap = document.hidden ? 0 : (now - lastBeat) / 1000;
    const st = (G.Game && G.Game.state) || '—';
    if (st !== lastState) { lastState = st; stateSince = now; }
    const age = (now - stateSince) / 1000;
    const open = openScr();
    const pl = G.Game && G.Game.player;
    let problem = '';
    if (gap > 2.5) problem = '畫面停住 ' + gap.toFixed(1) + ' 秒';
    else if (st === 'levelup' && !has('scr-levelup') && age > 2) problem = '狀態停在選卡，可是選卡畫面沒有打開';
    else if (st === 'levelup' && age > 30) problem = '選卡超過 30 秒';
    else if (st === 'choice' && !has('scr-item') && !has('scr-bond') && !has('scr-stall') && age > 2) problem = '狀態停在選擇，可是沒有選擇畫面';
    else if (st === 'stall' && !has('scr-stall') && age > 2) problem = '狀態停在商店，可是商店沒有打開';
    else if (st === 'playing' && ['scr-levelup', 'scr-item', 'scr-stall', 'scr-bond'].some(has) && age > 2) problem = '對局在走，但是選單蓋在上面';
    else if (st === 'playing' && pl && pl.frozen && age > 8) problem = '對局在走，人物卻不能動';
    else if ((st === 'held' || st === 'paused') && age > 90) problem = '暫停或等待超過 90 秒';
    if (problem && problem !== warn) note(st + ' · ' + problem);
    if (!problem) warn = '';
    const box = document.getElementById('watch-box');
    if (!box) return;
    box.classList.toggle('bad', !!problem);
    box.querySelector('[data-st]').textContent = st + ' · ' + age.toFixed(0) + 's';
    box.querySelector('[data-op]').textContent = open.length ? open.join(' ') : '沒有蓋住的畫面';
    box.querySelector('[data-w]').textContent = problem || (log.length ? log[log.length - 1].msg : '目前沒有卡住');
  }

  function mount() {
    const el = document.createElement('div');
    el.id = 'watch-box';
    el.setAttribute('translate', 'no');
    el.innerHTML = '<b>監控</b> <span data-st></span><div data-op></div><div data-w></div><button type="button" data-copy>複製紀錄</button>';
    el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:90;max-width:280px;padding:8px 10px;background:rgba(8,12,24,.88);color:#f4f8ff;border:1px solid #7aa2ff;border-radius:8px;font:12px/1.35 sans-serif;pointer-events:auto';
    const btn = el.querySelector('[data-copy]');
    btn.style.cssText = 'margin-top:6px';
    btn.onclick = () => {
      const text = log.map(r => r.t + ' ' + r.msg).join('\n') || '沒有紀錄';
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
      btn.textContent = '已複製';
    };
    document.body.appendChild(el);
    setInterval(tick, 500);
    note('監控開始');
  }
  if (document.body) mount();
  else addEventListener('DOMContentLoaded', mount);

  return { on: true, log };
})();
