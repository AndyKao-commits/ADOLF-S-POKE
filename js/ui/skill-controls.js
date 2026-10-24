/* ============ skill-controls.js — botones de ataque a la derecha ============
 * Cada dedo lleva su pointerId. El de la izquierda puede seguir en el joystick.
 */
G.SkillControls = (() => {
  let cv = null;

  function local(e) {
    const r = cv.getBoundingClientRect();
    const sx = r.width ? cv.width / r.width : 1;
    const sy = r.height ? cv.height / r.height : 1;
    return {
      pointerId: e.pointerId, button: e.button,
      x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy
    };
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
    cv.addEventListener('contextmenu', e => {
      if (G.Siege && G.Siege.up) e.preventDefault();
    });
  }

  function draw() {
    // El asedio pinta los huecos en abanico dentro del HUD. Esta columna ya no sale.
  }

  return { init, draw };
})();
