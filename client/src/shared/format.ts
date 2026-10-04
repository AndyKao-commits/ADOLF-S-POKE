export function remoteJoinUrl(code: string): string {
  const url = new URL('/remote.html', window.location.origin);
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
