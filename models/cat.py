# Miw's Town: the cat — chubby, big-eared, with tabby stripes and white socks.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/cat.py -- models/cat.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

STRIPE = material('stripe', '#d97a4f')
root, body, head, tail, feet = skeleton('cat')

torso = Ell(body, (0, 0, 0.3), (0.34, 0.32, 0.27), pear=0.14)
torso.body('torso', SKIN, flat_bottom=True)
blob('tummy', body, (0, -0.25, 0.26), (0.17, 0.09, 0.15), CREAM)
for sd in (-1, 1):
    blob(f'paw_{"LR"[sd > 0]}', body, (sd * 0.15, -0.29, 0.2), (0.065, 0.07, 0.065), CREAM, rot=(0.3, 0, sd * 0.2))

h = Ell(head, (0, 0, 0), (0.43, 0.36, 0.35))
h.body('skull', SKIN, seg=40, ring=24)

# big rounded ears, tilted outwards, with pink insides
def ear_shape(co):
    k = 1 - 0.55 * max(0.0, co.z)
    co.x *= k; co.y *= k
for sd in (-1, 1):
    p, n = h.at(sd * 0.56, 0.7)
    loc, rot = p - n * 0.05, (0.05, sd * 0.38, 0)
    blob(f'ear_{"LR"[sd > 0]}', head, loc, (0.2, 0.1, 0.21), SKIN, rot=rot, shape=ear_shape)
    blob(f'ear_in_{"LR"[sd > 0]}', head, loc + Vector((0, -0.06, -0.03)), (0.115, 0.05, 0.125), PINK, rot=rot, shape=ear_shape)

eyes(h); blush(h)
h.decal('nose', 0, -0.15, (0.034, 0.024, 0.02), NOSE, out=0.005)
omega_mouth(h)
for sd in (-1, 1):
    for j, tilt in enumerate((0.05, -0.05)):
        a = h.at(sd * 0.78, -0.12 + tilt, 0.004)[0]
        b = a + Vector((sd * 0.09, -0.02, tilt * 0.9))
        tube(f'whisker_{"LR"[sd > 0]}{j}', head, [tuple(a), tuple(a.lerp(b, 0.5)), tuple(b)], [1, 0.8, 0.5], MOUTH, bevel=0.005)

# tabby stripes: three on the forehead, arcs over the back of the head and the back
for j, yaw in enumerate((-0.15, 0, 0.15)):
    h.decal(f'brow_{j}', yaw, 0.4 + (0.05 if yaw == 0 else 0), (0.022, 0.065, 0.012), STRIPE, out=0.002, spin=yaw * 1.6)
arc = lambda span: [-span + 2 * span * i / 12 for i in range(13)]
for j, pitch in enumerate((0.5, 0.18)):
    h.stroke(f'crown_{j}', [(math.pi + a, pitch) for a in arc(0.8)], STRIPE, 0.024, out=-0.006, radii=taper(13))
for j, pitch in enumerate((0.58, 0.15, -0.25)):
    torso.stroke(f'stripe_{j}', [(math.pi + a, pitch) for a in arc(1.0)], STRIPE, 0.024, out=-0.006, radii=taper(13))

# an S-curve tail that hooks at a cream tip
tail.location = (0, 0.29, 0.2)
tube('tail_mesh', tail, [(0, -0.02, 0), (0, 0.12, 0.03), (0, 0.22, 0.14), (0, 0.25, 0.29), (0, 0.31, 0.39), (0, 0.39, 0.41)],
     [1, 1, 0.95, 0.9, 0.85, 0.8], SKIN, bevel=0.055)
blob('tail_tip', tail, (0, 0.39, 0.41), (0.052, 0.052, 0.052), CREAM)

for f in feet:
    blob(f'sock{f.name[-2:]}', f, (0, -0.03, -0.01), (0.1, 0.12, 0.06), CREAM)

finish()
