import '../styles/player.css';
import { getSocket, onRoomState } from '../shared/socket';
import { qrImageUrl, remoteJoinUrl, shortTitle } from '../shared/format';
import {
  estimateSpeedMsPerChar,
  getActiveLyrics,
  renderHighlightedLine,
} from '../shared/lyricsEngine';
import type { LyricLine, QueueSong, RoomState, VocalMode } from '../shared/types';
import { createPlayer, describeYtError, hardenYoutubeIframe, type YtPlayer } from './youtubePlayer';
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
  tapUnlock: document.querySelector('#tap-unlock') as HTMLButtonElement,
  localVideo: document.querySelector('#local-video') as HTMLVideoElement,
  ytHost: document.querySelector('#yt-host') as HTMLElement,
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
let mediaUnlocked = false;
let unlockWaiters: Array<() => void> = [];
let pendingPlay: QueueSong | null = null;
/** When true, HTML5 local stream is the active video source (YouTube embed blocked). */
let useLocalVideo = false;
let localFallbackInFlight: string | null = null;
let playWatchTimer = 0;

function showTapUnlock(show: boolean) {
  if (!els.tapUnlock) return;
  els.tapUnlock.classList.toggle('hidden', !show);
}

function waitForMediaUnlock(): Promise<void> {
  if (mediaUnlocked) return Promise.resolve();
  showTapUnlock(true);
  return new Promise((resolve) => {
    unlockWaiters.push(resolve);
  });
}

function unlockMedia() {
  if (mediaUnlocked) return;
  mediaUnlocked = true;
  showTapUnlock(false);
  const waiters = unlockWaiters.splice(0);
  const resumedQueuedPlay = waiters.length > 0;
  waiters.forEach((fn) => fn());
  // Only nudge if nothing was waiting on unlock (already-loaded, autoplay-blocked).
  if (!resumedQueuedPlay && currentVideoId) {
    if (useLocalVideo && els.localVideo) {
      void els.localVideo.play().catch(() => undefined);
    } else if (player) {
      try {
        hardenYoutubeIframe(player);
        player.unMute();
        player.setVolume(state?.playback.volume ?? 80);
        player.playVideo();
      } catch {
        /* ignore */
      }
    }
  }
}

function setLocalVideoVisible(on: boolean) {
  useLocalVideo = on;
  els.localVideo?.classList.toggle('hidden', !on);
  els.ytHost?.classList.toggle('hidden-host', on);
}

function stopLocalVideo() {
  window.clearTimeout(playWatchTimer);
  localFallbackInFlight = null;
  if (!els.localVideo) return;
  try {
    els.localVideo.pause();
    els.localVideo.removeAttribute('src');
    els.localVideo.load();
  } catch {
    /* ignore */
  }
  setLocalVideoVisible(false);
}

function prefetchLocalVideo(videoId: string) {
  void fetch(`/api/video/${encodeURIComponent(videoId)}`).catch(() => undefined);
}

async function playLocalFallback(videoId: string, reason: string) {
  if (!els.localVideo) return false;
  if (localFallbackInFlight === videoId && useLocalVideo) return true;
  localFallbackInFlight = videoId;
  window.clearTimeout(errorSkipTimer);
  window.clearTimeout(playWatchTimer);
  els.nowMeta.textContent = `YouTube 無法嵌入（${reason}），改由電腦下載播放…`;

  try {
    try {
      player?.stopVideo();
    } catch {
      /* ignore */
    }

    const meta = await fetch(`/api/video/${encodeURIComponent(videoId)}`);
    const data = await meta.json();
    if (!meta.ok || !data.ok) throw new Error(data.error || data.detail || '本機影片不可用');

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('本機影片載入失敗'));
      };
      const cleanup = () => {
        els.localVideo.removeEventListener('canplay', onReady);
        els.localVideo.removeEventListener('error', onErr);
      };
      els.localVideo.addEventListener('canplay', onReady, { once: true });
      els.localVideo.addEventListener('error', onErr, { once: true });
      els.localVideo.src = data.url;
      els.localVideo.load();
    });

    setLocalVideoVisible(true);
    els.localVideo.volume = (state?.playback.volume ?? 80) / 100;
    els.localVideo.muted = false;
    await els.localVideo.play();
    hasReachedPlaying = true;
    showTapUnlock(false);
    els.nowMeta.textContent = '本機串流播放中（YouTube 嵌入被擋時的備援）';
    emitPlayback(true);
    return true;
  } catch (err) {
    console.warn('local video fallback failed', err);
    els.nowMeta.textContent = `備援播放失敗：${String((err as Error)?.message || err)}`;
    localFallbackInFlight = null;
    return false;
  }
}

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
      if (!state || !player || useLocalVideo) return;
      if (vocalActive) return; // clock driven by processed audio
      const playing = st === window.YT!.PlayerState.PLAYING;
      const ended = st === window.YT!.PlayerState.ENDED;
      if (playing) {
        hasReachedPlaying = true;
        window.clearTimeout(errorSkipTimer);
        window.clearTimeout(playWatchTimer);
        showTapUnlock(false);
      }
      // Autoplay blocked → paused/cued with no user gesture
      if (!mediaUnlocked && (st === window.YT!.PlayerState.CUED || st === window.YT!.PlayerState.PAUSED)) {
        showTapUnlock(true);
      }
      emitPlayback(playing);
      if (ended) skipCurrent('ended');
    },
    onError: (code) => {
      if (vocalActive || useLocalVideo) return;
      window.clearTimeout(errorSkipTimer);
      const detail = describeYtError(code);
      els.nowMeta.textContent = detail;
      const vid = currentVideoId;
      if (!vid) return;
      // Karaoke tracks often block embedding (101/150). Fall back instead of skipping.
      errorSkipTimer = window.setTimeout(() => {
        void (async () => {
          const ok = await playLocalFallback(vid, detail);
          if (ok) sessionStorage.setItem('homektv.preferLocalVideo', '1');
          else if (!hasReachedPlaying) {
            els.nowMeta.textContent = `${detail}，已跳過`;
            skipCurrent('error');
          }
        })();
      }, 400);
    },
  });
  hardenYoutubeIframe(player);
  return player;
}

function emitPlayback(playing: boolean) {
  if (!state) return;
  const volume = vocalActive
    ? Math.round(state.playback.volume ?? 80)
    : useLocalVideo
      ? Math.round((els.localVideo?.volume ?? 0.8) * 100)
      : player?.getVolume?.() ?? 80;
  const muted = vocalActive
    ? false
    : useLocalVideo
      ? Boolean(els.localVideo?.muted)
      : Boolean(player?.isMuted?.());
  socket.emit('playback:update', {
    playing,
    position: safeTime(),
    duration: safeDuration(),
    volume,
    muted,
    currentId: state.playback.currentId,
  });
}

function safeTime() {
  if (vocalActive && els.audioEl && !Number.isNaN(els.audioEl.currentTime)) {
    return els.audioEl.currentTime;
  }
  if (useLocalVideo && els.localVideo && !Number.isNaN(els.localVideo.currentTime)) {
    return els.localVideo.currentTime;
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
  if (useLocalVideo && els.localVideo && Number.isFinite(els.localVideo.duration)) {
    return els.localVideo.duration;
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

    // Keep picture (muted); audio from processed track
    if (useLocalVideo && els.localVideo) {
      els.localVideo.muted = true;
    } else if (player) {
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
  if (!ok) {
    if (useLocalVideo && els.localVideo) {
      els.localVideo.muted = false;
      els.localVideo.volume = (state.playback.volume ?? 80) / 100;
      void els.localVideo.play().catch(() => undefined);
    } else if (player) {
      try {
        player.unMute();
        player.setVolume(state.playback.volume ?? 80);
        player.playVideo();
      } catch {
        /* ignore */
      }
    }
  }
}

async function playSong(song: QueueSong) {
  els.idle.classList.add('hidden');
  hasReachedPlaying = false;
  window.clearTimeout(errorSkipTimer);
  window.clearTimeout(playWatchTimer);
  pendingPlay = song;
  els.nowTitle.textContent = song.title;
  els.nowMeta.textContent = `${song.channel || 'YouTube'} · ${song.requestedBy}`;

  // Tablets block autoplay+sound until the user taps once.
  await waitForMediaUnlock();
  if (pendingPlay && pendingPlay.id !== song.id) return;
  pendingPlay = null;

  await stopVocalAudio();
  stopLocalVideo();
  currentVideoId = song.videoId;
  prefetchLocalVideo(song.videoId);
  socket.emit('queue:playing', { songId: song.id });

  // Many karaoke uploads block YouTube embeds. Prefer local stream when previous
  // song already needed fallback, otherwise try embed then fall back.
  const preferLocal = sessionStorage.getItem('homektv.preferLocalVideo') === '1';
  if (preferLocal) {
    const ok = await playLocalFallback(song.videoId, '慣用本機串流');
    if (ok) {
      await loadLyricsFor(song);
      await applyVocalModeForCurrent();
      return;
    }
  }

  let yt: YtPlayer;
  try {
    yt = await ensurePlayer();
  } catch (err) {
    const ok = await playLocalFallback(song.videoId, String((err as Error)?.message || err));
    if (!ok) {
      els.nowMeta.textContent = String((err as Error)?.message || err);
      showTapUnlock(true);
      return;
    }
    await loadLyricsFor(song);
    await applyVocalModeForCurrent();
    return;
  }
  hardenYoutubeIframe(yt);
  try {
    yt.loadVideoById(song.videoId);
    yt.unMute();
    yt.setVolume(state?.playback.volume ?? 80);
    yt.playVideo();
  } catch (err) {
    const ok = await playLocalFallback(song.videoId, String((err as Error)?.message || err));
    if (!ok) {
      els.nowMeta.textContent = `播放失敗：${String((err as Error)?.message || err)}`;
      showTapUnlock(true);
      return;
    }
  }

  // If embed never reaches PLAYING, swap to local stream.
  playWatchTimer = window.setTimeout(() => {
    if (!hasReachedPlaying && !useLocalVideo && currentVideoId === song.videoId) {
      void (async () => {
        const ok = await playLocalFallback(song.videoId, '嵌入逾時');
        if (ok) sessionStorage.setItem('homektv.preferLocalVideo', '1');
      })();
    }
  }, 7000);

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
    stopLocalVideo();
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
  const usingLocal = useLocalVideo && !usingVocal;
  if (!player && !usingVocal && !useLocalVideo) return;

  switch (cmd.action) {
    case 'play':
      if (usingVocal) {
        void els.audioEl.play();
        if (useLocalVideo) void els.localVideo.play().catch(() => undefined);
        else player?.playVideo();
      } else if (usingLocal) void els.localVideo.play().catch(() => undefined);
      else player?.playVideo();
      break;
    case 'pause':
      if (usingVocal) {
        els.audioEl.pause();
        if (useLocalVideo) els.localVideo.pause();
        else player?.pauseVideo();
      } else if (usingLocal) els.localVideo.pause();
      else player?.pauseVideo();
      break;
    case 'toggle':
      if (usingVocal) {
        if (els.audioEl.paused) {
          void els.audioEl.play();
          if (useLocalVideo) void els.localVideo.play().catch(() => undefined);
          else player?.playVideo();
        } else {
          els.audioEl.pause();
          if (useLocalVideo) els.localVideo.pause();
          else player?.pauseVideo();
        }
      } else if (usingLocal) {
        if (els.localVideo.paused) void els.localVideo.play().catch(() => undefined);
        else els.localVideo.pause();
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
        if (useLocalVideo) {
          els.localVideo.currentTime = 0;
          void els.localVideo.play().catch(() => undefined);
        } else {
          player?.seekTo(0, true);
          player?.playVideo();
        }
      } else if (usingLocal) {
        els.localVideo.currentTime = 0;
        void els.localVideo.play().catch(() => undefined);
      } else {
        player?.seekTo(0, true);
        player?.playVideo();
      }
      break;
    case 'seek': {
      const next = Math.max(0, safeTime() + (cmd.value || 0));
      if (usingVocal) {
        els.audioEl.currentTime = next;
        if (useLocalVideo) els.localVideo.currentTime = next;
        else player?.seekTo(next, true);
      } else if (usingLocal) els.localVideo.currentTime = next;
      else player?.seekTo(next, true);
      break;
    }
    case 'volume': {
      const vol = Math.max(0, Math.min(100, cmd.value ?? 80));
      if (state) state.playback.volume = vol;
      if (usingVocal) vocalRemover.setMasterGain(vol / 100);
      else if (usingLocal) {
        els.localVideo.volume = vol / 100;
        els.localVideo.muted = false;
      } else {
        player?.setVolume(vol);
        if (player?.isMuted()) player.unMute();
      }
      break;
    }
    case 'mute':
      if (usingVocal) {
        const muted = els.audioEl.volume > 0;
        vocalRemover.setMasterGain(muted ? 0 : (state?.playback.volume ?? 80) / 100);
      } else if (usingLocal) {
        els.localVideo.muted = !els.localVideo.muted;
      } else if (player) {
        if (player.isMuted()) player.unMute();
        else player.mute();
      }
      break;
    default:
      break;
  }
  const playingNow = usingVocal
    ? !els.audioEl.paused
    : usingLocal
      ? !els.localVideo.paused
      : player?.getPlayerState() === window.YT!.PlayerState.PLAYING;
  emitPlayback(Boolean(playingNow));
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
      // Keep muted picture roughly in sync for visuals
      try {
        if (useLocalVideo && els.localVideo) {
          const drift = Math.abs(els.localVideo.currentTime - els.audioEl.currentTime);
          if (drift > 0.45) els.localVideo.currentTime = els.audioEl.currentTime;
        } else {
          const drift = Math.abs((player?.getCurrentTime?.() || 0) - els.audioEl.currentTime);
          if (player && drift > 0.45) player.seekTo(els.audioEl.currentTime, true);
        }
      } catch {
        /* ignore */
      }
      if (!els.audioEl.paused) emitPlayback(true);
      if (els.audioEl.ended) skipCurrent('ended');
      return;
    }
    if (useLocalVideo && els.localVideo) {
      if (!els.localVideo.paused) emitPlayback(true);
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
  els.localVideo?.addEventListener('ended', () => {
    if (!vocalActive && useLocalVideo) skipCurrent('ended');
  });
  els.localVideo?.addEventListener('play', () => {
    if (useLocalVideo) {
      hasReachedPlaying = true;
      showTapUnlock(false);
      emitPlayback(true);
    }
  });
  els.tapUnlock?.addEventListener('click', () => unlockMedia());
  // Also accept a tap anywhere on the stage the first time.
  document.querySelector('#stage')?.addEventListener(
    'pointerdown',
    () => {
      if (!mediaUnlocked) unlockMedia();
    },
    { capture: true },
  );

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
