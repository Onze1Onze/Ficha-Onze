const SOUND_BASE = new URL("../assets/audio/weapons/", import.meta.url);

export const WEAPON_AUDIO = Object.freeze({
  pistol: Object.freeze({ fire: "pistol-fire.ogg", reload: "pistol-reload.ogg" }),
  revolver: Object.freeze({ fire: "revolver-fire.ogg", reload: "revolver-reload.wav" }),
  machinegun: Object.freeze({ fire: "machinegun-fire.ogg", reload: "machinegun-reload.ogg" }),
  "assault-rifle": Object.freeze({ fire: "assault-rifle-fire.ogg", reload: "assault-rifle-reload.ogg" }),
  shotgun: Object.freeze({ fire: "shotgun-fire.ogg", reload: "shotgun-reload.ogg" }),
  smg: Object.freeze({ fire: "smg-fire.ogg", reload: "smg-reload.ogg" }),
  sniper: Object.freeze({ fire: "sniper-fire.ogg", reload: "sniper-reload.ogg" }),
  "hunting-rifle": Object.freeze({ fire: "hunting-rifle-fire.ogg", reload: "hunting-rifle-reload.ogg" }),
});

const preloaders = new Map();
const activeSounds = new Set();
let audioContext;

function assetUrl(filename) {
  return new URL(filename, SOUND_BASE).href;
}

/** Warm the browser cache without playing anything or bypassing autoplay restrictions. */
export function preloadWeaponAudio() {
  if (typeof Audio === "undefined") return;

  for (const [weaponId, sounds] of Object.entries(WEAPON_AUDIO)) {
    for (const [kind, filename] of Object.entries(sounds)) {
      const key = `${weaponId}:${kind}`;
      if (preloaders.has(key)) continue;

      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.volume = 0.96;
        audio.src = assetUrl(filename);
        preloaders.set(key, audio);
        audio.load();
      } catch (error) {
        console.warn(`Não foi possível preparar o áudio ${filename}.`, error);
      }
    }
  }
}

function getAudioContext() {
  try {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") {
      const resumed = audioContext.resume();
      resumed?.catch(() => {});
    }
    return audioContext;
  } catch (error) {
    console.warn("Áudio de fallback indisponível neste navegador.", error);
    audioContext = null;
    return null;
  }
}

function synthesizeShot() {
  const context = getAudioContext();
  if (!context) return;

  try {
    const startAt = context.currentTime;
    const duration = 0.105;
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const decay = 1 - i / frames;
      samples[i] = (Math.random() * 2 - 1) * decay * decay;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1450, startAt);
    filter.Q.setValueAtTime(0.72, startAt);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.46, startAt + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(startAt);
    noise.stop(startAt + duration + 0.01);

    const body = context.createOscillator();
    body.type = "sawtooth";
    body.frequency.setValueAtTime(128, startAt);
    body.frequency.exponentialRampToValueAtTime(47, startAt + 0.075);
    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.085);
    body.connect(bodyGain).connect(context.destination);
    body.start(startAt);
    body.stop(startAt + 0.095);
  } catch (error) {
    console.warn("Não foi possível reproduzir o fallback de disparo.", error);
  }
}

function synthesizeReload() {
  const context = getAudioContext();
  if (!context) return;

  try {
    const startAt = context.currentTime;
    [0, 0.09, 0.22].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 1 ? "triangle" : "square";
      oscillator.frequency.setValueAtTime(index === 1 ? 780 : 1180, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.11, startAt + offset + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.055);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.06);
    });
  } catch (error) {
    console.warn("Não foi possível reproduzir o fallback de recarga.", error);
  }
}

function playLocalFile(weaponId, kind, fallback) {
  const filename = WEAPON_AUDIO[weaponId]?.[kind];
  if (!filename) {
    fallback();
    return false;
  }

  try {
    if (typeof Audio === "undefined") {
      fallback();
      return false;
    }

    // A fresh Audio instance avoids cloneNode() state/readiness problems in mobile browsers.
    const audio = new Audio(assetUrl(filename));
    audio.preload = "auto";
    audio.volume = 0.96;
    let failed = false;
    const cleanup = () => activeSounds.delete(audio);
    const useFallback = (error) => {
      if (failed) return;
      failed = true;
      cleanup();
      console.warn(`Falha ao tocar ${filename}; usando áudio de fallback.`, error);
      fallback();
    };

    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", () => useFallback(audio.error), { once: true });
    activeSounds.add(audio);

    // Called synchronously from the player's ammo or reload click.
    const result = audio.play();
    result?.catch(useFallback);
    return true;
  } catch (error) {
    console.warn(`Falha ao iniciar ${filename}; usando áudio de fallback.`, error);
    fallback();
    return false;
  }
}

export function playWeaponShot(weaponId) {
  return playLocalFile(weaponId, "fire", synthesizeShot);
}

export function playWeaponReload(weaponId) {
  return playLocalFile(weaponId, "reload", synthesizeReload);
}

/** Retains the fast multi-shot cue for the DISPARADA action. */
export function playBurst() {
  const context = getAudioContext();
  if (!context) {
    synthesizeShot();
    return;
  }

  try {
    const startAt = context.currentTime;
    for (let shot = 0; shot < 6; shot += 1) {
      const offset = shot * 0.072;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150 - shot * 9, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.17, startAt + offset + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.065);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.07);
    }
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito de rajada.", error);
    synthesizeShot();
  }
}
