let audioContext;

function getAudioContext() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") {
      // Called only inside a click handler, respecting browser autoplay policies.
      const resumeResult = audioContext.resume();
      resumeResult?.catch(() => {});
    }
    return audioContext;
  } catch (error) {
    // Audio must never prevent ammunition from being consumed.
    console.warn("Áudio indisponível neste navegador.", error);
    audioContext = null;
    return null;
  }
}

function scheduleShot(context, startAt, intensity = 1) {
  const sampleRate = context.sampleRate;
  const duration = 0.105;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const decay = 1 - index / frameCount;
    channel[index] = (Math.random() * 2 - 1) * decay * decay;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(1450, startAt);
  bandpass.Q.setValueAtTime(0.72, startAt);

  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(0.0001, startAt);
  noiseGain.gain.exponentialRampToValueAtTime(0.46 * intensity, startAt + 0.004);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  noise.connect(bandpass).connect(noiseGain).connect(context.destination);
  noise.start(startAt);
  noise.stop(startAt + duration + 0.01);

  const body = context.createOscillator();
  body.type = "sawtooth";
  body.frequency.setValueAtTime(128, startAt);
  body.frequency.exponentialRampToValueAtTime(47, startAt + 0.075);
  const bodyFilter = context.createBiquadFilter();
  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(430, startAt);
  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(0.0001, startAt);
  bodyGain.gain.exponentialRampToValueAtTime(0.22 * intensity, startAt + 0.003);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.085);
  body.connect(bodyFilter).connect(bodyGain).connect(context.destination);
  body.start(startAt);
  body.stop(startAt + 0.095);
}

export function playShot() {
  const context = getAudioContext();
  if (!context) return;
  try {
    scheduleShot(context, context.currentTime, 1);
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito de disparo.", error);
  }
}

export function playBurst() {
  const context = getAudioContext();
  if (!context) return;
  try {
    const startAt = context.currentTime;
    // A short, locally synthesised burst; it does not fetch or stream audio files.
    for (let shot = 0; shot < 6; shot += 1) {
      scheduleShot(context, startAt + shot * 0.072, 0.72);
    }
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito de rajada.", error);
  }
}