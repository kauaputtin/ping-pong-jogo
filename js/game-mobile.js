const GameMobile = (() => {
  'use strict';

  const services = window.PingPongServices;
  const audio = services.audio;
  const t = services.t;

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const backgroundCanvas = document.createElement('canvas');
  const backgroundCtx = backgroundCanvas.getContext('2d', { alpha: false });
  const supportsRoundRect = typeof ctx.roundRect === 'function';
  const powerUpImage = new Image();
  powerUpImage.decoding = 'async';
  powerUpImage.src = 'img/logo.png';
  const icePowerUpImage = new Image();
  icePowerUpImage.decoding = 'async';
  icePowerUpImage.src = 'img/gelo.png';
  const growPowerUpImage = new Image();
  growPowerUpImage.decoding = 'async';
  growPowerUpImage.src = 'img/aumenta.webp';

  const WIDTH = 380;
  const HEIGHT = 640;
  const PADDLE_WIDTH = 90;
  const PADDLE_HEIGHT = 8;
  const BALL_RADIUS = 6;
  const BALL_SPEED = 420;
  const DRAG_PADDLE_SPEED = 1200;
  const FIELD_DISPLAY_SCALE = 0.86;
  const MAX_FIELD_WIDTH = 330;
  const SCORE_GUTTER_WIDTH = 38;
  const DEFAULT_WINNING_SCORE = 5;
  const WINNING_SCORE_OPTIONS = Object.freeze([3, 5, 7, 10]);
  const WINNING_SCORE_STORAGE_KEY = 'ping-pong-winning-score';
  const MAX_DELTA_SECONDS = 1 / 20;
  const HIGH_QUALITY_PIXEL_RATIO = 1.5;
  const LOW_QUALITY_PIXEL_RATIO = 1;
  const PERFORMANCE_SAMPLE_FRAMES = 90;
  const SLOW_FRAME_THRESHOLD_MS = 20.5;
  const RALLY_SPEEDUP_EVERY_HITS = 4;
  const RALLY_SPEEDUP_STEP = 0.10;
  const MAX_RALLY_SPEED_MULTIPLIER = 1.8;
  const POWER_UP_MIN_SPAWN_SECONDS = 10;
  const POWER_UP_MAX_SPAWN_SECONDS = 15;
  const POWER_UP_RADIUS = 25;
  const POWER_UP_SPEED_MULTIPLIER = 2;
  const POWER_UP_MAX_VISIBLE = 2;
  const POWER_UP_PADDLE_GAP = 30;
  const POWER_UP_MIN_SEPARATION = 18;
  const ICE_FREEZE_SECONDS = 1;
  const GROW_EFFECT_SECONDS = 8;
  const GROW_PADDLE_MULTIPLIER = 2;
  const GROW_WARNING_SECONDS = 3;
  const GROW_WARNING_BLINK_MS = 180;

  const GameState = Object.freeze({
    MENU: 'MENU',
    READY: 'READY',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  });

  const CountdownMode = Object.freeze({
    START_MATCH: 'START_MATCH',
    RESUME_MATCH: 'RESUME_MATCH'
  });

  const PowerUpType = Object.freeze({
    FIRE: 'FIRE',
    ICE: 'ICE',
    GROW: 'GROW'
  });
  const POWER_UP_TYPES = Object.freeze(Object.values(PowerUpType));
  const POWER_UP_COLORS = Object.freeze({
    [PowerUpType.FIRE]: Object.freeze({ glow: '#ff6a00', border: '#ffb830', fill: 'rgba(90, 25, 8, 0.88)' }),
    [PowerUpType.ICE]: Object.freeze({ glow: '#52d9ff', border: '#b9f3ff', fill: 'rgba(11, 78, 110, 0.9)' }),
    [PowerUpType.GROW]: Object.freeze({ glow: '#54e887', border: '#b7ffc8', fill: 'rgba(18, 91, 45, 0.9)' })
  });

  const deviceMemory = Number(navigator.deviceMemory || 0);
  const processorCount = Number(navigator.hardwareConcurrency || 0);
  const startsInLowQuality = Boolean(
    navigator.connection?.saveData ||
    (deviceMemory > 0 && deviceMemory <= 4) ||
    (processorCount > 0 && processorCount <= 4)
  );

  const CPU_SETTINGS = Object.freeze({
    easy: { ballSpeed: 336, maxSpeed: 170, reactionTime: 0.18, error: 52, aim: 0 },
    medium: { ballSpeed: 420, maxSpeed: 270, reactionTime: 0.09, error: 22, aim: 0.25 },
    pro: { ballSpeed: 516, maxSpeed: 390, reactionTime: 0.045, error: 7, aim: 0.45 }
  });

  const elements = {
    header: document.querySelector('h1'),
    field: document.getElementById('field'),
    controls: document.getElementById('controls'),
    overlay: document.getElementById('overlay'),
    startMenu: document.getElementById('start-menu'),
    menuLogo: document.getElementById('menu-logo'),
    menuTitle: document.getElementById('menu-title'),
    pauseMenu: document.getElementById('pause-menu'),
    readyOverlay: document.getElementById('ready-overlay'),
    startPrompt: document.getElementById('start-prompt'),
    countdown: document.getElementById('countdown'),
    gameOverPanel: document.getElementById('game-over-panel'),
    winnerMessage: document.getElementById('winner-message'),
    labelTop: document.getElementById('label-left'),
    labelBottom: document.getElementById('label-right'),
    scoreTop: document.getElementById('score-left'),
    scoreBottom: document.getElementById('score-right'),
    winningScoreDisplay: document.getElementById('winning-score-display'),
    hint: document.getElementById('hint'),
    message: document.getElementById('msg'),
    touchGuide: document.getElementById('touch-guide'),
    guideBottomLabel: document.querySelector('.guide-bottom .guide-label'),
    playMenu: document.getElementById('play-menu'),
    settingsMenu: document.getElementById('settings-menu'),
    onePlayer: document.getElementById('menu-1p'),
    twoPlayers: document.getElementById('menu-2p'),
    menuButton: document.getElementById('btn-menu'),
    pauseButton: document.getElementById('btn-pause'),
    resumeButton: document.getElementById('btn-resume'),
    resetButton: document.getElementById('btn-reset'),
    resetConfirmButton: document.getElementById('btn-reset-confirm'),
    resetCancelButton: document.getElementById('btn-reset-cancel'),
    gameOverResetButton: document.getElementById('btn-game-over-reset'),
    gameOverMenuButton: document.getElementById('btn-game-over-menu'),
    musicToggle: document.getElementById('music-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    languageSelect: document.getElementById('language-select')
  };

  const menuScreens = Array.from(document.querySelectorAll('[data-menu-screen]'));
  const pauseScreens = Array.from(document.querySelectorAll('[data-pause-screen]'));
  const menuBackButtons = Array.from(document.querySelectorAll('[data-menu-back]'));
  const difficultyButtons = Array.from(document.querySelectorAll('[data-difficulty]'));
  const winningScoreButtons = Array.from(document.querySelectorAll('[data-winning-score]'));

  let state = GameState.MENU;
  let resumeState = GameState.PLAYING;
  let mode = 'cpu';
  let cpuDifficulty = 'medium';
  let winningScore = loadWinningScore(DEFAULT_WINNING_SCORE);
  let scores = { top: 0, bottom: 0 };
  let topPaddle;
  let bottomPaddle;
  let ball = null;
  let serveAnimation = null;
  let openingDropAnimation = null;
  let frameId = null;
  let lastFrameTime = 0;
  let countdownRemaining = 0;
  let lastCountdownValue = null;
  let countdownMode = CountdownMode.START_MATCH;
  let pixelRatio = 0;
  let resizeFrameId = null;
  let canvasRect = { left: 0, top: 0, width: 1, height: 1 };
  let cpuTargetX = WIDTH / 2;
  let cpuDecisionTimer = 0;
  let rallyHits = 0;
  let lastPaddleHit = null;
  let powerUp = createPowerUpState();
  let currentMessage = { key: '', variables: {} };
  let currentWinnerMessage = { key: '', variables: {} };
  let renderQuality = startsInLowQuality ? 'low' : 'high';
  let performanceFrameCount = 0;
  let performanceElapsedMs = 0;
  let previousPerformanceTimestamp = 0;

  const activePointers = new Map();
  const pointerTargets = { top: null, bottom: null };
  canvas.dataset.renderQuality = renderQuality;

  function configureCanvasResolution() {
    const pixelRatioLimit = renderQuality === 'low'
      ? LOW_QUALITY_PIXEL_RATIO
      : HIGH_QUALITY_PIXEL_RATIO;
    const nextPixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), pixelRatioLimit);
    const nextWidth = Math.round(WIDTH * nextPixelRatio);
    const nextHeight = Math.round(HEIGHT * nextPixelRatio);

    if (canvas.width === nextWidth && canvas.height === nextHeight && pixelRatio === nextPixelRatio) return;

    pixelRatio = nextPixelRatio;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = renderQuality === 'high';

    backgroundCanvas.width = nextWidth;
    backgroundCanvas.height = nextHeight;
    backgroundCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildStaticBackground();
  }

  function buildStaticBackground() {
    backgroundCtx.fillStyle = '#111';
    backgroundCtx.fillRect(0, 0, WIDTH, HEIGHT);
    backgroundCtx.setLineDash([6, 6]);
    backgroundCtx.strokeStyle = '#2a2a2a';
    backgroundCtx.lineWidth = 1;
    backgroundCtx.beginPath();
    backgroundCtx.moveTo(0, HEIGHT / 2);
    backgroundCtx.lineTo(WIDTH, HEIGHT / 2);
    backgroundCtx.stroke();
    backgroundCtx.setLineDash([]);
  }

  function scheduleResize() {
    if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId);
    resizeFrameId = requestAnimationFrame(resizeLayout);
  }

  function resizeLayout() {
    resizeFrameId = null;
    configureCanvasResolution();

    if (!document.body.classList.contains('menu-open')) {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const headerHeight = elements.header?.getBoundingClientRect().height || 0;
      const controlsHeight = elements.controls?.getBoundingClientRect().height || 0;
      const hintHeight = elements.hint?.getBoundingClientRect().height || 0;
      const messageHeight = elements.message?.getBoundingClientRect().height || 0;
      const availableHeight = Math.max(120, viewportHeight - headerHeight - controlsHeight - hintHeight - messageHeight - 42);
      const availableWidth = Math.max(
        140,
        Math.min(viewportWidth - SCORE_GUTTER_WIDTH * 2, elements.field.parentElement.clientWidth)
      );

      let height = availableHeight * FIELD_DISPLAY_SCALE;
      let width = height * (WIDTH / HEIGHT);
      const maxWidth = Math.min(availableWidth, MAX_FIELD_WIDTH);

      if (width > maxWidth) {
        width = maxWidth;
        height = width * (HEIGHT / WIDTH);
      }

      elements.field.style.width = `${Math.floor(width)}px`;
      elements.field.style.height = `${Math.floor(height)}px`;
    }

    refreshCanvasRect();
    draw();
  }

  function refreshCanvasRect() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvasRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
  }

  function getCanvasX(clientX) {
    return (clientX - canvasRect.left) * (WIDTH / canvasRect.width);
  }

  function getCanvasY(clientY) {
    return (clientY - canvasRect.top) * (HEIGHT / canvasRect.height);
  }

  function isMatchActive() {
    return state === GameState.COUNTDOWN || state === GameState.PLAYING;
  }

  function handlePointerDown(event) {
    if (state === GameState.READY) {
      startPreparedMatch();
      return;
    }
    if (!isMatchActive()) return;

    event.preventDefault();
    refreshCanvasRect();
    const targetX = getCanvasX(event.clientX);
    const player = mode === 'pvp' && getCanvasY(event.clientY) < HEIGHT / 2 ? 'top' : 'bottom';
    if (isPaddleFrozen(player)) return;

    activePointers.set(event.pointerId, player);
    pointerTargets[player] = targetX;
    canvas.setPointerCapture?.(event.pointerId);
    hideControlGuide();
  }

  function handlePointerMove(event) {
    const player = activePointers.get(event.pointerId);
    if (!player || isPaddleFrozen(player)) return;

    event.preventDefault();
    pointerTargets[player] = getCanvasX(event.clientX);
  }

  function handlePointerEnd(event) {
    const player = activePointers.get(event.pointerId);
    if (!player) return;

    activePointers.delete(event.pointerId);
    if (![...activePointers.values()].includes(player)) pointerTargets[player] = null;
  }

  function clearInput() {
    activePointers.clear();
    pointerTargets.top = null;
    pointerTargets.bottom = null;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function getRandomPowerUpDelay() {
    return randomBetween(POWER_UP_MIN_SPAWN_SECONDS, POWER_UP_MAX_SPAWN_SECONDS);
  }

  function createPowerUpState() {
    return {
      spawn: { cooldown: getRandomPowerUpDelay() },
      pickups: [],
      charged: { top: false, bottom: false },
      ballEffect: { active: false, owner: null },
      effects: {
        frozen: { top: 0, bottom: 0 },
        enlarged: { top: 0, bottom: 0 }
      }
    };
  }

  function resetPowerUpState() {
    powerUp = createPowerUpState();
  }

  function resetPowerUpRound() {
    powerUp.spawn.cooldown = getRandomPowerUpDelay();
    powerUp.pickups = [];
    powerUp.charged.top = false;
    powerUp.charged.bottom = false;
    powerUp.effects.frozen.top = 0;
    powerUp.effects.frozen.bottom = 0;
    powerUp.effects.enlarged.top = 0;
    powerUp.effects.enlarged.bottom = 0;
    setPaddleWidth('top', PADDLE_WIDTH);
    setPaddleWidth('bottom', PADDLE_WIDTH);
    deactivateBallPower();
  }

  function scheduleNextPowerUp() {
    powerUp.spawn.cooldown = getRandomPowerUpDelay();
  }

  function choosePowerUpType() {
    return POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  }

  function spawnPowerUp() {
    if (powerUp.pickups.length >= POWER_UP_MAX_VISIBLE) return false;

    const minX = POWER_UP_RADIUS;
    const maxX = WIDTH - POWER_UP_RADIUS;
    const minY = topPaddle.y + topPaddle.h + POWER_UP_RADIUS + POWER_UP_PADDLE_GAP;
    const maxY = bottomPaddle.y - POWER_UP_RADIUS - POWER_UP_PADDLE_GAP;

    let x = WIDTH / 2;
    let y = (minY + maxY) / 2;
    let foundSafePosition = false;
    const isSafePosition = (candidateX, candidateY) => {
      const safeFromBall = !ball || Math.hypot(candidateX - ball.x, candidateY - ball.y) > POWER_UP_RADIUS + ball.r + 36;
      const safeFromOtherPowers = powerUp.pickups.every(pickup => (
        Math.hypot(candidateX - pickup.x, candidateY - pickup.y) >
        POWER_UP_RADIUS * 2 + POWER_UP_MIN_SEPARATION
      ));
      return safeFromBall && safeFromOtherPowers;
    };

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidateX = randomBetween(minX, maxX);
      const candidateY = randomBetween(minY, maxY);
      if (!isSafePosition(candidateX, candidateY)) continue;

      x = candidateX;
      y = candidateY;
      foundSafePosition = true;
      break;
    }

    if (!foundSafePosition) {
      const fallbackPositions = [
        [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
        [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
        [0.2, 0.8], [0.5, 0.8], [0.8, 0.8]
      ];
      const fallback = fallbackPositions
        .map(([ratioX, ratioY]) => ({
          x: minX + (maxX - minX) * ratioX,
          y: minY + (maxY - minY) * ratioY
        }))
        .find(position => isSafePosition(position.x, position.y));

      if (!fallback) return false;
      x = fallback.x;
      y = fallback.y;
    }

    powerUp.pickups.push({ x, y, type: choosePowerUpType() });
    scheduleNextPowerUp();
    return true;
  }

  function updatePowerUp(deltaSeconds) {
    updateTimedPowerEffects(deltaSeconds);

    if (powerUp.pickups.length >= POWER_UP_MAX_VISIBLE) return;

    powerUp.spawn.cooldown -= deltaSeconds;
    if (powerUp.spawn.cooldown <= 0) spawnPowerUp();
  }

  function updateTimedPowerEffects(deltaSeconds) {
    updateTimedPowerEffect('top', deltaSeconds);
    updateTimedPowerEffect('bottom', deltaSeconds);
  }

  function updateTimedPowerEffect(side, deltaSeconds) {
    powerUp.effects.frozen[side] = Math.max(0, powerUp.effects.frozen[side] - deltaSeconds);

    const previousGrowTime = powerUp.effects.enlarged[side];
    powerUp.effects.enlarged[side] = Math.max(0, previousGrowTime - deltaSeconds);
    if (previousGrowTime > 0 && powerUp.effects.enlarged[side] === 0) {
      setPaddleWidth(side, PADDLE_WIDTH);
    }
  }

  function setPaddleWidth(side, width) {
    const paddle = side === 'top' ? topPaddle : bottomPaddle;
    if (!paddle) return;

    const centerX = paddle.x + paddle.w / 2;
    paddle.w = width;
    paddle.x = clamp(centerX - width / 2, 0, WIDTH - width);
  }

  function activateGrowEffect(side) {
    powerUp.effects.enlarged[side] = GROW_EFFECT_SECONDS;
    setPaddleWidth(side, PADDLE_WIDTH * GROW_PADDLE_MULTIPLIER);
  }

  function activateFreezeEffect(owner) {
    const opponent = owner === 'top' ? 'bottom' : 'top';
    powerUp.effects.frozen[opponent] = ICE_FREEZE_SECONDS;
    pointerTargets[opponent] = null;
  }

  function segmentTouchesCircle(startX, startY, endX, endY, centerX, centerY, radius) {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    const projection = lengthSquared === 0
      ? 0
      : clamp(
        ((centerX - startX) * segmentX + (centerY - startY) * segmentY) / lengthSquared,
        0,
        1
      );
    const closestX = startX + segmentX * projection;
    const closestY = startY + segmentY * projection;
    const distanceX = closestX - centerX;
    const distanceY = closestY - centerY;
    return distanceX * distanceX + distanceY * distanceY <= radius * radius;
  }

  function collectPowerUpIfHit(previousX, previousY) {
    if (!ball || !lastPaddleHit) return;

    for (let index = 0; index < powerUp.pickups.length; index += 1) {
      const pickup = powerUp.pickups[index];
      const touchesPowerUp = segmentTouchesCircle(
        previousX,
        previousY,
        ball.x,
        ball.y,
        pickup.x,
        pickup.y,
        POWER_UP_RADIUS + ball.r
      );
      if (!touchesPowerUp) continue;

      powerUp.pickups.splice(index, 1);
      if (pickup.type === PowerUpType.FIRE) {
        powerUp.charged[lastPaddleHit] = true;
        audio.playEffect('firePaddle');
      } else if (pickup.type === PowerUpType.ICE) {
        activateFreezeEffect(lastPaddleHit);
        audio.playEffect('freeze');
      } else if (pickup.type === PowerUpType.GROW) {
        activateGrowEffect(lastPaddleHit);
        audio.playEffect('grow');
      }
      break;
    }
  }

  function deactivateBallPower() {
    powerUp.ballEffect.active = false;
    powerUp.ballEffect.owner = null;
  }

  function isPaddleFrozen(side) {
    return powerUp.effects.frozen[side] > 0;
  }

  function initMatch(resetScore = true) {
    topPaddle = {
      x: WIDTH / 2 - PADDLE_WIDTH / 2,
      y: 8,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT
    };
    bottomPaddle = {
      x: WIDTH / 2 - PADDLE_WIDTH / 2,
      y: HEIGHT - 8 - PADDLE_HEIGHT,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT
    };

    if (resetScore) scores = { top: 0, bottom: 0 };
    ball = null;
    serveAnimation = null;
    openingDropAnimation = null;
    countdownMode = CountdownMode.START_MATCH;
    cpuTargetX = WIDTH / 2;
    cpuDecisionTimer = 0;
    lastPaddleHit = null;
    resetPowerUpState();
    updateScoreUI();
  }

  function spawnBall(server = null) {
    rallyHits = 0;
    const speed = getBallSpeed();
    const angle = Math.random() * 0.36 - 0.18;
    const serveFromTop = server === 'top';
    const serveFromBottom = server === 'bottom';
    const servingPaddle = serveFromTop ? topPaddle : serveFromBottom ? bottomPaddle : null;
    const verticalDirection = server
      ? (serveFromTop ? 1 : -1)
      : (Math.random() < 0.5 ? 1 : -1);

    return {
      x: servingPaddle ? servingPaddle.x + servingPaddle.w / 2 : WIDTH / 2,
      y: serveFromTop
        ? topPaddle.y + topPaddle.h + BALL_RADIUS + 4
        : serveFromBottom
          ? bottomPaddle.y - BALL_RADIUS - 4
          : HEIGHT / 2,
      vx: speed * Math.sin(angle),
      vy: verticalDirection * Math.abs(speed * Math.cos(angle)),
      r: BALL_RADIUS
    };
  }

  function beginServe(server) {
    const nextBall = spawnBall(server);
    const startRadius = BALL_RADIUS * 3.4;

    lastPaddleHit = server;
    openingDropAnimation = null;
    serveAnimation = {
      elapsed: 0,
      duration: 0.52,
      startRadius,
      endRadius: BALL_RADIUS,
      vx: nextBall.vx,
      vy: nextBall.vy
    };
    ball = { x: nextBall.x, y: nextBall.y, vx: 0, vy: 0, r: startRadius };
  }

  function beginOpeningDrop() {
    const nextBall = spawnBall();
    const landingY = HEIGHT / 2;
    const dropHeight = Math.min(180, HEIGHT * 0.28);

    serveAnimation = null;
    openingDropAnimation = {
      elapsed: 0,
      duration: 1.1,
      startY: landingY - dropHeight,
      landingY,
      bounceHeight: 38,
      vx: nextBall.vx,
      vy: nextBall.vy
    };
    ball = {
      x: WIDTH / 2,
      y: openingDropAnimation.startY,
      vx: 0,
      vy: 0,
      r: BALL_RADIUS
    };
  }

  function updateOpeningDrop(deltaSeconds) {
    const animation = openingDropAnimation;
    animation.elapsed += deltaSeconds;
    const progress = clamp(animation.elapsed / animation.duration, 0, 1);

    if (progress < 0.62) {
      const fallProgress = progress / 0.62;
      ball.y = animation.startY +
        (animation.landingY - animation.startY) * fallProgress * fallProgress;
    } else if (progress < 0.84) {
      const bounceProgress = (progress - 0.62) / 0.22;
      ball.y = animation.landingY -
        Math.sin(Math.PI * bounceProgress) * animation.bounceHeight;
    } else {
      const settleProgress = (progress - 0.84) / 0.16;
      ball.y = animation.landingY -
        Math.sin(Math.PI * settleProgress) * animation.bounceHeight * 0.28;
    }

    if (progress < 1) return;

    ball.y = animation.landingY;
    ball.vx = animation.vx;
    ball.vy = animation.vy;
    openingDropAnimation = null;
  }

  function updateBall(deltaSeconds) {
    if (!ball) return;

    if (openingDropAnimation) {
      updateOpeningDrop(deltaSeconds);
      return;
    }

    if (serveAnimation) {
      serveAnimation.elapsed += deltaSeconds;
      const progress = clamp(serveAnimation.elapsed / serveAnimation.duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      ball.r = serveAnimation.startRadius + (serveAnimation.endRadius - serveAnimation.startRadius) * eased;

      if (progress >= 1) {
        ball.r = serveAnimation.endRadius;
        ball.vx = serveAnimation.vx;
        ball.vy = serveAnimation.vy;
        serveAnimation = null;
      }
      return;
    }

    const previousX = ball.x;
    const previousY = ball.y;
    ball.x += ball.vx * deltaSeconds;
    ball.y += ball.vy * deltaSeconds;
    collectPowerUpIfHit(previousX, previousY);

    if (ball.x - ball.r <= 0 && ball.vx < 0) {
      ball.x = ball.r;
      ball.vx *= -1;
    } else if (ball.x + ball.r >= WIDTH && ball.vx > 0) {
      ball.x = WIDTH - ball.r;
      ball.vx *= -1;
    }

    if (ball.vy < 0 && sweptPaddleCollision(ball, topPaddle, previousX, previousY, 'top')) {
      ball.y = topPaddle.y + topPaddle.h + ball.r;
      reflectBall(ball, topPaddle, 1, 'top');
    } else if (ball.vy > 0 && sweptPaddleCollision(ball, bottomPaddle, previousX, previousY, 'bottom')) {
      ball.y = bottomPaddle.y - ball.r;
      reflectBall(ball, bottomPaddle, -1, 'bottom');
    }

    if (ball.y + ball.r < 0) {
      scorePoint('bottom');
      return;
    }

    if (ball.y - ball.r > HEIGHT) scorePoint('top');
  }

  function reflectBall(currentBall, paddle, verticalDirection, hitter) {
    const offset = clamp(
      (currentBall.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2),
      -1,
      1
    );

    lastPaddleHit = hitter;

    if (powerUp.ballEffect.active && powerUp.ballEffect.owner !== hitter) {
      deactivateBallPower();
    }

    rallyHits += 1;
    let speed = getRallyBallSpeed();
    const angle = offset * 0.85;

    const releasedFire = powerUp.charged[hitter];
    if (releasedFire) {
      powerUp.charged[hitter] = false;
      powerUp.ballEffect.active = true;
      powerUp.ballEffect.owner = hitter;
    }
    if (powerUp.ballEffect.active) speed *= POWER_UP_SPEED_MULTIPLIER;

    if (releasedFire) {
      audio.stopEffect('firePaddle');
      audio.playEffect('fireBall');
    } else audio.playEffect('hit');

    currentBall.vx = speed * Math.sin(angle);
    currentBall.vy = verticalDirection * Math.abs(speed * Math.cos(angle));
  }

  function collidesWithPaddle(currentBall, paddle) {
    return currentBall.x - currentBall.r < paddle.x + paddle.w &&
      currentBall.x + currentBall.r > paddle.x &&
      currentBall.y - currentBall.r < paddle.y + paddle.h &&
      currentBall.y + currentBall.r > paddle.y;
  }

  function sweptPaddleCollision(currentBall, paddle, previousX, previousY, side) {
    if (collidesWithPaddle(currentBall, paddle)) return true;

    const collisionY = side === 'top'
      ? paddle.y + paddle.h + currentBall.r
      : paddle.y - currentBall.r;
    const crossedPaddle = side === 'top'
      ? previousY >= collisionY && currentBall.y <= collisionY
      : previousY <= collisionY && currentBall.y >= collisionY;

    if (!crossedPaddle || previousY === currentBall.y) return false;

    const collisionTime = (collisionY - previousY) / (currentBall.y - previousY);
    const hitX = previousX + (currentBall.x - previousX) * collisionTime;
    return hitX >= paddle.x - currentBall.r && hitX <= paddle.x + paddle.w + currentBall.r;
  }

  function updatePaddles(deltaSeconds) {
    if (!isPaddleFrozen('bottom')) moveHumanPaddle(bottomPaddle, 'bottom', deltaSeconds);

    if (!isPaddleFrozen('top')) {
      if (mode === 'pvp') moveHumanPaddle(topPaddle, 'top', deltaSeconds);
      else moveCPUPaddle(deltaSeconds);
    }
  }

  function moveHumanPaddle(paddle, player, deltaSeconds) {
    movePaddleToward(paddle, pointerTargets[player], DRAG_PADDLE_SPEED * deltaSeconds);
    paddle.x = clamp(paddle.x, 0, WIDTH - paddle.w);
  }

  function movePaddleToward(paddle, targetCenterX, maxStep) {
    if (targetCenterX === null) return;

    const targetX = clamp(targetCenterX - paddle.w / 2, 0, WIDTH - paddle.w);
    const distance = targetX - paddle.x;
    paddle.x += clamp(distance, -maxStep, maxStep);
  }

  function reflectCoordinate(value, min, max) {
    const span = max - min;
    const period = span * 2;
    const offset = ((value - min) % period + period) % period;
    return offset <= span ? min + offset : max - (offset - span);
  }

  function predictBallXAtCPU() {
    if (!ball || ball.vy >= 0) return WIDTH / 2;

    const collisionY = topPaddle.y + topPaddle.h + ball.r;
    const timeToPaddle = (collisionY - ball.y) / ball.vy;
    if (timeToPaddle <= 0) return ball.x;

    return reflectCoordinate(
      ball.x + ball.vx * timeToPaddle,
      ball.r,
      WIDTH - ball.r
    );
  }

  function moveCPUPaddle(deltaSeconds) {
    if (!ball) return;

    const cpu = CPU_SETTINGS[cpuDifficulty];
    cpuDecisionTimer -= deltaSeconds;

    if (cpuDecisionTimer <= 0) {
      const isApproaching = ball.vy < 0;
      const predictedX = isApproaching ? predictBallXAtCPU() : WIDTH / 2;
      const playerCenterX = bottomPaddle.x + bottomPaddle.w / 2;
      const aimDirection = playerCenterX < WIDTH / 2 ? 1 : -1;
      const aimOffset = isApproaching ? aimDirection * cpu.aim * topPaddle.w / 2 : 0;
      const error = isApproaching ? (Math.random() * 2 - 1) * cpu.error : 0;
      cpuTargetX = clamp(
        predictedX - aimOffset + error,
        topPaddle.w / 2,
        WIDTH - topPaddle.w / 2
      );
      cpuDecisionTimer = cpu.reactionTime;
    }

    movePaddleToward(topPaddle, cpuTargetX, cpu.maxSpeed * deltaSeconds);
    topPaddle.x = clamp(topPaddle.x, 0, WIDTH - topPaddle.w);
  }

  function getBallSpeed() {
    return mode === 'cpu' ? CPU_SETTINGS[cpuDifficulty].ballSpeed : BALL_SPEED;
  }

  function getRallyBallSpeed() {
    const speedupCount = Math.floor(rallyHits / RALLY_SPEEDUP_EVERY_HITS);
    const multiplier = Math.min(
      1 + speedupCount * RALLY_SPEEDUP_STEP,
      MAX_RALLY_SPEED_MULTIPLIER
    );
    return getBallSpeed() * multiplier;
  }

  function scorePoint(scorer) {
    resetPowerUpRound();
    scores[scorer] += 1;
    updateScoreUI();

    if (scores[scorer] >= winningScore) {
      endGame(scorer);
      return;
    }

    const cpuScored = mode === 'cpu' && scorer === 'top';
    audio.playEffect(cpuScored ? 'cpuScore' : 'score');

    const paddle = scorer === 'top' ? topPaddle : bottomPaddle;
    paddle.x = WIDTH / 2 - paddle.w / 2;
    beginServe(scorer);
  }

  function endGame(winner) {
    state = GameState.GAME_OVER;
    stopLoop();
    hideControlGuide();

    const playerWon = winner === 'bottom';
    if (mode === 'cpu') setWinnerMessage(playerWon ? 'playerWon' : 'cpuWon');
    else setWinnerMessage('numberedPlayerWon', { player: winner === 'top' ? 1 : 2 });
    audio.playEffect(mode === 'cpu' && !playerWon ? 'lose' : 'win');
    setMessage('');
    updateControlUI();
    elements.gameOverResetButton.focus();
  }

  function draw(renderTimestamp = performance.now()) {
    if (!topPaddle || !bottomPaddle) return;

    const topFrozen = isPaddleFrozen('top');
    const bottomFrozen = isPaddleFrozen('bottom');
    const topOpacity = getGrowWarningOpacity('top', renderTimestamp);
    const bottomOpacity = getGrowWarningOpacity('bottom', renderTimestamp);
    const useDetailedEffects = renderQuality === 'high';

    ctx.drawImage(backgroundCanvas, 0, 0, WIDTH, HEIGHT);
    drawPowerUps(renderTimestamp);
    if (powerUp.charged.top) drawPaddleFire(topPaddle, 'top', renderTimestamp);
    if (powerUp.charged.bottom) drawPaddleFire(bottomPaddle, 'bottom', renderTimestamp);
    drawPaddle(topPaddle, topFrozen ? '#b9f3ff' : '#60a5fa', topOpacity);
    drawPaddle(bottomPaddle, bottomFrozen ? '#b9f3ff' : '#f87171', bottomOpacity);
    if (topFrozen) drawFrozenPaddleEffect(topPaddle, 'top', topOpacity);
    if (bottomFrozen) drawFrozenPaddleEffect(bottomPaddle, 'bottom', bottomOpacity);

    if (ball) {
      if (powerUp.ballEffect.active) drawBallFire(ball, renderTimestamp);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = powerUp.ballEffect.active ? '#ff7a18' : 'transparent';
      ctx.shadowBlur = powerUp.ballEffect.active && useDetailedEffects ? 8 : 0;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawPowerUps(renderTimestamp) {
    for (let index = 0; index < powerUp.pickups.length; index += 1) {
      drawPowerUpPickup(powerUp.pickups[index], renderTimestamp);
    }
  }

  function drawPowerUpPickup(pickup, renderTimestamp) {
    const { x, y, type } = pickup;
    const useDetailedEffects = renderQuality === 'high';
    const pulse = useDetailedEffects ? 1 + Math.sin(renderTimestamp * 0.008) * 0.07 : 1;
    const size = POWER_UP_RADIUS * 2.3 * pulse;
    const color = POWER_UP_COLORS[type];

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = useDetailedEffects ? 10 : 0;
    ctx.fillStyle = color.fill;
    ctx.beginPath();
    ctx.arc(x, y, POWER_UP_RADIUS * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, POWER_UP_RADIUS * pulse, 0, Math.PI * 2);
    ctx.stroke();

    const pickupImage = type === PowerUpType.FIRE
      ? powerUpImage
      : type === PowerUpType.ICE
        ? icePowerUpImage
        : growPowerUpImage;

    if (pickupImage.complete && pickupImage.naturalWidth > 0) {
      ctx.drawImage(pickupImage, x - size / 2, y - size / 2, size, size);
    } else if (type === PowerUpType.FIRE) {
      ctx.fillStyle = '#ff5a36';
      ctx.beginPath();
      ctx.arc(x, y, POWER_UP_RADIUS * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === PowerUpType.ICE) drawIceIcon(x, y, pulse);
    else drawGrowIcon(x, y, pulse);
    ctx.restore();
  }

  function drawIceIcon(x, y, scale) {
    const radius = POWER_UP_RADIUS * 0.6 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#e8fbff';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    for (let index = 0; index < 3; index += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(radius, 0);
      ctx.moveTo(radius * 0.62, 0);
      ctx.lineTo(radius * 0.42, -radius * 0.2);
      ctx.moveTo(radius * 0.62, 0);
      ctx.lineTo(radius * 0.42, radius * 0.2);
      ctx.moveTo(-radius * 0.62, 0);
      ctx.lineTo(-radius * 0.42, -radius * 0.2);
      ctx.moveTo(-radius * 0.62, 0);
      ctx.lineTo(-radius * 0.42, radius * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGrowIcon(x, y, scale) {
    const radius = POWER_UP_RADIUS * 0.58 * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#effff2';
    ctx.fillStyle = '#effff2';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.fillRect(-2.5, -radius * 0.55, 5, radius * 1.1);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(-5, -radius + 6);
    ctx.moveTo(0, -radius);
    ctx.lineTo(5, -radius + 6);
    ctx.moveTo(0, radius);
    ctx.lineTo(-5, radius - 6);
    ctx.moveTo(0, radius);
    ctx.lineTo(5, radius - 6);
    ctx.stroke();
    ctx.restore();
  }

  function drawFrozenPaddleEffect(paddle, side, opacity = 1) {
    const outwardDirection = side === 'top' ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowColor = '#57dcff';
    ctx.shadowBlur = renderQuality === 'high' ? 10 : 0;
    ctx.strokeStyle = 'rgba(191, 245, 255, 0.95)';
    ctx.fillStyle = 'rgba(111, 224, 255, 0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x - 3, paddle.y - 3, paddle.w + 6, paddle.h + 6);

    for (let index = 0; index < 5; index += 1) {
      const shardX = paddle.x + (index + 0.5) * paddle.w / 5;
      const shardY = side === 'top' ? paddle.y + paddle.h + 2 : paddle.y - 2;
      ctx.beginPath();
      ctx.moveTo(shardX - 4, shardY);
      ctx.lineTo(shardX, shardY + outwardDirection * 7);
      ctx.lineTo(shardX + 4, shardY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPaddleFire(paddle, side, renderTimestamp) {
    const direction = side === 'top' ? 1 : -1;
    const time = renderTimestamp * 0.012;
    const useDetailedEffects = renderQuality === 'high';
    const flameCount = useDetailedEffects ? 7 : 4;

    ctx.save();
    ctx.globalCompositeOperation = useDetailedEffects ? 'lighter' : 'source-over';
    ctx.shadowColor = '#ff5a1f';
    ctx.shadowBlur = useDetailedEffects ? 7 : 0;

    for (let index = 0; index < flameCount; index += 1) {
      const baseX = paddle.x + (index + 0.5) * paddle.w / flameCount;
      const flicker = Math.sin(time + index * 1.7);
      const flameHeight = 8 + (flicker + 1) * 2.4;
      const flameY = side === 'top'
        ? paddle.y + paddle.h + flameHeight * 0.35
        : paddle.y - flameHeight * 0.35;

      ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 74, 30, 0.82)' : 'rgba(255, 166, 24, 0.78)';
      ctx.beginPath();
      ctx.ellipse(baseX + flicker * 1.4, flameY, 3.2, flameHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 224, 92, 0.7)';
      ctx.beginPath();
      ctx.ellipse(baseX, flameY - direction * 1.2, 1.35, flameHeight * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBallFire(currentBall, renderTimestamp) {
    const speed = Math.sqrt(currentBall.vx * currentBall.vx + currentBall.vy * currentBall.vy);
    if (speed === 0) return;

    const directionX = currentBall.vx / speed;
    const directionY = currentBall.vy / speed;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const time = renderTimestamp * 0.016;
    const useDetailedEffects = renderQuality === 'high';
    const trailCount = useDetailedEffects ? 7 : 4;

    ctx.save();
    ctx.globalCompositeOperation = useDetailedEffects ? 'lighter' : 'source-over';
    ctx.shadowColor = '#ff4d19';
    ctx.shadowBlur = useDetailedEffects ? 6 : 0;

    for (let index = trailCount; index >= 1; index -= 1) {
      const progress = index / trailCount;
      const distance = index * 3.4;
      const wobble = Math.sin(time + index * 1.3) * 1.5 * progress;
      const trailX = currentBall.x - directionX * distance + perpendicularX * wobble;
      const trailY = currentBall.y - directionY * distance + perpendicularY * wobble;

      ctx.globalAlpha = (1 - progress * 0.72) * 0.85;
      ctx.fillStyle = index % 2 === 0 ? '#ff4d1f' : '#ffb31a';
      ctx.beginPath();
      ctx.arc(trailX, trailY, Math.max(1.2, currentBall.r * (1 - progress * 0.62)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getGrowWarningOpacity(side, renderTimestamp) {
    const remainingSeconds = powerUp.effects.enlarged[side];
    if (remainingSeconds <= 0 || remainingSeconds > GROW_WARNING_SECONDS) return 1;

    return Math.floor(renderTimestamp / GROW_WARNING_BLINK_MS) % 2 === 0 ? 1 : 0.28;
  }

  function drawPaddle(paddle, color, opacity = 1) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (supportsRoundRect) {
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 3);
    } else {
      ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function beginCountdown(seconds, nextMode = CountdownMode.START_MATCH) {
    countdownRemaining = seconds;
    lastCountdownValue = null;
    countdownMode = nextMode;
    state = GameState.COUNTDOWN;
    elements.countdown.classList.remove('hidden');
    updateCountdown(0);
    updateControlUI();
  }

  function resetPerformanceMonitor() {
    performanceFrameCount = 0;
    performanceElapsedMs = 0;
    previousPerformanceTimestamp = 0;
  }

  function enableLowQuality() {
    if (renderQuality === 'low') return;

    renderQuality = 'low';
    canvas.dataset.renderQuality = renderQuality;
    ctx.imageSmoothingEnabled = false;
    resetPerformanceMonitor();
    configureCanvasResolution();
  }

  function monitorRenderPerformance(timestamp) {
    if (renderQuality === 'low' || state !== GameState.PLAYING) {
      previousPerformanceTimestamp = timestamp;
      return;
    }

    if (previousPerformanceTimestamp === 0) {
      previousPerformanceTimestamp = timestamp;
      return;
    }

    const frameDuration = Math.min(timestamp - previousPerformanceTimestamp, 100);
    previousPerformanceTimestamp = timestamp;
    performanceElapsedMs += frameDuration;
    performanceFrameCount += 1;

    if (performanceFrameCount < PERFORMANCE_SAMPLE_FRAMES) return;

    const averageFrameDuration = performanceElapsedMs / performanceFrameCount;
    if (averageFrameDuration > SLOW_FRAME_THRESHOLD_MS) enableLowQuality();
    else {
      performanceFrameCount = 0;
      performanceElapsedMs = 0;
    }
  }

  function updateCountdown(deltaSeconds) {
    countdownRemaining = Math.max(0, countdownRemaining - deltaSeconds);
    const value = Math.max(1, Math.ceil(countdownRemaining));

    if (value !== lastCountdownValue) {
      lastCountdownValue = value;
      elements.countdown.textContent = String(value);
    }

    if (countdownRemaining > 0) return;

    elements.countdown.classList.add('hidden');
    elements.countdown.textContent = '';
    const completedMode = countdownMode;
    countdownMode = CountdownMode.START_MATCH;
    state = GameState.PLAYING;
    if (completedMode === CountdownMode.START_MATCH) beginOpeningDrop();
    setMessage('');
    updateControlUI();
  }

  function startLoop() {
    if (frameId !== null || !isMatchActive()) return;
    lastFrameTime = 0;
    resetPerformanceMonitor();
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameTime = 0;
    resetPerformanceMonitor();
  }

  function loop(timestamp) {
    frameId = null;
    if (!isMatchActive()) return;

    monitorRenderPerformance(timestamp);
    const elapsedSeconds = lastFrameTime ? Math.max(0, (timestamp - lastFrameTime) / 1000) : 0;
    const deltaSeconds = Math.min(elapsedSeconds, MAX_DELTA_SECONDS);
    lastFrameTime = timestamp;

    updatePaddles(deltaSeconds);
    if (state === GameState.COUNTDOWN) updateCountdown(Math.min(elapsedSeconds, 0.25));
    else {
      updateBall(deltaSeconds);
      if (state === GameState.PLAYING) updatePowerUp(deltaSeconds);
    }
    draw(timestamp);

    if (isMatchActive()) frameId = requestAnimationFrame(loop);
  }

  function pauseGame(messageKey = 'paused') {
    if (!isMatchActive()) return;

    resumeState = state;
    state = GameState.PAUSED;
    stopLoop();
    clearInput();
    showPauseMenu();
    setMessage(messageKey);
    updateControlUI();
  }

  function resumeGame() {
    if (state !== GameState.PAUSED) return;

    const resumeCountdownMode = resumeState === GameState.COUNTDOWN
      ? countdownMode
      : CountdownMode.RESUME_MATCH;
    hidePauseMenu();
    beginCountdown(3, resumeCountdownMode);
    setMessage('prepare');
    startLoop();
  }

  function togglePause() {
    if (state === GameState.PAUSED) resumeGame();
    else if (state === GameState.PLAYING) pauseGame();
  }

  function showPauseMenu() {
    setPauseScreen('actions');
    elements.pauseMenu.classList.remove('hidden');
    elements.overlay.classList.add('pause-open');
    elements.pauseButton.setAttribute('aria-expanded', 'true');
    elements.resumeButton.focus();
  }

  function hidePauseMenu() {
    elements.pauseMenu.classList.add('hidden');
    elements.overlay.classList.remove('pause-open');
    elements.pauseButton.setAttribute('aria-expanded', 'false');
  }

  function setPauseScreen(screenName) {
    const validScreen = pauseScreens.some(screen => screen.dataset.pauseScreen === screenName)
      ? screenName
      : 'actions';

    pauseScreens.forEach(screen => {
      const isActive = screen.dataset.pauseScreen === validScreen;
      screen.hidden = !isActive;
      screen.classList.toggle('is-active', isActive);
      screen.setAttribute('aria-hidden', String(!isActive));
    });
  }

  function setMenuScreen(screenName) {
    const validScreen = menuScreens.some(screen => screen.dataset.menuScreen === screenName)
      ? screenName
      : 'mainMenu';

    menuScreens.forEach(screen => {
      const isActive = screen.dataset.menuScreen === validScreen;
      screen.hidden = !isActive;
      screen.classList.toggle('is-active', isActive);
      screen.setAttribute('aria-hidden', String(!isActive));
    });
    elements.menuLogo.classList.toggle('hidden', validScreen !== 'mainMenu');
    elements.startMenu.classList.toggle('settings-open', validScreen === 'settingsMenu');
    elements.menuTitle.textContent = validScreen === 'settingsMenu'
      ? t('settings')
      : 'Ping Pong The Game';
  }

  function openMenu(screenName = 'mainMenu') {
    stopLoop();
    hidePauseMenu();
    state = GameState.MENU;
    countdownRemaining = 0;
    lastCountdownValue = null;
    countdownMode = CountdownMode.START_MATCH;
    clearInput();
    initMatch(true);
    hideControlGuide();

    document.body.classList.add('menu-open');
    elements.startMenu.classList.remove('hidden');
    elements.readyOverlay.classList.add('hidden');
    elements.countdown.classList.add('hidden');
    elements.countdown.textContent = '';
    setWinnerMessage('');
    setMenuScreen(screenName);
    setMessage('chooseMode');
    updateModeUI();
    updateControlUI();
    draw();
  }

  function startNewMatch(selectedMode, waitForClick = selectedMode === 'cpu') {
    if (!['cpu', 'pvp'].includes(selectedMode)) return;

    stopLoop();
    hidePauseMenu();
    mode = selectedMode;
    clearInput();
    initMatch(true);
    updateModeUI();

    document.body.classList.remove('menu-open');
    elements.startMenu.classList.add('hidden');
    elements.readyOverlay.classList.add('hidden');
    setWinnerMessage('');
    resizeLayout();

    if (waitForClick) {
      state = GameState.READY;
      elements.readyOverlay.classList.remove('hidden');
      setMessage('');
      updateControlUI();
      draw();
      return;
    }

    beginCountdown(3);
    showControlGuide();
    setMessage('prepare');
    draw();
    startLoop();
  }

  function startPreparedMatch() {
    if (state !== GameState.READY) return;

    elements.readyOverlay.classList.add('hidden');
    beginCountdown(3);
    showControlGuide();
    setMessage('prepare');
    draw();
    startLoop();
  }

  function resetMatch() {
    if (state === GameState.MENU) {
      openMenu();
      return;
    }
    startNewMatch(mode, mode === 'cpu');
  }

  function updateModeUI() {
    if (mode === 'cpu') {
      elements.labelTop.textContent = t('cpu');
      elements.labelBottom.textContent = t('you');
      elements.hint.textContent = t('mobileHintCpu');
      elements.guideBottomLabel.textContent = t('you');
    } else {
      elements.labelTop.textContent = t('player1');
      elements.labelBottom.textContent = t('player2');
      elements.hint.textContent = t('mobileHintPvp');
      elements.guideBottomLabel.textContent = t('player2');
    }
  }

  function updateControlUI() {
    const isGameOver = state === GameState.GAME_OVER;
    elements.pauseButton.classList.toggle('hidden', isGameOver);
    elements.gameOverMenuButton.classList.toggle('hidden', !isGameOver);
    elements.pauseButton.disabled = state !== GameState.PLAYING && state !== GameState.PAUSED;
    elements.pauseButton.textContent = t(state === GameState.PAUSED ? 'continue' : 'pause');
  }

  function showControlGuide() {
    elements.touchGuide.classList.toggle('single-player', mode === 'cpu');
    elements.touchGuide.classList.remove('hidden');
  }

  function hideControlGuide() {
    elements.touchGuide.classList.add('hidden');
  }

  function updateScoreUI() {
    elements.scoreTop.textContent = String(scores.top);
    elements.scoreBottom.textContent = String(scores.bottom);
  }

  function loadWinningScore(fallback) {
    try {
      const savedScore = Number(window.localStorage.getItem(WINNING_SCORE_STORAGE_KEY));
      return WINNING_SCORE_OPTIONS.includes(savedScore) ? savedScore : fallback;
    } catch {
      return fallback;
    }
  }

  function updateWinningScoreUI() {
    winningScoreButtons.forEach(button => {
      const isSelected = Number(button.dataset.winningScore) === winningScore;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    const points = t(winningScore === 1 ? 'point' : 'points');
    elements.winningScoreDisplay.textContent = t('matchPoints', { count: winningScore, points });
  }

  function setWinningScore(value) {
    const nextScore = Number(value);
    if (!WINNING_SCORE_OPTIONS.includes(nextScore)) return;

    winningScore = nextScore;
    try {
      window.localStorage.setItem(WINNING_SCORE_STORAGE_KEY, String(winningScore));
    } catch {
      // The setting still works for this session when storage is unavailable.
    }
    updateWinningScoreUI();
  }

  function setMessage(key, variables = {}) {
    currentMessage = { key, variables };
    elements.message.textContent = key ? t(key, variables) : '';
  }

  function setWinnerMessage(key, variables = {}) {
    currentWinnerMessage = { key, variables };
    elements.winnerMessage.textContent = key ? t(key, variables) : '';
    elements.gameOverPanel.classList.toggle('hidden', !key);
  }

  function syncPreferenceControls() {
    elements.musicToggle.checked = audio.isMusicEnabled();
    elements.soundToggle.checked = audio.isSoundEnabled();
    elements.languageSelect.value = services.getLanguage();
  }

  function refreshLocalizedUI() {
    syncPreferenceControls();
    elements.menuTitle.textContent = elements.startMenu.classList.contains('settings-open')
      ? t('settings')
      : 'Ping Pong The Game';
    updateModeUI();
    updateControlUI();
    updateWinningScoreUI();
    elements.message.textContent = currentMessage.key
      ? t(currentMessage.key, currentMessage.variables)
      : '';
    elements.winnerMessage.textContent = currentWinnerMessage.key
      ? t(currentWinnerMessage.key, currentWinnerMessage.variables)
      : '';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  elements.playMenu.addEventListener('click', () => setMenuScreen('playMenu'));
  elements.settingsMenu.addEventListener('click', () => setMenuScreen('settingsMenu'));
  elements.onePlayer.addEventListener('click', () => setMenuScreen('difficultyMenu'));
  elements.twoPlayers.addEventListener('click', () => startNewMatch('pvp', false));
  elements.startPrompt.addEventListener('click', startPreparedMatch);
  elements.menuButton.addEventListener('click', () => openMenu());
  elements.pauseButton.addEventListener('click', togglePause);
  elements.resumeButton.addEventListener('click', resumeGame);
  elements.resetButton.addEventListener('click', () => setPauseScreen('restartConfirm'));
  elements.resetConfirmButton.addEventListener('click', resetMatch);
  elements.resetCancelButton.addEventListener('click', () => setPauseScreen('actions'));
  elements.gameOverResetButton.addEventListener('click', resetMatch);
  elements.gameOverMenuButton.addEventListener('click', () => openMenu());
  menuBackButtons.forEach(button => {
    button.addEventListener('click', () => setMenuScreen(button.dataset.menuBack || 'mainMenu'));
  });
  difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!CPU_SETTINGS[button.dataset.difficulty]) return;
      cpuDifficulty = button.dataset.difficulty;
      startNewMatch('cpu', true);
    });
  });
  winningScoreButtons.forEach(button => {
    button.addEventListener('click', () => setWinningScore(button.dataset.winningScore));
  });
  elements.musicToggle.addEventListener('change', () => {
    audio.setMusicEnabled(elements.musicToggle.checked);
  });
  elements.soundToggle.addEventListener('change', () => {
    audio.setSoundEnabled(elements.soundToggle.checked);
  });
  elements.languageSelect.addEventListener('change', () => {
    services.setLanguage(elements.languageSelect.value);
  });
  window.addEventListener('pingponglanguagechange', refreshLocalizedUI);

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);
  canvas.addEventListener('lostpointercapture', handlePointerEnd);

  window.addEventListener('resize', scheduleResize, { passive: true });
  window.addEventListener('orientationchange', scheduleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMatchActive()) pauseGame('tabPaused');
  });

  services.applyTranslations();
  syncPreferenceControls();
  configureCanvasResolution();
  initMatch();
  updateModeUI();
  updateWinningScoreUI();
  openMenu();

  return Object.freeze({
    openMenu,
    reset: resetMatch,
    togglePause
  });
})();
