  // ===== tools/sound-board.js =====
  /* The sound board: the game's own synths and mix bus, driven by a scene instead of the game. Every
     change goes straight into the live mix and into a code the game can read. */
  var $ = (id) => document.getElementById(id), el = (tag, cls, html) => {
    let e = document.createElement(tag);
    return cls && (e.className = cls), html !== void 0 && (e.innerHTML = html), e;
  }, esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function rd(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  }
  function wr(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
    }
  }
  var BKEY = "dirt-sleeper-board-mix", CKEY = "dirt-sleeper-board-scene-3", audio = new GameAudio(), MX = mixFill(rd(BKEY), MIX_BOARD), solo = /* @__PURE__ */ new Set(), busSolo = /* @__PURE__ */ new Set(), started = !1, revHeld = !1;
  var ENGS = [["stock", "Stock 4.6 V8", {}], ["hot", "Hot 6.2 V8", { engine: "v62", exhaust: "headers", cam: 2, tune: 2, intake: 1 }], ["blown", "Blown big-block", { engine: "bb74", power: "roots", exhaust: "straight", cam: 3, tune: 2 }], ["tt", "Twin-turbo V6", { engine: "tt35", power: "bigturbo", tune: 2, exhaust: "catback" }], ["diesel", "Turbo-diesel six", { engine: "d67", power: "compound", tune: 2, exhaust: "stacks" }]];
  var SCENES = [
    { id: "shop", n: "Idle in the shop", d: "Engine ticking over inside the metal building.", c: { run: 1, rpm: 0, thr: 0, view: "out", mph: 0, ground: "none", spin: 0, bumps: 0, space: "shop", land: 0, scrape: 0 } },
    { id: "trail", n: "Cruising the trail", d: "40 mph on a dirt road, light throttle, a few bumps.", c: { run: 1, rpm: 0.38, thr: 0.35, view: "out", mph: 40, ground: "dirt", spin: 0, bumps: 0.35, space: "open", land: 0, scrape: 0 } },
    { id: "gravel", n: "Gravel road", d: "30 mph on the loose trail surface.", c: { run: 1, rpm: 0.32, thr: 0.3, view: "out", mph: 30, ground: "trail", spin: 0, bumps: 0.25, space: "open", land: 0, scrape: 0 } },
    { id: "strip", n: "Redline on the strip", d: "On the limiter halfway down the eighth mile.", c: { run: 1, rpm: 1, thr: 1, view: "out", mph: 55, ground: "strip", spin: 0.15, bumps: 0.05, space: "open", land: 0, scrape: 0 } },
    { id: "burnout", n: "Burnout on the pad", d: "Line lock on, rear tyres spinning in the dirt.", c: { run: 1, rpm: 0.85, thr: 1, view: "out", mph: 0, ground: "dirt", spin: 1, bumps: 0, space: "open", land: 0, scrape: 0 } },
    { id: "jump", n: "Jumps", d: "45 mph over the hills, landing every few seconds.", c: { run: 1, rpm: 0.5, thr: 0.6, view: "out", mph: 45, ground: "dirt", spin: 0, bumps: 0.4, space: "open", land: 1, scrape: 0 } },
    { id: "bog", n: "Mud bog", d: "Wheels spinning in the pit.", c: { run: 1, rpm: 0.75, thr: 0.9, view: "out", mph: 8, ground: "mud", spin: 0.8, bumps: 0.1, space: "open", land: 0, scrape: 0 } },
    { id: "crawl", n: "Rock crawl", d: "Low range over the ledges, heard from the cab, the belly touching now and then.", c: { run: 1, rpm: 0.12, thr: 0.3, view: "cab", mph: 2, ground: "rock", spin: 0.1, bumps: 0.8, space: "open", land: 0, scrape: 0.3 } },
    { id: "water", n: "Water crossing", d: "No sound for the water yet: it's waiting for a recording.", c: { run: 1, rpm: 0.3, thr: 0.4, view: "out", mph: 10, ground: "water", spin: 0, bumps: 0.1, space: "open", land: 0, scrape: 0 } }
  ];
  var CTX = Object.assign({ scene: "trail", eng: "stock" }, SCENES[1].c, rd(CKEY) || {});
  SCENES.some((q) => q.id === CTX.scene) || CTX.scene === null || Object.assign(CTX, SCENES[1].c, { scene: "trail" });
  /* what makes each sound play, so Solo can play it even when the scene wouldn't */
  var FORCE = { roll: { ground: "dirt", mph: 30 }, crunch: { ground: "trail", mph: 30 }, spin: { ground: "dirt", spin: 0.8, mph: 4 }, thump: { ground: "dirt", mph: 25, bumps: 0.6 }, hits: { ground: "rock", mph: 3, scrape: 0.5 }, mud: { ground: "mud", spin: 0.6, mph: 6 } };
  var SIDX = { grass: 0, dirt: 1, strip: 2, trail: 3, rock: 4, mud: 5, concrete: 6, water: 7 };
  /* ---------- the engine ---------- */
  var eng = { rpm: 0, cutT: 0, crankT: -1, spec: null, id: null };
  function setEngine(id) {
    let def = ENGS.find((q) => q[0] === id) || ENGS[0], b = Object.assign({}, STOCK_BUILD, def[2]);
    eng.spec = buildSpec(b), eng.id = def[0], audio.configure(SIM.dspCfg(eng.spec)), eng.rpm = eng.spec.idle;
  }
  setEngine(CTX.eng);
  /* ---------- the effective mix: solo mutes everything else ---------- */
  function effMix() {
    let m = JSON.parse(JSON.stringify(MX));
    if (solo.size) {
      for (let k in m.s) solo.has(k) || (m.s[k].on = 0);
      busSolo.has("engine") || (m.bus.engine = -120);
    }
    if (busSolo.size) for (let b of ["engine", "ground", "ui"]) busSolo.has(b) || (m.bus[b] = -120);
    return m;
  }
  var saveT = 0;
  function push() {
    audio.setMix(effMix()), $("code").value = mixEncode(MX), clearTimeout(saveT), saveT = setTimeout(() => wr(BKEY, MX), 250);
  }
  function scene() {
    let c = Object.assign({}, CTX);
    for (let k of solo) {
      let f = FORCE[k];
      if (f) for (let q in f) c[q] = f[q];
    }
    return { c };
  }
  /* ---------- per frame ---------- */
  var last = performance.now(), hold = {};
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1e3);
    if (last = now, requestAnimationFrame(frame), !started) return;
    let { c } = scene(), e = eng.spec, run = !!c.run, cab = c.view === "cab", target = run ? revHeld ? e.limiterRpm + 60 : e.idle + (e.limiterRpm - e.idle) * c.rpm : 0;
    eng.rpm += (target - eng.rpm) * Math.min(1, dt * (target > eng.rpm ? 3.5 : 2.2));
    let cut = 0;
    eng.rpm >= e.limiterRpm - 40 ? (eng.cutT += dt, cut = eng.cutT % 0.09 < 0.035 ? 1 : 0, cut && (eng.rpm -= 900 * dt)) : eng.cutT = 0;
    let load = run ? revHeld ? 1 : c.thr : 0, crank = eng.crankT >= 0 && eng.crankT < 0.9;
    crank && (eng.crankT += dt);
    let rpm = crank ? 230 + 60 * Math.sin(eng.crankT * 38) : eng.rpm, sp = c.mph * 0.447, gr = c.ground, spin = c.spin, ep = { on: run && !crank ? 1 : 0, firing: run && !crank ? 1 : 0, crank: crank ? 1 : 0, crankT: crank ? eng.crankT : 0, rpm: run ? rpm : 0, load: crank ? 0 : load, cutFrac: cut, boost: run ? SIM.steadyBoost(e, rpm) * load : 0, nos: 0, speed: sp, gear: 3, twostep: 0, antilag: 0, view: cab ? 1 : 0, dist: cab ? 1.4 : 6, pan: 0, rear: cab ? 0.35 : 0.7, vol: 1, horn: 0 };
    /* the wheels: front ones rolling, rear ones spinning by the Wheelspin amount */
    let on = gr !== "none", si = SIDX[gr] ?? 1, slip = spin * 14, fx = { c: on ? [1, 1, 1, 1] : [0, 0, 0, 0], s: [si, si, si, si], v: [sp, sp, sp, sp], sl: [spin * 2, spin * 2, slip, slip], ld: [1, 1, 1, 1], ws: [sp, sp, sp + slip, sp + slip], pitch: 0.07, speed: sp, cabin: cab ? 1 : 0, vol: 1, scr: 0, scrK: gr === "rock" ? 1 : 0 }, fev = hold.ev || [];
    hold.ev = [];
    if (on) {
      /* bumps under each wheel; a landing every few seconds in the jump scene; the belly scraping now and then */
      for (let w = 0; w < 4; w++) Math.random() < dt * c.bumps * (1.5 + sp * 0.25) && fev.push({ type: "bump", w, a: 0.08 + 0.7 * Math.random() ** 2 * c.bumps });
      c.land && (hold.landT = (hold.landT || 0) + dt) > 3.4 && (hold.landT = 0, fev.push({ type: "land", a: 0.85 }), Math.random() < 0.4 && fev.push({ type: "bottom", w: 2, a: 0.6 }));
      c.scrape && (hold.scrT = Math.max(0, (hold.scrT || 0) - dt), hold.scrT <= 0 && Math.random() < dt * c.scrape * 0.8 && (hold.scrT = 0.6 + Math.random() * 0.8, Math.random() < 0.5 && fev.push({ type: "hit", a: 0.3 + Math.random() * 0.3, k: gr === "rock" ? "rock" : "ground" })), hold.scrT > 0 && (fx.scr = 1.2 + hold.scrT * 2));
    }
    hold.scrOnce > 0 && (hold.scrOnce -= dt, fx.scr = 3);
    audio.update(ep, [], fx, fev, { cabin: cab, shop: c.space === "shop" ? 1 : 0, yard: c.space === "yard" ? 1 : 0 }), meters(dt);
  }
  requestAnimationFrame(frame);
  /* ---------- meters ---------- */
  var peaks = {};
  function meters(dt) {
    let L = audio.levels();
    for (let k of ["engine", "ground", "ui", "master"]) {
      let m = $("m-" + k), d = $("d-" + k), v = L[k];
      if (!m || !v) continue;
      let [pk, rms] = v, w = (x) => Math.max(0, Math.min(100, (x + 60) / 60 * 100));
      peaks[k] = Math.max((peaks[k] ?? -90) - dt * 14, pk), m.style.setProperty("--w", m.clientWidth + "px"), m.querySelector("i").style.width = w(rms) + "%", m.querySelector("b").style.left = "calc(" + w(peaks[k]) + "% - 2px)", d.textContent = peaks[k] < -59 ? "−∞" : peaks[k].toFixed(1), d.classList.toggle("clip", peaks[k] > -0.5);
    }
    let mm = $("mMaster"), mv = L.master;
    if (mm && mv) {
      let w = (x) => Math.max(0, Math.min(100, (x + 60) / 60 * 100));
      mm.style.setProperty("--w", mm.clientWidth + "px"), mm.querySelector("i").style.width = w(mv[1]) + "%", mm.querySelector("b").style.left = "calc(" + w(peaks.master ?? -90) + "% - 2px)", $("dMaster").textContent = (peaks.master ?? -90) < -59 ? "−∞" : peaks.master.toFixed(1), $("dMaster").classList.toggle("clip", (peaks.master ?? -90) > -0.5);
    }
    let gr = $("gr");
    gr && (gr.textContent = (L.reduction || 0).toFixed(1) + " dB");
  }
  /* ---------- controls ---------- */
  function slider(lab, min, max, step, val, fmt, on, id) {
    let r = el("div", "row"), w = el("div", "sl"), inp = el("input"), out = el("output");
    return inp.type = "range", inp.min = min, inp.max = max, inp.step = step, inp.value = val, id && (inp.id = id), out.textContent = fmt(+val), inp.oninput = () => {
      out.textContent = fmt(+inp.value), on(+inp.value);
    }, w.append(inp, out), r.append(el("label", "", esc(lab)), w), id && r.querySelector("label").setAttribute("for", id), r;
  }
  function seg(lab, opts, cur, on) {
    let r = el("div", "row"), s = el("div", "seg");
    for (let [v, t] of opts) {
      let b = el("button", v === cur ? "on" : "", esc(t));
      b.type = "button", b.onclick = () => {
        on(v), [...s.children].forEach((q) => q.classList.toggle("on", q === b));
      }, s.appendChild(b);
    }
    return r.append(el("span", "k", esc(lab)), s), r;
  }
  var dB = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1), pct = (v) => Math.round(v * 100) + "%";
  function saveCtx() {
    wr(CKEY, CTX);
  }
  function renderScenes() {
    let box = $("scenes");
    box.innerHTML = "";
    for (let S of SCENES) {
      let b = el("button", "tag" + (CTX.scene === S.id ? " on" : ""), `<b>${esc(S.n)}</b><span>${esc(S.d)}</span>`);
      b.type = "button", b.onclick = () => {
        Object.assign(CTX, S.c, { scene: S.id }), saveCtx(), renderScenes(), renderCtx(), !CTX.run && (eng.crankT = -1), CTX.run && started && eng.rpm < 100 && (eng.crankT = 0);
      }, box.appendChild(b);
    }
  }
  function renderCtx() {
    let box = $("ctx"), set = (k) => (v) => {
      CTX[k] = v, CTX.scene = null, renderScenes(), saveCtx();
    };
    box.innerHTML = "";
    let er = el("div", "row"), sel = el("select");
    sel.id = "engSel";
    for (let [id, n] of ENGS) {
      let o = el("option", "", esc(n));
      o.value = id, o.selected = id === CTX.eng, sel.appendChild(o);
    }
    sel.onchange = () => {
      CTX.eng = sel.value, setEngine(sel.value), saveCtx();
    }, er.append(el("label", "", "Engine"), sel), er.querySelector("label").setAttribute("for", "engSel"), box.appendChild(er);
    box.appendChild(seg("Engine is", [[1, "Running"], [0, "Off"]], CTX.run ? 1 : 0, (v) => {
      set("run")(v), v && started && (eng.crankT = 0);
    }));
    let rr = slider("Revs", 0, 1, 0.01, CTX.rpm, (v) => Math.round(eng.spec.idle + (eng.spec.limiterRpm - eng.spec.idle) * v).toLocaleString() + " rpm", set("rpm"), "cRpm"), rev = el("button", "btn small", "Hold to rev");
    rev.type = "button";
    let on = (v) => (ev) => {
      ev.preventDefault(), revHeld = v, rev.classList.toggle("on", v);
    };
    rev.onpointerdown = on(!0), rev.onpointerup = rev.onpointerleave = rev.onpointercancel = on(!1), rr.querySelector(".sl").style.gridTemplateColumns = "1fr 9ch", box.appendChild(rr);
    let rh = el("div", "row");
    rh.append(el("span", "k", ""), rev), box.appendChild(rh);
    box.appendChild(slider("Throttle", 0, 1, 0.01, CTX.thr, pct, set("thr"), "cThr")), box.appendChild(seg("Listening", [["out", "Outside"], ["cab", "In the cab"]], CTX.view, set("view"))), box.appendChild(slider("Speed", 0, 90, 1, CTX.mph, (v) => v + " mph", set("mph"), "cMph"));
    box.appendChild(seg("Ground", [["none", "None"], ["dirt", "Dirt"], ["trail", "Gravel trail"], ["grass", "Grass"], ["strip", "Drag strip"], ["mud", "Mud"], ["rock", "Rock"], ["concrete", "Concrete"], ["water", "Water"]], CTX.ground, set("ground"))), box.appendChild(slider("Wheelspin", 0, 1, 0.01, CTX.spin, pct, set("spin"), "cSpin")), box.appendChild(slider("Bumps", 0, 1, 0.01, CTX.bumps || 0, pct, set("bumps"), "cBumps"));
    box.appendChild(seg("Space", [["open", "Open range"], ["yard", "By the shop"], ["shop", "In the shop"]], CTX.space, set("space")));
  }
  var BUSES = [["engine", "Engine", "The Digital Engine synth exactly as the lab plays it: the same compressor and the same open-air room (its garage inside the shop)."], ["ground", "Ground and body", "Tyres, dirt, wheelspin, suspension, hits, mud."], ["ui", "Shop and HUD", "Beeps, gate tocks, stabs for bests and medals, the cooler, buying parts."], ["master", "Master", "Everything, through the limiter."]];
  function renderBuses() {
    let box = $("buses");
    box.innerHTML = "";
    for (let [id, n, note] of BUSES) {
      let s = el("div", "strip" + (busSolo.size && id !== "master" && !busSolo.has(id) ? " muted" : "")), hd = el("div", "hd", `<h2>${esc(n)}</h2>`);
      if (id !== "master") {
        let sb = el("button", "btn small" + (busSolo.has(id) ? " on" : ""), "Solo");
        sb.type = "button", sb.onclick = () => {
          busSolo.has(id) ? busSolo.delete(id) : busSolo.add(id), renderBuses(), push();
        }, hd.appendChild(sb);
      }
      s.appendChild(hd), s.appendChild(el("div", "mm", `<span class="k">Level</span><div class="meter" id="m-${id}"><i></i><b></b></div><span class="db" id="d-${id}">−∞</span>`)), s.appendChild(slider("Fader", -30, 12, 0.5, MX.bus[id] ?? 0, (v) => dB(v) + " dB", (v) => {
        MX.bus[id] = v, push();
      }, "f-" + id));
      id === "engine" && s.appendChild(el("p", "note", 'The lab\'s compressor is pulling the engine down by <b id="gr">0.0 dB</b> right now.'));
      id === "master" && s.appendChild(seg("Limiter", [[1, "On"], [0, "Off"]], MX.limiter ? 1 : 0, (v) => {
        MX.limiter = v, push();
      })), s.appendChild(el("p", "note", esc(note))), box.appendChild(s);
    }
  }
  function audition(id) {
    if (!started) return toast("Press Start sound first");
    let at = (t, f) => setTimeout(f, t * 1e3), ev = (e) => (hold.ev = hold.ev || []).push(e);
    id === "thump" ? ([0, 0.35, 0.6, 0.8].forEach((t, i) => at(t, () => ev({ type: "bump", w: i, a: 0.3 + i * 0.15 }))), at(1.4, () => ev({ type: "land", a: 1 })), at(2.4, () => ev({ type: "bottom", w: 2, a: 0.8 }))) : id === "hits" ? (at(0, () => ev({ type: "hit", a: 0.8, k: "rock" })), at(0.7, () => ev({ type: "hit", a: 0.8, k: "wall" })), at(1.4, () => ev({ type: "hit", a: 0.8, k: "ground" })), at(2, () => hold.scrOnce = 1.2)) : id === "ui" && ["ready", "ready", "go", "tick", "lap", "best", "medal", "trophy", "kaching", "chime", "miss"].forEach((t, i) => at(i * 0.9, () => audio.ui(t)));
  }
  function renderCards() {
    for (let bus of ["ground", "ui"]) {
      let box = $("c-" + bus);
      box.innerHTML = "";
      for (let S of MIX_SOUNDS.filter((q) => q.bus === bus)) {
        let m = MX.s[S.id], c = el("div", "card" + (m.on ? "" : " off") + (solo.has(S.id) ? " solo" : "")), hd = el("div", "hd", `<h3>${esc(S.name)}</h3>`), onb = el("button", "btn small" + (m.on ? " on" : ""), m.on ? "On" : "Off"), sb = el("button", "btn small" + (solo.has(S.id) ? " on" : ""), "Solo");
        onb.type = sb.type = "button", onb.onclick = () => {
          m.on = m.on ? 0 : 1, renderCards(), push();
        }, sb.onclick = () => {
          solo.has(S.id) ? solo.delete(S.id) : solo.add(S.id), renderCards(), push();
        }, hd.append(onb, sb);
        if (["thump", "hits", "ui"].includes(S.id)) {
          let pb = el("button", "btn small", "Play");
          pb.type = "button", pb.onclick = () => audition(S.id), hd.appendChild(pb);
        }
        let ok = MIX_DEFAULT.s[S.id].on;
        if (c.appendChild(hd), c.appendChild(el("p", "when", esc(S.when || ""))), c.appendChild(el("p", "status" + (ok ? " ok" : ""), ok ? "In the game" : "New: off in the game until you approve it")), c.appendChild(slider("Level", -24, 12, 0.5, m.lvl, (v) => dB(v) + " dB", (v) => {
          m.lvl = v, push();
        }, "l-" + S.id)), S.vars.length) {
          let vs = el("div", "vars");
          for (let [v, t] of S.vars) {
            let b = el("button", m.v === v ? "on" : "", esc(t));
            b.type = "button", b.onclick = () => {
              m.v = v, [...vs.children].forEach((q) => q.classList.toggle("on", q === b)), push();
            }, vs.appendChild(b);
          }
          c.appendChild(vs);
        }
        for (let [k, lab, lo, hi] of S.knobs || []) {
          let isInt = k === "n" || k === "every";
          c.appendChild(slider(lab, lo, hi, isInt ? 1 : 0.01, m[k] ?? (lo + hi) / 2, (v) => isInt ? String(v) : pct((v - lo) / (hi - lo)), (v) => {
            m[k] = v, push();
          }, "k-" + S.id + "-" + k));
        }
        box.appendChild(c);
      }
      bus === "ground" && box.appendChild(el("div", "card off wait", '<div class="hd"><h3>Water</h3></div><p class="when">The creek crossings. Waiting for a recording; gravel will be swapped for one too if you find a good one.</p>'));
    }
  }
  var toastT = 0;
  function toast(t) {
    let e = $("toast") || document.body.appendChild(Object.assign(el("div", "toast"), { id: "toast" }));
    e.textContent = t, e.hidden = !1, clearTimeout(toastT), toastT = setTimeout(() => e.hidden = !0, 2200);
  }
  function renderAll() {
    renderScenes(), renderCtx(), renderBuses(), renderCards(), $("code").value = mixEncode(MX);
  }
  renderAll();
  $("start").onclick = async () => {
    if (!started) {
      $("start").disabled = !0, await audio.start(), $("start").disabled = !1, started = !!audio.ready, started ? (audio.setVolume(0.9), setEngine(CTX.eng), push(), eng.crankT = CTX.run ? 0 : -1, $("start").textContent = "Pause sound") : toast("Sound couldn't start in this browser");
      return;
    }
    let paused = audio.ctx.state === "running";
    audio.suspend(paused), $("start").textContent = paused ? "Resume sound" : "Pause sound";
  };
  $("copy").onclick = () => {
    let t = mixEncode(MX), done = () => toast("Mix code copied. Paste it in the game's Settings."), fail = () => {
      $("code").focus(), $("code").select(), toast("Select the code below and copy it.");
    };
    try {
      navigator.clipboard.writeText(t).then(done, fail);
    } catch {
      fail();
    }
  };
  $("paste").onclick = () => {
    let m = el("div", "modal"), box = el("div", "box", '<h2>Paste a mix code</h2><textarea id="pasteBox" spellcheck="false" placeholder="DSMIX1.…"></textarea><div class="ctl" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn go" id="pasteGo" type="button">Load it</button><button class="btn" id="pasteNo" type="button">Cancel</button></div><p class="hint">Loads every level, version and knob from the code.</p>');
    m.appendChild(box), document.body.appendChild(m), $("pasteBox").focus(), $("pasteNo").onclick = () => m.remove(), m.onclick = (e) => e.target === m && m.remove(), $("pasteGo").onclick = () => {
      try {
        MX = mixDecode($("pasteBox").value), renderAll(), push(), m.remove(), toast("Mix loaded");
      } catch (e) {
        toast(e.message || "That code didn't work");
      }
    };
  };
  $("reset").onclick = () => {
    let b = $("reset");
    if (!b.dataset.arm) return b.dataset.arm = "1", b.textContent = "Click again to reset", setTimeout(() => {
      b.dataset.arm = "", b.textContent = "Reset";
    }, 3e3);
    b.dataset.arm = "", b.textContent = "Reset", MX = mixFill(null, MIX_BOARD), solo.clear(), busSolo.clear(), renderAll(), push(), toast("Back to the board's starting mix");
  };
  window.__board = { audio, get MX() {
    return MX;
  }, CTX, solo, push, renderAll };
})();
</script>
