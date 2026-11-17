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

Os ícones das oito armas são SVGs locais em `assets/weapons/`, com dimensões intrínsecas padronizadas (160 × 80). Sete deles foram substituídos nesta revisão pelos SVGs anexados para Pistola, Revólver, Metralhadora, Fuzil de Assalto, Escopeta, Submetralhadora e Fuzil de Precisão; o Fuzil de Caça mantém o ícone anterior porque não foi enviado um SVG correspondente. Há 16 arquivos de áudio locais em `assets/audio/weapons/`, com sons de disparo e recarga mapeados por arma. A pistola e o fuzil de caça reutilizam o disparo do fuzil de assalto; o revólver e a submetralhadora reutilizam o disparo da metralhadora. Os sons de recarga continuam individuais. Os arquivos são pré-carregados uma única vez por nome e compartilhados entre armas que usam o mesmo disparo. Quando a decodificação do Web Audio ainda está pendente, a extensão usa o arquivo local pré-carregado por HTML Audio em vez de substituir o disparo por um som sintetizado. As URLs dos módulos e áudios recebem uma revisão explícita para impedir que o navegador mantenha versões antigas em cache. A ação DISPARADA agenda dez cópias do som real da arma selecionada quando o buffer está disponível. Cada arma apresenta um formato de carregador temático: pistola em pilha dupla, revólver em tambor circular compacto, metralhadora em cinta, fuzil de assalto em carregador curvo, escopeta em cartuchos, submetralhadora compacta, precisão em retículo e caça em arranjo 2×2.

## Regras

- Clique em uma munição disponível para consumir somente aquele ícone e tocar o disparo da arma selecionada.
- `RECARREGAR` restaura o carregador e toca a recarga específica da arma selecionada.
- `DISPARADA` consome dez munições disponíveis de forma atômica; fica desabilitada quando restam menos de dez.
- `RECARREGAR` restaura apenas o carregador da arma selecionada.
- A quantidade de munição de cada arma é preservada ao alternar entre elas.
- O revólver apresenta as seis câmaras ao redor de um tambor circular, mantendo cada uma individualmente clicável.

## Instalação

O site da extensão é publicado pelo GitHub Pages. Adicione este manifesto no gerenciador de extensões do Owlbear Rodeo:

`https://raw.githubusercontent.com/Onze1Onze/Ficha-Onze/main/manifest.json`

A página do popover e o ícone são servidos por `https://onze1onze.github.io/Ficha-Onze/`. O manifesto aponta para URLs absolutas do Pages para não depender do diretório-base do iframe.

## Testes locais

Requer Node.js 18 ou superior. Execute:

`npm test`

Os testes cobrem capacidades, persistência independente por arma, disparos individuais, disparada atômica, recarga seletiva, normalização dos dados, integridade dos SVGs e os 16 arquivos de áudio (assinaturas WAV/Ogg/MP3 e mapeamento arma/evento). O fluxo do GitHub Actions também instala Chromium e verifica o alinhamento dos cartões, carregamento dos ícones, rolagem das 50 munições, geometria circular do tambor do revólver e dimensões dos botões em viewports de 280, 320, 360 e 440 px.

## Auditoria e origem dos ícones

Os sete SVGs anexados foram incorporados preservando sua geometria e seus `viewBox` originais, padronizando o canvas para 160 × 80 e a cor para `#9AAA93`, para manter contraste na interface escura. O ícone do Fuzil de Caça permanece o anterior por falta de um arquivo correspondente nesta rodada. Alguns arquivos anexados mantêm comentário de origem SVG Repo; confirme a licença e a atribuição exigida pela fonte antes de redistribuí-los publicamente.

A auditoria automática inclui:
- Testes de lógica para capacidades, operações inválidas e estado inicial.
- Integridade dos oito SVGs, canvas intrínseco 160 × 80, viewBoxes válidos, geometria e ausência de dependências externas.
- Integridade dos 16 sons locais e teste no navegador de disparo/recarga correspondentes para as oito armas.
- Testes de navegador em 280, 320, 360 e 440 px para alinhamento, limites dos ícones/nomes, rolagem, disparos, rajada, recarga e falha de áudio.
- Simulação de sincronização lenta do Owlbear para garantir que cliques durante o carregamento sejam reaplicados sem apagar munição remota de outras armas.
- Verificação HTTP dos arquivos hospedados e do manifesto.
