# Dirt Sleeper HD: marked down for later

Wanted, not built yet.

## A fuller low end in the engine sound

The engine note in the game sounds thin and high next to the Digital Engine lab's garage setting. Make it
fuller in the low end, for every car.

What is known (from reading the code; nothing measured yet):

- The synth (`src/15_digital_engine.js`), the audio setup (`src/17_audio.js`) and what the game feeds the
  synth each frame (`soundUpdate` in `src/60_game.js`, `soundParams` in `src/40_physics.js`) are the same as in
  Mini Dirt Run Solo, Dirt Sleeper Sim and Dirt Sleeper Mini.
- The game plays the engine in the lab's open-air room: a ground bounce and a far wall's slap, sent at 0.28.
  The lab's garage has six strong early reflections and a louder, longer tail (sent at 0.5). That is where
  its fuller sound comes from, more than from any bass in the synth itself.
- The game hears the engine from 1.5 to 5 m behind the exhaust (clamped); nearer sounds fuller.

Ideas, none tried:

- A low shelf on the engine's own path, around 100 to 150 Hz, a few dB.
- An open-air room with a little more early "body" (the ground and the car's own panels close by), without
  the garage's boom.
- A setting for it: a phone's speaker turns extra bass into distortion, so it may want to be stronger on a
  laptop or headphones than on a phone speaker.

Check first:

- Whether the high note is the RPM. On a keyboard the gas is all or nothing, and at full throttle the
  automatic holds every gear to the limiter. Log the RPM the synth is given here and in Mini Dirt Run Solo,
  driving the same car the same way.

Needs ears: a model can't hear the result. Try it on the laptop and on the phone before keeping it.

## Also noticed

- The engine's saved sound settings (volume) use Dirt Sleeper Mini's key `dsmini-engine`, not a `dshd-` key,
  so the two versions share them.
