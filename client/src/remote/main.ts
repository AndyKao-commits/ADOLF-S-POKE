import '../styles/remote.css';
import { getSocket, onRoomState } from '../shared/socket';
import { randomGuestName } from '../shared/format';
import {
  estimateSpeedMsPerChar,
  getActiveLyrics,
  renderHighlightedLine,
} from '../shared/lyricsEngine';
import type { QueueSong, RoomState, SearchResult, VocalMode } from '../shared/types';

const socket = getSocket();
const params = new URLSearchParams(location.search);
const presetRoom = params.get('room') || params.get('pin') || '';

const els = {
  joinView: document.querySelector('#join-view') as HTMLElement,
  appView: document.querySelector('#app-view') as HTMLElement,
  roomInput: document.querySelector('#room-input') as HTMLInputElement,
  nameInput: document.querySelector('#name-input') as HTMLInputElement,
  joinBtn: document.querySelector('#join-btn') as HTMLButtonElement,
  scanBtn: document.querySelector('#scan-btn') as HTMLButtonElement,
  roomChip: document.querySelector('#room-chip') as HTMLElement,
  searchInput: document.querySelector('#search-input') as HTMLInputElement,
  searchBtn: document.querySelector('#search-btn') as HTMLButtonElement,
  results: document.querySelector('#results') as HTMLElement,
  queue: document.querySelector('#queue') as HTMLElement,
  played: document.querySelector('#played') as HTMLElement,
  toast: document.querySelector('#toast') as HTMLElement,
  tabs: [...document.querySelectorAll<HTMLButtonElement>('.tabs button')],
  panels: {
    search: document.querySelector('#panel-search') as HTMLElement,
    queue: document.querySelector('#panel-queue') as HTMLElement,
    played: document.querySelector('#panel-played') as HTMLElement,
    controls: document.querySelector('#panel-controls') as HTMLElement,
  },
  karaokeToggle: document.querySelector('#karaoke-toggle') as HTMLButtonElement,
  lyricsCurrent: document.querySelector('#lyrics-current') as HTMLElement,
  lyricsNext: document.querySelector('#lyrics-next') as HTMLElement,
  lyricsEnabled: document.querySelector('#lyrics-enabled') as HTMLButtonElement,
  offsetLabel: document.querySelector('#offset-label') as HTMLElement,
  dock: document.querySelector('#dock-lyrics') as HTMLElement,
  dockLine: document.querySelector('#dock-line') as HTMLElement,
  volume: document.querySelector('#volume') as HTMLInputElement,
  keywordRow: document.querySelector('#keyword-row') as HTMLElement,
  vocalEnabled: document.querySelector('#vocal-enabled') as HTMLButtonElement,
  vocalStrength: document.querySelector('#vocal-strength') as HTMLInputElement,
  vocalStrengthLabel: document.querySelector('#vocal-strength-label') as HTMLElement,
};

let state: RoomState | null = null;
let karaoke = true;
let activeTab: keyof typeof els.panels = 'search';
let speedMs = 180;
let lastPos = 0;
let toastTimer = 0;

const KEYWORDS = ['伴奏', 'KTV', 'karaoke', '左伴右唱'];

function toast(msg: string) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 1800);
}

function showApp() {
  els.joinView.classList.add('hidden');
  els.appView.classList.remove('hidden');
  els.dock.classList.remove('hidden');
}

function setTab(tab: keyof typeof els.panels) {
  activeTab = tab;
  for (const btn of els.tabs) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  }
  for (const [key, panel] of Object.entries(els.panels)) {
    panel.classList.toggle('hidden', key !== tab);
  }
}

function renderKeywords() {
  els.keywordRow.innerHTML = KEYWORDS.map(
    (k) => `<button type="button" data-kw="${k}">+ ${k}</button>`,
  ).join('');
  els.keywordRow.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kw = btn.getAttribute('data-kw') || '';
      const cur = els.searchInput.value.trim();
      if (!cur.includes(kw)) els.searchInput.value = `${cur} ${kw}`.trim();
      els.searchInput.focus();
    });
  });
}

async function search() {
  const q = els.searchInput.value.trim();
  if (!q) return;
  els.results.innerHTML = `<p class="muted">搜尋中…</p>`;
  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(q)}&karaoke=${karaoke ? '1' : '0'}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '搜尋失敗');
    const list: SearchResult[] = data.results || [];
    if (!list.length) {
      els.results.innerHTML = `<p class="muted">找不到歌曲，換個關鍵字試試</p>`;
      return;
    }
    els.results.innerHTML = `<ul class="result-list">${list
      .map(
        (item) => `<li>
          <img src="${item.thumbnail}" alt="" loading="lazy" />
          <div class="item-main">
            <div class="t">${escapeHtml(item.title)}</div>
            <div class="s">${escapeHtml(item.channel || '')}${item.duration ? ` · ${item.duration}` : ''}</div>
            <div class="item-actions">
              <button data-add="${item.videoId}" class="accent">點歌</button>
              <button data-insert="${item.videoId}" class="warn">插播</button>
            </div>
          </div>
        </li>`,
      )
      .join('')}</ul>`;

    const byId = new Map(list.map((x) => [x.videoId, x]));

    els.results.querySelectorAll('button[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-add')!;
        const song = byId.get(id);
        if (song) addSong(song, false);
      });
    });
    els.results.querySelectorAll('button[data-insert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-insert')!;
        const song = byId.get(id);
        if (song) addSong(song, true);
      });
    });
  } catch (err) {
    els.results.innerHTML = `<p class="muted">${escapeHtml(String((err as Error).message || err))}</p>`;
  }
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function addSong(song: SearchResult, insertNext: boolean) {
  socket.emit(
    'queue:add',
    {
      insertNext,
      song: {
        videoId: song.videoId,
        title: song.title,
        channel: song.channel,
        thumbnail: song.thumbnail,
      },
    },
    (res: { ok: boolean; error?: string }) => {
      if (!res.ok) toast(res.error || '點歌失敗');
      else toast(insertNext ? '已插播' : '已加入待播');
    },
  );
}

function renderQueueLists(s: RoomState) {
  const queued = s.queue
    .filter((q) => q.status === 'queued' || q.status === 'playing')
    .sort((a, b) => {
      if (a.status === 'playing' && b.status !== 'playing') return -1;
      if (b.status === 'playing' && a.status !== 'playing') return 1;
      return a.sortOrder - b.sortOrder;
    });
  const played = s.queue
    .filter((q) => q.status === 'played')
    .sort((a, b) => b.createdAt - a.createdAt);

  els.queue.innerHTML = queued.length
    ? `<ul class="song-list">${queued.map((song) => songRow(song, 'queue')).join('')}</ul>`
    : `<p class="muted">待播清單是空的</p>`;

  els.played.innerHTML = played.length
    ? `<ul class="song-list">${played.map((song) => songRow(song, 'played')).join('')}</ul>`
    : `<p class="muted">還沒有已唱歌曲</p>`;

  bindSongActions(els.queue, 'queue');
  bindSongActions(els.played, 'played');
}

function songRow(song: QueueSong, mode: 'queue' | 'played') {
  const actions =
    mode === 'queue'
      ? song.status === 'playing'
        ? `<span class="s">播放中</span>`
        : `<div class="item-actions">
            <button data-top="${song.id}">置頂</button>
            <button data-remove="${song.id}" class="danger">刪除</button>
          </div>`
      : `<div class="item-actions"><button data-again="${song.id}" class="accent">再唱</button></div>`;

  return `<li>
    <img src="${song.thumbnail}" alt="" />
    <div class="item-main">
      <div class="t">${escapeHtml(song.title)}</div>
      <div class="s">${escapeHtml(song.requestedBy)}${song.status === 'playing' ? ' · 播放中' : ''}</div>
      ${actions}
    </div>
  </li>`;
}

function bindSongActions(root: HTMLElement, mode: 'queue' | 'played') {
  if (mode === 'queue') {
    root.querySelectorAll('button[data-top]').forEach((btn) => {
      btn.addEventListener('click', () => {
        socket.emit('queue:move', { songId: btn.getAttribute('data-top'), position: 'top' });
        toast('已置頂');
      });
    });
    root.querySelectorAll('button[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        socket.emit('queue:remove', { songId: btn.getAttribute('data-remove') });
        toast('已刪除');
      });
    });
  } else {
    root.querySelectorAll('button[data-again]').forEach((btn) => {
      btn.addEventListener('click', () => {
        socket.emit('queue:requeue', { songId: btn.getAttribute('data-again') });
        toast('已加入待播');
        setTab('queue');
      });
    });
  }
}

function control(action: string, value?: number) {
  socket.emit('player:control', { action, value });
}

function renderVocalControls(s: RoomState) {
  const vr = s.vocalRemove || { enabled: false, mode: 'adaptive' as VocalMode, strength: 1 };
  els.vocalEnabled.textContent = vr.enabled ? '開啟' : '關閉';
  els.vocalEnabled.classList.toggle('accent', vr.enabled);
  els.vocalStrength.value = String(Math.round((vr.strength ?? 1) * 100));
  els.vocalStrengthLabel.textContent = `${els.vocalStrength.value}%`;
  document.querySelectorAll<HTMLButtonElement>('[data-vocal-mode]').forEach((btn) => {
    const mode = btn.dataset.vocalMode;
    btn.classList.toggle('accent', mode === vr.mode);
    btn.classList.toggle('ghost', mode !== vr.mode);
  });
}

function applyState(s: RoomState) {
  state = s;
  els.roomChip.textContent = `包廂 ${s.code}`;
  renderQueueLists(s);
  speedMs = estimateSpeedMsPerChar(s.lyrics.lines || []);
  els.offsetLabel.textContent = `${(s.lyrics.offsetMs / 1000).toFixed(1)}s`;
  els.lyricsEnabled.textContent = s.lyrics.enabled ? '字幕：開' : '字幕：關';
  els.volume.value = String(s.playback.volume ?? 80);
  lastPos = s.playback.position || lastPos;
  renderVocalControls(s);
  paintLyrics();
}

function paintLyrics() {
  if (!state) return;
  const active = getActiveLyrics(
    state.lyrics.lines || [],
    lastPos,
    state.lyrics.offsetMs || 0,
    speedMs,
  );
  const html = renderHighlightedLine(active) || '<span class="muted">尚無同步歌詞</span>';
  els.lyricsCurrent.innerHTML = html;
  els.lyricsNext.textContent = active.next?.text || '';
  els.dockLine.innerHTML = renderHighlightedLine(active) || '♪ 等待歌詞';
  els.dock.style.opacity = state.lyrics.enabled ? '1' : '0.35';
}

function join(code: string) {
  const name = els.nameInput.value.trim() || localStorage.getItem('homektv.name') || '訪客';
  localStorage.setItem('homektv.name', name);
  socket.emit('remote:join', { code, name }, (res: { ok: boolean; state?: RoomState; error?: string }) => {
    if (!res.ok || !res.state) {
      toast(res.error || '加入失敗');
      return;
    }
    showApp();
    applyState(res.state);
    const url = new URL(location.href);
    url.searchParams.set('room', res.state.code);
    history.replaceState(null, '', url);
  });
}

function boot() {
  renderKeywords();
  if (presetRoom) els.roomInput.value = presetRoom;
  if (!els.nameInput.value) {
    els.nameInput.value = localStorage.getItem('homektv.name') || randomGuestName();
  }

  els.joinBtn.addEventListener('click', () => join(els.roomInput.value.trim()));
  els.roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') join(els.roomInput.value.trim());
  });

  els.scanBtn.addEventListener('click', async () => {
    // Prefer BarcodeDetector when available; fallback to prompt paste
    const BD = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (s: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!BD) {
      const pasted = prompt('請貼上 QR 內容或包廂網址');
      if (!pasted) return;
      const m = pasted.match(/room=(\d{4})/i) || pasted.match(/\b(\d{4})\b/);
      if (m) {
        els.roomInput.value = m[1];
        join(m[1]);
      } else toast('無法辨識包廂號碼');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new BD({ formats: ['qr_code'] });
      toast('對準電視上的 QR Code…');
      const timer = window.setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue || '';
          const m = raw.match(/room=(\d{4})/i) || raw.match(/\b(\d{4})\b/);
          if (m) {
            window.clearInterval(timer);
            stream.getTracks().forEach((t) => t.stop());
            els.roomInput.value = m[1];
            join(m[1]);
          }
        } catch {
          /* keep scanning */
        }
      }, 500);
      window.setTimeout(() => {
        window.clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
      }, 15000);
    } catch {
      toast('無法開啟相機，請改輸入包廂號');
    }
  });

  els.tabs.forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab as keyof typeof els.panels));
  });

  els.searchBtn.addEventListener('click', () => void search());
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void search();
  });

  els.karaokeToggle.addEventListener('click', () => {
    karaoke = !karaoke;
    els.karaokeToggle.classList.toggle('on', karaoke);
    els.karaokeToggle.textContent = karaoke ? '卡拉OK 關鍵字：開' : '卡拉OK 關鍵字：關';
  });
  els.karaokeToggle.classList.add('on');

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action!;
      if (action === 'seek') control('seek', Number(btn.dataset.value));
      else control(action);
    });
  });

  els.volume.addEventListener('input', () => {
    control('volume', Number(els.volume.value));
  });

  els.lyricsEnabled.addEventListener('click', () => {
    if (!state) return;
    socket.emit('lyrics:set', { enabled: !state.lyrics.enabled });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-offset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      socket.emit('lyrics:offset', { deltaMs: Number(btn.dataset.offset) });
    });
  });

  els.vocalEnabled.addEventListener('click', () => {
    if (!state) return;
    socket.emit('vocal:set', { enabled: !state.vocalRemove?.enabled });
    toast(!state.vocalRemove?.enabled ? '人聲消除已開啟' : '人聲消除已關閉');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-vocal-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.vocalMode as VocalMode;
      socket.emit('vocal:set', { mode });
      toast(
        mode === 'classic' ? '一般中置消除' : mode === 'hq' ? '高品質模式' : '自適應模式',
      );
    });
  });

  els.vocalStrength.addEventListener('input', () => {
    const strength = Number(els.vocalStrength.value) / 100;
    els.vocalStrengthLabel.textContent = `${els.vocalStrength.value}%`;
    socket.emit('vocal:set', { strength });
  });

  onRoomState(applyState);
  socket.on('playback:update', (playback: RoomState['playback']) => {
    if (!state) return;
    state = { ...state, playback };
    lastPos = playback.position || lastPos;
    els.volume.value = String(playback.volume ?? els.volume.value);
    paintLyrics();
  });

  window.setInterval(() => {
    if (!state?.playback.playing) {
      paintLyrics();
      return;
    }
    // Local extrapolation between server ticks
    lastPos += 0.2;
    paintLyrics();
  }, 200);

  if (presetRoom && /^\d{4}$/.test(presetRoom)) {
    join(presetRoom);
  }
}

boot();
