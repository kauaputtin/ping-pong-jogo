const GameMobile = (() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const backgroundCanvas = document.createElement('canvas');
  const backgroundCtx = backgroundCanvas.getContext('2d', { alpha: false });

  const WIDTH = 380;
  const HEIGHT = 640;
  const PADDLE_WIDTH = 90;
  const PADDLE_HEIGHT = 8;
  const BALL_RADIUS = 6;
  const BALL_SPEED = 420;
  const DRAG_PADDLE_SPEED = 1200;
  const DEFAULT_WINNING_SCORE = 5;
  const WINNING_SCORE_OPTIONS = Object.freeze([3, 5, 7, 10]);
  const WINNING_SCORE_STORAGE_KEY = 'ping-pong-winning-score';
  const MAX_DELTA_SECONDS = 1 / 30;
  const RALLY_SPEEDUP_EVERY_HITS = 4;
  const RALLY_SPEEDUP_STEP = 0.05;
  const MAX_RALLY_SPEED_MULTIPLIER = 1.25;

  const GameState = Object.freeze({
    MENU: 'MENU',
    READY: 'READY',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  });

  const CPU_SETTINGS = Object.freeze({
    easy: { ballSpeed: 336, maxSpeed: 170, reactionTime: 0.18, error: 52, aim: 0 },
    medium: { ballSpeed: 420, maxSpeed: 270, reactionTime: 0.09, error: 22, aim: 0.25 },
    pro: { ballSpeed: 516, maxSpeed: 390, reactionTime: 0.045, error: 7, aim: 0.45 }
  });

  const elements = {
    field: document.getElementById('field'),
    overlay: document.getElementById('overlay'),
    startMenu: document.getElementById('start-menu'),
    pauseMenu: document.getElementById('pause-menu'),
    readyOverlay: document.getElementById('ready-overlay'),
    startPrompt: document.getElementById('start-prompt'),
    countdown: document.getElementById('countdown'),
    winnerMessage: document.getElementById('winner-message'),
    labelTop: document.getElementById('label-left'),
    labelBottom: document.getElementById('label-right'),
    scoreTop: document.getElementById('score-left'),
    scoreBottom: document.getElementById('score-right'),
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
    settingsButton: document.getElementById('btn-settings')
  };

  const menuScreens = Array.from(document.querySelectorAll('[data-menu-screen]'));
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
  let pixelRatio = 0;
  let resizeFrameId = null;
  let canvasRect = { left: 0, top: 0, width: 1, height: 1 };
  let cpuTargetX = WIDTH / 2;
  let cpuDecisionTimer = 0;
  let rallyHits = 0;

  const activePointers = new Map();
  const pointerTargets = { top: null, bottom: null };

  function configureCanvasResolution() {
    const nextPixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const nextWidth = Math.round(WIDTH * nextPixelRatio);
    const nextHeight = Math.round(HEIGHT * nextPixelRatio);

    if (canvas.width === nextWidth && canvas.height === nextHeight && pixelRatio === nextPixelRatio) return;

    pixelRatio = nextPixelRatio;
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

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
      const headerHeight = document.querySelector('h1')?.getBoundingClientRect().height || 0;
      const controlsHeight = elements.menuButton?.parentElement?.getBoundingClientRect().height || 0;
      const hintHeight = elements.hint?.getBoundingClientRect().height || 0;
      const messageHeight = elements.message?.getBoundingClientRect().height || 0;
      const availableHeight = Math.max(120, viewportHeight - headerHeight - controlsHeight - hintHeight - messageHeight - 42);
      const availableWidth = Math.max(140, Math.min(viewportWidth - 16, elements.field.parentElement.clientWidth));

      let height = availableHeight;
      let width = height * (WIDTH / HEIGHT);
      const maxWidth = Math.min(availableWidth, 520);

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

  function getCanvasPoint(clientX, clientY) {
    return {
      x: (clientX - canvasRect.left) * (WIDTH / canvasRect.width),
      y: (clientY - canvasRect.top) * (HEIGHT / canvasRect.height)
    };
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
    const point = getCanvasPoint(event.clientX, event.clientY);
    const player = mode === 'pvp' && point.y < HEIGHT / 2 ? 'top' : 'bottom';

    activePointers.set(event.pointerId, player);
    pointerTargets[player] = point.x;
    canvas.setPointerCapture?.(event.pointerId);
    hideControlGuide();
  }

  function handlePointerMove(event) {
    const player = activePointers.get(event.pointerId);
    if (!player) return;

    event.preventDefault();
    pointerTargets[player] = getCanvasPoint(event.clientX, event.clientY).x;
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
    cpuTargetX = WIDTH / 2;
    cpuDecisionTimer = 0;
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

    if (ball.x - ball.r <= 0 && ball.vx < 0) {
      ball.x = ball.r;
      ball.vx *= -1;
    } else if (ball.x + ball.r >= WIDTH && ball.vx > 0) {
      ball.x = WIDTH - ball.r;
      ball.vx *= -1;
    }

    if (ball.vy < 0 && sweptPaddleCollision(ball, topPaddle, previousX, previousY, 'top')) {
      ball.y = topPaddle.y + topPaddle.h + ball.r;
      reflectBall(ball, topPaddle, 1);
    } else if (ball.vy > 0 && sweptPaddleCollision(ball, bottomPaddle, previousX, previousY, 'bottom')) {
      ball.y = bottomPaddle.y - ball.r;
      reflectBall(ball, bottomPaddle, -1);
    }

    if (ball.y + ball.r < 0) {
      scorePoint('bottom');
      return;
    }

    if (ball.y - ball.r > HEIGHT) scorePoint('top');
  }

  function reflectBall(currentBall, paddle, verticalDirection) {
    const offset = clamp(
      (currentBall.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2),
      -1,
      1
    );
    rallyHits += 1;
    const speed = getRallyBallSpeed();
    const angle = offset * 0.85;

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
    moveHumanPaddle(bottomPaddle, 'bottom', deltaSeconds);

    if (mode === 'pvp') {
      moveHumanPaddle(topPaddle, 'top', deltaSeconds);
    } else {
      moveCPUPaddle(deltaSeconds);
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
    scores[scorer] += 1;
    updateScoreUI();

    if (scores[scorer] >= winningScore) {
      endGame(scorer);
      return;
    }

    const paddle = scorer === 'top' ? topPaddle : bottomPaddle;
    paddle.x = WIDTH / 2 - paddle.w / 2;
    beginServe(scorer);
  }

  function endGame(winner) {
    state = GameState.GAME_OVER;
    stopLoop();
    hideControlGuide();
    updateControlUI();

    const winnerText = mode === 'cpu'
      ? (winner === 'bottom' ? 'Você venceu!' : 'A CPU venceu!')
      : `${winner === 'top' ? 'Jogador 1' : 'Jogador 2'} venceu!`;
    setWinnerMessage(winnerText);
    setMessage('Reinicie para jogar novamente.');
  }

  function draw() {
    if (!topPaddle || !bottomPaddle) return;

    ctx.drawImage(backgroundCanvas, 0, 0, WIDTH, HEIGHT);
    drawPaddle(topPaddle, '#60a5fa');
    drawPaddle(bottomPaddle, '#f87171');

    if (ball) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPaddle(paddle, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 3);
    } else {
      ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
    ctx.fill();
  }

  function beginCountdown(seconds) {
    countdownRemaining = seconds;
    lastCountdownValue = null;
    state = GameState.COUNTDOWN;
    elements.countdown.classList.remove('hidden');
    updateCountdown(0);
    updateControlUI();
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
    state = GameState.PLAYING;
    beginOpeningDrop();
    setMessage('');
    updateControlUI();
  }

  function startLoop() {
    if (frameId !== null || !isMatchActive()) return;
    lastFrameTime = 0;
    frameId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameTime = 0;
  }

  function loop(timestamp) {
    frameId = null;
    if (!isMatchActive()) return;

    const deltaSeconds = lastFrameTime
      ? clamp((timestamp - lastFrameTime) / 1000, 0, MAX_DELTA_SECONDS)
      : 0;
    lastFrameTime = timestamp;

    updatePaddles(deltaSeconds);
    if (state === GameState.COUNTDOWN) updateCountdown(deltaSeconds);
    else updateBall(deltaSeconds);
    draw();

    if (isMatchActive()) frameId = requestAnimationFrame(loop);
  }

  function pauseGame(message = 'Pausado') {
    if (!isMatchActive()) return;

    resumeState = state;
    state = GameState.PAUSED;
    stopLoop();
    clearInput();
    showPauseMenu();
    setMessage(message);
    updateControlUI();
  }

  function resumeGame() {
    if (state !== GameState.PAUSED) return;

    hidePauseMenu();
    state = resumeState === GameState.COUNTDOWN && countdownRemaining > 0
      ? GameState.COUNTDOWN
      : GameState.PLAYING;
    setMessage(state === GameState.COUNTDOWN ? 'Preparar...' : '');
    updateControlUI();
    startLoop();
  }

  function togglePause() {
    if (state === GameState.PAUSED) resumeGame();
    else if (state === GameState.PLAYING) pauseGame();
  }

  function showPauseMenu() {
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
  }

  function openMenu(screenName = 'mainMenu') {
    stopLoop();
    hidePauseMenu();
    state = GameState.MENU;
    countdownRemaining = 0;
    lastCountdownValue = null;
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
    setMessage('Escolha o modo de jogo');
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
    setMessage('Preparar...');
    draw();
    startLoop();
  }

  function startPreparedMatch() {
    if (state !== GameState.READY) return;

    elements.readyOverlay.classList.add('hidden');
    beginCountdown(3);
    showControlGuide();
    setMessage('Preparar...');
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
      elements.labelTop.textContent = 'CPU (TOPO)';
      elements.labelBottom.textContent = 'VOCÊ (FUNDO)';
      elements.hint.textContent = 'Arraste para mover a raquete';
      elements.guideBottomLabel.textContent = 'VOCÊ';
    } else {
      elements.labelTop.textContent = 'JOGADOR 1 (TOPO)';
      elements.labelBottom.textContent = 'JOGADOR 2 (FUNDO)';
      elements.hint.textContent = 'Cada jogador arrasta na sua metade';
      elements.guideBottomLabel.textContent = 'JOGADOR 2';
    }
  }

  function updateControlUI() {
    elements.pauseButton.disabled = state !== GameState.PLAYING && state !== GameState.PAUSED;
    elements.pauseButton.textContent = state === GameState.PAUSED ? 'Continuar' : 'Pausar';
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

  function setMessage(text) {
    elements.message.textContent = text;
  }

  function setWinnerMessage(text) {
    elements.winnerMessage.textContent = text;
    elements.winnerMessage.classList.toggle('hidden', !text);
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
  elements.resetButton.addEventListener('click', resetMatch);
  elements.settingsButton.addEventListener('click', () => openMenu('settingsMenu'));
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

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);
  canvas.addEventListener('lostpointercapture', handlePointerEnd);

  window.addEventListener('resize', scheduleResize, { passive: true });
  window.addEventListener('orientationchange', scheduleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMatchActive()) pauseGame('Jogo pausado ao sair da aba');
  });

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
