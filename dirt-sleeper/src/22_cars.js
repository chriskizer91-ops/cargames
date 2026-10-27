  // src/game/cars.js
  var CHASSIS = {
    sl3: {
      name: "SL-3 Fastback",
      mass: 1420,
      wb: 2.64,
      wf: 0.5,
      hcg: 0.48,
      trackF: 1.6,
      trackR: 1.62,
      R: 0.335,
      Iw: 1.3,
      rcH: 0.1,
      susp: { rest: 0.3, travel: 0.12, kF: 56e3, kR: 6e4, cbF: 3800, crF: 5400, cbR: 4e3, crR: 5800, arbF: 3e4, arbR: 15e3 },
      body: { L: 4.55, W: 1.9, H: 1.28 },
      tyre: { mu: 1.18, kPk: 0.11, aPk: 0.14, slide: 0.8, slideW: 0.6, loadSens: 0.12 },
      brake: 5800,
      bias: 0.66,
      hbTorque: 3400,
      lock: 0.58,
      cdA: 0.66,
      clF: 0.28,
      clR: 0.42,
      diff: { pre: 40, acc: 0.35, dec: 0.15 }
    }
  }, ENGINE_CHOICES = ["six", "flatplane", "muscle", "v10", "v12", "screamer", "boxer", "five", "rotary3", "v6tt", "blown", "gp"];
  function carSpec(presetId) {
    let p = SIM.PRESETS.find((q) => q.id === presetId) || SIM.PRESETS.find((q) => q.id === "six");
    return SIM.makeSpec(Object.assign({}, p, { mass: CHASSIS.sl3.mass }));
  }

