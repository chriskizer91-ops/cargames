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
  var BKEY = "dirt-sleeper-board-mix", CKEY = "dirt-sleeper-board-scene", audio = new GameAudio(), MX = mixFill(rd(BKEY)), solo = /* @__PURE__ */ new Set(), busSolo = /* @__PURE__ */ new Set(), started = !1, revHeld = !1;
  var ENGS = [["stock", "Stock 4.6 V8", {}], ["hot", "Hot 6.2 V8", { engine: "v62", exhaust: "headers", cam: 2, tune: 2, intake: 1 }], ["blown", "Blown big-block", { engine: "bb74", power: "roots", exhaust: "straight", cam: 3, tune: 2 }], ["tt", "Twin-turbo V6", { engine: "tt35", power: "bigturbo", tune: 2, exhaust: "catback" }], ["diesel", "Turbo-diesel six", { engine: "d67", power: "compound", tune: 2, exhaust: "stacks" }]];
  var SCENES = [
    { id: "shop", n: "Idle in the shop", d: "Engine ticking over inside the metal building.", c: { run: 1, rpm: 0, thr: 0, view: "out", mph: 0, ground: "none", spin: 0, rain: 0, time: "day", creek: 0, crowd: 0, space: "shop", storm: 0, wind: 0.1 } },
    { id: "trail", n: "Cruising the trail", d: "40 mph on dirt, light throttle, birds out.", c: { run: 1, rpm: 0.38, thr: 0.35, view: "out", mph: 40, ground: "dirt", spin: 0, rain: 0, time: "day", creek: 0, crowd: 0, space: "open", storm: 0, wind: 0.3 } },
    { id: "strip", n: "Redline on the strip", d: "On the limiter, the Friday night crowd watching.", c: { run: 1, rpm: 1, thr: 1, view: "out", mph: 55, ground: "dirt", spin: 0.3, rain: 0, time: "night", creek: 0, crowd: 0.9, space: "open", storm: 0, wind: 0.15 } },
    { id: "creek", n: "Night at the creek", d: "Idling by the water, insects all around.", c: { run: 1, rpm: 0, thr: 0, view: "out", mph: 0, ground: "none", spin: 0, rain: 0, time: "night", creek: 1, crowd: 0, space: "open", storm: 0, wind: 0.1 } },
    { id: "storm", n: "Storm, in the cab", d: "Rain on the roof, thunder, 30 mph on dirt.", c: { run: 1, rpm: 0.3, thr: 0.3, view: "cab", mph: 30, ground: "dirt", spin: 0, rain: 1, time: "day", creek: 0, crowd: 0, space: "open", storm: 1, wind: 0.6 } },
    { id: "bog", n: "Mud bog", d: "Wheels spinning in the pit.", c: { run: 1, rpm: 0.75, thr: 0.9, view: "out", mph: 8, ground: "mud", spin: 0.8, rain: 0.4, time: "day", creek: 0, crowd: 0, space: "open", storm: 0, wind: 0.3 } },
    { id: "world", n: "Just the world", d: "Engine off. Only the ranch.", c: { run: 0, rpm: 0, thr: 0, view: "out", mph: 0, ground: "none", spin: 0, rain: 0, time: "day", creek: 0.5, crowd: 0, space: "open", storm: 0, wind: 0.35 } }
  ];
  var CTX = Object.assign({ scene: "trail", eng: "stock" }, SCENES[1].c, rd(CKEY) || {});
  /* what makes each sound play, so Solo can play it even when the scene wouldn't */
  var FORCE = { rain: { rain: 0.8 }, roof: { rain: 0.8, view: "cab" }, thunder: { rain: 0.5, storm: 1 }, wind: { wind: 0.6 }, birds: { birds: 1 }, daybugs: { dayBugs: 1 }, nightbugs: { crickets: 1 }, creek: { creek: 1 }, crowd: { crowd: 0.8 }, dirt: { ground: "dirt", mph: 25 }, roll: { ground: "dirt", mph: 30 }, squeal: { ground: "concrete", spin: 0.7, mph: 20 }, mud: { ground: "mud", spin: 0.6, mph: 6 }, water: { ground: "water", mph: 12 }, speedwind: { mph: 70 } };
  var WHEN = { dirt: "Driving on dirt: the strip, the trails, the yard.", roll: "Rolling on any ground. Packed clay leans on this.", squeal: "Sliding on the concrete pad.", mud: "In the mud pit.", water: "Splashing through the creek.", speedwind: "Air rushing past at speed.", hits: "Bumps, landings and scrapes.", rain: "Storm Coming weather.", roof: "Rain, heard from the Driver camera.", thunder: "Storm Coming weather.", wind: "Always there. Stronger up high and in a storm.", birds: "Afternoon. A few at golden hour.", daybugs: "Afternoon.", nightbugs: "Golden hour and night.", creek: "Near the creek.", crowd: "Drag races, with a cheer at the finish.", ui: "Buying parts, coolers, gates, medals, trophies." };
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
    if (busSolo.size) for (let b of ["engine", "ground", "world", "ui"]) busSolo.has(b) || (m.bus[b] = -120);
    return m;
  }
  var saveT = 0;
  function push() {
    audio.setMix(effMix()), $("code").value = mixEncode(MX), clearTimeout(saveT), saveT = setTimeout(() => wr(BKEY, MX), 250);
  }
  function scene() {
    let c = Object.assign({}, CTX), day = c.time === "day" ? 1 : 0, dusk = c.time === "dusk" ? 1 : 0, night = c.time === "night" ? 1 : 0, wet = c.rain > 0.05, a = { rain: c.rain, storm: c.storm, wind: c.wind, birds: (day + dusk * 0.2) * (wet ? 0.15 : 1), dayBugs: (day + dusk * 0.1) * (wet ? 0 : 1), crickets: (night + dusk * 0.5) * (wet ? 0.3 : 1), creek: c.creek, crowd: c.crowd };
    for (let k of solo) {
      let f = FORCE[k];
      if (f) for (let q in f) q in a ? a[q] = Math.max(a[q], f[q]) : c[q] = f[q];
    }
    return { c, a };
  }
  /* ---------- per frame ---------- */
  var last = performance.now(), hold = {};
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1e3);
    if (last = now, requestAnimationFrame(frame), !started) return;
    let { c, a } = scene(), e = eng.spec, run = !!c.run, cab = c.view === "cab", target = run ? revHeld ? e.limiterRpm + 60 : e.idle + (e.limiterRpm - e.idle) * c.rpm : 0;
    eng.rpm += (target - eng.rpm) * Math.min(1, dt * (target > eng.rpm ? 3.5 : 2.2));
    let cut = 0;
    eng.rpm >= e.limiterRpm - 40 ? (eng.cutT += dt, cut = eng.cutT % 0.09 < 0.035 ? 1 : 0, cut && (eng.rpm -= 900 * dt)) : eng.cutT = 0;
    let load = run ? revHeld ? 1 : c.thr : 0, crank = eng.crankT >= 0 && eng.crankT < 0.9;
    crank && (eng.crankT += dt);
    let rpm = crank ? 230 + 60 * Math.sin(eng.crankT * 38) : eng.rpm, sp = c.mph * 0.447, gr = c.ground, spin = c.spin, ep = { on: run && !crank ? 1 : 0, firing: run && !crank ? 1 : 0, crank: crank ? 1 : 0, crankT: crank ? eng.crankT : 0, rpm: run ? rpm : 0, load: crank ? 0 : load, cutFrac: cut, boost: run ? SIM.steadyBoost(e, rpm) * load : 0, nos: 0, speed: sp, gear: 3, twostep: 0, antilag: 0, view: cab ? 1 : 0, dist: cab ? 1.4 : 6, pan: 0, rear: cab ? 0.35 : 0.7, vol: 1, horn: 0 };
    let s4 = (v) => [v, v, v, v], fx = { lat: s4(0), lon: s4(spin * 7), load: s4(5300), sqK: s4(gr === "concrete" ? 1 : 0.06), wet: c.rain > 0.05 ? 0.6 : 0, speed: sp, cabin: cab ? 1 : 0, curb: 0, scrape: 0, vol: 1, loose: gr === "dirt" ? 1 : 0, spinLoose: gr === "dirt" ? spin : 0, mud: gr === "mud" ? 1 : 0, spinMud: gr === "mud" ? spin : 0, water: gr === "water" ? 1 : 0 }, fev = hold.hit ? [{ type: "hit", a: 0.9 }] : [];
    hold.hit = 0, audio.update(ep, [], fx, fev, { cabin: cab, shop: c.space === "shop" ? 1 : 0, yard: c.space === "yard" ? 1 : 0, amb: Object.assign({ cabin: cab ? 1 : 0 }, a), ambEvents: [] }), meters(dt);
  }
  requestAnimationFrame(frame);
  /* ---------- meters ---------- */
  var peaks = {};
  function meters(dt) {
    let L = audio.levels();
    for (let k of ["engine", "ground", "world", "ui", "master"]) {
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
    box.appendChild(seg("Ground", [["none", "None"], ["dirt", "Dirt"], ["mud", "Mud"], ["water", "Water"], ["concrete", "Concrete"]], CTX.ground, set("ground"))), box.appendChild(slider("Wheelspin", 0, 1, 0.01, CTX.spin, pct, set("spin"), "cSpin"));
    box.appendChild(seg("Time", [["day", "Afternoon"], ["dusk", "Golden hour"], ["night", "Night"]], CTX.time, set("time"))), box.appendChild(slider("Rain", 0, 1, 0.01, CTX.rain, pct, set("rain"), "cRain")), box.appendChild(seg("Thunder", [[0, "No"], [1, "Yes"]], CTX.storm ? 1 : 0, set("storm")));
    box.appendChild(slider("Wind", 0, 1, 0.01, CTX.wind, pct, set("wind"), "cWind")), box.appendChild(slider("Creek nearby", 0, 1, 0.01, CTX.creek, pct, set("creek"), "cCreek")), box.appendChild(slider("Crowd", 0, 1, 0.01, CTX.crowd, pct, set("crowd"), "cCrowd"));
    box.appendChild(seg("Space", [["open", "Open range"], ["yard", "By the shop"], ["shop", "In the shop"]], CTX.space, set("space")));
  }
  var BUSES = [["engine", "Engine", "The engine synth, on its own compressor."], ["ground", "Ground and tyres", "Dirt, mud, water, squeal, wind from speed."], ["world", "The world", "Weather, birds, insects, creek, crowd."], ["ui", "Shop and HUD", "Cash register, chimes, gate ticks, fanfares."], ["master", "Master", "Everything, through the limiter."]];
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
      id === "engine" && (s.appendChild(slider("Even out engines", 0, 1, 0.05, MX.eng.norm, pct, (v) => {
        MX.eng.norm = v, push();
      }, "f-norm")), s.appendChild(slider("Tame the redline", 0, 1, 0.05, MX.eng.tame, pct, (v) => {
        MX.eng.tame = v, push();
      }, "f-tame")), s.appendChild(el("p", "note", 'Pulling the engine down by <b id="gr">0.0 dB</b> right now. "Even out" makes a stock V8 and a blown big-block equally loud at 100%.')));
      id === "master" && s.appendChild(seg("Limiter", [[1, "On"], [0, "Off"]], MX.limiter ? 1 : 0, (v) => {
        MX.limiter = v, push();
      })), s.appendChild(el("p", "note", esc(note))), box.appendChild(s);
    }
  }
  function audition(id, m) {
    if (!started) return toast("Press Start sound first");
    id === "thunder" ? audio.ui("thunder", { kind: m.v }) : id === "birds" ? audio.ui("bird", { kind: m.v }) : id === "crowd" ? audio.ui("cheer", { a: 1 }) : id === "hits" ? hold.hit = 1 : id === "ui" && ["kaching", "chime", "tick", "medal", "trophy"].forEach((t, i) => setTimeout(() => audio.ui(t), i * 900));
  }
  function renderCards() {
    for (let bus of ["ground", "world", "ui"]) {
      let box = $("c-" + bus);
      box.innerHTML = "";
      for (let S of MIX_SOUNDS.filter((q) => q.bus === bus)) {
        let m = MX.s[S.id], c = el("div", "card" + (m.on ? "" : " off") + (solo.has(S.id) ? " solo" : "")), hd = el("div", "hd", `<h3>${esc(S.name)}</h3>`), onb = el("button", "btn small" + (m.on ? " on" : ""), m.on ? "On" : "Off"), sb = el("button", "btn small" + (solo.has(S.id) ? " on" : ""), "Solo");
        onb.type = sb.type = "button", onb.onclick = () => {
          m.on = m.on ? 0 : 1, renderCards(), push();
        }, sb.onclick = () => {
          solo.has(S.id) ? solo.delete(S.id) : solo.add(S.id), renderCards(), push();
        }, hd.append(onb, sb);
        if (["thunder", "birds", "crowd", "hits", "ui"].includes(S.id)) {
          let pb = el("button", "btn small", "Play");
          pb.type = "button", pb.onclick = () => audition(S.id, m), hd.appendChild(pb);
        }
        if (c.appendChild(hd), c.appendChild(el("p", "when", esc(WHEN[S.id] || ""))), c.appendChild(slider("Level", -24, 12, 0.5, m.lvl, (v) => dB(v) + " dB", (v) => {
          m.lvl = v, push();
        }, "l-" + S.id)), S.vars.length) {
          let vs = el("div", "vars");
          for (let [v, t] of S.vars) {
            let b = el("button", m.v === v ? "on" : "", esc(t));
            b.type = "button", b.onclick = () => {
              m.v = v, [...vs.children].forEach((q) => q.classList.toggle("on", q === b)), push(), (S.id === "thunder" || S.id === "birds") && audition(S.id, m);
            }, vs.appendChild(b);
          }
          c.appendChild(vs);
        }
        for (let [k, lab, lo, hi] of S.knobs) {
          let isInt = k === "n" || k === "every";
          c.appendChild(slider(lab, lo, hi, isInt ? 1 : 0.01, m[k] ?? (lo + hi) / 2, (v) => isInt ? String(v) : pct((v - lo) / (hi - lo)), (v) => {
            m[k] = v, push();
          }, "k-" + S.id + "-" + k));
        }
        box.appendChild(c);
      }
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
    b.dataset.arm = "", b.textContent = "Reset", MX = mixFill(null), solo.clear(), busSolo.clear(), renderAll(), push(), toast("Back to the default mix");
  };
  window.__board = { audio, get MX() {
    return MX;
  }, CTX, solo, push, renderAll };
})();
</script>
