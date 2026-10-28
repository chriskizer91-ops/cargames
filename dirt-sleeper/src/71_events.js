  // ===== game/events.js =====
  /* The ladder of dirt-drag rivals, the timed off-road runs, and the cash coolers hidden around the ranch. */
  var RIVALS = [
    { id: "gary", name: "Gary", ride: "Farm truck", blurb: "Hauls feed all week, races on Fridays. Lifts off at half-track to check his mirrors.", type: "truck", paint: "tan", look: { tread: "at", tireR: 0.42, tireW: 0.285, trackF: 1.6, trackR: 1.6, wheel: "steelie", rim: 17, front: "bullbar", roof: "basket" }, style: { chrome: 0, livery: 0 }, dirt: 0.7, et: 11.3, rt: [0.22, 0.48], pay: 800 },
    { id: "kyle", name: "Kyle", ride: "Weekend fastback", blurb: "Bought it with his tax refund. Will tell you about the intake.", type: "car", paint: "silver", et: 10.6, rt: [0.16, 0.36], pay: 1200 },
    { id: "dani", name: "Dani", ride: "Lifted mud rig", blurb: "Wins every mud bog in the county. Swears the drag strip is easier.", type: "truck", paint: "purple", look: { lift: 0.1, tread: "mud", tireR: 0.445, tireW: 0.315, trackF: 1.64, trackR: 1.64, wheel: "beadlock", rim: 17, flares: 1, lightbar: 1, sides: "sliders" }, style: { chrome: 0, livery: 2, livCol: [0.9, 0.7, 0.05], face: 2, tail: 1 }, dirt: 0.5, mud: 0.6, et: 10.0, rt: [0.12, 0.3], pay: 1800 },
    { id: "prof", name: "The Professor", ride: "Midnight fastback", blurb: "Teaches physics at the community college. Has done the maths on you.", type: "car", paint: "midnight", et: 9.45, rt: [0.08, 0.24], pay: 2600 },
    { id: "nate", name: "Nitro Nate", ride: "Orange fastback, bottle fed", blurb: "Hits the button before the tree finishes. Usually gets away with it.", type: "car", paint: "orange", et: 8.9, rt: [0.05, 0.2], pay: 3600 },
    { id: "earl", name: "Big Earl", ride: "Diesel on swampers", blurb: "Twelve thousand pounds of black smoke and bad attitude.", type: "truck", paint: "black", look: { lift: 0.16, tread: "swamper", tireR: 0.508, tireW: 0.36, trackF: 1.74, trackR: 1.74, wheel: "steelie", rim: 17, flares: 2, stacks: 1, hood: "cowl", front: "winch", roof: "basket", lightbar: 1 }, style: { chrome: 0, livery: 0, face: 2 }, dirt: 0.4, et: 8.3, rt: [0.05, 0.18], pay: 5000, diesel: !0 },
    { id: "ghost", name: "The Ghost", ride: "Unmarked black fastback", blurb: "Nobody knows who builds it. Nobody has beaten it on dirt.", type: "car", paint: "black", et: 7.75, rt: [0.02, 0.12], pay: 8000 }
  ];
  var RUNS = {
    trail: { name: "Ridge Loop", kind: "trail", blurb: "One lap of the hill trail. Hit every flag gate, splash the creek, jump the kickers.", medals: [100, 82, 68], pay: [600, 1000, 1600], env: "afternoon" },
    climb: { name: "Red Hill Climb", kind: "climb", blurb: "Switchbacks, rocks and a 26-degree pitch to the summit flags.", medals: [60, 46, 36], pay: [700, 1200, 1900], env: "dusk" },
    bog: { name: "Mud Bog", kind: "bog", blurb: "Sixty metres of axle-deep mud. Keep your foot in it.", medals: [20, 10, 6], pay: [500, 900, 1500], env: "overcast" }
  };
  var MEDALS = ["", "Bronze", "Silver", "Gold"];
  /* the eighth-mile trace of a launch, scaled in time to hit a target ET */
  function dragTrace(b) {
    let v = makeTruck(b, new FlatWorld("strip")), dt = 1 / 240, out = [0], t = 0, x0;
    v.place([0, 0, 0], 0), v.pt.st = "run", v.pt.we = v.pt.e.idle * TAU / 60;
    for (let i = 0; i < 480; i++) v.step(dt, { thr: 0, brk: 0, steer: 0 });
    for (let i = 0; i < 240; i++) v.step(dt, { thr: 1, brk: 1, steer: 0 });
    x0 = v.p[0];
    for (let i = 1; t < 30 && out[out.length - 1] < 320; i++) v.step(dt, { thr: 1, brk: 0, steer: 0, nos: !0 }), t += dt, i % 4 === 0 && out.push(v.p[0] - x0);
    let et = 0;
    for (let i = 1; i < out.length; i++) if (out[i] >= 201.168) {
      et = (i - 1 + (201.168 - out[i - 1]) / (out[i] - out[i - 1])) / 60;
      break;
    }
    return { x: out, et, hz: 60 };
  }
  var _refTrace = null;
  function rivalRun(rv) {
    _refTrace || (_refTrace = dragTrace(STOCK_BUILD));
    let T2 = _refTrace, k = T2.et / rv.et, rt = rv.rt[0] + Math.random() * (rv.rt[1] - rv.rt[0]), etJ = rv.et * (1 + (Math.random() - 0.5) * 0.03);
    k = T2.et / etJ;
    return {
      rv, rt, et: etJ,
      /* distance past the start beam t seconds after it left */
      x: (t) => {
        if (t <= 0) return 0;
        let f = t * k * T2.hz, i = Math.floor(f);
        if (i >= T2.x.length - 1) {
          let n = T2.x.length - 1, v = (T2.x[n] - T2.x[n - 1]) * T2.hz;
          return T2.x[n] + v * (f - n) / T2.hz;
        }
        return T2.x[i] + (T2.x[i + 1] - T2.x[i]) * (f - i);
      },
      v: function(t) {
        return (this.x(t + 0.02) - this.x(t)) / 0.02;
      },
      tAt: function(d) {
        let t = 0;
        for (; t < 40 && this.x(t) < d; ) t += 4e-3;
        return t;
      }
    };
  }
  /* cash coolers: x, z and a hint */
  var COOLERS = [
    [306, 30, "Behind the hay at the end of the strip"], [92, 57, "Under the grandstand"], [236, -258, "The summit of Red Hill"], [-112, 2, "In the middle of the mud pit"],
    [-12, -40, "Behind the shop"], [-200, -110, "Where the trail crosses the creek"], [-330, 320, "The far creek bend"], [326, -112, "The north-east flats"],
    [-292, -250, "The north-west woods"], [286, 286, "The south-east pasture"], [214, -150, "Halfway up the climb"], [-60, 200, "The south field"]
  ];
  /* the campaign's trophy case */
  var TROPHIES = [
    { id: "first", name: "First Light", d: "Win your first dirt drag." },
    { id: "ladder", name: "Clean Sweep", d: "Beat every racer on the board." },
    { id: "ghost", name: "King of the Dirt", d: "Beat The Ghost." },
    { id: "unseen", name: "Nobody Saw It Coming", d: "Beat The Ghost with Looks Fast under 15." },
    { id: "sleeper", name: "Sleeper Agent", d: "Win a drag with a sleeper rating of 40 or more." },
    { id: "rt", name: "Perfect Light", d: "Cut a reaction time under 0.050 s without fouling." },
    { id: "seven", name: "Seven-Second Club", d: "Run a 7-second eighth mile on dirt." },
    { id: "diesel", name: "Rolling Coal", d: "Win a drag with the diesel swap." },
    { id: "trail", name: "Ridge Runner", d: "Gold on the Ridge Loop." },
    { id: "climb", name: "Mountain Goat", d: "Gold on the Red Hill Climb." },
    { id: "bog", name: "Swamp Thing", d: "Gold in the Mud Bog." },
    { id: "allgold", name: "Triple Gold", d: "Gold on all three off-road runs." },
    { id: "coolers", name: "Treasure Hunter", d: "Find all 12 cash coolers." },
    { id: "air", name: "Frequent Flyer", d: "Keep all four tyres off the ground for 1.5 seconds." },
    { id: "mud", name: "Mud Monster", d: "Get the truck completely caked in mud." },
    { id: "spender", name: "Parts Junkie", d: "Spend $40,000 at the shop." }
  ];
