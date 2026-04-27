/* ─────────────────────────────────────────────────────
   Ping Pong — Lógica do Jogo (Desktop)
   ───────────────────────────────────────────────────── */

const Game = (() => {
  // ── Canvas setup ────────────────────────────────────
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // ── Constantes ───────────────────────────────────────
  const PADDLE_W     = 10;
  const PADDLE_H     = 70;
  const BASE_PADDLE_SPEED = 5;
  const BALL_RADIUS  = 9;
  const WINNING_SCORE = 7;
  const BASE_BALL_SPEED = 6.0;

  // ── Dificuldades ─────────────────────────────────────
  const DIFFICULTY_SETTINGS = {
    easy: { speed: 2.5, name: 'Fácil' },
    medium: { speed: 3.8, name: 'Médio' },
    pro: { speed: 5.2, name: 'Pro' }
  };

  // Mantem o facil como esta e acelera no medio/pro.
  const SPEED_MODIFIERS = {
    easy:   { ball: 1.0,  paddle: 1.0 },
    medium: { ball: 1.25, paddle: 1.20 },
    pro:    { ball: 1.50, paddle: 1.40 }
  };

  // ── Estado global ────────────────────────────────────
  let running  = false;
  let paused   = false;
  let gameOver = false;
  let animId   = null;
  let scores   = { left: 0, right: 0 };
  let leftPaddle, rightPaddle, ball;
  let mode = 'cpu'; // 'cpu' | 'pvp'
  let difficulty = 'medium';
  let currentCPUSpeed = DIFFICULTY_SETTINGS.medium.speed;

  const labelLeft = document.getElementById('label-left');
  const labelRight = document.getElementById('label-right');
  const hintEl = document.getElementById('hint');
  const btnDifficulty = document.getElementById('btn-difficulty');
  const startMenuEl = document.getElementById('start-menu');
  const difficultyMenuEl = document.getElementById('difficulty-menu');
  const countdownEl = document.getElementById('countdown');
  const menu1pBtn = document.getElementById('menu-1p');
  const menu2pBtn = document.getElementById('menu-2p');
  const diffEasyBtn = document.getElementById('diff-easy');
  const diffMediumBtn = document.getElementById('diff-medium');
  const diffProBtn = document.getElementById('diff-pro');

  let countdownUntil = 0;
  let lastCountdownShown = null;
  let serveAnim = null;

  // ── Event Listeners ──────────────────────────────────
  if (menu1pBtn) menu1pBtn.addEventListener('click', () => showDifficultyMenu());
  if (menu2pBtn) menu2pBtn.addEventListener('click', () => startNewMatch('pvp'));
  if (diffEasyBtn) diffEasyBtn.addEventListener('click', () => startNewMatch('cpu', 'easy'));
  if (diffMediumBtn) diffMediumBtn.addEventListener('click', () => startNewMatch('cpu', 'medium'));
  if (diffProBtn) diffProBtn.addEventListener('click', () => startNewMatch('cpu', 'pro'));

  // ── Teclado ─────────────────────────────────────────
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (['w','s','W','S','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => { keys[e.key] = false; });

  // ── Atualizar UI do modo ────────────────────────────
  function updateModeUI() {
    if (mode === 'cpu') {
      if (labelLeft) labelLeft.textContent = 'JOGADOR';
      if (labelRight) labelRight.textContent = 'CPU';
      if (btnDifficulty) btnDifficulty.classList.remove('hidden');
      if (hintEl) hintEl.textContent = 'W / S  -  mover raquete';
    } else {
      if (labelLeft) labelLeft.textContent = 'JOGADOR 1';
      if (labelRight) labelRight.textContent = 'JOGADOR 2';
      if (btnDifficulty) btnDifficulty.classList.add('hidden');
      if (hintEl) hintEl.textContent = 'P1: W/S  -  P2: setas';
    }
  }

  // ── Inicialização ────────────────────────────────────
  function initState(resetScore = true) {
    leftPaddle = {
      x: 18,
      y: H / 2 - PADDLE_H / 2,
      w: PADDLE_W,
      h: PADDLE_H
    };
    rightPaddle = {
      x: W - 18 - PADDLE_W,
      y: H / 2 - PADDLE_H / 2,
      w: PADDLE_W,
      h: PADDLE_H
    };
    if (resetScore) scores = { left: 0, right: 0 };
    ball = null;
    updateScoreUI();
  }

  // ── Lógica da bola ───────────────────────────────────
  function spawnBall() {
    const angle = (Math.random() * 0.5 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
    const mod = mode === 'cpu' ? (SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy) : SPEED_MODIFIERS.easy;
    const speed = BASE_BALL_SPEED * mod.ball;
    return {
      x:  W / 2,
      y:  H / 2,
      vx: speed * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1),
      vy: speed * Math.sin(angle),
      r:  BALL_RADIUS
    };
  }

  function beginServeDrop() {
    const next = spawnBall();
    const startR = BALL_RADIUS * 3.4;
    serveAnim = {
      start: performance.now(),
      duration: 520,
      startR,
      endR: BALL_RADIUS,
      vx: next.vx,
      vy: next.vy
    };
    ball = { x: next.x, y: next.y, vx: 0, vy: 0, r: startR };
  }

  function moveBall(now) {
    if (!ball) return;

    if (serveAnim) {
      const t = clamp((now - serveAnim.start) / serveAnim.duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      ball.r = serveAnim.startR + (serveAnim.endR - serveAnim.startR) * eased;
      if (t >= 1) {
        ball.r = serveAnim.endR;
        ball.vx = serveAnim.vx;
        ball.vy = serveAnim.vy;
        serveAnim = null;
      }
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Colisão com paredes (topo/fundo)
    if (ball.y - ball.r <= 0)  {
      ball.y = ball.r;
      ball.vy *= -1;
    }
    if (ball.y + ball.r >= H)  {
      ball.y = H - ball.r;
      ball.vy *= -1;
    }

    // Colisão com paddle esquerdo (jogador)
    if (collidesAABB(ball, leftPaddle)) {
      ball.x = leftPaddle.x + leftPaddle.w + ball.r;
      reflectBall(ball, leftPaddle, +1);
    }

    // Colisão com paddle direito (CPU)
    if (collidesAABB(ball, rightPaddle)) {
      ball.x = rightPaddle.x - ball.r;
      reflectBall(ball, rightPaddle, -1);
    }

    // Saiu pela esquerda → ponto para CPU
    if (ball.x + ball.r < 0) {
      scores.right++;
      handlePoint(mode === 'cpu' ? 'CPU' : 'Jogador 2');
    }

    // Saiu pela direita → ponto para o jogador
    if (ball.x - ball.r > W) {
      scores.left++;
      handlePoint(mode === 'cpu' ? 'Jogador' : 'Jogador 1');
    }
  }

  function reflectBall(b, paddle, direction) {
    const offset = (b.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const speed  = Math.min(Math.sqrt(b.vx ** 2 + b.vy ** 2) * 1.04, 18);
    const angle  = offset * 0.85;
    b.vx = direction * Math.abs(speed * Math.cos(angle));
    b.vy = speed * Math.sin(angle);
  }

  function collidesAABB(b, p) {
    return b.x - b.r < p.x + p.w &&
           b.x + b.r > p.x &&
           b.y - b.r < p.y + p.h &&
           b.y + b.r > p.y;
  }

  // ── Paddles ──────────────────────────────────────────
  function movePlayerPaddle() {
    const mod = mode === 'cpu' ? (SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy) : SPEED_MODIFIERS.easy;
    const paddleSpeed = BASE_PADDLE_SPEED * mod.paddle;
    if (keys['w'] || keys['W']) leftPaddle.y -= paddleSpeed;
    if (keys['s'] || keys['S']) leftPaddle.y += paddleSpeed;
    leftPaddle.y = clamp(leftPaddle.y, 0, H - PADDLE_H);
  }

  function movePlayer2Paddle() {
    if (keys['ArrowUp']) rightPaddle.y -= BASE_PADDLE_SPEED;
    if (keys['ArrowDown']) rightPaddle.y += BASE_PADDLE_SPEED;
    rightPaddle.y = clamp(rightPaddle.y, 0, H - PADDLE_H);
  }

  function moveCPUPaddle() {
    if (!ball) return;
    const center = rightPaddle.y + PADDLE_H / 2;
    const threshold = difficulty === 'easy' ? 15 : (difficulty === 'medium' ? 6 : 3);
    const mod = SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy;
    const cpuSpeed = currentCPUSpeed * mod.paddle;
    
    if (center < ball.y - threshold) rightPaddle.y += cpuSpeed;
    else if (center > ball.y + threshold) rightPaddle.y -= cpuSpeed;
    rightPaddle.y = clamp(rightPaddle.y, 0, H - PADDLE_H);
  }

  // ── Pontuação / vitória ──────────────────────────────
  function handlePoint(scorer) {
    updateScoreUI();
    if (scores.left >= WINNING_SCORE || scores.right >= WINNING_SCORE) {
      endGame(scorer);
    } else {
      beginServeDrop();
    }
  }

  function endGame(winner) {
    gameOver = true;
    running  = false;
    setMsg(`${winner} venceu! Pressione Reiniciar para jogar novamente.`);
    document.getElementById('btn-pause').disabled = true;
  }

  // ── Renderização ─────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPaddle(p, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const radius = 4;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(p.x, p.y, p.w, p.h, radius);
    } else if (typeof ctx.arcTo === 'function') {
      const r = Math.min(radius, p.w / 2, p.h / 2);
      const x = p.x, y = p.y, w = p.w, h = p.h;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    } else {
      ctx.rect(p.x, p.y, p.w, p.h);
    }
    ctx.fill();
  }

  function drawBall() {
    if (!ball) return;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    drawBackground();
    drawPaddle(leftPaddle,  '#60a5fa');
    drawPaddle(rightPaddle, '#f87171');
    drawBall();
  }

  // ── Game loop ────────────────────────────────────────
  function beginCountdown(seconds) {
    countdownUntil = performance.now() + seconds * 1000;
    lastCountdownShown = null;
    if (countdownEl) {
      countdownEl.classList.remove('hidden');
      countdownEl.textContent = String(seconds);
    }
  }

  function updateCountdown(now) {
    if (!countdownUntil || !countdownEl) return false;
    const remaining = countdownUntil - now;
    if (remaining <= 0) {
      countdownUntil = 0;
      lastCountdownShown = null;
      countdownEl.classList.add('hidden');
      countdownEl.textContent = '';
      return true;
    }
    const value = Math.ceil(remaining / 1000);
    if (value !== lastCountdownShown) {
      lastCountdownShown = value;
      countdownEl.textContent = String(value);
    }
    return false;
  }

  function startRally() {
    ball = spawnBall();
    document.getElementById('btn-pause').disabled = false;
    setMsg('');
  }

  function loop(ts) {
    if (!running || paused || gameOver) return;
    const now = ts ?? performance.now();

    movePlayerPaddle();
    if (mode === 'cpu') moveCPUPaddle();
    else movePlayer2Paddle();

    if (countdownUntil) {
      if (updateCountdown(now)) startRally();
    } else {
      moveBall(now);
    }

    draw();
    animId = requestAnimationFrame(loop);
  }

  // ── Utilitários ──────────────────────────────────────
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function updateScoreUI() {
    document.getElementById('score-left').textContent  = scores.left;
    document.getElementById('score-right').textContent = scores.right;
  }

  function setMsg(text) {
    document.getElementById('msg').textContent = text;
  }

  // ── Menu & Dificuldade ───────────────────────────────
  function showDifficultyMenu() {
    if (startMenuEl) startMenuEl.classList.add('hidden');
    if (difficultyMenuEl) difficultyMenuEl.classList.remove('hidden');
  }

  function openMenu() {
    cancelAnimationFrame(animId);
    running  = false;
    paused   = false;
    gameOver = false;
    countdownUntil = 0;
    lastCountdownShown = null;
    serveAnim = null;
    ball = null;
    initState(true);
    
    if (startMenuEl) startMenuEl.classList.remove('hidden');
    if (difficultyMenuEl) difficultyMenuEl.classList.add('hidden');
    if (countdownEl) {
      countdownEl.classList.add('hidden');
      countdownEl.textContent = '';
    }
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-pause').textContent = 'Pausar';
    setMsg('Escolha o modo de jogo');
    draw();
  }

  function openDifficultyMenu() {
    if (running && !gameOver) {
      showDifficultyMenu();
    }
  }

  function startNewMatch(selectedMode, selectedDifficulty = null) {
    cancelAnimationFrame(animId);
    mode = selectedMode;
    if (selectedDifficulty) {
      difficulty = selectedDifficulty;
      currentCPUSpeed = DIFFICULTY_SETTINGS[selectedDifficulty].speed;
    }
    running  = true;
    paused   = false;
    gameOver = false;
    serveAnim = null;
    initState(true);
    updateModeUI();
    if (startMenuEl) startMenuEl.classList.add('hidden');
    if (difficultyMenuEl) difficultyMenuEl.classList.add('hidden');
    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-pause').textContent = 'Pausar';
    beginCountdown(3);
    setMsg('Preparar...');
    draw();
    animId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    const btn = document.getElementById('btn-pause');
    btn.textContent = paused ? 'Continuar' : 'Pausar';
    if (!paused) {
      setMsg('');
      loop();
    } else {
      setMsg('Pausado');
    }
  }

  function reset() {
    openMenu();
  }

  // ── Boot ─────────────────────────────────────────────
  initState();
  updateModeUI();
  draw();

  return { 
    openMenu, 
    togglePause, 
    reset, 
    start: openMenu,
    openDifficultyMenu
  };
})();
