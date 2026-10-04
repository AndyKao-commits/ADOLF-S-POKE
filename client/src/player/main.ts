import '../styles/player.css';
import { getSocket, onRoomState } from '../shared/socket';
import { qrImageUrl, remoteJoinUrl, shortTitle } from '../shared/format';
import {
  estimateSpeedMsPerChar,
  getActiveLyrics,
  renderHighlightedLine,
} from '../shared/lyricsEngine';
import type { LyricLine, QueueSong, RoomState, VocalMode } from '../shared/types';
import { createPlayer, type YtPlayer } from './youtubePlayer';
import { VocalRemover } from './vocalRemover';

const socket = getSocket();
const els = {
  roomCode: document.querySelector('#room-code') as HTMLElement,
  qr: document.querySelector('#qr-img') as HTMLImageElement,
  joinHint: document.querySelector('#join-hint') as HTMLElement,
  remoteCount: document.querySelector('#remote-count') as HTMLElement,
  nowTitle: document.querySelector('#now-title') as HTMLElement,
  nowMeta: document.querySelector('#now-meta') as HTMLElement,
  queueList: document.querySelector('#queue-list') as HTMLElement,
  idle: document.querySelector('#idle-hero') as HTMLElement,
  lyricsCurrent: document.querySelector('#lyrics-current') as HTMLElement,
  lyricsNext: document.querySelector('#lyrics-next') as HTMLElement,
  lyricsOverlay: document.querySelector('#lyrics-overlay') as HTMLElement,
  vocalStatus: document.querySelector('#vocal-status') as HTMLElement,
  audioEl: document.querySelector('#vocal-audio') as HTMLAudioElement,
};

let state: RoomState | null = null;
let player: YtPlayer | null = null;
let currentVideoId: string | null = null;
let speedMs = 180;
let lyricsLines: LyricLine[] = [];
let tickTimer = 0;
let lastLyricIndex = -1;
let hasReachedPlaying = false;
let errorSkipTimer = 0;
let vocalActive = false;
let vocalLoading = false;
const vocalRemover = new VocalRemover();

function savedRoom(): string | null {
  return localStorage.getItem('homektv.playerRoom');
}

function saveRoom(code: string) {
  localStorage.setItem('homektv.playerRoom', code);
}

function vocalWanted(s: RoomState | null = state) {
  return Boolean(s?.vocalRemove?.enabled);
}

async function renderRoomChrome(s: RoomState) {
  els.roomCode.textContent = s.code;
  const url = await remoteJoinUrl(s.code);
  els.qr.src = qrImageUrl(url);
  els.qr.alt = `包廂 ${s.code} QR Code`;
  els.joinHint.textContent = url.replace(/^https?:\/\//, '');
  els.remoteCount.textContent = `${s.remoteCount} 支手機已連線`;
  renderVocalStatus(s);
}

function renderVocalStatus(s: RoomState) {
  if (!els.vocalStatus) return;
  if (!s.vocalRemove?.enabled) {
    els.vocalStatus.textContent = '人聲消除：關';
    els.vocalStatus.classList.remove('on');
    return;
  }
  const modeLabel =
    s.vocalRemove.mode === 'classic'
      ? '一般中置消除'
      : s.vocalRemove.mode === 'hq'
        ? '高品質'
        : '自適應';
  els.vocalStatus.textContent = vocalActive
    ? `人聲消除：${modeLabel} · ${Math.round((s.vocalRemove.strength || 0) * 100)}%`
    : vocalLoading
      ? '人聲消除：準備音軌中…'
      : `人聲消除：${modeLabel}（待套用）`;
  els.vocalStatus.classList.add('on');
}

function pendingSongs(s: RoomState): QueueSong[] {
  return s.queue
    .filter((q) => q.status === 'queued' || q.status === 'playing')
    .sort((a, b) => {
      if (a.status === 'playing' && b.status !== 'playing') return -1;
      if (b.status === 'playing' && a.status !== 'playing') return 1;
      return a.sortOrder - b.sortOrder;
    });
}

function renderQueue(s: RoomState) {
  const songs = pendingSongs(s);
  const recentPlayed = s.queue
    .filter((q) => q.status === 'played')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);

  if (!songs.length && !recentPlayed.length) {
    els.queueList.innerHTML = `<div class="empty-queue">還沒有歌 — 請用手機掃碼點歌</div>`;
    return;
  }

  const pendingHtml = songs.length
    ? `<ul class="queue-list">${songs
        .map(
          (song, i) => `<li class="${song.status === 'playing' ? 'playing' : ''}">
        <img src="${song.thumbnail}" alt="" />
        <div>
          <div class="t">${i + 1}. ${escapeHtml(shortTitle(song.title, 40))}</div>
          <div class="s">${song.status === 'playing' ? '播放中 · ' : ''}${escapeHtml(song.requestedBy)}</div>
        </div>
      </li>`,
        )
        .join('')}</ul>`
    : `<div class="empty-queue">待播已空</div>`;

  const playedHtml = recentPlayed.length
    ? `<div class="label" style="margin:0.75rem 0 0.35rem">剛才唱過</div>
      <ul class="queue-list">${recentPlayed
        .map(
          (song) => `<li>
        <img src="${song.thumbnail}" alt="" />
        <div>
          <div class="t">${escapeHtml(shortTitle(song.title, 40))}</div>
          <div class="s">${escapeHtml(song.requestedBy)}</div>
        </div>
      </li>`,
        )
        .join('')}</ul>`
    : '';

  els.queueList.innerHTML = `${pendingHtml}${playedHtml}`;
}

function escapeHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function currentSong(s: RoomState): QueueSong | null {
  return s.queue.find((q) => q.status === 'playing') || null;
}

function nextQueued(s: RoomState): QueueSong | null {
  return (
    s.queue
      .filter((q) => q.status === 'queued')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0] || null
  );
}

function skipCurrent(reason: string) {
  const cur = state && currentSong(state);
  if (cur) socket.emit('queue:ended', { songId: cur.id, reason });
  playNext();
}

async function ensurePlayer() {
  if (player) return player;
  player = await createPlayer('yt-host', {
    onStateChange: (st) => {
      if (!state || !player) return;
      if (vocalActive) return; // clock driven by processed audio
      const playing = st === window.YT!.PlayerState.PLAYING;
      const ended = st === window.YT!.PlayerState.ENDED;
      if (playing) {
        hasReachedPlaying = true;
        window.clearTimeout(errorSkipTimer);
      }
      emitPlayback(playing);
      if (ended) skipCurrent('ended');
    },
    onError: () => {
      if (vocalActive) return;
      window.clearTimeout(errorSkipTimer);
      errorSkipTimer = window.setTimeout(() => {
        if (!hasReachedPlaying) {
          els.nowMeta.textContent = '此影片目前無法嵌入播放，已跳過';
        }
        skipCurrent('error');
      }, hasReachedPlaying ? 800 : 4500);
    },
  });
  return player;
}

function emitPlayback(playing: boolean) {
  if (!state) return;
  socket.emit('playback:update', {
    playing,
    position: safeTime(),
    duration: safeDuration(),
    volume: vocalActive ? Math.round((state.playback.volume ?? 80)) : player?.getVolume?.() ?? 80,
    muted: vocalActive ? false : Boolean(player?.isMuted?.()),
    currentId: state.playback.currentId,
  });
}

function safeTime() {
  if (vocalActive && els.audioEl && !Number.isNaN(els.audioEl.currentTime)) {
    return els.audioEl.currentTime;
  }
  try {
    return player?.getCurrentTime() || 0;
  } catch {
    return 0;
  }
}

function safeDuration() {
  if (vocalActive && els.audioEl && Number.isFinite(els.audioEl.duration)) {
    return els.audioEl.duration;
  }
  try {
    return player?.getDuration() || 0;
  } catch {
    return 0;
  }
}

async function loadLyricsFor(song: QueueSong) {
  const trackKey = `${song.videoId}:${song.title}`;
  if (state?.lyrics.trackKey === trackKey && state.lyrics.lines.length) {
    lyricsLines = state.lyrics.lines;
    speedMs = estimateSpeedMsPerChar(lyricsLines);
    return;
  }
  try {
    const duration = safeDuration() || undefined;
    const res = await fetch(
      `/api/lyrics?title=${encodeURIComponent(song.title)}&channel=${encodeURIComponent(song.channel)}&duration=${duration || ''}`,
    );
    const data = await res.json();
    lyricsLines = data.lines || [];
    speedMs = estimateSpeedMsPerChar(lyricsLines);
    socket.emit('lyrics:set', {
      trackKey,
      lines: lyricsLines,
      source: data.source,
      enabled: state?.lyrics.enabled ?? true,
      offsetMs: state?.lyrics.offsetMs ?? 0,
    });
  } catch {
    lyricsLines = [];
  }
}

async function stopVocalAudio() {
  vocalActive = false;
  vocalLoading = false;
  try {
    els.audioEl.pause();
    els.audioEl.removeAttribute('src');
    els.audioEl.load();
  } catch {
    /* ignore */
  }
  await vocalRemover.dispose();
}

async function enableVocalFor(videoId: string) {
  if (!state) return false;
  vocalLoading = true;
  renderVocalStatus(state);
  try {
    const meta = await fetch(`/api/audio/${encodeURIComponent(videoId)}`);
    const data = await meta.json();
    if (!meta.ok || !data.ok) throw new Error(data.error || '音訊不可用');

    await vocalRemover.dispose();
    els.audioEl.crossOrigin = 'anonymous';
    els.audioEl.src = data.url;
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('音訊載入失敗'));
      };
      const cleanup = () => {
        els.audioEl.removeEventListener('canplay', onReady);
        els.audioEl.removeEventListener('error', onErr);
      };
      els.audioEl.addEventListener('canplay', onReady, { once: true });
      els.audioEl.addEventListener('error', onErr, { once: true });
      els.audioEl.load();
    });

    await vocalRemover.attach(els.audioEl);
    vocalRemover.setMode((state.vocalRemove.mode || 'adaptive') as VocalMode);
    vocalRemover.setStrength(state.vocalRemove.strength ?? 1);
    vocalRemover.setEnabled(true);
    vocalRemover.setMasterGain((state.playback.volume ?? 80) / 100);
    await vocalRemover.resume();

    // Video from YouTube (muted), audio from processed track
    if (player) {
      try {
        player.mute();
        player.setVolume(0);
      } catch {
        /* ignore */
      }
    }
    els.audioEl.currentTime = 0;
    await els.audioEl.play();
    vocalActive = true;
    vocalLoading = false;
    hasReachedPlaying = true;
    window.clearTimeout(errorSkipTimer);
    renderVocalStatus(state);
    return true;
  } catch (err) {
    console.warn('vocal remove fallback', err);
    vocalLoading = false;
    vocalActive = false;
    await stopVocalAudio();
    if (state) {
      els.nowMeta.textContent = '人聲消除音軌取得失敗，改播原聲';
      renderVocalStatus(state);
    }
    return false;
  }
}

async function applyVocalModeForCurrent() {
  if (!state || !currentVideoId) return;
  if (!vocalWanted()) {
    if (vocalActive) {
      const t = safeTime();
      await stopVocalAudio();
      if (player) {
        try {
          player.unMute();
          player.setVolume(state.playback.volume ?? 80);
          player.seekTo(t, true);
          player.playVideo();
        } catch {
          /* ignore */
        }
      }
    }
    renderVocalStatus(state);
    return;
  }

  // Update live params if already active on same track
  if (vocalActive) {
    vocalRemover.setMode((state.vocalRemove.mode || 'adaptive') as VocalMode);
    vocalRemover.setStrength(state.vocalRemove.strength ?? 1);
    vocalRemover.setEnabled(true);
    renderVocalStatus(state);
    return;
  }

  const ok = await enableVocalFor(currentVideoId);
  if (!ok && player) {
    try {
      player.unMute();
      player.setVolume(state.playback.volume ?? 80);
      player.playVideo();
    } catch {
      /* ignore */
    }
  }
}

async function playSong(song: QueueSong) {
  els.idle.classList.add('hidden');
  hasReachedPlaying = false;
  window.clearTimeout(errorSkipTimer);
  await stopVocalAudio();
  const yt = await ensurePlayer();
  socket.emit('queue:playing', { songId: song.id });
  if (currentVideoId !== song.videoId) {
    yt.loadVideoById(song.videoId);
    currentVideoId = song.videoId;
  } else {
    yt.seekTo(0, true);
    yt.playVideo();
  }
  els.nowTitle.textContent = song.title;
  els.nowMeta.textContent = `${song.channel || 'YouTube'} · ${song.requestedBy}`;
  await loadLyricsFor(song);
  await applyVocalModeForCurrent();
}

function playNext() {
  if (!state) return;
  const next = nextQueued(state);
  if (next) {
    void playSong(next);
  } else {
    currentVideoId = null;
    void stopVocalAudio();
    els.idle.classList.remove('hidden');
    els.nowTitle.textContent = '等待點歌中';
    els.nowMeta.textContent = '手機掃右側 QR Code 即可加入';
    els.lyricsCurrent.innerHTML = '';
    els.lyricsNext.textContent = '';
  }
}

function applyState(s: RoomState) {
  const prevVocal = state?.vocalRemove;
  state = s;
  saveRoom(s.code);
  void renderRoomChrome(s);
  renderQueue(s);
  lyricsLines = s.lyrics.lines || lyricsLines;
  els.lyricsOverlay.style.display = s.lyrics.enabled ? '' : 'none';

  const vocalChanged =
    !prevVocal ||
    prevVocal.enabled !== s.vocalRemove.enabled ||
    prevVocal.mode !== s.vocalRemove.mode ||
    prevVocal.strength !== s.vocalRemove.strength;

  const playing = currentSong(s);
  if (playing) {
    if (currentVideoId !== playing.videoId) void playSong(playing);
    else {
      els.nowTitle.textContent = playing.title;
      els.nowMeta.textContent = `${playing.channel || 'YouTube'} · ${playing.requestedBy}`;
      els.idle.classList.add('hidden');
      if (vocalChanged) void applyVocalModeForCurrent();
    }
  } else if (!currentVideoId) {
    const next = nextQueued(s);
    if (next) void playSong(next);
    else {
      els.idle.classList.remove('hidden');
      els.nowTitle.textContent = '等待點歌中';
      els.nowMeta.textContent = '手機掃右側 QR Code 即可加入';
    }
  } else if (vocalChanged) {
    void applyVocalModeForCurrent();
  }
}

function handleControl(cmd: { action: string; value?: number }) {
  const usingVocal = vocalActive;
  if (!player && !usingVocal) return;

  switch (cmd.action) {
    case 'play':
      if (usingVocal) {
        void els.audioEl.play();
        player?.playVideo();
      } else player?.playVideo();
      break;
    case 'pause':
      if (usingVocal) {
        els.audioEl.pause();
        player?.pauseVideo();
      } else player?.pauseVideo();
      break;
    case 'toggle':
      if (usingVocal) {
        if (els.audioEl.paused) {
          void els.audioEl.play();
          player?.playVideo();
        } else {
          els.audioEl.pause();
          player?.pauseVideo();
        }
      } else if (player) {
        if (player.getPlayerState() === window.YT!.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
      }
      break;
    case 'skip': {
      const cur = state && currentSong(state);
      if (cur) socket.emit('queue:ended', { songId: cur.id, reason: 'skipped' });
      playNext();
      break;
    }
    case 'replay':
      if (usingVocal) {
        els.audioEl.currentTime = 0;
        void els.audioEl.play();
        player?.seekTo(0, true);
        player?.playVideo();
      } else {
        player?.seekTo(0, true);
        player?.playVideo();
      }
      break;
    case 'seek': {
      const next = Math.max(0, safeTime() + (cmd.value || 0));
      if (usingVocal) {
        els.audioEl.currentTime = next;
        player?.seekTo(next, true);
      } else player?.seekTo(next, true);
      break;
    }
    case 'volume': {
      const vol = Math.max(0, Math.min(100, cmd.value ?? 80));
      if (state) state.playback.volume = vol;
      if (usingVocal) vocalRemover.setMasterGain(vol / 100);
      else {
        player?.setVolume(vol);
        if (player?.isMuted()) player.unMute();
      }
      break;
    }
    case 'mute':
      if (usingVocal) {
        const muted = els.audioEl.volume > 0;
        vocalRemover.setMasterGain(muted ? 0 : (state?.playback.volume ?? 80) / 100);
      } else if (player) {
        if (player.isMuted()) player.unMute();
        else player.mute();
      }
      break;
    default:
      break;
  }
  emitPlayback(
    usingVocal ? !els.audioEl.paused : player?.getPlayerState() === window.YT!.PlayerState.PLAYING,
  );
}

function tickLyrics() {
  if (!state?.lyrics.enabled) return;
  const active = getActiveLyrics(lyricsLines, safeTime(), state.lyrics.offsetMs || 0, speedMs);
  if (active.index !== lastLyricIndex) {
    lastLyricIndex = active.index;
    els.lyricsCurrent.style.animation = 'none';
    void els.lyricsCurrent.offsetWidth;
    els.lyricsCurrent.style.animation = '';
  }
  els.lyricsCurrent.innerHTML = renderHighlightedLine(active);
  els.lyricsNext.textContent = active.next?.text || '';
}

function startTicks() {
  window.clearInterval(tickTimer);
  tickTimer = window.setInterval(() => {
    tickLyrics();
    if (!state) return;
    if (vocalActive) {
      // Keep muted YouTube video roughly in sync for visuals
      try {
        const drift = Math.abs((player?.getCurrentTime?.() || 0) - els.audioEl.currentTime);
        if (player && drift > 0.45) player.seekTo(els.audioEl.currentTime, true);
      } catch {
        /* ignore */
      }
      if (!els.audioEl.paused) emitPlayback(true);
      if (els.audioEl.ended) skipCurrent('ended');
      return;
    }
    if (player) {
      const playing = player.getPlayerState() === window.YT!.PlayerState.PLAYING;
      if (playing) emitPlayback(true);
    }
  }, 200);
}

function boot() {
  els.audioEl.addEventListener('ended', () => skipCurrent('ended'));

  const existing = savedRoom();
  const finish = (res: { ok: boolean; state?: RoomState; error?: string }) => {
    if (res.ok && res.state) applyState(res.state);
    else {
      socket.emit('player:create', (created: { ok: boolean; state?: RoomState }) => {
        if (created.ok && created.state) applyState(created.state);
      });
    }
  };

  if (existing) socket.emit('player:rejoin', { code: existing }, finish);
  else socket.emit('player:create', finish);

  onRoomState(applyState);
  socket.on('player:control', handleControl);
  socket.on('queue:added', () => {
    if (state && !currentSong(state) && !currentVideoId) {
      const next = nextQueued(state);
      if (next) void playSong(next);
    }
  });
  startTicks();
}

boot();
