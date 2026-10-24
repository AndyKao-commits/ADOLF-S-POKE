/* ============ changelog.js — novedades del juego ============
 * Lo que ve la gente en el botón "Novedades" de la barra de arriba: cambios
 * de juego y fallos arreglados (nada de servidores ni bases de datos).
 * La fecha más nueva, arriba. En cada fecha, por apartados:
 *   new  lo nuevo · chg  cambios y ajustes · fix  fallos arreglados
 * Cada línea en español y en inglés.
 */
G.CHANGELOG = [
  { d: '2026-10-25', title: ['Grupo', 'Group'], fix: [
    ['En el grupo, Revivir y Revivir Máximo te levantan una vez al caer. En el asedio no.',
     'In a group, Revive and Max Revive get you up once when you fall. In siege they do not.'],
    ['Si alguien abre la tienda, la partida se para para todos: jugadores y monstruos.',
     'If anyone opens the shop, the run pauses for everyone: players and monsters.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], chg: [
    ['En el asedio eliges el ataque con 1–4 y lo lanzas con el ratón. No se dispara solo, y el cuerpo no hiere.',
     'In siege you pick a move with 1–4 and cast it with the mouse. It does not fire by itself, and bumping does not hurt.'],
    ['En el móvil el asedio se apunta arrastrando el ataque. En el ordenador se apunta con el ratón, sin cursor virtual.',
     'On a phone, siege aiming is a drag from the move. On a computer it uses the mouse, with no virtual cursor.'],
    ['En el móvil, un toque al ataque lo lanza al enemigo más cercano. Arrastrarlo sigue apuntando a mano.',
     'On a phone, tapping a move casts it at the nearest enemy. Dragging it still aims by hand.'],
    ['En el asedio, Giro Fuego daña donde lo apuntas. Las tropas caen con los ataques, y un castillo aguanta unos 3 minutos.',
     'In siege, Fire Spin hurts where you aim it. Troops fall to attacks, and a castle lasts about 3 minutes.'],
    ['En el ordenador el asedio se lanza con el ratón aunque la pantalla también sea táctil.',
     'On a computer, siege still casts with the mouse even if the screen is also a touch screen.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], chg: [
    ['En el asedio no hay mapa en la esquina. Los ataques rodean el sprint en abanico y su tamaño sigue la pantalla.',
     'In siege there is no corner map. Moves fan around the dash and their size follows the screen.'],
    ['Si el jefe o una tropa derriba al rival, no hay experiencia. Sólo quien lo tumba con su propio ataque cobra.',
     'If the boss or a creep downs the rival, there is no experience. Only the player who lands the killing blow is paid.']
  ] },
  { d: '2026-10-24', title: ['Sala', 'Room'], chg: [
    ['En una sala, el modo normal puede elegir Corriente, Difícil, Reto o Pesadilla. Debajo del modo ya no hay un texto largo.',
     'In a room, Normal can choose Standard, Hard, Challenge or Nightmare. The long text under the mode is gone.']
  ] },
  { d: '2026-10-24', title: ['Mapa', 'Map'], fix: [
    ['Las miniaturas del mapa conservan su proporción y no se deforman.',
     'Map thumbnails keep their shape and are not stretched.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], fix: [
    ['En el asedio, un disparo que sale de la pantalla sigue hiriendo al rival y a sus monstruos.',
     'In siege, a shot that leaves the screen still hurts the rival and their monsters.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], chg: [
    ['El asedio en sala es un duelo de 2. Chocar no hiere: sólo los ataques confirmados. Al caer, reapareces a los 5 s y no miras a un compañero.',
     'A room siege is a 2-player duel. Bumping does not hurt: only confirmed attacks do. When you fall, you return in 5 s and do not watch a teammate.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], fix: [
    ['En el asedio un ataque no hiere a quien lo lanza, y sí al rival. Alrededor de cada castillo no hay cobertura. En el asedio no se abren grietas.',
     'In siege, an attack does not hurt the one who casts it, and it does hurt the rival. There is no cover around each castle. Siege does not open rifts.']
  ] },
  { d: '2026-10-24', title: ['Mapa y gacha', 'Map and gacha'], fix: [
    ['La cuadrícula del mapa se puede bajar cuando no cabe. El botón de tirar ×100 sale en el idioma del juego.',
     'The map grid can scroll when it does not fit. The ×100 pull button uses the game language.']
  ] },
  { d: '2026-10-24', title: ['Marcador', 'Results'], chg: [
    ['El marcador enseña el modo, el mapa, la dificultad, el daño y los caramelos. El récord de un jugador, el de un grupo y el del asedio se guardan aparte. La tienda no cobra si faltan caramelos o el objeto está al tope.',
     'The results show the mode, map, difficulty, damage and candy. Solo, group and siege records are kept apart. The shop does not charge when candy is short or the item is at its cap.']
  ] },
  { d: '2026-10-24', title: ['Mazmorra sin fin', 'Endless dungeon'], new: [
    ['La mazmorra sin fin no llama a Arceus. Cada oleada cambia el peligro y la vida sólo sube un poco. El récord se guarda aparte.',
     'The endless dungeon does not call Arceus. Each wave changes the danger and HP only rises a little. The record is kept apart.']
  ] },
  { d: '2026-10-24', title: ['Menú', 'Menu'], chg: [
    ['El menú abre el modo, el mapa y la dificultad en una cuadrícula. El asedio no enseña la dificultad de un jugador. El mapa nuevo empieza al azar.',
     'The menu opens mode, map and difficulty in a grid. Siege does not show the solo difficulty. A new game starts on a random map.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], chg: [
    ['En el asedio en línea el anfitrión confirma cada ataque, cada caramelo y el premio del jefe. Si alguien se corta, su personaje espera 10 s. Si se va el anfitrión, la partida termina.',
     'In online siege the host confirms every attack, every candy pickup and the boss reward. If someone drops, their character waits 10 s. If the host leaves, the match ends.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], chg: [
    ['En el asedio los ataques de la derecha se lanzan con un toque, o manteniendo y arrastrando. Volver al centro del botón cancela sin gastar la recarga.',
     'In siege, the attacks on the right fire with a tap, or by holding and dragging. Dragging back to the button center cancels without using the cooldown.']
  ] },
  { d: '2026-10-24', title: ['Dificultad', 'Difficulty'], chg: [
    ['Difícil, Reto y Pesadilla de un jugador suben menos la vida, bajan las curas y cambian élites y ataques. El asedio no usa estos números.',
     'Solo Hard, Challenge and Nightmare raise HP less, lower healing, and change elites and attacks. Siege does not use these numbers.']
  ] },
  { d: '2026-10-24', title: ['Asedio', 'Siege'], new: [
    ['El jefe del centro del asedio sale a los 90 s, hasta tres veces, y no usa la dificultad de un jugador. Quien participe se lleva experiencia y caramelos según el daño.',
     'The siege center boss appears at 90 seconds, up to three times, and it does not use the solo difficulty. People who take part get XP and candy based on the damage.']
  ] },
  { d: '2026-10-24', title: ['Caramelos', 'Candy'], new: [
    ['En la partida caen caramelos azules. Sirven para la tienda de Meowth y las Poké Balls de pago, y al terminar se pierden. Las Pokémonedas del menú siguen igual.',
     'Blue candy drops during a run. It pays for Meowth\'s shop and the paid Poké Balls, and it is gone when the run ends. Menu PokéCoins stay the same.']
  ] },
  { d: '2026-10-24', title: ['Maestría', 'Mastery'], new: [
    ['Bronce, plata, oro y diamante se ven en la partida: un anillo, polvo, un brillo suave o un aura dorada. Solo es visual: no cambia el daño, la vida ni la velocidad.',
     'Bronze, silver, gold and diamond show in the run: a ring, dust, a soft glow or a gold aura. It is only visual: it does not change damage, HP or speed.']
  ] },
  { d: '2026-10-24', title: ['Objetos', 'Items'], chg: [
    ['Los objetos repetidos ya no multiplican el efecto entero. Los básicos rinden menos desde la segunda copia, y los de tipo dan +20 % y +2 % la primera y luego +5 % y +1 %. Revivir, Revivir Máximo y Reponerse comparten un solo levantamiento por partida. La suerte de las mejoras y la de los objetos es la misma.',
     'Repeated items no longer multiply the whole effect. Basic ones fall off from the second copy, and type items give +20% and +2% first, then +5% and +1%. Revive, Max Revive and Revival share one get-up per run. Upgrade luck and item luck are the same luck.']
  ] },
  { d: '2026-10-24', title: ['Dificultad', 'Difficulty'], chg: [
    ['Difícil, Reto y Pesadilla ya cambian la partida: los enemigos tienen más vida, pegan más fuerte y salen más a menudo. Difícil es ×1,5, ×1,25 y ×1,2. Reto es ×2, ×1,55 y ×1,4. Pesadilla es ×2,8, ×1,9 y ×1,65. Corriente se queda igual. Cada una sigue con su ranking.',
     'Hard, Challenge and Nightmare now change the run: enemies have more HP, hit harder and show up more often. Hard is ×1.5, ×1.25 and ×1.2. Challenge is ×2, ×1.55 and ×1.4. Nightmare is ×2.8, ×1.9 and ×1.65. Normal stays the same. Each one still has its own ranking.']
  ] },
  { d: '2026-10-24', title: ['Sentencia, esferas y gacha', 'Judgment, orbs and gacha'], new: [
    ['Esferas de Mundo Misterioso durante la partida: Soporesfera, Ralentosfera, Rafagaesfera, Focosfera, Luminosfera y Rapidosfera. Las sueltan los jefes y, a veces, un Pokémon. Llevas hasta 4 tipos y 3 de cada. Se usan con 5-8, tocando su casilla, o con Y en el mando.',
     'Mystery Dungeon orbs during the run: Slumber, Slow, Blowback, Focus, Luminous and Quick. Bosses drop them, and sometimes a regular Pokémon does too. You hold up to 4 kinds, 3 of each. Use them with 5-8, by tapping the slot, or with Y on a controller.'],
    ['Amuleto Iris: al completar la Pokédex de una generación, legendarios incluidos, los shiny de ese banner salen al 2 % en vez del 1 %.',
     'Shiny Charm: finish a generation Pokédex, legendaries included, and that banner\'s shinies come out at 2% instead of 1%.'],
    ['Tirada ×100 en el gacha, con 100 tickets o con 10 tickets ×10. La ×1 y la ×10 siguen. Se puede saltar la animación.',
     'A ×100 pull in the gacha, for 100 tickets or 10 ×10 tickets. ×1 and ×10 stay. The animation can be skipped.']
  ], chg: [
    ['Sentencia de Arceus: ahora se le puede hacer daño, cada vez menos. Lleva una tabla al azar. Cada legendario tiene un 25 % más de vida y un 15 % más de daño que el anterior, no el doble. En el minuto 35 se rompen los objetos de la partida, Banda Focus incluida. El veneno y las quemaduras quitan poco y siempre lo mismo a esos legendarios.',
     'Arceus\'s Judgment: you can damage it now, less and less over time. It holds a random Plate. Each legendary has 25% more HP and 15% more damage than the one before, not double. At minute 35 the run\'s items break, Focus Sash included. Poison and burns deal a small, fixed amount to those legendaries.'],
    ['Puño Meteoro pega menos: 24 de daño y una zona un poco más pequeña, para quedar a la par de Avalancha al máximo.',
     'Meteor Mash hits softer: 24 damage and a slightly smaller area, so at max it matches Rock Slide.'],
    ['Un movimiento evolucionado se llama igual y añade un +.',
     'An evolved move keeps its name and adds a +.']
  ] },
  { d: '2026-10-24', title: ['Mejoras', 'Upgrades'], chg: [
    ['Suerte, Saltar, Cuarta carta, Reponerse y Sellar ya hacen lo que dice su carta. Suerte sube la rareza de los objetos de las Poké Balls. Saltar deja pasar una carta de nivel. Cuarta carta ofrece 4. Reponerse te levanta una vez con el 50 % de vida. Sellar quita de las Poké Balls y del puesto los objetos que elijas.',
     'Luck, Skip, Fourth card, Revival and Seal now do what their cards say. Luck raises the rarity of Poké Ball items. Skip passes a level-up card. Fourth card offers 4. Revival gets you up once at 50% HP. Seal removes the items you choose from Poké Balls and the stall.']
  ], fix: [
    ['Al volver a levantarte tras caer, 1,5 s no recibes daño: ni golpes, ni trampas, ni lava, ni explosiones.',
     'After you get back up from a fall, you take no damage for 1.5 s: not hits, traps, lava or explosions.']
  ] },
  { d: '2026-10-23', title: ['Barras y mapa', 'Bars and the map'], new: [
    ['En el mapa salen Poké Balls de pago. Te acercas y pulsas E: la primera cuesta 30 monedas de la partida y luego 33, 39, 45, 51… Si no llegas, no se abre. Al pagarla eliges 1 de 3 objetos, como con la bola roja.',
     'Paid Poké Balls appear on the map. Walk up and press E: the first costs 30 run coins, then 33, 39, 45, 51… If you are short, it does not open. After you pay, you pick 1 of 3 items, as with the red ball.'],
    ['A veces sale una bola maldita. E la usa sin pagar y aparecen élites cerca, un poco más fuertes. Si acabas con esa oleada, cae una bola azul gratis. Si caes antes, no.',
     'Sometimes a cursed ball appears. E uses it for free and elites show up nearby, a little stronger. Clear that wave and a free blue ball drops. If you fall first, it does not.'],
    ['Los huevos del suelo usan el dibujo del huevo de la suerte. Junto a cada puesto hay un Meowth. En el menú, tu compañero sale en un marco, con el nombre debajo y sus tipos bajo el nombre.',
     'Eggs on the ground use the lucky egg picture. A Meowth stands beside each stall. On the menu, your partner sits in a frame, with the name under it and its types under the name.'],
    ['Los huevos que caen al derrotar Pokémon son huevos de incubar: común, raro, legendario o épico, según el rival. No es el objeto Huevo Suerte. Se cogen al pasar y se guardan abajo. En la incubadora hay 3 huecos. Al meter un huevo le toca una sola condición al azar: 2000 pasos, 2000 derrotas o 30 objetos. Se abre cuando tú pulsas.',
     'Eggs dropped by defeating Pokémon are hatching eggs: common, rare, legendary or epic, matching the foe. This is not the Lucky Egg item. Walk over them and they go into the bag below. The incubator has 3 slots. Placing an egg rolls one condition: 2000 steps, 2000 defeats or 30 items. It opens when you press.'],
    ['Lo que sale de un huevo suma un 5 % a la investigación de esa especie. Al 100 % se convierte en un fragmento. Dos fragmentos suben una estrella, hasta 4. Derrotar también llena la investigación: 40 veces un común, 80 un poco común, 150 un raro y 300 un épico. Un legendario sólo cuenta en la grieta, y cada vez suma un 34 %.',
     'What hatches adds 5% to that species\' research. At 100% it becomes a fragment. Two fragments raise one star, up to 4. Defeats fill research too: 40 for a common, 80 for an uncommon, 150 for a rare and 300 for an epic. A legendary only counts in the rift, and each defeat adds 34%.'],
    ['Cada estrella refuerza a esa especie cuando sale de compañero: daño +3 % y PS máximos +3 %. Con 4 estrellas es +12 % y +12 %.',
     'Each star reinforces that species when it is your partner: damage +3% and max HP +3%. At 4 stars that is +12% and +12%.'],
    ['En Investigación quedan Todos, Tengo, Me faltan y Shiny. Hasta completar la investigación una vez, el Pokémon sale en negro. En Maestría no se muestra la ficha de la derecha.',
     'Research keeps All, Owned, Missing and Shiny. Until you finish the research once, the Pokémon is shown in black. Mastery no longer shows the card on the right.'],
    ['La ficha del Pokémon ocupa toda la columna derecha. Las regiones y los filtros se desplazan de lado si no caben.',
     'The Pokémon card fills the whole right column. Regions and filters scroll sideways when they do not fit.'],
    ['Cada compañero tiene maestría. Jugar con él suma 10 por partida, 1 por cada 100 derrotas, 5 por minuto de su mejor tiempo y 15 por evolución. Bronce, plata, oro y diamante (100, 400, 1200 y 2000) son un recuerdo: no cambian la partida.',
     'Each partner has mastery. Playing as them adds 10 per run, 1 per 100 defeats, 5 per minute of their best time and 15 per evolution. Bronze, silver, gold and diamond (100, 400, 1200 and 2000) are a keepsake: they do not change the run.']
  ], chg: [
    ['Veto, Suerte, Saltar, Cuarta carta, Reponerse y Sellar ya se compran. El primer nivel cuesta 300, 140, 80, 3000, 5000 y 800. El siguiente cuesta 570, 200, 120 y 1280.',
     'Ban, Luck, Skip, Fourth card, Revival and Seal can now be bought. The first level costs 300, 140, 80, 3000, 5000 and 800. The next costs 570, 200, 120 and 1280.'],
    ['El ranking separa Corriente, Difícil, Reto y Pesadilla. Cada una tiene sus marcas.',
     'The ranking splits Normal, Hard, Challenge and Nightmare. Each one has its own records.'],
    ['Una partida con muchas derrotas o un nivel muy alto también entra en el ranking, si es la mejor marca.',
     'A run with many defeats or a very high level still enters the ranking, when it is the best record.'],
    ['Los huevos de incubar caen menos: común 0,8 %, poco común y raro 0,5 %, épico 0,3 % y legendario 0,4 %.',
     'Hatching eggs drop less often: common 0.8%, uncommon and rare 0.5%, epic 0.3% and legendary 0.4%.'],
    ['Un Pokémon normal suelta una Poké Ball el 0,2 % de las veces. Los jefes y los cofres también sueltan objeto menos a menudo.',
     'A normal Pokémon drops a Poké Ball 0.2% of the time. Bosses and chests also drop an item less often.'],
    ['Arriba a la izquierda, la vida es la barra verde de rayas y la experiencia es la barra azul. El relleno sigue la vida y la experiencia de la partida.',
     'At the top left, HP is the striped green bar and experience is the blue bar. The fill follows this run\'s HP and experience.'],
    ['La tienda del mapa es el puesto de rayas rojas y blancas. Las Poké Balls del suelo son la roja, la azul y la amarilla.',
     'The shop on the map is the red and white stall. The Poké Balls on the ground are the red, the blue and the yellow one.'],
    ['Los objetos de la partida usan los iconos nuevos. Cada uno hace lo que dice su ficha: el daño, la vida, la suerte y el resto salen de esa lista, y ya no valen los efectos viejos.',
     'Items in a run use the new icons. Each one does what its card says: damage, HP, luck and the rest come from that list, and the old effects no longer apply.'],
    ['Arriba, el tiempo, el mapa, las derrotas y las monedas van en una placa oscura para que se lean.',
     'At the top, the time, the map, the defeats and the coins sit on a dark plate so they are easy to read.'],
    ['El menú principal junta la salida, el compañero y la sala. Abajo están todas las opciones. El modo y el mapa se eligen en un panel.',
     'The main menu groups the setup, the partner and the room. Every option sits along the bottom. Mode and map open in a panel.'],
    ['En el menú, el compañero ya no se aplasta y la sala se ve entera, sin barra de desplazamiento.',
     'On the menu, the partner is no longer squashed and the room shows in full, with no scrollbar.'],
    ['El título del menú es el dibujo de 小柯 Survivor, con 小柯與他的朋友 debajo.',
     'The menu title is the 小柯 Survivor picture, with 小柯與他的朋友 under it.'],
    ['Los paneles del menú dejan ver el mapa de fondo. La carga, el toque para empezar y la tarjeta al compartir usan el mismo dibujo.',
     'The menu panels let the map show through. Loading, tap to start and the share card use the same picture.'],
    ['En el menú, el título queda arriba a la derecha sin tapar la sala. La salida y la sala ocupan su columna, el compañero se ve más grande y el progreso del compañero sale de la página principal.',
     'On the menu, the title sits at the top right and no longer covers the room. Setup and the room fill their columns, the partner is larger, and partner progress leaves the main page.'],
    ['Los cuadros del menú sólo ocupan su contenido y dejan ver el mapa. En el móvil en vertical van en una columna; en horizontal, tres columnas si caben.',
     'Menu panels are only as tall as their contents, so the map stays visible. A phone in portrait uses one column; sideways, three columns when they fit.'],
    ['El Meowth de cada puesto mira de frente.',
     'The Meowth at each stall faces the front.'],
    ['Junto a un puesto, E (o el botón E de la derecha) abre la tienda de Meowth. Vende 3 objetos de la partida. Cada compra sube los precios 3 monedas, y cambiar el género cuesta 15.',
     'Next to a stall, E (or the E button on the right) opens Meowth\'s shop. It sells 3 items for this run. Each purchase raises prices by 3 coins, and refreshing the stock costs 15.'],
    ['El golpe crítico de las mejoras hace ×1,75 de daño. Cinco mejoras nuevas aparecen en la lista, pero aún no tienen precio y no se pueden comprar.',
     'The critical-hit upgrade deals ×1.75 damage. Five new upgrades show in the list, but they have no price yet and cannot be bought.'],
    ['Las Poké Balls salen un tercio de lo de antes. Vale para la roja, la azul y la amarilla: un Pokémon normal, un jefe y los cofres.',
     'Poké Balls drop one third as often. That goes for the red, the blue and the yellow one: a normal Pokémon, a boss and the chests.'],
    ['En Amigos, el punto verde ya no sale en todo el mundo. Verde es quien tiene el juego abierto; gris es quien no está.',
     'In Friends, the green dot is no longer on everyone. Green means the game is open; grey means they are not.']
  ], fix: [
    ['En la colección no se dibuja la barra de desplazamiento. Las regiones, los filtros y la ficha se siguen moviendo igual.',
     'The collection no longer draws scrollbars. Regions, filters and the card still move the same way.'],
    ['En la ficha de la colección, la imagen sube junto con el resto: se puede ver la vida, el ataque y las estrellas.',
     'On the collection card, the picture scrolls up with the rest, so HP, attack and the stars can be seen.'],
    ['En la leyenda del mapa, las marcas de las Poké Balls tapaban la palabra. Cada cosa queda ahora en su sitio, y en el mapa se ven más grandes.',
     'In the map legend, the Poké Ball marks covered the words. Each mark now stays in its place, and the marks on the map are larger.'],
    ['Si dos redes no se ven directamente, la sala ya no se queda en «conectando». A los pocos segundos sigue por el servidor y se puede empezar.',
     'If two networks cannot see each other directly, the room no longer stays on "connecting". After a few seconds it continues through the server and you can start.']
  ] },
  { d: '2026-10-22', title: ['Elige la región', 'Choose the region'], new: [
    ['Antes de una partida en solitario eliges una de las nueve regiones. El mapa cambia y los Pokémon salvajes de esa partida son los de esa región. En una sala se sigue usando el mapa de siempre.',
     'Before a solo run you choose one of the nine regions. The map changes, and the wild Pokémon in that run are the ones from that region. A co-op room still uses the original map.'],
    ['Pulsas Espacio (o el botón de abajo a la derecha) y das un paso largo hacia donde te mueves. Tarda un momento en poder repetirse.',
     'Press Space (or the button at the bottom right) and you dash the way you are moving. It needs a moment before you can do it again.'],
    ['Los Pokémon sueltan monedas, huevos y Poké Balls. Las monedas y los huevos se cogen al pasar por encima. Una bola para la partida y eliges 1 de 3 objetos: la normal, la super y la ultra no ofrecen lo mismo. Puedes llevar varios a la vez.',
     'Pokémon drop coins, eggs and Poké Balls. Coins and eggs are picked up by walking over them. A ball pauses the run and you choose 1 of 3 items: a normal, super and ultra ball do not offer the same things. You can hold several at once.'],
    ['Arriba a la derecha hay un radar: huevos, enemigos, bolas y tiendas. En grupo, los compañeros salen de otro color.',
     'A radar at the top right shows eggs, enemies, balls and shops. In a group, teammates use another color.'],
    ['M (o el radar) abre el mapa de la zona y pausa la partida. Ahí se ven huevos, enemigos, bolas, tiendas y, en grupo, los compañeros.',
     'M (or the radar) opens the area map and pauses the run. It shows eggs, enemies, balls, shops and, in a group, teammates.'],
    ['Cada ataque que aprendes empieza encendido y se lanza junto con los demás. Tócalo otra vez (o pulsa su número) para apagarlo.',
     'Each move you learn starts on and fires along with the others. Tap it again (or press its number) to turn it off.']
  ], chg: [
    ['El texto bajo el botón de jugar ya no describe el modo. Vale para los cinco modos, también en la sala.',
     'The line under the play button no longer describes the mode. That goes for all five modes, including in a room.'],
    ['Arriba a la izquierda sale la cara del Pokémon con el que juegas, el nivel en un círculo, la vida en una barra verde y la experiencia debajo.',
     'The top left shows the face of the Pokémon you are playing, the level in a circle, HP on a green bar and experience under it.'],
    ['Los objetos que coges se quedan todos y se apilan. Salen bajo la barra de experiencia, y ya no hay un hueco de objeto junto a los ataques.',
     'Items you pick up all stay and stack. They show under the experience bar, and the item slot next to your moves is gone.'],
    ['En el mapa cada cosa tiene su marca: punto rojo el enemigo, punto rojo más grande el jefe, óvalo el huevo, bola verde, azul o morada, caseta la tienda y rombo el compañero.',
     'On the map each thing has its own mark: a red dot for an enemy, a bigger red dot for a boss, an oval for an egg, a green, blue or purple ball, a stall for a shop and a diamond for a teammate.']
  ], fix: [
    ['En la pantalla de elegir región, «Empezar» y «Volver» no hacían nada.',
     'On the region screen, Start and Back did nothing.'],
    ['El modo elegido se queda marcado. El mapa de la región sólo se elige en la mazmorra normal; los demás modos entran directo.',
     'The mode you pick stays selected. The region map is only chosen for the normal dungeon; the other modes start straight away.']
  ] },
  { d: '2026-10-21', title: ['La gran actualización: Tienda Kecleon', 'The big update: Kecleon Shop'], new: [
    ['Mejora nueva: Tienda Kecleon (botón en el menú) con Mentas, Cápsulas Habilidad y 8 MT nuevas cada día. Cada Pokémon tiene ahora su naturaleza (±10 % a dos stats) y su habilidad, con efecto en la partida; se ven y se cambian en su ficha de la colección. Las MT enseñan para siempre ataques de fuera de sus tipos, pero sólo si los aprende en los juegos (Mewtwo puede aprender Bola Sombra; Psyduck no puede aprender Lanzallamas). Gracias a TheAdro7 por la idea y el trabajo de base.',
     'New: the Kecleon Shop (button in the menu) with Mints, Ability Capsules and 8 new TMs every day. Every Pokémon now has its own nature (±10% to two stats) and ability, with an effect in the run; you can see and change them on its page in the collection. TMs permanently teach moves outside its types, but only if it learns them in the games (Mewtwo can learn Shadow Ball; Psyduck cannot learn Flamethrower). Thanks to TheAdro7 for the idea and the groundwork.'],
    ['Mejora nueva, Segundo movimiento inicial: con Repertorio, se compra una vez por Pokémon y luego eliges gratis el segundo ataque con el que empiezas (o lo dejas al azar).',
     'New upgrade, Second starting move: with Repertoire, buy it once per Pokémon and then choose for free the second move you start with (or leave it random).'],
    ['Cooperativo: si caes, puedes mirar a un compañero que siga en pie mientras esperas a que te levanten. Pulsa el botón que sale debajo del aviso (o Q / E, o LB / RB en el mando) para pasar de uno a otro y volver a ti. Sólo cambia la cámara: no gasta más conexión.',
     'Co-op: if you go down, you can watch a teammate who is still standing while you wait to be revived. Press the button under the message (or Q / E, or LB / RB on a controller) to switch between them and back to yourself. Only the camera changes: it uses no extra connection.']
  ], fix: [
    ['Guardado en la nube: si jugabas en un aparato y guardabas, otro aparato con el juego abierto desde antes podía subir su copia vieja encima (al guardar o al actualizarse el juego) y en el otro no aparecían tus tickets ni tus Pokémon nuevos. Ahora, si la nube tiene algo más nuevo, se junta con lo tuyo antes de guardar y no se pierde nada.',
     'Cloud save: if you played and saved on one device, another device that still had the game open could upload its old copy over it (when saving or when the game updated), and your new tickets and Pokémon did not show up on the other one. Now, if the cloud has something newer, it is merged with yours before saving and nothing is lost.']
  ] },
  { d: '2026-10-20', title: ['Cooperativo más seguro y arreglos de ataques', 'Safer co-op and move fixes'], fix: [
    ['Cooperativo: un jugador con el juego trucado ya no puede colgar la partida de los demás mandando números imposibles (una experiencia infinita dejaba congelado al anfitrión y un efecto gigante, a los invitados).',
     'Co-op: a player with a tampered game can no longer freeze the others by sending impossible numbers (infinite experience froze the host and a giant effect froze the guests).'],
    ['Mejoras: al cambiar de compañero, la pantalla de mejoras se abre ya con el nuevo y no con el último que habías mirado.',
     'Upgrades: after changing your partner, the upgrades screen now opens on the new one instead of the last one you had looked at.'],
    ['Cooperativo: Viento Aciago, Bucle Arena y Torbellino de un invitado ya atraen a los enemigos (sólo atraían los del anfitrión).',
     'Co-op: a guest\'s Ominous Wind, Sand Tomb and Whirlpool now pull enemies in (only the host\'s did).'],
    ['Cooperativo: el Infortunio de un invitado ya hace su daño extra a los enemigos quemados, envenenados o frenados.',
     'Co-op: a guest\'s Hex now deals its extra damage to burned, poisoned or slowed enemies.'],
    ['Bomba Ácida, Bola Voltio, Bomba Germen, Rayo Señal, Joya de Luz, Bola Neblina, Energibola, Canto Helado, Sombra Vil y Beso Drenaje: al evolucionar, los disparos salían hacia los lados y no daban a nadie. Ahora salen hacia delante, y la mejora «+1 proyectil» ya añade uno (antes no añadía ninguno).',
     'Acid Spray, Electro Ball, Seed Bomb, Signal Beam, Power Gem, Mist Ball, Energy Ball, Ice Shard, Shadow Sneak and Draining Kiss: once evolved, the shots flew off to the sides and hit nothing. Now they go forward, and the "+1 projectile" upgrade really adds one (it added none before).'],
    ['Cooperativo: si a alguien se le cerraban las cartas de subida de nivel sin haber elegido (podía pasar eligiendo muy deprisa), ahora se le vuelven a abrir y los demás ya no se quedan esperándole.',
     'Co-op: if someone\'s level-up cards closed before they had picked (it could happen when picking very fast), they now open again and the others are no longer left waiting for them.']
  ], chg: [
    ['En el móvil ya no está la opción «Apuntar a mano» (no funcionaba con la pantalla táctil): los ataques siempre apuntan solos.',
     'On mobile the "Manual aim" option is gone (it did not work with the touch screen): moves always aim on their own.'],
    ['Amigos: ya no se ve quién está en línea, y puedes invitar a una sala a cualquier amigo (si no entra, la invitación caduca sola a los 3 minutos).',
     'Friends: you no longer see who is online, and you can invite any friend to a room (if they do not join, the invite expires on its own after 3 minutes).'],
    ['Guardado en la nube: se sigue subiendo solo cada media hora, al cerrar la pestaña y con el botón Guardar. En este navegador se guarda todo al momento.',
     'Cloud save: it still uploads on its own every half hour, when you close the tab, and with the Save button. Everything is still saved instantly in this browser.'],
    ['Las solicitudes de amistad nuevas se ven al abrir Amigos.',
     'New friend requests show up when you open Friends.']
  ] },
  { d: '2026-10-19', title: ['38 ataques nuevos', '38 new moves'], new: [
    ['38 ataques nuevos: ahora todos los tipos tienen 5 o más (Roca, Lucha, Dragón y Hada tenían sólo 2). Entre ellos Hiperrayo, Rayo Solar, Magnitud, Torbellino, Onda Trueno, Enfado, Carantoña, Golpe Bajo... cada uno con su evolución.',
     '38 new moves: every type now has 5 or more (Rock, Fighting, Dragon and Fairy had only 2). Among them Hyper Beam, Solar Beam, Magnitude, Whirlpool, Thunder Wave, Outrage, Play Rough, Sucker Punch... each with its evolution.'],
    ['Formas nuevas de atacar: disparos que persiguen al enemigo o rebotan entre ellos, rayos que se cargan, giros que golpean todo alrededor, ondas que avanzan por el suelo, remolinos que atraen a los enemigos, ondas que los apartan y zonas que los dejan aturdidos.',
     'New ways to attack: shots that chase enemies or bounce between them, beams you charge up, spins that hit everything around you, shockwaves that travel along the ground, vortexes that pull enemies in, waves that push them away and zones that stun them.'],
    ['Mejora nueva, Movimiento inicial: se compra una vez por Pokémon y luego eliges gratis con qué ataque empieza la partida.',
     'New upgrade, Starting move: buy it once per Pokémon and then choose for free which move it starts the run with.'],
    ['Idiomas nuevos: francés, italiano, portugués de Brasil, chino simplificado y chino tradicional, en Ajustes > Gráficos > Idioma. Gracias a quienes los tradujeron.',
     'New languages: French, Italian, Brazilian Portuguese, Simplified Chinese and Traditional Chinese, in Settings > Graphics > Language. Thanks to everyone who translated them.'],
    ['Una frase de broma en el título del menú principal, como las de Minecraft.',
     'A joke line on the main menu title, like the ones in Minecraft.']
  ], chg: [
    ['Los Pokémon de un solo tipo pegan un 20 % más con los ataques de su tipo, para compensar que tienen menos variedad.',
     'Single-type Pokémon deal 20% more damage with moves of their type, to make up for having less variety.'],
    ['Al aprender un ataque nuevo ya no se cambia solo a él: sigues con el que estabas usando y cambias cuando tú quieras.',
     'Learning a new move no longer switches to it on its own: you keep the one you were using and switch whenever you want.'],
  ], fix: [
    ['Movimiento inicial: ya se puede volver al ataque de serie aunque no sea de su tipo (por ejemplo Confusión en Psyduck).',
     'Starting move: you can now go back to the default move even if it is not of its type (for example Confusion on Psyduck).'],
    ['Cooperativo: el jefe que tocaba al volver de una grieta podía salir a miles de metros, donde nadie lo encontraba, y la partida se quedaba sin más grietas. Ahora sale cerca, y si un jefe se queda lejísimos de todos, vuelve a aparecer cerca a los pocos segundos.',
     'Co-op: the boss due when coming back from a rift could appear thousands of metres away, where nobody could find it, and the run got no more rifts. Now it appears nearby, and if a boss ends up very far from everyone, it shows up close again after a few seconds.'],
    ['Al recargar, a veces la página nueva se juntaba con los estilos viejos guardados en el navegador (por ejemplo, la frase del título salía en grande pegada a «PokéSurvivor»). Ya no pasa.',
     'When reloading, the new page sometimes got mixed with the old styles saved in the browser (for example, the title line showed up big and stuck to "PokéSurvivor"). That no longer happens.']
  ] },
  { d: '2026-10-18', title: ['Físico y especial, mando, botón Guardar y rankings desde cero', 'Physical and special, controller, Save button and fresh leaderboards'], new: [
    ['Ataques físicos y especiales, como en los juegos: cada Pokémon tiene su Ataque, Ataque Especial, Defensa y Defensa Especial. Los ataques físicos pegan con su Ataque y los especiales con su Ataque Especial: Machamp pega fuerte con Golpe Kárate y flojo con Bola Sombra. Con los de su lado bueno pega lo mismo que antes. Al subir de nivel, cada carta dice si el ataque es físico o especial y cuánto rinde con tu Pokémon, y en la colección se ven todas sus estadísticas.',
     'Physical and special moves, like in the games: every Pokémon has its Attack, Special Attack, Defense and Special Defense. Physical moves use its Attack and special moves its Special Attack: Machamp hits hard with Karate Chop and weakly with Shadow Ball. With moves on its strong side it hits as hard as before. When leveling up, each card says whether the move is physical or special and how well it works with your Pokémon, and the collection shows all its stats.'],
    ['Danza Espada y Danza Dragón suben sólo el Ataque (físico), como en los juegos, y llega Maquinación, que sube el Ataque Especial y la puede aprender cualquier Pokémon. Al subir de nivel, los ataques del lado bueno de tu Pokémon salen el doble de a menudo.',
     'Swords Dance and Dragon Dance now raise only (physical) Attack, like in the games, and Nasty Plot arrives, raising Special Attack, learnable by any Pokémon. When leveling up, moves on your Pokémon’s strong side show up twice as often.'],
    ['Resumen de la partida en la pausa: cada ataque con su categoría, el daño que lleva hecho y su daño por segundo; tus estadísticas con todo lo que has subido; y el objeto y las cartas de mejora que llevas.',
     'Run summary in the pause screen: each move with its category, the damage it has dealt and its damage per second; your stats with everything you have raised; and your item and the upgrade cards you have.'],
    ['Las defensas también cuentan (un poco): los enemigos se defienden de tus ataques físicos con su Defensa y de los especiales con su Defensa Especial, y cada enemigo te pega con su lado fuerte, que paras con tu Defensa o tu Defensa Especial.',
     'Defenses count too (a little): enemies resist your physical moves with their Defense and special moves with their Special Defense, and each enemy hits you with its strong side, which you block with your Defense or Special Defense.'],
    ['Ya se puede jugar con mando (Xbox, PlayStation, Switch y la mayoría de mandos USB o Bluetooth): moverte, cambiar de ataque, pausar, elegir cartas y manejar todos los menús, con vibración al recibir daño. Se configura en Ajustes > Controles.',
     'You can now play with a controller (Xbox, PlayStation, Switch and most USB or Bluetooth controllers): move, switch attacks, pause, pick cards and use every menu, with vibration when you take damage. Set it up in Settings > Controls.'],
    ['Colección: buscador por nombre o número, pestaña con todas las generaciones, filtros que se combinan (tengo / me faltan, varias rarezas a la vez, shiny, favoritos y tipo) y orden por número, nombre, rareza, recién conseguidos o más usados. Y favoritos: márcalos en la ficha de cada Pokémon; van con tu cuenta, en todos tus aparatos.',
     'Collection: search by name or number, a tab with every generation, filters that combine (owned / missing, several rarities at once, shiny, favorites and type) and sorting by number, name, rarity, recently caught or most played. Plus favorites: mark them on each Pokémon’s page; they go with your account, on all your devices.'],
    ['Nueva pestaña Accesibilidad en Ajustes con «Apuntar a mano»: tus ataques van hacia el ratón o hacia donde empujes el stick derecho del mando, en vez de al enemigo más cercano. Viene desactivado.',
     'New Accessibility tab in Settings with “Manual aim”: your attacks go towards the mouse or wherever you push the controller’s right stick, instead of the nearest enemy. It is off by default.'],
    ['Botón Guardar arriba a la derecha: sube tu partida a la nube al momento. Úsalo antes de cerrar el juego o de cambiar de aparato.',
     'Save button at the top right: it uploads your game to the cloud right away. Use it before closing the game or switching devices.']
  ], chg: [
    ['Las cartas de nivel, de vínculo y de objeto no se pueden elegir durante un momento al aparecer (se ven apagadas): pulsar 1-4 o tocar la pantalla para cambiar de ataque en plena pelea ya no elige una carta sin querer.',
     'Level-up, bond and item cards can’t be picked for a moment after they appear (they look dimmed): pressing 1-4 or tapping to switch attacks mid-fight no longer picks a card by accident.'],
    ['Con mando ya se pueden elegir en la colección los Pokémon que aún no tienes, y en el móvil las pestañas de Ajustes caben en una fila que se desliza.',
     'With a controller you can now select the Pokémon you don’t have yet in the collection, and on mobile the Settings tabs fit in one row that scrolls sideways.'],
    ['La partida se guarda en la nube automáticamente cada 10 minutos.',
     'Your game is saved to the cloud automatically every 10 minutes.'],
    ['Ranking histórico: si estás por debajo del puesto 1.000, sale «#1000+» en vez del número exacto.',
     'All-time leaderboard: if you are below rank 1,000, it shows “#1000+” instead of the exact number.'],
    ['Los Pokémon grandes (Onix, Gyarados, Wailord, Eternatus, los legendarios...) ya se pueden jugar bien: se ven algo más pequeños, aunque siguen siendo de los más grandes, y chocan como uno normal, así que caben por todos los pasillos y no reciben más golpes por su tamaño.',
     'Big Pokémon (Onix, Gyarados, Wailord, Eternatus, the legendaries...) are now properly playable: they look a bit smaller, while still being among the biggest, and collide like a normal one, so they fit through every corridor and don’t take extra hits because of their size.'],
    ['Como mucho hay 3 curanderos, 3 escuderos y 3 invocadores a la vez.',
     'There are at most 3 healers, 3 shielders and 3 summoners at a time.'],
    ['Los curanderos y escuderos ya no hacen inmatable a un jefe: lo que le curan y el escudo que le ponen van con el daño que le estás haciendo, y sólo recibe un escudo cada 6 segundos.',
     'Healers and shielders no longer make a boss unkillable: their healing and shields scale with the damage you are dealing to it, and it only gets one shield every 6 seconds.'],
    ['Sentencia de Arceus: la velocidad tiene un tope suave (lo que pase de cierto punto cuenta mucho menos) y los legendarios corren casi tanto como tú. Desde los 5 minutos de Sentencia Arceus acelera sin parar, y desde los 7 su toque quita cada vez más vida, hasta dejarte KO de un golpe hacia el minuto 40.',
     'Judgment of Arceus: speed has a soft cap (anything above a certain point counts much less) and legendaries run almost as fast as you. After 5 minutes of Judgment, Arceus keeps speeding up, and after 7 its touch takes more and more HP, until it knocks you out in one hit around minute 40.'],
    ['El veneno sigue quitando un porcentaje de la vida, pero contra enemigos con muchísima vida (los legendarios de la Sentencia) ese porcentaje es menor.',
     'Poison still takes a percentage of HP, but against enemies with huge HP (the Judgment legendaries) that percentage is smaller.'],
    ['Todos los rankings empiezan de cero (hoy, semana, mes, año e histórico): las marcas de huir de Arceus ya no se podrían alcanzar.',
     'All leaderboards start from scratch (daily, weekly, monthly, yearly and all-time): records from running away from Arceus could no longer be reached.']
  ], fix: [
    ['Seguridad: se ha cerrado un agujero por el que alguien podía meter código en su fila del ranking o en su perfil y hacer que se ejecutara en el navegador de quien los abría (a algunos les llevaba a un vídeo). Ahora todo lo que viene de otros jugadores se limpia, el servidor sólo deja guardar lo que debe, y el navegador no ejecuta nada que no sea del juego.',
     'Security: we closed a hole that let someone put code in their leaderboard row or profile and make it run in the browser of whoever opened them (some people were sent to a video). Now everything coming from other players is cleaned, the server only accepts what it should, and the browser runs nothing that isn’t part of the game.'],
    ['En el ranking ya salen en shiny los Pokémon de quien jugó con su shiny.',
     'The leaderboard now shows Pokémon in shiny form for players who played with their shiny.']
  ] },
  { d: '2026-10-15', title: ['Actualizaciones obligatorias', 'Required updates'], chg: [
    ['Cuando una actualización sea obligatoria (por ejemplo, para arreglar un fallo importante), la partida en curso se termina tras un aviso de 10 s y el juego se recarga. No pierdes nada: las monedas, los tickets, los récords y el ranking de esa partida se guardan como al abandonarla.',
     'When an update is required (for example, to fix an important bug), your current run ends after a 10 s notice and the game reloads. You lose nothing: that run’s coins, tickets, records and leaderboard entry are saved as if you had quit.']
  ] },
  { d: '2026-10-14', title: ['Recupera tu cuenta con Gmail', 'Recover your account with Gmail'], new: [
    ['Si juegas con nombre y contraseña, puedes vincular tu Gmail: si un día olvidas la contraseña, entras con Google y es tu misma cuenta. Te lo ofrecemos al entrar.',
     'If you play with a name and password, you can link your Gmail: if you ever forget your password, sign in with Google and it is the same account. We offer it when you sign in.'],
    ['Móvil: ya puedes colocar los botones donde quieras. En Ajustes > Controles > Colocar los botones arrastras los ataques (con el objeto), la pausa y el joystick, que ahora también puede ser fijo en vez de aparecer donde pones el dedo.',
     'Mobile: you can now place the buttons wherever you want. In Settings > Controls > Place the buttons, drag the attacks (with the item), the pause button and the joystick, which can now also be fixed instead of appearing where you put your finger.']
  ], chg: [
    ['Las tablas de la semana y del mes del ranking empiezan de cero, como el histórico: ahora sólo cuentan partidas con la Sentencia de Arceus y todas las tablas cuadran entre sí.',
     'The weekly and monthly leaderboards start from scratch, like the all-time one: now only runs with the Judgment of Arceus count, and all boards match each other.'],
    ['El código del juego pasa a una licencia no comercial (PolyForm Noncommercial 1.0.0): se puede seguir estudiando y modificando, pero nadie puede cobrar por él.',
     'The game’s code moves to a non-commercial license (PolyForm Noncommercial 1.0.0): you can still study and modify it, but nobody may charge for it.']
  ], fix: [
    ['Cooperativo: la partida ya no se queda parada con cada uno esperando a que el otro elija. Un objeto y las cartas de nivel ya no se tapan, y si la conexión pierde un aviso se arregla solo.',
     'Co-op: the game no longer freezes with each player waiting for the other to choose. An item and the level-up cards no longer cover each other, and if the connection drops a message it fixes itself.'],
    ['Cooperativo: al volver de una grieta, quien no era el anfitrión ya ve a todos los enemigos (antes algunos eran invisibles y sólo se veían sus ataques).',
     'Co-op: after coming back from a rift, players who are not the host can see every enemy again (some used to be invisible, with only their attacks showing).'],
    ['Amigos: si tu móvil u ordenador tiene la hora (o la zona horaria) mal puesta, tus amigos ya no salen siempre desconectados y sus invitaciones te llegan.',
     'Friends: if your phone or computer has the wrong time (or time zone), your friends no longer always show as offline and their invitations reach you.'],
    ['Jugar en dos aparatos (PC y móvil) ya no hace perder monedas ni tickets: antes, si uno tenía la partida abierta con datos viejos y guardaba, borraba lo ganado en el otro. Ahora se suma lo de los dos. Y al volver al juego tras un rato fuera, se trae lo conseguido en el otro aparato (Pokémon, shinies...) sin recargar.',
     'Playing on two devices (PC and phone) no longer loses coins or tickets: before, if one had the game open with old data and saved, it erased what you earned on the other. Now both are added up. And when you come back to the game after a while away, it brings in what you got on the other device (Pokémon, shinies...) without reloading.'],
    ['Los avisos grandes de la partida (un Gholdengo cerca, una marea...) ya salen siempre centrados.',
     'Big in-game announcements (a nearby Gholdengo, a swarm...) are always centered now.']
  ] },
  { d: '2026-10-13', title: ['La Sentencia de Arceus', 'The Judgment of Arceus'], new: [
    ['La Sentencia de Arceus: al llegar al minuto 30, Arceus baja del cielo y te lleva a las Ruinas del Juicio. Es invencible, te persigue cada vez más deprisa y lanza pilares de luz, rayos y ondas; si te toca, te quita casi media vida. Cada 5 segundos acude un legendario con el doble de vida y de daño que el anterior. ¿Cuánto aguantarás?',
     'The Judgment of Arceus: at minute 30, Arceus descends from the sky and takes you to the Ruins of Judgment. It is invincible, chases you faster and faster and casts pillars of light, beams and shockwaves; if it touches you, you lose almost half your HP. Every 5 seconds a legendary joins, each with twice the HP and damage of the previous one. How long can you last?'],
    ['Tres logros nuevos: La Sentencia (llega al minuto 30), Ante el Creador (aguanta 1 minuto ante Arceus) y Desafío divino (derrota a 3 legendarios ante Arceus en una partida).',
     'Three new achievements: The Judgment (reach minute 30), Before the Creator (survive 1 minute against Arceus) and Divine challenge (defeat 3 legendaries against Arceus in a single run).'],
    ['Música nueva para la pelea contra Arceus.', 'New music for the fight against Arceus.'],
    ['Botón para reportar marcas sospechosas en el ranking (la banderita de cada fila).',
     'A button to report suspicious records on the leaderboard (the little flag on each row).']
  ], chg: [
    ['El ranking histórico empieza de cero: ahora que las partidas acaban ante Arceus, las marcas de antes ya no se podrían alcanzar. Las tablas de hoy, de la semana y del mes siguen igual.',
     'The all-time leaderboard starts from scratch: now that runs end against Arceus, older records could no longer be reached. The daily, weekly and monthly boards are unchanged.'],
    ['Se quita el tiempo extra del minuto 60 (ya no se llega hasta ahí).',
     'Overtime from minute 60 is removed (runs no longer get that far).'],
    ['Desde el minuto 28 ya no se abren grietas, para que la Sentencia no te pille dentro de una.',
     'Rifts no longer open from minute 28 on, so the Judgment does not catch you inside one.'],
    ['Ranking protegido contra trampas: el servidor comprueba que cada marca se ha jugado de verdad. Nunca se pierde nada de lo que ganas jugando.',
     'Leaderboard protected against cheating: the server checks that every record was really played. You never lose anything you earn by playing.'],
    ['Se han quitado del ranking las marcas de más de 35 minutos: con la Sentencia de Arceus ya no son posibles.',
     'Records over 35 minutes have been removed from the leaderboard: with the Judgment of Arceus they are no longer possible.']
  ], fix: [
    ['Las tiradas del gacha, los Pokémon nuevos y los premios se guardan en la nube al momento. Si abriste el juego en otro aparato o navegador y te faltaba algo, vuelve a abrirlo donde lo conseguiste: se recupera solo.',
     'Gacha pulls, new Pokémon and rewards are saved to the cloud right away. If you opened the game on another device or browser and something was missing, open it again where you got it: it comes back on its own.']
  ] },
  { d: '2026-10-12', title: ['Tiempo extra y grietas con menos azar', 'Overtime and less random rifts'], new: [
    ['Tiempo extra: desde el minuto 60 los Pokémon salvajes se vuelven cada vez más fuertes (más vida y más daño), y cada vez más deprisa. Antes, con las mejoras al máximo, algunas partidas no acababan nunca; ahora las mejores rondarán la hora y media.',
     'Overtime: from minute 60 on, wild Pokémon keep getting stronger (more HP and more damage), faster and faster. Before, with maxed upgrades, some runs never ended; now the best ones will last about an hour and a half.'],
    ['El juego se actualiza solo cuando sale una versión nueva: si estás en el menú, a los 5 segundos; si estás jugando, al acabar la partida (sin perder nada).',
     'The game now updates itself when a new version is out: within 5 seconds if you are in the menu, or after your run if you are playing (without losing anything).'],
    ['Botón de Novedades (esta ventana) con todos los cambios del juego.',
     'A "What\'s new" button (this window) with every change to the game.'],
    ['Números más fáciles de leer: el 2, el 5 y el 8 ya no se confunden.',
     'Easier to read numbers: 2, 5 and 8 no longer look alike.'],
    ['Elige la versión normal o shiny de tu compañero desde el menú principal, debajo de él.',
     'Pick the normal or shiny version of your partner right from the main menu, under it.'],
    ['Mejoras nuevas para cada Pokémon: Golpe Crítico (+3 % de críticos por nivel, que hacen x1,5 de daño), Cambio de cartas (+1 cambio de las cartas de nivel por run) y Veto (bloquea movimientos para que no te salgan en las cartas; se eligen en Mejoras).',
     'New upgrades for each Pokémon: Critical Hit (+3% critical chance per level, crits deal x1.5 damage), Card reroll (+1 level-up card reroll per run) and Ban (block moves so they never show up in your cards; pick them in Upgrades).'],
    ['Atajos de movimientos (en Mejoras, para cada Pokémon): elige qué movimiento va siempre en cada hueco, por ejemplo Confusión siempre en el 1, para la memoria muscular.',
     'Move shortcuts (in Upgrades, for each Pokémon): choose which move always goes in each slot, for example Confusion always on 1, for muscle memory.']
  ], chg: [
    ['Avalancha hace menos daño (21 en vez de 26): derrotaba casi el doble que la media de los movimientos.',
     'Rock Slide deals less damage (21 instead of 26): it defeated almost twice as many as the average move.'],
    ['Los cambios de cartas de nivel ya no se ganan venciendo jefes: tienes 1 gratis por run y el resto se compra en Mejoras.',
     'Level-up card rerolls are no longer earned by defeating bosses: you get 1 free per run and can buy more in Upgrades.'],
    ['Los legendarios de grieta ya no dan siempre tickets x10: dan uno la mitad de las veces (antes daban 2 siempre y salían demasiados).',
     'Rift legendaries no longer always drop x10 tickets: they drop one half of the time (they used to always drop 2, which was too many).'],
    ['Cooperativo: si vuestras redes no consiguen conectar entre sí, la sala lo avisa y lo reintenta sola, en vez de jugar a tirones por un servidor lento.',
     'Co-op: if your networks cannot connect to each other, the room says so and keeps retrying, instead of playing laggy through a slow server.'],
    ['Hemos cambiado de servidores para que el juego siga siendo gratis: puede que tengas que volver a iniciar sesión (con la misma cuenta y contraseña, o con Google). Tu partida y tus Pokémon siguen igual.',
     'We moved to new servers so the game can stay free: you may need to sign in again (with the same account and password, or with Google). Your save and your Pokémon are unchanged.'],
    ['Gacha: los shiny ya no salen repetidos. Si te toca uno que ya tienes, sale otro de la misma rareza que te falte.',
     'Gacha: shinies no longer come out as duplicates. If you roll one you already have, you get another of the same rarity that you are missing.'],
    ['Grietas con menos azar: cada vez que no sale una, la siguiente es más probable (como mucho 2,5 minutos sin grieta).',
     'Less random rifts: every time one does not show up, the next one is more likely (at most 2.5 minutes without a rift).'],
    ['Los legendarios que aún no has vencido salen 4 veces más en las grietas.',
     'Legendaries you have not beaten yet show up 4 times as often in rifts.'],
    ['Los curanderos curan más cuanto más fuerte pegas, pero cada vez menos y con un tope (como mucho el 2,5x).',
     'Healers heal more the harder you hit, but with diminishing returns and a cap (2.5x at most).'],
    ['Ataques cuerpo a cuerpo más fuertes: mientras llevas uno activo recibes un 25 % menos de daño, llegan un 25 % más lejos y hacen un 20 % más de daño.',
     'Stronger melee attacks: while one is active you take 25% less damage, and they reach 25% further and deal 20% more damage.'],
    ['Cooperativo: al elegir con qué objeto quedarte, la partida se para para todos (antes seguía y te pegaban mientras elegías).',
     'Co-op: choosing which held item to keep now pauses the run for everyone (it used to keep going and you got hit while choosing).'],
    ['Cooperativo: mientras alguien elige una fusión, la partida se para para todos.',
     'Co-op: while someone is choosing a fusion, the run pauses for everyone.'],
    ['Cooperativo: si el anfitrión cambia de pestaña o se le para el juego, la partida se pausa para todos hasta que vuelva.',
     'Co-op: if the host switches tabs or their game stalls, the run pauses for everyone until they are back.'],
    ['Las runs de menos de 1 minuto ya no cuentan para el ranking.',
     'Runs shorter than 1 minute no longer count for the leaderboard.']
  ], fix: [
    ['Quitadas del ranking las marcas rotas por el fallo del minuto 84 (el reloj seguía corriendo con el juego parado) y alguna imposible. Si tenías una, tu próxima partida vuelve a contar.',
     'Removed broken records from the leaderboard caused by the minute 84 bug (the clock kept running while the game was frozen) and a few impossible ones. If you had one, your next run counts again.'],
    ['iPhone (Safari y Chrome): a veces no se podía cambiar de movimiento tocando los iconos, sobre todo con el otro dedo en el joystick. Además los botones quedan por encima de la barra de inicio.',
     'iPhone (Safari and Chrome): sometimes you could not switch moves by tapping the icons, especially with your other finger on the joystick. Buttons also sit above the home bar now.'],
    ['En las partidas de más de 84 minutos la pantalla se quedaba en negro, el juego se paraba o empezabas a subir de nivel sin fin. Ya puedes jugar todo lo que aguantes.',
     'In runs longer than 84 minutes the screen went black, the game froze or you kept levelling up forever. Now you can play for as long as you survive.'],
    ['Si el juego fallara, la partida se cierra sola y se guarda (tiempo, derrotados, récords y ranking) en vez de perderse.',
     'If the game ever crashes, the run ends by itself and is saved (time, defeated, records and leaderboard) instead of being lost.'],
    ['Las partidas muy largas a veces se tomaban por trampas y no contaban para el ranking.',
     'Very long runs were sometimes flagged as cheating and did not count for the leaderboard.'],
    ['Cooperativo: si el anfitrión cambiaba de pestaña, los enemigos se quedaban quietos y los demás jugaban con ventaja.',
     'Co-op: if the host switched tabs, enemies stood still and everyone else got a free advantage.'],
    ['iPhone: mantener el dedo en el joystick sacaba "Copiar / Seleccionar todo".',
     'iPhone: holding your finger on the joystick brought up "Copy / Select all".'],
    ['iPhone: a veces no salía la pantalla completa. Ahora el botón explica cómo tenerla (Compartir y "Añadir a pantalla de inicio").',
     'iPhone: fullscreen sometimes did not show up. Now the button explains how to get it (Share and "Add to Home Screen").']
  ] },
  { d: '2026-10-11', title: ['Vínculos', 'Bonds'], new: [
    ['Vínculos: al vencer a un legendario fusionas movimientos que se lanzan a la vez desde un solo hueco (hasta 4).',
     'Bonds: defeating a legendary lets you fuse moves that fire at the same time from a single slot (up to 4).'],
    ['Botón para cambiar las cartas de subir de nivel.',
     'A button to reroll the level-up cards.']
  ], chg: [
    ['Más grietas.', 'More rifts.'],
    ['Movimientos psíquicos y curanderos más flojos.', 'Weaker psychic moves and healers.'],
    ['Las mejoras de las cartas de nivel (velocidad, recarga, experiencia, imán, coraza y potencia) tienen un tope de veces.',
     'Level-up card upgrades (speed, cooldown, experience, magnet, armor and power) can only be taken a limited number of times.'],
    ['En el móvil, la ficha del Pokémon sale al lado; entrar es más rápido y el gacha x10 se puede cerrar.',
     'On mobile, the Pokémon details show alongside; logging in is faster and the x10 gacha can be closed.']
  ], fix: [
    ['Pantalla negra en partidas de más de una hora por llenarse la memoria de imágenes.',
     'Black screen in runs longer than an hour because image memory filled up.'],
    ['Los tickets se perdían si se cerraba la pestaña antes de acabar la partida: ahora se guardan al cogerlos.',
     'Tickets were lost if the tab closed before the run ended: now they are saved as soon as you pick them up.'],
    ['Una mejora comprada justo después de guardar se cobraba y no se apuntaba.',
     'An upgrade bought right after saving was charged but not applied.'],
    ['El juego se quedaba congelado para siempre si algo fallaba a mitad de partida.',
     'The game froze forever if something went wrong mid-run.']
  ] },
  { d: '2026-10-10', title: ['Más reto', 'More challenge'], new: [
    ['Jefes y legendarios con 4 ataques avisados que se enfurecen a media vida.',
     'Bosses and legendaries with 4 telegraphed attacks that get enraged at half health.'],
    ['12 movimientos nuevos y 8 formas de atacar nuevas: bumerán, cadena, minas, meteoros, torreta, embestida, rastro y abanico.',
     '12 new moves and 8 new ways to attack: boomerang, chain, mines, meteors, turret, dash, trail and spray.'],
    ['Eventos a mitad de partida (hordas de un tipo, hora dorada, Pokémon perdidos) y Meowth y Gholdengo que huyen cargados de monedas.',
     'Mid-run events (single-type hordes, golden hour, lost Pokémon) and Meowth and Gholdengo running away loaded with coins.'],
    ['Estatuas para los Pokémon grandes.', 'Statues for big Pokémon.']
  ], chg: [
    ['Más difícil: menos enemigos pero más duros.', 'Harder: fewer but tougher enemies.'],
    ['Subir de nivel es más lento, los tickets son más raros y los jefes dan ticket x10 una de cada tres veces.',
     'Levelling up is slower, tickets are rarer and bosses drop a x10 ticket one time in three.'],
    ['Carga más rápida.', 'Faster loading.']
  ], fix: [
    ['Los enemigos rezagados desaparecían delante de ti: ahora sólo fuera de la vista.',
     'Straggling enemies vanished in front of you: now only off-screen.'],
    ['Los menús y pantallas se montaban encima de la barra de arriba.',
     'Menus and screens overlapped the top bar.']
  ] },
  { d: '2026-10-09', title: ['Móvil e inglés', 'Mobile and English'], new: [
    ['Se puede jugar en móvil y tablet con joystick táctil, e instalar como app.',
     'Play on phones and tablets with a touch joystick, and install it as an app.'],
    ['El juego, en español y en inglés.', 'The game in English and Spanish.'],
    ['Pantalla de ajustes con calidad gráfica automática.', 'Settings screen with automatic graphics quality.']
  ], chg: [
    ['Menos enemigos en pantalla pero más fuertes.', 'Fewer but stronger enemies on screen.'],
    ['Gigadrenado pasa a ser Hierba Lazo (ya no cura).', 'Giga Drain becomes Grass Knot (no more healing).']
  ] },
  { d: '2026-10-08', title: ['Misiones, grietas y cooperativo', 'Missions, rifts and co-op'], new: [
    ['Misiones diarias y semanales, logros con medallas y títulos, y perfil público.',
     'Daily and weekly missions, achievements with medals and titles, and a public profile.'],
    ['Objetos equipables, evoluciones de movimientos y enemigos que curan, protegen, invocan o explotan.',
     'Held items, move evolutions and enemies that heal, shield, summon or explode.'],
    ['Grietas que llevan a 18 arenas legendarias, una por tipo, y clima que cambia la batalla.',
     'Rifts leading to 18 legendary arenas, one per type, and weather that changes the fight.'],
    ['Cooperativo con tu lista de amigos y ranking.', 'Co-op with your friends list and leaderboards.'],
    ['Mejoras para cada Pokémon, gacha tragaperras con tickets y tabla de tipos.',
     'Upgrades for each Pokémon, a slot-machine ticket gacha and a type chart.']
  ], chg: [
    ['Cámara más lejos y enemigos que rodean los obstáculos.', 'Camera further out and enemies that walk around obstacles.']
  ] },
  { d: '2026-10-07', title: ['Primera versión', 'First version'], new: [
    ['Primera versión pública de PokéSurvivor.', 'First public version of PokéSurvivor.']
  ] }
];
