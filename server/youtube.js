import { Innertube } from 'youtubei.js';

let ytPromise = null;

async function getYt() {
  if (!ytPromise) {
    ytPromise = Innertube.create().catch((err) => {
      ytPromise = null;
      throw err;
    });
  }
  return ytPromise;
}

const KARAOKE_SUFFIXES = ['伴奏', 'KTV', 'karaoke', '左伴右唱'];

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
  'https://pipedapi.reallyaweso.me',
];

/**
 * @param {string} query
 * @param {{ karaoke?: boolean, limit?: number }} [opts]
 */
export async function searchVideos(query, opts = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const karaoke = opts.karaoke !== false;
  const limit = Math.min(Math.max(opts.limit || 20, 1), 40);
  const searchQuery = karaoke
    ? `${q} ${KARAOKE_SUFFIXES[Math.floor(Math.random() * KARAOKE_SUFFIXES.length)]}`
    : q;

  const errors = [];

  try {
    const viaInnertube = await searchViaInnertube(searchQuery, limit);
    if (viaInnertube.length) return viaInnertube;
  } catch (err) {
    errors.push(`innertube: ${err?.message || err}`);
  }

  try {
    const viaHtml = await searchViaYoutubeHtml(searchQuery, limit);
    if (viaHtml.length) return viaHtml;
  } catch (err) {
    errors.push(`html: ${err?.message || err}`);
  }

  try {
    const viaPiped = await searchViaPiped(searchQuery, limit);
    if (viaPiped.length) return viaPiped;
  } catch (err) {
    errors.push(`piped: ${err?.message || err}`);
  }

  throw new Error(errors.join(' | ') || '所有搜尋來源皆失敗');
}

async function searchViaInnertube(searchQuery, limit) {
  const yt = await getYt();
  const result = await yt.search(searchQuery, { type: 'video' });
  const videos = [];

  for (const item of result.videos || []) {
    const mapped = mapInnertubeVideo(item);
    if (mapped) videos.push(mapped);
    if (videos.length >= limit) break;
  }

  if (videos.length === 0 && result.results) {
    for (const item of result.results) {
      const mapped = mapInnertubeVideo(item);
      if (mapped) videos.push(mapped);
      if (videos.length >= limit) break;
    }
  }

  return videos;
}

function mapInnertubeVideo(item) {
  const id = item?.id || item?.video_id;
  const title = item?.title?.text || item?.title?.toString?.() || '';
  if (!id || !title) return null;
  return {
    videoId: id,
    title,
    channel: item.author?.name || item.author?.text || '',
    thumbnail:
      item.thumbnails?.[item.thumbnails.length - 1]?.url ||
      item.best_thumbnail?.url ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: item.duration?.text || item.duration?.seconds || null,
  };
}

async function searchViaYoutubeHtml(searchQuery, limit) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&sp=EgIQAQ%253D%253D`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`YouTube HTML ${res.status}`);
  const html = await res.text();
  const match =
    html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/s) ||
    html.match(/ytInitialData\s*=\s*(\{.+?\});<\/script>/s);
  if (!match) throw new Error('ytInitialData not found');

  const data = JSON.parse(match[1]);
  const found = [];
  walk(data, (node) => {
    const v = node.videoRenderer;
    if (!v?.videoId) return;
    const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
    if (!title) return;
    found.push({
      videoId: v.videoId,
      title,
      channel: v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || '',
      thumbnail:
        v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.lengthText?.simpleText || null,
    });
  });

  // de-dupe
  const seen = new Set();
  const unique = [];
  for (const item of found) {
    if (seen.has(item.videoId)) continue;
    seen.add(item.videoId);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node.videoRenderer) visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}

async function searchViaPiped(searchQuery, limit) {
  let lastErr;
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`${base} ${res.status}`);
      const data = await res.json();
      const items = data.items || data;
      if (!Array.isArray(items)) throw new Error('bad piped payload');
      return items
        .filter((x) => x.type === 'stream' || x.url?.includes('watch'))
        .slice(0, limit)
        .map((x) => {
          const videoId =
            x.id ||
            String(x.url || '').match(/[?&]v=([\w-]{11})/)?.[1] ||
            String(x.url || '').replace('/watch?v=', '');
          return {
            videoId,
            title: x.title || '',
            channel: x.uploaderName || x.uploader || '',
            thumbnail: x.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: x.duration || x.uploadedDate || null,
          };
        })
        .filter((x) => x.videoId && x.title);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('piped failed');
}

export { KARAOKE_SUFFIXES };
