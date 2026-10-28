  // ===== ui/ui.js =====
  /* The shop counter, the race board, the HUD, the pause menu and the time slip, all as DOM over the canvas. */
  var fmt$ = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US"), fmtS = (t, d = 2) => t > 0 ? t.toFixed(d) : "—", el = (tag, cls, html) => {
    let e = document.createElement(tag);
    return cls && (e.className = cls), html !== void 0 && (e.innerHTML = html), e;
  }, esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var CAT_CAM = { looks: { yaw: 0.72, pitch: 0.1, dist: 8.4, y: 0.3 }, engine: { yaw: 0.55, pitch: 0.22, dist: 7.4, y: 0.4 }, drive: { yaw: 2.6, pitch: 0.08, dist: 7.6, y: 0.1 }, chassis: { yaw: 1.62, pitch: 0.05, dist: 8.4, y: 0.1 }, wheels: { yaw: 0.85, pitch: 0.06, dist: 7.2, y: -0.1 }, body: { yaw: 0.9, pitch: 0.2, dist: 8.6, y: 0.35 }, paint: { yaw: 1.35, pitch: 0.12, dist: 8.8, y: 0.3 } };
  function makeUI() {
    let U = { touchHorn: !1, cat: "looks", open: null, committed: null, preview: null, revBtn: 0, idleT: 0, camTo: null, passCache: /* @__PURE__ */ new Map(), passT: 0, touch: !1, lastCam: null };
    let layers = ["title", "garage", "hud", "pause", "result", "events"];
    U.show = (name) => {
      for (let l of layers) $(l).hidden = l !== name;
      $("touch").hidden = !(name === "hud" && U.touch), name === "garage" && (renderGarage(), U.cash()), name === "hud" && (U.cash(), hudBuild()), name === "title" && renderTitle();
    };
    /* ---------- the title: campaign or free play ---------- */
    function renderTitle() {
      let box = $("modes"), c = hasSave("campaign"), won = c ? RIVALS.filter((r) => (c.wins || {})[r.id]).length : 0, tro = c ? Object.keys(c.trophies || {}).length : 0;
      box.innerHTML = "";
      let card = (cls, eyebrow, title, text, extra, label, gm) => {
        let d = el("div", "mode " + cls, `<span class="eyebrow">${eyebrow}</span><h3>${title}</h3><p>${text}</p>${extra}`), b = el("button", "btn " + (gm === "campaign" ? "go" : ""), label);
        b.onclick = () => chooseMode(gm), d.appendChild(b), box.appendChild(d);
      };
      card("camp", "Campaign", "Earn it", "Start with $2,500 and the truck as it left the factory. Win drags and medals, buy the parts, fill the trophy case.", c ? `<p class="prog">${fmt$(c.cash)} · ${won}/${RIVALS.length} racers beaten · ${tro}/${TROPHIES.length} trophies</p>` : "", c ? "Continue the campaign" : "Start the campaign", "campaign");
      card("free", "Free play", "Everything unlocked", "Every part in the shop, every racer and every run, no prices. Try any build you like. Nothing here counts toward the campaign.", "", "Play free", "free");
    }
    /* ---------- toasts ---------- */
    U.toast = (text, kind = "", dur = 2.2) => {
      let box = $("toasts"), t = el("div", "toast " + (kind || (text.length > 34 ? "small" : "")), esc(text));
      for (box.appendChild(t); box.children.length > 3; ) box.firstChild.remove();
      setTimeout(() => t.remove(), dur * 1e3);
    };
    U.cash = () => {
      let t = FREE() ? "Free play" : fmt$(SV.cash);
      $("gCash").textContent = t, $("hCash").textContent = t, $("gCash").classList.toggle("freebadge", FREE()), $("hCash").classList.toggle("freebadge", FREE());
    };
    /* ---------- the shop ---------- */
    function optBlocked(b, slot, o) {
      if (!o.req) return null;
      let t = Object.assign({}, b, { [slot.id]: o.v });
      return o.req(t);
    }
    /* after a change, swap out anything that no longer fits */
    function fixBuild(b, changed) {
      let notes = [];
      for (let s of SLOTS) {
        if (s.id === changed) continue;
        let o = optOf(b, s.id);
        if (o.req && o.req(b)) {
          let own = SV.owned[s.id] || [], alt = s.opts.find((q) => own.includes(q.v) && !(q.req && q.req(Object.assign({}, b, { [s.id]: q.v }))));
          alt && (b[s.id] = alt.v, notes.push(`${s.name}: back to ${alt.n}`));
        }
      }
      return notes;
    }
    function owned(id, v) {
      return (SV.owned[id] || []).includes(v);
    }
    function revert() {
      U.preview && (applyBuild(U.committed), U.preview = null), $("buybar").hidden = !0;
    }
    U.revert = revert;
    function pick(slot, o) {
      let base = U.preview ? U.committed : SV.build, why = optBlocked(base, slot, o);
      if (why) return U.toast(why, "bad", 2.2);
      if (U.preview && U.preview.slot === slot.id && U.preview.v === o.v) return;
      revert();
      let b = Object.assign({}, SV.build, { [slot.id]: o.v }), notes = fixBuild(b, slot.id);
      if (owned(slot.id, o.v)) applyBuild(b), U.committed = null, persist(), notes.forEach((n) => U.toast(n, "", 2.5));
      else U.committed = Object.assign({}, SV.build), U.preview = { slot: slot.id, v: o.v, o, notes }, applyBuild(b), $("buybar").hidden = !1, $("buyWhat").innerHTML = `<b>${esc(o.n)}</b>${fmt$(o.price)} · you have ${fmt$(SV.cash)}`, $("buyGo").disabled = SV.cash < o.price, $("buyGo").textContent = SV.cash < o.price ? "Not enough" : "Buy " + fmt$(o.price);
      renderSlots(), renderSheet();
    }
    /* a look: every part it changes, and the ones you'd have to buy */
    function lookParts(lk) {
      let b = U.preview && U.committed ? U.committed : SV.build, out = [];
      for (let id in lk.build) b[id] !== lk.build[id] && out.push({ slot: id, v: lk.build[id], o: SLOT[id].opts.find((o) => o.v === lk.build[id]) });
      return out;
    }
    function pickLook(lk) {
      revert();
      let parts = lookParts(lk);
      if (!parts.length) return U.toast(`${lk.name} is already on the truck`, "", 1.8);
      let b = Object.assign({}, SV.build, lk.build), notes = fixBuild(b, null), missing = parts.filter((p) => !owned(p.slot, p.v)), price = missing.reduce((a, p) => a + p.o.price, 0);
      if (!missing.length) applyBuild(b), U.committed = null, persist(), U.toast(`${lk.name}`, "go", 1.6), notes.forEach((n) => U.toast(n, "", 2.5));
      else U.committed = Object.assign({}, SV.build), U.preview = { look: lk.id, items: missing, o: { n: lk.name, price }, notes }, applyBuild(b), $("buybar").hidden = !1, $("buyWhat").innerHTML = `<b>${esc(lk.name)}</b>${missing.length} part${missing.length > 1 ? "s" : ""} · ${fmt$(price)} · you have ${fmt$(SV.cash)}`, $("buyGo").disabled = SV.cash < price, $("buyGo").textContent = SV.cash < price ? "Not enough" : "Buy all " + fmt$(price);
      renderSlots(), renderSheet();
    }
    function renderLooks(box) {
      let list = el("div", "opts looks");
      list.appendChild(el("p", "looknote", FREE() ? "One click puts the whole look on. Engine and drivetrain stay as they are." : "Try a look on, then buy the parts you don't have yet in one go. Engine and drivetrain stay as they are."));
      for (let lk of LOOKS) {
        let parts = lookParts(lk), missing = parts.filter((p) => !owned(p.slot, p.v)), price = missing.reduce((a, p) => a + p.o.price, 0), tr = U.preview && U.preview.look === lk.id, on = !parts.length, t = el("button", "tag look" + (on ? " on" : ""));
        t.innerHTML = `<span class="t">${esc(lk.name)}</span><span class="p">${FREE() || !missing.length ? "" : fmt$(price)}</span><span class="d">${esc(lk.blurb)}</span><span class="st">${tr ? '<i class="stamp try">Trying on</i>' : on ? '<i class="stamp fit">Fitted</i>' : FREE() ? "" : missing.length ? `<i class="stamp own">${missing.length} part${missing.length > 1 ? "s" : ""} to buy</i>` : '<i class="stamp own">All in the shop</i>'}</span>`;
        t.onclick = () => pickLook(lk), list.appendChild(t);
      }
      box.appendChild(list);
    }
    function buy() {
      let p = U.preview;
      if (!p || SV.cash < p.o.price) return;
      audio.ui("kaching"), SV.cash -= p.o.price, SV.spent = (SV.spent || 0) + p.o.price, SV.spent >= 4e4 && award("spender");
      for (let it of p.items || [{ slot: p.slot, v: p.v }]) (SV.owned[it.slot] = SV.owned[it.slot] || []).push(it.v);
      U.preview = null, U.committed = null, $("buybar").hidden = !0, persist(), U.cash(), U.toast(`Fitted: ${p.o.n}`, "go", 1.6), p.notes.forEach((n) => U.toast(n, "", 2.5)), renderSlots(), renderSheet();
    }
    function renderGarage() {
      let cats = $("cats");
      cats.innerHTML = "";
      for (let [id, name] of CATS) {
        let b = el("button", "cat" + (U.cat === id ? " on" : ""), esc(name));
        b.setAttribute("role", "tab"), b.onclick = () => {
          revert(), U.cat = id, U.open = null, renderGarage(), U.camTo = CAT_CAM[id], U.idleT = 0;
        }, cats.appendChild(b);
      }
      renderSlots(), renderSheet();
    }
    function renderSlots() {
      let box = $("slots"), b = SV.build, scroll = box.scrollTop;
      box.innerHTML = "";
      if (U.cat === "looks") return renderLooks(box), void (box.scrollTop = scroll);
      for (let s of SLOTS.filter((q) => q.cat === U.cat)) {
        let cur = optOf(b, s.id), w = el("div", "slot" + (U.open === s.id ? " open" : "")), hd = el("button", "hd", `<span class="nm">${esc(s.name)}</span><span class="cur">${esc(cur.n)}</span>`);
        hd.onclick = () => {
          revert(), U.open = U.open === s.id ? null : s.id, renderSlots(), renderSheet();
        }, w.appendChild(hd);
        if (U.open === s.id) {
          let list = el("div", "opts");
          for (let o of s.opts) {
            let why = optBlocked(U.preview ? U.committed : b, s, o), on = b[s.id] === o.v, own = owned(s.id, o.v), tr = U.preview && U.preview.slot === s.id && U.preview.v === o.v, t = el("button", "tag" + (on ? " on" : "") + (why ? " blocked" : ""));
            t.innerHTML = `<span class="t">${esc(o.n)}</span><span class="p">${own || FREE() ? "" : fmt$(o.price)}</span>${o.d ? `<span class="d">${esc(o.d)}</span>` : ""}<span class="st">${tr ? '<i class="stamp try">Trying on</i>' : on ? '<i class="stamp fit">Fitted</i>' : own ? (FREE() ? "" : '<i class="stamp own">In the shop</i>') : ""}${why ? `<i class="stamp no">${esc(why)}</i>` : ""}</span>`, t.onclick = () => pick(s, o), list.appendChild(t);
          }
          w.appendChild(list);
        }
        box.appendChild(w);
      }
      box.scrollTop = scroll;
    }
    /* ---------- the spec sheet ---------- */
    function pass(b) {
      let k = JSON.stringify(b);
      if (U.passCache.has(k)) return U.passCache.get(k);
      let r = quickPass(b, "strip");
      return U.passCache.set(k, r), U.passCache.size > 60 && U.passCache.delete(U.passCache.keys().next().value), r;
    }
    function renderSheet() {
      let b = SV.build, n = buildNumbers(b), base = U.preview ? buildNumbers(U.committed) : null, sh = $("sheet"), lbft = n.tq * 0.7376, d = (a, c, unit = "", inv = !1, dp = 0) => {
        if (!base) return "";
        let x = a - c;
        return Math.abs(x) < (dp ? 0.005 : 0.5) ? "" : `<span class="${x > 0 !== inv ? "up" : "down"}">${x > 0 ? "+" : "−"}${Math.abs(x).toFixed(dp)}${unit}</span>`;
      }, kg2lb = 2.20462;
      sh.innerHTML = `
        <div class="stat"><span class="k">Power</span><span class="v">${Math.round(n.hp)}<small>hp</small></span><span class="dl">${d(n.hp, base && base.hp, " hp")} @ ${Math.round(n.hpRpm || 0).toLocaleString()} rpm</span></div>
        <div class="stat"><span class="k">Torque</span><span class="v">${Math.round(lbft)}<small>lb-ft</small></span><span class="dl">${d(lbft, base && base.tq * 0.7376, " lb-ft")}</span></div>
        <div class="row2 opt-hide"><div class="stat"><span class="k">Weight</span><span class="v">${Math.round(n.mass * kg2lb).toLocaleString()}<small>lb</small></span><span class="dl">${d(n.mass * kg2lb, base && base.mass * kg2lb, " lb", !0)}</span></div>
        <div class="stat"><span class="k">Clearance</span><span class="v">${(n.clearance / 2.54).toFixed(1)}<small>in</small></span><span class="dl">${d(n.clearance / 2.54, base && base.clearance / 2.54, " in", !1, 1)}</span></div></div>
        <div class="stat"><span class="k">1/8 mile, dirt</span><span class="v" id="sEt">…</span><span class="dl" id="sEt2"></span></div>
        <div class="stat"><span class="k">Looks fast</span><span class="v" style="font-size:20px">${n.looks}</span><span class="meter"><i style="width:${n.looks}%"></i></span></div>
        <div class="stat"><span class="k">Sleeper rating</span><span class="v" style="font-size:20px">${n.sleeper}</span><span class="meter sl"><i style="width:${n.sleeper}%"></i></span><span class="dl">Pays a bonus on every drag win</span></div>
        <div class="acts"><button class="btn" id="rev">Hold to rev</button>${SV.dirt + SV.mud > 0.08 ? `<button class="btn ghost" id="wash">Wash${FREE() ? "" : " · $40"}</button>` : ""}</div>
        <p class="note">${FREE() ? "Free play: every part is yours. Results don't earn money or trophies." : "Parts you buy stay in the shop. Swap back any time for free."}</p>`;
      let rv = $("rev"), on = (v) => (e) => {
        e.preventDefault(), U.revBtn = v;
      };
      rv.onpointerdown = on(1), rv.onpointerup = rv.onpointerleave = rv.onpointercancel = on(0);
      $("wash") && ($("wash").onclick = () => {
        !FREE() && SV.cash < 40 ? U.toast("Not enough cash", "bad") : (FREE() || (SV.cash -= 40), SV.dirt = 0, SV.mud = 0, persist(), U.cash(), U.toast("Washed and dried", "go", 1.4), renderSheet());
      });
      clearTimeout(U.passT), U.passT = setTimeout(() => {
        let r = pass(b), r0 = base ? pass(U.committed) : null, e = $("sEt"), e2 = $("sEt2");
        e && (e.innerHTML = `${r.et.toFixed(2)}<small>s</small>`, e2.innerHTML = `${r0 && Math.abs(r.et - r0.et) > 5e-3 ? `<span class="${r.et < r0.et ? "up" : "down"}">${r.et < r0.et ? "−" : "+"}${Math.abs(r.et - r0.et).toFixed(2)} s</span> · ` : ""}${(r.trap * 2.237).toFixed(0)} mph trap · 0–60 in ${r.t60.toFixed(1)} s`);
      }, 60);
    }
    U.renderSheet = renderSheet;
    $("buyGo").onclick = buy, $("buyCancel").onclick = () => {
      revert(), renderSlots(), renderSheet();
    };
    $("gEvents").onclick = () => {
      revert(), openEvents();
    }, $("gRoam").onclick = () => {
      revert(), startEvent("roam");
    }, $("gSettings").onclick = () => {
      revert(), openPause(!0);
    };
    /* the orbit camera in the shop: drag to turn, wheel or pinch to zoom */
    {
      let drag = null, pts = /* @__PURE__ */ new Map();
      canvas.addEventListener("pointerdown", (e) => {
        state !== "garage" && state !== "title" || (pts.set(e.pointerId, [e.clientX, e.clientY]), drag = { x: e.clientX, y: e.clientY }, U.idleT = 0, U.camTo = null, canvas.setPointerCapture(e.pointerId));
      }), canvas.addEventListener("pointermove", (e) => {
        if (!drag || !cam.orbit || !pts.has(e.pointerId)) return;
        let o = cam.orbit;
        if (pts.size === 2) {
          let [a, b] = [...pts.values()], d0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
          pts.set(e.pointerId, [e.clientX, e.clientY]);
          let [c, d] = [...pts.values()], d1 = Math.hypot(c[0] - d[0], c[1] - d[1]);
          o.dist = clamp(o.dist * d0 / Math.max(1, d1), 4.5, 16);
          return;
        }
        pts.set(e.pointerId, [e.clientX, e.clientY]), o.yaw += (e.clientX - drag.x) * 6e-3, o.pitch = clamp(o.pitch + (e.clientY - drag.y) * 4e-3, -0.05, 1.1), drag = { x: e.clientX, y: e.clientY }, U.idleT = 0;
      });
      let up = (e) => {
        pts.delete(e.pointerId), pts.size || (drag = null);
      };
      canvas.addEventListener("pointerup", up), canvas.addEventListener("pointercancel", up), canvas.addEventListener("wheel", (e) => {
        cam.orbit && (state === "garage" || state === "title") && (e.preventDefault(), cam.orbit.dist = clamp(cam.orbit.dist * (1 + e.deltaY * 1e-3), 4.5, 16), U.idleT = 0);
      }, { passive: !1 });
    }
    /* ---------- the race board ---------- */
    function openEvents() {
      let m = $("events"), free = FREE();
      m.innerHTML = "";
      let bd = el("div", "board"), hd = el("div", "hd", `<h2>Race board</h2><span class="money${free ? " freebadge" : ""}">${free ? "Free play" : fmt$(SV.cash)}</span>`), close = el("button", "btn ghost", "Close");
      close.onclick = () => {
        m.hidden = !0;
      }, hd.appendChild(close), bd.appendChild(hd);
      let body = el("div", "bd");
      body.appendChild(el("div", "eyebrow", free ? "Friday night dirt drags · eighth mile · every racer is open" : "Friday night dirt drags · eighth mile · win to unlock the next racer"));
      let lad = el("div", "ladder");
      RIVALS.forEach((rv, i) => {
        let won = SV.wins[rv.id], unlocked = free || i <= SV.drag, c = el("button", "card"), tag = free ? won ? '<span class="pill win">Beaten</span>' : "" : won ? '<span class="pill win">Beaten</span>' : i === SV.drag ? '<span class="pill next">Up next</span>' : unlocked ? "" : '<span class="pill lock">Locked</span>';
        c.disabled = !unlocked, c.innerHTML = `<span class="n">${esc(rv.name)}</span><span class="r">${esc(rv.ride)}</span><span class="b">${esc(unlocked ? rv.blurb : "Beat " + RIVALS[i - 1].name + " to get a lane against this one.")}</span><span class="f">${tag}<span>Runs about <b>${rv.et.toFixed(2)}</b> s</span>${free ? "" : `<span class="money">${fmt$(won ? rv.pay * 0.35 : rv.pay)}</span>`}</span>`, c.onclick = () => {
          m.hidden = !0, startEvent("drag", i);
        }, lad.appendChild(c);
      }), body.appendChild(lad), body.appendChild(el("div", "eyebrow", free ? "Off-road runs · medal times shown for reference" : "Off-road runs · beat the times for medals"));
      let runs = el("div", "ladder");
      for (let [k, r] of Object.entries(RUNS)) {
        let md = SV.medals[k], best = SV.best[k], c = el("button", "card");
        c.innerHTML = `<span class="n">${esc(r.name)}</span><span class="b">${esc(r.blurb)}</span><span class="f">${md && !free ? `<span class="pill m${md}">${MEDALS[md]}</span>` : ""}<span>Gold ${r.medals[2]} s · Silver ${r.medals[1]} · Bronze ${r.medals[0]}</span>${best ? `<span>Best <b>${best.toFixed(2)}</b></span>` : ""}${free ? "" : `<span class="money">up to ${fmt$(r.pay[2])}</span>`}</span>`, c.onclick = () => {
          m.hidden = !0, startEvent(k);
        }, runs.appendChild(c);
      }
      let roam = el("button", "card");
      roam.innerHTML = `<span class="n">Free roam</span><span class="b">Drive the whole ranch. ${COOLERS.length} coolers are hidden out there${free ? "" : ", $250 each"}.</span><span class="f"><span class="pill">${SV.coolers.length}/${COOLERS.length} found</span></span>`, roam.onclick = () => {
        m.hidden = !0, startEvent("roam");
      }, runs.appendChild(roam), body.appendChild(runs);
      if (!free) {
        let n = TROPHIES.filter((t) => SV.trophies[t.id]).length;
        body.appendChild(el("div", "eyebrow", `Trophy case · ${n} of ${TROPHIES.length}`));
        let tc = el("div", "trophies");
        for (let t of TROPHIES) tc.appendChild(el("div", "trophy" + (SV.trophies[t.id] ? " got" : ""), `<b>${esc(t.name)}</b><span>${esc(t.d)}</span>`));
        body.appendChild(tc);
      }
      bd.appendChild(body), m.appendChild(bd), m.hidden = !1, m.onclick = (e) => {
        e.target === m && (m.hidden = !0);
      }, close.focus();
    }
    U.openEvents = openEvents;
    /* ---------- pause and settings ---------- */
    function seg(name, opts, cur, fn) {
      let w = el("div", "set"), s = el("div", "seg");
      w.appendChild(el("span", "k", esc(name)));
      for (let [v, label] of opts) {
        let b = el("button", v === cur ? "on" : "", esc(label));
        b.onclick = () => {
          fn(v), [...s.children].forEach((q) => q.classList.toggle("on", q === b));
        }, s.appendChild(b);
      }
      return w.appendChild(s), w;
    }
    function openPause(fromShop = !1) {
      let m = $("pause");
      m.innerHTML = "";
      let p = el("div", "menu");
      p.appendChild(el("h2", "", fromShop ? "Settings" : "Paused"));
      let acts = el("div", "acts");
      if (fromShop) {
        let b = el("button", "btn go", "Done");
        if (b.onclick = () => {
          m.hidden = !0, state === "title" && ($("title").hidden = !1);
        }, acts.appendChild(b), state === "garage") {
          let tt = el("button", "btn", FREE() ? "Leave free play" : "Back to the title");
          tt.onclick = () => {
            m.hidden = !0, U.revert(), goTitle();
          }, acts.appendChild(tt);
        }
      } else {
        let r = el("button", "btn go", "Resume");
        if (r.onclick = () => pause(!1), acts.appendChild(r), mode && mode.kind !== "roam") {
          let a = el("button", "btn", "Restart");
          a.onclick = () => {
            m.hidden = !0, audio.suspend(!1), startEvent(mode.kind, mode.idx);
          }, acts.appendChild(a);
        }
        let g = el("button", "btn", "Back to the shop");
        g.onclick = () => {
          m.hidden = !0, audio.suspend(!1), enterGarage();
        }, acts.appendChild(g);
        let tt = el("button", "btn ghost", "Title screen");
        tt.onclick = () => {
          m.hidden = !0, audio.suspend(!1), goTitle();
        }, acts.appendChild(tt);
      }
      p.appendChild(acts);
      let S = SV.settings;
      p.appendChild(seg("Assists", [["easy", "Easy"], ["arcade", "Arcade"], ["sport", "Sport"], ["sim", "Sim"]], S.assist, (v) => {
        S.assist = v, truck.setAssists(v), persist();
      })), p.appendChild(seg("Camera", CAMS.map((c, i) => [i, c]), cam.mode, (v) => {
        cam.mode = v, cam.cut = !0, S.cam = v, persist();
      })), p.appendChild(seg("Time of day", RANCH_ENVS.map((id) => [id, ENVS[id].name]), S.env, (v) => {
        S.env = v, persist(), (state === "garage" || state === "title" || mode && mode.kind === "roam") && setEnv(v);
      })), p.appendChild(seg("Speed", [["mph", "mph"], ["kmh", "km/h"]], S.units, (v) => {
        S.units = v, persist();
      })), p.appendChild(seg("Graphics", [["low", "Low"], ["medium", "Medium"], ["high", "High"]], S.quality, (v) => {
        S.quality = v, persist(), U.toast("Reloading with the new setting…", "", 2), setTimeout(() => location.reload(), 500);
      }));
      let vol = el("div", "set");
      vol.innerHTML = `<span class="k">Volume</span><input type="range" id="sVol" min="0" max="1" step="0.05" value="${S.vol}">`, p.appendChild(vol), vol.querySelector("input").oninput = (e) => {
        S.vol = +e.target.value, audio.setVolume(S.vol), persist();
      };
      let av = el("div", "set");
      av.innerHTML = `<span class="k">Ambience</span><input type="range" id="sAmb" min="0" max="1.5" step="0.05" value="${S.amb ?? 1}">`, p.appendChild(av), av.querySelector("input").oninput = (e) => {
        S.amb = +e.target.value, audio.setAmbVolume(S.amb), persist();
      };
      /* a mix from the sound board */
      let mx = el("div", "set mixset"), custom = !!readKey(MIX_KEY);
      mx.innerHTML = `<span class="k">Sound mix</span><div class="mixbox"><p class="mixnow">${custom ? "Using your mix from the sound board." : "Using the default mix."}</p><textarea id="sMixCode" rows="2" placeholder="Paste a mix code from the sound board" spellcheck="false"></textarea><div class="acts"><button class="btn" id="sMixApply">Use this mix</button>${custom ? '<button class="btn ghost" id="sMixReset">Back to the default</button>' : ""}</div></div>`, p.appendChild(mx), mx.querySelector("#sMixApply").onclick = () => {
        let v = mx.querySelector("textarea").value;
        if (!v.trim()) return U.toast("Paste a code first", "bad", 1.8);
        try {
          setMixCode(v), mx.querySelector(".mixnow").textContent = "Using your mix from the sound board.", U.toast("Mix applied", "go", 1.6);
        } catch (e) {
          U.toast(e.message || "That code didn't work", "bad", 2.6);
        }
      }, mx.querySelector("#sMixReset") && (mx.querySelector("#sMixReset").onclick = () => {
        setMixCode(null), mx.querySelector(".mixnow").textContent = "Using the default mix.", U.toast("Default mix", "", 1.4);
      });
      let rs = el("div", "set"), rb = el("button", "btn ghost", FREE() ? "Reset free play" : "Start the campaign over");
      rs.appendChild(el("span", "k", "Save")), rs.appendChild(rb), rb.onclick = () => {
        rb.dataset.arm ? ((() => {
          let gm = SV.gm;
          try {
            localStorage.removeItem(SAVE_KEYS[gm]);
          } catch {
          }
          SV = freshSave(gm), persist(), rebuildTruck(!1), m.hidden = !0, audio.suspend(!1), goTitle(), U.toast(gm === "free" ? "Free play reset" : "Campaign reset", "", 2);
        })()) : (rb.dataset.arm = "1", rb.textContent = FREE() ? "Tap again to reset free play" : "Tap again to erase the campaign");
      }, p.appendChild(rs), p.appendChild(el("p", "keys", "<b>W/↑</b> gas · <b>S/↓</b> brake, hold to reverse · <b>A D</b> steer · <b>Space</b> handbrake · <b>Shift</b> nitrous · <b>L</b> low range · <b>K</b> lockers · <b>F</b> light bar · <b>H</b> horn · <b>C</b> camera · <b>B</b> look back · <b>R</b> flip/reset · <b>T</b> time of day (free roam) · <b>Esc</b> pause")), m.appendChild(p), m.hidden = !1;
    }
    U.openPause = openPause;
    let showPause = U.show;
    U.show = (name) => {
      name === "pause" ? ($("hud").hidden = !0, $("touch").hidden = !0, openPause(!1)) : ($("pause").hidden = !0, $("events").hidden = !0, showPause(name));
    };
    $("hPause").onclick = () => pause(!0), $("hCam").onclick = () => {
      cam.next(), SV.settings.cam = cam.mode;
    }, $("tSettings").onclick = () => openPause(!0);
    /* ---------- HUD ---------- */
    let tach = $("tach"), tg = tach.getContext("2d"), hudState = {};
    function hudBuild() {
      let inds = $("hInds"), b = SV.build;
      inds.innerHTML = "";
      let add2 = (id, label) => {
        let s = el("span", "ind", label);
        s.id = id, inds.appendChild(s);
      };
      b.tcase === "low" && add2("iLow", "LOW"), b.lockers && add2("iLock", "LOCK"), b.lights && add2("iBar", "BAR"), b.nos && add2("iNos", "NOS");
      $("hUnits").textContent = SV.settings.units === "kmh" ? "KM/H" : "MPH";
    }
    function drawTach(pt, e) {
      let W2 = tach.width, H2 = tach.height, cx = W2 / 2, cy = H2 * 0.62, r = H2 * 0.5, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, maxR = e.limiterRpm * 1.06, A = (rpm) => a0 + (a1 - a0) * clamp(rpm / maxR, 0, 1);
      tg.clearRect(0, 0, W2, H2), tg.lineCap = "butt", tg.lineWidth = 16, tg.strokeStyle = "rgba(19,16,12,.72)", tg.beginPath(), tg.arc(cx, cy, r, a0, a1), tg.stroke(), tg.lineWidth = 10, tg.strokeStyle = "rgba(240,230,212,.14)", tg.beginPath(), tg.arc(cx, cy, r, a0, a1), tg.stroke(), tg.strokeStyle = "#ff5440", tg.beginPath(), tg.arc(cx, cy, r, A(e.redline), a1), tg.stroke();
      let rpm = pt.rpm, hot = rpm > (pt.upRpm && pt.upRpm[pt.gear - 1] || e.redline) * 0.97;
      tg.strokeStyle = hot ? "#ffb12e" : "#ff6a1a", tg.beginPath(), tg.arc(cx, cy, r, a0, A(rpm)), tg.stroke(), tg.fillStyle = "rgba(240,230,212,.6)", tg.font = "600 20px 'Barlow Semi Condensed', sans-serif", tg.textAlign = "center";
      let step = e.redline > 9e3 ? 2e3 : 1e3;
      for (let k = 0; k <= maxR; k += step) {
        let a = A(k), x = cx + Math.cos(a) * (r - 30), y = cy + Math.sin(a) * (r - 30);
        tg.fillText(String(k / 1e3), x, y + 7);
      }
      if (e.fiBoost) {
        let bf = clamp(pt.boost / Math.max(0.1, e.fiBoost), 0, 1);
        tg.lineWidth = 6, tg.strokeStyle = "rgba(240,230,212,.14)", tg.beginPath(), tg.arc(cx, cy, r + 16, a0, a0 + 1.4), tg.stroke(), tg.strokeStyle = "#97d36a", tg.beginPath(), tg.arc(cx, cy, r + 16, a0, a0 + 1.4 * bf), tg.stroke();
      }
      if (e.nosKw) tg.lineWidth = 6, tg.strokeStyle = "rgba(240,230,212,.14)", tg.beginPath(), tg.arc(cx, cy, r + 16, a1 - 1.4, a1), tg.stroke(), tg.strokeStyle = pt.nosOn ? "#7fd8ff" : "#4f8fb8", tg.beginPath(), tg.arc(cx, cy, r + 16, a1 - 1.4 * pt.nos, a1), tg.stroke();
    }
    let setT = (id, v) => {
      let e = $(id);
      e && e.textContent !== v && (e.textContent = v);
    }, setH = (id, v) => {
      let e = $(id);
      e && hudState[id] !== v && (hudState[id] = v, e.innerHTML = v);
    }, arrowSvg = (deg) => `<svg class="arrow" viewBox="0 0 20 20" style="transform:rotate(${deg.toFixed(0)}deg)"><path d="M10 1 L17 17 L10 13 L3 17 Z" fill="#ff6a1a"/></svg>`;
    function bearing(x, z) {
      let c = U.lastCam;
      if (!c) return 0;
      let f = norm2([c.fwd[0], 0, c.fwd[2]]), d = norm2([x - c.pos[0], 0, z - c.pos[2]]);
      return Math.atan2(f[0] * d[2] - f[2] * d[0], f[0] * d[0] + f[2] * d[2]) * 180 / Math.PI;
    }
    function hudFrame() {
      let pt = truck.pt, e = pt.e, kmh = SV.settings.units === "kmh", sp = Math.abs(truck.vf) * (kmh ? 3.6 : 2.237);
      setT("hSpd", String(Math.round(sp))), setT("hGear", truck.rev ? "R" : pt.gear + (truck.low ? " · LOW" : "")), drawTach(pt, e);
      let tog = (id, on) => {
        let q = $(id);
        q && q.classList.toggle("on", !!on);
      };
      tog("iLow", truck.low), tog("iLock", truck.locked), tog("iBar", lightsOn), tog("iNos", pt.nosOn);
      let ev = $("hEvt"), m = mode;
      if (!m) return ev.hidden = !0;
      let html = "";
      if (m.kind === "drag") {
        let rv = m.rv;
        m.phase === "stage" ? html = `<div class="big">${m.staged ? "Staged" : m.pre ? "Pre-staged" : "Roll to the line"}</div><div class="sm">vs ${esc(rv.name)} · hold brake + gas to load up</div>` : m.phase === "tree" ? html = `<div class="big">${m.tree[0] & 28 ? "Ready…" : "Staged"}</div><div class="sm">Let go of the brake on green</div>` : (html = `<div class="big">${m.left ? (m.fin ? m.splits.et : m.t - m.left).toFixed(2) : "GO"}</div><div class="sm">${m.rt !== null && m.rt !== void 0 ? `R/T ${m.rt.toFixed(3)} · ` : ""}${m.fin ? (m.splits.trap * 2.237).toFixed(1) + " mph" : esc(rv.name)}</div>`);
      } else if (m.kind === "trail" || m.kind === "climb") {
        let g = m.gates[m.next] || m.gates[0], dist = g ? Math.hypot(g.x - truck.p[0], g.z - truck.p[2]) : 0, tt = m.started ? m.t + (m.missed + m.resets) * 5 : 0, tot = m.kind === "trail" ? m.gates.length : 1, cur = m.kind === "trail" ? Math.min(m.next, tot) : 0;
        html = `<div class="big">${m.done ? m.result.time ? m.result.time.toFixed(2) : "DNF" : tt.toFixed(1)}</div><div class="sm">${arrowSvg(bearing(g.x, g.z))}${m.started ? m.kind === "trail" ? `Gate ${cur}/${tot}` : "To the summit" : "To the start gate"} · ${Math.round(dist)} m</div>`;
      } else if (m.kind === "bog") html = `<div class="big">${m.started ? m.t.toFixed(1) : "Mud bog"}</div><div class="sm">${m.started ? `${Math.round(m.dist || 0)} of ${Math.round(m.x0 - m.x1)} m` : "Floor it into the pit"}</div>`;
      else if (m.kind === "roam") {
        let best = null;
        COOLERS.forEach((c, i) => {
          if (SV.coolers.includes(i)) return;
          let d = Math.hypot(c[0] - truck.p[0], c[1] - truck.p[2]);
          (!best || d < best.d) && (best = { d, c });
        }), html = best ? `<div class="sm">${arrowSvg(bearing(best.c[0], best.c[1]))}Nearest cooler ${Math.round(best.d)} m · ${SV.coolers.length}/${COOLERS.length} found</div>` : `<div class="sm">All ${COOLERS.length} coolers found</div>`;
      }
      setH("hEvt", html), ev.hidden = !html;
    }
    /* ---------- the result ---------- */
    U.result = (res) => {
      let m = $("result");
      m.innerHTML = "";
      let wrap = el("div", "res"), side = el("div", "side"), acts = el("div", "acts"), btn = (label, cls, fn) => {
        let b = el("button", "btn " + cls, label);
        return b.onclick = fn, acts.appendChild(b), b;
      };
      acts.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
      if (res.kind === "drag") {
        let rv = res.rival, d = new Date(), tm = (t) => t > 0 ? t.toFixed(3) : "-.---", slip = el("div", "slip");
        slip.innerHTML = `<h3>RANCH DRAGWAY</h3><div class="c">1/8 MILE · DIRT · ${d.toLocaleDateString("en-US")}</div><hr>
          <table><tr><td></td><td>LEFT</td><td>RIGHT</td></tr>
          <tr><td>R/T</td><td>${res.foul && res.rt < 0 ? "RED" : tm(res.rt)}</td><td>${tm(res.rRt)}</td></tr>
          <tr><td>60'</td><td>${tm(res.t60)}</td><td>${tm(res.r60)}</td></tr>
          <tr><td>330'</td><td>${tm(res.t330)}</td><td>${tm(res.r330)}</td></tr>
          <tr><td>1/8 ET</td><td>${tm(res.et)}</td><td>${tm(res.rEt)}</td></tr>
          <tr><td>MPH</td><td>${res.trap ? (res.trap * 2.237).toFixed(2) : "-"}</td><td>${(res.rTrap * 2.237).toFixed(2)}</td></tr></table><hr>
          <div class="c">${esc(SV.build.number ? "#" + SV.build.number + " " : "")}YOU vs ${esc(rv.name.toUpperCase())}</div><div class="w">${res.win ? "WIN" : res.foul ? "FOUL" : "LOSS"}${res.margin && !res.foul ? ` BY ${Math.abs(res.margin).toFixed(3)}` : ""}</div>`, wrap.appendChild(slip), side.innerHTML = `<h2>${res.win ? "You took the win" : res.foul ? "Red light" : rv.name + " got you"}</h2>`;
        let lines = [];
        res.free ? lines.push(["Sleeper rating", nums.sleeper + "%"]) : (res.win && lines.push(["Purse", fmt$(res.pay - (res.sleeperBonus || 0))]), res.sleeperBonus && lines.push([`Sleeper bonus (${nums.sleeper}%)`, fmt$(res.sleeperBonus)]), lines.push(["Cash", fmt$(SV.cash)])), SV.best.et && lines.push(["Best ET", SV.best.et.toFixed(3) + " s"]);
        for (let [k, v] of lines) side.appendChild(el("div", "line", `<span>${esc(k)}</span><b>${v}</b>`));
        res.unlocked && side.appendChild(el("p", "", `Next up: <b>${esc(res.unlocked.name)}</b>, ${esc(res.unlocked.ride.toLowerCase())}.`)), !res.win && side.appendChild(el("p", "", res.foul ? "You left before the green. Wait for it: the three ambers light, then green." : `Their package was ${(res.rRt + res.rEt).toFixed(3)} s. Hold brake + gas at the line, let go on green, and keep it straight.`)), btn("Run it back", "", () => startEvent("drag", mode.idx)), res.unlocked && btn("Race " + res.unlocked.name, "go", () => startEvent("drag", mode.idx + 1)), btn("Shop", res.unlocked ? "" : "go", () => enterGarage());
      } else {
        let r = RUNS[res.kind], md = res.medal || 0;
        side.innerHTML = `<div style="display:flex;gap:14px;align-items:center"><div class="medal m${md}">${md ? MEDALS[md] : res.dnf ? "DNF" : "—"}</div><h2>${esc(r.name)}</h2></div>`;
        let lines = res.dnf ? [["Result", res.dnf]] : [["Time", res.time.toFixed(2) + " s" + (res.record ? " · best" : "")], ...res.missed ? [["Missed gates", "+" + res.missed * 5 + " s"]] : [], ...res.resets ? [["Resets", "+" + res.resets * 5 + " s"]] : []];
        lines.push(["Gold · Silver · Bronze", r.medals.slice().reverse().join(" · ") + " s"]), res.free || lines.push(["Paid", fmt$(res.pay)], ["Cash", fmt$(SV.cash)]);
        for (let [k, v] of lines) side.appendChild(el("div", "line", `<span>${esc(k)}</span><b>${esc(v)}</b>`));
        btn("Try again", "go", () => startEvent(res.kind)), btn("Shop", "", () => enterGarage());
      }
      res.free && side.appendChild(el("p", "note", "Free play: results don't earn money or trophies."));
      for (let t of res.trophies || []) side.appendChild(el("div", "trophy got", `<b>Trophy: ${esc(t.name)}</b><span>${esc(t.d)}</span>`));
      side.appendChild(acts), wrap.appendChild(side), m.appendChild(wrap), U.show("result"), U.cash(), acts.querySelector(".go") && acts.querySelector(".go").focus();
    };
    /* ---------- touch ---------- */
    let enableTouch = () => {
      U.touch || (U.touch = !0, document.body.classList.add("touch"), state === "drive" && ($("touch").hidden = !1));
    };
    matchMedia("(pointer: coarse)").matches && enableTouch(), window.addEventListener("touchstart", enableTouch, { passive: !0, once: !0 });
    for (let b of document.querySelectorAll("#touch .tb")) {
      let k = b.dataset.k, on = (e) => {
        e.preventDefault(), input.down.add(k), input.pressed.add(k), b.classList.add("on");
      }, off = (e) => {
        e.preventDefault(), input.down.delete(k), b.classList.remove("on");
      };
      b.addEventListener("pointerdown", on), b.addEventListener("pointerup", off), b.addEventListener("pointercancel", off), b.addEventListener("pointerleave", off), b.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    /* ---------- per frame ---------- */
    U.frame = (dt) => {
      if (state === "garage" || state === "title") {
        let o = cam.orbit;
        if (o) {
          if (U.idleT += dt, U.camTo) {
            let t = U.camTo, k = 1 - Math.exp(-dt * 3), dy = t.yaw - o.yaw;
            for (; dy > Math.PI; ) dy -= TAU;
            for (; dy < -Math.PI; ) dy += TAU;
            o.yaw += dy * k, o.pitch += (t.pitch - o.pitch) * k, o.dist += (t.dist - o.dist) * k, o.y += (t.y - o.y) * k, Math.abs(dy) < 0.01 && Math.abs(t.dist - o.dist) < 0.05 && (U.camTo = null);
          } else U.idleT > 5 && (o.yaw += dt * 0.12);
        }
        garageRev = Math.max(U.revBtn, state === "garage" && input.key("thr") ? 1 : 0);
      } else garageRev = 0;
      state === "drive" && hudFrame();
    };
    return U;
  }
