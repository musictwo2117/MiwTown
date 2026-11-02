# Miw's Town: the little pictures Cheesecake Rush uses where it used to use emoji, sculpted in Blender.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/icons.py -- models/strawberry.glb [preview.png]
# The output file's name picks the icon. Each stands on the ground at its origin, about one unit tall, facing +z,
# in the same soft toy style as the characters. The game turns each model into a small picture once it loads.
#   ingredients  strawberry egg cheese flour cookie milk butter chocolate pretzel sparkle
#   money        coin banknote moneybag phone receipt
#   feelings     heart star flame angry thought
#   shop         clock bell lock pan spoon bowl ribbon chefhat sprout mallet finger
#   buttons      speaker mute gear bin disk
# Written in the pages' own coordinates (y up, the front faces +z), like the buildings and furniture.
import os, sys, math, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def icon(fn):
    BUILT[fn.__name__] = fn
    return fn

GOLD, GOLD_DK, PINK, ROSE, CREAM, WOOD, INK = '#ffd466', '#f0b43a', '#ff9fbf', '#ff7ea6', '#fff6ea', '#e8b886', '#4b3442'

def shine(g, name, loc, r=0.06):
    ball(name, g, r, loc, C('#ffffff', 0.3), scale=(1, 0.8, 0.5), seg=10)

def outline(fn, n, scale):
    """Points of a closed curve fn(t) for t in [0, 2pi), scaled."""
    return [(fn(2 * math.pi * k / n)[0] * scale, fn(2 * math.pi * k / n)[1] * scale) for k in range(n)]

def starpoints(points, outer, inner, turn=0.0):
    pts = []
    for k in range(points * 2):
        a = turn + math.pi / 2 + k * math.pi / points
        r = outer if k % 2 == 0 else inner
        pts.append((r * math.cos(a), r * math.sin(a)))
    return pts

# ---------- ingredients ----------
@icon
def strawberry(g):
    red = C('#ef5470', 0.35)
    ball('body', g, 0.42, (0, 0.52, 0), red, scale=(1, 1.08, 1), seg=26)
    cyl('tip', g, 0.36, 0.07, 0.36, (0, 0.2, 0), red, r=0.05, seg=26)
    for k in range(6):
        a = k / 6 * 2 * math.pi
        ball(f'leaf_{k}', g, 0.14, (math.sin(a) * 0.18, 0.95, math.cos(a) * 0.18), C('#7cc68a', 0.6), scale=(1, 0.3, 1.9), rot=(0, a, 0), seg=10)
    cyl('stem', g, 0.03, 0.04, 0.16, (0, 1.04, 0), C('#5fae70'), r=0.01, seg=8)
    rnd = random.Random(3)
    for k in range(20):
        a, y = (rnd.random() - 0.5) * 2.4, 0.22 + rnd.random() * 0.62
        r = max(0.05, 0.42 * math.sqrt(max(0.0, 1 - ((y - 0.52) / 0.46) ** 2)))
        ball(f'seed_{k}', g, 0.026, (math.sin(a) * r, y, math.cos(a) * r), C('#fff1a8', 0.5), scale=(0.8, 1.3, 0.6), seg=6)
    shine(g, 'shine', (-0.2, 0.7, 0.34), 0.07)

@icon
def egg(g):
    ball('shell', g, 0.34, (0, 0.46, 0), C('#fff3e0', 0.45), scale=(1, 1.3, 1), seg=28)
    rnd = random.Random(5)
    for k in range(7):
        a, y = (rnd.random() - 0.5) * 2.0, 0.25 + rnd.random() * 0.55
        r = 0.34 * math.sqrt(max(0.0, 1 - ((y - 0.46) / 0.44) ** 2))
        ball(f'speck_{k}', g, 0.02, (math.sin(a) * r, y, math.cos(a) * r), C('#d9b996', 0.6), scale=(1, 1, 0.5), seg=6)
    shine(g, 'shine', (-0.14, 0.7, 0.27), 0.07)

@icon
def cheese(g):
    prism('wedge', g, [(-0.5, 0.0), (0.5, 0.0), (0.5, 0.46), (-0.5, 0.14)], 0.85, (0, 0, 0), C('#ffd75e', 0.5), r=0.05)
    for k, (x, y, s) in enumerate([(-0.25, 0.15, 0.1), (0.1, 0.22, 0.13), (0.32, 0.12, 0.08), (-0.02, 0.07, 0.06)]):
        ball(f'hole_{k}', g, s, (x, y, 0.43), C('#e8b53c', 0.6), scale=(1, 1, 0.35), seg=14)
    ball('hole_top', g, 0.09, (0.0, 0.32, 0.12), C('#e8b53c', 0.6), scale=(1, 0.3, 1), seg=14)

@icon
def flour(g):
    rbox('bag', g, (0.72, 0.8, 0.42), (0, 0.4, 0), C('#fffaf3', 0.7), r=0.12)
    rbox('neck', g, (0.5, 0.2, 0.3), (0, 0.9, 0), C('#fffaf3', 0.7), r=0.08)
    rbox('frill', g, (0.62, 0.1, 0.34), (0, 1.02, 0), C('#e9e4dc', 0.7), r=0.04)
    torus('tie', g, 0.25, 0.035, (0, 0.8, 0), C(PINK), rot=(math.pi / 2, 0, 0), seg=24, sides=8)
    rbox('label', g, (0.5, 0.34, 0.03), (0, 0.4, 0.22), C('#ffd3e0', 0.6), r=0.02)
    for k, dx in enumerate((-0.12, 0, 0.12)):
        ball(f'grain_{k}', g, 0.045, (dx, 0.42, 0.24), C('#e8b64a', 0.5), scale=(0.7, 1.5, 0.4), rot=(0, 0, dx * 3), seg=8)

@icon
def cookie(g):
    cyl('disc', g, 0.5, 0.5, 0.15, (0, 0.52, 0), C('#d29a5a', 0.7), r=0.06, rot=(math.pi / 2, 0, 0), seg=40)
    torus('edge', g, 0.47, 0.035, (0, 0.52, 0.0), C('#c18444', 0.7), seg=40, sides=8)
    for k, (x, y, s) in enumerate([(-0.2, 0.7, 0.07), (0.18, 0.74, 0.06), (0.05, 0.5, 0.08), (-0.25, 0.38, 0.06), (0.26, 0.42, 0.07), (-0.02, 0.28, 0.05)]):
        ball(f'chip_{k}', g, s, (x, y, 0.08), C('#4a2a1e', 0.5), scale=(1, 0.9, 0.5), seg=10)

@icon
def milk(g):
    rbox('carton', g, (0.56, 0.6, 0.42), (0, 0.3, 0), C('#ffffff', 0.55), r=0.04)
    rbox('band', g, (0.57, 0.22, 0.43), (0, 0.2, 0), C('#9fd8f5', 0.55), r=0.03)
    prism('roof', g, [(-0.28, 0.0), (0.28, 0.0), (0.1, 0.3), (-0.1, 0.3)], 0.42, (0, 0.6, 0), C('#cfeaff', 0.55), r=0.03)
    rbox('fin', g, (0.22, 0.05, 0.42), (0, 0.92, 0), C('#9fd8f5', 0.55), r=0.02)
    ball('drop', g, 0.07, (0, 0.2, 0.22), C('#ffffff', 0.4), scale=(0.9, 1.2, 0.3), seg=12)

@icon
def butter(g):
    rbox('stick', g, (1.0, 0.42, 0.55), (0, 0.21, 0), C('#ffe27a', 0.45), r=0.07)
    rbox('wrapper', g, (0.5, 0.45, 0.58), (-0.27, 0.22, 0), C('#fff6ea', 0.7), r=0.05)
    rbox('band', g, (0.08, 0.46, 0.59), (-0.0, 0.22, 0), C(PINK), r=0.02)
    ball('curl', g, 0.1, (0.28, 0.46, 0.0), C('#fff0a0', 0.4), scale=(1.6, 0.5, 1.2), seg=14)

@icon
def chocolate(g):
    rbox('slab', g, (0.74, 1.0, 0.13), (0, 0.5, 0), C('#5a3020', 0.5), r=0.05)
    for row in range(3):
        for col in range(2):
            rbox(f'square_{row}{col}', g, (0.27, 0.24, 0.06), (-0.17 + col * 0.34, 0.9 - row * 0.29, 0.085), C('#7a4430', 0.4), r=0.03)
    rbox('foil', g, (0.78, 0.34, 0.16), (0, 0.2, 0), C(PINK, 0.4), r=0.05)
    rbox('foil_stripe', g, (0.8, 0.07, 0.17), (0, 0.2, 0), C('#ffffff', 0.4), r=0.02)

PRETZEL_PATH = [(-0.55, -0.15, 0.02), (-0.3, 0.05, 0.05), (-0.06, 0.3, 0.08), (0.2, 0.56, 0.02), (0.5, 0.68, 0), (0.74, 0.5, 0), (0.8, 0.15, 0),
                (0.66, -0.26, 0), (0.36, -0.52, 0), (0, -0.6, 0), (-0.36, -0.52, 0), (-0.66, -0.26, 0), (-0.8, 0.15, 0), (-0.74, 0.5, 0),
                (-0.5, 0.68, 0), (-0.2, 0.56, 0.02), (0.06, 0.3, -0.08), (0.3, 0.05, -0.05), (0.55, -0.15, 0.02)]
@icon
def pretzel(g):
    s = 0.62
    pts = [(x * s, -z * s, y * s + 0.42) for x, y, z in PRETZEL_PATH]   # Blender's own axes
    tube('dough', g, pts, [1] * len(pts), C('#c98a4b', 0.55), bevel=0.14)
    rnd = random.Random(7)
    for k in range(14):
        x, y, z = PRETZEL_PATH[rnd.randrange(1, len(PRETZEL_PATH) - 1)]
        blob(f'salt_{k}', g, ((x + (rnd.random() - 0.5) * 0.08) * s, -0.14, (y + (rnd.random() - 0.5) * 0.08) * s + 0.42), (0.04, 0.03, 0.03), C('#ffffff', 0.4), seg=6, ring=4)

@icon
def sparkle(g):
    prism('big', g, starpoints(4, 0.5, 0.13), 0.12, (0, 0.55, 0), C('#ffd54a', 0.35), r=0.04)
    prism('small', g, starpoints(4, 0.22, 0.06), 0.1, (0.36, 0.9, 0.0), C('#fff1a8', 0.35), r=0.03)
    prism('tiny', g, starpoints(4, 0.14, 0.04), 0.08, (-0.34, 0.2, 0.0), C('#ffe9a8', 0.35), r=0.02)

# ---------- money ----------
@icon
def coin(g):
    cyl('disc', g, 0.5, 0.5, 0.12, (0, 0.52, 0), C(GOLD, 0.3), r=0.05, rot=(math.pi / 2, 0, 0), seg=44)
    torus('ring', g, 0.37, 0.025, (0, 0.52, 0.065), C(GOLD_DK, 0.35), seg=44, sides=8)
    prism('star', g, starpoints(5, 0.2, 0.09), 0.03, (0, 0.52, 0.075), C(GOLD_DK, 0.35), r=0.01)
    shine(g, 'shine', (-0.3, 0.76, 0.07), 0.05)

@icon
def banknote(g):
    rbox('back', g, (1.12, 0.6, 0.05), (0.08, 0.52, -0.05), C('#b5e0b8', 0.6), r=0.03, rot=(0, 0, 0.22))
    rbox('note', g, (1.12, 0.6, 0.06), (0, 0.5, 0.0), C('#7fcf8e', 0.55), r=0.03, rot=(0, 0, -0.08))
    rbox('frame', g, (0.98, 0.46, 0.065), (0, 0.5, 0.005), C('#9be0a8', 0.55), r=0.02, rot=(0, 0, -0.08))
    cyl('seal', g, 0.17, 0.17, 0.07, (0, 0.5, 0.03), C('#e9f8ea', 0.5), r=0.02, rot=(math.pi / 2, 0, -0.08), seg=28)
    for k, (x, y) in enumerate([(-0.4, 0.62), (0.4, 0.38), (-0.4, 0.38), (0.4, 0.62)]):
        ball(f'dot_{k}', g, 0.045, (x, y, 0.04), C('#e9f8ea', 0.5), scale=(1, 1, 0.5), seg=10)

@icon
def moneybag(g):
    ball('sack', g, 0.44, (0, 0.42, 0), C('#c98b4b', 0.65), scale=(1, 0.92, 0.92), seg=26)
    cyl('neck', g, 0.13, 0.26, 0.26, (0, 0.8, 0), C('#c98b4b', 0.65), r=0.05, seg=20)
    ball('frill', g, 0.2, (0, 0.98, 0), C('#b7773a', 0.65), scale=(1.4, 0.45, 1.2), seg=18)
    torus('tie', g, 0.15, 0.04, (0, 0.88, 0), C(GOLD), rot=(math.pi / 2, 0, 0), seg=24, sides=8)
    cyl('coin', g, 0.2, 0.2, 0.06, (0, 0.4, 0.4), C(GOLD, 0.3), r=0.02, rot=(math.pi / 2, 0, 0), seg=28)
    prism('coin_star', g, starpoints(5, 0.11, 0.05), 0.02, (0, 0.4, 0.44), C(GOLD_DK, 0.35), r=0.008)

@icon
def phone(g):
    rbox('body', g, (0.58, 1.0, 0.1), (0, 0.5, 0), C(INK, 0.4), r=0.09)
    rbox('screen', g, (0.48, 0.86, 0.03), (0, 0.5, 0.055), C('#eaf6ff', 0.3), r=0.04)
    rnd = random.Random(11)
    for row in range(7):
        for col in range(5):
            finder = (row < 2 and col < 2) or (row < 2 and col > 2) or (row > 4 and col < 2)
            if finder or rnd.random() < 0.45:
                rbox(f'mod_{row}{col}', g, (0.075, 0.075, 0.02), (-0.16 + col * 0.08, 0.84 - row * 0.095, 0.075), C(INK, 0.4), r=0.008)
    ball('speaker', g, 0.02, (0, 0.95, 0.06), C('#9aa3b0', 0.5), scale=(3, 0.6, 0.5), seg=8)

@icon
def receipt(g):
    teeth = [(-0.32 + k * 0.128, 0.0 if k % 2 == 0 else 0.1) for k in range(6)]
    prism('paper', g, [(-0.32, 0.98), (0.32, 0.98)] + list(reversed(teeth)), 0.04, (0, 0.0, 0), C('#ffffff', 0.7), r=0.012)
    for k, w in enumerate((0.44, 0.36, 0.4, 0.3)):
        rbox(f'line_{k}', g, (w, 0.045, 0.02), (-0.32 + 0.07 + w / 2 - 0.0, 0.8 - k * 0.12, 0.03), C('#b9bdca', 0.6), r=0.01)
    rbox('total', g, (0.5, 0.075, 0.025), (0, 0.28, 0.03), C(ROSE, 0.5), r=0.015)

# ---------- feelings ----------
def heart_points():
    """Two round lobes joined to a point by straight sides: the circle's tangent from the tip, worked out exactly."""
    R, cx, cy, tip = 0.3, 0.27, 0.62, (0.0, 0.0)
    d = math.hypot(cx - tip[0], cy - tip[1])
    th = math.atan2(tip[1] - cy, tip[0] - cx) + math.acos(R / d)    # the tangent point on the right lobe's outer side
    top = math.atan2(math.sqrt(R * R - cx * cx), -cx)                # where the two lobes meet in the middle, up top
    while th > top: th -= 2 * math.pi
    arc = [(cx + R * math.cos(th + (top - th) * k / 24), cy + R * math.sin(th + (top - th) * k / 24)) for k in range(25)]
    return arc + [(-x, y) for x, y in reversed(arc)] + [tip]

@icon
def heart(g):
    prism('heart', g, heart_points(), 0.3, (0, 0.14, 0), C(ROSE, 0.3), r=0.08)
    shine(g, 'shine', (-0.25, 0.86, 0.2), 0.07)

@icon
def star(g):
    prism('star', g, starpoints(5, 0.55, 0.25), 0.26, (0, 0.5, 0), C('#ffd54a', 0.3), r=0.07)
    shine(g, 'shine', (-0.16, 0.7, 0.16), 0.06)

@icon
def flame(g):
    outer = [(0.0, -0.5), (0.3, -0.42), (0.44, -0.12), (0.34, 0.18), (0.14, 0.52), (0.07, 0.2), (-0.1, 0.32), (-0.34, 0.08), (-0.44, -0.18), (-0.3, -0.42)]
    inner = [(0.0, -0.4), (0.2, -0.32), (0.26, -0.08), (0.12, 0.14), (0.02, 0.0), (-0.16, 0.06), (-0.26, -0.14), (-0.18, -0.34)]
    prism('outer', g, outer, 0.24, (0, 0.55, 0), C('#ff7a3d', 0.35), r=0.06)
    prism('inner', g, inner, 0.14, (0, 0.5, 0.1), C('#ffd45e', 0.35), r=0.04)

@icon
def angry(g):
    for k, (x, y, a) in enumerate([(-0.24, 0.74, 0.8), (0.24, 0.74, -0.8), (-0.24, 0.26, -0.8), (0.24, 0.26, 0.8)]):
        rbox(f'bar_{k}', g, (0.13, 0.36, 0.08), (x, y, 0), C('#ef5f7e', 0.4), r=0.04, rot=(0, 0, a))

@icon
def thought(g):
    cloud = C('#ffffff', 0.5)
    for k, (x, y, r) in enumerate([(0, 0.62, 0.3), (-0.3, 0.56, 0.22), (0.3, 0.56, 0.22), (-0.12, 0.84, 0.2), (0.16, 0.82, 0.22)]):
        ball(f'puff_{k}', g, r, (x, y, 0), cloud, scale=(1, 0.95, 0.85), seg=18)
    ball('trail_1', g, 0.1, (-0.34, 0.24, 0.0), cloud, seg=12)
    ball('trail_2', g, 0.06, (-0.5, 0.1, 0.0), cloud, seg=10)

# ---------- the shop ----------
@icon
def clock(g):
    cyl('face', g, 0.44, 0.44, 0.16, (0, 0.52, 0), C('#ffffff', 0.4), r=0.05, rot=(math.pi / 2, 0, 0), seg=40)
    torus('rim', g, 0.46, 0.06, (0, 0.52, 0.0), C(PINK, 0.4), seg=40, sides=10)
    cyl('button', g, 0.08, 0.08, 0.14, (0, 1.08, 0), C(PINK, 0.4), r=0.03, seg=16)
    cyl('stem', g, 0.05, 0.05, 0.1, (0, 1.0, 0), C('#c9ced8', 0.4), r=0.01, seg=12)
    for k, (x, y) in enumerate([(0, 0.82), (0.32, 0.52), (0, 0.22), (-0.32, 0.52)]):
        ball(f'tick_{k}', g, 0.03, (x, y, 0.09), C(INK, 0.4), scale=(1, 1, 0.5), seg=8)
    rbox('long', g, (0.05, 0.26, 0.03), (0, 0.65, 0.1), C(INK, 0.4), r=0.015)
    rbox('short', g, (0.05, 0.18, 0.03), (0.07, 0.5, 0.1), C(ROSE, 0.4), r=0.015, rot=(0, 0, -1.2))

@icon
def bell(g):
    dome('body', g, 0.42, (0, 0.2, 0), C(GOLD, 0.3), squash=1.15, seg=36, lip=0.05)
    torus('rim', g, 0.44, 0.045, (0, 0.2, 0), C(GOLD_DK, 0.35), rot=(math.pi / 2, 0, 0), seg=36, sides=8)
    ball('clapper', g, 0.09, (0, 0.12, 0), C(GOLD_DK, 0.35), seg=12)
    torus('loop', g, 0.09, 0.03, (0, 0.74, 0), C(GOLD_DK, 0.35), seg=20, sides=8)
    shine(g, 'shine', (-0.18, 0.5, 0.3), 0.07)

@icon
def lock(g):
    rbox('body', g, (0.74, 0.56, 0.32), (0, 0.3, 0), C(GOLD, 0.35), r=0.09)
    torus('shackle', g, 0.22, 0.06, (0, 0.55, 0), C('#c9ced8', 0.3), arc=math.pi, seg=24, sides=10)
    cyl('post_l', g, 0.06, 0.06, 0.1, (-0.22, 0.58, 0), C('#c9ced8', 0.3), r=0.015, seg=10)
    cyl('post_r', g, 0.06, 0.06, 0.1, (0.22, 0.58, 0), C('#c9ced8', 0.3), r=0.015, seg=10)
    ball('hole', g, 0.07, (0, 0.36, 0.17), C(INK, 0.4), scale=(1, 1, 0.4), seg=12)
    rbox('slot', g, (0.045, 0.14, 0.02), (0, 0.26, 0.17), C(INK, 0.4), r=0.01)

@icon
def pan(g):
    cyl('body', g, 0.52, 0.46, 0.16, (0, 0.1, 0), C('#6a5560', 0.4), r=0.04, seg=36)
    torus('rim', g, 0.5, 0.04, (0, 0.18, 0), C('#8a7580', 0.4), rot=(math.pi / 2, 0, 0), seg=36, sides=8)
    cyl('inside', g, 0.44, 0.44, 0.02, (0, 0.17, 0), C('#3b2f36', 0.4), r=0.005, seg=36)
    ball('white', g, 0.27, (0, 0.2, 0), C('#ffffff', 0.4), scale=(1, 0.14, 1), seg=24)
    ball('yolk', g, 0.11, (0.02, 0.24, 0.02), C('#ffc531', 0.35), scale=(1, 0.7, 1), seg=16)
    rbox('handle', g, (0.62, 0.07, 0.11), (0.82, 0.14, 0), C(WOOD, 0.6), r=0.03)

@icon
def spoon(g):
    cyl('handle', g, 0.045, 0.06, 0.85, (-0.0, 0.42, 0), C(WOOD, 0.6), r=0.02, rot=(0, 0, -0.45), seg=14)
    ball('scoop', g, 0.22, (0.19, 0.9, 0), C('#d9a66e', 0.55), scale=(1, 1.3, 0.35), rot=(0, 0, -0.45), seg=18)

@icon
def bowl(g):
    revolve('bowl', g, [(0.0005, 0.56), (0.52, 0.56), (0.47, 0.22), (0.3, 0.02), (0.0005, 0.0)], C('#ffc4d6', 0.5), seg=40)
    torus('rim', g, 0.52, 0.03, (0, 0.56, 0), C('#ffd3e0', 0.5), rot=(math.pi / 2, 0, 0), seg=40, sides=8)
    cyl('batter', g, 0.47, 0.47, 0.04, (0, 0.5, 0), C('#fff0cf', 0.4), r=0.015, seg=40)
    cyl('spoon', g, 0.04, 0.05, 0.9, (0.18, 0.88, 0), C(WOOD, 0.6), r=0.02, rot=(0, 0, -0.5), seg=12)

@icon
def ribbon(g):
    for sd in (-1, 1):
        ball(f'loop_{sd}', g, 0.3, (sd * 0.3, 0.55, 0), C(PINK, 0.4), scale=(1.15, 0.9, 0.45), rot=(0, 0, sd * 0.25), seg=20)
        ball(f'inner_{sd}', g, 0.17, (sd * 0.3, 0.55, 0.07), C('#ffc4d6', 0.4), scale=(1.1, 0.8, 0.4), rot=(0, 0, sd * 0.25), seg=16)
        rbox(f'tail_{sd}', g, (0.15, 0.5, 0.05), (sd * 0.14, 0.18, -0.03), C(ROSE, 0.4), r=0.03, rot=(0, 0, sd * 0.32))
    ball('knot', g, 0.15, (0, 0.55, 0.05), C(ROSE, 0.35), scale=(1, 1, 0.8), seg=16)

@icon
def chefhat(g):
    white = C('#ffffff', 0.55)
    cyl('band', g, 0.34, 0.32, 0.34, (0, 0.17, 0), white, r=0.05, seg=32)
    torus('stripe', g, 0.335, 0.025, (0, 0.14, 0), C(PINK, 0.5), rot=(math.pi / 2, 0, 0), seg=32, sides=8)
    for k, (x, y, z, r) in enumerate([(0, 0.72, 0, 0.3), (-0.26, 0.58, 0.0, 0.22), (0.26, 0.58, 0.0, 0.22), (0, 0.55, 0.22, 0.2), (0, 0.55, -0.2, 0.2)]):
        ball(f'puff_{k}', g, r, (x, y, z), white, scale=(1, 0.95, 1), seg=20)

@icon
def sprout(g):
    cyl('stem', g, 0.035, 0.05, 0.5, (0, 0.28, 0), C('#5fae70', 0.6), r=0.01, seg=10)
    for sd, col in ((-1, '#7cc68a'), (1, '#9be07f')):
        ball(f'leaf_{sd}', g, 0.24, (sd * 0.24, 0.6, 0), C(col, 0.5), scale=(1.5, 0.3, 0.8), rot=(0, 0, sd * 0.55), seg=16)
    ball('soil', g, 0.34, (0, 0.04, 0), C('#8a5a3c', 0.8), scale=(1, 0.35, 0.9), seg=18)

@icon
def mallet(g):
    cyl('handle', g, 0.06, 0.07, 0.9, (0, 0.45, 0), C('#e2b088', 0.6), r=0.02, seg=12)
    rbox('head', g, (0.62, 0.34, 0.34), (0, 0.9, 0), C('#ffd27a', 0.45), r=0.08)
    rbox('cap_l', g, (0.07, 0.36, 0.36), (-0.3, 0.9, 0), C('#f0b43a', 0.4), r=0.03)
    rbox('cap_r', g, (0.07, 0.36, 0.36), (0.3, 0.9, 0), C('#f0b43a', 0.4), r=0.03)
    shine(g, 'shine', (-0.18, 1.0, 0.18), 0.05)

@icon
def finger(g):
    glove = C('#fffaf3', 0.6)
    cyl('cuff', g, 0.27, 0.25, 0.14, (0, 0.07, 0), C('#ffd23f', 0.5), r=0.04, seg=22)
    ball('palm', g, 0.3, (0, 0.34, 0), glove, scale=(1, 0.95, 0.8), seg=22)
    cyl('point', g, 0.085, 0.09, 0.5, (0, 0.78, 0.02), glove, r=0.04, seg=16)
    ball('tip', g, 0.085, (0, 1.03, 0.02), glove, seg=14)
    for k, (x, y) in enumerate([(-0.17, 0.52), (-0.05, 0.56), (0.07, 0.55)]):
        ball(f'curl_{k}', g, 0.1, (x, y, 0.2), glove, scale=(1, 1, 0.9), seg=14)
    ball('thumb', g, 0.1, (0.28, 0.4, 0.1), glove, scale=(1.2, 0.8, 0.8), rot=(0, 0, -0.5), seg=14)

# ---------- buttons ----------
def speaker_base(g):
    rbox('box', g, (0.3, 0.4, 0.32), (-0.34, 0.5, 0), C('#ff9fbf', 0.4), r=0.07)
    cyl('cone', g, 0.38, 0.15, 0.4, (-0.04, 0.5, 0), C('#ff7ea6', 0.4), r=0.05, rot=(0, 0, -math.pi / 2), seg=28)
    cyl('cap', g, 0.12, 0.12, 0.04, (-0.2, 0.5, 0), C('#ffd3e0', 0.4), r=0.01, rot=(0, 0, -math.pi / 2), seg=16)

@icon
def speaker(g):
    speaker_base(g)
    for k, R in enumerate((0.4, 0.62)):
        torus(f'wave_{k}', g, R, 0.04, (0.12, 0.5, 0), C('#3fae7a', 0.4), rot=(0, 0, -math.pi / 5), arc=math.pi * 2 / 5, seg=16, sides=8)

@icon
def mute(g):
    speaker_base(g)
    for k, a in enumerate((math.pi / 4, -math.pi / 4)):
        rbox(f'cross_{k}', g, (0.1, 0.62, 0.07), (0.5, 0.5, 0), C('#ef5f7e', 0.4), r=0.035, rot=(0, 0, a))

@icon
def gear(g):
    steel = C('#c9ced8', 0.4)
    cyl('disc', g, 0.4, 0.4, 0.2, (0, 0.52, 0), steel, r=0.05, rot=(math.pi / 2, 0, 0), seg=36)
    for k in range(8):
        a = k / 8 * 2 * math.pi
        rbox(f'tooth_{k}', g, (0.17, 0.22, 0.2), (math.sin(a) * 0.46, 0.52 + math.cos(a) * 0.46, 0), steel, r=0.04, rot=(0, 0, -a))
    cyl('hole', g, 0.15, 0.15, 0.06, (0, 0.52, 0.1), C('#7d8590', 0.4), r=0.01, rot=(math.pi / 2, 0, 0), seg=24)

@icon
def bin(g):
    cyl('can', g, 0.36, 0.28, 0.7, (0, 0.35, 0), C('#c9ced8', 0.4), r=0.04, seg=28)
    cyl('lid', g, 0.42, 0.42, 0.08, (0, 0.75, 0), C('#9aa3b0', 0.4), r=0.03, seg=28)
    rbox('knob', g, (0.2, 0.07, 0.08), (0, 0.85, 0), C('#7d8590', 0.4), r=0.025)
    for k, x in enumerate((-0.14, 0, 0.14)):
        rbox(f'ridge_{k}', g, (0.04, 0.46, 0.03), (x, 0.34, 0.31), C('#9aa3b0', 0.4), r=0.012)

@icon
def disk(g):
    rbox('shell', g, (0.92, 0.92, 0.1), (0, 0.5, 0), C('#6aa5e0', 0.4), r=0.08)
    rbox('shutter', g, (0.52, 0.32, 0.03), (0.08, 0.78, 0.06), C('#d9dee8', 0.35), r=0.02)
    rbox('slot', g, (0.1, 0.2, 0.035), (0.22, 0.78, 0.07), C('#7d8590', 0.4), r=0.01)
    rbox('label', g, (0.62, 0.4, 0.03), (0, 0.3, 0.06), C('#ffffff', 0.55), r=0.02)
    rbox('line', g, (0.4, 0.04, 0.035), (0, 0.36, 0.07), C(ROSE, 0.5), r=0.01)

root = scenery(WHO)
BUILT[WHO](root)
finish(reach=0.12, view='auto', strength=0.3, join=root)
