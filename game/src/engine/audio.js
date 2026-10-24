// Everything you hear is synthesized live: no recordings, nothing copyrighted.
let ctx = null;
let master = null;
let muted = false;

const noteHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const audio = {
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
    }
    ctx.resume?.();
  },
  get now() { return ctx ? ctx.currentTime : 0; },
  toggle() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.05);
    if (muted) speechSynthesis?.cancel();
    return !muted;
  },

  tone(freq, dur, { type = 'square', gain = 0.08, at = 0, slideTo = null, attack = 0.005, out = master } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
  },
  note(midi, dur, opts) { this.tone(noteHz(midi), dur, opts); },

  noise(dur, { gain = 0.2, at = 0, filter = 1200, q = 0.7, type = 'lowpass' } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = filter; f.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(amp).connect(master);
    src.start(t);
  },

  // A step sequencer: steps is an array of (stepIndex, timeOffset) => void callbacks run ahead of time.
  loop(bpm, stepsPerBeat, length, onStep) {
    if (!ctx) return () => {};
    const stepDur = 60 / bpm / stepsPerBeat;
    let step = 0;
    let next = ctx.currentTime + 0.05;
    const id = setInterval(() => {
      while (next < ctx.currentTime + 0.2) {
        onStep(step % length, next - ctx.currentTime);
        step++; next += stepDur;
      }
    }, 50);
    return () => clearInterval(id);
  },

  speak(text, { pitch = 1, rate = 1, volume = 1 } = {}) {
    if (muted || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = pitch; u.rate = rate; u.volume = volume;
    speechSynthesis.speak(u);
  },

  // A dial-up handshake, roughly: dial tones, carrier, then screeching negotiation.
  modem() {
    if (!ctx) return;
    [697, 1336, 770, 1209, 852, 1477, 941, 1336].forEach((f, i) => this.tone(f, 0.09, { type: 'sine', gain: 0.05, at: i * 0.1 }));
    this.tone(2100, 0.9, { type: 'sine', gain: 0.05, at: 0.9 });
    this.tone(1650, 0.5, { type: 'sawtooth', gain: 0.025, at: 1.9, slideTo: 1200 });
    this.noise(1.2, { gain: 0.08, at: 2.3, filter: 2400, q: 6, type: 'bandpass' });
    this.tone(980, 0.7, { type: 'square', gain: 0.02, at: 2.6, slideTo: 1180 });
  },

  noteHz,
};
