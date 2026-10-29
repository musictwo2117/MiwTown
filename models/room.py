# Miw's Town: the Cat Room's furniture, rebuilt in Blender with rounded edges and baked soft shadows.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/room.py -- models/sofa.glb [preview.png]
# The output file's name picks the piece. Each one is built in the same coordinates as its code-built twin in
# room.html (inside the scene, or the LEFT / EAST wing it belongs to), so the page drops it in at the origin
# of that parent. Lights, blinking LEDs, steam, bubbles and other moving things stay in room.html.
import os, sys, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

WINDOW = material('window', '#fff1c4', 0.3)   # lamp shades: the room swaps in its own glass, which glows at night
BULB = material('bulb', '#fff6d8', 0.3)
WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def piece(fn):
    BUILT[fn.__name__] = fn
    return fn

def leg(g, name, x, y0, y1, z, color, r0=0.06, r1=0.045):
    cyl(name, g, r1, r0, y1 - y0, (x, (y0 + y1) / 2, z), C(color), r=0.02, seg=16)

def bush(g, name, x, y, z, parts, color):
    for i, (dx, dy, dz, r) in enumerate(parts):
        ball(f'{name}_{i}', g, r, (x + dx, y + dy, z + dz), C(color), seg=18)

def flower(g, name, x, y, z, color, size=0.035):
    for k in range(5):
        b = k / 5 * 2 * math.pi
        ball(f'{name}_petal_{k}', g, size, (x + math.cos(b) * size * 1.1, y, z + math.sin(b) * size * 1.1), C(color), scale=(1, 0.55, 1), seg=10)
    ball(f'{name}_heart', g, size * 0.7, (x, y + 0.01, z), C('#fff3b0'), seg=10)

def mug(g, name, x, y, z, color, r=0.12, h=0.25):
    cyl(name, g, r, r * 0.85, h, (x, y, z), C(color), r=0.03)
    cyl(f'{name}_tea', g, r * 0.85, r * 0.85, 0.01, (x, y + h / 2 - 0.02, z), C('#c98a5a'), r=0.004)
    torus(f'{name}_handle', g, r * 0.55, r * 0.18, (x + r * 1.15, y, z), C(color), rot=(0, math.pi / 2, 0), seg=16, sides=6)

# ---------- living room ----------
@piece
def bookshelf(g):   # in LEFT
    s = node('shelf', g, V(-6.5, 0, -3.5))
    rbox('back', s, (0.12, 3.5, 3.1), (-0.42, 1.75, 0), C('#c99a74'), r=0.03)
    for sd in (-1, 1): rbox(f'side_{sd}', s, (0.95, 3.5, 0.14), (0, 1.75, sd * 1.48), C('#e2b088'), r=0.05)
    rbox('top', s, (1.05, 0.14, 3.2), (0.02, 3.47, 0), C('#e2b088'), r=0.05)
    rbox('plinth', s, (0.98, 0.18, 3.0), (0, 0.09, 0), C('#d8a77d'), r=0.04)
    rnd = random.Random(42)
    books = ['#ff9fb5', '#8fc1f0', '#ffd27a', '#b9a6f5', '#9fd49a', '#ffb38a', '#f49a91']
    for k in range(4):
        y0 = 0.3 + k * 0.8
        rbox(f'board_{k}', s, (0.92, 0.08, 2.9), (0.03, y0, 0), C('#d8a77d'), r=0.025)
        z, n = -1.3, 0
        while z < 1.2:
            w, h = 0.14 + rnd.random() * 0.12, 0.42 + rnd.random() * 0.22
            if rnd.random() > 0.12:
                c = books[rnd.randrange(len(books))]
                lean = 0.15 if rnd.random() > 0.9 else 0
                rbox(f'book_{k}_{n}', s, (0.55, h, w), (0.1, y0 + 0.04 + h / 2, z + w / 2), C(c), r=0.025, rot=(lean, 0, 0))
                rbox(f'book_{k}_{n}_band', s, (0.56, 0.035, w + 0.004), (0.1, y0 + 0.04 + h * 0.78, z + w / 2), C('#ffffff'), r=0.008, rot=(lean, 0, 0))
            z += w + 0.02; n += 1
    # a tiny potted plant and a globe on top
    cyl('pot', s, 0.14, 0.11, 0.22, (0.05, 3.65, -0.9), C('#9fdcc8'), r=0.03)
    bush(s, 'leaves', 0.05, 3.86, -0.9, [(0, 0, 0, 0.17), (0.1, 0.08, 0.06, 0.1), (-0.08, 0.1, -0.05, 0.1)], '#9fd49a')
    cyl('globe_stand', s, 0.06, 0.12, 0.1, (0.05, 3.59, 0.8), C('#c99a74'), r=0.02)
    ball('globe', s, 0.2, (0.05, 3.85, 0.8), C('#8fc1f0'))
    ball('land', s, 0.12, (0.12, 3.92, 0.92), C('#9fd49a'), scale=(1, 0.8, 0.5))

@piece
def whiteboard(g):   # in LEFT
    rbox('frame', g, (3.3, 2.0, 0.12), (-3, 2.5, -6.92), C('#d7d9e3'), r=0.05)
    rbox('board', g, (3.05, 1.78, 0.06), (-3, 2.5, -6.85), C('#ffffff'), r=0.02)
    for i, (x, y, w, c) in enumerate(((-3.8, 3.0, 1.0, '#8fc1f0'), (-3.5, 2.7, 1.6, '#8fc1f0'), (-3.9, 2.4, 0.8, '#f49a91'))):
        rbox(f'scribble_{i}', g, (w, 0.055, 0.02), (x + w / 2 - 0.3, y, -6.8), C(c), r=0.02)
    rbox('note_yellow', g, (0.55, 0.55, 0.03), (-2.0, 2.9, -6.8), C('#ffe08a'), r=0.012)
    rbox('note_pink', g, (0.5, 0.5, 0.03), (-1.95, 2.2, -6.8), C('#ffc4d6'), r=0.012, rot=(0, 0, 0.1))
    for i, h in enumerate((0.25, 0.45, 0.35)):
        rbox(f'bar_{i}', g, (0.18, h, 0.02), (-3.9 + i * 0.28, 1.85 + h / 2, -6.8), C('#9fd49a'), r=0.01)
    rbox('tray', g, (2.6, 0.08, 0.2), (-3, 1.48, -6.82), C('#c7c9d3'), r=0.03)
    for i, c in enumerate(('#f49a91', '#8fc1f0', '#9fd49a')):
        cyl(f'marker_{i}', g, 0.03, 0.03, 0.28, (-3.6 + i * 0.4, 1.55, -6.78), C(c), r=0.012, rot=(0, 0, math.pi / 2), seg=12)
    rbox('eraser', g, (0.3, 0.08, 0.1), (-2.2, 1.56, -6.78), C('#ffd27a'), r=0.025)

@piece
def routertable(g):   # in the scene; the blinking LEDs stay in room.html
    rbox('top', g, (2.0, 0.1, 0.95), (2.6, 1.0, -6.3), C('#d8a77d'), r=0.04)
    rbox('shelf', g, (1.86, 0.06, 0.82), (2.6, 0.35, -6.3), C('#d8a77d'), r=0.025)
    for dx in (-0.9, 0.9):
        for dz in (-0.38, 0.38):
            leg(g, f'leg_{dx}_{dz}', 2.6 + dx, 0.0, 0.96, -6.3 + dz, '#b88a62', 0.05, 0.045)
    rbox('router', g, (0.85, 0.2, 0.5), (2.6, 1.15, -6.35), C('#b5ccff'), r=0.07)
    for dx in (-0.3, 0.3):
        cyl(f'antenna_{dx}', g, 0.025, 0.03, 0.55, (2.6 + dx, 1.5, -6.5), C('#6f7aa0'), r=0.012, rot=(0, 0, dx * 0.6), seg=10)
        ball(f'antenna_tip_{dx}', g, 0.04, (2.6 + dx - math.sin(dx * 0.6) * 0.28, 1.77, -6.5), C('#6f7aa0'), seg=10)
    for i, c in enumerate(('#ff9fb5', '#ffd27a', '#8fc1f0')):
        rbox(f'book_{i}', g, (0.5, 0.08, 0.36), (2.3, 0.42 + i * 0.08, -6.3), C(c), r=0.02, rot=(0, i * 0.15, 0))
    cyl('cable', g, 0.025, 0.025, 0.7, (2.95, 0.7, -6.62), C('#6f7aa0'), r=0.01, seg=8)

@piece
def serverrack(g):   # in the scene; the blinking lights stay in room.html
    rbox('cabinet', g, (1.3, 3.3, 1.15), (5.9, 1.65, -6.1), C('#9a94c2'), r=0.1)
    rbox('cap', g, (1.38, 0.08, 1.22), (5.9, 3.33, -6.1), C('#857fb3'), r=0.04)
    for i in range(6):
        y = 0.45 + i * 0.47
        rbox(f'unit_{i}', g, (1.05, 0.36, 0.04), (5.9, y, -5.52), C('#6f6a9c'), r=0.04)
        rbox(f'slot_{i}', g, (0.45, 0.04, 0.02), (5.7, y, -5.5), C('#b3aed6'), r=0.01)
    for dx in (-0.5, 0.5):
        for dz in (-0.45, 0.45):
            cyl(f'foot_{dx}_{dz}', g, 0.06, 0.07, 0.06, (5.9 + dx, 0.03, -6.1 + dz), C('#6f6a9c'), r=0.02, seg=12)
    pts = [tuple(V(*p)) for p in ((6.3, 3.35, -6.4), (6.5, 3.6, -6.55), (6.7, 3.5, -6.85), (6.8, 3.2, -6.95))]
    tube('cable', g, pts, [1] * 4, C('#6f7aa0'), bevel=0.03)
    ball('sticker', g, 0.1, (6.2, 2.9, -5.53), C('#ffc4d6'), scale=(1, 1, 0.2))

@piece
def desk(g):   # in the scene
    x, z = 2.4, -0.6
    rbox('top', g, (3.0, 0.14, 1.35), (x, 1.1, z), C('#e2b088'), r=0.06)
    for dx in (-1.35, 1.35):
        for dz in (-0.55, 0.55):
            leg(g, f'leg_{dx}_{dz}', x + dx, 0.0, 1.04, z + dz, '#c4926a', 0.06, 0.05)
    rbox('drawers', g, (0.85, 0.55, 1.15), (x + 0.85, 0.75, z), C('#f1c99e'), r=0.05)
    for i, y in enumerate((0.88, 0.62)):
        rbox(f'drawer_{i}', g, (0.75, 0.2, 0.03), (x + 0.85, y, z - 0.58), C('#f7d9b5'), r=0.02)
        ball(f'knob_{i}', g, 0.035, (x + 0.85, y, z - 0.61), C('#ff9fb5'), seg=10)
    # the laptop: keyboard towards the stool, a heart on the back of the lid
    rbox('laptop', g, (1.05, 0.05, 0.7), (x, 1.2, z - 0.05), C('#e6e8f0'), r=0.025)
    rbox('keys', g, (0.85, 0.012, 0.32), (x, 1.228, z - 0.15), C('#cfd3df'), r=0.006)
    rbox('pad', g, (0.3, 0.008, 0.16), (x, 1.228, z - 0.34), C('#d8dbe5'), r=0.004)
    rbox('lid', g, (1.05, 0.7, 0.05), (x, 1.55, z + 0.28), C('#ffc4d6'), r=0.03, rot=(0.12, 0, 0))
    rbox('screen', g, (0.95, 0.6, 0.01), (x, 1.55, z + 0.25), C('#3b4a5a'), r=0.01, rot=(0.12, 0, 0))
    for dx in (-0.07, 0.07): ball(f'logo_{dx}', g, 0.06, (x + dx, 1.6, z + 0.31), C('#ff7b9c'), scale=(1, 1, 0.4), seg=12)
    cyl('logo_tip', g, 0.0, 0.085, 0.12, (x, 1.52, z + 0.31), C('#ff7b9c'), r=0.015, rot=(math.pi, math.pi / 4, 0), seg=4)
    mug(g, 'mug', x - 1.05, 1.3, z + 0.2, '#8fc1f0')
    cyl('pot', g, 0.13, 0.11, 0.2, (x + 1.1, 1.27, z - 0.25), C('#f49a91'), r=0.03)
    bush(g, 'plant', x + 1.1, 1.48, z - 0.25, [(0, 0, 0, 0.18), (0.1, 0.1, 0.05, 0.1), (-0.09, 0.12, -0.04, 0.1)], '#9fd49a')
    # a little desk lamp
    cyl('lamp_base', g, 0.12, 0.14, 0.05, (x - 1.2, 1.2, z - 0.35), C('#ffffff'), r=0.02)
    tube('lamp_arm', g, [tuple(V(*p)) for p in ((x - 1.2, 1.2, z - 0.35), (x - 1.25, 1.55, z - 0.3), (x - 1.05, 1.72, z - 0.45))], [1] * 3, C('#ffffff'), bevel=0.022)
    cyl('lamp_shade', g, 0.05, 0.14, 0.14, (x - 1.0, 1.68, z - 0.5), C('#ffc4d6'), r=0.02, rot=(0.6, 0, 0.4))
    # the stool the writer sits on
    cyl('seat', g, 0.38, 0.38, 0.12, (x, 0.5, -1.85), C('#b9a6f5'), r=0.05)
    cyl('post', g, 0.06, 0.06, 0.42, (x, 0.24, -1.85), C('#8a7a80'), r=0.02, seg=12)
    cyl('foot', g, 0.24, 0.26, 0.05, (x, 0.04, -1.85), C('#8a7a80'), r=0.02)

@piece
def sofa(g):   # in LEFT
    z = 2.6
    rbox('base', g, (1.45, 0.5, 3.5), (-6.2, 0.35, z), C('#f49ab0'), r=0.14)
    rbox('backrest', g, (0.42, 1.25, 3.5), (-6.75, 0.95, z), C('#f08aa4'), r=0.18)
    for dz in (-1.85, 1.85):
        rbox(f'arm_{dz}', g, (1.45, 0.85, 0.36), (-6.2, 0.55, z + dz), C('#f08aa4'), r=0.16)
    for dz in (-0.85, 0.85):
        rbox(f'cushion_{dz}', g, (1.15, 0.22, 1.6), (-6.05, 0.69, z + dz), C('#ffc0cf'), r=0.1)
        rbox(f'back_cushion_{dz}', g, (0.22, 0.62, 1.55), (-6.46, 1.1, z + dz), C('#ffc0cf'), r=0.1, rot=(0, 0, -0.12))
        ball(f'tuft_{dz}', g, 0.035, (-6.34, 1.12, z + dz), C('#f08aa4'), seg=10)
    rbox('pillow', g, (0.25, 0.55, 0.6), (-6.4, 1.05, z - 1.1), C('#ffe08a'), r=0.12, rot=(0, 0.3, 0.15))
    for dz in (-1.6, 1.6):
        for dx in (-0.6, 0.6):
            leg(g, f'leg_{dx}_{dz}', -6.2 + dx, 0.0, 0.12, z + dz, '#b88a62', 0.06, 0.05)

@piece
def floorlamp(g):   # in LEFT; its light stays in room.html
    cyl('base', g, 0.35, 0.4, 0.08, (-6.2, 0.04, 5.3), C('#8a7a80'), r=0.03)
    cyl('pole', g, 0.04, 0.04, 2.5, (-6.2, 1.3, 5.3), C('#8a7a80'), r=0.015, seg=12)
    cyl('shade', g, 0.3, 0.55, 0.6, (-6.2, 2.75, 5.3), WINDOW, r=0.05, seg=40)
    torus('trim', g, 0.55, 0.035, (-6.2, 2.45, 5.3), C('#ffc4d6'), rot=(math.pi / 2, 0, 0), seg=40, sides=6)
    torus('trim_top', g, 0.3, 0.03, (-6.2, 3.05, 5.3), C('#ffc4d6'), rot=(math.pi / 2, 0, 0), seg=32, sides=6)
    ball('bulb', g, 0.13, (-6.2, 2.5, 5.3), BULB)

@piece
def cornerplant(g):   # in LEFT
    cyl('pot', g, 0.35, 0.28, 0.6, (-6.3, 0.3, -6.3), C('#f49a91'), r=0.05)
    torus('pot_rim', g, 0.35, 0.04, (-6.3, 0.6, -6.3), C('#f7b2aa'), rot=(math.pi / 2, 0, 0), seg=32, sides=6)
    bush(g, 'leaves', -6.3, 0, -6.3, [(0, 1.0, 0, 0.45), (0.25, 1.45, 0.1, 0.35), (-0.2, 1.35, -0.15, 0.32), (0.05, 1.7, -0.05, 0.25), (-0.3, 0.9, 0.2, 0.25)], '#9fd49a')

@piece
def catbed(g):   # in the scene
    torus('rim', g, 0.55, 0.2, (-1.8, 0.3, 5.6), C('#c3b6ec'), rot=(math.pi / 2, 0, 0), seg=40, sides=14)
    cyl('cushion', g, 0.56, 0.56, 0.12, (-1.8, 0.18, 5.6), C('#e6dcff'), r=0.05, seg=40)
    for i in range(5):
        a = i / 5 * 2 * math.pi + 0.3
        ball(f'paw_{i}', g, 0.05, (-1.8 + math.cos(a) * 0.3, 0.245, 5.6 + math.sin(a) * 0.3), C('#ffffff'), scale=(1, 0.3, 1), seg=10)
    # a fish toy beside it
    ball('fish', g, 0.12, (-0.9, 0.2, 5.2), C('#ffb38a'), scale=(1.4, 0.6, 0.7))
    cyl('fish_tail', g, 0.0, 0.1, 0.14, (-1.12, 0.2, 5.2), C('#ffb38a'), r=0.02, rot=(0, 0, math.pi / 2), seg=4)

# ---------- kitchen ----------
@piece
def kitchen(g):   # in EAST; the steam stays in room.html
    rbox('counter', g, (5.0, 1.05, 1.0), (10.5, 0.6, -6.45), C('#fff6ef'), r=0.05)
    rbox('worktop', g, (5.1, 0.1, 1.08), (10.5, 1.15, -6.43), C('#f7c6d4'), r=0.04)
    rbox('kick', g, (4.9, 0.1, 0.9), (10.5, 0.08, -6.5), C('#f1e2d8'), r=0.02)
    for x in (8.6, 9.8, 11.0, 12.2):
        rbox(f'door_{x}', g, (1.05, 0.8, 0.04), (x, 0.6, -5.94), C('#ffeae2'), r=0.03)
        rbox(f'handle_{x}', g, (0.25, 0.05, 0.05), (x, 0.88, -5.9), C('#d9a0b0'), r=0.02)
    # sink with a curved faucet
    rbox('sink_rim', g, (1.05, 0.04, 0.65), (9.0, 1.21, -6.4), C('#d5dde8'), r=0.02)
    rbox('sink', g, (0.9, 0.02, 0.5), (9.0, 1.225, -6.4), C('#b9c6d6'), r=0.008)
    tube('faucet', g, [tuple(V(*p)) for p in ((9.0, 1.2, -6.8), (9.0, 1.6, -6.8), (9.0, 1.68, -6.68), (9.0, 1.58, -6.55))], [1] * 4, C('#c7ccd8'), bevel=0.035)
    for dx in (-0.15, 0.15): ball(f'tap_{dx}', g, 0.045, (9.0 + dx, 1.28, -6.8), C(['#8fc1f0', '#f49a91'][dx > 0]), seg=12)
    # stove with a pink pot
    rbox('hob', g, (1.15, 0.03, 0.7), (11.6, 1.21, -6.4), C('#5a4a52'), r=0.012)
    for dx in (-0.3, 0.3):
        torus(f'burner_{dx}', g, 0.17, 0.02, (11.6 + dx, 1.235, -6.4), C('#8a7a80'), rot=(math.pi / 2, 0, 0), seg=24, sides=6)
    for i in range(3): ball(f'knob_{i}', g, 0.05, (11.3 + i * 0.3, 0.98, -5.92), C('#fff6ef'), scale=(1, 1, 0.6), seg=12)
    cyl('pot', g, 0.25, 0.22, 0.32, (11.3, 1.4, -6.4), C('#ff9fb5'), r=0.04)
    cyl('lid', g, 0.26, 0.26, 0.04, (11.3, 1.58, -6.4), C('#ffc4d6'), r=0.015)
    ball('lid_knob', g, 0.05, (11.3, 1.62, -6.4), C('#ffffff'), seg=12)
    for sd in (-1, 1): rbox(f'pot_handle_{sd}', g, (0.12, 0.04, 0.08), (11.3 + sd * 0.29, 1.48, -6.4), C('#ff9fb5'), r=0.018)
    # a shelf of jars
    rbox('shelf', g, (2.4, 0.08, 0.35), (10.2, 3.2, -6.8), C('#e2b088'), r=0.03)
    for x in (9.2, 11.2): rbox(f'bracket_{x}', g, (0.06, 0.25, 0.25), (x, 3.05, -6.85), C('#c99a74'), r=0.02)
    for i, c in enumerate(('#ffd27a', '#9fd49a', '#ff9fb5', '#8fc1f0')):
        cyl(f'jar_{i}', g, 0.13, 0.13, 0.32, (9.3 + i * 0.6, 3.4, -6.8), C(c), r=0.04)
        cyl(f'jar_lid_{i}', g, 0.14, 0.14, 0.06, (9.3 + i * 0.6, 3.59, -6.8), C('#ffffff'), r=0.025)
        rbox(f'jar_label_{i}', g, (0.14, 0.1, 0.01), (9.3 + i * 0.6, 3.4, -6.67), C('#ffffff'), r=0.004)

@piece
def fridge(g):   # in EAST
    rbox('body', g, (1.35, 3.0, 1.1), (14.0, 1.6, -6.35), C('#c9ecdf'), r=0.18)
    rbox('split', g, (1.3, 0.03, 0.02), (14.0, 2.3, -5.79), C('#a6d8c6'), r=0.01)
    for y in (1.2, 2.8):
        rbox(f'handle_{y}', g, (0.07, 0.5, 0.07), (13.5, y, -5.75), C('#ffffff'), r=0.03)
    for dx in (-0.05, 0.05): ball(f'heart_{dx}', g, 0.06, (14.2 + dx, 2.62, -5.78), C('#ff7b9c'), scale=(1, 1, 0.5), seg=12)
    cyl('heart_tip', g, 0.0, 0.08, 0.1, (14.2, 2.55, -5.78), C('#ff7b9c'), r=0.012, rot=(math.pi, math.pi / 4, 0), seg=4)
    rbox('photo', g, (0.32, 0.4, 0.015), (14.3, 1.6, -5.79), C('#ffffff'), r=0.008, rot=(0, 0, 0.08))
    rbox('photo_pic', g, (0.26, 0.26, 0.01), (14.3, 1.64, -5.78), C('#b5ccff'), r=0.006, rot=(0, 0, 0.08))
    ball('star', g, 0.06, (13.85, 1.95, -5.78), C('#ffd27a'), scale=(1, 1, 0.4), seg=10)
    for dx in (-0.5, 0.5): cyl(f'foot_{dx}', g, 0.06, 0.07, 0.1, (14.0 + dx, 0.08, -6.0), C('#a6d8c6'), r=0.02, seg=12)

@piece
def diningtable(g):   # in EAST; the pretzels and the lamp's light stay in room.html
    cyl('top', g, 0.95, 0.95, 0.1, (10.5, 1.0, -2.6), C('#fff6ef'), r=0.045, seg=48)
    cyl('stem', g, 0.08, 0.1, 0.95, (10.5, 0.5, -2.6), C('#e2b088'), r=0.02, seg=16)
    cyl('foot', g, 0.45, 0.5, 0.06, (10.5, 0.06, -2.6), C('#e2b088'), r=0.025)
    for x in (9.45, 11.55):
        cyl(f'stool_{x}', g, 0.34, 0.34, 0.12, (x, 0.5, -2.6), C('#ffd27a'), r=0.05)
        cyl(f'stool_leg_{x}', g, 0.05, 0.05, 0.44, (x, 0.22, -2.6), C('#e2b088'), r=0.015, seg=12)
        cyl(f'stool_foot_{x}', g, 0.2, 0.22, 0.04, (x, 0.03, -2.6), C('#e2b088'), r=0.015)
    cyl('plate', g, 0.3, 0.26, 0.04, (10.5, 1.07, -2.6), C('#ffffff'), r=0.015)
    torus('plate_rim', g, 0.27, 0.012, (10.5, 1.09, -2.6), C('#ffc4d6'), rot=(math.pi / 2, 0, 0), seg=32, sides=6)
    # pendant lamp over the table
    cyl('cord', g, 0.012, 0.012, 1.4, (10.5, 3.9, -2.6), C('#8a7a80'), r=0.004, seg=8)
    cyl('shade', g, 0.08, 0.42, 0.36, (10.5, 3.05, -2.6), C('#ffc4d6'), r=0.04)
    ball('bulb', g, 0.12, (10.5, 2.86, -2.6), BULB)

# ---------- bathroom ----------
@piece
def bathtub(g):   # in EAST; the bubbles and the duck stay in room.html
    rbox('floor', g, (3.0, 0.22, 1.6), (12.6, 0.22, 5.2), C('#fffaf6'), r=0.08)
    for sd in (-1, 1):
        rbox(f'side_{sd}', g, (3.0, 0.8, 0.18), (12.6, 0.5, 5.2 + sd * 0.71), C('#fffaf6'), r=0.08)
        rbox(f'end_{sd}', g, (0.18, 0.8, 1.42), (12.6 + sd * 1.41, 0.5, 5.2), C('#fffaf6'), r=0.08)
    rbox('water', g, (2.7, 0.05, 1.3), (12.6, 0.66, 5.2), C('#a6dcf5'), r=0.02)
    for dx in (-1.35, 1.35):
        for dz in (-0.65, 0.65):
            ball(f'foot_{dx}_{dz}', g, 0.09, (12.6 + dx, 0.1, 5.2 + dz), C('#ffd27a'), seg=12)
    tube('spout', g, [tuple(V(*p)) for p in ((14.05, 0.9, 5.2), (14.05, 1.35, 5.2), (13.95, 1.42, 5.2), (13.85, 1.3, 5.2))], [1] * 4, C('#c7ccd8'), bevel=0.04)
    for dz in (-0.2, 0.2): ball(f'tap_{dz}', g, 0.05, (14.05, 1.1, 5.2 + dz), C('#c7ccd8'), seg=12)
    rbox('mat', g, (1.4, 0.03, 0.8), (12.4, 0.15, 6.5), C('#ffc4d6'), r=0.012)
    for i in range(3): rbox(f'mat_stripe_{i}', g, (1.2, 0.035, 0.06), (12.4, 0.152, 6.25 + i * 0.25), C('#ffffff'), r=0.01)

@piece
def toilet(g):   # in EAST
    rbox('tank', g, (0.3, 0.8, 0.7), (14.55, 0.9, 2.1), C('#ffffff'), r=0.08)
    rbox('tank_lid', g, (0.36, 0.06, 0.76), (14.55, 1.32, 2.1), C('#ffffff'), r=0.025)
    ball('flush', g, 0.05, (14.55, 1.37, 2.1), C('#ffc4d6'), seg=12)
    cyl('bowl', g, 0.3, 0.22, 0.45, (14.15, 0.35, 2.1), C('#ffffff'), r=0.08)
    torus('seat', g, 0.24, 0.07, (14.15, 0.6, 2.1), C('#ffc4d6'), rot=(math.pi / 2, 0, 0), seg=32, sides=10)
    rbox('roll_holder', g, (0.04, 0.04, 0.2), (14.7, 0.75, 2.75), C('#c7ccd8'), r=0.015)
    cyl('roll', g, 0.1, 0.1, 0.16, (14.62, 0.75, 2.75), C('#ffffff'), r=0.03, rot=(math.pi / 2, 0, 0))

@piece
def washbasin(g):   # in EAST
    cyl('pedestal', g, 0.1, 0.14, 0.75, (10.6, 0.48, 1.45), C('#ffffff'), r=0.04)
    cyl('basin', g, 0.4, 0.28, 0.22, (10.6, 0.95, 1.45), C('#ffffff'), r=0.08)
    cyl('basin_water', g, 0.32, 0.32, 0.01, (10.6, 1.06, 1.45), C('#d7eefb'), r=0.004)
    tube('faucet', g, [tuple(V(*p)) for p in ((10.6, 1.05, 1.2), (10.6, 1.22, 1.2), (10.6, 1.22, 1.35))], [1] * 3, C('#c7ccd8'), bevel=0.025)
    cyl('mirror_frame', g, 0.45, 0.45, 0.06, (10.6, 1.65, 1.12), C('#ffc4d6'), r=0.025, rot=(math.pi / 2, 0, 0), seg=48)
    cyl('mirror', g, 0.38, 0.38, 0.02, (10.6, 1.65, 1.16), C('#e6f6ff'), r=0.006, rot=(math.pi / 2, 0, 0), seg=48)
    rbox('glint', g, (0.06, 0.25, 0.005), (10.45, 1.75, 1.175), C('#ffffff'), r=0.003, rot=(0, 0, -0.6))
    cyl('towel_bar', g, 0.025, 0.025, 0.9, (12.6, 1.75, 1.2), C('#c7ccd8'), r=0.01, rot=(0, 0, math.pi / 2), seg=12)
    rbox('towel', g, (0.6, 0.6, 0.06), (12.6, 1.45, 1.18), C('#ffc4d6'), r=0.025)
    rbox('towel_band', g, (0.6, 0.05, 0.07), (12.6, 1.25, 1.18), C('#ffffff'), r=0.01)

# ---------- bedroom ----------
@piece
def bed(g):   # in LEFT
    x, z = -5.3, 10.4
    rbox('frame', g, (3.3, 0.45, 2.5), (x, 0.35, z), C('#e2b088'), r=0.08)
    rbox('headboard', g, (0.25, 1.6, 2.6), (-6.85, 0.9, z), C('#e2b088'), r=0.08)
    cyl('headboard_top', g, 1.25, 1.25, 0.25, (-6.85, 1.45, z), C('#e2b088'), r=0.07, rot=(0, 0, math.pi / 2), seg=48)
    cyl('headboard_heart_bg', g, 0.95, 0.95, 0.04, (-6.71, 1.55, z), C('#f1c99e'), r=0.015, rot=(0, 0, math.pi / 2), seg=40)
    rbox('mattress', g, (3.1, 0.34, 2.35), (x + 0.05, 0.72, z), C('#fffaf6'), r=0.13)
    rbox('blanket', g, (2.3, 0.16, 2.5), (x + 0.5, 0.9, z), C('#ffb3c8'), r=0.07)
    for sd in (-1, 1): rbox(f'drape_{sd}', g, (2.3, 0.42, 0.08), (x + 0.5, 0.75, z + sd * 1.24), C('#ffb3c8'), r=0.04)
    rbox('fold', g, (0.38, 0.2, 2.54), (x - 0.6, 0.93, z), C('#fff1f5'), r=0.09)
    for i in range(6):
        ball(f'dot_{i}', g, 0.07, (x + (i % 3) * 0.6, 0.98, z - 0.6 + (i // 3) * 1.2), C('#ffffff'), scale=(1, 0.3, 1), seg=12)
    for dz in (-0.6, 0.6): ball(f'pillow_{dz}', g, 0.42, (-6.3, 1.05, z + dz), C('#fff6fa'), scale=(0.8, 0.45, 1.25))
    for dx in (-1.5, 1.5):
        for dz in (-1.1, 1.1): leg(g, f'leg_{dx}_{dz}', x + dx, 0.0, 0.14, z + dz, '#c4926a', 0.07, 0.06)
    # a plush bear on the pillow
    p = node('plush', g, V(-6.2, 1.3, z + 1.05)); p.rotation_euler = R(0, math.pi / 2, 0)
    ball('plush_body', p, 0.16, (0, -0.05, 0), C('#d8a77d'))
    ball('plush_head', p, 0.13, (0, 0.17, 0), C('#d8a77d'))
    for sd in (-1, 1):
        ball(f'plush_ear_{sd}', p, 0.05, (sd * 0.1, 0.28, 0), C('#d8a77d'), seg=12)
        ball(f'plush_eye_{sd}', p, 0.018, (sd * 0.05, 0.2, 0.115), C('#4b3442'), seg=10)
        ball(f'plush_arm_{sd}', p, 0.06, (sd * 0.15, 0.0, 0.05), C('#d8a77d'), seg=12)
    ball('plush_muzzle', p, 0.05, (0, 0.14, 0.11), C('#fff4e0'), seg=12)

@piece
def nightstand(g):   # in LEFT; its light stays in room.html
    rbox('body', g, (0.9, 0.8, 0.8), (-6.45, 0.45, 12.4), C('#fff6ef'), r=0.07)
    rbox('drawer', g, (0.75, 0.28, 0.03), (-6.45, 0.55, 12.81), C('#ffeae2'), r=0.02)
    ball('knob', g, 0.04, (-6.45, 0.55, 12.84), C('#d9a0b0'), seg=12)
    cyl('lamp_base', g, 0.12, 0.15, 0.08, (-6.45, 0.89, 12.4), C('#d9a0b0'), r=0.025)
    ball('moon', g, 0.22, (-6.45, 1.1, 12.4), WINDOW, seg=28)
    rbox('book', g, (0.3, 0.06, 0.4), (-6.25, 0.88, 12.15), C('#8fc1f0'), r=0.02, rot=(0, 0.3, 0))

@piece
def wardrobe(g):   # in LEFT
    rbox('body', g, (1.0, 2.6, 1.8), (-6.4, 1.4, 8.3), C('#fde4d4'), r=0.1)
    rbox('crown', g, (1.1, 0.1, 1.9), (-6.4, 2.73, 8.3), C('#f6cdb8'), r=0.04)
    rbox('split', g, (0.03, 2.3, 0.02), (-5.89, 1.45, 8.3), C('#e9bfa8'), r=0.008)
    for dz in (-0.45, 0.45): rbox(f'door_{dz}', g, (0.02, 2.25, 0.8), (-5.9, 1.45, 8.3 + dz), C('#ffeadf'), r=0.01)
    for dz in (-0.15, 0.15): ball(f'knob_{dz}', g, 0.05, (-5.86, 1.5, 8.3 + dz), C('#ffffff'), seg=12)
    for dx in (-0.35, 0.35):
        for dz in (-0.75, 0.75): leg(g, f'leg_{dx}_{dz}', -6.4 + dx, 0.0, 0.12, 8.3 + dz, '#e9bfa8', 0.05, 0.045)
    for sd in (-1, 1): ball(f'heart_{sd}', g, 0.06, (-5.89, 2.2, 8.3 + sd * 0.45 + 0.04), C('#ffb3c8'), scale=(0.4, 1, 1), seg=10)

# ---------- plant balcony ----------
@piece
def planters(g):   # in the scene
    colors = ('#ff9fb5', '#ffd27a', '#c3a3f0', '#ffffff')
    for i in range(4):
        x = 8.2 + i * 1.6
        rbox(f'box_{i}', g, (1.45, 0.5, 0.45), (x, 0.3, 7.2), C('#fff6ef'), r=0.05)
        rbox(f'soil_{i}', g, (1.35, 0.06, 0.36), (x, 0.56, 7.2), C('#a8724e'), r=0.02)
        for k in range(4):
            ball(f'green_{i}_{k}', g, 0.15 + (k % 2) * 0.04, (x - 0.5 + k * 0.33, 0.68, 7.2), C('#9fd49a' if k % 3 else '#8ccf8a'), seg=14)
        for k, dx in enumerate((-0.35, 0.3)):
            flower(g, f'flower_{i}_{k}', x + dx, 0.86, 7.27, colors[(i + k) % 4], 0.04)

@piece
def balconyplants(g):   # in the scene
    cyl('big_pot', g, 0.42, 0.32, 0.7, (13.1, 0.4, 10.8), C('#f49a91'), r=0.05)
    bush(g, 'big_leaves', 13.1, 0, 10.8, [(0, 1.2, 0, 0.55), (0.3, 1.65, -0.1, 0.42), (-0.25, 1.55, 0.15, 0.4), (0.05, 2.0, 0.05, 0.32), (-0.35, 1.1, -0.2, 0.3)], '#7cc68a')
    # the little lemon tree
    cyl('lemon_pot', g, 0.3, 0.24, 0.5, (6.7, 0.3, 10.9), C('#c3e3dd'), r=0.04)
    cyl('trunk', g, 0.04, 0.06, 0.6, (6.7, 0.8, 10.9), C('#b88a62'), r=0.015, seg=12)
    ball('canopy', g, 0.45, (6.7, 1.3, 10.9), C('#9fd49a'))
    for i, (x, y, z) in enumerate(((6.45, 1.2, 11.2), (6.95, 1.45, 10.95), (6.6, 1.55, 10.6), (6.9, 1.1, 10.6))):
        ball(f'lemon_{i}', g, 0.08, (x, y, z), C('#ffd23f'), scale=(1, 0.85, 0.85), seg=12)
    for i, (x, z, c) in enumerate(((8.0, 11.05, '#ffc4d6'), (12.0, 11.05, '#b5ccff'), (13.3, 8.0, '#ffd27a'))):
        cyl(f'pot_{i}', g, 0.18, 0.14, 0.3, (x, 0.27, z), C(c), r=0.03)
        ball(f'pot_plant_{i}', g, 0.22, (x, 0.55, z), C('#8ccf8a'), seg=16)
    # the watering can
    cyl('can', g, 0.16, 0.18, 0.28, (12.7, 0.26, 8.0), C('#9fdcc8'), r=0.04)
    tube('can_spout', g, [tuple(V(*p)) for p in ((12.6, 0.2, 8.0), (12.45, 0.35, 8.0), (12.35, 0.5, 8.0))], [1.2, 1, 0.8], C('#9fdcc8'), bevel=0.03)
    torus('can_handle', g, 0.13, 0.025, (12.78, 0.45, 8.0), C('#9fdcc8'), arc=math.pi, seg=16, sides=6)

@piece
def beanbags(g):   # in the scene
    def squish(co):
        if co.z < -0.3: co.z = -0.3 + (co.z + 0.3) * 0.3        # sits flat on the floor
        if co.z > 0.6: co.z = 0.6 + (co.z - 0.6) * 0.4          # a soft dent on top
    for i, (x, c) in enumerate(((9.2, '#ffc4d6'), (10.8, '#b5ccff'))):
        o = blob(f'bag_{i}', g, (0, 0, 0), (0.6, 0.6, 0.38), C(c), seg=36, ring=20, shape=squish)
        o.location = V(x, 0.3, 9.7)
    cyl('table', g, 0.3, 0.3, 0.06, (10.0, 0.5, 10.5), C('#fff6ef'), r=0.025)
    cyl('table_stem', g, 0.05, 0.07, 0.4, (10.0, 0.28, 10.5), C('#e2b088'), r=0.015, seg=12)
    cyl('table_foot', g, 0.18, 0.2, 0.04, (10.0, 0.1, 10.5), C('#e2b088'), r=0.015)
    for dx, c in ((-0.1, '#ff9fb5'), (0.12, '#8fc1f0')):
        mug(g, f'mug_{dx}', 10.0 + dx, 0.6, 10.5, c, r=0.06, h=0.12)

root = scenery(WHO)
BUILT[WHO](root)
finish(reach=0.4, view='auto', strength=0.3, join=root)
