/* Boot the built game in headless Chromium (SwiftShader), run a script of steps, screenshot.
   usage: node tools/shot.cjs '<json steps>' [query] [w h]
   steps: ["wait",ms] ["js","code"] ["shot","name"] ["click","#sel"] ["drive",seconds,{thr,steer,brk,hb}] */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const steps = JSON.parse(process.argv[2] || '[]'), q = process.argv[3] || '', W = +(process.argv[4] || 960), H = +(process.argv[5] || 540);
  const OUT = process.env.SHOTS || '/tmp/shots';require('fs').mkdirSync(OUT, { recursive: true });
  const page = 'file://' + path.resolve(__dirname, '..', 'dist', 'redline-retro.html') + q;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: process.env.TOUCH === '1' });
  const pg = await ctx.newPage();
  /* (the engine's synth held silent unless AUDIO=1: on a two-core box its audio thread starves the page) */
  if (process.env.AUDIO !== '1') await pg.addInitScript(() => { const AC = window.AudioContext; if (AC) window.AudioContext = class extends AC { constructor(o) { super(o); super.suspend(); } resume() { return Promise.resolve(); } }; });
  const logs = []; pg.on('console', m => { if (m.type() !== 'debug') logs.push(m.type() + ': ' + m.text()); }); pg.on('pageerror', e => logs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  const t0 = Date.now();
  await pg.goto(page);
  let ok = false;
  for (let i = 0; i < 400; i++) { ok = await pg.evaluate(() => { const L = document.getElementById('loading'); return !!(L && L.hidden); }); if (ok) break; if (logs.some(l => l.startsWith('pageerror'))) break; await pg.waitForTimeout(250); }
  console.log('booted', ok, ((Date.now() - t0) / 1000).toFixed(1) + 's', await pg.evaluate(() => document.getElementById('loading').textContent));
  for (const s of steps) {
    try {
      if (s[0] === 'wait') await pg.waitForTimeout(s[1]);
      else if (s[0] === 'js') { const r = await pg.evaluate(s[1]); if (r !== undefined) console.log('js>', typeof r === 'string' ? r.slice(0, 1500) : JSON.stringify(r).slice(0, 1500)); }
      else if (s[0] === 'click') await pg.click(s[1]);
      else if (s[0] === 'key') await pg.keyboard.press(s[1]);
      else if (s[0] === 'drive') {
        /* game time, not real time: the loop held, the game stepped and drawn at 30 a second with a set input */
        const r = await pg.evaluate(([sec, inp]) => { const g = window.__game; g.GAME.hold = true; const n = Math.round(sec * 30), t0 = performance.now();
          g.setTestInput(Object.assign({ steer: 0, thr: 0, brk: 0, hb: 0, nos: false }, inp || {}));
          for (let i = 0; i < n; i++) { g.APP.t += 1 / 30; g.step(1 / 30); g.render(1 / 30); }
          g.setTestInput(null); g.GAME.hold = false; const t = g.GAME.car;
          return { ms: Math.round(performance.now() - t0), p: t.p.map(v => +v.toFixed(1)), mph: +(t.speed * 2.237).toFixed(1), eng: t.pt.st, gear: t.pt.gear }; }, [s[1], s[2]]);
        console.log('drive', JSON.stringify(r)); }
      else if (s[0] === 'hold') { await pg.keyboard.down(s[1]); await pg.waitForTimeout(s[2]); await pg.keyboard.up(s[1]); }
      else if (s[0] === 'shot') {
        /* (through the devtools protocol: Playwright's own screenshot waits on a frame the busy page never hands it) */
        const cdp = await ctx.newCDPSession(pg); const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
        require('fs').writeFileSync(OUT + '/' + s[1] + '.png', Buffer.from(r.data, 'base64')); console.log('shot', s[1]); }
      else if (s[0] === 'canvas') { const d = await pg.evaluate(() => window.__game.snap()); require('fs').writeFileSync(OUT + '/' + s[1] + '.png', Buffer.from(d.split(',')[1], 'base64')); console.log('canvas', s[1]); }
    } catch (e) { console.log('step failed', JSON.stringify(s).slice(0, 80), e.message.split('\n')[0]); }
  }
  const seen = new Set();
  for (const l of logs) { const k = l.slice(0, 160); if (seen.has(k)) continue; seen.add(k); console.log(l.slice(0, 1500)); if (seen.size > 40) break; }
  await b.close();
})();
