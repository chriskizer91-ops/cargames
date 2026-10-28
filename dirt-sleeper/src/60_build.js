  // ===== game/build.js =====
  /* Everything you can bolt on, swap or paint, and how a build becomes an engine spec, a chassis,
     a look and a paint job. Prices are in dollars; mass in kg; "loud" is how much a part gives
     the game away to anyone looking (the sleeper meter counts it). */
  /* paint colours for the truck. The first is the factory colour of the one in the driveway */
  var SUV_PAINTS = {
    bronze: { name: "Bronze-Grey Metallic", col: [0.2, 0.17, 0.135], metal: 0.75, rough: 0.3, flake: 0.85, price: 0 },
    black: { name: "Midnight Black", col: [0.008, 0.008, 0.009], metal: 0.4, rough: 0.22, flake: 0.6, price: 900 },
    pearl: { name: "Pearl White", col: [0.78, 0.77, 0.74], metal: 0.15, rough: 0.22, flake: 0.5, price: 1100 },
    silver: { name: "Liquid Silver", col: [0.55, 0.56, 0.57], metal: 1, rough: 0.28, flake: 0.6, price: 900 },
    candy: { name: "Candy Apple Red", col: [0.42, 0.012, 0.012], metal: 0.8, rough: 0.2, flake: 1, price: 1800 },
    orange: { name: "Safety Orange", col: [0.85, 0.22, 0.02], metal: 0.1, rough: 0.28, flake: 0.2, price: 1200 },
    lime: { name: "Toxic Lime", col: [0.32, 0.6, 0.02], metal: 0.5, rough: 0.25, flake: 0.8, price: 1500 },
    sky: { name: "Baja Blue", col: [0.04, 0.2, 0.5], metal: 0.6, rough: 0.26, flake: 0.8, price: 1200 },
    tan: { name: "Desert Tan", col: [0.42, 0.33, 0.21], metal: 0, rough: 0.45, flake: 0, price: 800 },
    olive: { name: "Field Green", col: [0.09, 0.11, 0.055], metal: 0, rough: 0.5, flake: 0, price: 800 },
    matte: { name: "Matte Black", col: [0.012, 0.012, 0.013], metal: 0, rough: 0.6, flake: 0, price: 1400 },
    primer: { name: "Grey Primer", col: [0.2, 0.2, 0.2], metal: 0, rough: 0.75, flake: 0, price: 300 },
    purple: { name: "Grape Soda", col: [0.16, 0.02, 0.3], metal: 0.8, rough: 0.22, flake: 1, price: 1600 }
  };
  var TYRES = {
    street32: { R: 0.375, w: 0.245, tread: "street", track: 1.56, mass: 0, kPk: 0.11, aPk: 0.14, slide: 0.8, slideW: 0.6, If: 1 },
    at33: { R: 0.42, w: 0.285, tread: "at", track: 1.6, mass: 20, kPk: 0.13, aPk: 0.16, slide: 0.82, slideW: 0.7, If: 1 },
    mt35: { R: 0.445, w: 0.315, tread: "mud", track: 1.64, mass: 45, kPk: 0.15, aPk: 0.18, slide: 0.85, slideW: 0.8, If: 1.08 },
    mt37: { R: 0.47, w: 0.32, tread: "mud", track: 1.68, mass: 65, kPk: 0.15, aPk: 0.18, slide: 0.85, slideW: 0.8, If: 1.1 },
    sw40: { R: 0.508, w: 0.36, tread: "swamper", track: 1.74, mass: 100, kPk: 0.17, aPk: 0.2, slide: 0.86, slideW: 0.9, If: 1.15 },
    sw44: { R: 0.56, w: 0.4, tread: "swamper", track: 1.8, mass: 150, kPk: 0.17, aPk: 0.2, slide: 0.86, slideW: 0.9, If: 1.15 },
    drag33: { R: 0.42, w: 0.33, tread: "slick", track: 1.58, mass: 10, kPk: 0.1, aPk: 0.12, slide: 0.72, slideW: 0.45, If: 0.9 },
    paddle35: { R: 0.445, w: 0.33, tread: "paddle", track: 1.64, mass: 35, kPk: 0.22, aPk: 0.2, slide: 0.9, slideW: 1.1, If: 1 }
  };
  /* grip per tread and surface, and rolling resistance (fraction of load) */
  var TREAD_MU = {
    street: { concrete: 1, strip: 0.8, dirt: 0.68, trail: 0.64, grass: 0.56, rock: 0.72, mud: 0.3, water: 0.4 },
    at: { concrete: 0.97, strip: 0.86, dirt: 0.8, trail: 0.78, grass: 0.7, rock: 0.88, mud: 0.48, water: 0.48 },
    mud: { concrete: 0.9, strip: 0.88, dirt: 0.86, trail: 0.86, grass: 0.8, rock: 0.9, mud: 0.68, water: 0.56 },
    swamper: { concrete: 0.85, strip: 0.9, dirt: 0.88, trail: 0.9, grass: 0.84, rock: 0.88, mud: 0.82, water: 0.64 },
    paddle: { concrete: 0.6, strip: 1.08, dirt: 0.96, trail: 0.8, grass: 0.78, rock: 0.5, mud: 0.9, water: 0.72 },
    slick: { concrete: 1.25, strip: 0.95, dirt: 0.62, trail: 0.52, grass: 0.45, rock: 0.62, mud: 0.24, water: 0.3 }
  }, SURF_RR = { concrete: 0.012, strip: 0.02, dirt: 0.024, trail: 0.028, grass: 0.034, rock: 0.022, mud: 0.14, water: 0.09 }, TREAD_RR_MUD = { street: 1.25, at: 1, mud: 0.8, swamper: 0.62, paddle: 0.6, slick: 1.35 };
  var ENGINES = {
    v46: { layout: "V8", disp: 4.6, redline: 5800, idle: 650, tq: 407, cP: 0.62, cW: 0.55, cA: 0.65, Ie: 0.2, crackle: 0.12, limiter: "soft" },
    v54: { layout: "V8", disp: 5.4, redline: 6000, idle: 650, tq: 470, cP: 0.62, cW: 0.55, cA: 0.65, Ie: 0.22, crackle: 0.15, limiter: "soft" },
    v62: { layout: "V8", disp: 6.2, redline: 6600, idle: 700, tq: 545, cP: 0.64, cW: 0.52, cA: 0.62, Ie: 0.24, crackle: 0.3, limiter: "hard" },
    bb74: { layout: "V8", disp: 7.4, redline: 6300, idle: 750, tq: 660, cP: 0.6, cW: 0.52, cA: 0.62, Ie: 0.3, crackle: 0.4, limiter: "hard" },
    tt35: { layout: "V6", disp: 3.5, redline: 6800, idle: 750, tq: 330, cP: 0.6, cW: 0.5, cA: 0.55, Ie: 0.15, fi: "twin", boost: 1.1, tsize: 1, bov: "valve", crackle: 0.4, limiter: "hard" },
    d67: { layout: "I6", disp: 6.7, redline: 3400, idle: 700, tq: 690, cP: 0.48, cW: 0.5, cA: 0.55, Ie: 0.45, fi: "turbo", boost: 1.5, tsize: 2, bov: "none", diesel: 1, mech: 1, mechTone: 2700, crackle: 0, limiter: "soft", gain: 1.2 }
  };
  var isDiesel = (b) => b.engine === "d67";
  /* the catalogue, by slot. req(b) returns a reason the part can't go on, or null */
  var SLOTS = [
    { id: "engine", cat: "engine", name: "Engine", opts: [
      { v: "v46", n: "4.6 L V8", d: "The factory three-valve V8. Smooth, quiet, nobody looks twice.", price: 0 },
      { v: "v54", n: "5.4 L V8", d: "Same family, more stroke. A junkyard swap that idles exactly like stock.", price: 3500, mass: 25 },
      { v: "v62", n: "6.2 L V8", d: "Big-bore V8 with a hungry top end.", price: 7500, mass: 35, loud: 2 },
      { v: "bb74", n: "7.4 L big-block", d: "Cast-iron torque. Wakes the neighbours.", price: 11500, mass: 95, loud: 4 },
      { v: "tt35", n: "3.5 L twin-turbo V6", d: "Lighter than stock, makes power in a hurry. The turbos hide under the cover.", price: 9500, mass: -30 },
      { v: "d67", n: "6.7 L turbo-diesel six", d: "A tow-rig straight six. Enormous torque, a 3,400 rpm redline and a cloud of black smoke. Wants a tune, compounds and short gears to be quick.", price: 14000, mass: 260, loud: 6 }
    ] },
    { id: "power", cat: "engine", name: "Power adder", opts: [
      { v: "none", n: "None", d: "Breathing on its own.", price: 0 },
      { v: "cent", n: "Centrifugal supercharger", d: "Belt-driven, hides behind the radiator. Boost climbs with rpm.", price: 5200, mass: 18, req: (b) => b.engine === "tt35" || isDiesel(b) ? "Not for this engine" : null },
      { v: "roots", n: "Roots blower", d: "Sticks out of the hood. Instant boost and that whine.", price: 8800, mass: 40, loud: 30, req: (b) => b.engine === "tt35" || isDiesel(b) ? "Not for this engine" : null },
      { v: "twin", n: "Twin turbos", d: "Two snails tucked by the frame rails. Lag, then a shove.", price: 10500, mass: 30, req: (b) => b.engine === "tt35" || isDiesel(b) ? "Not for this engine" : null },
      { v: "bigturbo", n: "Bigger turbos", d: "Larger compressors for the V6, more boost up top.", price: 4800, mass: 6, req: (b) => b.engine !== "tt35" ? "Needs the twin-turbo V6" : null },
      { v: "compound", n: "Compound turbos", d: "A second, bigger turbo feeding the first. Diesel only.", price: 6500, mass: 28, loud: 4, req: (b) => isDiesel(b) ? null : "Needs the diesel" }
    ] },
    { id: "nos", cat: "engine", name: "Nitrous", opts: [
      { v: 0, n: "None", d: "No bottle.", price: 0 },
      { v: 1, n: "35-shot", d: "A small kit. Bottle hides under the rear seat.", price: 800, mass: 12 },
      { v: 2, n: "75-shot", d: "Enough to embarrass someone.", price: 1500, mass: 14 },
      { v: 3, n: "125-shot", d: "Wet kit, purge valve.", price: 2400, mass: 16 },
      { v: 4, n: "250-shot", d: "Two bottles. Fill up before every pass.", price: 4200, mass: 26 }
    ] },
    { id: "intake", cat: "engine", name: "Intake", opts: [
      { v: 0, n: "Factory airbox", d: "Quiet and filtered.", price: 0 },
      { v: 1, n: "Cold-air intake", d: "Pulls air from the fender. A little more power, a lot more induction noise.", price: 450 },
      { v: 2, n: "Ram-air", d: "Fed from the front. Best with a cowl or scoop hood.", price: 1100 }
    ] },
    { id: "exhaust", cat: "engine", name: "Exhaust", opts: [
      { v: "stock", n: "Factory muffler", d: "Single tip, whisper quiet.", price: 0 },
      { v: "catback", n: "Cat-back duals", d: "Dual tips out the back, deeper note.", price: 750, loud: 3 },
      { v: "headers", n: "Long-tube headers", d: "Duals plus headers. Free power, more bark.", price: 1650, loud: 6 },
      { v: "straight", n: "Straight pipes", d: "No mufflers at all.", price: 550, loud: 12 },
      { v: "side", n: "Side dumps", d: "Exits behind the front doors. You will hear it in the cabin.", price: 700, loud: 14 },
      { v: "stacks", n: "Twin stacks", d: "Pipes up behind the rear doors, past the roof.", price: 1900, mass: 22, loud: 22 }
    ] },
    { id: "cam", cat: "engine", name: "Camshaft", opts: [
      { v: 0, n: "Factory", d: "Smooth idle.", price: 0 },
      { v: 1, n: "Street cam", d: "A touch of lope, more top end.", price: 700, req: (b) => isDiesel(b) || b.engine === "tt35" ? "Not for this engine" : null },
      { v: 2, n: "Race cam", d: "Choppy idle, pulls hard past 4,000.", price: 1500, loud: 4, req: (b) => isDiesel(b) || b.engine === "tt35" ? "Not for this engine" : null },
      { v: 3, n: "Wild cam", d: "Lumpy, loud at idle, gives you away in any parking lot.", price: 2300, loud: 10, req: (b) => isDiesel(b) || b.engine === "tt35" ? "Not for this engine" : null }
    ] },
    { id: "tune", cat: "engine", name: "Engine tune", opts: [
      { v: 0, n: "Factory", d: "Conservative timing.", price: 0 },
      { v: 1, n: "Street tune", d: "More timing and a higher rev limit.", price: 500 },
      { v: 2, n: "Race tune", d: "Hard limiter, pops on lift-off. On the diesel: more fuel, more smoke.", price: 1300, loud: 2 }
    ] },
    { id: "trans", cat: "drive", name: "Transmission", opts: [
      { v: "auto", n: "Factory 6-speed auto", d: "Soft, slow shifts.", price: 0 },
      { v: "built", n: "Built 6-speed", d: "Shift kit and a firmer converter. Shifts twice as fast.", price: 2200, mass: 5 },
      { v: "race4", n: "Race 4-speed with trans-brake", d: "Short gears, snap shifts and a launch rev-hold.", price: 4600, mass: -12 }
    ] },
    { id: "axle", cat: "drive", name: "Axle gears", opts: [
      { v: 3.73, n: "3.73:1", d: "Factory. Fine for 32-inch tyres.", price: 0 },
      { v: 4.1, n: "4.10:1", d: "A little shorter.", price: 700 },
      { v: 4.56, n: "4.56:1", d: "The usual regear for 35s.", price: 900 },
      { v: 4.88, n: "4.88:1", d: "For 37s and up.", price: 1000 },
      { v: 5.38, n: "5.38:1", d: "Geared low for 40s and 44s. Crawls, launches hard, tops out early.", price: 1200 }
    ] },
    { id: "tcase", cat: "drive", name: "Transfer case", opts: [
      { v: "awd", n: "Factory all-wheel drive", d: "Open centre diff, no low range.", price: 0 },
      { v: "low", n: "Two-speed with low range", d: "Adds a 2.64:1 low range and locks the centre in low. Toggle with L.", price: 1700, mass: 18 }
    ] },
    { id: "lockers", cat: "drive", name: "Lockers", opts: [
      { v: 0, n: "Open diffs", d: "One wheel spins, you stop.", price: 0 },
      { v: 1, n: "Rear locker", d: "Both rear wheels turn together. Toggle with K.", price: 1100, mass: 4 },
      { v: 2, n: "Front and rear lockers", d: "All four wheels pull. Toggle with K.", price: 2100, mass: 8 }
    ] },
    { id: "susp", cat: "chassis", name: "Ride height", opts: [
      { v: "lowered", n: "Lowered 2 in.", d: "Drag stance. Stiffer, less travel.", price: 900, lift: -0.045, loud: 6 },
      { v: "stock", n: "Factory height", d: "8 inches of clearance.", price: 0, lift: 0 },
      { v: "level", n: "Leveling kit", d: "Two inches up front. Barely noticeable.", price: 400, lift: 0.045, mass: 6, loud: 1 },
      { v: "lift4", n: "4-inch lift", d: "Room for 35s.", price: 2200, lift: 0.1, mass: 35, loud: 6 },
      { v: "lift6", n: "6-inch long travel", d: "Room for 37s and 40s, soaks up jumps.", price: 5200, lift: 0.16, mass: 70, loud: 12 },
      { v: "lift9", n: "9-inch monster lift", d: "Room for anything.", price: 8800, lift: 0.25, mass: 110, loud: 20 }
    ] },
    { id: "shocks", cat: "chassis", name: "Shocks", opts: [
      { v: "stock", n: "Factory shocks", d: "Comfortable. Fade on whoops.", price: 0 },
      { v: "bypass", n: "Bypass race shocks", d: "Firm on big hits, controlled landings.", price: 2600, mass: 12 },
      { v: "drag", n: "Drag shocks", d: "Lets the front rise and the rear squat on launch.", price: 950 }
    ] },
    { id: "tyre", cat: "wheels", name: "Tyres", opts: [
      { v: "street32", n: "32 in. highway tyres", d: "Factory size. Quiet, slippery on anything loose.", price: 0 },
      { v: "at33", n: "33 in. all-terrain", d: "Good everywhere, great nowhere.", price: 1100, loud: 4 },
      { v: "mt35", n: "35 in. mud-terrain", d: "Big lugs, loud on the road.", price: 1700, loud: 8, req: (b) => liftOf(b) < 0.04 ? "Needs at least a leveling kit" : null },
      { v: "mt37", n: "37 in. mud-terrain", d: "Proper off-road size.", price: 2300, loud: 12, req: (b) => liftOf(b) < 0.09 ? "Needs at least a 4-inch lift" : null },
      { v: "sw40", n: "40 in. swampers", d: "Tall, soft, aggressive. Floats over mud.", price: 3300, loud: 18, req: (b) => liftOf(b) < 0.15 ? "Needs at least the 6-inch lift" : null },
      { v: "sw44", n: "44 in. monster swampers", d: "Over the top.", price: 4800, loud: 24, req: (b) => liftOf(b) < 0.24 ? "Needs the 9-inch lift" : null },
      { v: "drag33", n: "33 in. drag radials", d: "Sticky on a prepped strip, hopeless in mud.", price: 1600, loud: 10, req: (b) => liftOf(b) > 0.11 ? "Too tall a lift for radials" : null },
      { v: "paddle35", n: "35 in. paddle tyres", d: "Scoops for sand and loose dirt. The dirt-drag secret.", price: 2500, loud: 18, req: (b) => liftOf(b) < 0.04 ? "Needs at least a leveling kit" : null }
    ] },
    { id: "wheel", cat: "wheels", name: "Wheels", opts: [
      { v: "stock18", n: "Factory 18 in. alloys", d: "Seven bright spokes.", price: 0, rim: 18, style: "stock" },
      { v: "steelie17", n: "17 in. black steelies", d: "Cheap and unbreakable.", price: 450, rim: 17, style: "steelie", mass: 12, loud: 2 },
      { v: "chrome22", n: "22 in. chrome", d: "Big shiny dubs.", price: 2200, rim: 22, style: "chrome", mass: 28, loud: 8, req: (b) => TYRES[b.tyre].R - 0.2794 < 0.07 ? "Tyre sidewall too short" : null },
      { v: "beadlock17", n: "17 in. beadlocks", d: "Bolted rings hold the tyre at low pressure.", price: 1500, rim: 17, style: "beadlock", mass: 20, loud: 6 },
      { v: "weld15", n: "15 in. drag wheels", d: "Skinny-spoke lightweights.", price: 1250, rim: 15, style: "weld", mass: -18, loud: 10 },
      { v: "gold17", n: "17 in. gold mesh", d: "Rally style.", price: 950, rim: 17, style: "gold", mass: 4, loud: 8 }
    ] },
    { id: "front", cat: "body", name: "Front bumper", opts: [
      { v: "stock", n: "Factory", d: "Body coloured.", price: 0 },
      { v: "bullbar", n: "Bull bar", d: "Polished hoop over the grille.", price: 450, mass: 15, loud: 3 },
      { v: "prerunner", n: "Prerunner tube bumper", d: "Light, strong, desert style.", price: 1400, mass: 22, loud: 8 },
      { v: "winch", n: "Winch bumper", d: "Plate steel, hooks and a 12,000 lb winch.", price: 1900, mass: 55, loud: 6 }
    ] },
    { id: "rear", cat: "body", name: "Rear", opts: [
      { v: "stock", n: "Factory", d: "Body coloured.", price: 0 },
      { v: "tube", n: "Tube bumper and swing-out spare", d: "Carries a full-size spare.", price: 1300, mass: 45, loud: 6 },
      { v: "chute", n: "Drag parachute", d: "Pops after the finish line. Mostly for show.", price: 650, mass: 8, loud: 14 },
      { v: "wheelie", n: "Wheelie bars", d: "Stops the nose climbing on launch, so you can lean on it harder.", price: 1150, mass: 18, loud: 18 }
    ] },
    { id: "roof", cat: "body", name: "Roof", opts: [
      { v: "rails", n: "Factory rails", d: "With crossbars.", price: 0 },
      { v: "none", n: "Shaved roof", d: "Rails off. Slicker.", price: 150, mass: -8 },
      { v: "basket", n: "Roof basket", d: "Steel tube rack.", price: 700, mass: 24, loud: 4 },
      { v: "basketSpare", n: "Basket with spare and cans", d: "The expedition look.", price: 1050, mass: 58, loud: 5 }
    ] },
    { id: "hood", cat: "body", name: "Hood", opts: [
      { v: "stock", n: "Factory hood", d: "Flat and quiet.", price: 0 },
      { v: "cowl", n: "Cowl hood", d: "A raised centre section.", price: 900, mass: -4, loud: 10 },
      { v: "scoop", n: "Scoop hood", d: "Open scoop over the intake.", price: 1150, mass: -2, loud: 12 },
      { v: "stacks", n: "Hood stacks", d: "Two chrome pipes through the hood.", price: 1300, mass: 10, loud: 16 }
    ] },
    { id: "lights", cat: "body", name: "Lights", opts: [
      { v: 0, n: "Factory lamps", d: "Just the headlights.", price: 0 },
      { v: 1, n: "Roof light bar", d: "Forty inches of LEDs. Toggle with F.", price: 550, mass: 6, loud: 5 },
      { v: 2, n: "Light bar and ditch lights", d: "Adds pods at the windshield corners.", price: 800, mass: 9, loud: 8 },
      { v: 3, n: "Full lighting", d: "Bar, ditch lights and bumper pods.", price: 1100, mass: 12, loud: 10 }
    ] },
    { id: "sides", cat: "body", name: "Sides", opts: [
      { v: "boards", n: "Factory running boards", d: "A step up into the cab.", price: 0 },
      { v: "sliders", n: "Rock sliders", d: "Tube steel that protects the rockers.", price: 850, mass: 20, loud: 4 },
      { v: "none", n: "Bare rockers", d: "Boards off for clearance.", price: 100, mass: -14, loud: 1 }
    ] },
    { id: "flares", cat: "body", name: "Fender flares", opts: [
      { v: 0, n: "Factory arches", d: "Trimmed as needed for tyres.", price: 0 },
      { v: 1, n: "Pocket flares", d: "Covers the extra track width.", price: 450, mass: 6, loud: 5 },
      { v: 2, n: "Wide flares", d: "Big boxy flares with bolts.", price: 900, mass: 10, loud: 9 }
    ] },
    { id: "snorkel", cat: "body", name: "Snorkel", opts: [
      { v: 0, n: "None", d: "The intake breathes behind the grille.", price: 0 },
      { v: 1, n: "Snorkel", d: "Breathes at the roofline, clear of creek spray and dust.", price: 550, mass: 4, loud: 6 }
    ] },
    { id: "spoiler", cat: "body", name: "Roof spoiler", opts: [
      { v: 0, n: "None", d: "", price: 0 },
      { v: 1, n: "Roof spoiler", d: "A lip over the rear glass.", price: 350, mass: 3, loud: 6 }
    ] },
    { id: "interior", cat: "body", name: "Interior", opts: [
      { v: "stock", n: "Factory leather", d: "Heated seats, third row, the works.", price: 0 },
      { v: "gutted", n: "Gutted", d: "Third row, carpets and spare out. Nobody can tell from outside.", price: 400, mass: -140 }
    ] },
    { id: "paint", cat: "paint", name: "Paint", opts: Object.entries(SUV_PAINTS).map(([v, p]) => ({ v, n: p.name, d: v === "bronze" ? "The colour it came in." : "", price: p.price, loud: { bronze: 0, silver: 1, black: 2, pearl: 2, tan: 3, olive: 4, primer: 2, matte: 8, candy: 10, orange: 10, lime: 14, sky: 8, purple: 12 }[v] || 4 })) },
    { id: "livery", cat: "paint", name: "Graphics", opts: [
      { v: 0, n: "None", d: "Clean paint.", price: 0 },
      { v: 1, n: "Twin stripes", d: "Over the hood, roof and liftgate.", price: 550, loud: 14 },
      { v: 2, n: "Side sweep", d: "One long stripe that kicks up at the back.", price: 400, loud: 10 },
      { v: 3, n: "Desert racer", d: "Number boards and a belt-line band.", price: 650, loud: 16 },
      { v: 4, n: "Flames", d: "Licking back from the nose.", price: 950, loud: 18 },
      { v: 5, n: "Mud camo", d: "Three-tone blotches.", price: 750, loud: 10 }
    ] },
    { id: "livCol", cat: "paint", name: "Graphic colour", opts: [
      { v: "white", n: "White", d: "", price: 0, col: [0.85, 0.85, 0.82] },
      { v: "black", n: "Black", d: "", price: 0, col: [0.015, 0.015, 0.015] },
      { v: "red", n: "Red", d: "", price: 0, col: [0.6, 0.02, 0.02] },
      { v: "orange", n: "Orange", d: "", price: 0, col: [0.9, 0.3, 0.02] },
      { v: "yellow", n: "Yellow", d: "", price: 0, col: [0.9, 0.7, 0.05] },
      { v: "gold", n: "Gold", d: "", price: 0, col: [0.6, 0.42, 0.12] }
    ] },
    { id: "trim", cat: "paint", name: "Trim", opts: [
      { v: "chrome", n: "Chrome", d: "Grille surround, handles, belt line.", price: 0 },
      { v: "black", n: "Blacked out", d: "All the bright bits in gloss black.", price: 350, loud: 3 }
    ] },
    { id: "clad", cat: "paint", name: "Lower body", opts: [
      { v: "body", n: "Body colour", d: "", price: 0 },
      { v: "satin", n: "Two-tone satin", d: "Darker lower panels and bumpers.", price: 300, loud: 2 }
    ] },
    { id: "tint", cat: "paint", name: "Window tint", opts: [
      { v: "stock", n: "Factory privacy glass", d: "", price: 0 },
      { v: "limo", n: "Limo tint", d: "Nobody can see who's driving.", price: 250, loud: 2 }
    ] }
  ], SLOT = Object.fromEntries(SLOTS.map((s) => [s.id, s])), CATS = [["engine", "Engine"], ["drive", "Drivetrain"], ["chassis", "Suspension"], ["wheels", "Wheels & tyres"], ["body", "Body & parts"], ["paint", "Paint"]];
  var STOCK_BUILD = Object.fromEntries(SLOTS.map((s) => [s.id, s.opts.find((o) => !o.price && (s.id !== "susp" || o.v === "stock")).v]));
  STOCK_BUILD.susp = "stock";
  function optOf(b, id) {
    return SLOT[id].opts.find((o) => o.v === b[id]) || SLOT[id].opts[0];
  }
  function liftOf(b) {
    return optOf(b, "susp").lift || 0;
  }
  function buildMass(b) {
    let m = 2150;
    for (let s of SLOTS) m += optOf(b, s.id).mass || 0;
    return m + TYRES[b.tyre].mass;
  }
  function buildLooks(b) {
    let l = 0;
    for (let s of SLOTS) l += optOf(b, s.id).loud || 0;
    return Math.min(100, l);
  }
  /* the engine: base plus the bolt-ons, through the Digital Engine spec builder */
  function buildSpec(b) {
    let base = Object.assign({}, ENGINES[b.engine]), dz = isDiesel(b), k = 1;
    k *= [1, 1.03, 1.05][b.intake], base.intake = dz ? [4, 1, 2][b.intake] : b.intake;
    let ex = b.exhaust;
    base.ex = dz ? { stock: 8, catback: 8, headers: 3, straight: 3, side: 3, stacks: 9 }[ex] : { stock: 0, catback: 1, headers: 2, straight: 3, side: 3, stacks: 9 }[ex], k *= { stock: 1, catback: 1.03, headers: 1.07, straight: 1.06, side: 1.06, stacks: 1.06 }[ex];
    if (!dz && base.layout !== "V6") base.cam = b.cam, k *= [1, 1.03, 1.06, 1.08][b.cam], base.cP += 0.03 * b.cam, base.redline += 150 * b.cam;
    k *= [1, 1.05, 1.1][b.tune], base.redline += [0, 150, 300][b.tune] * (dz ? 0.4 : 1), b.tune === 2 && (base.limiter = dz ? "soft" : "hard", base.crackle = dz ? 0 : Math.max(base.crackle, 0.65));
    dz && (base.boost += [0, 0.3, 0.6][b.tune]);
    let pw = b.power;
    pw === "cent" ? (base.fi = "cent", base.boost = 0.6) : pw === "roots" ? (base.fi = "roots", base.boost = 0.72) : pw === "twin" ? (base.fi = "twin", base.boost = 0.95, base.tsize = 1, base.bov = "flutter") : pw === "bigturbo" ? (base.boost += 0.5, base.tsize = 2) : pw === "compound" && (base.boost += 0.9);
    base.tq = Math.round(base.tq * k), base.nos = b.nos;
    let tr = b.trans, gears = tr === "race4" ? [2.76, 1.57, 1.0, 0.72] : [4.17, 2.34, 1.52, 1.14, 0.87, 0.69];
    tr === "race4" && (base.launch = 1, base.launchRpm = Math.round(base.redline * (dz ? 0.6 : 0.55)));
    let ty = TYRES[b.tyre], e = SIM.makeSpec(Object.assign(base, { machine: dz ? "truck" : "car", mass: buildMass(b), drv: "AWD", R: ty.R, gears, cdA: 1.25, horn: "car" }));
    return e.gears = gears.slice(), e.nG = gears.length, e.fd = b.axle, e.shiftT = tr === "auto" ? 0.42 : tr === "built" ? 0.2 : 0.11, e.R = ty.R, e.peak = e.peak || {}, e;
  }
  /* the chassis for the physics */
  function buildChassis(b) {
    let ty = TYRES[b.tyre], sp = optOf(b, "susp"), lift = sp.lift || 0, m = buildMass(b), R = ty.R, hcg = SUV.hcg0 + lift + (R - SUV.R0), sv = b.susp, kMul = { lowered: 1.3, stock: 1, level: 1, lift4: 0.9, lift6: 0.78, lift9: 0.72 }[sv], arbMul = { lowered: 1.4, stock: 1, level: 1, lift4: 0.75, lift6: 0.5, lift9: 0.4 }[sv], droop = { lowered: 0.06, stock: 0.1, level: 0.1, lift4: 0.12, lift6: 0.18, lift9: 0.24 }[sv], bump = { lowered: 0.06, stock: 0.09, level: 0.09, lift4: 0.12, lift6: 0.18, lift9: 0.22 }[sv], kF = 44e3 * kMul * m / 2150, kR = 48e3 * kMul * m / 2150, c0 = Math.max(m * 9.81 * 0.5 / 2 / kF, m * 9.81 * 0.5 / 2 / kR), sh = b.shocks, damp = sh === "bypass" ? 1.35 : 1, cs = Math.sqrt(kF * m / 4), wm = { weld15: 0.85, beadlock17: 1.15, chrome22: 1.2 }[b.wheel] || 1, rr = Object.assign({}, SURF_RR);
    rr.mud *= TREAD_RR_MUD[ty.tread], rr.water *= TREAD_RR_MUD[ty.tread];
    let low = b.tcase === "low", lk = b.lockers;
    return {
      name: "truck", mass: m, wb: 2.89, wf: 1.44 / 2.89, hcg, trackF: ty.track, trackR: ty.track, R, Iw: 1.6 * Math.pow(R / SUV.R0, 4) * ty.If * wm, rcH: 0.2,
      susp: { rest: c0 + droop, travel: c0 + bump, kF, kR, cbF: cs * 0.55 * damp * (sh === "drag" ? 0.9 : 1), crF: cs * 0.85 * damp * (sh === "drag" ? 0.45 : 1), cbR: cs * 0.55 * damp * (sh === "drag" ? 0.5 : 1), crR: cs * 0.85 * damp, arbF: 24e3 * arbMul, arbR: 14e3 * arbMul },
      body: { L: 4.9, W: 1.9, H: 1.86 },
      tyre: { mu: 1, kPk: ty.kPk, aPk: ty.aPk, slide: ty.slide, slideW: ty.slideW, loadSens: 0.1 },
      brake: 7200 * R / SUV.R0 * m / 2150, bias: 0.62, hbTorque: 3200 * R / SUV.R0, lock: 0.6,
      cdA: 1.25 + lift * 0.6 + (b.roof === "basket" || b.roof === "basketSpare" ? 0.1 : 0) + (b.lights ? 0.03 : 0) + (ty.w - 0.245) * 0.8,
      clF: 0.03, clR: 0.05,
      diff: { pre: 40, acc: 0.3, dec: 0.15, rLock: !1, fLock: !1, cLock: !1, can: { r: lk >= 1, f: lk >= 2, low } },
      surfMu: TREAD_MU[ty.tread], surfRR: rr, surfDrag: { mud: 0.06 * TREAD_RR_MUD[ty.tread] ** 1.5, water: 0.018 * TREAD_RR_MUD[ty.tread] }, tread: ty.tread, lift
    };
  }
  /* what the mesh builder needs */
  function buildLook(b) {
    let ty = TYRES[b.tyre], wh = optOf(b, "wheel"), sp = optOf(b, "susp");
    return {
      lift: sp.lift || 0, tireR: ty.R, tireW: ty.w, rim: wh.rim, wheel: wh.style, tread: ty.tread, trackF: ty.track, trackR: ty.track,
      front: b.front, rear: b.rear === "chute" || b.rear === "wheelie" ? "stock" : b.rear, chute: b.rear === "chute" ? 1 : 0, wheelie: b.rear === "wheelie" ? 1 : 0,
      roof: b.roof, lightbar: b.lights >= 1 ? 1 : 0, ditch: b.lights >= 2 ? 1 : 0, pods: b.lights >= 3 ? 1 : 0, flares: b.flares,
      hood: b.power === "roots" ? "blower" : b.hood, snorkel: b.snorkel, sides: b.sides,
      exhaust: { stock: "stock", catback: "dual", headers: "dual", straight: "dual", side: "side", stacks: "none" }[b.exhaust], stacks: b.exhaust === "stacks" ? 1 : 0, spoiler: b.spoiler
    };
  }
  function buildStyle(b) {
    return {
      livery: b.livery, livCol: optOf(b, "livCol").col, chrome: b.trim === "chrome" ? 1 : 0, clad: b.clad === "satin" ? 1 : 0, tint: b.tint === "limo" ? 0.9 : 0.3,
      lower: [0.055, 0.05, 0.045], sunroof: b.roof === "basket" || b.roof === "basketSpare" ? 0 : 1, number: b.number || 7, seed: 0.37
    };
  }
  /* quick numbers for the shop: peak power, and the sleeper rating */
  function buildNumbers(b) {
    let e = buildSpec(b), m = buildMass(b), hp = e.peak.hp || 0, looks = buildLooks(b), threat = clamp((hp / (m / 1e3) - 136) / 300, 0, 1);
    return { hp, tq: e.peak.tq || 0, tqRpm: e.peak.tqRpm, hpRpm: e.peak.rpm, mass: m, looks, threat: threat * 100, sleeper: Math.round(threat * 100 * (1 - looks / 100) ** 1.3), clearance: Math.round((0.31 + liftOf(b) + TYRES[b.tyre].R - SUV.R0) * 100), e };
  }
  function partPrice(id, v) {
    let o = SLOT[id].opts.find((q) => q.v === v);
    return o ? o.price : 0;
  }
