# Ficha Onze — extensão para Owlbear Rodeo

Uma extensão leve para visualizar uma ficha do Google Sheets dentro da interface do Owlbear Rodeo. Não usa servidor próprio, não pede login e não altera os dados da planilha.

## Como publicar a extensão

1. Abra **Settings → Pages** neste repositório.
2. Em **Build and deployment**, selecione **GitHub Actions** como origem.
3. Acesse a aba **Actions** e confirme que o fluxo **Deploy Ficha Onze to GitHub Pages** terminou com sucesso.
4. O endereço do manifesto será:

   `https://Onze1Onze.github.io/Ficha-Onze/manifest.json`

5. No Owlbear Rodeo, abra **Extras → Extensions → Add Extension** e cole esse endereço.
6. Ative a extensão na sala. O botão **Ficha Onze** aparecerá na barra superior.

## Como conectar uma ficha

1. No Google Sheets, abra a planilha da ficha.
2. Escolha **Arquivo → Compartilhar → Publicar na web**.
3. Selecione a planilha inteira, confirme a publicação e copie o link.
4. Abra **Ficha Onze** no Owlbear e cole o link. O leitor também aceita o endereço de incorporação (`src`) copiado do código HTML do Google.

A extensão transforma links comuns de edição em endereços de visualização incorporada. Para isso, a planilha precisa estar publicada na web. Confira cuidadosamente o público escolhido antes de publicar: o conteúdo publicado pode ficar visível para as pessoas abrangidas pela opção de publicação do Google.

## O que está incluído

- Botão de ação no topo da sala do Owlbear Rodeo.
- Janela incorporada com visualização rolável da planilha.
- Suporte a links comuns do Sheets e links de incorporação.
- Ação para abrir o endereço original em uma nova aba do navegador.
- Salvamento local do endereço para reutilizar no mesmo navegador e dispositivo.
- Interface responsiva, sem dependências externas ou backend.

## Privacidade e limites

O link fica no armazenamento local do navegador em que a extensão foi aberta. Ele não é sincronizado com outros jogadores, não é transmitido para o repositório e não concede acesso à planilha por si só. A exibição dentro do Owlbear depende das configurações de publicação e das políticas de incorporação do Google. Se a planilha não carregar, abra-a pelo botão de nova aba e confira se a publicação está ativa.

A janela da extensão é um popover oficial do Owlbear Rodeo, e não uma nova aba interna da aplicação. O botão **Abrir em nova aba** abre a planilha em uma aba normal do navegador.

## Desenvolvimento local

Como o projeto é estático, basta servir a pasta por HTTP/HTTPS. Para testar com o Owlbear, use um servidor local como `npx serve .` e instale temporariamente o endereço do `manifest.json` servido.
