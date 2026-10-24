/* Cosmetic Canvas effect. Caller supplies the verified partner tier; no progression logic. */
(function (root) {
  'use strict';
  const presets = Object.freeze({
    gold: Object.freeze({ color: '#fff2cc', alpha: 0.10, particles: 5, period: 3.2 }),
    diamond: Object.freeze({ color: '#ffd45a', alpha: 0.18, particles: 12, period: 2.6 })
  });
  function draw(ctx, options, layer) {
    const o = options || {}, p = presets[o.tier];
    if (!p || o.dead || o.visible === false || (layer !== 'behind' && layer !== 'front')) return;
    const x = o.x, y = o.y, w = o.width, h = o.height;
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return;
    const reduced = !!o.reducedMotion, low = o.quality === 'low';
    const time = Number.isFinite(o.time) ? o.time : 0;
    const seed = Number.isFinite(o.seed) ? o.seed : 0;
    const t = reduced ? 0 : time;
    const breath = reduced ? 1 : 0.84 + Math.sin(t * Math.PI * 2 / p.period) * 0.16;
    // Optional emphasis attenuation while hit/invulnerable; never increases opacity.
    const attenuation = Number.isFinite(o.attenuation) ? Math.min(1, Math.max(0, o.attenuation)) : 1;
    const originalFill = ctx.fillStyle, originalStroke = ctx.strokeStyle;
    ctx.save();
    try {
      const inheritedAlpha = ctx.globalAlpha;
      ctx.globalCompositeOperation = 'source-over';
      if (layer === 'behind') {
        for (let i = low ? 2 : 3; i >= 1; i--) {
          ctx.globalAlpha = inheritedAlpha * p.alpha * breath * attenuation / i;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(x, y - h * 0.43, w * (0.50 + i * 0.09), h * (0.43 + i * 0.04), 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (o.tier === 'diamond') {
          ctx.globalAlpha = inheritedAlpha * 0.22 * breath * attenuation;
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, Math.min(2, w / 40));
          ctx.beginPath(); ctx.ellipse(x, y, w * 0.65, Math.max(2, h * 0.10), 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (!reduced) {
        const count = low ? Math.ceil(p.particles / 3) : p.particles;
        const fract = v => v - Math.floor(v);
        const px = Math.max(1, Math.min(3, Math.round(w / 32)));
        ctx.fillStyle = p.color;
        for (let i = 0; i < count; i++) {
          const phase = fract(t / (2.2 + (i % 3) * 0.3) + i * 0.618 + seed * 0.137);
          const side = i % 2 ? 1 : -1;
          const sx = Math.round(x + side * w * (0.42 + 0.13 * Math.sin(i * 2.4 + phase * 3)));
          const sy = Math.round(y - h * (0.12 + phase));
          ctx.globalAlpha = inheritedAlpha * (o.tier === 'diamond' ? 0.65 : 0.38) * Math.sin(phase * Math.PI) * attenuation;
          ctx.fillRect(sx, sy, px, px);
          if (o.tier === 'diamond' && i % 3 === 0) {
            ctx.fillRect(sx - px, sy, px * 3, px); ctx.fillRect(sx, sy - px, px, px * 3);
          }
        }
      }
    } finally { ctx.restore(); ctx.fillStyle = originalFill; ctx.strokeStyle = originalStroke; }
  }
  root.PartnerAura = Object.freeze({ draw, presets });
})(typeof window !== 'undefined' ? window : globalThis);
