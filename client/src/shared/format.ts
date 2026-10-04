function isLoopbackHost(hostname: string) {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
}

let cachedLanOrigin: string | null | undefined;

/**
 * Base origin phones should use to join.
 * If the tablet opened via localhost, prefer a LAN IP from the server so QR works.
 */
export async function getJoinOrigin(): Promise<string> {
  if (!isLoopbackHost(window.location.hostname)) {
    return window.location.origin;
  }
  if (cachedLanOrigin !== undefined) {
    return cachedLanOrigin || window.location.origin;
  }
  try {
    const res = await fetch('/api/lan-hosts');
    const data = await res.json();
    const host = data.hosts?.[0] as string | undefined;
    if (!host) {
      cachedLanOrigin = null;
      return window.location.origin;
    }
    // In Vite dev, pages are on 5173 and proxy API/socket; in production, same PORT as API.
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    cachedLanOrigin = `${window.location.protocol}//${host}:${port}`;
    return cachedLanOrigin;
  } catch {
    cachedLanOrigin = null;
    return window.location.origin;
  }
}

export async function remoteJoinUrl(code: string): Promise<string> {
  const origin = await getJoinOrigin();
  const url = new URL('/remote.html', origin);
  url.searchParams.set('room', code);
  return url.toString();
}

export function qrImageUrl(text: string): string {
  return `/api/qr?text=${encodeURIComponent(text)}`;
}

export function shortTitle(title: string, max = 48) {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

export function randomGuestName() {
  const n = Math.floor(10 + Math.random() * 90);
  return `訪客${n}`;
}
