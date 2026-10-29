# Miw's Town: the buildings, rebuilt in Blender with rounded edges and baked soft shadows.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P models/town.py -- models/cottage.glb [preview.png]
# The output file's name picks the building. Each one keeps the layout of its code-built twin in town.html
# (same footprint, door facing +z towards the road), and its moving parts are empty nodes with names the town
# animates: see SCULPTED in town.html.
import os, sys; sys.path.insert(0, os.path.dirname(__file__))
from kit import *

WINDOW = material('window', '#cfe9ff', 0.3)   # the town swaps in its own window glass, which lights up at night
GLOW = material('glow', '#fff6c8', 0.3)
BULB = material('bulb', '#fff3c4', 0.3)
WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def building(fn):
    BUILT[fn.__name__] = fn
    return fn

def fence(g, n, radius, a0, step, color='#ffffff'):
    for i in range(n):
        a = a0 + i * step
        x, z = math.sin(a) * radius, math.cos(a) * radius
        rbox(f'picket_{i}', g, (0.11, 0.42, 0.07), (x, 0.28, z), C(color), r=0.025, rot=(0, a, 0))
        ball(f'picket_top_{i}', g, 0.06, (x, 0.5, z), C(color), scale=(1, 1.1, 0.7), rot=(0, a, 0))
    for k, y in enumerate((0.2, 0.38)):
        pts = [tuple(V(math.sin(a0 + i * step / 2) * (radius - 0.045), y, math.cos(a0 + i * step / 2) * (radius - 0.045))) for i in range(2 * n - 1)]
        tube(f'rail_{k}', g, pts, [1] * len(pts), C(color), bevel=0.022)

def flowers(g, name, x, y, z, colors=('#ff9fb5', '#ffd27a', '#c3a3f0'), spread=0.16, a=0):
    for i, c in enumerate(colors):
        o = (i - 1) * spread
        px, pz = x + math.cos(a) * o, z - math.sin(a) * o
        for k in range(5):
            b = k / 5 * 2 * math.pi
            ball(f'{name}_petal_{i}{k}', g, 0.035, (px + math.cos(b) * 0.04, y, pz + math.sin(b) * 0.04), C(c), scale=(1, 0.6, 1), seg=10)
        ball(f'{name}_heart_{i}', g, 0.025, (px, y + 0.01, pz), C('#fff3b0'), seg=10)

def puff_spot(g, name, x, y, z):
    """Where the town puts its smoke or steam puffs."""
    return node(name, g, V(x, y, z))

# ---------- 🏡 Cozy Cottage: a mushroom house with a polka-dot cap ----------
@building
def cottage(g):
    cyl('base', g, 1.6, 1.62, 0.14, (0, 0.07, 0), C('#f7e3ea'), r=0.05, seg=48)
    cyl('walls', g, 1.05, 1.18, 1.55, (0, 0.92, 0), C('#fff6e8'), r=0.08, seg=40)
    # a rounded cap with a curled lip and white spots
    dome('cap', g, 1.6, (0, 1.62, 0), C('#ff8fab'), squash=0.8, lip=0.14, seg=48)
    cyl('cap_rim', g, 1.5, 1.35, 0.12, (0, 1.58, 0), C('#ffe0e8'), r=0.05, seg=48)
    for i, (th, ph, r) in enumerate([(0.3, 0.55, 0.22), (1.4, 0.75, 0.2), (2.5, 0.5, 0.24), (3.6, 0.8, 0.18), (4.7, 0.6, 0.22),
                                     (5.6, 0.95, 0.16), (0.9, 1.1, 0.16), (3.0, 1.15, 0.15), (0, 0.05, 0.2)]):
        n = Vector((math.sin(ph) * math.cos(th), math.cos(ph), math.sin(ph) * math.sin(th)))
        p = Vector((n.x * 1.6, 1.62 + n.y * 1.6 * 0.8, n.z * 1.6))
        o = ball(f'spot_{i}', g, r, tuple(p), C('#ffffff'), scale=(1, 0.3, 1))
        nb = V(*n).normalized()
        o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = nb.to_track_quat('Z', 'Y')
        o.scale = (r, r, r * 0.3)
    # an arched wooden door with planks, a heart window and a brass knob
    rbox('door', g, (0.62, 0.5, 0.1), (0, 0.4, 1.12), C('#d9967a'), r=0.03)
    cyl('door_top', g, 0.31, 0.31, 0.1, (0, 0.65, 1.12), C('#d9967a'), r=0.03, rot=(math.pi / 2, 0, 0), sweep=math.pi)
    for k in (-0.15, 0, 0.15):
        rbox(f'plank_{k}', g, (0.012, 0.62, 0.02), (k, 0.48, 1.18), C('#c07e62'), r=0.004)
    ball('knob', g, 0.045, (0.2, 0.45, 1.19), C('#ffd27a'))
    cyl('step', g, 0.45, 0.48, 0.08, (0, 0.18, 1.35), C('#f1d5c8'), r=0.03)
    # round windows with white frames and flower boxes
    for sd in (-1, 1):
        a = sd * 0.95
        x, z = math.sin(a) * 1.11, math.cos(a) * 1.11
        cyl(f'window_{sd}', g, 0.22, 0.22, 0.08, (x, 1.15, z), WINDOW, r=0.02, rot=(math.pi / 2, a, 0))
        torus(f'frame_{sd}', g, 0.24, 0.04, (x * 1.01, 1.15, z * 1.01), C('#ffffff'), rot=(0, a, 0))
        rbox(f'cross_{sd}', g, (0.44, 0.025, 0.02), (x * 1.02, 1.15, z * 1.02), C('#ffffff'), r=0.008, rot=(0, a, 0))
        rbox(f'box_{sd}', g, (0.55, 0.14, 0.18), (x * 1.08, 0.86, z * 1.08), C('#c9a27e'), r=0.03, rot=(0, a, 0))
        flowers(g, f'flowers_{sd}', x * 1.08, 0.97, z * 1.08, a=a)
    # chimney (smoke comes from the town)
    cyl('chimney', g, 0.14, 0.16, 0.7, (0.65, 2.55, -0.45), C('#e8a07a'), r=0.03)
    cyl('chimney_cap', g, 0.19, 0.19, 0.08, (0.65, 2.92, -0.45), C('#d98a66'), r=0.025)
    puff_spot(g, 'smoke', 0.65, 2.95, -0.45)
    # stepping stones, little mushrooms and a picket fence round the front garden
    for i, (x, z) in enumerate([(0, 1.65), (-0.15, 1.95)]):
        cyl(f'stone_{i}', g, 0.17, 0.18, 0.05, (x, 0.15, z), C('#efe2ea'), r=0.02)
    for i, (x, z, s) in enumerate([(-1.35, 0.9, 1.0), (-1.2, 1.15, 0.7), (1.3, 1.0, 0.85)]):
        cyl(f'shroom_stem_{i}', g, 0.05 * s, 0.06 * s, 0.16 * s, (x, 0.14 + 0.08 * s, z), C('#fff6e8'), r=0.02)
        dome(f'shroom_cap_{i}', g, 0.12 * s, (x, 0.14 + 0.16 * s, z), C('#ff8fab'), squash=0.75, seg=20)
    fence(g, 11, 2.05, -1.1, 0.22)
    # the floating heart the town bobs and spins
    heart = node('heart', g, V(0, 3.25, 0))
    for sd in (-1, 1): ball(f'heart_lobe_{sd}', heart, 0.14, (sd * 0.1, 0.05, 0), C('#ff7b9c'))
    cyl('heart_tip', heart, 0.0, 0.2, 0.28, (0, -0.12, 0), C('#ff7b9c'), r=0.03, rot=(math.pi, math.pi / 4, 0), seg=4)

def arched_door(g, name, w, h, loc, color, knob=True, frame=None):
    """A door whose top is a half circle, facing +z; loc is the bottom centre of the door."""
    x, y, z = loc
    rbox(f'{name}', g, (w, h - w / 2, 0.08), (x, y + (h - w / 2) / 2, z), C(color), r=0.025)
    cyl(f'{name}_top', g, w / 2, w / 2, 0.08, (x, y + h - w / 2, z), C(color), r=0.025, rot=(math.pi / 2, 0, 0), sweep=math.pi)
    if frame:
        torus(f'{name}_arch', g, w / 2 + 0.03, 0.03, (x, y + h - w / 2, z + 0.03), C(frame), arc=math.pi, seg=20, sides=6)
    if knob: ball(f'{name}_knob', g, 0.04, (x + w * 0.3, y + h * 0.42, z + 0.06), C('#ffd27a'))

def framed_window(g, name, w, h, loc, frame='#ffffff', rot=(0, 0, 0)):
    x, y, z = loc
    rbox(f'{name}', g, (w, h, 0.05), loc, WINDOW, r=0.015, rot=rot)
    rbox(f'{name}_frame', g, (w + 0.08, h + 0.08, 0.03), (x, y, z - 0.02), C(frame), r=0.015, rot=rot)
    rbox(f'{name}_bar', g, (0.025, h, 0.02), (x, y, z + 0.03), C(frame), r=0.006, rot=rot)

# ---------- 🔭 Thinking Tower: a striped observatory with a turning dome and an idea bulb ----------
@building
def tower(g):
    cyl('base', g, 1.25, 1.27, 0.15, (0, 0.08, 0), C('#f1e9ff'), r=0.05, seg=40)
    cyl('tower', g, 0.9, 1.05, 2.6, (0, 1.45, 0), C('#efe8ff'), r=0.06, seg=40)
    for i, y in enumerate((0.7, 1.5, 2.3)):
        torus(f'band_{i}', g, 1.05 - (y - 0.15) / 2.6 * 0.15, 0.05, (0, y, 0), C('#c9b8f5'), rot=(math.pi / 2, 0, 0), seg=40)   # hugging the tapered wall
    cyl('ledge', g, 1.04, 1.0, 0.1, (0, 2.76, 0), C('#c9b8f5'), r=0.04, seg=40)
    for i, a in enumerate((0, 1.6, 3.2, 4.8)):
        x, z = math.sin(a) * 0.97, math.cos(a) * 0.97
        rbox(f'win_{i}', g, (0.28, 0.32, 0.06), (x, 1.8, z), WINDOW, r=0.015, rot=(0, a, 0))
        cyl(f'win_top_{i}', g, 0.14, 0.14, 0.06, (x, 1.96, z), WINDOW, r=0.015, rot=(math.pi / 2, a, 0), sweep=math.pi)
        rbox(f'sill_{i}', g, (0.36, 0.05, 0.1), (x * 1.03, 1.62, z * 1.03), C('#c9b8f5'), r=0.02, rot=(0, a, 0))
    arched_door(g, 'door', 0.5, 0.85, (0, 0.15, 1.04), '#a493d6', frame='#c9b8f5')
    # the dome turns to and fro; its telescope peeks out of the slot
    dm = node('dome', g, V(0, 2.75, 0))
    dome('cap', dm, 0.98, (0, 0, 0), C('#b9a6f5'), squash=1.0, seg=40)
    rbox('slot', dm, (0.32, 0.9, 0.3), (0, 0.45, 0.62), C('#5b4a8a'), r=0.04, rot=(-0.55, 0, 0))
    for i, (a, ph) in enumerate(((1.2, 0.6), (2.6, 0.9), (4.4, 0.5), (5.4, 1.0))):
        n = Vector((math.sin(ph) * math.sin(a), math.cos(ph), math.sin(ph) * math.cos(a)))
        ball(f'star_{i}', dm, 0.05, tuple(n * 0.99), C('#fff1b0'), seg=10)
    cyl('scope', dm, 0.12, 0.17, 1.1, (0, 1.0, 0.7), C('#7b6bb8'), r=0.03, rot=(0.6, 0, 0))
    cyl('lens', dm, 0.19, 0.19, 0.08, (0, 1.47, 1.03), C('#fff1b0'), r=0.03, rot=(0.6, 0, 0))
    # thought bubbles rising to a glowing light bulb
    idea = node('idea', g, V(0, 0, 0))
    for i, (x, y, r) in enumerate(((0.55, 3.95, 0.14), (0.8, 4.3, 0.19))):
        ball(f'bubble_{i}', idea, r, (x, y, 0), C('#ffffff'))
    bulb = node('bulb', idea, V(0.95, 4.95, 0))
    ball('glass', bulb, 0.36, (0, 0, 0), GLOW, seg=28)
    cyl('screw', bulb, 0.16, 0.18, 0.26, (0, -0.4, 0), C('#c7ccd8'), r=0.03)
    for i, y in enumerate((-0.48, -0.42, -0.36)):
        torus(f'thread_{i}', bulb, 0.175, 0.022, (0, y, 0), C('#a8adbb'), rot=(math.pi / 2, 0, 0), seg=20, sides=6)
    for i in range(6):
        a = i / 6 * 2 * math.pi
        rbox(f'ray_{i}', bulb, (0.06, 0.18, 0.06), (math.cos(a) * 0.58, math.sin(a) * 0.58 + 0.1, 0), C('#ffe58a'), r=0.025, rot=(0, 0, a - math.pi / 2))

# ---------- ✏️ Writing Studio: a spiral notebook with a giant pencil on top ----------
@building
def studio(g):
    rbox('base', g, (2.8, 0.14, 2.2), (0, 0.07, 0), C('#fff1e2'), r=0.05)
    rbox('cover_bottom', g, (2.45, 0.1, 1.85), (0, 0.17, 0), C('#ffc98a'), r=0.04)
    rbox('pages', g, (2.3, 1.62, 1.7), (0, 1.01, 0), C('#fffdf7'), r=0.06)
    rbox('cover_top', g, (2.45, 0.12, 1.85), (0, 1.86, 0), C('#ffc98a'), r=0.05)
    for sd in (-1, 1):
        y, k = 0.45, 0
        while y < 1.7:
            rbox(f'rule_{sd}_{k}', g, (2.1, 0.022, 0.02), (0.05, y, sd * 0.855), C('#9cc4ee'), r=0.006)
            y += 0.22; k += 1
        rbox(f'margin_{sd}', g, (0.028, 1.5, 0.02), (-0.72, 1.0, sd * 0.86), C('#f49a91'), r=0.008)
    for i in range(7):
        torus(f'spiral_{i}', g, 0.13, 0.03, (-1.17, 0.4 + i * 0.2, 0), C('#b7bcc8'), rot=(0, math.pi / 2, 0), seg=20, sides=6)
    arched_door(g, 'door', 0.55, 0.9, (0.45, 0.22, 0.87), '#9cc4ee', frame='#ffffff')
    framed_window(g, 'window', 0.5, 0.4, (-0.3, 1.25, 0.88))
    # a bookmark ribbon hanging out of the pages
    rbox('ribbon', g, (0.08, 0.5, 0.015), (0.9, 1.6, 0.87), C('#f49a91'), r=0.006)
    # the giant pencil, which the town rocks gently
    p = node('pencil', g, V(0, 2.25, 0.1))
    cyl('wood', p, 0.24, 0.24, 2.3, (0, 0, 0), C('#ffd23f'), r=0.03, rot=(0, 0, math.pi / 2), seg=6)
    cyl('tip', p, 0.0, 0.24, 0.5, (1.4, 0, 0), C('#ffe6c4'), r=0.02, rot=(0, 0, -math.pi / 2), seg=6)
    cyl('lead', p, 0.0, 0.09, 0.18, (1.6, 0, 0), C('#4b3442'), r=0.02, rot=(0, 0, -math.pi / 2), seg=12)
    cyl('ferrule', p, 0.255, 0.255, 0.22, (-1.26, 0, 0), C('#c7ccd8'), r=0.03, rot=(0, 0, math.pi / 2))
    for k in (-0.06, 0.06):
        torus(f'ferrule_ridge_{k}', p, 0.26, 0.015, (-1.26 + k, 0, 0), C('#a8adbb'), rot=(0, math.pi / 2, 0), seg=24, sides=6)
    cyl('eraser', p, 0.24, 0.24, 0.3, (-1.51, 0, 0), C('#ff9fb5'), r=0.09, rot=(0, 0, math.pi / 2))

# ---------- 📚 Library: a tower of giant books with an open book for a roof ----------
@building
def library(g):
    rbox('base', g, (3.3, 0.14, 2.6), (0, 0.07, 0), C('#e3f0fb'), r=0.05)
    y = 0.14
    for i, (c, h, turn, w) in enumerate((('#8fc1f0', 0.62, 0.0, 3.0), ('#ff9fb5', 0.55, 0.1, 2.75), ('#ffd27a', 0.5, -0.07, 2.5))):
        b = node(f'book_{i}', g, V(0, y, 0))
        b.rotation_euler = R(0, turn, 0)
        d = 2.0 - i * 0.15
        rbox(f'b{i}_bottom', b, (w, 0.07, d), (0, 0.035, 0), C(c), r=0.03)
        rbox(f'b{i}_top', b, (w, 0.07, d), (0, h - 0.035, 0), C(c), r=0.03)
        rbox(f'b{i}_spine', b, (w, h, 0.1), (0, h / 2, d / 2 - 0.05), C(c), r=0.04)
        rbox(f'b{i}_pages', b, (w - 0.12, h - 0.1, d - 0.12), (0, h / 2, -0.03), C('#fff8ec'), r=0.02)
        for k in range(6):
            rbox(f'b{i}_leaf_{k}', b, (w - 0.13, 0.008, 0.012), (0, 0.12 + k * (h - 0.24) / 5, -d / 2 + 0.03), C('#e8dcc6'), r=0.002)
        for x in (-w / 2 + 0.35, w / 2 - 0.35):
            rbox(f'b{i}_band_{x:.2f}', b, (0.12, h - 0.1, 0.02), (x, h / 2, d / 2 + 0.005), C('#ffffff'), r=0.006)
        if i > 0:
            for x in (-0.5, 0.5):
                framed_window(b, f'b{i}_win_{x}', 0.32, h * 0.45, (x, h / 2, d / 2 + 0.02))
        y += h
    arched_door(g, 'door', 0.6, 0.62, (0, 0.14, 1.03), '#5a86b8', frame='#ffffff')
    # the open book roof, which the town tips gently
    op = node('open', g, V(0, y + 0.05, 0))
    for sd in (-1, 1):
        rbox(f'board_{sd}', op, (1.28, 0.06, 1.62), (sd * 0.64, 0, 0), C('#b9a6f5'), r=0.025, rot=(0, 0, sd * 0.16))
        rbox(f'leaves_{sd}', op, (1.16, 0.12, 1.5), (sd * 0.6, 0.08, 0), C('#fffdf7'), r=0.04, rot=(0, 0, sd * 0.16))
        for k in range(4):
            rbox(f'line_{sd}_{k}', op, (0.8, 0.01, 0.025), (sd * 0.6, 0.15, -0.45 + k * 0.3), C('#c9c0e6'), r=0.004, rot=(0, 0, sd * 0.16))
    rbox('bookmark', op, (0.08, 0.02, 0.9), (0, 0.12, 0.9), C('#f49a91'), r=0.008, rot=(0.6, 0, 0))

# ---------- ⚙️ Code Factory: sawtooth roof, striped smokestacks, turning gears, a conveyor belt ----------
def gear(g, name, r, teeth, loc, color):
    n = node(name, g, V(*loc))
    cyl(f'{name}_disc', n, r, r, 0.16, (0, 0, 0), C(color), r=0.04, rot=(math.pi / 2, 0, 0))
    cyl(f'{name}_hub', n, r * 0.35, r * 0.35, 0.2, (0, 0, 0), C('#ffffff'), r=0.03, rot=(math.pi / 2, 0, 0))
    for i in range(teeth):
        a = i / teeth * 2 * math.pi
        rbox(f'{name}_tooth_{i}', n, (r * 0.32, r * 0.32, 0.16), (math.cos(a) * r, math.sin(a) * r, 0), C(color), r=0.025, rot=(0, 0, a))
    return n

@building
def factory(g):
    rbox('base', g, (3.2, 0.14, 2.6), (0, 0.07, 0), C('#eef7ea'), r=0.05)
    rbox('hall', g, (2.7, 1.3, 1.8), (0, 0.8, 0), C('#e3f5e1'), r=0.06)
    for i in range(3):
        x = -0.9 + i * 0.9
        prism(f'saw_{i}', g, [(-0.45, 0), (0.45, 0), (-0.45, 0.6)], 1.8, (x, 1.45, 0), C('#9fd49a'), r=0.035)
        rbox(f'skylight_{i}', g, (0.04, 0.5, 1.6), (x - 0.42, 1.73, 0), WINDOW, r=0.01)
    for i, (x, h) in enumerate(((-1.0, 1.9), (-0.55, 1.5))):
        for k in range(4):
            cyl(f'stack_{i}_{k}', g, 0.2, 0.22, h / 4, (x, 1.45 + h / 8 + k * h / 4, -0.55), C('#ffffff' if k % 2 else '#f49a91'), r=0.015)
        cyl(f'stack_{i}_rim', g, 0.25, 0.25, 0.08, (x, 1.45 + h, -0.55), C('#f49a91'), r=0.03)
        puff_spot(g, f'smoke_{i}', x, 1.45 + h + 0.2, -0.55)
    gear(g, 'gear_big', 0.42, 10, (0.55, 1.0, 0.95), '#9fd49a')
    gear(g, 'gear_small', 0.26, 8, (1.12, 0.6, 0.95), '#ffd27a')
    rbox('door', g, (0.55, 0.8, 0.06), (-0.6, 0.55, 0.92), C('#6fae6a'), r=0.025)
    ball('door_knob', g, 0.04, (-0.42, 0.55, 0.97), C('#ffd27a'))
    rbox('screen_frame', g, (0.78, 0.5, 0.05), (-0.6, 1.15, 0.92), C('#c7ccd8'), r=0.03)
    rbox('screen', g, (0.7, 0.42, 0.04), (-0.6, 1.15, 0.94), C('#3b4a5a'), r=0.015)
    # conveyor belt with rollers and legs (the crates come from the town)
    rbox('belt', g, (2.6, 0.1, 0.42), (0, 0.45, 1.5), C('#8a8fb0'), r=0.04)
    for x in (-1.3, 1.3):
        cyl(f'roller_{x}', g, 0.07, 0.07, 0.44, (x, 0.45, 1.5), C('#c7ccd8'), r=0.02, rot=(math.pi / 2, 0, 0))
        rbox(f'leg_{x}', g, (0.08, 0.38, 0.38), (x * 0.85, 0.2, 1.5), C('#c7ccd8'), r=0.025)

# ---------- 📮 Post Office: a giant mailbox with a waving flag and a spinning envelope sign ----------
@building
def postoffice(g):
    rbox('base', g, (2.8, 0.14, 2.8), (0, 0.07, 0), C('#fffbe6'), r=0.05)
    rbox('box', g, (2.0, 1.2, 2.3), (0, 0.74, 0), C('#ff9fb5'), r=0.05)
    cyl('roof', g, 1.0, 1.0, 2.3, (0, 1.34, 0), C('#ff9fb5'), r=0.05, rot=(math.pi / 2, 0, 0), sweep=math.pi, seg=40)
    for sd in (-1, 1):
        torus(f'rim_{sd}', g, 1.0, 0.055, (0, 1.34, sd * 1.15), C('#ffc4d6'), arc=math.pi, seg=40, sides=8)
        for x in (-1.0, 1.0):
            rbox(f'rim_side_{sd}_{x}', g, (0.11, 1.2, 0.11), (x, 0.74, sd * 1.15), C('#ffc4d6'), r=0.04)
    rbox('slot', g, (0.9, 0.12, 0.06), (0, 1.75, 1.16), C('#7a3a52'), r=0.03)
    rbox('slot_lip', g, (1.0, 0.04, 0.1), (0, 1.84, 1.17), C('#ffc4d6'), r=0.015)
    arched_door(g, 'door', 0.55, 0.85, (-0.35, 0.14, 1.17), '#ffffff')
    framed_window(g, 'window', 0.42, 0.36, (0.5, 0.95, 1.17))
    rbox('pole', g, (0.08, 1.5, 0.08), (1.05, 1.5, 0.4), C('#ffd23f'), r=0.03)
    fl = node('flag', g, V(1.05, 2.1, 0.4))
    rbox('flag_board', fl, (0.06, 0.4, 0.6), (0, 0, -0.3), C('#ffd23f'), r=0.03)
    for i, (x, y, z, s, c) in enumerate(((0.85, 0.25, 1.5, 0.4, '#f6d36b'), (1.2, 0.2, 1.3, 0.32, '#c9a27e'), (0.95, 0.6, 1.45, 0.28, '#ffc4d6'))):
        rbox(f'parcel_{i}', g, (s, s, s), (x, y + 0.07, z), C(c), r=0.03, rot=(0, x, 0))
        rbox(f'string_{i}', g, (s + 0.012, s + 0.012, s * 0.18), (x, y + 0.07, z), C('#ffffff'), r=0.01, rot=(0, x, 0))
    # the envelope sign the town spins and bobs
    env = node('env', g, V(0, 3.15, 0))
    rbox('envelope', env, (1.4, 0.9, 0.1), (0, 0, 0), C('#ffffff'), r=0.04)
    for face in (-1, 1):
        for sd in (-1, 1):
            rbox(f'flap_{face}_{sd}', env, (0.82, 0.04, 0.02), (sd * 0.34, 0.2, face * 0.06), C('#e6e6f0'), r=0.01, rot=(0, 0, sd * 0.58 * face))
        for x in (-0.07, 0.07):
            ball(f'seal_{face}_{x}', env, 0.09, (x, 0, face * 0.07), C('#ff6f8f'), scale=(1, 1, 0.5))
        cyl(f'seal_tip_{face}', env, 0.0, 0.13, 0.15, (0, -0.1, face * 0.07), C('#ff6f8f'), r=0.02, rot=(math.pi, math.pi / 4, 0), seg=4)

# ---------- 🐞 Bug Clinic: a giant friendly ladybug with a first-aid sign ----------
@building
def clinic(g):
    cyl('base', g, 1.7, 1.72, 0.14, (0, 0.07, 0), C('#fff0ee'), r=0.05, seg=48)
    R_, S = 1.35, (1, 0.85, 1.15)
    shell = dome('shell', g, R_, (0, 0.14, 0), C('#f26b6b'), squash=S[1], seg=48)
    shell.scale = (1, S[2], 1)
    seam = [tuple(V(0, 0.14 + R_ * S[1] * math.sin(a), R_ * S[2] * math.cos(a) * 1.005)) for a in [math.pi * i / 16 for i in range(17)]]
    tube('seam', g, seam, [1] * len(seam), C('#3b2a35'), bevel=0.03)
    for i, (th, ph) in enumerate(((0.6, 0.5), (2.5, 0.5), (3.7, 0.55), (5.6, 0.55), (1.1, 1.0), (2.0, 1.0), (4.2, 1.0), (5.2, 1.05))):
        n = Vector((math.sin(ph) * math.cos(th), math.cos(ph), math.sin(ph) * math.sin(th)))
        p = (n.x * R_ * S[0], 0.14 + n.y * R_ * S[1], n.z * R_ * S[2])
        o = ball(f'spot_{i}', g, 0.2, p, C('#3b2a35'))
        o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = V(*n).normalized().to_track_quat('Z', 'Y')
        o.scale = (0.2, 0.2, 0.07)
    # the big friendly head the town tilts
    hd = node('head', g, V(0, 0.6, 1.45))
    ball('face', hd, 0.55, (0, 0, 0), C('#3b2a35'), scale=(1.1, 0.95, 0.9), seg=28)
    for sd in (-1, 1):
        ball(f'eye_white_{sd}', hd, 0.16, (sd * 0.22, 0.1, 0.4), C('#ffffff'))
        ball(f'pupil_{sd}', hd, 0.085, (sd * 0.22, 0.1, 0.53), C('#3b2a35'))
        ball(f'glint_{sd}', hd, 0.03, (sd * 0.22 + 0.03, 0.14, 0.6), C('#ffffff'), seg=10)
        ball(f'cheek_{sd}', hd, 0.1, (sd * 0.38, -0.12, 0.36), C('#ff8fa3'), scale=(1, 0.6, 0.5))
        stalk = [tuple(V(sd * x, y, z)) for x, y, z in ((0.12, 0.42, 0.0), (0.2, 0.7, -0.05), (0.32, 0.92, -0.05))]
        tube(f'antenna_{sd}', hd, stalk, [1, 1, 1], C('#3b2a35'), bevel=0.028)
        ball(f'antenna_tip_{sd}', hd, 0.09, (sd * 0.33, 0.97, -0.05), C('#f26b6b'))
    torus('smile', hd, 0.12, 0.025, (0, -0.12, 0.47), C('#ffffff'), rot=(0, 0, math.pi), arc=math.pi, seg=16, sides=6)
    # a white side door with a red cross, and the first-aid sign the town swings
    rbox('door', g, (0.5, 0.75, 0.08), (1.15, 0.5, 0.55), C('#ffffff'), r=0.04, rot=(0, 1.0, 0))
    cyl('pole', g, 0.04, 0.04, 1.0, (-0.9, 2.0, -0.3), C('#c7ccd8'), r=0.015)
    sg = node('sign', g, V(-0.9, 2.7, -0.3))
    rbox('board', sg, (0.7, 0.7, 0.12), (0, 0, 0), C('#ffffff'), r=0.08)
    for face in (-1, 1):
        rbox(f'cross_h_{face}', sg, (0.42, 0.13, 0.04), (0, 0, face * 0.065), C('#ff6b6b'), r=0.02)
        rbox(f'cross_v_{face}', sg, (0.13, 0.42, 0.04), (0, 0, face * 0.065), C('#ff6b6b'), r=0.02)

# ---------- ☕ Pretzel Café: cream walls, a striped awning and a giant coffee cup on the roof ----------
@building
def cafe(g):
    cyl('base', g, 1.55, 1.57, 0.12, (0, 0.06, 0), C('#f3e3d6'), r=0.04, seg=48)
    rbox('walls', g, (2.1, 1.45, 1.5), (0, 0.85, 0), C('#fff3e6'), r=0.05)
    rbox('roof', g, (2.35, 0.16, 1.75), (0, 1.65, 0), C('#c9a27e'), r=0.05)
    for i in range(7):
        c = '#ffffff' if i % 2 else '#9fdcc8'
        rbox(f'awning_{i}', g, (0.33, 0.05, 0.62), (-0.99 + i * 0.33, 1.38, 0.98), C(c), r=0.015, rot=(0.42, 0, 0))
        ball(f'scallop_{i}', g, 0.085, (-0.99 + i * 0.33, 1.24, 1.25), C(c), scale=(1.9, 0.8, 0.5))
    framed_window(g, 'window', 0.85, 0.6, (-0.5, 0.95, 0.77))
    rbox('sill', g, (0.95, 0.07, 0.12), (-0.5, 0.6, 0.81), C('#c9a27e'), r=0.025)
    arched_door(g, 'door', 0.5, 1.0, (0.55, 0.15, 0.77), '#c9a27e', frame='#ffffff')
    # the giant coffee cup with a latte heart (steam comes from the town)
    cyl('cup', g, 0.55, 0.42, 0.75, (0, 2.12, 0), C('#ffffff'), r=0.06)
    cyl('band', g, 0.556, 0.5, 0.18, (0, 2.05, 0), C('#ff9fb5'), r=0.03)
    torus('handle', g, 0.22, 0.07, (0.6, 2.15, 0), C('#ffffff'))
    cyl('coffee', g, 0.5, 0.5, 0.04, (0, 2.47, 0), C('#a8724e'), r=0.015)
    for x in (-0.07, 0.07):
        ball(f'latte_{x}', g, 0.09, (x, 2.5, 0.02), C('#fff1e0'), scale=(1, 0.3, 1))
    cyl('latte_tip', g, 0.0, 0.12, 0.18, (0, 2.5, -0.1), C('#fff1e0'), r=0.02, rot=(-math.pi / 2, math.pi / 4, 0), seg=4).scale.z = 0.3
    puff_spot(g, 'steam', 0, 2.6, 0)
    # chalkboard menu on an easel, a potted bush by the door
    rbox('board', g, (0.42, 0.55, 0.05), (1.25, 0.5, 0.95), C('#5a4a52'), r=0.02, rot=(-0.2, 0, 0))
    rbox('board_frame', g, (0.48, 0.61, 0.03), (1.25, 0.5, 0.93), C('#c9a27e'), r=0.015, rot=(-0.2, 0, 0))
    for i, y in enumerate((0.6, 0.5, 0.4)):
        rbox(f'chalk_{i}', g, (0.26 - i * 0.04, 0.025, 0.01), (1.25, y, 0.985 - (0.6 - y) * 0.2), C('#ffffff'), r=0.005, rot=(-0.2, 0, 0))
    cyl('pot', g, 0.16, 0.12, 0.28, (-1.25, 0.26, 0.9), C('#f49a91'), r=0.03)
    for i, (x, y, z, r) in enumerate(((0, 0.58, 0, 0.24), (0.12, 0.5, 0.08, 0.15), (-0.12, 0.52, 0.06, 0.15), (0, 0.76, 0, 0.12))):
        ball(f'bush_{i}', g, r, (-1.25 + x, y, 0.9 + z), C('#9fd49a'))
    # the bakery-sign bracket (the town hangs a swinging pretzel from it), and fairy lights along the roof
    rbox('bracket', g, (0.7, 0.05, 0.05), (1.38, 1.32, 0.62), C('#6f5a66'), r=0.015)
    rbox('brace', g, (0.05, 0.3, 0.05), (1.1, 1.18, 0.62), C('#6f5a66'), r=0.015, rot=(0, 0, 0.8))
    node('sign', g, V(1.6, 1.08, 0.62))
    wire = [tuple(V(-1.1 + i * 0.1375, 1.58 - math.sin(i / 16 * math.pi) * 0.08, 0.9)) for i in range(17)]
    tube('wire', g, wire, [1] * len(wire), C('#6f5a66'), bevel=0.008)
    for i in range(9):
        ball(f'light_{i}', g, 0.05, (-1.1 + i * 0.275, 1.53 - math.sin(i / 8 * math.pi) * 0.08, 0.9), BULB, seg=10)

# ---------- 🐱 Cat Home: a cat-faced house with ears on the roof and a curly tail ----------
@building
def cathome(g):
    cyl('base', g, 1.6, 1.62, 0.12, (0, 0.06, 0), C('#f7e3ea'), r=0.04, seg=48)
    rbox('walls', g, (2.0, 1.5, 1.7), (0, 0.85, 0), C('#fffaf3'), r=0.06)
    roof = cyl('roof', g, 1.06, 1.06, 2.15, (0, 1.6, 0), C('#ffb3c8'), r=0.06, sweep=math.pi, start=math.pi / 2, seg=40)
    roof.rotation_euler = (0, math.pi / 2, 0)
    for sd in (-1, 1):
        cyl(f'ear_{sd}', g, 0.04, 0.38, 0.7, (sd * 0.66, 2.88, 0), C('#ffb3c8'), r=0.07, rot=(0, 0, -sd * 0.3), seg=24)
        cyl(f'ear_in_{sd}', g, 0.03, 0.22, 0.46, (sd * 0.64, 2.84, 0.13), C('#fff1f5'), r=0.05, rot=(0, 0, -sd * 0.3), seg=20).scale.y = 0.4
    # a cat face: glowing window eyes, a pink nose, whiskers, and a round door for a mouth
    for sd in (-1, 1):
        cyl(f'eye_{sd}', g, 0.26, 0.26, 0.08, (sd * 0.5, 1.22, 0.85), WINDOW, r=0.02, rot=(math.pi / 2, 0, 0))
        torus(f'eye_rim_{sd}', g, 0.27, 0.045, (sd * 0.5, 1.22, 0.88), C('#ffb3c8'))
        ball(f'pupil_{sd}', g, 0.1, (sd * 0.5 + 0.04, 1.2, 0.9), C('#4b3442'), scale=(0.8, 1.1, 0.4))
        ball(f'glint_{sd}', g, 0.03, (sd * 0.5 + 0.08, 1.27, 0.93), C('#ffffff'), seg=10)
        ball(f'blush_{sd}', g, 0.12, (sd * 0.72, 0.92, 0.86), C('#ffc4d6'), scale=(1, 0.55, 0.3))
        for k, dy in enumerate((0.08, -0.04)):
            rbox(f'whisker_{sd}_{k}', g, (0.55, 0.035, 0.03), (sd * 1.12, 0.98 + dy, 0.8), C('#c9a0b0'), r=0.012, rot=(0, 0, sd * (-0.12 if k else 0.12)))
    ball('nose', g, 0.1, (0, 0.98, 0.88), C('#ff7b9c'), scale=(1.2, 0.8, 0.5))
    arched_door(g, 'door', 0.55, 0.9, (0, 0.16, 0.86), '#d9967a')
    rbox('mat', g, (0.8, 0.03, 0.4), (0, 0.14, 1.15), C('#ff9fb5'), r=0.012)
    for i, (x, z) in enumerate(((-0.25, 1.55), (0.2, 1.85))):
        ball(f'paw_{i}', g, 0.1, (x, 0.13, z), C('#ffd9e4'), scale=(1, 0.2, 0.9))
        for k in range(3):
            ball(f'toe_{i}_{k}', g, 0.04, (x - 0.08 + k * 0.08, 0.13, z - 0.12 - (0.02 if k == 1 else 0)), C('#ffd9e4'), scale=(1, 0.4, 1), seg=10)
    torus('tail', g, 0.42, 0.1, (1.05, 0.75, -0.35), C('#ffb3c8'), rot=(0, math.pi / 2, -0.6), arc=math.pi * 1.3)

root = scenery(WHO)
BUILT[WHO](root)
# gentler than on the characters: big flat walls only have vertices at their corners, so shading spreads far
finish(reach=0.5, view=2.6, strength=0.3)
