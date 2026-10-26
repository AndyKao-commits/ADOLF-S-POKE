/* 時間測試：只有網址帶 ?clock 才出現。快轉走遊戲自己的時間，波次和頭目會跟著發生。 */
G.ClockLab = (() => {
  const on = /(?:\?|&)clock(?:=|&|$)/.test(location.search);
  if (!on) return {};

  const panel = document.createElement('aside');
  panel.id = 'clock-lab';
  panel.setAttribute('translate', 'no');
  panel.innerHTML = `
    <b>時間測試</b>
    <p id="clock-lab-now">尚未進對局</p>
    <div class="clock-lab-row">
      <button type="button" data-sec="30">+30 秒</button>
      <button type="button" data-sec="60">+1 分鐘</button>
      <button type="button" data-sec="300">+5 分鐘</button>
      <button type="button" data-sec="600">+10 分鐘</button>
    </div>
    <div class="clock-lab-row">
      <button type="button" data-next="1">下一個時間點</button>
      <button type="button" data-speed="1">速度 1x</button>
    </div>
    <p id="clock-lab-note">快轉時你不會受傷。小怪會換成那個時間的怪，頭目會留下。用過之後，這一局不會進排行榜。</p>
  `;
  const css = document.createElement('style');
  css.textContent = `
    #clock-lab { position: fixed; z-index: 80; left: 12px; top: 12px; width: min(360px, calc(100vw - 24px));
      padding: 10px 12px; border-radius: 12px; background: rgba(8, 16, 32, .88); color: #f4f8ff;
      border: 1px solid rgba(159, 212, 255, .45); font: 600 13px/1.4 "Segoe UI", sans-serif; pointer-events: auto; }
    #clock-lab b { display: block; margin-bottom: 4px; color: #ffd23f; }
    #clock-lab p { margin: 4px 0; color: #d5e6ff; }
    #clock-lab-note { color: #9fb4d4; font-size: 12px; font-weight: 500; }
    .clock-lab-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
    #clock-lab button { border: 0; border-radius: 8px; padding: 6px 8px; background: #1d4e89; color: #fff; font: inherit; cursor: pointer; }
    #clock-lab button:active { transform: translateY(1px); }
  `;
  document.head.appendChild(css);
  const mount = () => document.body.appendChild(panel);
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);

  let speed = 1;
  const nowEl = () => document.getElementById('clock-lab-now');
  const speedBtn = () => panel.querySelector('[data-speed]');

  function clockText() {
    const g = G.Game;
    if (!g || g.state === 'ui' || !g.player) return '尚未進對局。開始後就能快轉。';
    const t = g.st.time || 0;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    let extra = '';
    if (G.Endless && G.Endless.on && G.Endless.on()) extra = ' · 無盡第 ' + G.Endless.waveOf(t) + ' 波';
    else if (G.Castle && G.Castle.up) extra = ' · 城堡第 ' + (G.Castle.wave || '?') + ' 波';
    else if (G.Spawner && G.Spawner.nextBossIn) {
      const left = G.Spawner.nextBossIn(t);
      if (left != null) extra = ' · 下一個頭目 ' + Math.ceil(left) + ' 秒';
      else if (G.EnemyMgr && G.EnemyMgr.bossAlive && G.EnemyMgr.bossAlive()) extra = ' · 頭目還在場上';
    }
    const paused = g.state !== 'playing' ? ' · 先處理畫面上的選擇' : '';
    return '現在 ' + mm + ':' + ss + extra + paused;
  }

  function nextJump() {
    const g = G.Game;
    const t = g.st.time || 0;
    if (G.Endless && G.Endless.on && G.Endless.on()) {
      const step = 150;
      return Math.max(1, Math.ceil((t + 0.1) / step) * step - t + 0.4);
    }
    if (G.Spawner && G.Spawner.nextBossIn) {
      const left = G.Spawner.nextBossIn(t);
      if (left != null) return Math.max(1, left + 0.3);
    }
    return 60;
  }

  panel.addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    if (!btn || !G.Game || !G.Game.debugSkip) return;
    if (btn.dataset.sec) G.Game.debugSkip(+btn.dataset.sec);
    else if (btn.dataset.next) G.Game.debugSkip(nextJump());
    else if (btn.dataset.speed) {
      speed = speed === 1 ? 4 : speed === 4 ? 8 : 1;
      G.Game.debugSpeed(speed);
      btn.textContent = '速度 ' + speed + 'x';
    }
    const box = nowEl();
    if (box) box.textContent = clockText();
  });

  setInterval(() => {
    const box = nowEl();
    if (box) box.textContent = clockText();
    const b = speedBtn();
    if (b && G.Game && G.Game.state === 'ui') { speed = 1; b.textContent = '速度 1x'; }
  }, 250);

  return { on: true };
})();
