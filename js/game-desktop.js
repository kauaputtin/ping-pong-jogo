const Game = (() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const backgroundCanvas = document.createElement('canvas');
  const backgroundCtx = backgroundCanvas.getContext('2d', { alpha: false });

  const WIDTH = 1196;
  const HEIGHT = 610;
  const PADDLE_WIDTH = 5;
  const PADDLE_HEIGHT = 100;
  const BALL_RADIUS = 9;
  const BALL_SPEED = 1100;
  const KEYBOARD_PADDLE_SPEED = 1150;
  const DEFAULT_WINNING_SCORE = 10;
  const WINNING_SCORE_OPTIONS = Object.freeze([3, 5, 7, 10]);
  const WINNING_SCORE_STORAGE_KEY = 'ping-pong-winning-score';
  const MAX_DELTA_SECONDS = 1 / 30;
  const RALLY_SPEEDUP_EVERY_HITS = 4;
  const RALLY_SPEEDUP_STEP = 0.10;
  const MAX_RALLY_SPEED_MULTIPLIER = 2;

  const GameState = Object.freeze({
    MENU: 'MENU',
    READY: 'READY',
    COUNTDOWN: 'COUNTDOWN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  });

  const CPU_SETTINGS = Object.freeze({
    easy: { ballSpeed: 1000, maxSpeed: 165, reactionTime: 0.18, error: 58, aim: 0 },
    medium: { ballSpeed: 1100, maxSpeed: 245, reactionTime: 0.09, error: 24, aim: 0.25 },
    pro: { ballSpeed: 1200, maxSpeed: 335, reactionTime: 0.045, error: 8, aim: 0.45 }
  });

  const elements = {
    container: document.getElementById('game-container'),
    overlay: document.getElementById('overlay'),
    startMenu: document.getElementById('start-menu'),
    readyOverlay: document.getElementById('ready-overlay'),
    startPrompt: document.getElementById('start-prompt'),
    countdown: document.getElementById('countdown'),
    winnerMessage: document.getElementById('winner-message'),
    labelLeft: document.getElementById('label-left'),
    labelRight: document.getElementById('label-right'),
    scoreLeft: document.getElementById('score-left'),
    scoreRight: document.getElementById('score-right'),
    hint: document.getElementById('hint'),
    message: document.getElementById('msg'),
    playMenu: document.getElementById('play-menu'),
    settingsMenu: document.getElementById('settings-menu'),
    onePlayer: document.getElementById('menu-1p'),
    twoPlayers: document.getElementById('menu-2p'),
    menuButton: document.getElementById('btn-menu'),
    pauseButton: document.getElementById('btn-pause'),
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
  let scores = { left: 0, right: 0 };
  let leftPaddle;
  let rightPaddle;
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
  let mouseTargetY = null;
  let cpuTargetY = HEIGHT / 2;
  let cpuDecisionTimer = 0;
  let rallyHits = 0;

  const pressedKeys = new Set();

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
    backgroundCtx.setLineDash([8, 8]);
    backgroundCtx.strokeStyle = '#2a2a2a';
    backgroundCtx.lineWidth = 2;
    backgroundCtx.beginPath();
    backgroundCtx.moveTo(WIDTH / 2, 0);
    backgroundCtx.lineTo(WIDTH / 2, HEIGHT);
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

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const headerHeight = document.querySelector('h1')?.getBoundingClientRect().height || 0;
    const scoreboardHeight = document.getElementById('scoreboard')?.getBoundingClientRect().height || 0;
    const controlsHeight = elements.menuButton?.parentElement?.getBoundingClientRect().height || 0;
    const hintHeight = elements.hint?.getBoundingClientRect().height || 0;
    const messageHeight = elements.message?.getBoundingClientRect().height || 0;
    const availableHeight = Math.max(180, viewportHeight - headerHeight - scoreboardHeight - controlsHeight - hintHeight - messageHeight - 62);
    const availableWidth = Math.max(320, viewportWidth - 32);

    let width = Math.min(availableWidth, 1196);
    let height = width * (HEIGHT / WIDTH);

    if (height > availableHeight) {
      height = availableHeight;
      width = height * (WIDTH / HEIGHT);
    }

    elements.container.style.width = `${Math.floor(width)}px`;
    elements.container.style.height = `${Math.floor(height)}px`;
    refreshCanvasRect();
    draw();
  }

  function refreshCanvasRect() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvasRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
  }

  function isMatchActive() {
    return state === GameState.COUNTDOWN || state === GameState.PLAYING;
  }

  function clearInput() {
    pressedKeys.clear();
    mouseTargetY = null;
  }

  function handleKeyDown(event) {
    if (state === GameState.READY && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      startPreparedMatch();
      return;
    }
    if (!isMatchActive()) return;

    const isPlayerOneKey = ['w', 'W', 's', 'S'].includes(event.key);
    const isPlayerTwoKey = mode === 'pvp' && ['ArrowUp', 'ArrowDown'].includes(event.key);

    if (isPlayerOneKey) {
      pressedKeys.add(event.key.toLowerCase());
      mouseTargetY = null;
      event.preventDefault();
    }

    if (isPlayerTwoKey) {
      pressedKeys.add(event.key);
      event.preventDefault();
    }
  }

  function handleKeyUp(event) {
    pressedKeys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function handlePointerMove(event) {
    if (!isMatchActive()) return;

    mouseTargetY = (event.clientY - canvasRect.top) * (HEIGHT / canvasRect.height);
    leftPaddle.y = clamp(mouseTargetY - leftPaddle.h / 2, 0, HEIGHT - leftPaddle.h);
    draw();
  }

  function initMatch(resetScore = true) {
    leftPaddle = {
      x: 18,
      y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT
    };
    rightPaddle = {
      x: WIDTH - 18 - PADDLE_WIDTH,
      y: HEIGHT / 2 - PADDLE_HEIGHT / 2,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT
    };

    if (resetScore) scores = { left: 0, right: 0 };
    ball = null;
    serveAnimation = null;
    openingDropAnimation = null;
    cpuTargetY = HEIGHT / 2;
    cpuDecisionTimer = 0;
    updateScoreUI();
  }

  function spawnBall(server = null) {
    rallyHits = 0;
    const speed = getBallSpeed();
    const angle = (Math.random() * 0.5 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
    const serveFromLeft = server === 'left';
    const serveFromRight = server === 'right';
    const servingPaddle = serveFromLeft ? leftPaddle : serveFromRight ? rightPaddle : null;
    const horizontalDirection = server
      ? (serveFromLeft ? 1 : -1)
      : (Math.random() < 0.5 ? 1 : -1);

    return {
      x: serveFromLeft
        ? leftPaddle.x + leftPaddle.w + BALL_RADIUS + 4
        : serveFromRight
          ? rightPaddle.x - BALL_RADIUS - 4
          : WIDTH / 2,
      y: servingPaddle ? servingPaddle.y + servingPaddle.h / 2 : HEIGHT / 2,
      vx: horizontalDirection * Math.abs(speed * Math.cos(angle)),
      vy: speed * Math.sin(angle),
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

    if (ball.y - ball.r <= 0 && ball.vy < 0) {
      ball.y = ball.r;
      ball.vy *= -1;
    } else if (ball.y + ball.r >= HEIGHT && ball.vy > 0) {
      ball.y = HEIGHT - ball.r;
      ball.vy *= -1;
    }

    if (ball.vx < 0 && sweptPaddleCollision(ball, leftPaddle, previousX, previousY, 'left')) {
      ball.x = leftPaddle.x + leftPaddle.w + ball.r;
      reflectBall(ball, leftPaddle, 1);
    } else if (ball.vx > 0 && sweptPaddleCollision(ball, rightPaddle, previousX, previousY, 'right')) {
      ball.x = rightPaddle.x - ball.r;
      reflectBall(ball, rightPaddle, -1);
    }

    if (ball.x + ball.r < 0) {
      scorePoint('right');
      return;
    }

    if (ball.x - ball.r > WIDTH) scorePoint('left');
  }

  function reflectBall(currentBall, paddle, horizontalDirection) {
    const offset = clamp(
      (currentBall.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2),
      -1,
      1
    );
    rallyHits += 1;
    const speed = getRallyBallSpeed();
    const angle = offset * 0.85;

    currentBall.vx = horizontalDirection * Math.abs(speed * Math.cos(angle));
    currentBall.vy = speed * Math.sin(angle);
  }

  function collidesWithPaddle(currentBall, paddle) {
    return currentBall.x - currentBall.r < paddle.x + paddle.w &&
      currentBall.x + currentBall.r > paddle.x &&
      currentBall.y - currentBall.r < paddle.y + paddle.h &&
      currentBall.y + currentBall.r > paddle.y;
  }

  function sweptPaddleCollision(currentBall, paddle, previousX, previousY, side) {
    if (collidesWithPaddle(currentBall, paddle)) return true;

    const collisionX = side === 'left'
      ? paddle.x + paddle.w + currentBall.r
      : paddle.x - currentBall.r;
    const crossedPaddle = side === 'left'
      ? previousX >= collisionX && currentBall.x <= collisionX
      : previousX <= collisionX && currentBall.x >= collisionX;

    if (!crossedPaddle || previousX === currentBall.x) return false;

    const collisionTime = (collisionX - previousX) / (currentBall.x - previousX);
    const hitY = previousY + (currentBall.y - previousY) * collisionTime;
    return hitY >= paddle.y - currentBall.r && hitY <= paddle.y + paddle.h + currentBall.r;
  }

  function updatePaddles(deltaSeconds) {
    movePlayerOnePaddle(deltaSeconds);
    if (mode === 'cpu') moveCPUPaddle(deltaSeconds);
    else movePlayerTwoPaddle(deltaSeconds);
  }

  function movePlayerOnePaddle(deltaSeconds) {
    const keyboardDirection = Number(pressedKeys.has('s')) - Number(pressedKeys.has('w'));

    if (keyboardDirection !== 0) {
      leftPaddle.y += keyboardDirection * KEYBOARD_PADDLE_SPEED * deltaSeconds;
    } else if (mouseTargetY !== null) {
      leftPaddle.y = mouseTargetY - leftPaddle.h / 2;
    }

    leftPaddle.y = clamp(leftPaddle.y, 0, HEIGHT - leftPaddle.h);
  }

  function movePlayerTwoPaddle(deltaSeconds) {
    const direction = Number(pressedKeys.has('ArrowDown')) - Number(pressedKeys.has('ArrowUp'));
    rightPaddle.y += direction * KEYBOARD_PADDLE_SPEED * deltaSeconds;
    rightPaddle.y = clamp(rightPaddle.y, 0, HEIGHT - rightPaddle.h);
  }

  function movePaddleToward(paddle, targetCenterY, maxStep) {
    const targetY = clamp(targetCenterY - paddle.h / 2, 0, HEIGHT - paddle.h);
    const distance = targetY - paddle.y;
    paddle.y += clamp(distance, -maxStep, maxStep);
  }

  function reflectCoordinate(value, min, max) {
    const span = max - min;
    const period = span * 2;
    const offset = ((value - min) % period + period) % period;
    return offset <= span ? min + offset : max - (offset - span);
  }

  function predictBallYAtCPU() {
    if (!ball || ball.vx <= 0) return HEIGHT / 2;

    const collisionX = rightPaddle.x - ball.r;
    const timeToPaddle = (collisionX - ball.x) / ball.vx;
    if (timeToPaddle <= 0) return ball.y;

    return reflectCoordinate(
      ball.y + ball.vy * timeToPaddle,
      ball.r,
      HEIGHT - ball.r
    );
  }

  function moveCPUPaddle(deltaSeconds) {
    if (!ball) return;

    const cpu = CPU_SETTINGS[cpuDifficulty];
    cpuDecisionTimer -= deltaSeconds;

    if (cpuDecisionTimer <= 0) {
      const isApproaching = ball.vx > 0;
      const predictedY = isApproaching ? predictBallYAtCPU() : HEIGHT / 2;
      const playerCenterY = leftPaddle.y + leftPaddle.h / 2;
      const aimDirection = playerCenterY < HEIGHT / 2 ? 1 : -1;
      const aimOffset = isApproaching ? aimDirection * cpu.aim * rightPaddle.h / 2 : 0;
      const error = isApproaching ? (Math.random() * 2 - 1) * cpu.error : 0;
      cpuTargetY = clamp(
        predictedY - aimOffset + error,
        rightPaddle.h / 2,
        HEIGHT - rightPaddle.h / 2
      );
      cpuDecisionTimer = cpu.reactionTime;
    }

    movePaddleToward(rightPaddle, cpuTargetY, cpu.maxSpeed * deltaSeconds);
    rightPaddle.y = clamp(rightPaddle.y, 0, HEIGHT - rightPaddle.h);
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

    const paddle = scorer === 'left' ? leftPaddle : rightPaddle;
    paddle.y = HEIGHT / 2 - paddle.h / 2;
    beginServe(scorer);
  }

  function endGame(winner) {
    state = GameState.GAME_OVER;
    stopLoop();
    clearInput();
    updateControlUI();

    const winnerText = mode === 'cpu'
      ? (winner === 'left' ? 'Você venceu!' : 'A CPU venceu!')
      : `${winner === 'left' ? 'Jogador 1' : 'Jogador 2'} venceu!`;
    setWinnerMessage(winnerText);
    setMessage('Reinicie para jogar novamente.');
  }

  function draw() {
    if (!leftPaddle || !rightPaddle) return;

    ctx.drawImage(backgroundCanvas, 0, 0, WIDTH, HEIGHT);
    drawPaddle(leftPaddle, '#60a5fa');
    drawPaddle(rightPaddle, '#f87171');

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
    setMessage(message);
    updateControlUI();
  }

  function resumeGame() {
    if (state !== GameState.PAUSED) return;

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
    state = GameState.MENU;
    countdownRemaining = 0;
    lastCountdownValue = null;
    clearInput();
    initMatch(true);

    elements.overlay.classList.add('menu-active');
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
    mode = selectedMode;
    clearInput();
    initMatch(true);
    updateModeUI();

    elements.overlay.classList.remove('menu-active');
    elements.startMenu.classList.add('hidden');
    elements.readyOverlay.classList.add('hidden');
    setWinnerMessage('');

    if (waitForClick) {
      state = GameState.READY;
      elements.readyOverlay.classList.remove('hidden');
      setMessage('');
      updateControlUI();
      draw();
      return;
    }

    beginCountdown(3);
    setMessage('Preparar...');
    draw();
    startLoop();
  }

  function startPreparedMatch() {
    if (state !== GameState.READY) return;

    elements.readyOverlay.classList.add('hidden');
    beginCountdown(3);
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
      elements.labelLeft.textContent = 'JOGADOR';
      elements.labelRight.textContent = 'CPU';
    } else {
      elements.labelLeft.textContent = 'JOGADOR 1';
      elements.labelRight.textContent = 'JOGADOR 2';
    }

    elements.hint.textContent = mode === 'cpu'
      ? 'W / S ou Mouse - mover raquete'
      : 'P1: W / S ou Mouse - P2: setas';
  }

  function updateControlUI() {
    elements.pauseButton.disabled = state !== GameState.PLAYING && state !== GameState.PAUSED;
    elements.pauseButton.textContent = state === GameState.PAUSED ? 'Continuar' : 'Pausar';
  }

  function updateScoreUI() {
    elements.scoreLeft.textContent = String(scores.left);
    elements.scoreRight.textContent = String(scores.right);
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

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('pointerenter', refreshCanvasRect);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', startPreparedMatch);
  window.addEventListener('blur', clearInput);
  window.addEventListener('resize', scheduleResize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isMatchActive()) pauseGame('Jogo pausado ao sair da aba');
  });

  configureCanvasResolution();
  initMatch();
  updateModeUI();
  updateWinningScoreUI();
  resizeLayout();
  openMenu();

  return Object.freeze({
    openMenu,
    reset: resetMatch,
    togglePause
  });
})();
