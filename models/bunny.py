# Miw's Town: the bunny — snow white, long ears (one a little floppier), buck teeth and a cotton-ball tail.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/bunny.py -- models/bunny.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

FUR = material('bunny', '#fffaf6')
TUMMY = material('bunnybelly', '#ffeef0')
root, body, head, tail, feet = skeleton('bunny')

torso = Ell(body, (0, 0, 0.3), (0.33, 0.31, 0.27), pear=0.14)
torso.body('torso', FUR, flat_bottom=True)
blob('tummy', body, (0, -0.24, 0.27), (0.18, 0.1, 0.17), TUMMY)
for sd in (-1, 1):
    blob(f'paw_{"LR"[sd > 0]}', body, (sd * 0.14, -0.29, 0.2), (0.06, 0.07, 0.06), CREAM, rot=(0.3, 0, sd * 0.2))

h = Ell(head, (0, 0, 0), (0.42, 0.36, 0.36))
h.body('skull', FUR, seg=40, ring=24)
# cheek puffs make the face rounder
for sd in (-1, 1):
    h.decal(f'cheek_{"LR"[sd > 0]}', sd * 0.5, -0.32, (0.14, 0.1, 0.08), FUR, out=-0.05)

# long ears: a node at the base of each, tilted, holding the ear and its pink inside
def ear_shape(co):
    k = 1 - 0.3 * max(0.0, co.z) - 0.25 * max(0.0, -co.z)
    co.x *= k; co.y *= k
for sd, tilt, droop in ((-1, 0.2, 0.15), (1, 0.42, 0.5)):
    p, n = h.at(sd * 0.3, 1.0)
    e = node(f'ear_{"LR"[sd > 0]}', head, p - n * 0.04)
    e.rotation_euler = (droop * 0.6, sd * tilt, 0)
    blob(f'ear_out_{"LR"[sd > 0]}', e, (0, 0, 0.24), (0.105, 0.065, 0.28), FUR, shape=ear_shape)
    blob(f'ear_in_{"LR"[sd > 0]}', e, (0, -0.035, 0.25), (0.06, 0.04, 0.21), PINK, shape=ear_shape)

eyes(h, 0.34, -0.05)
blush(h, 0.64, -0.22)
h.decal('nose', 0, -0.13, (0.03, 0.022, 0.02), NOSE, out=0.006)
omega_mouth(h, pitch=-0.19, width=0.1, depth=0.035)
for sd in (-1, 1):
    h.decal(f'tooth_{"LR"[sd > 0]}', sd * 0.022, -0.29, (0.02, 0.03, 0.012), SHINE, out=0.004)

# cotton-ball tail
tail.location = (0, 0.3, 0.2)
blob('puff', tail, (0, 0, 0), (0.11, 0.1, 0.1), CREAM)

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.05, -0.012), (0.095, 0.15, 0.058), CREAM)

finish()
