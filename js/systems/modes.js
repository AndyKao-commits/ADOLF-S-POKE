/* ============ modes.js — modo de la partida ============
 * Se elige en el menú (y lo publica el anfitrión de la sala).
 *   normal   la mazmorra de siempre
 *   shiny    sólo Pokémon shiny; misma cantidad y misma experiencia
 *   boss     sólo jefes, tres a la vez, y empiezas en el nivel 20
 *   castle   proteges un castillo que no se mueve
 *   siege    cada uno ataca el castillo de los demás
 */
G.Modes = (() => {
  const IDS = ['normal', 'shiny', 'boss', 'castle', 'siege', 'endless'];
  const LIST = [
    ['normal', 'Mazmorra normal', 'Como siempre: hordas, jefes y experiencia.'],
    ['shiny', 'Sólo shinies', 'Sólo aparecen Pokémon shiny. La cantidad y la experiencia no cambian.'],
    ['boss', 'Desafío de jefes', 'Sólo aparecen jefes, tres a la vez. Empiezas en el nivel 20 para elegir ataques. La grieta sale antes, para poder fusionar. El objeto sale a veces, no en cada jefe, para no parar todo el rato. Los jefes se fortalecen el doble de rápido.'],
    ['castle', 'Protege al cachorro', 'Oleadas del 1 al 50, cada vez más difíciles. Cada 10 oleadas sale un jefe: al vencerlo puedes fusionar ataques con un vínculo. Si el castillo cae, pierdes. Si limpias la 50, ganas.'],
    ['siege', 'Asedio', 'Duelo 1 contra 1. Los cuerpos nunca hacen daño: sólo los ataques confirmados. Cada castillo invoca sus tropas, el jefe aparece en el centro y no hay grietas. Gana quien destruya el castillo rival.'],
    ['endless', 'Mazmorra sin fin', 'No acaba en la Sentencia. Cada oleada cambia: especies juntas, élites, el ataque del jefe, el suelo, el lado por el que salen o la velocidad. La vida sólo sube un poco.']
  ];
  let cur = 'normal';

  function idOf(v) { return IDS.includes(v) ? v : 'normal'; }
  function lock(v) { cur = idOf(v); }
  function row(id) { return LIST.find(x => x[0] === idOf(id)) || LIST[0]; }

  /** Botones del menú o de la sala. */
  function mount(el, help, opt) {
    opt = opt || {};
    const mode = idOf(opt.mode);
    el.innerHTML = '';
    for (const [id, label] of LIST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = (opt.icons ? 'mode-row' : 'chip') + (id === mode ? ' on' : '');
      if (opt.icons) {
        b.innerHTML = `<span class="mode-ico" data-mode-ico="${id}"></span><span class="mode-lab"></span>`;
        b.querySelector('.mode-lab').textContent = label;
      } else b.textContent = label;
      b.disabled = !opt.editable;
      b.onclick = () => {
        if (!opt.editable || id === mode) return;
        G.Audio.sfx('click');
        if (opt.onPick) opt.onPick(id);
      };
      el.appendChild(b);
    }
    if (help) help.textContent = row(mode)[2];
  }

  return {
    IDS, LIST, lock, idOf, row, mount,
    get id() { return cur; },
    is(v) { return cur === v; }
  };
})();
