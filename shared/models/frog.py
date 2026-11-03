# Miw's Town: the frog — bead eyes on two round bumps, a wide smile, tiny nostrils and toe beans.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P shared/models/frog.py -- shared/models/frog.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

FROG = material('frog', '#9fd49a')
BELLY = material('frogbelly', '#e8f6cf')
SPOT = material('frogspot', '#7fbf7a')
root, body, head, tail, feet = skeleton('frog')

torso = Ell(body, (0, 0, 0.29), (0.37, 0.33, 0.26), pear=0.18)
torso.body('torso', FROG, flat_bottom=True)
blob('tummy', body, (0, -0.25, 0.26), (0.22, 0.1, 0.17), BELLY)
for sd in (-1, 1):
    blob(f'paw_{"LR"[sd > 0]}', body, (sd * 0.18, -0.28, 0.19), (0.07, 0.075, 0.06), FROG, rot=(0.3, 0, sd * 0.2))

h = Ell(head, (0, 0, 0), (0.44, 0.38, 0.4))
h.body('skull', FROG, seg=40, ring=24)

# two round bumps on top of the head, sunk in so they're part of it, each with a bead eye on its front
for sd in (-1, 1):
    s = "LR"[sd > 0]
    p, n = h.at(sd * 0.42, 0.6)
    bulb = Ell(head, p - n * 0.06, (0.155, 0.143, 0.14))
    bulb.body(f'bulb_{s}', FROG, seg=28, ring=16)
    bulb.decal(f'eye_{s}', sd * 0.12, 0.2, (0.048, 0.048, 0.03), EYE)
    bulb.decal(f'shine_{s}', sd * 0.31, 0.42, (0.015, 0.015, 0.015), SHINE, out=0.02)

smile(h, pitch=-0.2, width=0.24, depth=0.05, thick=0.011)   # a wide frog smile, where the others have a w
blush(h, 0.72, -0.36)
for sd in (-1, 1):
    h.decal(f'nostril_{"LR"[sd > 0]}', sd * 0.06, -0.06, (0.012, 0.009, 0.01), SPOT, out=0.002)

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.02, -0.02), (0.12, 0.12, 0.05), FROG)
    for k, dx in enumerate((-0.07, 0, 0.07)):
        blob(f'toe{f.name[-2:]}{k}', f, (dx, -0.14 + abs(dx) * 0.4, -0.02), (0.035, 0.035, 0.03), FROG)

# pivots for animation: each eye bump (holding its blinking eye) bobs, paws swing
blinks = [eye_group(head, s) for s in 'LR']
bumps = [group(f'bulb_pivot_{s}', head, bpy.data.objects[f'bulb_{s}'].location.copy() - Vector((0, 0, 0.1)), [f'bulb_{s}', f'blink_{s}']) for s in 'LR']
paws = [group(f'paw_pivot_{s}', body, (sd * 0.18, -0.21, 0.3), [f'paw_{s}']) for s, sd in (('L', -1), ('R', 1))]
cheesecake_slice(chibi(body, head, head_z=0.78, grow=1.08))
animate(body, head, tail, feet,
        limbs=[(paws[0], 0, 0.35, math.pi), (paws[1], 0, 0.35, 0)],
        ears=[(b, 0, 0.12) for b in bumps],
        eyes=blinks)

pastel()
finish()
