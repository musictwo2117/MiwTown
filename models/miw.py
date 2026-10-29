# Miw's Town: Miw — a little girl with orange braids tied with pink bows, pink glasses and a yellow polka-dot dress.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/miw.py -- models/miw.glb [preview.png]
import os, sys, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

FACE = material('miwskin', '#ffd9c4')
HAIR = material('hair', '#d2541c')
HAIR_DK = material('hairdark', '#a83f12')
DRESS = material('dress', '#ffd23f')
DOT = material('dot', '#ffffff', 0.5)
BOOT = material('boot', '#f2a33a', 0.45)
SOLE = material('sole', '#7a4a2a')
FRAME = material('glasses', '#ff6fae', 0.35)
LIPS = material('lips', '#e8506e', 0.5)
TONGUE = material('tongue', '#ff9fb5', 0.5)
root, body, head, tail, feet = skeleton('miw')
head.location.z = 0.98
head.scale = (1.12, 1.12, 1.12)
for sd, f in zip((-1, 1), feet): f.location.x = sd * 0.11

# the dress: a bell turned on a lathe, with polka dots and a bunny badge
PROFILE = [(0.06, 0.78), (0.13, 0.77), (0.165, 0.74), (0.175, 0.68), (0.19, 0.6), (0.23, 0.5), (0.28, 0.4), (0.33, 0.29), (0.37, 0.2), (0.385, 0.15), (0.37, 0.125), (0.3, 0.12)]
lathe('dress', body, (0, 0, 0), PROFILE, DRESS, seg=40)
def dress_r(z):
    for (r0, z0), (r1, z1) in zip(PROFILE, PROFILE[1:]):
        if z1 <= z <= z0: return r0 + (r1 - r0) * (z0 - z) / (z0 - z1)
    return PROFILE[-1][0]
rnd = random.Random(7)
for i in range(34):
    a, z = rnd.uniform(0, 2 * math.pi), rnd.uniform(0.18, 0.66)
    if abs(math.atan2(math.sin(a), math.cos(a))) < 0.5 and z > 0.5: continue   # keep the badge clear
    r = dress_r(z) + 0.004
    slope = (dress_r(z - 0.02) - dress_r(z + 0.02)) / 0.04
    n = Vector((math.sin(a), -math.cos(a), slope)).normalized()
    d = blob(f'dot_{i}', body, (math.sin(a) * r, -math.cos(a) * r, z), (0.024, 0.024, 0.008), DOT, seg=12, ring=8)
    d.rotation_mode = 'QUATERNION'; d.rotation_quaternion = n.to_track_quat('Z', 'Y')
blob('badge', body, (0, -0.185, 0.6), (0.045, 0.02, 0.04), DOT)
for sd in (-1, 1):
    blob(f'badge_ear_{"LR"[sd > 0]}', body, (sd * 0.018, -0.19, 0.655), (0.012, 0.01, 0.028), DOT, rot=(0, sd * 0.25, 0))
# a round white collar
for sd in (-1, 1):
    blob(f'collar_{"LR"[sd > 0]}', body, (sd * 0.07, -0.13, 0.765), (0.085, 0.06, 0.025), DOT, rot=(0.25, 0, sd * 0.3))

# arms reaching out a little
for sd in (-1, 1):
    s = "LR"[sd > 0]
    tube(f'arm_{s}', body, [(sd * 0.14, 0, 0.7), (sd * 0.25, -0.03, 0.6), (sd * 0.35, -0.07, 0.5)], [1, 0.95, 0.9], FACE, bevel=0.045)
    blob(f'hand_{s}', body, (sd * 0.37, -0.08, 0.48), (0.058, 0.058, 0.06), FACE)
    blob(f'sleeve_{s}', body, (sd * 0.16, -0.005, 0.69), (0.075, 0.075, 0.065), DRESS)
    tube(f'leg_{s}', body, [(sd * 0.11, -0.01, 0.16), (sd * 0.11, -0.01, 0.1)], [1, 1], FACE, bevel=0.048)

# head
h = Ell(head, (0, 0, 0), (0.37, 0.34, 0.34))
h.body('face', FACE, seg=40, ring=24)
for sd in (-1, 1):
    blob(f'ear_{"LR"[sd > 0]}', head, (sd * 0.36, 0.01, -0.03), (0.06, 0.04, 0.07), FACE)

# hair: a cap pulled back off the face, a fringe of soft locks, and two braids
def cap(co):
    if co.y < -0.15 and co.z < 0.42:
        co.y = -0.15 + (co.y + 0.15) * 0.05
blob('hair', head, (0, 0.025, 0.03), (0.395, 0.37, 0.37), HAIR, seg=40, ring=24, shape=cap)
for i, yaw in enumerate([-0.62, -0.38, -0.13, 0.13, 0.38, 0.62]):
    h.decal(f'fringe_{i}', yaw, 0.5 - abs(yaw) * 0.25, (0.095, 0.07, 0.05), HAIR_DK if i % 2 else HAIR, out=-0.012, spin=-yaw * 0.6)
for sd in (-1, 1):
    s = "LR"[sd > 0]
    for i, r in enumerate([0.1, 0.095, 0.088, 0.078, 0.066]):
        blob(f'braid_{s}{i}', head, (sd * (0.33 + i * 0.012), 0.07, -0.25 - i * 0.115), (r, r, r * 1.15), HAIR_DK if i % 2 else HAIR, seg=20, ring=12)
    blob(f'braid_tip_{s}', head, (sd * 0.39, 0.07, -0.86), (0.05, 0.05, 0.08), HAIR, seg=16, ring=10,
         shape=lambda co: (co.__setitem__(0, co.x * (1 - 0.6 * max(0.0, -co.z))), co.__setitem__(1, co.y * (1 - 0.6 * max(0.0, -co.z)))))
    # a pink bow at the top of each braid
    bow = node(f'bow_{s}', head, (sd * 0.38, -0.02, -0.2))
    bow.rotation_euler = (0, 0, sd * 0.5)
    blob(f'bow_knot_{s}', bow, (0, 0, 0), (0.035, 0.035, 0.035), FRAME)
    for k in (-1, 1):
        blob(f'bow_loop_{s}{k}', bow, (k * 0.07, 0, 0), (0.07, 0.03, 0.05), FRAME, rot=(0, k * 0.3, 0))

# face: big eyes behind pink glasses, blush and an open smile
eyes(h, 0.33, -0.04, (0.065, 0.085))
for sd in (-1, 1):
    p, n = h.at(sd * 0.33, -0.04, 0.035)
    ring(f'lens_{"LR"[sd > 0]}', head, p, 0.095, 0.014, FRAME, n.to_track_quat('Z', 'Y'))
h.stroke('bridge', [(-0.1, -0.02), (0, 0.0), (0.1, -0.02)], FRAME, 0.012, out=0.04)
blush(h, 0.5, -0.3, (0.07, 0.04))
h.decal('mouth', 0, -0.42, (0.042, 0.026, 0.018), LIPS, out=-0.004)
h.decal('tongue', 0, -0.44, (0.024, 0.012, 0.01), TONGUE, out=0.007)

for f in feet:
    blob(f'boot{f.name[-2:]}', f, (0, -0.0, 0.015), (0.09, 0.09, 0.075), BOOT)
    blob(f'toe{f.name[-2:]}', f, (0, -0.07, -0.01), (0.085, 0.1, 0.06), BOOT)
    blob(f'sole{f.name[-2:]}', f, (0, -0.04, -0.06), (0.09, 0.14, 0.018), SOLE)

finish()
