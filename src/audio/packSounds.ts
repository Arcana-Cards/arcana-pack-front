let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function bus(): { a: AudioContext; dest: AudioNode } | null {
  const a = audio();
  if (!a) return null;
  if (!master || master.context !== a) {
    master = a.createGain();
    master.gain.value = 0.9;
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 2.8;
    comp.attack.value = 0.004;
    comp.release.value = 0.14;
    master.connect(comp).connect(a.destination);
  }
  return { a, dest: master };
}

function now(a: AudioContext, offset = 0) {
  return a.currentTime + offset;
}

function tone(
  a: AudioContext,
  dest: AudioNode,
  opts: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    t?: number;
    dur: number;
    gain: number;
    attack?: number;
    decay?: number;
    filter?: BiquadFilterType;
    filterFreq?: number;
    filterFreqEnd?: number;
    q?: number;
  },
) {
  const t = now(a, opts.t ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(20, opts.freq), t);
  if (opts.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t + opts.dur);
  }
  const attack = Math.min(opts.attack ?? 0.01, opts.dur * 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  let node: AudioNode = osc;
  if (opts.filter && opts.filterFreq) {
    const f = a.createBiquadFilter();
    f.type = opts.filter;
    f.Q.value = opts.q ?? 0.8;
    f.frequency.setValueAtTime(opts.filterFreq, t);
    if (opts.filterFreqEnd) {
      f.frequency.exponentialRampToValueAtTime(Math.max(40, opts.filterFreqEnd), t + opts.dur);
    }
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + opts.dur + 0.04);
}

function noiseBuffer(a: AudioContext, seconds: number, color: 'white' | 'pink' = 'white') {
  const length = Math.max(1, Math.floor(a.sampleRate * seconds));
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (color === 'white') {
      data[i] = white;
    } else {
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
    }
  }
  return buffer;
}

function whoosh(
  a: AudioContext,
  dest: AudioNode,
  opts: {
    t?: number;
    dur: number;
    gain: number;
    color?: 'white' | 'pink';
    filter?: BiquadFilterType;
    freq: number;
    freqEnd?: number;
    q?: number;
  },
) {
  const t = now(a, opts.t ?? 0);
  const src = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = noiseBuffer(a, opts.dur + 0.05, opts.color ?? 'pink');
  f.type = opts.filter ?? 'bandpass';
  f.Q.value = opts.q ?? 1.1;
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqEnd) {
    f.frequency.exponentialRampToValueAtTime(Math.max(60, opts.freqEnd), t + opts.dur);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + Math.min(0.05, opts.dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
  src.stop(t + opts.dur + 0.02);
}

let dry: GainNode | null = null;

function tearOut(): { a: AudioContext; dest: AudioNode } | null {
  const a = audio();
  if (!a) return null;
  if (!dry || dry.context !== a) {
    dry = a.createGain();
    dry.gain.value = 0.78;
    dry.connect(a.destination);
  }
  return { a, dest: dry };
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

type FiberKind = 'paper' | 'foil' | 'perf';

function writeFiber(data: Float32Array, sr: number, time: number, strength: number, kind: FiberKind) {
  const start = Math.floor(time * sr);
  if (start < 0 || start >= data.length) return;
  const f0 = kind === 'foil' ? rand(6200, 12800) : kind === 'perf' ? rand(2600, 6800) : rand(900, 2800);
  const tau = kind === 'foil' ? rand(0.00018, 0.00048) : kind === 'perf' ? rand(0.0004, 0.0011) : rand(0.0007, 0.002);
  const n = Math.min(data.length - start, Math.floor(sr * tau * 8) + 8);
  const phase = Math.random() * Math.PI * 2;
  const noiseAmt = kind === 'paper' ? 0.9 : kind === 'perf' ? 0.72 : 0.55;
  const toneAmt = kind === 'foil' ? 0.22 : kind === 'perf' ? 0.14 : 0.08;
  for (let i = 0; i < n; i += 1) {
    const tm = i / sr;
    const env = Math.exp(-tm / tau);
    const click = i === 0 ? strength * 0.55 : i === 1 ? -strength * 0.28 : i === 2 ? strength * 0.1 : 0;
    data[start + i] +=
      click +
      strength * env * (Math.random() * 2 - 1) * noiseAmt +
      strength * toneAmt * env * Math.sin(2 * Math.PI * f0 * tm + phase);
  }
}

function writeFiberStereo(
  left: Float32Array,
  right: Float32Array,
  sr: number,
  time: number,
  strength: number,
  kind: FiberKind,
  pan: number,
) {
  const delay = rand(0.00012, 0.00085);
  writeFiber(left, sr, time, strength * (1 - pan * 0.62), kind);
  writeFiber(right, sr, time + delay, strength * (0.38 + pan * 0.62), kind);
}

function writeRustle(
  left: Float32Array,
  right: Float32Array,
  sr: number,
  from: number,
  dur: number,
  amp: number,
  color: 'pink' | 'brown',
) {
  const i0 = Math.floor(from * sr);
  const n = Math.floor(dur * sr);
  let b0 = 0;
  let b1 = 0;
  let c0 = 0;
  let c1 = 0;
  for (let i = 0; i < n && i0 + i < left.length; i += 1) {
    const t = i / Math.max(1, n - 1);
    const attack = Math.min(1, t / 0.06);
    const env = attack * Math.pow(1 - t, 1.45);
    const wL = Math.random() * 2 - 1;
    const wR = Math.random() * 2 - 1;
    let l: number;
    let r: number;
    if (color === 'brown') {
      b0 = (b0 + wL * 0.022) / 1.022;
      c0 = (c0 + wR * 0.022) / 1.022;
      l = b0 * 3.4;
      r = c0 * 3.4;
    } else {
      b0 = 0.997 * b0 + wL * 0.099;
      b1 = 0.963 * b1 + wL * 0.296;
      c0 = 0.997 * c0 + wR * 0.099;
      c1 = 0.963 * c1 + wR * 0.296;
      l = (b0 + b1) * 0.32;
      r = (c0 + c1) * 0.32;
    }
    const grain = 0.72 + 0.28 * Math.sin(i * 0.013);
    left[i0 + i] += l * amp * env * grain;
    right[i0 + i] += r * amp * env * grain;
  }
}

function normalizeStereo(left: Float32Array, right: Float32Array, peak = 0.86) {
  let max = 0;
  for (let i = 0; i < left.length; i += 1) {
    max = Math.max(max, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (max < 0.0001) return;
  const g = peak / max;
  for (let i = 0; i < left.length; i += 1) {
    left[i] *= g;
    right[i] *= g;
  }
}

function makeRip(a: AudioContext) {
  const dur = 0.58;
  const sr = a.sampleRate;
  const buf = a.createBuffer(2, Math.floor(sr * dur), sr);
  const left = buf.getChannelData(0);
  const right = buf.getChannelData(1);

  writeFiberStereo(left, right, sr, 0.0, 0.7, 'paper', 0.18);
  writeFiberStereo(left, right, sr, 0.005, 0.55, 'perf', 0.22);
  writeFiberStereo(left, right, sr, 0.011, 0.4, 'foil', 0.28);

  const teeth = 26;
  for (let i = 0; i < teeth; i += 1) {
    const t = 0.02 + i * rand(0.0078, 0.0128);
    const fall = 1 - (i / teeth) * 0.38;
    const pan = i / (teeth - 1);
    writeFiberStereo(left, right, sr, t, rand(0.42, 0.95) * fall, 'perf', pan);
    if (Math.random() > 0.4) {
      writeFiberStereo(left, right, sr, t + rand(0.001, 0.004), rand(0.18, 0.45) * fall, 'foil', pan);
    }
    if (Math.random() > 0.55) {
      writeFiberStereo(left, right, sr, t + rand(0.002, 0.007), rand(0.12, 0.3) * fall, 'paper', pan);
    }
  }

  writeRustle(left, right, sr, 0.018, 0.4, 0.2, 'brown');
  writeRustle(left, right, sr, 0.04, 0.34, 0.14, 'pink');

  for (let k = 0; k < 48; k += 1) {
    const t = rand(0.03, 0.46);
    writeFiberStereo(left, right, sr, t, rand(0.07, 0.26), 'foil', t / 0.46);
  }
  for (let k = 0; k < 14; k += 1) {
    writeFiberStereo(left, right, sr, rand(0.32, 0.55), rand(0.05, 0.16), Math.random() > 0.45 ? 'foil' : 'paper', rand(0.55, 1));
  }
  writeRustle(left, right, sr, 0.3, 0.24, 0.07, 'pink');

  normalizeStereo(left, right);
  return buf;
}

function makeStrain(a: AudioContext, force: number) {
  const dur = 0.09 + force * 0.05;
  const sr = a.sampleRate;
  const buf = a.createBuffer(2, Math.floor(sr * dur), sr);
  const left = buf.getChannelData(0);
  const right = buf.getChannelData(1);
  const pan = force * 0.85;
  const pops = 1 + Math.floor(force * 3 + Math.random() * 2);
  for (let i = 0; i < pops; i += 1) {
    const t = 0.004 + i * rand(0.012, 0.028);
    writeFiberStereo(left, right, sr, t, rand(0.35, 0.8) * (0.45 + force * 0.7), 'perf', pan);
    if (force > 0.35 && Math.random() > 0.4) {
      writeFiberStereo(left, right, sr, t + rand(0.001, 0.003), rand(0.12, 0.32), 'foil', pan);
    }
  }
  if (force > 0.25) {
    writeRustle(left, right, sr, 0.002, dur * 0.7, 0.04 + force * 0.06, 'pink');
  }
  normalizeStereo(left, right, 0.7 + force * 0.18);
  return buf;
}

function playTearBuffer(a: AudioContext, dest: AudioNode, buffer: AudioBuffer, gain = 1, rate = 1) {
  const src = a.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const hp = a.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 140;
  hp.Q.value = 0.7;
  const presence = a.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2800;
  presence.Q.value = 0.7;
  presence.gain.value = 1.4;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(hp).connect(presence).connect(g).connect(dest);
  src.start(a.currentTime);
}

function thump(a: AudioContext, dest: AudioNode, t: number, freq: number, gain: number, dur = 0.16) {
  tone(a, dest, { type: 'sine', freq, freqEnd: freq * 0.55, t, dur, gain, attack: 0.004, filter: 'lowpass', filterFreq: 420 });
  whoosh(a, dest, { t, dur: dur * 0.7, gain: gain * 0.45, color: 'pink', filter: 'lowpass', freq: 280, freqEnd: 90, q: 0.6 });
}

export function unlockAudio() {
  audio();
}

export function playPackShake() {
  const bused = bus();
  if (!bused) return;
  const { a, dest } = bused;
  thump(a, dest, 0, 110, 0.16);
  thump(a, dest, 0.09, 95, 0.13);
  thump(a, dest, 0.18, 128, 0.11);
  whoosh(a, dest, { t: 0.02, dur: 0.22, gain: 0.07, color: 'white', filter: 'bandpass', freq: 1600, freqEnd: 700, q: 1.4 });
  whoosh(a, dest, { t: 0.12, dur: 0.16, gain: 0.05, color: 'white', filter: 'bandpass', freq: 2400, freqEnd: 900, q: 1.6 });
}

export function playTearStrain(amount = 0.5) {
  const out = tearOut();
  if (!out) return;
  const { a, dest } = out;
  const force = Math.min(1, Math.max(0.08, amount));
  playTearBuffer(a, dest, makeStrain(a, force), 0.55 + force * 0.35, rand(0.94, 1.08));
}

export function playPackTear() {
  const out = tearOut();
  if (!out) return;
  const { a, dest } = out;
  playTearBuffer(a, dest, makeRip(a), 0.92, rand(0.96, 1.05));
}

export function playCardFlip(rarity = 'common') {
  const bused = bus();
  if (!bused) return;
  const { a, dest } = bused;
  const brighter = rarity === 'uncommon';
  whoosh(a, dest, {
    t: 0,
    dur: 0.11,
    gain: brighter ? 0.09 : 0.07,
    color: 'white',
    filter: 'bandpass',
    freq: brighter ? 1400 : 1100,
    freqEnd: brighter ? 2600 : 1900,
    q: 1.2,
  });
  tone(a, dest, { type: 'triangle', freq: brighter ? 340 : 260, freqEnd: 140, t: 0.015, dur: 0.09, gain: 0.07, attack: 0.003 });
  tone(a, dest, { type: 'sine', freq: brighter ? 2100 : 1650, t: 0.02, dur: 0.04, gain: 0.025, attack: 0.002 });
}

export function playFoilShimmer() {
  const bused = bus();
  if (!bused) return;
  const { a, dest } = bused;
  const sparks = [2480, 3120, 2760, 3640, 1980, 4200, 2890];
  sparks.forEach((freq, i) => {
    tone(a, dest, {
      type: 'sine',
      freq,
      freqEnd: freq * 1.18,
      t: 0.03 + i * 0.045,
      dur: 0.12,
      gain: 0.028,
      attack: 0.004,
    });
  });
  whoosh(a, dest, { t: 0, dur: 0.35, gain: 0.04, color: 'white', filter: 'highpass', freq: 3200, freqEnd: 5200, q: 0.8 });
}

function playRare(a: AudioContext, dest: AudioNode) {
  whoosh(a, dest, { t: 0, dur: 0.55, gain: 0.13, color: 'pink', filter: 'bandpass', freq: 280, freqEnd: 2100, q: 1.05 });
  whoosh(a, dest, { t: 0.08, dur: 0.32, gain: 0.07, color: 'white', filter: 'bandpass', freq: 900, freqEnd: 2400, q: 1.4 });
  tone(a, dest, { type: 'sine', freq: 196, freqEnd: 147, t: 0, dur: 0.35, gain: 0.08, attack: 0.02, filter: 'lowpass', filterFreq: 500 });
  tone(a, dest, { type: 'sine', freq: 784, t: 0.28, dur: 0.7, gain: 0.11, attack: 0.006 });
  tone(a, dest, { type: 'sine', freq: 1175, t: 0.3, dur: 0.55, gain: 0.06, attack: 0.008 });
  tone(a, dest, { type: 'triangle', freq: 1568, t: 0.32, dur: 0.35, gain: 0.03, attack: 0.01 });
}

function playEpic(a: AudioContext, dest: AudioNode) {
  whoosh(a, dest, { t: 0, dur: 0.85, gain: 0.15, color: 'pink', filter: 'bandpass', freq: 160, freqEnd: 1800, q: 0.9 });
  whoosh(a, dest, { t: 0.12, dur: 0.5, gain: 0.08, color: 'white', filter: 'bandpass', freq: 700, freqEnd: 2600, q: 1.2 });
  tone(a, dest, { type: 'sine', freq: 98, freqEnd: 65, t: 0, dur: 0.7, gain: 0.12, attack: 0.04, filter: 'lowpass', filterFreq: 280 });
  tone(a, dest, { type: 'triangle', freq: 196, t: 0.08, dur: 0.9, gain: 0.05, attack: 0.08, filter: 'lowpass', filterFreq: 620 });
  tone(a, dest, { type: 'sine', freq: 311, t: 0.42, dur: 0.85, gain: 0.08, attack: 0.02 });
  tone(a, dest, { type: 'sine', freq: 415, t: 0.48, dur: 0.8, gain: 0.09, attack: 0.015 });
  tone(a, dest, { type: 'sine', freq: 622, t: 0.54, dur: 0.7, gain: 0.07, attack: 0.012 });
  tone(a, dest, { type: 'sine', freq: 1244, t: 0.58, dur: 0.45, gain: 0.035, attack: 0.01 });
}

function playLegendary(a: AudioContext, dest: AudioNode) {
  tone(a, dest, { type: 'sine', freq: 46, freqEnd: 38, t: 0, dur: 1.35, gain: 0.16, attack: 0.12, filter: 'lowpass', filterFreq: 140 });
  tone(a, dest, { type: 'sawtooth', freq: 72, freqEnd: 48, t: 0.05, dur: 1.1, gain: 0.045, attack: 0.1, filter: 'lowpass', filterFreq: 220, filterFreqEnd: 110, q: 1.8 });
  whoosh(a, dest, { t: 0.05, dur: 1.15, gain: 0.18, color: 'pink', filter: 'bandpass', freq: 120, freqEnd: 2400, q: 0.85 });
  whoosh(a, dest, { t: 0.35, dur: 0.55, gain: 0.1, color: 'white', filter: 'bandpass', freq: 600, freqEnd: 3200, q: 1.1 });
  thump(a, dest, 0.72, 64, 0.2, 0.28);
  tone(a, dest, { type: 'sine', freq: 294, t: 0.78, dur: 0.85, gain: 0.1, attack: 0.012 });
  tone(a, dest, { type: 'sine', freq: 440, t: 0.88, dur: 0.9, gain: 0.11, attack: 0.012 });
  tone(a, dest, { type: 'sine', freq: 587, t: 0.98, dur: 1.05, gain: 0.1, attack: 0.014 });
  tone(a, dest, { type: 'triangle', freq: 880, t: 1.05, dur: 0.7, gain: 0.05, attack: 0.02 });
  tone(a, dest, { type: 'sine', freq: 1175, t: 1.08, dur: 0.55, gain: 0.04, attack: 0.015 });
}

function playMythic(a: AudioContext, dest: AudioNode) {
  playLegendary(a, dest);
  whoosh(a, dest, { t: 0.2, dur: 1.4, gain: 0.08, color: 'white', filter: 'highpass', freq: 2400, freqEnd: 4800, q: 0.7 });
  [523, 659, 784, 1046, 1318].forEach((freq, i) => {
    tone(a, dest, { type: 'sine', freq, t: 1.12 + i * 0.07, dur: 0.55, gain: 0.045, attack: 0.01 });
  });
}

export function playRareReveal(rarity: string) {
  const bused = bus();
  if (!bused) return;
  const { a, dest } = bused;
  if (rarity === 'rare') playRare(a, dest);
  else if (rarity === 'epic') playEpic(a, dest);
  else if (rarity === 'legendary') playLegendary(a, dest);
  else if (rarity === 'mythic') playMythic(a, dest);
}
