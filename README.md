# Ping Pong The Game

Jogo de Ping Pong em HTML5 Canvas, CSS e JavaScript, com experiências próprias para desktop e celular e sem dependências externas.

## Como abrir

Abra `index.html` no navegador. A página carrega somente a versão adequada ao dispositivo:

- `ping_pong_desktop.html` para computador.
- `ping_pong_mobile_v2.html` para celular e tablet com tela de toque.

Também é possível abrir cada versão diretamente durante o desenvolvimento.

## Modos de jogo

- **1 Jogador:** jogador local contra a CPU, com dificuldade escolhida antes da partida.
- **2 Jogadores:** multiplayer local no mesmo dispositivo.

No modo de um jogador, escolha a dificuldade e clique na mensagem central para iniciar a contagem regressiva de três segundos. O botão **Reiniciar** inicia novamente o modo atual; o botão **Menu** encerra a partida e volta ao menu principal.

## Configurações

A tela de configurações está reservada para opções futuras e permanece sem ajustes disponíveis. Velocidade da bola, pontuação e controles usam valores fixos em cada versão; a dificuldade da CPU é escolhida ao entrar no modo de um jogador.

## Controles

### Desktop

- Jogador 1: `W` / `S` ou mouse.
- Jogador 2: setas para cima e para baixo.

### Mobile

- Arraste a raquete com o dedo na metade correspondente ao jogador.
- O modo de dois jogadores aceita dois toques simultâneos.

## Estrutura

```text
ping-pong-jogo/
|-- index.html
|-- ping_pong_desktop.html
|-- ping_pong_mobile_v2.html
|-- css/
|   |-- desktop.css
|   `-- mobile.css
|-- js/
|   |-- game-desktop.js
|   `-- game-mobile.js
`-- README.md
```

Cada versão mantém uma única instância do loop com `requestAnimationFrame` e estados explícitos de menu, contagem regressiva, partida, pausa e fim de jogo. A física usa `deltaTime` limitado, e a partida pausa quando a página perde visibilidade.
