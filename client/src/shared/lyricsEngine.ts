import type { LyricLine, LyricWord } from './types';

export interface ActiveLyrics {
  index: number;
  current: LyricLine | null;
  next: LyricLine | null;
  progress: number; // 0..1 within current line
  words: Array<LyricWord & { active: boolean; filled: boolean }>;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Estimate char-by-char progress for line-level LRC using singing speed
 * learned from average ms/char across the whole track.
 */
export function estimateSpeedMsPerChar(lines: LyricLine[]): number {
  let chars = 0;
  let ms = 0;
  for (const line of lines) {
    const len = [...line.text.replace(/\s+/g, '')].length || line.text.length;
    const dur = Math.max(200, (line.endMs || 0) - line.startMs);
    if (len > 0 && dur < 20000) {
      chars += len;
      ms += dur;
    }
  }
  if (chars === 0) return 180;
  return clamp01Range(ms / chars, 60, 420);
}

function clamp01Range(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getActiveLyrics(
  lines: LyricLine[],
  positionSec: number,
  offsetMs = 0,
  speedMsPerChar?: number,
): ActiveLyrics {
  if (!lines.length) {
    return { index: -1, current: null, next: null, progress: 0, words: [] };
  }

  const t = positionSec * 1000 + offsetMs;
  let index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i].startMs) index = i;
    else break;
  }

  if (index < 0) {
    return { index: -1, current: null, next: lines[0], progress: 0, words: [] };
  }

  const current = lines[index];
  const next = lines[index + 1] || null;
  const lineDur = Math.max(1, (current.endMs || current.startMs + 4000) - current.startMs);
  const elapsed = t - current.startMs;
  const progress = clamp01(elapsed / lineDur);

  let words: ActiveLyrics['words'] = [];

  if (current.words?.length) {
    words = current.words.map((w, i) => {
      const nextStart = current.words![i + 1]?.startMs ?? current.endMs;
      const active = t >= w.startMs && t < nextStart;
      const filled = t >= w.startMs;
      return { ...w, active, filled };
    });
  } else {
    // Smooth estimate: fill characters from left to right
    const chars = [...current.text];
    const mspc = speedMsPerChar ?? estimateSpeedMsPerChar(lines);
    const filledCount = Math.min(chars.length, Math.floor(elapsed / mspc));
    let cursor = 0;
    words = chars.map((ch) => {
      const startMs = current.startMs + cursor * mspc;
      cursor += 1;
      const filled = filledCount >= cursor;
      const active = cursor - 1 === filledCount && filledCount < chars.length;
      return { text: ch, startMs, active, filled };
    });
  }

  return { index, current, next, progress, words };
}

export function renderHighlightedLine(active: ActiveLyrics): string {
  if (!active.current) return '';
  if (!active.words.length) return escapeHtml(active.current.text);
  return active.words
    .map((w) => {
      const cls = w.filled ? 'kw filled' : 'kw';
      return `<span class="${cls}${w.active ? ' active' : ''}">${escapeHtml(w.text)}</span>`;
    })
    .join('');
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
