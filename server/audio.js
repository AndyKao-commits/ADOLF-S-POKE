import { spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const YT_DLP = process.env.YT_DLP_PATH || `${process.env.HOME}/.local/bin/yt-dlp`;
const cache = new Map(); // videoId -> { file, mime, expires }

function run(cmd, args, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timeout: ${cmd}`));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${cmd} exited ${code}`));
    });
  });
}

async function resolveAudioUrl(videoId) {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const { stdout } = await run(YT_DLP, [
    '-f',
    'bestaudio[ext=m4a]/bestaudio/best',
    '-g',
    '--no-playlist',
    watch,
  ]);
  const url = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith('http'));
  if (!url) throw new Error('找不到音訊網址');
  return url;
}

/**
 * Download (or reuse) a short-lived local audio cache for a video.
 * Proxied locally so the browser can use createMediaElementSource (CORS-safe).
 */
export async function ensureAudioFile(videoId) {
  const id = String(videoId || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) throw new Error('invalid videoId');

  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) {
    try {
      await fs.access(hit.file);
      return hit;
    } catch {
      cache.delete(id);
    }
  }

  const url = await resolveAudioUrl(id);
  const upstream = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error(`音訊下載失敗 (${upstream.status})`);
  }

  const mime = upstream.headers.get('content-type') || 'audio/mp4';
  const ext = mime.includes('webm') ? 'webm' : mime.includes('mpeg') ? 'mp3' : 'm4a';
  const file = join(tmpdir(), `homektv-${id}-${randomBytes(4).toString('hex')}.${ext}`);
  await pipeline(Readable.fromWeb(upstream.body), createWriteStream(file));

  const entry = {
    file,
    mime,
    expires: Date.now() + 1000 * 60 * 25,
  };
  const prev = cache.get(id);
  cache.set(id, entry);
  if (prev?.file && prev.file !== file) {
    fs.unlink(prev.file).catch(() => {});
  }
  return entry;
}

export async function getAudioUrlOnly(videoId) {
  return resolveAudioUrl(videoId);
}
