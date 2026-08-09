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

No modo de um jogador, escolha a dificuldade e clique na mensagem central para iniciar a contagem regressiva de três segundos. As ações da partida ficam dentro do menu de pausa e o reinício exige confirmação.

Ao continuar uma partida pausada, uma nova contagem de três segundos é exibida antes de a bola voltar a se mover. A velocidade da bola aumenta 10% a cada quatro rebatidas, até o limite de duas vezes a velocidade inicial, tanto no desktop quanto no mobile.

## Configurações

A tela de configurações, acessível somente pelo menu principal, permite escolher a pontuação necessária para vencer. A dificuldade da CPU é selecionada ao entrar no modo de um jogador.

## Power-up

Nas duas versões, a bola pode coletar o power-up de fogo. O jogador dono daquele lado carrega uma tacada especial para sua próxima rebatida, que transfere o fogo para a bola e dobra sua velocidade até o adversário devolver ou a jogada terminar.

No desktop também existem os poderes de gelo, que congela a raquete adversária por dois segundos, e de crescimento, que dobra o tamanho da própria raquete por cinco segundos. Pode haver um poder aguardando em cada lado do campo; a contagem para o próximo começa assim que um item surge e pausa enquanto os dois lados estiverem ocupados. Todos os itens e efeitos da rodada são removidos quando alguém marca um ponto.

## Controles

### Desktop

- Jogador 1: `W` / `S` ou mouse.
- Jogador 2: setas para cima e para baixo.
- Pausar ou continuar: `Esc`.

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
|-- img/
|   |-- aumenta.webp
|   |-- gelo.png
|   `-- logo.png
|-- js/
|   |-- game-desktop.js
|   `-- game-mobile.js
`-- README.md
```

Cada versão mantém uma única instância do loop com `requestAnimationFrame` e estados explícitos de menu, contagem regressiva, partida, pausa e fim de jogo. A física usa `deltaTime` limitado, e a partida pausa quando a página perde visibilidade. Spawn, coleta e efeitos do power-up também são atualizados pelo mesmo loop.
