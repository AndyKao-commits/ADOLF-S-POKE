const LRCLIB = 'https://lrclib.net/api';
const UA = 'HomeKTV/1.0 (https://github.com/AndyKao-commits/KTV)';

/**
 * Enhanced LRC word tags: <mm:ss.xx>word
 * Also supports [mm:ss.xx] line timestamps.
 */

function parseTimestamp(ts) {
  const parts = String(ts)
    .trim()
    .split(':')
    .map((p) => Number(p));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) {
    return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  }
  if (parts.length === 2) {
    return Math.round((parts[0] * 60 + parts[1]) * 1000);
  }
  return null;
}

/**
 * @param {string} syncedLyrics
 */
export function parseLrc(syncedLyrics) {
  if (!syncedLyrics) return [];
  const lines = [];
  for (const raw of syncedLyrics.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const timeTags = [...line.matchAll(/\[(\d{1,2}:\d{1,2}(?:\.\d+)?)\]/g)];
    if (timeTags.length === 0) continue;

    const content = line.replace(/\[(\d{1,2}:\d{1,2}(?:\.\d+)?)\]/g, '').trim();
    if (!content) continue;

    const wordMatches = [...content.matchAll(/<(\d{1,2}:\d{1,2}(?:\.\d+)?)>([^<]*)/g)];
    /** @type {{ text: string, startMs: number }[]} */
    let words = [];
    let plain = content;

    if (wordMatches.length > 0) {
      words = wordMatches
        .map((m) => {
          const startMs = parseTimestamp(m[1]);
          if (startMs == null) return null;
          return { text: m[2], startMs };
        })
        .filter(Boolean);
      plain = words.map((w) => w.text).join('');
    }

    if (!plain) continue;

    for (const tag of timeTags) {
      const startMs = parseTimestamp(tag[1]);
      if (startMs == null || Number.isNaN(startMs)) continue;
      lines.push({
        startMs,
        text: plain,
        words: words.length ? words : null,
      });
    }
  }

  lines.sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < lines.length; i++) {
    lines[i].endMs = lines[i + 1]?.startMs ?? lines[i].startMs + 5000;
  }
  return lines.filter((l) => Number.isFinite(l.startMs));
}

function stripKaraokeNoise(title = '') {
  return title
    .replace(/[【\[][^】\]]*[】\]]/g, ' ')
    .replace(/\((?:官方|official|mv|audio|lyrics?|動態歌詞|卡拉OK|karaoke|ktv|伴奏|左伴右唱)[^)]*\)/gi, ' ')
    .replace(/\b(?:karaoke|ktv|伴奏|左伴右唱|動態歌詞|official\s*mv|lyrics?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessArtistTitle(rawTitle) {
  const clean = stripKaraokeNoise(rawTitle);
  const parts = clean.split(/\s*[-–—_|／/]\s*/).filter(Boolean);
  if (parts.length >= 2) {
    return { artist: parts[0], track: parts.slice(1).join(' - ') };
  }
  return { artist: '', track: clean || rawTitle };
}

async function lrclibFetch(path) {
  const res = await fetch(`${LRCLIB}${path}`, {
    headers: { 'User-Agent': UA },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    // Treat upstream blips as miss instead of failing the whole request hard.
    if (res.status >= 500) return null;
    throw new Error(`LRCLIB ${res.status}`);
  }
  return res.json();
}

/**
 * @param {{ title: string, channel?: string, durationSec?: number }} meta
 */
export async function fetchLyrics(meta) {
  const { artist, track } = guessArtistTitle(meta.title || '');
  const q = new URLSearchParams();
  if (track) q.set('track_name', track);
  if (artist) q.set('artist_name', artist);
  else if (meta.channel) q.set('artist_name', stripKaraokeNoise(meta.channel));
  q.set('q', [artist, track].filter(Boolean).join(' ') || meta.title);

  let record = null;

  // Prefer search for fuzzy match on karaoke titles
  const search = await lrclibFetch(`/search?${q.toString()}`);
  if (Array.isArray(search) && search.length) {
    const withSync = search.filter((r) => r.syncedLyrics);
    const pool = withSync.length ? withSync : search;
    if (meta.durationSec) {
      pool.sort(
        (a, b) =>
          Math.abs((a.duration || 0) - meta.durationSec) -
          Math.abs((b.duration || 0) - meta.durationSec),
      );
    }
    record = pool[0];
  }

  if (!record && track) {
    const params = new URLSearchParams({
      track_name: track,
      artist_name: artist || meta.channel || 'Unknown',
    });
    if (meta.durationSec) params.set('duration', String(Math.round(meta.durationSec)));
    record = await lrclibFetch(`/get?${params.toString()}`);
  }

  if (!record) {
    return { lines: [], source: null, meta: { artist, track } };
  }

  const lines = parseLrc(record.syncedLyrics || '');
  return {
    lines,
    source: {
      id: record.id,
      trackName: record.trackName,
      artistName: record.artistName,
      hasWordSync: Boolean(lines.some((l) => l.words?.length)),
      instrumental: Boolean(record.instrumental),
    },
    meta: { artist, track },
  };
}
