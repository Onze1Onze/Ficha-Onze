# Créditos dos efeitos sonoros

Os 16 arquivos desta pasta são cópias locais para que a extensão não dependa de servidores de áudio externos. Os nomes foram padronizados para o Arsenal; os sons não foram revendidos como biblioteca independente.

| Arma / evento | Arquivo no projeto | Origem do áudio | Autor / licença |
| --- | --- | --- | --- |
| Pistola — disparo | `pistol-fire.wav` | Efeito original sintetizado para o Ficha-Onze com ruído filtrado, transiente de alta frequência, corpo grave e cauda curta; WAV PCM mono 16-bit / 44,1 kHz | Produção própria do projeto, sem gravação de terceiros |
| Pistola — recarga | `pistol-reload.ogg` | [GunLib — deagle_reload.ogg](https://github.com/Deases/GunLib/blob/main/sounds/deagle_reload.ogg) | TheRichardGamer — CC0 1.0 (Freesound) |
| Revólver — disparo | `revolver-fire.wav` | Efeito original sintetizado para o Ficha-Onze com impacto grave prolongado, estalo amplo e reflexão curta; WAV PCM mono 16-bit / 44,1 kHz | Produção própria do projeto, sem gravação de terceiros |
| Revólver — recarga | `revolver-reload.wav` | [Gun reload sounds — gunreload1.wav](https://opengameart.org/content/gun-reload-sounds) | SpringySpringo — CC0 1.0; recorte mono derivado do projeto [Nephelia](https://github.com/ItsJuniorDias/nephelia/blob/main/assets/audio/sfx/opengameart/revolver_reload.wav) |
| Metralhadora — disparo | `machinegun-fire.ogg` | [GunLib — tommy_shot.ogg](https://github.com/Deases/GunLib/blob/main/sounds/tommy_shot.ogg) | waxsocks — CC0 1.0 (Freesound) |
| Metralhadora — recarga | `machinegun-reload.ogg` | [OpenSpades Free Pak — SMG ReloadLocal](https://github.com/DeathByDenim/openspades-free-pak/blob/main/License/Credits-pak001-Free.md) | LFA, Equipment Clicks III — CC0 1.0 |
| Fuzil de Assalto — disparo | `assault-rifle-fire.ogg` | [GunLib — ak47_shot.ogg](https://github.com/Deases/GunLib/blob/main/sounds/ak47_shot.ogg) | LeMudCrab — CC0 1.0 (Freesound) |
| Fuzil de Assalto — recarga | `assault-rifle-reload.ogg` | [GunLib — ak47_reload.ogg](https://github.com/Deases/GunLib/blob/main/sounds/ak47_reload.ogg) | serøutōnin--deprivəd — CC0 1.0 (Freesound) |
| Escopeta — disparo | `shotgun-fire.ogg` | [Shotgun Shoot + Reload — 10 Guage Shotgun](https://opengameart.org/content/shotgun-shoot-reload) | Mike Koenig (SoundBible) — CC-BY 3.0 |
| Escopeta — recarga | `shotgun-reload.ogg` | [Shotgun Shoot + Reload — Pump Shotgun](https://opengameart.org/content/shotgun-shoot-reload) | Mike Koenig (SoundBible) — CC-BY 3.0 |
| Submetralhadora — disparo | `smg-fire.ogg` | [The Free Firearm Sound Library — AR-15/D_24P](https://opengameart.org/content/the-free-firearm-sound-library) | Ben Jaszczak e colaboradores — CC0 1.0 |
| Submetralhadora — recarga | `smg-reload.ogg` | [Equipment Clicks III](https://opengameart.org/content/equipment-clicks-iii) | LFA — CC0 1.0 |
| Fuzil de Precisão — disparo | `sniper-fire.ogg` | [GunLib — awp_shot.ogg](https://github.com/Deases/GunLib/blob/main/sounds/awp_shot.ogg) | qubodup — CC0 1.0 (Freesound) |
| Fuzil de Precisão — recarga | `sniper-reload.ogg` | [GunLib — awp_reload.ogg](https://github.com/Deases/GunLib/blob/main/sounds/awp_reload.ogg) | GFL7 — CC0 1.0 (Freesound) |
| Fuzil de Caça — disparo | `hunting-rifle-fire.ogg` | [The Free Firearm Sound Library — A_42P](https://opengameart.org/content/the-free-firearm-sound-library) | Ben Jaszczak e colaboradores — CC0 1.0 |
| Fuzil de Caça — recarga | `hunting-rifle-reload.ogg` | [Gun Reload Sounds](https://opengameart.org/content/gun-reload-sounds) | SpringySpringo — CC0 1.0 |

## Observações de licença

- Os efeitos de escopeta estão sob **Creative Commons Attribution 3.0**. A atribuição acima acompanha os arquivos e a extensão.
- Os demais efeitos listados acima estão marcados como **CC0 1.0** nas páginas ou nos créditos das bibliotecas de origem.
- Os arquivos Ogg copiados de OpenSpades usam o contêiner Ogg/Opus e foram mantidos como Ogg para reprodução local nos navegadores modernos.
- A página da Mixkit foi consultada, mas os seus termos proíbem redistribuir os efeitos isoladamente, como itens de stock, em ferramentas/modelos ou junto de arquivos-fonte. Por isso, nenhum arquivo da Mixkit foi copiado para este repositório. Consulte a [licença de efeitos sonoros da Mixkit](https://mixkit.co/license/modal/sfxFree/).


## Correção de reprodução mobile

Os disparos de pistola e revólver usam agora WAV PCM mono 16-bit a 44,1 kHz, gerados por síntese DSP específica para cada arma. Isso evita dependência de decodificação Ogg para esses dois eventos em WebViews móveis. A extensão pré-carrega e decodifica os efeitos usando Web Audio API; o buffer é iniciado diretamente na interação do jogador. O reprodutor HTML permanece como alternativa para navegadores embarcados sem suporte ao decoder do Web Audio.
