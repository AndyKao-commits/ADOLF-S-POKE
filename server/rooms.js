/** @typedef {'queued' | 'playing' | 'played'} SongStatus */

/**
 * @typedef {Object} QueueSong
 * @property {string} id
 * @property {string} videoId
 * @property {string} title
 * @property {string} channel
 * @property {string} thumbnail
 * @property {SongStatus} status
 * @property {number} sortOrder
 * @property {string} requestedBy
 * @property {number} createdAt
 */

/**
 * @typedef {Object} RoomState
 * @property {string} code
 * @property {string|null} playerSocketId
 * @property {Set<string>} remotes
 * @property {QueueSong[]} queue
 * @property {object} playback
 * @property {object} lyrics
 * @property {number} createdAt
 * @property {number} lastActiveAt
 */

const rooms = new Map();

function randomCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function createRoom(playerSocketId) {
  const code = randomCode();
  /** @type {RoomState} */
  const room = {
    code,
    playerSocketId,
    remotes: new Set(),
    queue: [],
    playback: {
      playing: false,
      currentId: null,
      position: 0,
      duration: 0,
      volume: 80,
      muted: false,
      updatedAt: Date.now(),
    },
    lyrics: {
      enabled: true,
      offsetMs: 0,
      trackKey: null,
      lines: [],
      source: null,
    },
    vocalRemove: {
      enabled: false,
      mode: 'adaptive',
      strength: 1,
    },
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  if (!code) return null;
  return rooms.get(String(code).padStart(4, '0')) || rooms.get(String(code)) || null;
}

function touch(room) {
  room.lastActiveAt = Date.now();
}

function publicState(room) {
  return {
    code: room.code,
    queue: room.queue,
    playback: room.playback,
    lyrics: {
      enabled: room.lyrics.enabled,
      offsetMs: room.lyrics.offsetMs,
      trackKey: room.lyrics.trackKey,
      lines: room.lyrics.lines,
      source: room.lyrics.source,
    },
    vocalRemove: {
      enabled: Boolean(room.vocalRemove?.enabled),
      mode: room.vocalRemove?.mode || 'adaptive',
      strength:
        typeof room.vocalRemove?.strength === 'number' ? room.vocalRemove.strength : 1,
    },
    remoteCount: room.remotes.size,
    hasPlayer: Boolean(room.playerSocketId),
  };
}

function sortedQueue(room) {
  return [...room.queue].sort((a, b) => {
    const rank = { playing: 0, queued: 1, played: 2 };
    const ra = rank[a.status] ?? 9;
    const rb = rank[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.sortOrder - b.sortOrder;
  });
}

function nextSortOrder(room, insertNext = false) {
  const queued = room.queue.filter((s) => s.status === 'queued');
  if (insertNext) {
    const playing = room.queue.find((s) => s.status === 'playing');
    if (playing) return playing.sortOrder + 0.5;
    if (queued.length === 0) return Date.now();
    return Math.min(...queued.map((s) => s.sortOrder)) - 1;
  }
  if (queued.length === 0) return Date.now();
  return Math.max(...queued.map((s) => s.sortOrder)) + 1;
}

function addSong(room, song, { insertNext = false, requestedBy = '訪客' } = {}) {
  const item = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    videoId: song.videoId,
    title: song.title,
    channel: song.channel || '',
    thumbnail: song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
    status: /** @type {SongStatus} */ ('queued'),
    sortOrder: nextSortOrder(room, insertNext),
    requestedBy,
    createdAt: Date.now(),
  };
  room.queue.push(item);
  touch(room);
  return item;
}

function moveSong(room, songId, position) {
  const song = room.queue.find((s) => s.id === songId);
  if (!song || song.status !== 'queued') return false;

  if (position === 'top' || position === 'next') {
    song.sortOrder = nextSortOrder(room, true);
  }
  touch(room);
  return true;
}

function removeSong(room, songId) {
  const idx = room.queue.findIndex((s) => s.id === songId);
  if (idx === -1) return false;
  const song = room.queue[idx];
  if (song.status === 'playing') return false;
  room.queue.splice(idx, 1);
  touch(room);
  return true;
}

function markPlaying(room, songId) {
  for (const song of room.queue) {
    if (song.status === 'playing') song.status = 'played';
  }
  const song = room.queue.find((s) => s.id === songId);
  if (!song) return null;
  song.status = 'playing';
  room.playback.currentId = songId;
  room.playback.playing = true;
  room.playback.position = 0;
  touch(room);
  return song;
}

function markPlayed(room, songId) {
  const song = room.queue.find((s) => s.id === songId);
  if (!song) return;
  song.status = 'played';
  if (room.playback.currentId === songId) {
    room.playback.currentId = null;
    room.playback.playing = false;
  }
  touch(room);
}

function requeueSong(room, songId) {
  const song = room.queue.find((s) => s.id === songId);
  if (!song) return null;
  song.status = 'queued';
  song.sortOrder = nextSortOrder(room, false);
  song.createdAt = Date.now();
  touch(room);
  return song;
}

function destroyRoom(code) {
  rooms.delete(code);
}

function cleanupStale(maxAgeMs = 1000 * 60 * 60 * 6) {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActiveAt > maxAgeMs && !room.playerSocketId && room.remotes.size === 0) {
      rooms.delete(code);
    }
  }
}

setInterval(() => cleanupStale(), 60_000).unref?.();

export {
  createRoom,
  getRoom,
  publicState,
  sortedQueue,
  addSong,
  moveSong,
  removeSong,
  markPlaying,
  markPlayed,
  requeueSong,
  destroyRoom,
  touch,
};
