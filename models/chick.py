# Miw's Town: the chick — a round yellow puff with a feather tuft, tiny wings and orange toes.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/chick.py -- models/chick.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

CHICK = material('chick', '#ffe07a')
LIGHT = material('chickbelly', '#fff6cf')
ORANGE = material('orange', '#ffa94d', 0.45)
root, body, head, tail, feet = skeleton('chick')

torso = Ell(body, (0, 0, 0.32), (0.34, 0.32, 0.3), pear=0.1)
torso.body('torso', CHICK, flat_bottom=True)
blob('tummy', body, (0, -0.22, 0.28), (0.2, 0.12, 0.19), LIGHT)
# little wings, flicked out at the tips
for sd in (-1, 1):
    blob(f'wing_{"LR"[sd > 0]}', body, (sd * 0.33, 0.0, 0.36), (0.06, 0.13, 0.15), CHICK, rot=(0.3, sd * -0.5, 0))

h = Ell(head, (0, 0, 0), (0.4, 0.36, 0.36))
h.body('skull', CHICK, seg=40, ring=24)
# a three-feather tuft
for j, (yaw, lean, s) in enumerate(((-0.25, -0.5, 0.8), (0, 0.1, 1.0), (0.25, 0.6, 0.8))):
    p, n = h.at(math.pi * 0.95 + yaw * 0.6, 1.25)
    blob(f'tuft_{j}', head, p + Vector((0, 0, 0.06 * s)), (0.04 * s, 0.035 * s, 0.11 * s), CHICK, rot=(0.35, lean, 0))

eyes(h, 0.3, 0.02, (0.062, 0.078))
blush(h, 0.58, -0.14)
p, n = h.at(0, -0.12)
beak(head, p + n * 0.02 + Vector((0, 0, 0.014)), (0.075, 0.07, 0.04), ORANGE, 'beak_top')
beak(head, p + n * 0.01 - Vector((0, 0, 0.022)), (0.055, 0.05, 0.028), ORANGE, 'beak_bottom')

# tail feathers fanning up behind
tail.location = (0, 0.3, 0.28)
for j, lean in enumerate((-0.35, 0, 0.35)):
    blob(f'feather_{j}', tail, (lean * 0.08, 0.04, 0.05), (0.04, 0.04, 0.1), CHICK, rot=(-0.7, lean, 0))

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.02, -0.02), (0.06, 0.07, 0.04), ORANGE)
    toes(f, ORANGE, 0.035, 0.06, 0.1)

# pivots for animation: wings flap from the shoulder, the tuft bounces, eyes blink
wings = [group(f'wing_pivot_{s}', body, (sd * 0.3, 0.0, 0.46), [f'wing_{s}']) for s, sd in (('L', -1), ('R', 1))]
tuft = group('tuft_pivot', head, h.at(math.pi * 0.95, 1.25)[0], [f'tuft_{j}' for j in range(3)])
animate(body, head, tail, feet,
        limbs=[(wings[0], 1, 0.55, 0), (wings[1], 1, -0.55, 0)],
        ears=[(tuft, 0, 0.3)],
        eyes=[eye_group(head, s) for s in 'LR'])

finish()
