/* ============ aim-preview.js — vista previa del ataque ============
 * Se dibuja en el mundo y no recibe toques. No decide el golpe.
 */
G.AimPreview = (() => {
  function toScreen(x, y) {
    const c = G.Camera;
    return { x: (x - c.left()) * c.scale, y: (y - c.top()) * c.scale };
  }

  function color(over, cancelled) {
    if (cancelled) return 'rgba(180,190,210,.35)';
    return over ? '#ff5f6d' : '#3ec6ff';
  }

  function draw(ctx) {
    if (!G.SkillAim) return;
    const list = G.SkillAim.previews();
    if (!list.length) return;
    const k = G.Camera.scale;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const row of list) {
      const a = row.aim, p = row.prof;
      const col = color(a.over, row.cancelled);
      ctx.globalAlpha = row.cancelled ? 0.35 : 0.9;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      const o = toScreen(a.point.x - a.dir.x * a.dist, a.point.y - a.dir.y * a.dist);
      const t = toScreen(a.point.x, a.point.y);
      if (p.aimType === 'line') {
        ctx.lineWidth = Math.max(6, (p.effectRadius || 16) * k * 0.35);
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      } else if (p.aimType === 'cone') {
        const ang = Math.atan2(a.dir.y, a.dir.x);
        const half = ((p.coneAngle || 45) * Math.PI / 180) / 2;
        const len = Math.max(8, a.dist || p.castRange) * k;
        ctx.globalAlpha = row.cancelled ? 0.22 : 0.35;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.arc(o.x, o.y, len, ang - half, ang + half);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = row.cancelled ? 0.35 : 0.9;
        ctx.stroke();
      } else if (p.aimType === 'circle') {
        const r = (p.effectRadius || 70) * k;
        ctx.globalAlpha = row.cancelled ? 0.2 : 0.28;
        ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = row.cancelled ? 0.35 : 0.85;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, Math.max(8, p.castRange * k), 0, 6.2832); ctx.stroke();
        ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 6.2832); ctx.stroke();
      } else {
        const r = (p.effectRadius || 80) * k;
        ctx.globalAlpha = row.cancelled ? 0.2 : 0.28;
        ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = row.cancelled ? 0.35 : 0.9;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.2832); ctx.stroke();
      }
    }
    ctx.restore();
  }

  return { draw };
})();
