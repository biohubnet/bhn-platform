/**
 * Client-side acoustic analysis of a recorded answer (browser only).
 *
 * Whisper gives us words + timings but NOT pitch or loudness — so to coach
 * "tone" the way a voice coach hears it (monotone vs. expressive, flat vs.
 * projected) we decode the recording with the Web Audio API and measure the
 * real signal: fundamental frequency (F0) via autocorrelation, and frame
 * energy (RMS). From those we derive how MUCH the pitch and loudness vary —
 * the objective basis for "you went monotone" or "you trailed off."
 *
 * Honest about limits: this is an estimate, sensitive to mic quality and
 * background noise, and some browsers (notably Safari) can't decode the
 * webm/opus recording — in which case we return null and the rest of the
 * voice read falls back to the transcript-based signals. Never throws.
 */

export interface Acoustics {
  pitchHzMean: number;     // average voiced pitch (Hz)
  pitchVariation: number;  // CV of F0 — ~0 = monotone, higher = expressive
  energyVariation: number; // CV of loudness — low = flat, higher = dynamic
  voicedRatio: number;     // share of frames that were voiced speech (0–1)
  monotone: boolean;       // pitch varied less than a natural-speech floor
}

const F0_MIN = 75;   // Hz — low end of human speech
const F0_MAX = 400;  // Hz — high end (covers most voices)
const FRAME_MS = 40;
const HOP_MS = 20;

/** Autocorrelation pitch estimate for one frame. Returns 0 if unvoiced. */
function estimatePitch(frame: Float32Array, sampleRate: number): number {
  const n = frame.length;
  // RMS gate — skip near-silent frames.
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += frame[i] * frame[i];
  const rms = Math.sqrt(sumSq / n);
  if (rms < 0.01) return 0;

  const minLag = Math.floor(sampleRate / F0_MAX);
  const maxLag = Math.min(Math.floor(sampleRate / F0_MIN), n - 1);
  let bestLag = -1;
  let bestCorr = 0;
  let prevCorr = 0;
  let rising = false;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) corr += frame[i] * frame[i + lag];
    corr /= n - lag;
    // Find the FIRST strong peak after the correlation starts rising — avoids
    // octave errors from picking a later, slightly-higher peak.
    if (corr > prevCorr) rising = true;
    if (rising && corr < prevCorr && prevCorr > bestCorr) {
      bestCorr = prevCorr;
      bestLag = lag - 1;
    }
    prevCorr = corr;
  }
  if (bestLag <= 0) return 0;
  const normalized = bestCorr / (sumSq / n);
  if (normalized < 0.3) return 0; // weak periodicity → treat as unvoiced
  return sampleRate / bestLag;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
function cv(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  if (m === 0) return 0;
  const variance = a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length;
  return Math.sqrt(variance) / m;
}

export async function analyzeAudio(blob: Blob): Promise<Acoustics | null> {
  try {
    if (typeof window === "undefined") return null;
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;

    const arrayBuf = await blob.arrayBuffer();
    const ctx = new AC();
    let audio: AudioBuffer;
    try {
      audio = await ctx.decodeAudioData(arrayBuf);
    } catch {
      await ctx.close().catch(() => {});
      return null; // browser can't decode this format (e.g. Safari + opus)
    }
    await ctx.close().catch(() => {});

    const data = audio.getChannelData(0);
    const sr = audio.sampleRate;
    const frameLen = Math.floor((FRAME_MS / 1000) * sr);
    const hop = Math.floor((HOP_MS / 1000) * sr);
    if (data.length < frameLen * 4) return null; // too short to be meaningful

    const pitches: number[] = [];
    const energies: number[] = [];
    let voiced = 0;
    let total = 0;
    for (let start = 0; start + frameLen <= data.length; start += hop) {
      const frame = data.subarray(start, start + frameLen);
      let sumSq = 0;
      for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
      const rms = Math.sqrt(sumSq / frame.length);
      energies.push(rms);
      total++;
      const f0 = estimatePitch(frame as Float32Array, sr);
      if (f0 >= F0_MIN && f0 <= F0_MAX) {
        pitches.push(f0);
        voiced++;
      }
    }
    if (pitches.length < 8) return null; // not enough voiced speech to judge

    // Energy variation over the speaking (above-floor) frames only.
    const speakEnergies = energies.filter((e) => e > 0.01);
    const pitchVariation = cv(pitches);
    return {
      pitchHzMean: Math.round(mean(pitches)),
      pitchVariation: Math.round(pitchVariation * 1000) / 1000,
      energyVariation: Math.round(cv(speakEnergies) * 1000) / 1000,
      voicedRatio: total ? Math.round((voiced / total) * 100) / 100 : 0,
      // Natural conversational speech has F0 CV ≳ 0.12; below ~0.08 reads flat.
      monotone: pitchVariation < 0.08,
    };
  } catch {
    return null;
  }
}
