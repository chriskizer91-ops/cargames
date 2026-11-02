# Voices for Road Not Found + Traffic

Recorded lines for police mode and the traffic. Each file goes in `rlcwo2rnf-traffic/voices/` under the name given; a
packer puts them into the page, so it stays one self-contained file. A line with no file yet is simply not heard.

**Delivered, 2 November 2026**: all 18, in the owner's voice pack (generated with HeyGen Voice: the officer "Intense
Isaac - Serious" for the loudspeaker and the radio, the dispatcher "Ellie Faye - Serious", four voices for the
drivers). Mono MP3, 48 kHz, 96 kbps, peaks about -1 dB; `radio_backup` runs 4.7 s. Checked: each decodes in the
browser to its listed length. Not yet checked by ear on the laptop and the phone.

## How to record them

- **Dry and clean**: no radio, megaphone or room effect, no music. The game adds the police radio's narrow band and
  its squelch clicks, and the loudspeaker's megaphone sound, itself, so one take can serve near and far.
- Mono, MP3 at 64 to 96 kbps, 44.1 or 48 kHz. Peaks at about -1 dB. Silence trimmed to about 0.1 s at each end.
- Each line under 4 seconds. American English, Southwest small-county feel: plain, unhurried, not movie-dramatic.

## The police loudspeaker (the car's PA, heard outside the car)

Voice: one officer, in their 40s, low and firm, calm authority; loud and clipped, as if speaking into a handheld PA mic.

| File | Line |
|---|---|
| `police_pa_pull_over.mp3` | "Driver, pull over to the side of the road." |
| `police_pa_stop_vehicle.mp3` | "Stop the vehicle. Stop the vehicle now." |
| `police_pa_pull_over_now.mp3` | "Pull over. Now." |
| `police_pa_slow_down.mp3` | "Slow it down and pull over to the right." |
| `police_pa_salt.mp3` | "There's nothing out there. Pull over." |
| `police_pa_engine_off.mp3` | "Turn off the engine. Keep your hands where I can see them." |

## The police radio (heard inside your car, as if you'd tuned the scanner)

Voices: the officer chasing you (the same voice as the loudspeaker, but quicker and a little breathless, speaking
while driving), and a dispatcher (a different voice, even and practiced, slower).

| File | Who | Line |
|---|---|---|
| `radio_in_pursuit.mp3` | officer | "Unit Four, in pursuit, Highway Forty." |
| `radio_in_town.mp3` | officer | "Pursuit is coming into town. Heading through downtown." |
| `radio_heading_salt.mp3` | officer | "Vehicle is heading out onto the salt flats. We're staying on it." |
| `radio_lost_visual.mp3` | officer | "Lost visual. Lost visual." |
| `radio_back_on.mp3` | officer | "I've got it again. Back on it." |
| `radio_backup.mp3` | dispatcher | "All units, Redline County. Officer requesting backup on a pursuit." |
| `radio_copy.mp3` | dispatcher | "Copy, Unit Four." |
| `radio_stopped.mp3` | officer | "Vehicle is stopped. One in custody." |

## The traffic (a driver you've just hit, through an open window)

Voices: a mix if you can, one line each; annoyed rather than furious, shouted from a few metres away.

| File | Line |
|---|---|
| `traffic_hey.mp3` | "Hey!" |
| `traffic_watch_it.mp3` | "Watch it!" |
| `traffic_seriously.mp3` | "Are you serious?" |
| `traffic_learn_to_drive.mp3` | "Learn to drive!" |
