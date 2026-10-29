# Miw's Town: the penguin — a heart-shaped white face, a cosy pink scarf and orange flippy feet.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/penguin.py -- models/penguin.glb [preview.png]
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

NAVY = material('penguin', '#56658a')
SNOW = material('snow', '#ffffff', 0.5)
ORANGE = material('orange', '#ffa94d', 0.45)
SCARF = material('scarf', '#ff8fb1', 0.8)
SCARF_DK = material('scarfstripe', '#ffd6e2', 0.8)
root, body, head, tail, feet = skeleton('penguin')

torso = Ell(body, (0, 0, 0.32), (0.35, 0.32, 0.31), pear=0.12)
torso.body('torso', NAVY, flat_bottom=True)
torso.decal('belly', 0, -0.1, (0.26, 0.27, 0.13), SNOW, out=-0.1)
for sd in (-1, 1):
    blob(f'flipper_{"LR"[sd > 0]}', body, (sd * 0.34, 0.0, 0.32), (0.05, 0.12, 0.2), NAVY, rot=(0.15, sd * -0.45, 0))

h = Ell(head, (0, 0, 0), (0.42, 0.37, 0.36))
h.body('skull', NAVY, seg=40, ring=24)
# heart-shaped face: two overlapping white lobes
for sd in (-1, 1):
    h.decal(f'face_{"LR"[sd > 0]}', sd * 0.22, -0.02, (0.2, 0.24, 0.1), SNOW, out=-0.08, spin=-sd * 0.25)
eyes(h, 0.27, 0.0, (0.06, 0.075), out=0.02)
blush(h, 0.5, -0.2, out=0.022)
p, n = h.at(0, -0.15)
beak(head, p + n * 0.05, (0.06, 0.07, 0.035), ORANGE)

# a little scarf round the neck, with stripes on the hanging end
ring('scarf', body, (0, 0, 0.6), 0.24, 0.065, SCARF, Quaternion())
end = node('scarf_end', body, (0.13, -0.27, 0.58))
end.rotation_euler = (0.2, -0.25, 0)
blob('scarf_tail', end, (0, 0, -0.1), (0.06, 0.025, 0.12), SCARF)
for j in range(2):
    blob(f'scarf_band_{j}', end, (0, -0.002, -0.06 - j * 0.07), (0.061, 0.026, 0.014), SCARF_DK)

tail.location = (0, 0.27, 0.16)
beak(tail, (0, 0.04, 0), (0.08, 0.08, 0.035), NAVY, 'tail_flick').rotation_euler = (0, 0, math.pi)

for f in feet:
    blob(f'foot{f.name[-2:]}', f, (0, -0.04, -0.03), (0.09, 0.12, 0.04), ORANGE)
    toes(f, ORANGE, 0.035, 0.06, 0.13)

finish()
