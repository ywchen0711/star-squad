// Web Audio synth: chiptune sound effects and a looping tune per stage / boss / hangar.
let ctx = null, master = null, musicGain = null, sfxOn = true, musicOn = true, loop = null, song = null, step = 0, nextT = 0;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f, t0, dur, { type = 'square', vol = 0.15, slide = 0, out = null } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out || master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, vol = 0.2, freq = 800) {
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t0);
}
const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
let lastCoin = 0, lastBoom = 0;

export const sfx = {
  unlock() { ac(); },
  set on(v) { sfxOn = v; }, get on() { return sfxOn; },
  play(name, o = {}) {
    if (!sfxOn || !ac()) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'boom': if (t - lastBoom < 0.05) return; lastBoom = t; noise(t, o.big ? 0.6 : 0.18, o.big ? 0.4 : 0.14, o.big ? 600 : 1500); break;
      case 'coin': if (t - lastCoin < 0.04) return; lastCoin = t; tone(N(88), t, 0.06, { vol: 0.05 }); tone(N(95), t + 0.04, 0.08, { vol: 0.05 }); break;
      case 'power': [72, 76, 79, 84].forEach((m, i) => tone(N(m), t + i * 0.05, 0.12, { vol: 0.09 })); break;
      case 'heart': [76, 81].forEach((m, i) => tone(N(m), t + i * 0.08, 0.16, { type: 'triangle', vol: 0.18 })); break;
      case 'hit': tone(220, t, 0.25, { type: 'sawtooth', vol: 0.18, slide: 0.3 }); noise(t, 0.2, 0.2, 900); break;
      case 'shield': tone(N(84), t, 0.2, { type: 'triangle', vol: 0.15, slide: 0.6 }); break;
      case 'skill': for (let i = 0; i < 6; i++) tone(N(67 + i * 4), t + i * 0.04, 0.18, { vol: 0.08 }); break;
      case 'bomb': noise(t, 1.0, 0.45, 400); tone(80, t, 0.9, { type: 'sine', vol: 0.4, slide: 0.4 }); break;
      case 'warn': for (let i = 0; i < 4; i++) { tone(N(69), t + i * 0.5, 0.22, { type: 'sawtooth', vol: 0.12 }); tone(N(65), t + i * 0.5 + 0.25, 0.22, { type: 'sawtooth', vol: 0.12 }); } break;
      case 'bossDown': noise(t, 1.6, 0.5, 500); tone(110, t, 1.4, { type: 'sine', vol: 0.4, slide: 0.3 }); break;
      case 'clear': [[72, 0], [76, 0.12], [79, 0.24], [84, 0.4], [79, 0.56], [84, 0.68]].forEach(([m, d]) => tone(N(m), t + d, 0.3, { vol: 0.1 })); break;
      case 'dead': [67, 63, 60, 55].forEach((m, i) => tone(N(m), t + i * 0.18, 0.3, { type: 'triangle', vol: 0.2 })); break;
      case 'buy': tone(N(84), t, 0.08, { vol: 0.08 }); tone(N(91), t + 0.06, 0.12, { vol: 0.08 }); break;
      case 'click': tone(N(79), t, 0.04, { vol: 0.05 }); break;
      case 'blip': tone(N(86), t, 0.025, { vol: 0.025 }); break;
      case 'revive': [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone(N(m), t + i * 0.06, 0.25, { type: 'triangle', vol: 0.15 })); break;
      default: break;
    }
  },
};

// tunes: bass line + arpeggio + lead, per mood
const SONGS = {
  hangar: { bpm: 104, root: 57, prog: [0, 5, 3, 7], lead: [12, 7, 9, 7, 12, 14, 12, 7] },
  s1: { bpm: 140, root: 52, prog: [0, 0, 3, 5], lead: [12, 10, 7, 10, 12, 15, 14, 10] },
  s2: { bpm: 150, root: 57, prog: [0, 8, 5, 7], lead: [12, 15, 19, 15, 17, 15, 12, 10] },
  s3: { bpm: 132, root: 55, prog: [0, 3, 8, 7], lead: [7, 10, 14, 12, 10, 7, 5, 7] },
  s4: { bpm: 156, root: 50, prog: [0, 1, 0, 6], lead: [12, 13, 12, 10, 8, 7, 8, 10] },
  s5: { bpm: 160, root: 53, prog: [0, 8, 6, 7], lead: [12, 11, 12, 15, 17, 15, 12, 11] },
  boss: { bpm: 170, root: 50, prog: [0, 1, 0, 1], lead: [12, 13, 12, 8, 12, 13, 15, 13] },
  ending: { bpm: 96, root: 60, prog: [0, 5, 9, 7], lead: [16, 14, 12, 14, 16, 19, 16, 14] },
};
export const music = {
  set on(v) { musicOn = v; if (!v) this.stop(); else if (song) this.play(song); }, get on() { return musicOn; },
  play(id) {
    if (song === id && loop) return;
    song = id;
    this.stop();
    if (!musicOn || !ac()) return;
    const s = SONGS[id] || SONGS.hangar, beat = 60 / s.bpm / 2;
    nextT = ctx.currentTime + 0.05; step = 0;
    const tick = () => {
      while (nextT < ctx.currentTime + 0.5) {
        const bar = Math.floor(step / 8) % s.prog.length, r = s.root + s.prog[bar], i = step % 8;
        tone(N(r - 12 + (i % 2 ? 12 : 0)), nextT, beat * 0.9, { type: 'triangle', vol: 0.5, out: musicGain });
        if (i % 2 === 0) tone(N(r + s.lead[(step / 2) % 8 | 0]), nextT, beat * 1.7, { type: 'square', vol: 0.12, out: musicGain });
        nextT += beat; step++;
      }
    };
    tick();
    loop = setInterval(tick, 150);
  },
  stop() { if (loop) clearInterval(loop); loop = null; },
};
