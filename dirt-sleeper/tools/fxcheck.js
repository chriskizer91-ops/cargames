// Renders the ground/body and HUD sounds offline and measures them: level, brightness, and whether any
// narrow tone stands out of the noise (the "little chimes" test). usage: node tools/fxcheck.js [wavdir]
const H = require('./harness.js'), g = H.get, fs = require('fs');
const FX = g('makeFX')(), UI = g('makeUISynth')(), mixFor = g('mixFor'), mixFill = g('mixFill'), MIX_BOARD = g('MIX_BOARD'), MIX_GROUND = g('MIX_GROUND');
const SR = 48000, wavDir = process.argv[2];
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
}
function analyse(x) {
  let s = 0, pk = 0; for (const v of x) { s += v * v; pk = Math.max(pk, Math.abs(v)); }
  const N = 4096, spec = new Float64Array(N / 2); let frames = 0;
  for (let o = 0; o + N <= x.length; o += N / 2) { const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = x[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); fft(re, im);
    for (let k = 0; k < N / 2; k++) spec[k] += re[k] * re[k] + im[k] * im[k]; frames++; }
  let cs = 0, ct = 0, worst = 0, wf = 0;
  for (let k = 1; k < N / 2; k++) { const f = k * SR / N; cs += f * spec[k]; ct += spec[k]; }
  // a tone: one bin far above the median of the third-octave around it
  for (let k = Math.round(120 * N / SR); k < Math.round(6000 * N / SR); k++) { const f = k * SR / N, lo = Math.max(1, Math.min(k - 10, Math.round(k / 1.26))), hi = Math.min(N / 2 - 1, Math.max(k + 10, Math.round(k * 1.26))), nb = [];
    for (let q = lo; q <= hi; q++) if (Math.abs(q - k) > 2) nb.push(spec[q]); nb.sort((a, b) => a - b); const med = nb[nb.length >> 1] || 1e-30, r = 10 * Math.log10(spec[k] / med);
    if (r > worst) { worst = r; wf = f; } }
  return { rms: 10 * Math.log10(s / x.length + 1e-30), peak: 20 * Math.log10(pk + 1e-30), centroid: cs / (ct + 1e-30), tone: worst, toneHz: wf };
}
function wav(name, x) {
  if (!wavDir) return; fs.mkdirSync(wavDir, { recursive: true });
  const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2); fs.writeFileSync(wavDir + '/' + name + '.wav', b);
}
function solo(id, v) { const m = mixFill(MIX_BOARD, MIX_BOARD); for (const k in m.s) m.s[k].on = k === id ? 1 : 0; v && (m.s[id].v = v); return mixFor(m, MIX_GROUND); }
function render(params, secs, events = [], id, v) {
  const d = new FX(SR), n = Math.round(SR * secs), L = new Float32Array(n), R = new Float32Array(n);
  d.set(Object.assign({ mix: solo(id, v) }, params));
  for (let o = 0; o < n; o += 128) { for (const e of events) if (e.t >= o / SR && e.t < (o + 128) / SR) d.event(e); d.process(L.subarray(o, o + 128), R.subarray(o, o + 128), Math.min(128, n - o)); }
  return L;
}
const W = (si, sp, sl = 0, extra = {}) => Object.assign({ c: [1, 1, 1, 1], s: [si, si, si, si], v: [sp, sp, sp, sp], sl: [sl * 0.15, sl * 0.15, sl, sl], ld: [1, 1, 1, 1], ws: [sp, sp, sp + sl, sp + sl], pitch: 0.07, speed: sp, cabin: 0, vol: 1 }, extra);
const cases = [
  ['roll dirt 18 m/s', W(1, 18), 'roll'], ['roll dirt 18 m/s tread', W(1, 18), 'roll', 'tread'], ['roll concrete 15 tread', W(6, 15), 'roll', 'tread'], ['roll crawl rock 1 m/s', W(4, 1), 'roll'],
  ['crunch dirt 18', W(1, 18), 'crunch'], ['crunch trail 13 gravel', W(3, 13), 'crunch', 'gravel'], ['crunch cab 18', W(1, 18, 0, { cabin: 1 }), 'crunch'],
  ['spin burnout', W(1, 0, 14), 'spin'], ['spin launch', W(2, 6, 6), 'spin'],
  ['mud churn soupy', W(5, 3, 6), 'mud'], ['mud thick', W(5, 3, 6), 'mud', 'thick'],
  ['scrape rock', W(4, 1, 0, { scr: 2.5, scrK: 1 }), 'hits'],
];
console.log('sound'.padEnd(26), 'rms dB  peak dB  centroid  tone dB @Hz');
for (const [n, p, id, v] of cases) { const x = render(p, 3, [], id, v), a = analyse(x.subarray(SR / 2)); wav(n.replace(/\W+/g, '_'), x);
  console.log(n.padEnd(26), a.rms.toFixed(1).padStart(6), a.peak.toFixed(1).padStart(8), Math.round(a.centroid).toString().padStart(9), a.tone.toFixed(1).padStart(8), Math.round(a.toneHz)); }
const evs = [['bump tight', { type: 'bump', w: 0, a: 0.6 }, 'thump', 'tight'], ['bump boomy', { type: 'bump', w: 0, a: 0.6 }, 'thump', 'boomy'], ['landing', { type: 'land', a: 1 }, 'thump'], ['bottom out', { type: 'bottom', w: 2, a: 0.8 }, 'thump'],
  ['hit rock', { type: 'hit', a: 0.8, k: 'rock' }, 'hits'], ['hit wall', { type: 'hit', a: 0.8, k: 'wall' }, 'hits'], ['hit ground', { type: 'hit', a: 0.8, k: 'ground' }, 'hits']];
for (const [n, e, id, v] of evs) { const x = render(W(1, 0, 0, { c: [0, 0, 0, 0] }), 0.8, [Object.assign({ t: 0.05 }, e)], id, v), a = analyse(x); wav(n.replace(/\W+/g, '_'), x);
  let t90 = 0; const pk = Math.max(...x.map(Math.abs)); for (let i = x.length - 1; i >= 0; i--) if (Math.abs(x[i]) > pk * 0.03) { t90 = i / SR - 0.05; break; }
  console.log(n.padEnd(26), a.rms.toFixed(1).padStart(6), a.peak.toFixed(1).padStart(8), Math.round(a.centroid).toString().padStart(9), '   len', (t90 * 1000).toFixed(0) + ' ms'); }
// the HUD sounds
for (const t of ['ready', 'go', 'tick', 'lap', 'best', 'medal', 'trophy', 'kaching', 'chime', 'miss']) {
  const d = new UI(SR), n = SR * 1.4, L = new Float32Array(n), R = new Float32Array(n); d.set({ vol: 1, mix: { ui: { g: 1 } } }); d.event({ type: t });
  for (let o = 0; o < n; o += 128) d.process(L.subarray(o, o + 128), R.subarray(o, o + 128), Math.min(128, n - o)); const a = analyse(L); wav('ui_' + t, L);
  console.log(('ui ' + t).padEnd(26), a.rms.toFixed(1).padStart(6), a.peak.toFixed(1).padStart(8), Math.round(a.centroid).toString().padStart(9));
}
