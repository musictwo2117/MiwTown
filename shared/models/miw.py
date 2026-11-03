# Miw's Town: Miw — a little girl with long straight dark hair and blunt bangs, round gold glasses, a big yellow sweater,
# brown shorts, white socks and sneakers, and a little brown backpack.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P shared/models/miw.py -- shared/models/miw.glb [preview.png]
import os, sys, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

FACE = material('miwskin', '#ffd9c4')
HAIR = material('hairfull', '#33263a')       # 'full' colors are left out of the pastel pass, so the hair stays deep
HAIR_DK = material('hairfulldk', '#271c2e')
SWEATER = material('sweater', '#ffd75e')
SHORTS = material('shorts', '#b08d6e')
WHITE = material('collar', '#ffffff', 0.5)
SOLE = material('sole', '#e9dcc8')
SNEAK_Y = material('sneaker', '#f6d36a', 0.45)
FRAME = material('glasses', '#f0c850', 0.35)
PACK = material('pack', '#a85a40', 0.6)
PACK_DK = material('packflap', '#8a4631', 0.6)
root, body, head, tail, feet = skeleton('miw')
for sd, f in zip((-1, 1), feet): f.location.x = sd * 0.11

# shorts peeking out under a big, soft sweater (two lathes: the sweater rounds out, then a ribbed hem tucks in)
lathe('shorts', body, (0, 0, 0), [(0.2, 0.36), (0.24, 0.3), (0.255, 0.2), (0.25, 0.15), (0.2, 0.14)], SHORTS, seg=40)
lathe('sweater', body, (0, 0, 0), [(0.06, 0.78), (0.13, 0.77), (0.2, 0.735), (0.265, 0.67), (0.3, 0.56), (0.305, 0.45), (0.29, 0.37), (0.265, 0.325), (0.26, 0.3), (0.225, 0.295)], SWEATER, seg=40)
lathe('hem', body, (0, 0, 0), [(0.272, 0.36), (0.285, 0.33), (0.275, 0.295), (0.235, 0.285)], SWEATER, seg=40)
# a round white collar
for sd in (-1, 1):
    blob(f'collar_{"LR"[sd > 0]}', body, (sd * 0.07, -0.13, 0.765), (0.085, 0.06, 0.025), WHITE, rot=(0.25, 0, sd * 0.3))

# a little backpack with a flap, and straps over the shoulders (rbox takes three.js axes: x, up, forward)
rbox('pack', body, (0.34, 0.34, 0.2), (0, 0.5, -0.27), PACK, r=0.07)
rbox('pack_flap', body, (0.35, 0.2, 0.215), (0, 0.62, -0.27), PACK_DK, r=0.06)
blob('pack_pocket', body, (0, 0.375, 0.44), (0.1, 0.03, 0.08), PACK_DK)
for sd in (-1, 1):
    tube(f'strap_{"LR"[sd > 0]}', body, [(sd * 0.12, 0.17, 0.7), (sd * 0.16, 0.0, 0.8), (sd * 0.15, -0.13, 0.66), (sd * 0.14, -0.14, 0.55)], [1, 1, 1, 1], PACK_DK, bevel=0.025)

# arms reaching out a little, in wide sweater sleeves with soft cuffs
for sd in (-1, 1):
    s = "LR"[sd > 0]
    tube(f'arm_{s}', body, [(sd * 0.3, -0.05, 0.52), (sd * 0.35, -0.07, 0.5)], [1, 0.95], FACE, bevel=0.045)
    blob(f'hand_{s}', body, (sd * 0.37, -0.08, 0.47), (0.058, 0.058, 0.06), FACE)
    tube(f'sleeve_{s}', body, [(sd * 0.15, 0, 0.71), (sd * 0.26, -0.03, 0.62), (sd * 0.32, -0.06, 0.54)], [1, 1.1, 1.05], SWEATER, bevel=0.082)
    blob(f'cuff_{s}', body, (sd * 0.33, -0.065, 0.53), (0.075, 0.075, 0.05), SWEATER, rot=(0, sd * 0.5, 0))
    tube(f'leg_{s}', body, [(sd * 0.11, -0.01, 0.16), (sd * 0.11, -0.01, 0.1)], [1, 1], FACE, bevel=0.048)

# head
h = Ell(head, (0, 0, 0), (0.36, 0.34, 0.36))
h.body('face', FACE, seg=40, ring=24)
for sd in (-1, 1):
    blob(f'ear_{"LR"[sd > 0]}', head, (sd * 0.335, 0.01, -0.03), (0.05, 0.035, 0.065), FACE)

# hair: one smooth shell, long and straight. It covers the skull and falls past the chin, tapering softly at the ends; at the
# front it is cut away below a straight line across the forehead, which makes the blunt bangs, and the sides frame the face
SX, SY, SZ, CY, CZ = 0.4, 0.43, 0.5, 0.02, -0.08
def hair_shell(co):
    if co.z < -0.55: co.z = -0.55 + (co.z + 0.55) * 0.35                    # ends taper instead of a flat chop
    if co.y * SY + CY < -0.15 and co.z * SZ + CZ < 0.09: co.y = (-0.15 - CY) / SY + (co.y * SY + CY + 0.15) * 0.05 / SY   # the face shows through
blob('hair', head, (0, CY, CZ), (SX, SY, SZ), HAIR, seg=56, ring=44, shape=hair_shell)

# face: bead eyes behind pink glasses, rosy cheeks and a tiny w mouth
eyes(h, 0.43, -0.16, size=0.042)
for sd in (-1, 1):
    p, n = h.at(sd * 0.43, -0.16, 0.035)
    ring(f'lens_{"LR"[sd > 0]}', head, p, 0.105, 0.014, FRAME, n.to_track_quat('Z', 'Y'))
h.stroke('bridge', [(-0.144, -0.14), (0, -0.12), (0.144, -0.14)], FRAME, 0.012, out=0.04)
blush(h, 0.67, -0.37)
omega_mouth(h, pitch=-0.49, width=0.07, depth=0.028)

for f in feet:
    blob(f'sock{f.name[-2:]}', f, (0, 0.0, 0.1), (0.055, 0.055, 0.08), WHITE)
    blob(f'boot{f.name[-2:]}', f, (0, -0.0, 0.015), (0.09, 0.09, 0.075), WHITE)
    blob(f'toe{f.name[-2:]}', f, (0, -0.07, -0.01), (0.085, 0.1, 0.06), WHITE)
    blob(f'lace{f.name[-2:]}', f, (0, -0.045, 0.05), (0.05, 0.05, 0.02), SNEAK_Y)
    blob(f'sole{f.name[-2:]}', f, (0, -0.04, -0.06), (0.09, 0.14, 0.018), SOLE)

# pivots for animation: arms swing from the shoulder, eyes blink, and the legs go with the boots
arms = [group(f'arm_pivot_{s}', body, (sd * 0.14, 0.0, 0.7), [f'arm_{s}', f'hand_{s}', f'sleeve_{s}', f'cuff_{s}']) for s, sd in (('L', -1), ('R', 1))]
for f in feet:
    leg = bpy.data.objects[f'leg{f.name[-2:]}']
    leg.parent = f
    leg.location = leg.location - f.location
chibi(body, head, head_z=0.9, grow=1.28, shrink=0.84)
animate(body, head, tail, feet,
        limbs=[(arms[0], 0, 0.45, math.pi), (arms[1], 0, 0.45, 0)],
        eyes=[eye_group(head, s) for s in 'LR'])

pastel()
finish()
