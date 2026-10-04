import { createWriteStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { runYtDlp } from './ytdlp.js';

const audioCache = new Map(); // videoId -> { file, mime, expires }
const videoCache = new Map();
const inflightVideo = new Map();
const inflightAudio = new Map();

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function validId(videoId) {
  const id = String(videoId || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) throw new Error('invalid videoId');
  return id;
}

const YT_CLIENT_ARGS = [
  '--extractor-args',
  'youtube:player_client=android,ios,mweb,tv_embedded',
];

function cookieAttempts() {
  // Home PCs often need browser cookies when YouTube serves a bot check.
  return [null, 'chrome', 'edge', 'firefox', 'brave'];
}

async function runYtDlpWithAuth(args, timeoutMs) {
  const errors = [];
  for (const browser of cookieAttempts()) {
    const full = [
      ...YT_CLIENT_ARGS,
      '--no-playlist',
      '--no-warnings',
      ...(browser ? ['--cookies-from-browser', browser] : []),
      ...args,
    ];
    try {
      return await runYtDlp(full, timeoutMs);
    } catch (err) {
      const msg = String(err?.message || err);
      errors.push(browser ? `${browser}: ${msg}` : msg);
      // Only keep trying cookies on bot/auth style failures.
      if (
        browser === null &&
        !/bot|sign in|cookies|confirm you/i.test(msg)
      ) {
        // Still try cookies once; some networks only work that way.
      }
    }
  }
  throw new Error(errors[errors.length - 1] || 'yt-dlp failed');
}

async function resolveMediaUrl(videoId, format) {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const { stdout } = await runYtDlpWithAuth(['-f', format, '-g', watch], 90000);
  const url = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith('http'));
  if (!url) throw new Error('找不到媒體網址');
  return url;
}

async function downloadToCache(videoId, format, kind) {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const ext = kind === 'video' ? 'mp4' : 'm4a';
  const file = join(
    tmpdir(),
    `homektv-${kind}-${videoId}-${randomBytes(4).toString('hex')}.${ext}`,
  );

  // Prefer downloading a single progressive file (no ffmpeg merge required).
  try {
    await runYtDlpWithAuth(
      ['-f', format, '-o', file, '--newline', watch],
      kind === 'video' ? 300000 : 180000,
    );
    await fs.access(file);
    return {
      file,
      mime: kind === 'video' ? 'video/mp4' : 'audio/mp4',
      expires: Date.now() + 1000 * 60 * 40,
    };
  } catch (directErr) {
    // Fallback: resolve URL then fetch through Node (same machine IP as yt-dlp).
    try {
      const url = await resolveMediaUrl(videoId, format);
      const upstream = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!upstream.ok || !upstream.body) {
        throw new Error(`媒體下載失敗 (${upstream.status || '?'})`);
      }
      const mime =
        upstream.headers.get('content-type') ||
        (kind === 'video' ? 'video/mp4' : 'audio/mp4');
      const outExt = mime.includes('webm')
        ? 'webm'
        : mime.includes('mpeg')
          ? 'mp3'
          : ext;
      const outFile = file.replace(/\.[^.]+$/, `.${outExt}`);
      await pipeline(Readable.fromWeb(upstream.body), createWriteStream(outFile));
      return {
        file: outFile,
        mime,
        expires: Date.now() + 1000 * 60 * 40,
      };
    } catch (streamErr) {
      throw new Error(
        `${String(directErr?.message || directErr)} | ${String(streamErr?.message || streamErr)}`,
      );
    }
  }
}

async function ensureCached(map, inflight, videoId, format, kind) {
  const id = validId(videoId);
  const hit = map.get(id);
  if (hit && hit.expires > Date.now()) {
    try {
      await fs.access(hit.file);
      return hit;
    } catch {
      map.delete(id);
    }
  }
  if (inflight.has(id)) return inflight.get(id);

  const job = downloadToCache(id, format, kind)
    .then((entry) => {
      const prev = map.get(id);
      map.set(id, entry);
      if (prev?.file && prev.file !== entry.file) {
        fs.unlink(prev.file).catch(() => {});
      }
      return entry;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, job);
  return job;
}

/**
 * Download (or reuse) a short-lived local audio cache for a video.
 * Proxied locally so the browser can use createMediaElementSource (CORS-safe).
 */
export async function ensureAudioFile(videoId) {
  return ensureCached(
    audioCache,
    inflightAudio,
    videoId,
    'bestaudio[ext=m4a]/bestaudio/best',
    'audio',
  );
}

/**
 * Download (or reuse) a progressive video file for HTML5 playback fallback
 * when YouTube iframe embedding is blocked.
 */
export async function ensureVideoFile(videoId) {
  return ensureCached(
    videoCache,
    inflightVideo,
    videoId,
    // Progressive muxed formats first so ffmpeg is not required.
    'best[ext=mp4][height<=720]/best[ext=mp4]/best[height<=720]/best',
    'video',
  );
}

export async function getAudioUrlOnly(videoId) {
  return resolveMediaUrl(validId(videoId), 'bestaudio[ext=m4a]/bestaudio/best');
}
