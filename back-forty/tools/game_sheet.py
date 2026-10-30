#!/usr/bin/env python3
"""Back Forty's game sheet: one self-contained HTML page that describes the game, its performance sheet and what is
   under every build. Draft, for the owner; not shipped with the game.

   python3 tools/game_sheet.py [out.html]

   Inputs (tools/ref/):
     sheet_builds.json   every preset's parts and engine spec, pulled from the game (__game.parts, rigBuild, specOf)
     sheet_perf.json     the measured rows: speedTest on flat tarmac plus the bay's dyno pull, as built and with Plus
   Pictures: put a file named for a slot (cover.jpg, suv-crawler.png, ...) in tools/ref/shots/ and it is embedded in
   place of that slot's placeholder. The slot names are printed on each placeholder."""
import json, math, os, sys, html, base64, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'ref')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'back-forty-game-sheet.html')
BUILDS = json.load(open(os.path.join(REF, 'sheet_builds.json')))
PERF = json.load(open(os.path.join(REF, 'sheet_perf.json')))
SHOTS = os.path.join(REF, 'shots')
RHO = 1.2  # the game's air (40_physics.js)

e = html.escape
LB = 2.20462
def n(v, d=0):
    if v is None: return '–'
    return f'{v:,.{d}f}'

LAYOUT = {'V8': 'V8', 'V8F': 'flat-plane V8', 'V6': 'V6', 'I6': 'inline-six', 'I5': 'inline-five', 'I4': 'inline-four',
          'S1': 'single', 'P2X': 'parallel twin', 'P2T': 'two-cylinder', 'V2L': 'V-twin'}
AIR = {'twin': 'twin turbos', 'turbo': 'turbo', 'roots': 'Roots blower', 'none': 'naturally aspirated'}
STARS = ('crawler', 'sleeper')

perf = {(r['car'], r['build'], r['plus']): r for r in PERF}

def shot(slot, label, cls=''):
    for ext in ('jpg', 'jpeg', 'png', 'webp'):
        p = os.path.join(SHOTS, f'{slot}.{ext}')
        if os.path.exists(p):
            mime = 'image/jpeg' if ext in ('jpg', 'jpeg') else 'image/' + ext
            b = base64.b64encode(open(p, 'rb').read()).decode()
            return f'<figure class="shot has {cls}"><img src="data:{mime};base64,{b}" alt="{e(label)}"></figure>'
    return (f'<figure class="shot {cls}" data-slot="{slot}"><label><input type="file" accept="image/*">'
            f'<span class="ph"><b>{e(label)}</b><i>Picture slot · {slot}</i><em>Tap to try a picture here (preview only)</em></span></label></figure>')

# ---------- one record per build, with the numbers worked out ----------
rows = []
for b in BUILDS:
    s = b['spec']
    built = perf[(b['car'], b['name'], False)]
    plus = perf[(b['car'], b['name'], True)]
    P = {p['slot']: p for p in b['parts']}
    rec = dict(b=b, s=s, built=built, plus=plus, P=P, vehicle=built['carName'], star=b['id'] in STARS,
               slot=f"{b['car']}-{b['id']}".lower() if b['id'] != b['car'] else f"{b['car']}-stock".lower())
    # what holds the top speed: the limiter in top gear, a governor, or the air
    lim = []
    for k, r in (('built', built), ('plus', plus)):
        fd = s['fd'] / (1.15 if k == 'plus' else 1)
        vg = s['limiterRpm'] / 60 * 2 * math.pi * s['R'] / (s['gears'][-1] * fd) * 2.23694
        v = r['top'] / 2.23694
        air = .5 * RHO * s['cdA'] * v ** 3 / 745.7
        why = 'gov' if r['gov'] else ('revs' if r['top'] >= .95 * vg else 'air')
        lim.append(dict(geared=vg, air=air, why=why))
    rec['lim'] = lim
    rows.append(rec)

cars = [r for r in rows if not r['b']['mach']]
machines = [r for r in rows if r['b']['mach']]
by_top = sorted(rows, key=lambda r: -r['built']['top'])
car_by_top = sorted(cars, key=lambda r: -r['built']['top'])
R = {r['b']['id']: r for r in rows}

def eng_line(r):
    s, P = r['s'], r['P']
    lay = LAYOUT.get(s['layout'], s['layout'])
    disp = f"{s['disp']:.1f} L" if s['disp'] >= 1 else f"{round(s['disp'] * 1000)} cc"
    return f"{disp} {lay}" + (' diesel' if s.get('diesel') else '')

def air_line(r):
    s, P = r['s'], r['P']
    if s['fi'] == 'none': return 'Naturally aspirated'
    adder = P.get('power', {}).get('name')
    what = AIR.get(s['fi'], s['fi'])
    head = what[0].upper() + what[1:]
    if adder and adder not in ('None', 'Stock'):
        head = 'Bigger twin turbos' if s['fi'] == 'twin' and adder == 'Bigger turbo' else adder
    tail = ', anti-lag' if s.get('antilag') and 'anti-lag' not in head else ''
    return f"{head}, about {s['boost']:.2f} bar ({s['boost'] * 14.5:.0f} psi) of boost{tail}"

def nos_line(r):
    s, P = r['s'], r['P']
    if not s.get('nos'): return None
    return f"{P['nos']['name']}: about +{s['nosKw'] / .7457:.0f} hp for {s['nosT']:.0f} s on the button"

def gears_line(r):
    s, P = r['s'], r['P']
    t = P.get('trans', {}).get('name', '')
    if len(s['gears']) == 1:
        return t + (' (belt CVT)' if 'Belt' in t else '')
    g = ' · '.join(f'{x:.2f}' for x in s['gears'])
    return f"{t}: {g}" + (' · torque converter' if s.get('conv') else '')

def why_text(r, k=0):
    L, rr, s = r['lim'][k], (r['built'], r['plus'])[k], r['s']
    top = rr['top']
    if L['why'] == 'gov':
        return f"A governor. It is held at {top} mph however much it has."
    if L['why'] == 'revs':
        if len(s['gears']) == 1:
            return (f"Revs. It runs out of belt and revs at {top} mph; the air there takes only about {n(L['air'])} hp. "
                    f"Taller gearing (Plus) is what moves it.")
        return (f"Revs. It hits the limiter in top gear at {top} mph, when the air takes only about {n(L['air'])} hp of its "
                f"{n(rr['crankHp'])}. Taller gearing (Plus) is what moves it.")
    return (f"The air. At {top} mph the air alone takes about {n(L['air'])} hp; its gearing would allow {n(L['geared'])} mph "
            f"at the limiter.")

# ---------- the stars' own words ----------
def star_text(r):
    s, P, bt, pl = r['s'], r['P'], r['built'], r['plus']
    heaviest = max(cars, key=lambda q: q['built']['kg'])['b']['id'] == r['b']['id']
    blunt = sorted(cars, key=lambda q: -q['s']['cdA']).index(r) + 1
    if r['b']['id'] == 'crawler':
        return (f"A 10.4-litre big-block (a 632) under a Roots blower, with a race cam, ram air, long-tube headers and a race "
                f"tune. It makes {n(bt['crankHp'])} hp and {n(bt['crankTq'])} lb-ft at the crank before its 35-shot of "
                f"nitrous. A race four-speed with a trans-brake and 4.10 gears "
                f"turns 37-inch mud-terrains on beadlocks, through two lockers and a two-speed transfer case. "
                f"{'It is the heaviest of the cars' if heaviest else 'It is one of the heaviest cars'} at {n(bt['kg'] * LB)} lb "
                f"and among the bluntest (drag area {s['cdA']:.2f} m²; only {blunt - 1} car build{'s are' if blunt - 1 != 1 else ' is'} "
                f"blunter): at {bt['top']} mph the air alone takes about {n(r['lim'][0]['air'])} hp. It gets there on power, not shape.")
    return (f"The V6 bored to 3.8 litres with forged internals and bigger twin turbos at about {s['boost']:.1f} bar "
            f"({s['boost'] * 14.5:.0f} psi), ram air, long-tube headers and a race tune: {n(bt['crankHp'])} hp and "
            f"{n(bt['crankTq'])} lb-ft before a 250-shot that adds about {s['nosKw'] / .7457:.0f} hp for eight seconds. "
            f"A race four-speed with a trans-brake on 3.55 gears, 285/45R20 performance tyres, lowered two inches, "
            f"{P['weight']['name'].lower()} ({n(bt['kg'] * LB)} lb). Slipperier than the Rock & Mud (drag area "
            f"{s['cdA']:.2f} m²), it needs about {n(r['lim'][0]['air'])} hp to hold {bt['top']} mph.")

def star_card(r):
    bt, pl, s = r['built'], r['plus'], r['s']
    nums = [(n(bt['crankHp']), 'hp at the crank'), (n(bt['crankTq']), 'lb-ft'),
            (f"{bt['z60']:.1f} s", '0–60 mph'), (f"{bt['q'][0]:.1f} s", f"¼ mile at {bt['q'][1]} mph"),
            (f"{bt['top']}", f"mph top · {pl['top']} with Plus")]
    return f'''<article class="star">
  {shot(r['slot'], f"{r['vehicle']} · {r['b']['name']}")}
  <div class="sbody">
    <p class="kicker">{e(r['vehicle'])} · star build</p>
    <h3>{e(r['b']['name'])}</h3>
    <p class="tag">{e(r['b']['tag'])}</p>
    <div class="nums">{''.join(f'<div><b>{v}</b><span>{e(l)}</span></div>' for v, l in nums)}</div>
    <p>{e(star_text(r))}</p>
  </div>
</article>'''

# ---------- the Rock & Mud+ written up as a real car's spec sheet ----------
#   rm_specs.json  the build's model, chassis and engine as the game has it   (tools/rm_specs.py)
#   rm_perf.json   timed runs, shift points and stops on flat tarmac         (tools/rm_perf.py)
RM = json.load(open(os.path.join(REF, 'rm_specs.json')))
RMP = json.load(open(os.path.join(REF, 'rm_perf.json')))
IN, NM_LBFT = 39.3701, 1.35582
BS = '<abbr class="bs" title="Builder\'s spec: not in the game\'s model">B</abbr>'
SRC = {'zz632': ('Chevrolet Performance: ZZ632/1000 Deluxe crate engine', 'https://www.chevrolet.com/performance-parts/crate-engines/big-block-engines/632-engine'),
       'zz632p': ('Engine Builder: 1,004-hp 632 cid big-block Chevy', 'https://www.enginebuildermag.com/?p=53658'),
       'dart': ('Borowski Race Engines: Dart Big M block', 'https://borowskirace.com/products/dart-big-m-and-big-m-sportsman-iron-blocks-big-block-chevy'),
       'sar': ('EngineLabs: 1,000ci SAR/CarTek street engine', 'https://www.enginelabs.com/?p=64634'),
       'sar2': ('EngineLabs: SAR 1,000ci V8 (bore and stroke)', 'https://www.enginelabs.com/?p=8379'),
       'merlin': ('EngineLabs: an 1,100-hp N/A 632 on a World Merlin IV block', 'https://www.enginelabs.com/?p=5914'),
       'mahle': ('BangShift: MAHLE 632 PowerPak pistons', 'https://bangshift.com/?p=825498')}

def ft_in(m, d=1): return f"{m * IN:,.{d}f} in <small>({m * 1000:,.0f} mm)</small>"

def spec_table(rows):
    return '<table class="spec">' + ''.join(f'<tr><th>{k}</th><td>{v}</td></tr>' for k, v in rows if v) + '</table>'

def rm_section():
    r, s, ch, su, f, D = R['crawler'], RM['spec'], RM['chassis'], RM['susp'], RM['figs'], RM['D']
    bt, pl, mb, mp, P = r['built'], r['plus'], RMP['built'], RMP['plus'], r['P']
    pk, pp, fdb, fdp = s['peak'], RM['plusPeak'], s['fd'], RM['plusFd']
    kg = RM['mass']; lb = kg * LB
    lim, R0, gears = s['limiterRpm'], s['R'], s['gears']
    vgear = lambda g, fd: lim / 60 * 2 * math.pi * R0 / (g * fd) * 2.23694
    tq_p, tq_b = pp['tq'] / NM_LBFT, pk['tq'] / NM_LBFT
    wb, tr, tw, cl = ch['wb'], ch['trackF'], ch['tyreW'], f['clear'] / 100
    rturn = math.hypot(wb / math.tan(ch['lock']) + tr / 2, wb) + tw / 2           # outer front tyre's path, kerb to kerb
    brk = math.degrees(2 * math.atan(2 * cl / wb))
    ovF, ovR = D['uFa'], D['L'] - D['uRa']
    crawl_p, crawl_b = gears[0] * fdp * f['low'], gears[0] * fdb * f['low']
    air_p = r['lim'][1]['air']
    top_geared = vgear(gears[-1], fdp)
    hp_kw = lambda hp: f"{n(hp)} hp <small>({n(hp * .7457)} kW)</small>"
    E = P['engine']
    engine = [
        ('Type', 'Supercharged 90° V8, big-block, front-mounted lengthwise'),
        ('Displacement', f"{s['disp']:.1f} L <small>(632 cu in)</small>"),
        ('Bore × stroke', f"4.600 × 4.750 in <small>(116.8 × 120.7 mm)</small>{BS}"),
        ('Block and heads', f"Iron tall-deck block with 4-bolt mains, aluminium heads{BS}"),
        ('Valvetrain', f"Pushrod OHV, 2 valves per cylinder, roller lifters{BS} · {e(P['cam']['name'].lower())}"),
        ('Compression ratio', f"9.0 : 1{BS}"),
        ('Induction', f"Roots-type supercharger, {s['boost']:.2f} bar <small>({s['boost'] * 14.5:.1f} psi)</small> · {e(P['intake']['name'].lower())}"),
        ('Blower size', f"14-71{BS}"),
        ('Fuel and delivery', f"Race fuel, port injection{BS}"),
        ('Exhaust', e(P['exhaust']['name'])),
        ('Engine management', f"{e(P['tune']['name'])} with the Plus calibration · {s['limiter']} rev limiter"),
        ('Idle · redline · limiter', f"{n(s['idle'])} · {n(s['redline'])} · {n(lim)} rpm"),
        ('Launch control', f"Two-step at {n(s['launchRpm'])} rpm, off the trans-brake"),
        ('Max power', f"<b>{hp_kw(pp['hp'])}</b> at {n(pp['rpm'])} rpm <small>· as built {n(pk['hp'])} hp</small>"),
        ('Max torque', f"<b>{n(tq_p)} lb-ft</b> <small>({n(pp['tq'])} N·m)</small> at {n(pp['tqRpm'])} rpm <small>· as built {n(tq_b)} lb-ft</small>"),
        ('Specific output', f"{pp['hp'] / s['disp']:.0f} hp per litre"),
        ('Nitrous', f"{e(P['nos']['name'])}: +{s['nosKw'] / .7457:.0f} hp <small>({s['nosKw']} kW)</small> for {r['s']['nosT']:.0f} s"),
        ('Chassis dyno', f"{n(pl['whp'])} hp at the wheels at {n(pl['whpRpm'])} rpm, in 3rd <small>· the bay's dyno, which reads low for the big automatics (see How we measured)</small>"),
        ('Engine weight', f"{n(RM_ENGINE_KG * LB)} lb <small>({RM_ENGINE_KG} kg)</small> dressed, plus {n(RM_BLOWER_KG * LB)} lb of blower"),
    ]
    drive = [
        ('Transmission', f"{e(P['trans']['name'])} automatic with a trans-brake and a torque converter · {s['shiftT']:.2f} s shifts"),
        ('Ratios', ' · '.join(f'{g:.2f}' for g in gears)),
        ('Final drive', f"{fdp:.2f} : 1 <small>(as built {fdb:.2f})</small>"),
        ('Transfer case', f"Two-speed, low range {f['low']:.2f} : 1; the centre diff locks in low"),
        ('Drive', 'Full-time four-wheel drive'),
        ('Differentials', 'Front and rear lockers, selectable'),
        ('Top gear', f"{vgear(gears[-1], fdp) / lim * 1000:.1f} mph per 1,000 rpm"),
    ]
    chassis = [
        ('Construction', f"Steel body on a ladder frame, four doors{BS}"),
        ('Suspension', f"{e(P['ride']['name'])} on coilovers, front and rear"),
        ('Shocks', e(P['shocks']['name'])),
        ('Spring rates F / R', f"{su['kF'] / 175.127:.0f} / {su['kR'] / 175.127:.0f} lb/in <small>({su['kF'] / 1000:.1f} / {su['kR'] / 1000:.1f} kN/m)</small>"),
        ('Anti-roll bars F / R', f"{su['arbF'] / 1000:.1f} / {su['arbR'] / 1000:.1f} kN·m/rad"),
        ('Steering', f"{math.degrees(ch['lock']):.0f}° lock · turning circle {rturn * 2 * 3.28084:.1f} ft <small>({rturn * 2:.1f} m)</small>"),
        ('Brakes', f"{e(P['brakes']['name'])}, {ch['bias'] * 100:.0f}% front bias"),
        ('Wheels', f"{RM['tyre']['rim']} in beadlocks, bronze"),
        ('Tyres', f"{e(P['tires']['name'])} · {R0 * 2 * IN:.1f} in tall"),
        ('Seats', f"5{BS}"),
    ]
    dims = [
        ('Length', ft_in(D['L'])), ('Wheelbase', ft_in(wb)), ('Track F / R', ft_in(tr) + ' both'),
        ('Width at the tyres', ft_in(tr + tw)), ('Height, to the rack', ft_in(D['Hr'])),
        ('Overhang F / R', f"{ovF * IN:.1f} / {ovR * IN:.1f} in"),
        ('Lift', f"{RM['look']['lift'] * IN:.0f} in over stock"),
    ]
    weight = [
        ('Curb weight', f"<b>{n(lb)} lb</b> <small>({n(kg)} kg)</small>"),
        ('Distribution F / R', f"{ch['wf'] * 100:.0f} / {100 - ch['wf'] * 100:.0f}"),
        ('Centre of gravity', ft_in(ch['hcg']) + ' up'),
        ('Power to weight', f"{lb / pp['hp']:.2f} lb per hp <small>({pp['hp'] / kg * 1000:,.0f} hp per tonne)</small>"),
    ]
    aero = [
        ('Drag area (Cd × A)', f"{s['cdA']:.2f} m² <small>({s['cdA'] * 10.7639:.1f} ft²)</small>"),
        ('Power to push the air', f"about {n(air_p)} hp at {pl['top']} mph"),
        ('What sets top speed', f"The air. Geared for {top_geared:.0f} mph at the limiter"),
    ]
    offroad = [
        ('Ground clearance', ft_in(cl)), ('Suspension travel', ft_in(f['travel'] / 100)),
        ('Breakover angle', f"about {brk:.0f}° <small>(from clearance and wheelbase)</small>"),
        ('Low range', f"{f['low']:.2f} : 1"), ('Crawl ratio', f"{crawl_p:.1f} : 1 <small>(as built {crawl_b:.1f})</small>"),
        ('Tip-over', f"{f['tip']:.2f} g <small>(static stability: track ÷ twice the CG height)</small>"),
        ('Body armour', 'Steel bumpers with a winch and shackles, rock sliders, snorkel, expedition rack'),
    ]
    def t(x, k): return f"{x['T'][k]:.1f} s" if x['T'].get(k) is not None else '–'
    def run(x): return f"{x[0]:.1f} s @ {x[1]:.0f} mph"
    perf_rows = [('0–30 mph', t(mb, '30'), t(mp, '30')), ('0–60 mph', f"{bt['z60']:.1f} s", f"{pl['z60']:.1f} s"),
                 ('0–100 mph', f"{bt['z100']:.1f} s", f"{pl['z100']:.1f} s"), ('0–130 mph', t(mb, '130'), t(mp, '130')),
                 ('0–150 mph', t(mb, '150'), t(mp, '150')), ('0–200 mph', t(mb, '200'), t(mp, '200')), ('0–250 mph', t(mb, '250'), t(mp, '250')),
                 ('¼ mile', f"{bt['q'][0]:.1f} s @ {bt['q'][1]} mph", f"{pl['q'][0]:.1f} s @ {pl['q'][1]} mph"),
                 ('½ mile', run(mb['h']), run(mp['h'])), ('Standing mile', run(mb['mile']), run(mp['mile'])),
                 ('Top speed', f"<b>{bt['top']} mph</b>", f"<b>{pl['top']} mph</b>"),
                 ('60–0 mph', f"{mb['brake60']['ft']:.0f} ft", f"{mp['brake60']['ft']:.0f} ft"),
                 ('100–0 mph', f"{mb['brake100']['ft']:.0f} ft", f"{mp['brake100']['ft']:.0f} ft")]
    perf_t = ('<table class="mini wide"><thead><tr><th></th><th><i class="sw b"></i>As built</th><th><i class="sw p"></i>Plus</th></tr></thead><tbody>'
              + ''.join(f'<tr><th>{a}</th><td>{b}</td><td>{c}</td></tr>' for a, b, c in perf_rows) + '</tbody></table>')
    sh = {g: (mph, rpm) for g, mph, rpm in mp['shifts']}
    gear_t = ('<table class="mini wide"><thead><tr><th>Gear</th><th>Ratio</th><th>At the limiter</th><th>Shifts up at</th></tr></thead><tbody>'
              + ''.join(f"<tr><th>{k + 1}</th><td>{g:.2f}</td><td>{vgear(g, fdp):.0f} mph</td><td>{(f'{sh[k + 2][0]:.0f} mph · {n(sh[k + 2][1])} rpm' if k + 2 in sh else '–')}</td></tr>"
                        for k, g in enumerate(gears)) + '</tbody></table>')
    parts = [p for p in r['b']['parts'] if p['price']]
    total = sum(p['price'] for p in parts)
    build_t = ('<table class="mini wide"><tbody>' + ''.join(f"<tr><th>{e(p['label'])}</th><td class='l'>{e(p['name'])}</td><td>${p['price']:,}</td></tr>" for p in parts)
               + f"<tr><th>Plus</th><td class='l'>15% more torque, {fdp:.2f} final drive</td><td>a tap</td></tr>"
               + f"<tr class='tot'><th>Parts fitted</th><td></td><td><b>${total:,}</b></td></tr></tbody></table>")
    src = lambda k: f'<a href="{SRC[k][1]}">{e(SRC[k][0])}</a>'
    nums = [(n(pp['hp']), 'hp'), (n(tq_p), 'lb-ft'), (f"{pl['z60']:.1f} s", '0–60 mph'),
            (f"{pl['q'][0]:.1f} s", f"¼ mile at {pl['q'][1]} mph"), (f"{pl['top']}", 'mph top speed'), (n(lb), 'lb curb weight')]
    return f'''<section id="rockmud">
  <h2>Rock &amp; Mud+ specifications</h2>
  <p class="sub2">The star with Plus, written up the way a maker writes up a real car.</p>
  <article class="specsheet">
    {shot('suv-crawler-plus', 'SUV · Rock & Mud+')}
    <div class="sbody">
      <p class="kicker">Back Forty SUV</p>
      <h3>Rock &amp; Mud+</h3>
      <p class="tag">Full-size four-door 4x4 · {s['disp']:.1f}-litre supercharged V8 · full-time four-wheel drive · 37-inch tyres</p>
      <div class="nums six">{''.join(f'<div><b>{v}</b><span>{e(l)}</span></div>' for v, l in nums)}</div>
      <p class="note">Figures are the game's own: its model of this build, timed in its physics. A {BS} marks a builder's spec, a detail the game doesn't model, filled in with what a real build like this would use. Plus is the game's one-tap tune: 15% more torque and a {fdp:.2f} final drive in place of the {fdb:.2f}.</p>
      <div class="sgrid">
        <div class="sgrp"><h4>Engine</h4>{spec_table(engine)}</div>
        <div class="sgrp"><h4>Drivetrain</h4>{spec_table(drive)}</div>
        <div class="sgrp"><h4>Chassis</h4>{spec_table(chassis)}</div>
        <div class="sgrp"><h4>Dimensions</h4>{spec_table(dims)}</div>
        <div class="sgrp"><h4>Weight</h4>{spec_table(weight)}</div>
        <div class="sgrp"><h4>Off-road</h4>{spec_table(offroad)}</div>
        <div class="sgrp"><h4>Aerodynamics</h4>{spec_table(aero)}</div>
      </div>
      <div class="cols">
        <div><h4>Performance</h4>{perf_t}<p class="note">Flat tarmac, full throttle, no nitrous; stops are a straight-line panic stop. Measured on Realistic, like the rest of the sheet.</p></div>
        <div><h4>Gears, with Plus</h4>{gear_t}<p class="note">The automatic shifts near 6,000 rpm, short of the limiter. Top gear would pull {top_geared:.0f} mph at the limiter; the air stops it at {pl['top']}.</p>
          <h4>Build sheet</h4>{build_t}<p class="note">Garage prices, in the game's dollars.</p></div>
      </div>
      <div class="insights">
        <div><b>The real engine behind it.</b> Chevrolet's own 632 is the ZZ632/1000 crate engine: the same 4.600 × 4.750 in bore and stroke, about 1,004 hp at 6,600 rpm and 876 lb-ft on 93-octane pump gas, with no blower. The game's 632 adds a Roots blower and a 35-shot, which is how it gets to {n(pk['hp'])} hp, and {n(pp['hp'])} with Plus. The 632 is a staple of drag racing, truck pulling and mud racing.</div>
        <div><b>Going bigger.</b> In the game, the dyno's Tune tab takes this engine's displacement up to 19 L (about 1,160 cu in), and torque grows with it. In real life the 632 is near the top for a standard-size big-block: Dart rates its Big M block to about 638 cu in (a 4.6125 in bore with the 4.75 in stroke), and a few tall-deck race blocks take a bigger bore. Past that, builders use purpose-made "mountain motor" blocks with wider bore spacing and taller decks: Sonny's Automotive Racing builds about 1,000 cu in (16.4 L) from a 5.220 in bore and 5.875 in stroke in a billet block. It is a bigger engine on the outside too.</div>
      </div>
      <p class="srcs">Sources: {' · '.join(src(k) for k in SRC)}</p>
    </div>
  </article>
</section>'''

# ---------- a build's sheet ----------
def dl(items):
    return '<dl>' + ''.join(f'<dt>{e(k)}</dt><dd>{v}</dd>' for k, v in items if v) + '</dl>'

def part(r, slot, with_note=False):
    p = r['P'].get(slot)
    if not p: return None
    t = e(p['name'])
    if with_note and p.get('note'): t += f' <small>{e(p["note"])}</small>'
    return t

def build_card(r):
    b, s, bt, pl, P = r['b'], r['s'], r['built'], r['plus'], r['P']
    pk = s['peak'] or {}
    eng = [('Engine', part(r, 'engine', True)),
           ('Layout', e(eng_line(r))),
           ('Air', e(air_line(r))),
           ('Intake', part(r, 'intake')), ('Exhaust', part(r, 'exhaust')), ('Cam', part(r, 'cam')), ('Tune', part(r, 'tune')),
           ('Nitrous', e(nos_line(r)) if nos_line(r) else None),
           ('Revs', f"idle {n(s['idle'])} · redline {n(s['redline'])} · {s['limiter']} limiter at {n(s['limiterRpm'])}"),
           ('Peak power', f"<b>{n(bt['crankHp'])} hp</b> at {n(pk.get('rpm'))} rpm (crank)"),
           ('Peak torque', f"<b>{n(bt['crankTq'])} lb-ft</b> at {n(pk.get('tqRpm'))} rpm (crank)"),
           ('On the dyno', f"{n(bt['whp'])} hp at {n(bt['whpRpm'])} rpm · {n(bt['wtq'])} lb-ft at {n(bt['wtqRpm'])} rpm, at the drums in gear {bt['pullGear']}")]
    drive = [('Gearbox', e(gears_line(r))), ('Final drive', f"{s['fd']:.2f}" + (f" ({e(P['axle']['name'])})" if 'axle' in P and not P['axle']['name'].endswith('gears') else '')),
             ('Transfer', part(r, 'transfer')), ('Diffs', part(r, 'lockers')),
             ('Driven wheels', e(s['drv'])),
             ('Launch', f"two-step at {n(s['launchRpm'])} rpm off the trans-brake" if s.get('launch') else None)]
    chassis = [('Tyres', f"{part(r, 'tires')} · {s['R'] * 2 / .0254:.1f} in tall"), ('Ride', part(r, 'ride')),
               ('Shocks', part(r, 'shocks')), ('Brakes', part(r, 'brakes')), ('Weight', f"{n(bt['kg'] * LB)} lb ({n(bt['kg'])} kg)" + (f" · {e(P['weight']['name'].lower())}" if 'weight' in P and P['weight']['val'] != 'stock' else '')),
               ('Drag area', f"{s['cdA']:.2f} m² (Cd × frontal area)"), ('Body', part(r, 'kit') if not b['mach'] else None)]
    def pr(x): return f"{x['q'][0]:.1f} s @ {x['q'][1]}" if x['q'] else '–'
    perf_t = f'''<table class="mini"><thead><tr><th></th><th><i class="sw b"></i>As built</th><th><i class="sw p"></i>Plus</th></tr></thead><tbody>
      <tr><th>Crank hp</th><td>{n(bt['crankHp'])}</td><td>{n(pl['crankHp'])}</td></tr>
      <tr><th>0–60 mph</th><td>{n(bt['z60'], 1) if bt['z60'] else '–'} s</td><td>{n(pl['z60'], 1) if pl['z60'] else '–'} s</td></tr>
      <tr><th>0–100 mph</th><td>{n(bt['z100'], 1) + ' s' if bt['z100'] else '–'}</td><td>{n(pl['z100'], 1) + ' s' if pl['z100'] else '–'}</td></tr>
      <tr><th>¼ mile</th><td>{pr(bt)}</td><td>{pr(pl)}</td></tr>
      <tr><th>Top speed</th><td><b>{bt['top']} mph</b></td><td><b>{pl['top']} mph</b></td></tr></tbody></table>'''
    desc = b.get('desc') or ''
    blurb = '' if b['mach'] else b.get('blurb') or ''
    star = ' <span class="badge">★ star</span>' if r['star'] else ''
    return f'''<details class="build" id="b-{b['id']}"{' open' if r['star'] else ''}>
  <summary><span class="bn">{e(b['name'])}{star}</span><span class="bt">{e(b['tag'])}</span>
    <span class="bq"><b>{n(bt['crankHp'])}</b> hp · <b>{bt['top']}</b> mph</span></summary>
  <div class="inner">
    {shot(r['slot'], f"{r['vehicle']} · {b['name']}")}
    {f'<p class="lede">{e(desc)}</p>' if desc else ''}
    {f'<p class="look">{e(blurb)}</p>' if blurb else ''}
    <div class="cols">
      <div><h4>Engine</h4>{dl(eng)}</div>
      <div><h4>Drivetrain</h4>{dl(drive)}<h4>Chassis</h4>{dl(chassis)}</div>
    </div>
    <h4>Performance</h4>{perf_t}
    <p class="why"><b>What sets the top speed:</b> {e(why_text(r, 0))}{'' if r['lim'][0]['why'] == r['lim'][1]['why'] or r['lim'][1]['why'] == 'gov' else ' With Plus: ' + e(why_text(r, 1))}</p>
  </div>
</details>'''

# one group per vehicle, in the game's order: the cars, then the machines
gmap = {}
for r in rows: gmap.setdefault(r['vehicle'], []).append(r)
groups = sorted(gmap.items(), key=lambda g: g[1][0]['b']['mach'])

# ---------- the facts the summary leads with ----------
crawler, sleeper = R['crawler'], R['sleeper']
RM_ENGINE_KG = crawler['b']['engine']['kg']
RM_BLOWER_KG = 35   # 56_parts.js: the Roots blower's kg
third = car_by_top[2]
revs_cars = [r for r in cars if r['lim'][0]['why'] == 'revs']
plus_gain = sorted(((r['plus']['top'] - r['built']['top']) / r['built']['top'] for r in cars))
data_js = [dict(id=r['b']['id'], v=r['vehicle'], b=r['b']['name'], m=r['b']['mach'], star=r['star'],
                t=r['built']['top'], tp=r['plus']['top'], hp=r['built']['crankHp'], hpp=r['plus']['crankHp'],
                tq=r['built']['crankTq'], tqp=r['plus']['crankTq'], whp=r['built']['whp'], whpp=r['plus']['whp'],
                z60=r['built']['z60'], z60p=r['plus']['z60'], z100=r['built']['z100'], z100p=r['plus']['z100'],
                q=r['built']['q'], qp=r['plus']['q'], lb=round(r['built']['kg'] * LB), lbp=round(r['plus']['kg'] * LB),
                drv=r['built']['drv'], why=r['lim'][0]['why'], whyp=r['lim'][1]['why']) for r in rows]

today = datetime.date.today().strftime('%B %-d, %Y')
page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Back Forty · game sheet (draft)</title>
<style>
:root{{color-scheme:dark;--bg:#0d0d0e;--s1:#141416;--s2:#1b1b1e;--line:#2a2a2e;--t1:#f0efec;--t2:#c3c2b7;--t3:#8f8e86;
  --accent:#e8a33a;--built:#c98500;--plus:#3987e5;--head:"Bahnschrift","DIN Alternate","Roboto Condensed","Arial Narrow",system-ui,sans-serif}}
*{{box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%}}
body{{margin:0;background:var(--bg);color:var(--t1);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
.wrap{{max-width:980px;margin:0 auto;padding:0 16px calc(32px + env(safe-area-inset-bottom))}}
h1,h2,h3,h4,.kicker,.draft,nav a,.chip,th{{font-family:var(--head)}}
h2{{font-size:26px;letter-spacing:.04em;text-transform:uppercase;margin:44px 0 6px}}
h2+p.sub2{{color:var(--t2);margin:0 0 18px}}
h3{{font-size:22px;margin:0;letter-spacing:.02em}}
h4{{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:18px 0 6px}}
a{{color:var(--accent)}}
.draft{{display:inline-block;margin:18px 0 0;padding:3px 10px;border:1px solid var(--accent);color:var(--accent);border-radius:99px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}}
.hero h1{{font-size:clamp(46px,14vw,96px);line-height:.92;margin:14px 0 8px;letter-spacing:.02em;font-weight:800}}
.hero h1 span{{color:var(--accent)}}
.hero .sub{{font-size:18px;color:var(--t2);margin:0 0 18px;max-width:40em}}
.tiles{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0 0}}
@media(min-width:720px){{.tiles{{grid-template-columns:repeat(4,1fr)}}}}
.tiles div{{background:var(--s1);border:1px solid var(--line);border-radius:10px;padding:12px}}
.tiles b{{display:block;font:800 26px/1.1 var(--head)}}
.tiles span{{color:var(--t2);font-size:13px}}
nav{{position:sticky;top:0;z-index:5;background:rgba(13,13,14,.94);backdrop-filter:blur(8px);margin:18px -16px 0;padding:8px 16px;display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid var(--line);scrollbar-width:none}}
nav a{{flex:none;text-decoration:none;color:var(--t2);font-size:13px;letter-spacing:.08em;text-transform:uppercase;padding:6px 10px;border-radius:99px;border:1px solid var(--line)}}
.shot{{margin:0;position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:repeating-linear-gradient(135deg,#17171a 0 12px,#1b1b1f 12px 24px);border:1px dashed #3a3a40}}
.shot.has{{border:0;background:#000}}
.shot img{{width:100%;height:100%;object-fit:cover;display:block}}
.shot label{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;cursor:pointer;text-align:center;padding:12px}}
.shot input{{position:absolute;opacity:0;width:1px;height:1px}}
.shot .ph b{{display:block;font:700 17px var(--head);letter-spacing:.04em}}
.shot .ph i{{display:block;color:var(--t3);font-style:normal;font-size:12px;margin-top:2px;font-family:ui-monospace,Menlo,monospace}}
.shot .ph em{{display:block;color:var(--t3);font-style:normal;font-size:12px;margin-top:6px}}
.shot.cover{{aspect-ratio:21/9}}
@media(max-width:600px){{.shot.cover{{aspect-ratio:16/10}}}}
.about p{{max-width:44em;color:var(--t2)}}
.about ul{{padding-left:20px;color:var(--t2);max-width:44em}}
.about li{{margin:4px 0}}
.about li b{{color:var(--t1)}}
.star{{background:var(--s1);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:0 0 16px}}
.star .shot{{border-radius:0;border-width:0 0 1px}}
.sbody{{padding:14px 16px 16px}}
.kicker{{margin:0;color:var(--accent);font-size:12px;letter-spacing:.14em;text-transform:uppercase}}
.tag{{margin:2px 0 10px;color:var(--t2);font-style:italic}}
.nums{{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 14px;margin:6px 0 12px}}
@media(min-width:720px){{.nums{{grid-template-columns:repeat(5,1fr)}}}}
.nums b{{display:block;font:800 28px/1.05 var(--head)}}
.nums span{{font-size:12px;color:var(--t2)}}
.sbody p{{color:var(--t2);margin:0}}
.panel{{background:var(--s1);border:1px solid var(--line);border-radius:14px;padding:14px 14px 10px}}
.chips{{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}}
.chip{{font-size:13px;letter-spacing:.06em;text-transform:uppercase;background:transparent;color:var(--t2);border:1px solid var(--line);border-radius:99px;padding:6px 12px;cursor:pointer}}
.chip[aria-pressed="true"]{{background:var(--t1);color:#111;border-color:var(--t1)}}
.legend{{display:flex;gap:16px;font-size:13px;color:var(--t2);margin:0 0 10px;flex-wrap:wrap}}
.legend i{{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-right:6px}}
.bars{{display:grid;gap:9px}}
.bar{{display:grid;grid-template-columns:1fr auto;gap:2px 10px;cursor:default;position:relative}}
.bar .lab{{font-size:13px;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.bar .lab small{{color:var(--t3)}}
.bar .val{{font-size:13px;color:var(--t2);font-variant-numeric:tabular-nums;text-align:right}}
.bar .val b{{color:var(--t1)}}
.bar .track{{grid-column:1/-1;display:flex;height:12px;align-items:stretch}}
.bar .seg{{height:100%}}
.bar .s1{{background:var(--built);border-radius:0}}
.bar .s2{{background:var(--plus);margin-left:2px;border-radius:0 4px 4px 0}}
.bar:hover .lab,.bar:focus .lab{{color:var(--accent)}}
.tip{{position:fixed;z-index:20;pointer-events:none;background:#232327;border:1px solid #3a3a40;border-radius:8px;padding:8px 10px;font-size:13px;color:var(--t1);box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:240px;display:none}}
.tip span{{color:var(--t2)}}
.tablewrap{{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--s1)}}
table.perf{{border-collapse:collapse;width:100%;min-width:900px;font-variant-numeric:tabular-nums;font-size:14px}}
table.perf th,table.perf td{{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}}
table.perf th{{position:sticky;top:0;background:var(--s2);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--t2);cursor:pointer;user-select:none}}
table.perf th[aria-sort]::after{{content:" ▾";color:var(--accent)}}
table.perf th[aria-sort="ascending"]::after{{content:" ▴"}}
table.perf td:nth-child(-n+2),table.perf th:nth-child(-n+2){{text-align:left}}
table.perf td:first-child{{font-weight:400}}
table.perf .bld{{color:var(--t2)}}
.sw{{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;vertical-align:0}}
.sw.b{{background:var(--built)}}.sw.p{{background:var(--plus)}}
table.perf td:first-child,table.perf th:first-child{{position:sticky;left:0;background:var(--s1);z-index:1}}
table.perf th:first-child{{background:var(--s2);z-index:2}}
table.perf tr.plus td{{background:rgba(57,135,229,.05)}}
table.perf tr.plus td:first-child{{background:#16181c}}
table.perf tr.isstar td:first-child::before{{content:"★ ";color:var(--accent)}}
.insights{{display:grid;gap:10px;margin:14px 0 0}}
@media(min-width:720px){{.insights{{grid-template-columns:1fr 1fr}}}}
.insights div{{background:var(--s1);border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:var(--t2)}}
.insights b{{color:var(--t1)}}
.vgroup{{margin:26px 0 0}}
.vgroup>h3{{font-size:18px;text-transform:uppercase;letter-spacing:.08em;color:var(--t2);margin:0 0 8px}}
.build{{background:var(--s1);border:1px solid var(--line);border-radius:12px;margin:0 0 8px;overflow:hidden}}
.build summary{{list-style:none;cursor:pointer;padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:0 10px}}
.build summary::-webkit-details-marker{{display:none}}
.build .bn{{font:700 18px var(--head);letter-spacing:.02em}}
.build .bt{{grid-row:2;color:var(--t2);font-size:13px;font-style:italic}}
.build .bq{{grid-row:1/3;grid-column:2;align-self:center;color:var(--t2);font-size:13px;text-align:right}}
.build .bq b{{color:var(--t1)}}
.build[open] summary{{border-bottom:1px solid var(--line)}}
.badge{{font:600 11px system-ui;color:#111;background:var(--accent);border-radius:99px;padding:2px 7px;vertical-align:3px;margin-left:6px;letter-spacing:.04em}}
.inner{{padding:14px}}
.inner .shot{{max-width:640px}}
.lede{{color:var(--t1);margin:12px 0 4px}}
.look{{color:var(--t2);margin:4px 0 0;font-size:14px}}
.cols{{display:grid;gap:0 24px}}
@media(min-width:760px){{.cols{{grid-template-columns:1fr 1fr}}}}
dl{{margin:0;display:grid;grid-template-columns:auto 1fr;gap:5px 12px;font-size:14px}}
dt{{color:var(--t3)}}
dd{{margin:0;color:var(--t1)}}
dd small{{display:block;color:var(--t3);font-size:12px}}
table.mini{{border-collapse:collapse;font-size:13.5px;font-variant-numeric:tabular-nums;width:100%;max-width:440px}}
table.mini th,table.mini td{{padding:5px 8px;border-bottom:1px solid var(--line);text-align:right}}
table.mini th:first-child{{text-align:left;color:var(--t3);font-weight:400}}
table.mini thead th{{color:var(--t2);font-size:12px;letter-spacing:.08em;text-transform:uppercase}}
table.mini td{{white-space:nowrap}}
.why{{margin:14px 0 0;padding:10px 12px;background:var(--s2);border-left:3px solid var(--accent);border-radius:6px;color:var(--t2);font-size:14px}}
.why b{{color:var(--t1)}}
.method li{{margin:6px 0;color:var(--t2)}}
.method li b{{color:var(--t1)}}
section,details.build{{scroll-margin-top:60px}}
.specsheet{{background:var(--s1);border:1px solid var(--line);border-radius:14px;overflow:hidden}}
.specsheet>.shot{{border-radius:0;border-width:0 0 1px}}
@media(min-width:720px){{.nums.six{{grid-template-columns:repeat(6,1fr)}}}}
.note{{color:var(--t3)!important;font-size:13px;margin:8px 0 0!important;max-width:46em}}
.sgrid{{columns:2 330px;column-gap:28px;margin:4px 0 0}}
.sgrp{{break-inside:avoid;padding-top:2px}}
table.spec{{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}}
table.spec tr{{border-bottom:1px solid var(--line)}}
table.spec th{{font-family:inherit;text-align:left;color:var(--t3);font-weight:400;padding:6px 12px 6px 0;vertical-align:top;width:38%}}
table.spec td{{padding:6px 0;color:var(--t1)}}
table.spec small,table.mini small{{color:var(--t3);font-size:12px}}
abbr.bs{{display:inline-block;font:700 10px/1 var(--head);color:#111;background:#8f8e86;border-radius:3px;padding:2px 4px;margin-left:6px;text-decoration:none;vertical-align:1px;cursor:help}}
table.mini.wide{{max-width:none}}
table.mini td.l{{text-align:left;color:var(--t2);white-space:normal}}
table.mini tr.tot th,table.mini tr.tot td{{border-bottom:0;color:var(--t1)}}
.srcs{{color:var(--t3)!important;font-size:12.5px;margin:14px 0 0!important}}
.srcs a{{color:var(--t2)}}
footer{{margin:40px 0 0;padding:16px 0 0;border-top:1px solid var(--line);color:var(--t3);font-size:13px}}
@media print{{nav,.chips,.shot label em{{display:none}}body{{background:#fff;color:#000}}}}
</style>
</head>
<body>
<div class="wrap">
<header class="hero">
  <span class="draft">Draft · not for release</span>
  <h1>BACK <span>FORTY</span></h1>
  <p class="sub">Forty miles by forty miles of back country, built around you as you drive. {len(rows)} builds, from a kids' quad to a {n(crawler['built']['crankHp'])}-horsepower SUV.</p>
  {shot('cover', 'Cover art', 'cover')}
  <div class="tiles">
    <div><b>40 × 40 mi</b><span>one open world, made as you drive</span></div>
    <div><b>{len(cars)} + {len(machines)}</b><span>car builds and machines</span></div>
    <div><b>{crawler['built']['top']} mph</b><span>the Rock &amp; Mud; {crawler['plus']['top']} with Plus</span></div>
    <div><b>{n(crawler['built']['crankHp'])} hp</b><span>the most power in the game</span></div>
  </div>
</header>
<nav>
  <a href="#game">The game</a><a href="#stars">The stars</a><a href="#rockmud">Rock &amp; Mud+ specs</a><a href="#speed">Top speed</a><a href="#sheet">Performance sheet</a><a href="#builds">Under the hood</a><a href="#method">How we measured</a>
</nav>

<section id="game" class="about">
  <h2>The game</h2>
  <p>Back Forty is a driving game set on forty miles by forty miles of county roads, gravel, ranch land, creeks and rock. The world is generated around you as you drive.</p>
  <ul>
    <li><b>{len(cars)} car builds on seven bodies</b>: the SUV, a two-door 4x4, a coupe, a wagon, a pickup, a muscle car and a hatch, each stock and modified. Plus <b>{len(machines)} machines</b>: quads, a side-by-side, a golf cart, a go-kart, an old tractor and a semi.</li>
    <li><b>A garage for every vehicle</b>: engine, power adder, intake, exhaust, cam, tune and nitrous; gearbox, axle gears, transfer case and diffs; tyres, suspension, shocks, brakes and weight; body, wheels and paint.</li>
    <li><b>The model bay</b>: any vehicle on a turntable and a chassis dyno. Rev it in neutral, drive it through the gears on the rollers, or run a full dyno pull and keep the power and torque sheet.</li>
    <li><b>Plus</b>: any build with 15% more power and a final drive 15% taller. A one-tap tune.</li>
    <li><b>Every engine is synthesized live</b> from its spec, not played from recordings: the cam's lope, the blower's whine, the turbos and the bangs at the limiter.</li>
    <li><b>The dev tools ship with the game.</b> Every vehicle comes set up to drive well, and anyone can change the physics and revert to the preset.</li>
    <li><b>Made for phones first</b>, held upright, with graphics tiers up to a fast laptop.</li>
  </ul>
  <p><i>This section will grow.</i></p>
</section>

<section id="stars">
  <h2>The stars</h2>
  <p class="sub2">Two SUVs are the fastest things in the game, as built and with Plus. They hold the top four spots.</p>
  {star_card(crawler)}
  {star_card(sleeper)}
</section>

{rm_section()}

<section id="speed">
  <h2>Top speed</h2>
  <p class="sub2">Flat-out on flat tarmac, as built and with Plus. Tap a bar for the numbers.</p>
  <div class="panel">
    <div class="chips" role="group" aria-label="Which vehicles">
      <button class="chip" data-f="cars" aria-pressed="true">Cars</button><button class="chip" data-f="machines" aria-pressed="false">Machines</button>
    </div>
    <div class="legend"><span><i style="background:var(--built)"></i>As built</span><span><i style="background:var(--plus)"></i>Added by Plus</span></div>
    <div class="bars" id="bars"></div>
  </div>
  <div class="insights">
    <div><b>The stars hold the top four.</b> Rock &amp; Mud {crawler['built']['top']} mph ({crawler['plus']['top']} with Plus), Sleeper {sleeper['built']['top']} ({sleeper['plus']['top']}). Next is the {e(third['vehicle'])} {e(third['b']['name'])} at {third['built']['top']} ({third['plus']['top']}).</div>
    <div><b>Gearing, not power, caps {len(revs_cars)} of the {len(cars)} car builds.</b> They hit the limiter in top gear before the air stops them. The Race SUV has {n(R['race']['built']['crankHp'])} hp but tops out at {R['race']['built']['top']} mph in sixth, and the Group B hatch has {n(R['hatchB']['built']['crankHp'])} hp and tops out at {R['hatchB']['built']['top']}. That's why Plus comes with taller gears.</div>
    <div><b>The air's price rises with the cube of speed.</b> The Rock &amp; Mud needs about {n(crawler['lim'][0]['air'])} hp just to push the air at {crawler['built']['top']} mph, and about {n(crawler['lim'][1]['air'])} hp at {crawler['plus']['top']}: {n(crawler['lim'][1]['air'] - crawler['lim'][0]['air'])} hp more for {crawler['plus']['top'] - crawler['built']['top']} mph.</div>
    <div><b>Plus adds {min(plus_gain) * 100:.0f} to {max(plus_gain) * 100:.0f}% top speed</b> across the cars. It adds the least where the air is already the limit and the most where the revs were.</div>
  </div>
</section>

<section id="sheet">
  <h2>Performance sheet</h2>
  <p class="sub2">All {len(rows)} builds, as built and with Plus. Tap a column to sort. Swipe sideways on a phone.</p>
  <div class="chips" role="group" aria-label="Filter">
    <button class="chip" data-t="all" aria-pressed="true">All</button><button class="chip" data-t="cars" aria-pressed="false">Cars</button><button class="chip" data-t="machines" aria-pressed="false">Machines</button>
  </div>
  <div class="chips" role="group" aria-label="Tune">
    <button class="chip" data-p="both" aria-pressed="true">Both tunes</button><button class="chip" data-p="built" aria-pressed="false">As built</button><button class="chip" data-p="plus" aria-pressed="false">Plus</button>
  </div>
  <div class="tablewrap"><table class="perf" id="perf"><thead><tr>
    <th data-k="v">Vehicle</th><th data-k="tune">Tune</th><th data-k="t" aria-sort="descending">Top mph</th><th data-k="z60">0–60 s</th><th data-k="q">¼ mile</th><th data-k="z100">0–100 s</th>
    <th data-k="hp">Crank hp</th><th data-k="tq">lb-ft</th><th data-k="whp">Wheel hp</th><th data-k="lb">Weight lb</th><th data-k="drv">Drive</th>
  </tr></thead><tbody></tbody></table></div>
</section>

<section id="builds">
  <h2>Under the hood</h2>
  <p class="sub2">What each build is made of: the parts in every slot, the engine's spec as the game runs it, and what holds its top speed. The stars are open; tap any other build to open it.</p>
  {''.join(f'<div class="vgroup"><h3>{e(v)}</h3>' + ''.join(build_card(r) for r in rs) + '</div>' for v, rs in groups)}
</section>

<section id="method" class="method">
  <h2>How we measured</h2>
  <ul>
    <li><b>The game's own physics.</b> Each build runs in the game's vehicle simulation at 240 steps a second, on flat tarmac, full throttle from a standstill for 150 seconds.</li>
    <li><b>Cars on Realistic</b> with the dev panel's traction at 200%. <b>Machines on Middle</b> with its traction control, because on Realistic at 200% traction the big quads flip over backwards. Governors stay in.</li>
    <li><b>No nitrous.</b> Every time and top speed is without the button. The shot is extra, for about eight seconds.</li>
    <li><b>Crank hp and lb-ft</b> are the engine's peaks as the game builds it from the parts. <b>Wheel hp</b> is the garage bay's dyno pull: power at the drums in the gear nearest 1:1. The bay runs the engine in the sound lab's own simulator, and for the big automatics it reads below what the driving physics puts down: at their top speeds the stars put more than their dyno figure into the air alone. Read it as the dyno's number, not the road's.</li>
    <li><b>¼ mile</b> is the elapsed time and the speed at the line. 0–100 is blank where a vehicle can't reach 100 mph.</li>
    <li><b>Plus</b> is 15% more torque at every rev and a final drive 15% taller (the ratio ÷ 1.15).</li>
    <li><b>What sets the top speed</b> compares the top speed with the speed at the limiter in top gear (from the gears, final drive and tyre size). Within 5% of it, the revs are the limit; below that, the air is. The air's power is ½ × air density (1.2) × drag area × speed³.</li>
  </ul>
</section>

<footer>Back Forty v9 · data from the game's own build and physics, {e(today)} · Draft for the owner, not for release. Pictures to come.</footer>
</div>
<div class="tip" id="tip"></div>
<script type="application/json" id="data">{json.dumps(data_js, separators=(',', ':'))}</script>
<script>
(()=>{{
const D=JSON.parse(document.getElementById('data').textContent);
const fmt=(v,d=0)=>v==null?'–':v.toLocaleString('en-US',{{minimumFractionDigits:d,maximumFractionDigits:d}});
const WHY={{revs:'the limiter in top gear',air:'the air',gov:'a governor'}};
/* ---- top speed bars ---- */
const tip=document.getElementById('tip');
function showTip(ev,d){{tip.innerHTML=`<b>${{d.v}} · ${{d.b}}</b><br><span>As built</span> ${{d.t}} mph<br><span>Plus</span> ${{d.tp}} mph (+${{d.tp-d.t}})<br><span>Held by</span> ${{WHY[d.why]}}`;
  tip.style.display='block';const x=Math.min(innerWidth-250,(ev.clientX||0)+12),y=(ev.clientY||0)+14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.min(innerHeight-120,y)+'px';}}
function hideTip(){{tip.style.display='none';}}
function drawBars(f){{
  const host=document.getElementById('bars'),rows=D.filter(d=>f==='cars'?!d.m:d.m).sort((a,b)=>b.t-a.t||b.tp-a.tp),max=Math.max(...rows.map(d=>Math.max(d.t,d.tp)));
  host.textContent='';
  for(const d of rows){{const el=document.createElement('div');el.className='bar';el.tabIndex=0;
    const p1=d.t/max*100,p2=Math.max(0,d.tp-d.t)/max*100;
    el.innerHTML=`<div class="lab">${{d.star?'★ ':''}}${{d.v}} <small>${{d.b}}</small></div><div class="val"><b>${{d.t}}</b> · ${{d.tp}}</div>
      <div class="track"><div class="seg s1" style="width:${{p1}}%;${{p2?'':'border-radius:0 4px 4px 0'}}"></div>${{p2?`<div class="seg s2" style="width:calc(${{p2}}% - 2px)"></div>`:''}}</div>`;
    el.setAttribute('aria-label',`${{d.v}} ${{d.b}}: ${{d.t}} mph as built, ${{d.tp}} with Plus`);
    el.addEventListener('pointermove',ev=>showTip(ev,d));el.addEventListener('pointerleave',hideTip);
    el.addEventListener('click',ev=>{{showTip(ev,d);clearTimeout(el._t);el._t=setTimeout(hideTip,2600);}});
    host.appendChild(el);}}
}}
document.querySelectorAll('[data-f]').forEach(b=>b.addEventListener('click',()=>{{document.querySelectorAll('[data-f]').forEach(x=>x.setAttribute('aria-pressed',x===b));drawBars(b.dataset.f);}}));
drawBars('cars');
/* ---- the table ---- */
const T={{t:'all',p:'both',k:'t',dir:-1}};
function rowsOf(){{const out=[];
  for(const d of D){{if(T.t==='cars'&&d.m||T.t==='machines'&&!d.m)continue;
    if(T.p!=='plus')out.push({{d,tune:'As built',v:d.v,b:d.b,hp:d.hp,tq:d.tq,whp:d.whp,z60:d.z60,z100:d.z100,q:d.q,t:d.t,lb:d.lb,drv:d.drv,plus:0}});
    if(T.p!=='built')out.push({{d,tune:'Plus',v:d.v,b:d.b,hp:d.hpp,tq:d.tqp,whp:d.whpp,z60:d.z60p,z100:d.z100p,q:d.qp,t:d.tp,lb:d.lbp,drv:d.drv,plus:1}});}}
  const key=r=>T.k==='q'?(r.q?r.q[0]:null):T.k==='v'?r.v+' '+r.b:r[T.k];
  out.sort((a,b)=>{{const x=key(a),y=key(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;
    return (typeof x==='string'?x.localeCompare(y):x-y)*T.dir||a.plus-b.plus;}});
  return out;}}
function drawTable(){{const tb=document.querySelector('#perf tbody');tb.textContent='';
  for(const r of rowsOf()){{const tr=document.createElement('tr');if(r.plus)tr.className='plus';if(r.d.star)tr.classList.add('isstar');
    tr.innerHTML=`<td><b>${{r.v}}</b> <span class="bld">${{r.b}}</span></td><td><i class="sw ${{r.plus?'p':'b'}}"></i>${{r.tune}}</td><td><b>${{r.t}}</b></td><td>${{fmt(r.z60,1)}}</td>`+
      `<td>${{r.q?fmt(r.q[0],1)+' s @ '+r.q[1]:'–'}}</td><td>${{fmt(r.z100,1)}}</td><td>${{fmt(r.hp)}}</td><td>${{fmt(r.tq)}}</td><td>${{fmt(r.whp)}}</td><td>${{fmt(r.lb)}}</td><td>${{r.drv}}</td>`;tb.appendChild(tr);}}
  document.querySelectorAll('#perf th').forEach(th=>{{if(th.dataset.k===T.k)th.setAttribute('aria-sort',T.dir<0?'descending':'ascending');else th.removeAttribute('aria-sort');}});}}
document.querySelectorAll('#perf th').forEach(th=>th.addEventListener('click',()=>{{const k=th.dataset.k;
  if(T.k===k)T.dir=-T.dir;else{{T.k=k;T.dir=['v','tune','drv','z60','z100','q','lb'].includes(k)?1:-1;}}drawTable();}}));
document.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{{document.querySelectorAll('[data-t]').forEach(x=>x.setAttribute('aria-pressed',x===b));T.t=b.dataset.t;drawTable();}}));
document.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{{document.querySelectorAll('[data-p]').forEach(x=>x.setAttribute('aria-pressed',x===b));T.p=b.dataset.p;drawTable();}}));
drawTable();
/* ---- picture slots: try a picture in place (in this page only; nothing is saved) ---- */
document.querySelectorAll('.shot input[type=file]').forEach(inp=>inp.addEventListener('change',()=>{{const f=inp.files&&inp.files[0];if(!f)return;
  const fig=inp.closest('.shot'),img=new Image();img.src=URL.createObjectURL(f);img.alt=fig.dataset.slot;fig.classList.add('has');fig.querySelector('label').replaceWith(img);}}));
}})();
</script>
</body>
</html>
'''
open(OUT, 'w').write(page)
print('wrote', OUT, f'{len(page) / 1024:.0f} KB')
