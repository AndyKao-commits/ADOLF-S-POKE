/* ============ modes.js — modo de la partida ============
 * Se elige en el menú (y lo publica el anfitrión de la sala).
 *   normal   la mazmorra de siempre
 *   shiny    sólo Pokémon shiny; misma cantidad y misma experiencia
 *   boss     sólo jefes, tres a la vez, y empiezas en el nivel 20
 *   castle   proteges un castillo que no se mueve
 *   siege    cada uno ataca el castillo de los demás
 */
G.Modes = (() => {
  const IDS = ['normal', 'shiny', 'boss', 'castle', 'siege'];
  const LIST = [
    ['normal', 'Mazmorra normal', 'Como siempre: hordas, jefes y experiencia.'],
    ['shiny', 'Sólo shinies', 'Sólo aparecen Pokémon shiny. La cantidad y la experiencia no cambian.'],
    ['boss', 'Desafío de jefes', 'Sólo aparecen jefes, tres a la vez. Empiezas en el nivel 20 para elegir ataques. La grieta sale antes, para poder fusionar.'],
    ['castle', 'Protege al cachorro', 'Oleadas del 1 al 50, cada vez más difíciles. Cada 10 oleadas sale un jefe: al vencerlo puedes fusionar ataques con un vínculo. Si el castillo cae, pierdes. Si limpias la 50, ganas.'],
    ['siege', 'Asedio', 'De 2 a 4 personas. Cada castillo invoca a sus monstruos, con un círculo de su color. Atacan a los otros castillos y jugadores, nunca a los suyos. Cada uno sube de nivel aparte. A los 3 minutos sale un jefe en el centro: sólo ataca jugadores, y la experiencia, las monedas y el objeto van según el daño. Quien no le pegue no recibe nada. Gana quien derriba un castillo. Solo, el castillo rival también invoca.']
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
