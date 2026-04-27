/* ─────────────────────────────────────────────────────
   Ping Pong — Lógica do Jogo (Mobile - Vertical)
   ───────────────────────────────────────────────────── */

const GameMobile = (() => {
  // ── Canvas setup ────────────────────────────────────
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  
  // Dimensões base (proporção 9:16)
  const BASE_WIDTH = 380;
  const BASE_HEIGHT = 640;
  
  // Configurar tamanho inicial do canvas
  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;
  
  // Função para manter proporção ao redimensionar a janela
  function maintainAspectRatio() {
    const maxWidth = Math.min(window.innerWidth - 20, 500);
    const scale = maxWidth / BASE_WIDTH;
    canvas.style.width = (BASE_WIDTH * scale) + 'px';
    canvas.style.height = (BASE_HEIGHT * scale) + 'px';
  }
  
  maintainAspectRatio();
  window.addEventListener('resize', maintainAspectRatio);
  
  const W = BASE_WIDTH;
  const H = BASE_HEIGHT;

  // ── Constantes ───────────────────────────────────────
  // Layout vertical: raquetes no topo e embaixo, movimento horizontal
  const PADDLE_W     = 90;   // Largura horizontal da raquete
  const PADDLE_H     = 8;    // Altura (espessura) da raquete
  const BASE_PADDLE_SPEED = 5;
  const BALL_RADIUS  = 6;
  const WINNING_SCORE = 5;
  const BASE_BALL_SPEED = 4.5;

  // ── Dificuldades ─────────────────────────────────────
  const DIFFICULTY_SETTINGS = {
    easy: { speed: 2.0, name: 'Fácil' },
    medium: { speed: 3.0, name: 'Médio' },
    pro: { speed: 4.0, name: 'Pro' }
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
  let touchX = null;

  // ── Event Listeners ──────────────────────────────────
  if (menu1pBtn) menu1pBtn.addEventListener('click', () => showDifficultyMenu());
  if (menu2pBtn) menu2pBtn.addEventListener('click', () => startNewMatch('pvp'));
  if (diffEasyBtn) diffEasyBtn.addEventListener('click', () => startNewMatch('cpu', 'easy'));
  if (diffMediumBtn) diffMediumBtn.addEventListener('click', () => startNewMatch('cpu', 'medium'));
  if (diffProBtn) diffProBtn.addEventListener('click', () => startNewMatch('cpu', 'pro'));

  // ── Touch controls (horizontal) ──────────────────────
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    touchX = e.touches[0].clientX - rect.left;
  }, { passive: false });

  canvas.addEventListener('touchend', () => { touchX = null; });

  // ── Atualizar UI do modo ────────────────────────────
  function updateModeUI() {
    if (mode === 'cpu') {
      if (labelLeft) labelLeft.textContent = 'CPU (TOPO)';
      if (labelRight) labelRight.textContent = 'VOCÊ (FUNDO)';
      if (btnDifficulty) btnDifficulty.classList.remove('hidden');
      if (hintEl) hintEl.textContent = 'Toque para mover a raquete';
    } else {
      if (labelLeft) labelLeft.textContent = 'JOGADOR 1 (TOPO)';
      if (labelRight) labelRight.textContent = 'JOGADOR 2 (FUNDO)';
      if (btnDifficulty) btnDifficulty.classList.add('hidden');
      if (hintEl) hintEl.textContent = 'Ambos: toque para mover';
    }
  }

  // ── Inicialização ────────────────────────────────────
  function initState(resetScore = true) {
    // Raquete no topo (Jogador 1 / Você)
    leftPaddle = {
      x: W / 2 - PADDLE_W / 2,
      y: 8,
      w: PADDLE_W,
      h: PADDLE_H
    };
    // Raquete no embaixo (Jogador 2 / CPU)
    rightPaddle = {
      x: W / 2 - PADDLE_W / 2,
      y: H - 8 - PADDLE_H,
      w: PADDLE_W,
      h: PADDLE_H
    };
    if (resetScore) scores = { left: 0, right: 0 };
    ball = null;
    updateScoreUI();
  }

  // ── Lógica da bola ───────────────────────────────────
  function spawnBall() {
    // No layout vertical, começamos com movimento mais vertical
    const angleOffset = Math.random() * 0.4 - 0.2; // -0.2 a 0.2
    const mod = mode === 'cpu' ? (SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy) : SPEED_MODIFIERS.easy;
    const speed = BASE_BALL_SPEED * mod.ball;
    const vy = speed * (Math.random() < 0.5 ? 1 : -1); // Começa com movimento vertical
    const vx = speed * angleOffset;
    return {
      x:  W / 2,
      y:  H / 2,
      vx: vx,
      vy: vy,
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

    // Colisão com paredes laterais (esquerda/direita)
    if (ball.x - ball.r <= 0)  {
      ball.x = ball.r;
      ball.vx *= -1;
    }
    if (ball.x + ball.r >= W)  {
      ball.x = W - ball.r;
      ball.vx *= -1;
    }

    // Colisão com paddle superior (CPU)
    if (collidesAABB(ball, leftPaddle)) {
      ball.y = leftPaddle.y + leftPaddle.h + ball.r;
      reflectBallVertical(ball, leftPaddle, +1);
    }

    // Colisão com paddle inferior (Jogador)
    if (collidesAABB(ball, rightPaddle)) {
      ball.y = rightPaddle.y - ball.r;
      reflectBallVertical(ball, rightPaddle, -1);
    }

    // Saiu pelo topo → ponto para o jogador (embaixo/rightPaddle)
    if (ball.y - ball.r < 0) {
      scores.right++;
      handlePoint(mode === 'cpu' ? 'Você' : 'Jogador 2');
    }

    // Saiu pelo embaixo → ponto para CPU (topo/leftPaddle)
    if (ball.y + ball.r > H) {
      scores.left++;
      handlePoint(mode === 'cpu' ? 'CPU' : 'Jogador 1');
    }
  }

  function reflectBallVertical(b, paddle, direction) {
    // Reflex baseado na posição horizontal da bola relativamente à raquete
    const offset = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const speed  = Math.min(Math.sqrt(b.vx ** 2 + b.vy ** 2) * 1.04, 16);
    const angle  = offset * 0.85;
    b.vx = speed * Math.sin(angle);
    b.vy = direction * Math.abs(speed * Math.cos(angle));
  }

  function collidesAABB(b, p) {
    return b.x - b.r < p.x + p.w &&
           b.x + b.r > p.x &&
           b.y - b.r < p.y + p.h &&
           b.y + b.r > p.y;
  }

  // ── Paddles ──────────────────────────────────────────
  function movePlayerPaddle() {
    // Jogador está no embaixo (rightPaddle)
    const mod = mode === 'cpu' ? (SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy) : SPEED_MODIFIERS.easy;
    const step = BASE_PADDLE_SPEED * mod.paddle * 1.5;
    if (touchX !== null) {
      const targetX = touchX - PADDLE_W / 2;
      const distance = Math.abs(targetX - rightPaddle.x);
      if (distance > 2) {
        const direction = targetX > rightPaddle.x ? 1 : -1;
        rightPaddle.x += Math.min(distance, step) * direction;
      }
    }
    rightPaddle.x = clamp(rightPaddle.x, 0, W - PADDLE_W);
  }

  function movePlayer2Paddle() {
    // Jogador 2 está no embaixo (rightPaddle)
    const mod = mode === 'cpu' ? (SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy) : SPEED_MODIFIERS.easy;
    const step = BASE_PADDLE_SPEED * mod.paddle * 1.5;
    if (touchX !== null) {
      const targetX = touchX - PADDLE_W / 2;
      const distance = Math.abs(targetX - rightPaddle.x);
      if (distance > 2) {
        const direction = targetX > rightPaddle.x ? 1 : -1;
        rightPaddle.x += Math.min(distance, step) * direction;
      }
    }
    rightPaddle.x = clamp(rightPaddle.x, 0, W - PADDLE_W);
  }

  function moveCPUPaddle() {
    // CPU está no topo (leftPaddle)
    if (!ball) return;
    const center = leftPaddle.x + PADDLE_W / 2;
    const threshold = difficulty === 'easy' ? 20 : (difficulty === 'medium' ? 8 : 3);
    const mod = SPEED_MODIFIERS[difficulty] ?? SPEED_MODIFIERS.easy;
    const cpuSpeed = currentCPUSpeed * mod.paddle * 1.2;
    
    if (center < ball.x - threshold) leftPaddle.x += cpuSpeed;
    else if (center > ball.x + threshold) leftPaddle.x -= cpuSpeed;
    leftPaddle.x = clamp(leftPaddle.x, 0, W - PADDLE_W);
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
    setMsg(`${winner} venceu! Toque para jogar novamente.`);
    document.getElementById('btn-pause').disabled = true;
  }

  // ── Renderização ─────────────────────────────────────
  function drawBackground() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Linha de divisão horizontal (no meio do campo)
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPaddle(p, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const radius = 3;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(p.x, p.y, p.w, p.h, radius);
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
    if (mode === 'pvp') movePlayer2Paddle();
    else moveCPUPaddle();

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
    touchX = null;
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
    touchX = null;
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
