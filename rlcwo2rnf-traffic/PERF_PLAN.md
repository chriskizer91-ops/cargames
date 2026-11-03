# Performance: the test sheet and the backlog

One change at a time: each item below is built, measured here, then measured by you on the phone and the laptop
before the next one starts. Nothing on High or Ultra is traded for speed; Mobile and Low may trade.

## 1. Turning the numbers on

- **Laptop:** press **F** once for the Readout, twice for Everything, three times for off.
- **Phone:** Menu → **Dev** → *Numbers on screen* → **Readout** or **Everything**.

The Readout (small text, left side) has five lines:

```
57 FPS   beat 60 (60 Hz)   frame 17.5 ms   worst 31.0
CPU 6.2 ms   GPU 11.4 ms
render 720×338 of 960×450 (75%)  Mobile  lean  half
84k tris   21 chunks   lights 6 + 3
cars 9   on physics 5 (traffic 1, police 3, rivals 0, you)
```

Everything (dot-matrix rows) adds where the time goes, section by section (`MS A FRAME PHYS AI WORLD …`, then a
`CARS` row),
the last slow frame (`SPIKE`), the GPU's aim (`AIM`), and the streaming rows (`CHUNK WAIT`, `HOLES`, `GROUND NOT READY`).

## 2. The numbers that matter, and what is bad

| Number | Where | What it is | Good | Watch out for |
|---|---|---|---|---|
| **FPS vs beat** | Readout, line 1 | Frames drawn vs the rate the game aims for (60 on most screens) | FPS = beat | FPS steadily under beat: the frame doesn't fit |
| **worst** | line 1 | The slowest frame in the last half second | under 25 ms | over 50 ms: a stutter you can see |
| **CPU ms** | line 2 | JavaScript's share of a frame | under 8 ms at a 60 beat | over 12 ms: the CPU is the limit (physics, AI, world) |
| **GPU ms** | line 2 | The GPU's time a frame (a fence on phones) | near the aim (below) | over 16 ms at a 60 beat: the GPU is the limit |
| **render %** | line 3 | The render scale the dynamic resolution chose | at the tier's top (Mobile 75%, Low 100%) | dropping toward 50%: the GPU is struggling, the picture softens |
| **lean / half / noskip** | line 3 | Which shader build is running | what you set in Dev | (check it, so you know which build the numbers belong to) |
| **on physics** | line 5 | Cars the physics steps 240 times a second | — | the count that drives CPU ms in chases and crashes |
| **PHYS** | Everything, MS A FRAME | Physics time a frame: every car on the physics, stepped 240 times a second | under 3 ms | over 6 ms |
| **AI** | Everything, MS A FRAME | The drivers' thinking: police tactics and the helicopter, the traffic, the race's robots | under 1 ms | over 3 ms |
| **WORLD / TREES** | Everything | Streaming the land, the tree lists | under 2 ms | spikes at top speed |
| **SPIKE … UNSEEN** | Everything | The last frame over 30 ms: which section, and how much nobody in JavaScript saw (the GPU, garbage collection, the browser) | NONE | the same section again and again; or big UNSEEN (GPU or garbage) |
| **HOLES / GROUND NOT READY** | Everything | The world not keeping up with you | 0 | climbing while you drive fast |
| **AIM** | Everything, GPU row | The share of each frame the GPU is kept to (Dev: GPU load target) | Auto (70% on a touch screen) | — |

**How to compare two settings (A/B).** The dynamic resolution keeps the GPU at its aim, so when something gets
cheaper the GPU ms usually stays the same and the **render %** goes *up* instead. Stop the car in one spot and wait
5 seconds. Write down render % and GPU ms. Flip the Dev switch, wait 5 seconds, then write them down again. If
render % is already at the tier's top, compare GPU ms (lower is better).

## 3. The tests

Each test takes a minute or two. Do it once on **Mobile** (phone) and once on **Low** (laptop). Write down the
numbers at a steady moment in the middle, and the worst you see. A photo of the screen with the numbers on works
just as well as writing them down.

| # | Test | How | Write down |
|---|---|---|---|
| 1 | **Standing** (the baseline) | Downtown, at night, car stopped, 10 s | everything on the Readout |
| 2 | **Race** | Speedway 25 or Boulevard Run, the first lap (the whole field around you) | FPS, worst, CPU, GPU, render %, on physics, PHYS, AI |
| 3 | **Chase, 1 star** | Police On, Dev Wanted 1, through downtown traffic | same as 2 |
| 4 | **Chase, 3 stars** | Dev Wanted 3 | same, plus SPIKE |
| 5 | **Chase, 5 stars** | Dev Wanted 5 (the helicopter), night | same, plus lights |
| 6 | **Crash in traffic** | Highway 40, Traffic cars at the most, hit a few cars | SPIKE row right after (which section, UNSEEN), on physics, PHYS, AI |
| 7 | **Top speed past trees** | Ridge Road into the hills, or the highway out to the salt, flat out | worst, WORLD, TREES, CHUNK WAIT, HOLES, GROUND NOT READY, SPIKE |
| 8 | **Heat** | 10 minutes of ordinary driving | render % and FPS at minute 1 and minute 10; is the phone hot? |
| 9 | **A/B: Lean ground** | test 1's spot, Dev Lean ground On vs Off | render % and GPU ms each way; and how the ground looks to you up close |
| 10 | **A/B: Half-precision** | same spot, Dev Half-precision lighting On vs Off | render % and GPU ms each way |
| 11 | **A/B: Lighting shortcuts** | same spot at night, Dev Lighting shortcuts On vs Off | render % and GPU ms each way |

**Do the traffic and the police weigh more than a race?** On the CPU, usually yes, and the readout's
*on physics* count shows it. A race keeps up to 6 cars on the physics: you plus the 5 rivals within 140 m. Traffic
cars cost very little until something comes near them, then up to 6 of them go onto the physics. Every police car
is always a full car with its own driver. A 3-star chase through traffic on Mobile can therefore reach 10 cars on
the physics (you, 3 police, 6 traffic), and 12 on High. On the GPU it's the lights at night: every police car and
nearby traffic car adds lamps. Tests 2 to 6 show it in numbers.

## 4. What each test tells me

- CPU ms high, GPU ms fine → physics, AI or streaming: the PHYS/WORLD/TREES rows say which.
- GPU ms at the aim and render % low → the picture costs too much: shader items (lean ground, half, shortcuts).
- worst high with big UNSEEN → garbage collection or the GPU: the memory items.
- HOLES or GROUND NOT READY at speed → streaming: the world items.
- render % falling over 10 minutes → heat: the GPU load target.

## 5. The backlog (one at a time, in this order unless your numbers say otherwise)

| # | Item | Why | Risk |
|---|---|---|---|
| 1 | **Lean ground** (this step): Mobile and Low, Dev switch | the ground's shader is the biggest per-pixel cost | the ground is plainer up close on Mobile and Low; High and Ultra untouched |
| 2 | **Lighting shortcuts A/B** (in this step too) | another session measured them slower on its device; your numbers settle it | none: the picture is identical either way |
| 3 | **Memory**: what holds the ~500 MB | the pictures and voices sit in the page as text and again decoded; a phone that runs short of memory reloads the tab or stutters | low: measure first (a heap snapshot), then free what's done with |
| 4 | **Police far behind on a cheap ride** | each police car is a full physics car even 300 m back, out of sight | medium: the chase must feel the same; checked with the police tests |
| 5 | **Garbage left on the drawing side** (~160 KB a frame at the start of a drive) | garbage collection is a stutter | low: same pixels, checked frame by frame |
| 6 | **Yard lights cap (Dev)** | night in town: many lamps per pixel | low: Mobile only, a Dev control |
| 7 | **Render-size steps without new buffers** | each dynamic resolution change reallocates the targets: a hitch | low |
| 8 | **Smaller vertices** (52 → 24 bytes) | memory bandwidth, a phone's real limit | medium: a lot of code touches the mesh layout |
| 9 | **Split the 9 MB page** | load time and memory | medium: changes how the game ships |
| 10 | **Lean ground, round 2** (each its own Dev A/B): one photo tap instead of two on the salt, mud, tarmac, gravel and concrete; the rock in the ground from one tap instead of three; the leaves' three noise lookups shared | each saves texture taps or noise on a lot of pixels | each has a look cost, judged by you on the phone: tiling showing in the distance, smeared steep rock, plainer tree edges |

Not doing, as decided: the lower resolution cap on Mobile (held for now), and baking what never moves (reflections
need it live).

## 6. Measured here (headless, software GPU)

The software renderer runs shaders on the CPU, so its times show which parts of a shader cost, not what a phone will
do (a phone's GPU also gains from a smaller shader needing fewer registers, which this can't see).

### Lean ground (Mobile tier, 480×270, whole frame, median of 8 frames each)

| Place | Normal | Detail left out (`d`) | Noise halved (`n`) | Both (`dn`) |
|---|---|---|---|---|
| Downtown, day | 2979 ms | −14% | +6% | −20% |
| Neon Row, night | 2483 ms | −9% | +12% | −13% |
| Ridge Road (country), day | 1186 ms | −24% | −3% | −23% |
| Highway 40, day | 1190 ms | −13% | +4% | −17% |

Leaving the fine detail out is the half that pays: 9–24% of the *whole frame* (shadows, fog, reflections and the
rest included). Halving the colour noise never paid: timed again on Ridge Road with more frames it was +4% on its own
and made the lean build slower (−16% against −22%), so the lean ground ships with the fine detail out and the colour
noise whole. The ground's dirt made only where it shows took the normal build's Ridge Road frame from 1186 to 1102
ms (−7%, the same picture: High within the run-to-run noise at three places). The pictures barely differ: the lean gravel and verges are a little smoother right
in front of the car.

### Race vs traffic vs a chase (Mobile tier, the game's step only: physics and AI; this machine's CPU)

| Scene | Cars on the physics | Step a frame | of it physics / AI |
|---|---|---|---|
| Free drive on Highway 40, traffic out | 1 (you) | 0.21 ms | 0.13 / 0.07 |
| Race start, Boulevard Run (field of 6) | 6 | 0.91 ms | 0.76 / 0.09 |
| Chase, 1 star, in the traffic | 2 | 0.45 ms | 0.30 / 0.09 |
| Chase, 3 stars | 4–5 | 0.84 ms | 0.66 / 0.12 |
| Chase, 5 stars (the helicopter) | 4–5 | 0.57 ms | 0.43 / 0.10 |

A race's start is as heavy as a 3-star chase: the cost follows the cars on the physics, and the drivers' thinking
(AI) stays small. A crash in traffic adds up to 6 more cars on the physics for a few seconds; the readout's on-physics
count shows it. A phone's CPU is a few times slower than this one, so multiply by about 3 to 5.
