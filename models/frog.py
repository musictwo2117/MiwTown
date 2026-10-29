# Miw's Town: the frog — a wide grin, eyes up on bulbs, freckles on the back and toe beans.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/frog.py -- models/frog.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

FROG = material('frog', '#9fd49a')
BELLY = material('frogbelly', '#e8f6cf')
SPOT = material('frogspot', '#7fbf7a')
WHITE = material('white', '#ffffff', 0.35)
root, body, head, tail, feet = skeleton('frog')

torso = Ell(body, (0, 0, 0.29), (0.37, 0.33, 0.26), pear=0.18)
torso.body('torso', FROG, flat_bottom=True)
blob('tummy', body, (0, -0.25, 0.26), (0.22, 0.1, 0.17), BELLY)
for sd in (-1, 1):
    blob(f'paw_{"LR"[sd > 0]}', body, (sd * 0.18, -0.28, 0.19), (0.07, 0.075, 0.06), FROG, rot=(0.3, 0, sd * 0.2))

head.location.z = 0.8
h = Ell(head, (0, 0, 0), (0.5, 0.38, 0.3))
h.body('skull', FROG, seg=40, ring=24)

for sd in (-1, 1):
    s = "LR"[sd > 0]
    p, n = h.at(sd * 0.42, 0.62)
    bulb = Ell(head, p + Vector((0, 0, 0.03)), (0.15, 0.14, 0.14))
    bulb.body(f'bulb_{s}', FROG, seg=28, ring=16)
    bulb.decal(f'white_{s}', 0, 0.12, (0.11, 0.11, 0.05), WHITE, out=-0.01)
    bulb.decal(f'eye_{s}', sd * 0.06, 0.1, (0.07, 0.08, 0.035), EYE, out=0.025)
    bulb.decal(f'shine_{s}', sd * 0.15, 0.3, (0.03, 0.028, 0.02), SHINE, out=0.05)

smile(h, pitch=-0.08, width=0.36, depth=0.08, thick=0.012)
blush(h, 0.62, -0.22, (0.08, 0.045))
for sd in (-1, 1):
    h.decal(f'nostril_{"LR"[sd > 0]}', sd * 0.06, 0.12, (0.012, 0.009, 0.01), SPOT, out=0.002)

# freckles on the back of the head and the back
for j, (yaw, pitch, r) in enumerate([(2.7, 0.4, 0.05), (3.4, 0.55, 0.04), (3.0, 0.1, 0.035), (3.6, 0.2, 0.05)]):
    h.decal(f'freckle_h{j}', yaw, pitch, (r, r * 0.9, 0.012), SPOT, out=0.001)
for j, (yaw, pitch, r) in enumerate([(2.8, 0.4, 0.055), (3.5, 0.5, 0.045), (3.15, -0.05, 0.06), (2.5, -0.15, 0.04), (3.8, 0.0, 0.045)]):
    torso.decal(f'freckle_b{j}', yaw, pitch, (r, r * 0.9, 0.012), SPOT, out=0.001)

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.02, -0.02), (0.12, 0.12, 0.05), FROG)
    for k, dx in enumerate((-0.07, 0, 0.07)):
        blob(f'toe{f.name[-2:]}{k}', f, (dx, -0.14 + abs(dx) * 0.4, -0.02), (0.035, 0.035, 0.03), FROG)

finish()
