# Miw's Town: the bear — round ears, a cream muzzle and a button nose.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/bear.py -- models/bear.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

root, body, head, tail, feet = skeleton('bear')
DARK = material('button', '#4b3442', 0.35)

torso = Ell(body, (0, 0, 0.3), (0.36, 0.33, 0.28), pear=0.12)
torso.body('torso', SKIN, flat_bottom=True)
blob('tummy', body, (0, -0.25, 0.27), (0.21, 0.1, 0.18), CREAM)
for sd in (-1, 1):
    blob(f'paw_{"LR"[sd > 0]}', body, (sd * 0.17, -0.28, 0.21), (0.075, 0.08, 0.075), SKIN, rot=(0.3, 0, sd * 0.2))

h = Ell(head, (0, 0, 0), (0.43, 0.37, 0.36))
h.body('skull', SKIN, seg=40, ring=24)

for sd in (-1, 1):
    p, n = h.at(sd * 0.62, 0.72)
    blob(f'ear_{"LR"[sd > 0]}', head, p, (0.125, 0.07, 0.12), SKIN, rot=(0, sd * 0.35, 0))
    blob(f'ear_in_{"LR"[sd > 0]}', head, p + Vector((0, -0.045, -0.005)), (0.075, 0.035, 0.07), PINK, rot=(0, sd * 0.35, 0))

eyes(h, 0.32, 0.03, (0.06, 0.075))
blush(h, 0.62, -0.18)
mp, mn = h.at(0, -0.3, -0.06)
muzzle = Ell(head, mp, (0.16, 0.11, 0.115))
muzzle.body('muzzle', CREAM, seg=28, ring=16)
muzzle.decal('nose', 0, 0.42, (0.055, 0.038, 0.035), DARK, out=-0.01)
muzzle.stroke('nose_line', [(0, 0.2), (0, -0.05)], MOUTH, 0.007)
smile(muzzle, pitch=-0.12, width=0.3, depth=0.12, thick=0.008)

tail.location = (0, 0.31, 0.16)
blob('stub', tail, (0, 0, 0), (0.09, 0.08, 0.08), SKIN)

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.03, -0.005), (0.105, 0.13, 0.068), SKIN)
    blob(f'pad{f.name[-2:]}', f, (0, -0.15, 0.0), (0.06, 0.02, 0.04), PINK)

finish()
