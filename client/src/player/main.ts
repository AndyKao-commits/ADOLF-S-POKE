import '../styles/player.css';
import { getSocket, onRoomState } from '../shared/socket';
import { qrImageUrl, remoteJoinUrl, shortTitle } from '../shared/format';
import {
  estimateSpeedMsPerChar,
  getActiveLyrics,
  renderHighlightedLine,
} from '../shared/lyricsEngine';
import type { LyricLine, QueueSong, RoomState } from '../shared/types';
import { createPlayer, type YtPlayer } from './youtubePlayer';

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
  stage: document.querySelector('#stage') as HTMLElement,
  lyricsCurrent: document.querySelector('#lyrics-current') as HTMLElement,
  lyricsNext: document.querySelector('#lyrics-next') as HTMLElement,
  lyricsOverlay: document.querySelector('#lyrics-overlay') as HTMLElement,
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

function savedRoom(): string | null {
  return localStorage.getItem('homektv.playerRoom');
}

function saveRoom(code: string) {
  localStorage.setItem('homektv.playerRoom', code);
}

function renderRoomChrome(s: RoomState) {
  els.roomCode.textContent = s.code;
  const url = remoteJoinUrl(s.code);
  els.qr.src = qrImageUrl(url);
  els.qr.alt = `包廂 ${s.code} QR Code`;
  els.joinHint.textContent = url.replace(/^https?:\/\//, '');
  els.remoteCount.textContent = `${s.remoteCount} 支手機已連線`;
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
      const playing = st === window.YT!.PlayerState.PLAYING;
      const ended = st === window.YT!.PlayerState.ENDED;
      if (playing) {
        hasReachedPlaying = true;
        window.clearTimeout(errorSkipTimer);
      }
      socket.emit('playback:update', {
        playing,
        position: safeTime(),
        duration: safeDuration(),
        volume: player.getVolume(),
        muted: player.isMuted(),
        currentId: state.playback.currentId,
      });
      if (ended) skipCurrent('ended');
    },
    onError: () => {
      // Ignore early embed errors (common in restricted / headless environments)
      // until the video has actually started, then skip after a short grace period.
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

function safeTime() {
  try {
    return player?.getCurrentTime() || 0;
  } catch {
    return 0;
  }
}

function safeDuration() {
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

async function playSong(song: QueueSong) {
  els.idle.classList.add('hidden');
  hasReachedPlaying = false;
  window.clearTimeout(errorSkipTimer);
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
}

function playNext() {
  if (!state) return;
  const next = nextQueued(state);
  if (next) {
    void playSong(next);
  } else {
    currentVideoId = null;
    els.idle.classList.remove('hidden');
    els.nowTitle.textContent = '等待點歌中';
    els.nowMeta.textContent = '手機掃右側 QR Code 即可加入';
    els.lyricsCurrent.innerHTML = '';
    els.lyricsNext.textContent = '';
  }
}

function applyState(s: RoomState) {
  state = s;
  saveRoom(s.code);
  renderRoomChrome(s);
  renderQueue(s);
  lyricsLines = s.lyrics.lines || lyricsLines;
  els.lyricsOverlay.style.display = s.lyrics.enabled ? '' : 'none';

  const playing = currentSong(s);
  if (playing) {
    if (currentVideoId !== playing.videoId) void playSong(playing);
    else {
      els.nowTitle.textContent = playing.title;
      els.nowMeta.textContent = `${playing.channel || 'YouTube'} · ${playing.requestedBy}`;
      els.idle.classList.add('hidden');
    }
  } else if (!currentVideoId) {
    // Auto-start first queued song when player is idle
    const next = nextQueued(s);
    if (next) void playSong(next);
    else {
      els.idle.classList.remove('hidden');
      els.nowTitle.textContent = '等待點歌中';
      els.nowMeta.textContent = '手機掃右側 QR Code 即可加入';
    }
  }
}

function handleControl(cmd: {
  action: string;
  value?: number;
}) {
  if (!player) return;
  switch (cmd.action) {
    case 'play':
      player.playVideo();
      break;
    case 'pause':
      player.pauseVideo();
      break;
    case 'toggle':
      if (player.getPlayerState() === window.YT!.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
      break;
    case 'skip': {
      const cur = state && currentSong(state);
      if (cur) socket.emit('queue:ended', { songId: cur.id, reason: 'skipped' });
      playNext();
      break;
    }
    case 'replay':
      player.seekTo(0, true);
      player.playVideo();
      break;
    case 'seek':
      player.seekTo(Math.max(0, safeTime() + (cmd.value || 0)), true);
      break;
    case 'volume':
      player.setVolume(Math.max(0, Math.min(100, cmd.value ?? 80)));
      if (player.isMuted()) player.unMute();
      break;
    case 'mute':
      if (player.isMuted()) player.unMute();
      else player.mute();
      break;
    default:
      break;
  }
  socket.emit('playback:update', {
    playing: player.getPlayerState() === window.YT!.PlayerState.PLAYING,
    position: safeTime(),
    duration: safeDuration(),
    volume: player.getVolume(),
    muted: player.isMuted(),
    currentId: state?.playback.currentId || null,
  });
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
    if (player && state) {
      const playing = player.getPlayerState() === window.YT!.PlayerState.PLAYING;
      if (playing) {
        socket.emit('playback:update', {
          playing: true,
          position: safeTime(),
          duration: safeDuration(),
          volume: player.getVolume(),
          muted: player.isMuted(),
          currentId: state.playback.currentId,
        });
      }
    }
  }, 200);
}

function boot() {
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
