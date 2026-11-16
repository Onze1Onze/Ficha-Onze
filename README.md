# Arsenal de Munição — Owlbear Rodeo

Extensão compacta para selecionar armas, consumir munição individualmente, executar uma rajada de dez disparos e recarregar carregadores.

## Armas e capacidades

| Arma | Capacidade |
| --- | ---: |
| Pistola | 12 |
| Revólver | 6 |
| Metralhadora | 50 |
| Fuzil de Assalto | 30 |
| Escopeta | 6 |
| Submetralhadora | 20 |
| Fuzil de Precisão | 1 |
| Fuzil de Caça | 4 |

## Integração com o Owlbear Rodeo

A extensão usa o SDK oficial `@owlbear-rodeo/sdk` (versão 3.1.0). O estado do arsenal é salvo no namespace `com.onze1.ficha-onze.weapon-ammo` dos metadados do jogador atual (`OBR.player.getMetadata` / `OBR.player.setMetadata`). Cada participante grava o seu próprio estado; a extensão não usa metadados compartilhados da sala para guardar munição.

Quando a página é aberta fora de uma sala do Owlbear Rodeo, funciona como prévia e salva o estado em `localStorage` deste navegador.

Os ícones das oito armas são SVGs originais do projeto, armazenados localmente em `assets/weapons/`, com viewBox e dimensões intrínsecas padronizados (160 × 80). Os efeitos de disparo são sintetizados localmente com Web Audio API e só começam após uma interação do usuário. Não há arquivos de áudio remotos.

## Regras

- Clique em uma munição disponível para consumir somente aquele ícone.
- `DISPARADA` consome dez munições disponíveis de forma atômica; fica desabilitada quando restam menos de dez.
- `RECARREGAR` restaura apenas o carregador da arma selecionada.
- A quantidade de munição de cada arma é preservada ao alternar entre elas.

## Instalação

O site da extensão é publicado pelo GitHub Pages. Adicione este manifesto no gerenciador de extensões do Owlbear Rodeo:

`https://raw.githubusercontent.com/Onze1Onze/Ficha-Onze/main/manifest.json`

A página do popover e o ícone são servidos por `https://onze1onze.github.io/Ficha-Onze/`. O manifesto aponta para URLs absolutas do Pages para não depender do diretório-base do iframe.

## Testes locais

Requer Node.js 18 ou superior. Execute:

`npm test`

Os testes cobrem capacidades, persistência independente por arma, disparos individuais, disparada atômica, recarga seletiva, normalização dos dados e integridade dos SVGs. O fluxo do GitHub Actions também instala Chromium e verifica o alinhamento dos cartões, carregamento dos ícones, rolagem das 50 munições e dimensões dos botões em viewports de 280, 320, 360 e 440 px.