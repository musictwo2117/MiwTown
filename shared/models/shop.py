# Miw's Town: Miw's Cheesecake, the shop the intro video is set in, sculpted in Blender.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P shared/models/shop.py -- shared/models/shop.glb [preview.png]
# The output file's name picks the piece, each in the same coordinates video/intro.html builds around it:
#   shop     — the set, in the shop group's space (the wallpaper wall is z = 0, +z comes towards the camera)
#   sign     — the chalkboard's frame, in the same space as shop; the page keeps it in focus as the title
#   bigcake  — the giant strawberry cheesecake on its stand and the counter under it; the friends stand on its top at y = 0
#   shoplamp — a pendant lamp hanging down from its origin; "bulb" is swapped for the page's glowing material
# Flat pictures (the chalkboard's lettering, the view through the window, the wallpaper) stay as canvas
# textures in the page; this builds everything around them.
import os, sys, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

BULB = material('bulb', '#fff6d8', 0.3)
WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def piece(fn):
    BUILT[fn.__name__] = fn
    return fn

CREAM, WOOD, WOOD_DK, PINK, ROSE = '#fff4e6', '#e8b886', '#d39c6a', '#f6c3cf', '#f48fa8'
TOPPINGS = ['#f48fa8', '#9d8fe0', '#b5d98f', '#ffd27a', '#f6a96b']

def strawberry(g, name, x, y, z, s=1.0, lean=0.0):
    ball(f'{name}_body', g, 0.16 * s, (x, y + 0.12 * s, z), C('#ef5470'), scale=(1, 1.15, 1), rot=(0, 0, lean), seg=16)
    cyl(f'{name}_tip', g, 0.15 * s, 0.02 * s, 0.16 * s, (x, y - 0.0 * s, z), C('#ef5470'), r=0.02 * s, rot=(0, 0, lean), seg=16)
    for k in range(5):
        a = k / 5 * 2 * math.pi
        ball(f'{name}_leaf_{k}', g, 0.05 * s, (x + math.sin(a) * 0.07 * s, y + 0.27 * s, z + math.cos(a) * 0.07 * s), C('#7cc68a'),
             scale=(1, 0.4, 1.8), rot=(0, a, 0), seg=8)
    for k in range(6):   # seeds
        a = k / 6 * 2 * math.pi + 0.3
        ball(f'{name}_seed_{k}', g, 0.012 * s, (x + math.sin(a) * 0.15 * s, y + (0.08 + 0.06 * (k % 2)) * s, z + math.cos(a) * 0.15 * s), C('#fff1a8'), seg=6)

def cheesecake(g, name, x, y, z, r, top, berry=True):
    """A whole cheesecake: graham crust, cream cheese body, a glaze that drips over the edge, a strawberry on top."""
    cyl(f'{name}_crust', g, r, r * 0.98, r * 0.22, (x, y + r * 0.11, z), C('#c98b4b'), r=r * 0.05)
    cyl(f'{name}_body', g, r * 0.98, r * 0.99, r * 0.6, (x, y + r * 0.52, z), C('#fff0cf'), r=r * 0.08)
    cyl(f'{name}_glaze', g, r * 1.01, r * 1.01, r * 0.1, (x, y + r * 0.86, z), C(top), r=r * 0.05)
    for k in range(9):
        a = k / 9 * 2 * math.pi + 0.2
        ball(f'{name}_drip_{k}', g, r * 0.09, (x + math.sin(a) * r * 1.0, y + r * 0.76, z + math.cos(a) * r * 1.0), C(top), scale=(1, 1.6 + (k % 3) * 0.5, 0.7), seg=10)
    if berry: strawberry(g, f'{name}_berry', x, y + r * 0.92, z, r * 1.3)

def slice_on_plate(g, name, x, y, z, top, turn=0.0):
    cyl(f'{name}_plate', g, 0.24, 0.2, 0.04, (x, y + 0.02, z), C('#ffffff'), r=0.015)
    pts = [(0, 0)] + [(0.2 * math.sin(-0.35 + 0.7 * i / 6), 0.2 * math.cos(-0.35 + 0.7 * i / 6)) for i in range(7)]
    for part, h, y0, col in (('crust', 0.04, 0.04, '#c98b4b'), ('cake', 0.12, 0.08, '#fff0cf'), ('glaze', 0.03, 0.2, top)):
        prism(f'{name}_{part}', g, pts, h, (x, y + y0 + h / 2, z), C(col), r=0.01, rot=(math.pi / 2, turn, 0))
    strawberry(g, f'{name}_berry', x + math.sin(turn) * 0.1, y + 0.23, z + math.cos(turn) * 0.1, 0.45)

def jar(g, name, x, y, z, color):
    cyl(f'{name}_glass', g, 0.15, 0.15, 0.32, (x, y + 0.16, z), C(color), r=0.05)
    cyl(f'{name}_label', g, 0.153, 0.153, 0.12, (x, y + 0.15, z), C('#fffaf3'), r=0.01)
    cyl(f'{name}_lid', g, 0.17, 0.17, 0.07, (x, y + 0.355, z), C('#fffaf3'), r=0.025)
    for k in range(6):   # a gingham-ish dotted lid
        a = k / 6 * 2 * math.pi
        ball(f'{name}_dot_{k}', g, 0.022, (x + math.sin(a) * 0.17, y + 0.355, z + math.cos(a) * 0.17), C('#f48fa8'), seg=6)

def bush(g, name, x, y, z, parts, color='#9fd49a'):
    for i, (dx, dy, dz, r) in enumerate(parts):
        ball(f'{name}_{i}', g, r, (x + dx, y + dy, z + dz), C(color), seg=16)

def flower(g, name, x, y, z, color, size=0.05):
    for k in range(5):
        b = k / 5 * 2 * math.pi
        ball(f'{name}_petal_{k}', g, size, (x + math.cos(b) * size * 1.1, y + math.sin(b) * size * 1.1, z), C(color), scale=(1, 1, 0.5), seg=10)
    ball(f'{name}_heart', g, size * 0.7, (x, y, z + 0.02), C('#fff3b0'), seg=10)

def scallops(g, name, x0, x1, y, z, color, r=0.13, squash=0.6):
    n = max(2, round((x1 - x0) / (r * 1.9)))
    for k in range(n):
        x = x0 + (x1 - x0) * (k + 0.5) / n
        ball(f'{name}_{k}', g, r, (x, y, z), C(color), scale=(1, squash, 0.55), seg=14)

# ---------- the set ----------
@piece
def shop(g):
    # wainscot: pink boards with raised panels, a cream chair rail and a row of scallops under it
    rbox('wainscot', g, (34, 2.8, 0.2), (0, -1.6, 0.1), C(PINK), r=0.04)
    for k, x in enumerate([-16 + 1.6 * i for i in range(21)]):
        rbox(f'panel_{k}', g, (1.1, 1.6, 0.08), (x, -1.65, 0.22), C('#f9d0da'), r=0.06)
    rbox('rail', g, (34, 0.2, 0.34), (0, -0.25, 0.17), C(CREAM), r=0.07)
    scallops(g, 'rail_scallop', -17, 17, -0.4, 0.3, CREAM, r=0.12)

    # the window: rounded frame, mullions, a striped awning with a scalloped hem, a sill with a flower box
    wx, wy, ww, wh = -4.3, 2.1, 2.24, 2.08
    for nm, size, loc in (('top', (ww + 0.36, 0.2, 0.22), (wx, wy + wh / 2 + 0.08, 0.14)), ('bottom', (ww + 0.36, 0.2, 0.22), (wx, wy - wh / 2 - 0.08, 0.14)),
                          ('left', (0.2, wh + 0.2, 0.22), (wx - ww / 2 - 0.08, wy, 0.14)), ('right', (0.2, wh + 0.2, 0.22), (wx + ww / 2 + 0.08, wy, 0.14))):
        rbox(f'win_{nm}', g, size, loc, C('#fffaf6'), r=0.07)
    rbox('win_mullion_v', g, (0.09, wh, 0.1), (wx, wy, 0.2), C('#fffaf6'), r=0.03)
    rbox('win_mullion_h', g, (ww, 0.09, 0.1), (wx, wy + 0.12, 0.2), C('#fffaf6'), r=0.03)
    for k in range(7):
        x = wx - 1.35 + k * 0.45
        rbox(f'awning_{k}', g, (0.45, 0.62, 0.06), (x, wy + wh / 2 + 0.55, 0.42), C(ROSE if k % 2 == 0 else CREAM), r=0.02, rot=(-0.75, 0, 0))
    scallops(g, 'awning_hem', wx - 1.58, wx + 1.58, wy + wh / 2 + 0.3, 0.68, ROSE, r=0.115, squash=0.75)
    rbox('awning_bar', g, (3.3, 0.1, 0.1), (wx, wy + wh / 2 + 0.78, 0.18), C(WOOD_DK), r=0.04)
    rbox('sill', g, (ww + 0.7, 0.14, 0.5), (wx, wy - wh / 2 - 0.22, 0.25), C('#fffaf6'), r=0.05)
    rbox('flowerbox', g, (1.3, 0.3, 0.32), (wx - 0.35, wy - wh / 2 - 0.02, 0.32), C('#bfe6d0'), r=0.07)
    rnd = random.Random(5)
    for k in range(6):
        x = wx - 0.9 + k * 0.22
        bush(g, f'box_leaf_{k}', x, wy - wh / 2 + 0.18, 0.34, [(0, 0, 0, 0.1), (0.06, 0.05, 0.05, 0.07)])
        flower(g, f'box_flower_{k}', x + 0.03, wy - wh / 2 + 0.3 + rnd.random() * 0.06, 0.45, ('#ff9fb5', '#ffffff', '#ffd27a')[k % 3], 0.045)
    cheesecake(g, 'sill_cake', wx + 0.75, wy - wh / 2 - 0.15, 0.3, 0.26, '#9d8fe0')

    # shelves on the right: scalloped wooden boards on brackets, lined with cheesecakes, slices and jam
    sx = 4.4
    for row, y in enumerate((0.95, 2.39)):
        rbox(f'shelf_{row}', g, (3.1, 0.13, 0.72), (sx, y, 0.42), C(WOOD), r=0.05)
        scallops(g, f'shelf_hem_{row}', sx - 1.5, sx + 1.5, y - 0.12, 0.76, WOOD, r=0.1, squash=0.7)
        for k, dx in enumerate((-1.2, 1.2)):
            prism(f'bracket_{row}_{k}', g, [(0, 0), (0.5, 0), (0, -0.4)], 0.09, (sx + dx, y - 0.07, 0.08), C(WOOD_DK), r=0.02, rot=(0, -math.pi / 2, 0))
    cheesecake(g, 'shelf_cake_a', sx - 1.0, 1.02, 0.45, 0.34, TOPPINGS[0])
    slice_on_plate(g, 'shelf_slice_a', sx + 0.05, 1.02, 0.5, TOPPINGS[2], 0.4)
    jar(g, 'shelf_jar_a', sx + 0.75, 1.02, 0.45, '#f48fa8'); jar(g, 'shelf_jar_b', sx + 1.15, 1.02, 0.45, '#9d8fe0')
    # top shelf: a little tiered stand with mini cheesecakes, and a stack of cake boxes tied with ribbon
    cyl('stand_low', g, 0.42, 0.42, 0.04, (sx - 0.85, 2.62, 0.45), C('#ffffff'), r=0.015)
    cyl('stand_stem', g, 0.04, 0.04, 0.5, (sx - 0.85, 2.73, 0.45), C('#ffffff'), r=0.015, seg=12)
    cyl('stand_high', g, 0.28, 0.28, 0.04, (sx - 0.85, 2.98, 0.45), C('#ffffff'), r=0.015)
    cyl('stand_foot', g, 0.18, 0.22, 0.17, (sx - 0.85, 2.53, 0.45), C('#ffffff'), r=0.03)
    for k, (dx, dz) in enumerate(((-0.24, 0.12), (0.24, 0.12), (0, -0.2))):
        cheesecake(g, f'mini_{k}', sx - 0.85 + dx, 2.64, 0.45 + dz, 0.13, TOPPINGS[k + 1])
    cheesecake(g, 'mini_top', sx - 0.85, 3.0, 0.45, 0.14, TOPPINGS[0])
    for k, (w, h, y, c) in enumerate(((0.75, 0.32, 2.615, '#fff6ea'), (0.62, 0.28, 2.915, PINK), (0.5, 0.24, 3.175, '#fff6ea'))):
        rbox(f'box_{k}', g, (w, h, w * 0.8), (sx + 0.75, y, 0.45), C(c), r=0.04, rot=(0, (k - 1) * 0.15, 0))
        rbox(f'box_ribbon_{k}', g, (w + 0.01, h + 0.01, 0.06), (sx + 0.75, y, 0.45), C(ROSE), r=0.01, rot=(0, (k - 1) * 0.15, 0))
    for k in (-1, 1):
        ball(f'bow_loop_{k}', g, 0.09, (sx + 0.75 + k * 0.09, 3.33, 0.45), C(ROSE), scale=(1, 0.6, 0.5), seg=10)
    # a cup of tea between them (the page sends steam up from it, at (sx, 2.68, 0.45))
    cyl('saucer', g, 0.19, 0.15, 0.03, (sx, 2.47, 0.45), C('#ffffff'), r=0.012)
    cyl('cup', g, 0.12, 0.09, 0.17, (sx, 2.57, 0.45), C('#ffffff'), r=0.03)
    cyl('cup_band', g, 0.122, 0.112, 0.03, (sx, 2.6, 0.45), C(ROSE), r=0.01)
    cyl('tea', g, 0.105, 0.105, 0.01, (sx, 2.645, 0.45), C('#c98a5a'), r=0.004)
    torus('cup_handle', g, 0.055, 0.016, (sx + 0.13, 2.57, 0.45), C('#ffffff'), seg=16, sides=6)

    # a cheesecake-wheel clock: crust rim, cream face, strawberry hours and a chocolate hour hand (the page turns the minute hand)
    cx, cy, cz = 4.85, 4.0, 0.12
    cyl('clock_crust', g, 0.62, 0.62, 0.16, (cx, cy, cz), C('#c98b4b'), r=0.06, rot=(math.pi / 2, 0, 0))
    cyl('clock_face', g, 0.53, 0.53, 0.18, (cx, cy, cz + 0.01), C('#fff0cf'), r=0.05, rot=(math.pi / 2, 0, 0))
    torus('clock_glaze', g, 0.53, 0.04, (cx, cy, cz + 0.1), C(ROSE), seg=40, sides=8)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        if k % 3 == 0:
            ball(f'clock_hour_{k}', g, 0.06, (cx + math.sin(a) * 0.42, cy + math.cos(a) * 0.42, cz + 0.12), C('#ef5470'), scale=(1, 1.15, 0.6), seg=10)
        else:
            ball(f'clock_tick_{k}', g, 0.025, (cx + math.sin(a) * 0.43, cy + math.cos(a) * 0.43, cz + 0.11), C('#c98b4b'), seg=8)
    rbox('clock_hand_h', g, (0.05, 0.26, 0.03), (cx + 0.08, cy + 0.08, cz + 0.13), C('#6b3d45'), r=0.02, rot=(0, 0, -math.pi / 4))
    ball('clock_pin', g, 0.045, (cx, cy, cz + 0.17), C('#ef5470'), seg=10)

    # pastel bunting either side of the sign, on a soft cord
    for side in (-1, 1):
        xs = [side * (3.15 + i * 0.52) for i in range(6)]
        sag = lambda x: 5.25 - 0.28 * math.sin(math.pi * (abs(x) - 3.15) / 2.6)
        tube(f'cord_{side}', g, [tuple(V(x, sag(x) + 0.02, 0.32)) for x in xs], [1] * len(xs), C('#c99a74'), bevel=0.015)
        for i, x in enumerate(xs[:-1]):
            xm = x + side * 0.26
            prism(f'flag_{side}_{i}', g, [(-0.2, 0), (0.2, 0), (0, -0.42)], 0.04, (xm, sag(xm), 0.3), C(['#ffb3c1', '#ffd6a5', '#fdf3a7', '#caffbf', '#a6ecf5', '#d3c4ff'][i]), r=0.015)

# ---------- the chalkboard sign, kept in focus as the video's title ----------
@piece
def sign(g):
    # the chalkboard's frame: soft wood with round corner knobs and a strawberry on top
    bx, by, bw, bh = 0, 3.85, 5.0, 1.95
    for nm, size, loc in (('top', (bw + 0.5, 0.22, 0.2), (bx, by + bh / 2 + 0.1, 0.12)), ('bottom', (bw + 0.5, 0.22, 0.2), (bx, by - bh / 2 - 0.1, 0.12)),
                          ('left', (0.22, bh + 0.2, 0.2), (bx - bw / 2 - 0.12, by, 0.12)), ('right', (0.22, bh + 0.2, 0.2), (bx + bw / 2 + 0.12, by, 0.12))):
        rbox(f'board_{nm}', g, size, loc, C(WOOD), r=0.08)
    rbox('board_back', g, (bw + 0.2, bh + 0.1, 0.1), (bx, by, 0.05), C('#4a3b3f'), r=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1):
            ball(f'board_knob_{sx}{sy}', g, 0.14, (bx + sx * (bw / 2 + 0.12), by + sy * (bh / 2 + 0.1), 0.2), C(WOOD_DK), seg=14)
    strawberry(g, 'board_berry', bx, by + bh / 2 + 0.2, 0.2, 1.3)
    rbox('board_ledge', g, (bw - 0.4, 0.1, 0.28), (bx, by - bh / 2 - 0.25, 0.22), C(WOOD), r=0.04)
    for k, c in enumerate(('#fff6ea', '#ffb3c1', '#b5ccff')):   # chalk on the ledge
        cyl(f'chalk_{k}', g, 0.035, 0.035, 0.22, (bx - 1.6 + k * 0.32, by - bh / 2 - 0.17, 0.26), C(c), r=0.015, rot=(0, 0, math.pi / 2))

# ---------- the giant cheesecake the friends ride ----------
@piece
def bigcake(g):
    # the marble counter the stand sits on, with a pink edge; it belongs with the cake so it stays in focus
    rbox('counter', g, (26, 0.3, 9), (0, -2.65, -1.5), C('#fbf3ee'), r=0.08)
    rbox('counter_trim', g, (26, 0.12, 0.2), (0, -2.85, 3.0), C(PINK), r=0.05)
    cyl('glaze', g, 3.4, 3.4, 0.12, (0, -0.05, 0), C('#f48fa8'), r=0.05, seg=96)
    cyl('cream', g, 3.36, 3.36, 0.9, (0, -0.55, 0), C('#fff0cf'), r=0.12, seg=96)
    cyl('crust', g, 3.42, 3.38, 0.3, (0, -1.14, 0), C('#c98b4b'), r=0.1, seg=96)
    rnd = random.Random(11)
    for i in range(44):
        a = i / 44 * 2 * math.pi + rnd.random() * 0.06
        ln = 0.12 + rnd.random() * 0.3
        ball(f'drip_{i}', g, 0.1 + rnd.random() * 0.05, (math.sin(a) * 3.37, -0.1 - ln * 0.5, math.cos(a) * 3.37), C('#f07f9c'), scale=(1, 1 + ln * 4, 0.6), rot=(0, a, 0), seg=14)
    for i in range(70):
        a = rnd.random() * 2 * math.pi
        ball(f'crumb_{i}', g, 0.035 + rnd.random() * 0.03, (math.sin(a) * 3.41, -1.27 + rnd.random() * 0.24, math.cos(a) * 3.41), C('#b5763c' if rnd.random() < 0.5 else '#dba062'), seg=8)
    for i in range(16):
        a = (i + 0.5) / 16 * 2 * math.pi
        strawberry(g, f'berry_{i}', math.sin(a) * 3.12, 0.01, math.cos(a) * 3.12, 1.0, (rnd.random() - 0.5) * 0.4)
    # the stand: a white plate with a scalloped rim on a pedestal
    cyl('plate', g, 3.85, 3.7, 0.1, (0, -1.34, 0), C('#fffaf6'), r=0.04, seg=96)
    for i in range(48):
        a = i / 48 * 2 * math.pi
        ball(f'plate_scallop_{i}', g, 0.13, (math.sin(a) * 3.86, -1.33, math.cos(a) * 3.86), C('#fffaf6'), scale=(1, 0.45, 1), seg=10)
    revolve('pedestal', g, [(0.0005, -1.38), (0.5, -1.4), (0.42, -1.6), (0.38, -1.9), (0.5, -2.2), (0.9, -2.33), (1.55, -2.38), (1.6, -2.48), (0.0005, -2.5)], C('#fffaf6'), seg=64)

# ---------- a pendant lamp ----------
@piece
def shoplamp(g):
    cyl('cord', g, 0.02, 0.02, 4.3, (0, -2.15, 0), C('#8a6a5a'), r=0.008, seg=8)
    cyl('cap', g, 0.08, 0.13, 0.14, (0, -4.35, 0), C(WOOD_DK), r=0.03, seg=16)
    dome('shade', g, 0.62, (0, -4.95, 0), C('#ffd6a5'), squash=0.9, seg=40, lip=0.06)
    for i in range(16):
        a = i / 16 * 2 * math.pi
        ball(f'shade_scallop_{i}', g, 0.09, (math.sin(a) * 0.65, -4.98, math.cos(a) * 0.65), C('#fff4e6'), scale=(1, 0.6, 1), seg=10)
    ball('bulb', g, 0.2, (0, -5.0, 0), BULB, seg=18)

root = scenery(WHO)
BUILT[WHO](root)
finish(reach=0.4, view='auto', strength=0.3, join=root)
