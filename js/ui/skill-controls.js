/* ============ skill-controls.js — botones de ataque a la derecha ============
 * Cada dedo lleva su pointerId. El de la izquierda puede seguir en el joystick.
 */
G.SkillControls = (() => {
  let cv = null;

  function local(e) {
    const r = cv.getBoundingClientRect();
    return { pointerId: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e) {
    if (!G.SkillAim) return;
    const p = local(e);
    if (!G.SkillAim.pointerDown(p)) return;
    e.preventDefault();
    e.stopPropagation();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* el dedo sigue por pointerId */ }
  }
  function move(e) {
    if (!G.SkillAim || !G.SkillAim.owned(e.pointerId)) return;
    G.SkillAim.pointerMove(local(e));
    e.preventDefault();
    e.stopPropagation();
  }
  function up(e) {
    if (!G.SkillAim || !G.SkillAim.owned(e.pointerId)) return;
    G.SkillAim.pointerUp(local(e));
    e.preventDefault();
    e.stopPropagation();
  }
  function cancel(e) {
    if (!G.SkillAim || !G.SkillAim.owned(e.pointerId)) return;
    G.SkillAim.pointerCancel(local(e));
  }

  function init(canvas) {
    cv = canvas;
    cv.addEventListener('pointerdown', down, true);
    cv.addEventListener('pointermove', move, true);
    cv.addEventListener('pointerup', up, true);
    cv.addEventListener('pointercancel', cancel, true);
  }

  function round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(ctx, w, h, pl) {
    if (!G.SkillAim || !pl) return;
    const list = G.SkillAim.layout(w, h, pl);
    if (!list.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const b of list) {
      const m = b.move;
      const cd = m.cd > 0 ? Math.max(0, m.t / (m.cd * Math.max(0.45, pl.cdMul || 1))) : 0;
      const col = (G.U.TYPE_COLOR && G.U.TYPE_COLOR[m.type]) || '#8fd4ff';
      round(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.fillStyle = 'rgba(10,18,36,.9)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = col;
      ctx.stroke();
      if (G.Icons) G.Icons.draw(ctx, 'move:' + m.id, b.x + (b.w - 32) / 2, b.y + (b.h - 32) / 2 - 2, 32);
      if (cd > 0) {
        ctx.save();
        round(ctx, b.x, b.y, b.w, b.h, 12);
        ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(b.x, b.y, b.w, b.h * Math.min(1, cd));
        ctx.restore();
        ctx.font = '800 13px Pixelify,"Segoe UI",sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(m.t.toFixed(1), b.cx, b.cy);
      }
    }
    ctx.restore();
  }

  return { init, draw };
})();
