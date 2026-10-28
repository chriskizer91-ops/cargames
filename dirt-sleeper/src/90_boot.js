  // ===== boot =====
  ui = makeUI(), rebuildTruck(!1), placeTruck(GARAGE.x, GARAGE.z, GARAGE.yaw), truck.pt.st = "off", cam.orbit = { yaw: 2.3, pitch: 0.12, dist: 9.5, y: 0.35, fov: 0.7, cut: !0 }, setEnv(SV.settings.env === "night" ? "night" : "dusk"), state = "title";
  audio.setVolume(SV.settings.vol);
  audio.setMix(MIX);
  window.__game = { R, W, get truck() {
    return truck;
  }, get state() {
    return state;
  }, get mode() {
    return mode;
  }, SV, frame, startEvent, enterGarage, applyBuild, chooseMode, goTitle, audio, get SVnow() {
    return SV;
  }, ui: () => ui, input, setEnv, cam, tWorld, step, placeTruck, PS, BUILDS, presetBuild, goTo, openPicker, startReplay, endReplay, AREAS, get RS() {
    return RS;
  }, get REC() {
    return REC;
  }, get replay() {
    return replay;
  }, get time() {
    return time;
  } };
  var bootMsg = $("boot").querySelector("div");
  R.G.warmup((d, n) => {
    bootMsg.innerHTML = `<b>DIRT SLEEPER</b><br>warming up the shaders ${d}/${n}`;
  }).then(() => {
    $("boot").remove(), ui.show("title"), window.__game.ready = !0, Q.has("manual") || requestAnimationFrame((t) => {
      last = t, requestAnimationFrame(loop);
    });
  }).catch((e) => {
    bootMsg.textContent = "Could not start the renderer: " + e.message, console.error(e);
  });
})();
</script>
