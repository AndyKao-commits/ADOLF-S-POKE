import { spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { tmpdir, homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BIN_DIR = join(ROOT, '.party', 'bin');
const IS_WIN = platform() === 'win32';
const BIN_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp';
const LOCAL_BIN = join(BIN_DIR, BIN_NAME);

let resolvedBin = null;
let resolving = null;

function run(cmd, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
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

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function whichYtDlp() {
  if (process.env.YT_DLP_PATH && (await fileExists(process.env.YT_DLP_PATH))) {
    return process.env.YT_DLP_PATH;
  }
  if (await fileExists(LOCAL_BIN)) return LOCAL_BIN;

  const homeCandidate = join(homedir(), '.local', 'bin', IS_WIN ? 'yt-dlp.exe' : 'yt-dlp');
  if (await fileExists(homeCandidate)) return homeCandidate;

  const probe = IS_WIN ? 'where' : 'which';
  try {
    const { stdout } = await run(probe, ['yt-dlp'], 8000);
    const hit = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    if (hit && (await fileExists(hit))) return hit;
  } catch {
    /* not on PATH */
  }

  if (IS_WIN) {
    try {
      const { stdout } = await run('where', ['yt-dlp.exe'], 8000);
      const hit = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean);
      if (hit && (await fileExists(hit))) return hit;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function downloadYtDlp() {
  await fs.mkdir(BIN_DIR, { recursive: true });
  const url = IS_WIN
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  console.log(`[yt-dlp] downloading ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'home-ktv-party/1.0',
      Accept: 'application/octet-stream',
    },
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    throw new Error(`無法下載 yt-dlp (${res.status})`);
  }
  const tmp = join(tmpdir(), `yt-dlp-dl-${Date.now()}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  await fs.rename(tmp, LOCAL_BIN);
  if (!IS_WIN) {
    await fs.chmod(LOCAL_BIN, 0o755);
  }
  console.log(`[yt-dlp] installed at ${LOCAL_BIN}`);
  return LOCAL_BIN;
}

/** Resolve yt-dlp binary, auto-installing into .party/bin if needed. */
export async function getYtDlpPath() {
  if (resolvedBin) return resolvedBin;
  if (resolving) return resolving;
  resolving = (async () => {
    const existing = await whichYtDlp();
    if (existing) {
      resolvedBin = existing;
      return existing;
    }
    resolvedBin = await downloadYtDlp();
    return resolvedBin;
  })().finally(() => {
    resolving = null;
  });
  return resolving;
}

export async function runYtDlp(args, timeoutMs = 180000) {
  const bin = await getYtDlpPath();
  return run(bin, args, timeoutMs);
}

export async function ytDlpStatus() {
  try {
    const bin = await getYtDlpPath();
    const { stdout } = await run(bin, ['--version'], 15000);
    return { ok: true, bin, version: stdout.trim() };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}
