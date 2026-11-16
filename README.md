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

Os ícones das oito armas são SVGs originais do projeto, armazenados localmente em `assets/weapons/`, com viewBox e dimensões intrínsecas padronizados (160 × 80). Há 16 efeitos de áudio locais em `assets/audio/weapons/`: um disparo e uma recarga próprios para cada arma. Os sons são pré-carregados sem autoplay e só são reproduzidos após uma interação legítima do jogador. Se o navegador não conseguir tocar um arquivo, a operação continua funcionando e usa um efeito sintetizado de fallback.

## Regras

- Clique em uma munição disponível para consumir somente aquele ícone e tocar o disparo da arma selecionada.
- `RECARREGAR` restaura o carregador e toca a recarga específica da arma selecionada.
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

Os testes cobrem capacidades, persistência independente por arma, disparos individuais, disparada atômica, recarga seletiva, normalização dos dados, integridade dos SVGs e os 16 arquivos de áudio (assinaturas WAV/Ogg/MP3 e mapeamento arma/evento). O fluxo do GitHub Actions também instala Chromium e verifica o alinhamento dos cartões, carregamento dos ícones, rolagem das 50 munições e dimensões dos botões em viewports de 280, 320, 360 e 440 px.

## Auditoria e origem dos ícones

Os oito desenhos em `assets/weapons/` foram criados especificamente para este projeto. A página Weapon SVG da Magnific foi consultada como referência estética, mas os arquivos editáveis da plataforma não foram copiados: as regras da Magnific proíbem redistribuir SVGs originais ou modificados em repositórios/coleções e impõem condições específicas para elementos visuais interativos em apps. Consulte os direitos de uso antes de incorporar recursos da plataforma.

A auditoria automática inclui:
- Testes de lógica para capacidades, operações inválidas e estado inicial.
- Integridade dos oito SVGs, viewBox 160 × 80, geometria e ausência de dependências externas.
- Integridade dos 16 sons locais e teste no navegador de disparo/recarga correspondentes para as oito armas.
- Testes de navegador em 280, 320, 360 e 440 px para alinhamento, limites dos ícones/nomes, rolagem, disparos, rajada, recarga e falha de áudio.
- Simulação de sincronização lenta do Owlbear para garantir que cliques durante o carregamento sejam reaplicados sem apagar munição remota de outras armas.
- Verificação HTTP dos arquivos hospedados e do manifesto.
