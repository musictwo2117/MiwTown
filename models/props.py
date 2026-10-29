# Miw's Town: small decorations used over and over (trees, flowers, lamp posts), sculpted in Blender.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/props.py -- models/tree.glb [preview.png]
# The output file's name picks the prop. Each sits on the ground at its origin, in the pages' own units.
# Material names the pages recolor per copy: "leaf" (a tree's canopy) and "petal" (a flower's petals);
# "bulb" is swapped for the pages' night-glowing material.
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

LEAF = material('leaf', '#9fd49a', 0.75)
PETAL = material('petal', '#ff9fb5', 0.7)
BULB = material('bulb', '#fff6d8', 0.3)
WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def prop(fn):
    BUILT[fn.__name__] = fn
    return fn

def trunk(g, h=0.72):
    cyl('trunk', g, 0.09, 0.13, h, (0, h / 2, 0), C('#c9a27e'), r=0.04, seg=16)
    for i in range(3):   # a little root flare
        a = i / 3 * 2 * math.pi + 0.4
        ball(f'root_{i}', g, 0.07, (math.cos(a) * 0.11, 0.03, math.sin(a) * 0.11), C('#c9a27e'), scale=(1.3, 0.6, 1), seg=12)

def puff(g, name, cx, cy, cz, r):
    """A soft, cloud-like canopy: a big ball with smaller ones bulging out around it."""
    ball(name, g, r, (cx, cy, cz), LEAF, seg=24)
    for i in range(6):
        a = i / 6 * 2 * math.pi + 0.3
        ball(f'{name}_bump_{i}', g, r * 0.55, (cx + math.cos(a) * r * 0.62, cy - r * 0.15 + (i % 2) * r * 0.25, cz + math.sin(a) * r * 0.62), LEAF, seg=18)
    ball(f'{name}_crown', g, r * 0.6, (cx, cy + r * 0.55, cz), LEAF, seg=18)

def blossoms(g, name, cx, cy, cz, r, n=6):
    for i in range(n):
        a, h = i / n * 2 * math.pi, 0.15 + (i % 3) * 0.25
        d = Vector((math.cos(a) * math.cos(h), math.sin(h), math.sin(a) * math.cos(h)))
        ball(f'{name}_{i}', g, 0.045, (cx + d.x * r * 1.02, cy + d.y * r * 1.02, cz + d.z * r * 1.02), C('#fff6fa'), seg=10)

@prop
def tree(g):   # one round puff, like the town's single-ball trees
    trunk(g)
    puff(g, 'canopy', 0, 1.05, 0, 0.55)
    blossoms(g, 'dot', 0, 1.05, 0, 0.62)

@prop
def treetall(g):   # two puffs stacked, like the town's two-ball trees
    trunk(g)
    puff(g, 'canopy', 0, 1.05, 0, 0.55)
    puff(g, 'top', 0.12, 1.55, 0, 0.36)
    blossoms(g, 'dot', 0, 1.05, 0, 0.62, 5)

@prop
def flower(g):   # a single flower with five round petals
    tube('stem', g, [tuple(V(*p)) for p in ((0, 0, 0), (0.01, 0.06, 0), (0, 0.12, 0))], [1, 1, 1], C('#8ccf8a'), bevel=0.012)
    ball('leaf_l', g, 0.035, (0.03, 0.04, 0), C('#8ccf8a'), scale=(1.4, 0.4, 0.8), rot=(0, 0, 0.5), seg=10)
    for k in range(5):
        a = k / 5 * 2 * math.pi
        ball(f'petal_{k}', g, 0.045, (math.cos(a) * 0.045, 0.13, math.sin(a) * 0.045), PETAL, scale=(1, 0.5, 1), seg=12)
    ball('heart', g, 0.03, (0, 0.145, 0), C('#ffe08a'), seg=12)

@prop
def lamppost(g):   # the light itself stays in town.html
    cyl('base', g, 0.16, 0.2, 0.1, (0, 0.05, 0), C('#8a7a80'), r=0.03)
    cyl('pole', g, 0.045, 0.06, 1.3, (0, 0.75, 0), C('#8a7a80'), r=0.02, seg=16)
    torus('collar', g, 0.06, 0.02, (0, 1.38, 0), C('#8a7a80'), rot=(math.pi / 2, 0, 0), seg=20, sides=6)
    ball('lantern', g, 0.17, (0, 1.5, 0), BULB, seg=24)
    cyl('cap', g, 0.03, 0.17, 0.12, (0, 1.68, 0), C('#8a7a80'), r=0.03, seg=20)
    ball('finial', g, 0.04, (0, 1.76, 0), C('#8a7a80'), seg=12)
    # a pink ribbon tied round the pole
    torus('ribbon', g, 0.065, 0.025, (0, 1.2, 0), C('#ff9fb5'), rot=(math.pi / 2, 0, 0), seg=20, sides=6)
    for sd in (-1, 1): ball(f'bow_{sd}', g, 0.06, (sd * 0.08, 1.2, 0.05), C('#ff9fb5'), scale=(1, 0.6, 0.4), rot=(0, 0, sd * 0.4), seg=12)

root = scenery(WHO)
BUILT[WHO](root)
finish(reach=0.3, view=0.8 if WHO == 'flower' else 1.4, strength=0.45, join=root)
