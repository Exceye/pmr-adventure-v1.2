/*
 * PMR Adventure - Audio (Web Audio API, tanpa file suara)
 *
 * Semua suara dibuat lewat kode, jadi tidak perlu aset tambahan:
 *  - Backsound   : audio.music('village' | 'house')  (loop otomatis, crossfade)
 *  - Langkah kaki: audio.sfx.step('grass' | 'dirt' | 'wood' | 'tile')
 *  - Efek lain   : click, pop, door, correct, partial, wrong, win, chest
 *
 * Browser memblokir suara sebelum ada interaksi pemain, jadi panggil
 * audio.unlock() dari klik/tap pertama. Status mute disimpan di localStorage.
 */

const KEY = "pmrMuted";
let ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === "1"; } catch {}

let want = null;   // lagu yang diinginkan (dipakai bila audio belum aktif)
let cur = null;    // lagu yang sedang diputar
let bus = null;    // gain khusus lagu yang sedang diputar
let timer = null, step = 0, nextT = 0;

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const live = () => ctx && ctx.state === "running" && !muted;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55;
  sfxBus = ctx.createGain();   sfxBus.gain.value = 0.9;
  musicBus.connect(comp); sfxBus.connect(comp);
  comp.connect(master); master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

/* ---------- pembangun suara ---------- */
function tone(dest, type, f, t, dur, vol, o = {}) {
  const { atk = 0.01, rel = 0.08, lp = 0, slide = 0, det = 0 } = o;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  osc.detune.value = det;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + atk);
  g.gain.setValueAtTime(vol, t + Math.max(atk, dur - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (lp) {
    const f2 = ctx.createBiquadFilter();
    f2.type = "lowpass"; f2.frequency.value = lp;
    osc.connect(f2); node = f2;
  }
  node.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// Nada "petik": serangan cepat, lalu meluruh.
function pluck(dest, type, f, t, dur, vol, lp = 0) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (lp) {
    const f2 = ctx.createBiquadFilter();
    f2.type = "lowpass"; f2.frequency.value = lp;
    osc.connect(f2); node = f2;
  }
  node.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(dest, t, dur, vol, ftype, freq, q = 0.8) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.7);
  s.stop(t + dur + 0.02);
}

function kick(dest, t, vol) {
  tone(dest, "sine", 130, t, 0.14, vol, { atk: 0.002, rel: 0.1, slide: 45 });
}

/* ---------- lagu ---------- */
// Lagu kampung: ceria, tangga nada C mayor, 8 bar.
const V_CH = [ // bass, triad
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [60, 65, 69]], [43, [59, 62, 67]],
  [48, [60, 64, 67]], [43, [59, 62, 67]], [41, [60, 65, 69]], [43, [59, 62, 67]]
];
const N = null;
const V_MEL = [
  [76, N, 79, N, 76, 74, 72, N], [69, N, 72, N, 76, N, 74, 72],
  [77, N, 76, N, 72, N, 74, N],  [74, N, 71, N, 74, 76, 74, N],
  [79, N, 76, N, 72, N, 76, 79], [81, N, 79, N, 74, N, 71, N],
  [77, N, 81, N, 79, 77, 76, N], [74, 76, 74, 71, 67, N, N, N]
];
const ARP = [0, 1, 2, 1, 0, 1, 2, 1];

// Lagu rumah: pelan dan tenang, seperti kotak musik.
const H_CH = [
  [45, [57, 60, 64]], [41, [60, 65, 69]], [48, [60, 64, 67]], [43, [59, 62, 67]]
];
const H_MEL = [
  [81, N, N, N, 76, N, N, N], [77, N, N, N, 72, N, 74, N],
  [76, N, N, N, 79, N, N, N], [74, N, 71, N, 67, N, N, N]
];
const H_ARP = [0, 2, 1, 2, 0, 2, 1, 2];

const TRACKS = {
  village: {
    bpm: 108, len: 64,
    play(i, t, d, dest) {
      const bar = Math.floor(i / 8), s = i % 8, [root, tri] = V_CH[bar];
      if (s === 0 || s === 3 || s === 6) tone(dest, "triangle", hz(root), t, d * 1.8, 0.16, { lp: 700 });
      if (s === 4) tone(dest, "triangle", hz(root + 7), t, d * 1.8, 0.14, { lp: 700 });
      pluck(dest, "square", hz(tri[ARP[s]]), t, d * 1.1, 0.03, 1800);
      const m = V_MEL[bar][s];
      if (m) tone(dest, "square", hz(m), t, d * 1.9, 0.05, { lp: 3000, atk: 0.006, rel: 0.12 });
      if (s === 0 || s === 4) kick(dest, t, 0.13);
      if (s % 2 === 1) noise(dest, t, 0.035, 0.03, "highpass", 7500, 0.5);
    }
  },
  house: {
    bpm: 84, len: 32,
    play(i, t, d, dest) {
      const bar = Math.floor(i / 8), s = i % 8, [root, tri] = H_CH[bar];
      if (s === 0) tone(dest, "sine", hz(root), t, d * 7.5, 0.14, { atk: 0.05, rel: 0.6 });
      pluck(dest, "triangle", hz(tri[H_ARP[s]] + 12), t, d * 3, 0.06, 2600);
      const m = H_MEL[bar][s];
      if (m) {
        pluck(dest, "sine", hz(m), t, d * 5, 0.07);
        pluck(dest, "sine", hz(m + 12), t, d * 3, 0.018);
      }
    }
  }
};

function tick() {
  if (!ctx || ctx.state !== "running" || !cur) return;
  const T = TRACKS[cur], d = 60 / T.bpm / 2;
  if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime + 0.05; // setelah tab dijeda
  while (nextT < ctx.currentTime + 0.3) {
    T.play(step % T.len, nextT, d, bus);
    step++; nextT += d;
  }
}

function startTrack(name) {
  const old = bus;
  if (old) {
    old.gain.cancelScheduledValues(ctx.currentTime);
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.18);
    setTimeout(() => { try { old.disconnect(); } catch {} }, 1500);
  }
  bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(musicBus);
  bus.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.35);
  cur = name; step = 0; nextT = ctx.currentTime + 0.08;
  if (!timer) timer = setInterval(tick, 60);
}

/* ---------- efek suara ---------- */
const sfx = {
  step(surface) {
    if (!live()) return;
    const t = ctx.currentTime, r = 0.85 + Math.random() * 0.3, o = sfxBus;
    if (surface === "grass") {
      noise(o, t, 0.1, 0.14, "bandpass", 1300 * r, 0.7);
      noise(o, t + 0.015, 0.07, 0.06, "highpass", 4500, 0.5);
    } else if (surface === "dirt") {
      noise(o, t, 0.07, 0.22, "bandpass", 850 * r, 1.1);
      tone(o, "sine", 120 * r, t, 0.06, 0.08, { atk: 0.002, rel: 0.05 });
    } else if (surface === "tile") {
      noise(o, t, 0.04, 0.12, "bandpass", 3200 * r, 1.4);
      tone(o, "triangle", 430 * r, t, 0.05, 0.05, { atk: 0.002, rel: 0.04 });
    } else { // wood
      tone(o, "sine", 175 * r, t, 0.09, 0.2, { atk: 0.002, rel: 0.07, slide: 85 });
      noise(o, t, 0.035, 0.07, "bandpass", 2200 * r, 1.2);
    }
  },
  click() {
    if (!live()) return;
    const t = ctx.currentTime;
    tone(sfxBus, "square", 880, t, 0.06, 0.05, { lp: 3000, slide: 1320, atk: 0.003, rel: 0.04 });
  },
  pop() {
    if (!live()) return;
    const t = ctx.currentTime;
    tone(sfxBus, "triangle", 520, t, 0.1, 0.09, { slide: 780, atk: 0.004, rel: 0.07 });
  },
  door() {
    if (!live()) return;
    const t = ctx.currentTime;
    noise(sfxBus, t, 0.28, 0.08, "lowpass", 600, 0.6);
    tone(sfxBus, "sawtooth", 150, t, 0.3, 0.05, { lp: 500, slide: 95, atk: 0.03, rel: 0.12 });
    tone(sfxBus, "square", 300, t + 0.28, 0.04, 0.05, { lp: 1200, atk: 0.002, rel: 0.03 });
  },
  correct() {
    if (!live()) return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(sfxBus, "square", f, t + i * 0.075, 0.14, 0.06, { lp: 3500, atk: 0.004, rel: 0.1 }));
  },
  partial() {
    if (!live()) return;
    const t = ctx.currentTime;
    [523.25, 659.25].forEach((f, i) =>
      tone(sfxBus, "triangle", f, t + i * 0.1, 0.18, 0.1, { atk: 0.004, rel: 0.12 }));
  },
  wrong() {
    if (!live()) return;
    const t = ctx.currentTime;
    tone(sfxBus, "triangle", 262, t, 0.22, 0.14, { slide: 175, atk: 0.005, rel: 0.15 });
    tone(sfxBus, "triangle", 196, t + 0.16, 0.3, 0.14, { slide: 130, atk: 0.005, rel: 0.2 });
  },
  win() {
    if (!live()) return;
    const t = ctx.currentTime, o = sfxBus;
    const seq = [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.36], [783.99, 0.6], [1046.5, 0.72], [1318.5, 0.84]];
    seq.forEach(([f, dt]) => {
      tone(o, "square", f, t + dt, 0.2, 0.06, { lp: 3500, atk: 0.004, rel: 0.12 });
      tone(o, "triangle", f / 2, t + dt, 0.2, 0.08, { atk: 0.004, rel: 0.12 });
    });
    [523.25, 659.25, 783.99, 1046.5].forEach(f => tone(o, "triangle", f, t + 1.1, 0.9, 0.06, { atk: 0.02, rel: 0.6 }));
  },
  chest() {
    if (!live()) return;
    const t = ctx.currentTime, o = sfxBus;
    noise(o, t, 0.2, 0.08, "lowpass", 500, 0.7);
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((f, i) =>
      pluck(o, "sine", f, t + 0.1 + i * 0.09, 0.9, 0.09));
    for (let k = 0; k < 8; k++)
      noise(o, t + 0.2 + k * 0.07, 0.05, 0.04, "highpass", 6500 + Math.random() * 2500, 0.6);
  }
};

/* ---------- API publik ---------- */
export const audio = {
  sfx,
  unlock() {
    if (!ensure()) return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    if (want && !cur) startTrack(want);
  },
  music(name) {
    if (!TRACKS[name]) return;
    want = name;
    if (!ctx) return;            // belum ada interaksi; unlock() akan memulainya
    if (cur === name) return;
    startTrack(name);
  },
  stopMusic() {
    want = null; cur = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (bus && ctx) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  },
  isMuted: () => muted,
  setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
  },
  toggleMute() { audio.setMuted(!muted); return muted; },
  // Jeda audio saat tab disembunyikan agar hemat baterai.
  visible(v) {
    if (!ctx) return;
    if (v) ctx.resume().catch(() => {}); else ctx.suspend().catch(() => {});
  }
};
