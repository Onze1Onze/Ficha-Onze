const SOUND_BASE = new URL("../assets/audio/weapons/", import.meta.url);

export const WEAPON_AUDIO = Object.freeze({
  pistol: Object.freeze({ fire: "pistol-fire.wav", reload: "pistol-reload.ogg" }),
  revolver: Object.freeze({ fire: "revolver-fire.mp3", reload: "revolver-reload.wav" }),
  machinegun: Object.freeze({ fire: "machinegun-fire.ogg", reload: "machinegun-reload.ogg" }),
  "assault-rifle": Object.freeze({ fire: "assault-rifle-fire.ogg", reload: "assault-rifle-reload.ogg" }),
  shotgun: Object.freeze({ fire: "shotgun-fire.ogg", reload: "shotgun-reload.ogg" }),
  smg: Object.freeze({ fire: "smg-fire.ogg", reload: "smg-reload.ogg" }),
  sniper: Object.freeze({ fire: "sniper-fire.ogg", reload: "sniper-reload.ogg" }),
  "hunting-rifle": Object.freeze({ fire: "hunting-rifle-fire.ogg", reload: "hunting-rifle-reload.ogg" }),
});

const decodedBuffers = new Map();
const htmlAudioPools = new Map();
let audioContext;
let preloadPromise;

/** Create the context early but leave it suspended until a real player interaction. */
function getAudioContext() {
  try {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass({ latencyHint: "interactive" });
    return audioContext;
  } catch (error) {
    console.warn("Web Audio indisponível; usando o reprodutor HTML como alternativa.", error);
    audioContext = null;
    return null;
  }
}

function assetUrl(filename) {
  return new URL(filename, SOUND_BASE).href;
}

function getAudioKey(weaponId, kind) {
  return `${weaponId}:${kind}`;
}

function prepareHtmlAudioPool(key, filename) {
  if (typeof Audio === "undefined" || htmlAudioPools.has(key)) return;
  const pool = [];
  for (let i = 0; i < 2; i += 1) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    audio.src = assetUrl(filename);
    audio.load();
    pool.push(audio);
  }
  htmlAudioPools.set(key, pool);
}

/**
 * Download and decode every local asset before it is needed.
 * This avoids asking mobile browsers to start a network request in the same
 * gesture that must unlock audio playback.
 */
export function preloadWeaponAudio() {
  if (preloadPromise) return preloadPromise;

  const context = getAudioContext();
  const entries = Object.entries(WEAPON_AUDIO).flatMap(([weaponId, sounds]) =>
    Object.entries(sounds).map(([kind, filename]) => ({
      weaponId, kind, filename, key: getAudioKey(weaponId, kind),
    }))
  );

  for (const entry of entries) prepareHtmlAudioPool(entry.key, entry.filename);

  if (!context || typeof fetch !== "function") {
    preloadPromise = Promise.resolve(false);
    return preloadPromise;
  }

  preloadPromise = Promise.all(entries.map(async ({ key, filename }) => {
    try {
      const response = await fetch(assetUrl(filename), { cache: "force-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(bytes.slice(0));
      decodedBuffers.set(key, decoded);
      return true;
    } catch (error) {
      console.warn(`Não foi possível decodificar ${filename}; o reprodutor HTML será usado.`, error);
      return false;
    }
  })).then((results) => results.every(Boolean));
  return preloadPromise;
}

function playDecodedBuffer(key, buffer) {
  const context = getAudioContext();
  if (!context || !buffer) return false;

  try {
    // Calling resume synchronously within the click unlocks iOS/WebView contexts.
    if (context.state === "suspended") context.resume().catch((error) => {
      console.warn("Não foi possível desbloquear o áudio.", error);
    });

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = 1.18;
    source.connect(gain);
    gain.connect(context.destination);
    source.start(0);
    return true;
  } catch (error) {
    console.warn(`Falha ao iniciar o buffer ${key}.`, error);
    return false;
  }
}

function playHtmlAudio(key, fallback) {
  const pool = htmlAudioPools.get(key);
  if (!pool?.length) return false;

  const audio = pool.find((item) => item.paused || item.ended) ?? pool[0];
  try {
    audio.currentTime = 0;
    const result = audio.play();
    result?.catch((error) => {
      console.warn(`O navegador recusou a reprodução HTML do som ${key}.`, error);
      fallback();
    });
    return true;
  } catch (error) {
    console.warn(`Falha ao reproduzir o som HTML ${key}.`, error);
    fallback();
    return true;
  }
}

function resumeContext() {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    context.resume().catch((error) => console.warn("Falha ao retomar o áudio.", error));
  }
  return context;
}

/** A short, broadband fallback for the instant when an asset has not decoded yet. */
function synthesizeShot(weaponId = "pistol") {
  const context = resumeContext();
  if (!context) return;

  try {
    const isRevolver = weaponId === "revolver";
    const startAt = context.currentTime;
    const duration = isRevolver ? 0.19 : 0.135;
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const t = i / context.sampleRate;
      const decay = Math.exp(-t / (isRevolver ? 0.065 : 0.035));
      samples[i] = (Math.random() * 2 - 1) * decay * (1 - t / duration);
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isRevolver ? 920 : 1650, startAt);
    filter.Q.setValueAtTime(0.8, startAt);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(isRevolver ? 0.72 : 0.56, startAt + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(startAt);
    noise.stop(startAt + duration + 0.01);

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = "sawtooth";
    body.frequency.setValueAtTime(isRevolver ? 82 : 112, startAt);
    body.frequency.exponentialRampToValueAtTime(isRevolver ? 38 : 52, startAt + 0.12);
    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(isRevolver ? 0.32 : 0.21, startAt + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14);
    body.connect(bodyGain).connect(context.destination);
    body.start(startAt);
    body.stop(startAt + 0.15);
  } catch (error) {
    console.warn("Não foi possível gerar o fallback de disparo.", error);
  }
}

function synthesizeReload() {
  const context = resumeContext();
  if (!context) return;
  try {
    const startAt = context.currentTime;
    [0, 0.09, 0.22].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 1 ? "triangle" : "square";
      oscillator.frequency.setValueAtTime(index === 1 ? 780 : 1180, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.13, startAt + offset + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.06);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.065);
    });
  } catch (error) {
    console.warn("Não foi possível gerar o fallback de recarga.", error);
  }
}

function playLocalFile(weaponId, kind, fallback) {
  const key = getAudioKey(weaponId, kind);
  const filename = WEAPON_AUDIO[weaponId]?.[kind];
  if (!filename) {
    fallback();
    return false;
  }

  // If decoded, the source starts immediately in the trusted pointer/touch event.
  const buffer = decodedBuffers.get(key);
  if (buffer && playDecodedBuffer(key, buffer)) return true;

  // If Web Audio exists, trigger the synthesized fallback immediately inside the
  // trusted tap/click. This avoids losing the mobile audio-unlock gesture while a
  // file is still decoding in the background.
  if (getAudioContext()) {
    fallback();
    return false;
  }

  // Older embedded browsers without Web Audio use the preloaded HTMLAudio pool.
  const played = playHtmlAudio(key, fallback);
  if (played) return true;

  fallback();
  return false;
}

export function playWeaponShot(weaponId) {
  return playLocalFile(weaponId, "fire", () => synthesizeShot(weaponId));
}

export function playWeaponReload(weaponId) {
  return playLocalFile(weaponId, "reload", synthesizeReload);
}

/** Keeps the quick multi-shot cue for DISPARADA while using a resumed context. */
export function playBurst() {
  const context = resumeContext();
  if (!context) {
    synthesizeShot("machinegun");
    return;
  }

  try {
    const startAt = context.currentTime;
    for (let shot = 0; shot < 10; shot += 1) {
      const offset = shot * 0.055;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(164 - shot * 7, startAt + offset);
      gain.gain.setValueAtTime(0.0001, startAt + offset);
      gain.gain.exponentialRampToValueAtTime(0.19, startAt + offset + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.05);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + 0.055);
    }
  } catch (error) {
    console.warn("Não foi possível reproduzir a rajada.", error);
    synthesizeShot("machinegun");
  }
}

export function getAudioDiagnostics() {
  return {
    decodedBuffers: decodedBuffers.size,
    expectedBuffers: Object.values(WEAPON_AUDIO).reduce((total, sounds) => total + Object.keys(sounds).length, 0),
    contextState: audioContext?.state ?? "unavailable",
  };
}
