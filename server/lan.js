import os from 'node:os';

function isPrivateIpv4(ip) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    return n >= 16 && n <= 31;
  }
  return false;
}

/** LAN IPv4 addresses other devices on the same Wi‑Fi can reach. */
export function listLanHosts() {
  const nets = os.networkInterfaces();
  const hosts = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== 'IPv4' && entry.family !== 4) continue;
      if (entry.internal) continue;
      if (!isPrivateIpv4(entry.address)) continue;
      hosts.push(entry.address);
    }
  }
  // Prefer 192.168.* then 10.* then others
  hosts.sort((a, b) => {
    const rank = (ip) =>
      ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  return [...new Set(hosts)];
}
