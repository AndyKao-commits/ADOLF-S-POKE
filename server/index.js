import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import QRCode from 'qrcode';
import {
  createRoom,
  getRoom,
  publicState,
  addSong,
  moveSong,
  removeSong,
  markPlaying,
  markPlayed,
  requeueSong,
  destroyRoom,
  touch,
} from './rooms.js';
import { createReadStream, statSync } from 'node:fs';
import { searchVideos, KARAOKE_SUFFIXES } from './youtube.js';
import { fetchLyrics } from './lyrics.js';
import { ensureAudioFile, ensureVideoFile } from './audio.js';
import { ytDlpStatus } from './ytdlp.js';
import { listLanHosts } from './lan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

app.use(express.json({ limit: '1mb' }));

// YouTube IFrame embeds need a Referer. Do not use same-origin / no-referrer.
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'home-ktv', party: true });
});

/** Help tablets that opened via localhost still show a phone-reachable QR. */
app.get('/api/lan-hosts', (_req, res) => {
  const hosts = listLanHosts();
  res.json({
    hosts,
    port: PORT,
    // Prefer production single-port; Vite dev uses the page's own port via the client.
    suggestedOrigins: hosts.map((h) => `http://${h}:${PORT}`),
  });
});

app.get('/api/karaoke-keywords', (_req, res) => {
  res.json({ keywords: KARAOKE_SUFFIXES });
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const karaoke = req.query.karaoke !== '0' && req.query.karaoke !== 'false';
    const results = await searchVideos(q, { karaoke, limit: 24 });
    res.json({ results, karaoke });
  } catch (err) {
    console.error('search failed', err);
    res.status(500).json({ error: '搜尋失敗，請稍後再試', detail: String(err?.message || err) });
  }
});

app.get('/api/lyrics', async (req, res) => {
  try {
    const title = String(req.query.title || '');
    const channel = String(req.query.channel || '');
    const durationSec = req.query.duration ? Number(req.query.duration) : undefined;
    const data = await fetchLyrics({ title, channel, durationSec });
    res.json(data);
  } catch (err) {
    console.error('lyrics failed', err);
    res.status(500).json({ error: '歌詞取得失敗', detail: String(err?.message || err) });
  }
});

app.get('/api/qr', async (req, res) => {
  try {
    const text = String(req.query.text || '');
    if (!text) return res.status(400).json({ error: 'missing text' });
    const png = await QRCode.toBuffer(text, {
      type: 'png',
      width: 280,
      margin: 1,
      color: { dark: '#1c1914', light: '#00000000' },
    });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

function sendMediaFile(req, res, file, mime) {
  const stat = statSync(file);
  const size = stat.size;
  // Force a tablet-friendly type when possible (some probes return octet-stream).
  let type = mime || 'application/octet-stream';
  if (file.endsWith('.mp4')) type = 'video/mp4';
  else if (file.endsWith('.m4a')) type = 'audio/mp4';
  else if (file.endsWith('.webm')) type = type.startsWith('audio') ? 'audio/webm' : 'video/webm';
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (!m) {
      res.status(416).end();
      return;
    }
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return;
    }
    const safeEnd = Math.min(end, size - 1);
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${safeEnd}/${size}`);
    res.setHeader('Content-Length', safeEnd - start + 1);
    createReadStream(file, { start, end: safeEnd }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', size);
  createReadStream(file).pipe(res);
}

app.get('/api/media-status', async (_req, res) => {
  res.json(await ytDlpStatus());
});

app.get('/api/audio/:videoId', async (req, res) => {
  try {
    const entry = await ensureAudioFile(req.params.videoId);
    res.json({
      ok: true,
      url: `/api/audio-stream/${encodeURIComponent(req.params.videoId)}`,
      mime: entry.mime,
    });
  } catch (err) {
    console.error('audio resolve failed', err);
    res.status(500).json({
      ok: false,
      error: '無法取得音訊（人聲消除需要可下載的音軌）',
      detail: String(err?.message || err),
    });
  }
});

app.get('/api/audio-stream/:videoId', async (req, res) => {
  try {
    const entry = await ensureAudioFile(req.params.videoId);
    sendMediaFile(req, res, entry.file, entry.mime || 'audio/mp4');
  } catch (err) {
    console.error('audio stream failed', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get('/api/video/:videoId', async (req, res) => {
  try {
    const entry = await ensureVideoFile(req.params.videoId);
    res.json({
      ok: true,
      url: `/api/video-stream/${encodeURIComponent(req.params.videoId)}`,
      mime: entry.mime,
    });
  } catch (err) {
    console.error('video resolve failed', err);
    res.status(500).json({
      ok: false,
      error: '無法取得影片（電腦需能連 YouTube；首次會自動下載 yt-dlp）',
      detail: String(err?.message || err),
    });
  }
});

app.get('/api/video-stream/:videoId', async (req, res) => {
  try {
    const entry = await ensureVideoFile(req.params.videoId);
    sendMediaFile(req, res, entry.file, entry.mime || 'video/mp4');
  } catch (err) {
    console.error('video stream failed', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

function emitRoom(room) {
  io.to(`room:${room.code}`).emit('room:state', publicState(room));
}

function leavePreviousRooms(socket) {
  for (const room of socket.rooms) {
    if (room.startsWith('room:')) socket.leave(room);
  }
}

io.on('connection', (socket) => {
  socket.data.role = null;
  socket.data.roomCode = null;
  socket.data.name = '訪客';

  socket.on('player:create', (ack) => {
    leavePreviousRooms(socket);
    const room = createRoom(socket.id);
    socket.data.role = 'player';
    socket.data.roomCode = room.code;
    socket.join(`room:${room.code}`);
    const state = publicState(room);
    if (typeof ack === 'function') ack({ ok: true, state });
    socket.emit('room:state', state);
  });

  socket.on('player:rejoin', ({ code } = {}, ack) => {
    const room = getRoom(code);
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, error: '房間不存在或已過期' });
      return;
    }
    leavePreviousRooms(socket);
    room.playerSocketId = socket.id;
    socket.data.role = 'player';
    socket.data.roomCode = room.code;
    socket.join(`room:${room.code}`);
    touch(room);
    const state = publicState(room);
    if (typeof ack === 'function') ack({ ok: true, state });
    emitRoom(room);
  });

  socket.on('remote:join', ({ code, name } = {}, ack) => {
    const room = getRoom(code);
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, error: '找不到這個包廂號碼' });
      return;
    }
    leavePreviousRooms(socket);
    room.remotes.add(socket.id);
    socket.data.role = 'remote';
    socket.data.roomCode = room.code;
    socket.data.name = String(name || '訪客').slice(0, 20);
    socket.join(`room:${room.code}`);
    touch(room);
    const state = publicState(room);
    if (typeof ack === 'function') ack({ ok: true, state });
    emitRoom(room);
  });

  socket.on('queue:add', ({ song, insertNext = false } = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false, error: '未加入房間' });
    if (!song?.videoId) return typeof ack === 'function' && ack({ ok: false, error: '歌曲資料不完整' });
    const item = addSong(room, song, {
      insertNext: Boolean(insertNext),
      requestedBy: socket.data.name || '訪客',
    });
    emitRoom(room);
    io.to(`room:${room.code}`).emit('queue:added', { song: item, insertNext: Boolean(insertNext) });
    if (typeof ack === 'function') ack({ ok: true, song: item });
  });

  socket.on('queue:move', ({ songId, position } = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    const ok = moveSong(room, songId, position);
    if (ok) emitRoom(room);
    if (typeof ack === 'function') ack({ ok });
  });

  socket.on('queue:remove', ({ songId } = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    const ok = removeSong(room, songId);
    if (ok) emitRoom(room);
    if (typeof ack === 'function') ack({ ok });
  });

  socket.on('queue:requeue', ({ songId } = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    const song = requeueSong(room, songId);
    if (song) emitRoom(room);
    if (typeof ack === 'function') ack({ ok: Boolean(song), song });
  });

  socket.on('player:control', (payload = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    touch(room);
    io.to(`room:${room.code}`).emit('player:control', {
      ...payload,
      from: socket.data.role,
      name: socket.data.name,
    });
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('playback:update', (payload = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || socket.data.role !== 'player') return;
    room.playback = {
      ...room.playback,
      ...payload,
      updatedAt: Date.now(),
    };
    touch(room);
    socket.to(`room:${room.code}`).emit('playback:update', room.playback);
  });

  socket.on('queue:playing', ({ songId } = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || socket.data.role !== 'player') return;
    markPlaying(room, songId);
    emitRoom(room);
  });

  socket.on('queue:ended', ({ songId, reason = 'ended' } = {}) => {
    const room = getRoom(socket.data.roomCode);
    if (!room || socket.data.role !== 'player') return;
    markPlayed(room, songId);
    io.to(`room:${room.code}`).emit('queue:ended', { songId, reason });
    emitRoom(room);
  });

  socket.on('lyrics:set', (payload = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    room.lyrics = {
      ...room.lyrics,
      ...payload,
    };
    touch(room);
    emitRoom(room);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('lyrics:offset', ({ deltaMs = 0, absoluteMs } = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    if (typeof absoluteMs === 'number') room.lyrics.offsetMs = absoluteMs;
    else room.lyrics.offsetMs = Math.round((room.lyrics.offsetMs || 0) + Number(deltaMs || 0));
    touch(room);
    emitRoom(room);
    if (typeof ack === 'function') ack({ ok: true, offsetMs: room.lyrics.offsetMs });
  });

  socket.on('vocal:set', (payload = {}, ack) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return typeof ack === 'function' && ack({ ok: false });
    room.vocalRemove = {
      enabled:
        typeof payload.enabled === 'boolean'
          ? payload.enabled
          : Boolean(room.vocalRemove?.enabled),
      mode: ['classic', 'adaptive', 'hq'].includes(payload.mode)
        ? payload.mode
        : room.vocalRemove?.mode || 'adaptive',
      strength:
        typeof payload.strength === 'number'
          ? Math.max(0, Math.min(1, payload.strength))
          : typeof room.vocalRemove?.strength === 'number'
            ? room.vocalRemove.strength
            : 1,
    };
    touch(room);
    emitRoom(room);
    if (typeof ack === 'function') ack({ ok: true, vocalRemove: room.vocalRemove });
  });

  socket.on('disconnect', () => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return;
    if (socket.data.role === 'player' && room.playerSocketId === socket.id) {
      room.playerSocketId = null;
      io.to(`room:${room.code}`).emit('player:offline');
      // Keep room alive for a while so remotes can wait for player refresh
      setTimeout(() => {
        const current = getRoom(room.code);
        if (current && !current.playerSocketId && current.remotes.size === 0) {
          destroyRoom(room.code);
        }
      }, 1000 * 60 * 30);
    }
    if (socket.data.role === 'remote') {
      room.remotes.delete(socket.id);
    }
    emitRoom(room);
  });
});

if (isProd) {
  const dist = join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  app.get(['/player', '/player.html'], (_req, res) => {
    res.sendFile(join(dist, 'player.html'));
  });
  app.get(['/remote', '/remote.html'], (_req, res) => {
    res.sendFile(join(dist, 'remote.html'));
  });
  // Express 5 / path-to-regexp needs a named splat (bare '*' throws).
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(join(dist, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const lans = listLanHosts();
  console.log(`開唱（私人派對）http://localhost:${PORT}`);
  for (const host of lans) {
    console.log(`  同 Wi‑Fi 平板／手機：http://${host}:${PORT}`);
  }
  if (!lans.length) {
    console.log('  （尚未偵測到區網 IP，請確認 Wi‑Fi）');
  }
});
