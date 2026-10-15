// Todos los textos visibles del juego, en español.

export const es = {
  gameTitle: 'Lumos',
  gameSubtitle: 'El reloj del cielo',
  /** Prólogo breve, bajo el título. */
  prologue:
    'La Sombra rompió el gran reloj que hace girar el cielo, y el Sol y la Luna quedaron atascados en un eclipse sin fin. Lu y Mos suben hasta el Observatorio para volver a darle cuerda.',
  loading: 'Cargando…',
  pressEnter: 'Pulsa Enter',

  title: {
    toStart: 'para empezar',
    controls: 'Lu juega con WASD · Mos con las flechas',
  },

  players: {
    mos: 'Mos',
    lu: 'Lu',
  },

  zones: {
    forest: 'Bosque del Alba',
    sanctuary: 'Santuario de los Astros',
    observatory: 'Observatorio',
  },

  menu: {
    play: 'Jugar',
    howTo: 'Cómo jugar',
    options: 'Opciones',
    back: 'Volver',
  },

  levelBanner: (id: number, name: string) => `Nivel ${id} · ${name}`,

  levelSelect: {
    title: 'Mapa de niveles',
    locked: 'Bloqueado: gana el nivel anterior',
    bestTime: (time: string) => `Mejor tiempo: ${time}`,
    noTime: 'Aún sin completar',
    hint: '← → elegir · Enter jugar · Esc volver',
  },

  pause: {
    title: 'Pausa',
    resume: 'Continuar',
    restart: 'Reiniciar',
    options: 'Opciones',
    exit: 'Salir al mapa',
  },

  results: {
    title: '¡Nivel completado!',
    time: 'Tiempo',
    par: (seconds: number) => `objetivo ${seconds} s`,
    gems: 'Gemas',
    deaths: 'Muertes',
    newBest: '¡Nuevo récord!',
    next: 'Siguiente',
    replay: 'Repetir',
    map: 'Mapa',
  },

  options: {
    title: 'Opciones',
    master: 'Volumen general',
    music: 'Música',
    sfx: 'Efectos',
    fullscreen: 'Pantalla completa',
    reduceEffects: 'Reducir efectos',
    reduceEffectsHelp: 'Sin temblores ni destellos',
    channelShapes: 'Formas en los mecanismos',
    channelShapesHelp: 'Una forma por color en botones, palancas y plataformas',
    on: 'Sí',
    off: 'No',
    mutedNote: 'Sonido silenciado con M',
    hint: '↑ ↓ elegir · ← → cambiar · Esc volver',
  },

  howTo: {
    title: 'Cómo jugar',
    intro: 'Dos personas, un teclado. Nadie puede ganar solo.',
    story: 'El oro guarda la luz del Sol y la plata la de la Luna: cada metal protege a quien comparte su luz y daña al otro.',
    move: 'Moverse',
    jump: 'Saltar',
    lever: 'Palanca',
    rules: [
      'El oro protege a Mos y quema a Lu; la plata protege a Lu y apaga a Mos.',
      'La sombra los apaga a los dos.',
      'Mos recoge soles y Lu lunas. Son opcionales, pero dan estrellas.',
      'Botones, palancas y plataformas se enlazan por colores (en Opciones, también por formas).',
      'Empujen los bloques para hacer puentes, escalones o pisar botones.',
      'Para ganar, los dos deben estar a la vez frente a su puerta.',
    ],
    keys: 'Esc o P pausa · R reinicia · M silencia · F pantalla completa',
    ghosting:
      'Algunos teclados no registran muchas teclas a la vez (ghosting). Si una tecla no responde mientras la otra persona juega, prueben otro teclado.',
  },

  ending: {
    title: 'Amanece de nuevo',
    story: 'El reloj del cielo vuelve a girar: de día el Sol, de noche la Luna.',
    stars: (got: number, total: number) => `Estrellas: ${got} de ${total}`,
    time: (time: string) => `Suma de mejores tiempos: ${time}`,
    deaths: (mos: number, lu: number) => `Muertes: Lu ${lu} · Mos ${mos}`,
    credits: [
      'Una idea de Moisés',
      'Programado con Claude Code',
      'Lu y Mos: la hoja de sprites del diseño, pasada a pixel art',
      'Escenarios y sonido hechos con código: Canvas 2D y Web Audio',
      'Fuente Pixelify Sans (SIL Open Font License)',
    ],
    thanks: '¡Gracias por jugar!',
    continue: 'Enter · volver al título',
  },

  sound: {
    muted: 'Sonido silenciado',
    unmuted: 'Sonido activado',
  },

  debug: {
    label: 'DEPURACIÓN',
    help: 'H cajas · N siguiente · G invencibles · Z zona · L oscuridad',
    invincible: 'invencibles',
    fps: (fps: number) => `${fps} FPS`,
  },

  formatTime: (seconds: number) => {
    const total = Math.max(0, seconds);
    const minutes = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    const tenths = Math.floor((total * 10) % 10);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`;
  },
} as const;
