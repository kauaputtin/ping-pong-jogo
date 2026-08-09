(function createPingPongServices() {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    language: 'ping-pong-language',
    music: 'ping-pong-music-enabled',
    sound: 'ping-pong-sound-enabled'
  });
  const MUSIC_VOLUME = 0.08;
  const EFFECT_VOLUME_SCALE = 0.65;

  const translations = Object.freeze({
    'pt-BR': Object.freeze({
      pageTitleDesktop: 'Ping Pong | Desktop',
      pageTitleMobile: 'Ping Pong | Celular',
      scoreboard: 'Placar',
      desktopCanvas: 'Mesa de ping pong. Use W e S ou o mouse para mover a raquete esquerda.',
      mobileCanvas: 'Mesa de ping pong. Arraste na metade do seu jogador para mover a raquete.',
      player: 'JOGADOR',
      player1: 'JOGADOR 1',
      player2: 'JOGADOR 2',
      you: 'VOCÊ',
      cpu: 'CPU',
      play: 'Jogar',
      settings: 'Configurações',
      openSettings: 'Abrir configurações',
      chooseMode: 'Escolha o modo de jogo',
      startsIn: 'O jogo começa após 3 segundos',
      onePlayer: '1 Jogador',
      twoPlayers: '2 Jogadores',
      back: 'Voltar',
      chooseDifficulty: 'Escolha a dificuldade',
      easy: 'Fácil',
      medium: 'Médio',
      pro: 'Pro',
      winningScore: 'Pontos para vencer',
      matchPoints: 'Partida de {count} {points}',
      point: 'ponto',
      points: 'pontos',
      audio: 'Áudio',
      music: 'Música',
      sound: 'Sons do jogo',
      language: 'Idioma',
      languageSelect: 'Selecionar idioma',
      clickToStart: 'Clique para começar',
      tapToStart: 'Toque para começar',
      paused: 'Pausado',
      continue: 'Continuar',
      restart: 'Reiniciar',
      backToMenu: 'Voltar ao Menu',
      restartMatch: 'Reiniciar partida?',
      restartConfirmation: 'Tem certeza que deseja reiniciar?',
      yes: 'Sim',
      no: 'Não',
      matchControls: 'Controles da partida',
      pause: 'Pausar',
      prepare: 'Preparar...',
      tabPaused: 'Jogo pausado ao sair da aba',
      desktopHintCpu: 'W / S ou Mouse - mover raquete • Esc - pausar',
      desktopHintPvp: 'P1: W / S ou Mouse - P2: setas • Esc - pausar',
      mobileHintCpu: 'Arraste para mover a raquete',
      mobileHintPvp: 'Cada jogador arrasta na sua metade',
      playerWon: 'Você venceu!',
      cpuWon: 'A CPU venceu!',
      numberedPlayerWon: 'Jogador {player} venceu!'
    }),
    en: Object.freeze({
      pageTitleDesktop: 'Ping Pong | Desktop',
      pageTitleMobile: 'Ping Pong | Mobile',
      scoreboard: 'Scoreboard',
      desktopCanvas: 'Ping pong table. Use W and S or the mouse to move the left paddle.',
      mobileCanvas: 'Ping pong table. Drag on your half to move your paddle.',
      player: 'PLAYER',
      player1: 'PLAYER 1',
      player2: 'PLAYER 2',
      you: 'YOU',
      cpu: 'CPU',
      play: 'Play',
      settings: 'Settings',
      openSettings: 'Open settings',
      chooseMode: 'Choose a game mode',
      startsIn: 'The game starts after 3 seconds',
      onePlayer: '1 Player',
      twoPlayers: '2 Players',
      back: 'Back',
      chooseDifficulty: 'Choose the difficulty',
      easy: 'Easy',
      medium: 'Medium',
      pro: 'Pro',
      winningScore: 'Points to win',
      matchPoints: 'First to {count} {points}',
      point: 'point',
      points: 'points',
      audio: 'Audio',
      music: 'Music',
      sound: 'Game sounds',
      language: 'Language',
      languageSelect: 'Select language',
      clickToStart: 'Click to start',
      tapToStart: 'Tap to start',
      paused: 'Paused',
      continue: 'Continue',
      restart: 'Restart',
      backToMenu: 'Back to Menu',
      restartMatch: 'Restart match?',
      restartConfirmation: 'Are you sure you want to restart?',
      yes: 'Yes',
      no: 'No',
      matchControls: 'Match controls',
      pause: 'Pause',
      prepare: 'Get ready...',
      tabPaused: 'Game paused after leaving the tab',
      desktopHintCpu: 'W / S or Mouse - move paddle • Esc - pause',
      desktopHintPvp: 'P1: W / S or Mouse - P2: arrows • Esc - pause',
      mobileHintCpu: 'Drag to move your paddle',
      mobileHintPvp: 'Each player drags on their half',
      playerWon: 'You won!',
      cpuWon: 'The CPU won!',
      numberedPlayerWon: 'Player {player} won!'
    }),
    es: Object.freeze({
      pageTitleDesktop: 'Ping Pong | Escritorio',
      pageTitleMobile: 'Ping Pong | Móvil',
      scoreboard: 'Marcador',
      desktopCanvas: 'Mesa de ping pong. Usa W y S o el ratón para mover la pala izquierda.',
      mobileCanvas: 'Mesa de ping pong. Arrastra en tu mitad para mover la pala.',
      player: 'JUGADOR',
      player1: 'JUGADOR 1',
      player2: 'JUGADOR 2',
      you: 'TÚ',
      cpu: 'CPU',
      play: 'Jugar',
      settings: 'Configuración',
      openSettings: 'Abrir configuración',
      chooseMode: 'Elige el modo de juego',
      startsIn: 'El juego comienza después de 3 segundos',
      onePlayer: '1 Jugador',
      twoPlayers: '2 Jugadores',
      back: 'Volver',
      chooseDifficulty: 'Elige la dificultad',
      easy: 'Fácil',
      medium: 'Medio',
      pro: 'Pro',
      winningScore: 'Puntos para ganar',
      matchPoints: 'Partida a {count} {points}',
      point: 'punto',
      points: 'puntos',
      audio: 'Audio',
      music: 'Música',
      sound: 'Sonidos del juego',
      language: 'Idioma',
      languageSelect: 'Seleccionar idioma',
      clickToStart: 'Haz clic para comenzar',
      tapToStart: 'Toca para comenzar',
      paused: 'Pausado',
      continue: 'Continuar',
      restart: 'Reiniciar',
      backToMenu: 'Volver al Menú',
      restartMatch: '¿Reiniciar la partida?',
      restartConfirmation: '¿Seguro que quieres reiniciar?',
      yes: 'Sí',
      no: 'No',
      matchControls: 'Controles de la partida',
      pause: 'Pausar',
      prepare: 'Prepárate...',
      tabPaused: 'Juego pausado al salir de la pestaña',
      desktopHintCpu: 'W / S o Ratón - mover pala • Esc - pausar',
      desktopHintPvp: 'J1: W / S o Ratón - J2: flechas • Esc - pausar',
      mobileHintCpu: 'Arrastra para mover la pala',
      mobileHintPvp: 'Cada jugador arrastra en su mitad',
      playerWon: '¡Ganaste!',
      cpuWon: '¡La CPU ganó!',
      numberedPlayerWon: '¡El jugador {player} ganó!'
    })
  });

  function readStoredValue(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function saveValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Preferences still work for the current session when storage is unavailable.
    }
  }

  function normalizeLanguage(value) {
    if (value === 'pt' || value?.toLowerCase().startsWith('pt')) return 'pt-BR';
    if (value?.toLowerCase().startsWith('en')) return 'en';
    if (value?.toLowerCase().startsWith('es')) return 'es';
    return 'pt-BR';
  }

  let currentLanguage = normalizeLanguage(readStoredValue(STORAGE_KEYS.language, 'pt-BR'));

  function translate(key, variables = {}) {
    const template = translations[currentLanguage][key] ?? translations['pt-BR'][key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => variables[name] ?? `{${name}}`);
  }

  function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = translate(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
    });

    document.documentElement.lang = currentLanguage;
    const titleKey = document.body?.dataset.pageTitle;
    if (titleKey) document.title = translate(titleKey);
  }

  function notifyParentLanguage() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: 'ping-pong-language', language: currentLanguage }, '*');
  }

  function setLanguage(value) {
    currentLanguage = normalizeLanguage(value);
    saveValue(STORAGE_KEYS.language, currentLanguage);
    applyTranslations();
    notifyParentLanguage();
    window.dispatchEvent(new CustomEvent('pingponglanguagechange', {
      detail: { language: currentLanguage }
    }));
  }

  function readEnabledSetting(key) {
    return readStoredValue(key, 'true') !== 'false';
  }

  let musicEnabled = readEnabledSetting(STORAGE_KEYS.music);
  let soundEnabled = readEnabledSetting(STORAGE_KEYS.sound);
  let audioUnlocked = false;

  const backgroundMusic = new Audio('sounds/music.mp3');
  backgroundMusic.preload = 'auto';
  backgroundMusic.loop = true;
  backgroundMusic.volume = MUSIC_VOLUME;

  const effectDefinitions = Object.freeze({
    hit: ['sounds/hit2.wav', 0.48, 3],
    score: ['sounds/score.mp3', 0.5, 1],
    cpuScore: ['sounds/8-bit-hit.wav', 0.5, 1],
    win: ['sounds/win.wav', 0.58, 1],
    lose: ['sounds/lose.wav', 0.58, 1],
    firePaddle: ['sounds/raquete_fire.wav', 0.55, 1],
    fireBall: ['sounds/ball_fire.wav', 0.52, 1],
    freeze: ['sounds/freeze.mp3', 0.52, 1],
    grow: ['sounds/crecer_paddle.wav', 0.52, 1]
  });
  const effectPools = {};
  const effectPoolIndexes = {};

  Object.entries(effectDefinitions).forEach(([name, [source, volume, poolSize]]) => {
    effectPools[name] = Array.from({ length: poolSize }, () => {
      const audio = new Audio(source);
      audio.preload = 'auto';
      audio.volume = volume * EFFECT_VOLUME_SCALE;
      return audio;
    });
    effectPoolIndexes[name] = 0;
  });

  function ensureMusicPlaying() {
    if (!musicEnabled) return;
    backgroundMusic.play().catch(() => {
      // Browsers allow playback after the first user gesture; unlockAudio retries it.
    });
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    primeEffect('hit');
    ensureMusicPlaying();
  }

  function primeEffect(name) {
    if (!soundEnabled || !effectPools[name]) return;

    effectPools[name].forEach(audio => {
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }).catch(() => {
        audio.muted = false;
      });
    });
  }

  function setMusicEnabled(enabled) {
    musicEnabled = Boolean(enabled);
    saveValue(STORAGE_KEYS.music, String(musicEnabled));
    if (musicEnabled) ensureMusicPlaying();
    else backgroundMusic.pause();
  }

  function setSoundEnabled(enabled) {
    soundEnabled = Boolean(enabled);
    saveValue(STORAGE_KEYS.sound, String(soundEnabled));
    if (soundEnabled && audioUnlocked) {
      primeEffect('hit');
    } else if (!soundEnabled) {
      Object.values(effectPools).flat().forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }

  function playEffect(name) {
    if (!soundEnabled || !effectPools[name]) return;

    const pool = effectPools[name];
    let index = pool.findIndex(audio => audio.paused || audio.ended);
    if (index < 0) {
      index = effectPoolIndexes[name];
      effectPoolIndexes[name] = (index + 1) % pool.length;
    }
    const audio = pool[index];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Effects are ignored if the browser has not granted audio playback yet.
    });
  }

  function stopEffect(name) {
    if (!effectPools[name]) return;

    effectPools[name].forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  document.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
  document.addEventListener('keydown', unlockAudio, { capture: true, once: true });
  window.addEventListener('pageshow', ensureMusicPlaying);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureMusicPlaying();
  });
  backgroundMusic.addEventListener('ended', ensureMusicPlaying);

  ensureMusicPlaying();

  window.PingPongServices = Object.freeze({
    applyTranslations,
    getLanguage: () => currentLanguage,
    setLanguage,
    t: translate,
    audio: Object.freeze({
      isMusicEnabled: () => musicEnabled,
      isSoundEnabled: () => soundEnabled,
      playEffect,
      stopEffect,
      setMusicEnabled,
      setSoundEnabled
    })
  });
})();
