# 🎮 Ping Pong

Um jogo clássico de Ping Pong com suporte para desktop e mobile, desenvolvido em HTML5, CSS e JavaScript.

## 📁 Estrutura do Projeto

```
pingpong/
├── index.html                 # Página principal (seletor desktop/mobile)
├── ping_pong_desktop.html     # Versão desktop do jogo
├── ping_pong_mobile_v2.html   # Versão mobile do jogo
├── css/
│   ├── desktop.css            # Estilos da versão desktop
│   └── mobile.css             # Estilos da versão mobile
├── js/
│   ├── game-desktop.js        # Lógica do jogo (desktop)
│   └── game-mobile.js         # Lógica do jogo (mobile)
└── README.md                  # Este arquivo
```

## 🎯 Como Jogar

### Desktop (ping_pong_desktop.html)

**Controles:**
- **W/S** — Mover raquete para cima/baixo
- **Iniciar** — Começar o jogo
- **Pausar** — Pausar/Continuar
- **Reiniciar** — Resetar o jogo
- **2 Jogadores** — Alternar entre 1 jogador (vs CPU) e 2 jogadores

**Modo 2 Jogadores:**
- **Jogador 1:** W/S
- **Jogador 2:** Setas ⬆️⬇️

---

### Mobile (ping_pong_mobile_v2.html)

**Controles:**
- **Botões de toque** — Segure os botões < e > para mover a raquete
- **Menu** — Voltar ao menu de seleção de modo
- **Pausar** — Pausar/Continuar o jogo
- **Reiniciar** — Resetar o jogo

**Modos:**
- **1 Jogador:** Você contro a raquete inferior, CPU controla a superior
- **2 Jogadores:** Jogador 1 (baixo) vs Jogador 2 (superior)

---

## 🏗️ Organização do Código

### HTML
Cada arquivo HTML é responsável por uma versão específica:
- **Estrutura semântica** com elementos bem definidos
- **Meta tags** para responsividade e compatibilidade
- **Referência a CSS e JS** externos (separação de responsabilidades)

### CSS
Arquivos CSS independentes para cada versão:
- **desktop.css** — Layout horizontal com placar em cima
- **mobile.css** — Layout vertical com placar lateral e botões de toque

### JavaScript
Módulos JavaScript com padrão IIFE (Immediately Invoked Function Expression):
- **Encapsulamento** de estado global
- **API pública** clara (métodos expostos)
- **Separação** de responsabilidades (UI, física, renderização)

---

## 🚀 Como Usar

### Abrir no navegador
1. Abra `index.html` em um navegador web
2. O site detectará automaticamente se é desktop ou mobile
3. Para alternar versões manualmente, pressione a tecla **V**

### Estrutura de imports
Cada arquivo HTML referencia seus respectivos CSS e JS:

**Desktop:**
```html
<link rel="stylesheet" href="css/desktop.css" />
<script src="js/game-desktop.js"></script>
```

**Mobile:**
```html
<link rel="stylesheet" href="css/mobile.css" />
<script src="js/game-mobile.js"></script>
```

---

## 🎨 Design

- **Cores:** Dark mode (#0d0d0d background, cores vibrantes para contraste)
- **Fonte:** Segoe UI (sistema)
- **Responsividade:** Adaptável a qualquer tamanho de tela
- **Acessibilidade:** Labels ARIA para controlesde toque

---

## 🔧 Tecnologias

- **HTML5** — Estrutura semântica
- **CSS3** — Layouts responsivos, flexbox
- **Canvas API** — Renderização do jogo
- **JavaScript (ES6+)** — Lógica e interatividade

---

## 📝 Notas

- O código é bem comentado e estruturado em seções
- Constantes configuráveis no início de cada arquivo JS
- Fácil de expandir com novas funcionalidades
- Sem dependências externas

---

Divirta-se! 🎮
