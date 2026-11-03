# Miw's Town: the desserts on Cheesecake Rush's menu, sculpted in Blender.
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P shared/models/menu.py -- shared/models/kittycupcake.glb [preview.png]
# The output file's name picks the dessert. Each sits on the table at its origin, about 0.6 across, facing +z.
#   cheesecake — a slice of strawberry cheesecake, the shop's own
#   pretzelcake  — a slice of vanilla-caramel layer cake with a pink zigzag and a mini pretzel on top
#   kittycupcake — a cupcake whose frosting is a tabby cat's face, in a polka-dot wrapper like Miw's dress
#   donut        — a strawberry-glazed donut with a cream zigzag and golden sprinkles
#   pancake      — a stack of three strawberry pancakes with maple syrup, a pat of butter and cream
#   cheesefull, pretzelfull — the whole round cakes that go in the oven; a batch is cut into four slices
# Written in Blender's own coordinates (z up, the front faces -y), like the characters.
import os, sys, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *
from kit import _mesh_object

WHO = os.path.splitext(os.path.basename(OUT))[0]
BUILT = {}
def dessert(fn):
    BUILT[fn.__name__] = fn
    return fn

def wedge(name, parent, r, a, z0, h, mat, bevel=0.02, grow=0.0):
    """A slice of a round cake: a sector of angle a and radius r, from height z0 up by h, its point at the origin
    and its curved back towards +y (so the cut faces show from the front). grow pushes every face out a little."""
    bm = bmesh.new()
    n = 12
    tip = (0, -grow * 1.4)
    pts = [tip] + [((r + grow) * math.sin(-a / 2 + a * i / n), (r + grow) * math.cos(-a / 2 + a * i / n)) for i in range(n + 1)]
    bot = [bm.verts.new((x, y, z0 - grow)) for x, y in pts]
    top = [bm.verts.new((x, y, z0 + h + grow)) for x, y in pts]
    bm.faces.new(list(reversed(bot))); bm.faces.new(top)
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, profile=0.5, affect='EDGES')
    o = _mesh_object(name, parent, (0, 0, 0), bm, mat)
    big = max(p.area for p in o.data.polygons)
    for p in o.data.polygons: p.use_smooth = p.area < big * 0.04
    return o

def wedge_edge(r, a, steps):
    """Points round the top edge of a wedge, with the outward direction at each: down one cut face, across the
    curved back, and up the other cut face."""
    out = []
    # the cut face at angle t runs from the tip along (sin t, cos t); its outward normal is (side*cos t, -side*sin t)
    for side in (-1, 1):
        t = side * a / 2
        d, nrm = Vector((math.sin(t), math.cos(t), 0)), Vector((side * math.cos(t), -side * math.sin(t), 0))
        for k in range(steps):
            out.append((d * r * (0.18 + 0.78 * k / max(1, steps - 1)), nrm))
    for k in range(steps * 2):
        t = -a / 2 + a * (k + 0.5) / (steps * 2)
        d = Vector((math.sin(t), math.cos(t), 0))
        out.append((d * r, d))
    return out

def drips(name, parent, r, a, z, mat, thick, steps, seed, long=0.12):
    """Glaze running down the sides of a wedge from height z."""
    rnd = random.Random(seed)
    for i, (p, nrm) in enumerate(wedge_edge(r, a, steps)):
        ln = long * (0.35 + rnd.random())
        at = p + nrm * thick * 0.55
        blob(f'{name}_{i}', parent, (at.x, at.y, z - ln * 0.5), (thick, thick, ln * 0.5 + thick), mat, seg=12, ring=8)
        blob(f'{name}_tip_{i}', parent, (at.x, at.y, z - ln), (thick * 1.15,) * 3, mat, seg=12, ring=8)

def strawberry(parent, name, loc, s=1.0):
    x, y, z = loc
    blob(f'{name}_body', parent, (x, y, z + 0.06 * s), (0.07 * s, 0.07 * s, 0.085 * s), C('#ef5470', 0.35), seg=18, ring=10,
         shape=lambda co: co.__setitem__(2, co.z if co.z > 0 else co.z * (1 + 0.35 * -co.z)))
    for k in range(5):
        t = k / 5 * 2 * math.pi
        blob(f'{name}_leaf_{k}', parent, (x + math.cos(t) * 0.03 * s, y + math.sin(t) * 0.03 * s, z + 0.14 * s),
             (0.04 * s, 0.016 * s, 0.01 * s), C('#7cc68a'), rot=(0, 0, t), seg=8, ring=6)
    for k in range(7):
        t = k / 7 * 2 * math.pi + 0.3
        blob(f'{name}_seed_{k}', parent, (x + math.cos(t) * 0.066 * s, y + math.sin(t) * 0.066 * s, z + (0.04 + 0.04 * (k % 2)) * s),
             (0.007 * s,) * 3, C('#fff1a8'), seg=6, ring=4)

# ---------- 🍰 strawberry cheesecake ----------
@dessert
def cheesecake(g):
    s = node('slice', g, (0, -0.12, 0))
    r, a = 0.42, 0.95
    wedge('crust', s, r, a, 0, 0.07, C('#c98b4b', 0.8))
    wedge('cake', s, r, a, 0.07, 0.2, C('#fff0cf', 0.55))
    wedge('glaze', s, r, a, 0.27, 0.035, C('#f48fa8', 0.3), grow=0.008)
    drips('drip', s, r + 0.008, a, 0.28, C('#f48fa8', 0.3), 0.018, 3, 4, long=0.09)
    for k, t in enumerate((-0.2, 0.2)):   # piped cream along the back, with a strawberry sitting in it
        blob(f'puff_{k}', s, (math.sin(t) * r * 0.8, math.cos(t) * r * 0.8, 0.33), (0.045, 0.045, 0.035), C('#fffaf3', 0.5), seg=14, ring=8)
    strawberry(s, 'berry', (0, r * 0.72, 0.3), 1.0)

# ---------- 🥨 caramel pretzel cake ----------
# the same rope the pages' makePretzel() follows (scenery.js), in its XY plane
PRETZEL_PATH = [(-0.55, -0.15, 0.02), (-0.3, 0.05, 0.05), (-0.06, 0.3, 0.08), (0.2, 0.56, 0.02), (0.5, 0.68, 0), (0.74, 0.5, 0), (0.8, 0.15, 0),
                (0.66, -0.26, 0), (0.36, -0.52, 0), (0, -0.6, 0), (-0.36, -0.52, 0), (-0.66, -0.26, 0), (-0.8, 0.15, 0), (-0.74, 0.5, 0),
                (-0.5, 0.68, 0), (-0.2, 0.56, 0.02), (0.06, 0.3, -0.08), (0.3, 0.05, -0.05), (0.55, -0.15, 0.02)]

def pretzel(name, parent, loc, s, tilt=0.0):
    """A little salted pretzel standing up, facing the front."""
    p = node(name, parent, loc)
    p.rotation_euler = (tilt, 0, 0)
    pts = [(x * s, -z * s, y * s) for x, y, z in PRETZEL_PATH]
    tube(f'{name}_dough', p, pts, [1] * len(pts), C('#c98a4b', 0.6), bevel=0.13 * s)
    rnd = random.Random(7)
    for k in range(9):
        x, y, z = PRETZEL_PATH[rnd.randrange(1, len(PRETZEL_PATH) - 1)]
        blob(f'{name}_salt_{k}', p, ((x + (rnd.random() - 0.5) * 0.1) * s, -0.12 * s, (y + (rnd.random() - 0.5) * 0.1) * s), (0.035 * s,) * 3, C('#ffffff', 0.4), seg=6, ring=4)

@dessert
def pretzelcake(g):
    s = node('slice', g, (0, -0.14, 0))
    r, a = 0.46, 0.9
    wedge('biscuit', s, r, a, 0, 0.07, C('#e8b886', 0.8))
    wedge('sponge_lo', s, r, a, 0.07, 0.11, C('#fff0cf', 0.7))
    wedge('caramel', s, r, a, 0.18, 0.035, C('#e59a4c', 0.35), bevel=0.012)
    wedge('sponge_hi', s, r, a, 0.215, 0.11, C('#fff0cf', 0.7))
    wedge('icing', s, r, a, 0.325, 0.035, C('#eda95e', 0.3), grow=0.01)   # caramel, the color of the pretzel
    drips('drip', s, r + 0.01, a, 0.335, C('#eda95e', 0.3), 0.02, 3, 9, long=0.12)
    # a swirl of cream holding up a mini pretzel, with a zigzag of the town's pink icing across the top
    blob('cream', s, (0, r * 0.66, 0.39), (0.075, 0.06, 0.045), C('#fffaf3', 0.5), seg=18, ring=10)
    pretzel('pretzel', s, (0, r * 0.66, 0.49), 0.1, tilt=-0.15)
    zig = [((-1) ** k * 0.03 * (1 + k * 0.25), r * (0.22 + 0.045 * k), 0.37) for k in range(7)]
    tube('drizzle', s, zig, [1] * len(zig), C('#f9cdd9', 0.4), bevel=0.012)

# ---------- 🐱 kitty cupcake ----------
@dessert
def kittycupcake(g):
    # a polka-dot paper wrapper, like Miw's dress
    wrap = lathe('wrapper', g, (0, 0, 0), [(0.0005, 0.3), (0.24, 0.3), (0.255, 0.28), (0.19, 0.015), (0.17, 0.0), (0.0005, 0.0)], C('#ffc4d6', 0.75), seg=96)
    for v in wrap.data.vertices:
        if math.hypot(v.co.x, v.co.y) > 0.01:
            k = 1 + 0.04 * abs(math.cos(math.atan2(v.co.y, v.co.x) * 9))
            v.co.x *= k; v.co.y *= k
    for p in wrap.data.polygons: p.use_smooth = True
    for row, z in enumerate((0.08, 0.19)):
        rr = 0.17 + (0.24 - 0.17) * z / 0.3 + 0.012
        for k in range(9):
            t = (k + row * 0.5) / 9 * 2 * math.pi
            blob(f'dot_{row}_{k}', g, (math.cos(t) * rr, math.sin(t) * rr, z), (0.018, 0.018, 0.018), C('#ffffff', 0.5), seg=8, ring=6)
    # the frosting is a round tabby face
    fx, fy, fz = 0.25, 0.25, 0.2
    face = C('#ffd1a6', 0.5)
    blob('frosting', g, (0, 0, 0.32), (fx, fy, fz), face, seg=32, ring=16)
    def on_face(x, z, out=0.0):
        y = -fy * math.sqrt(max(0.0, 1 - (x / fx) ** 2 - ((z - 0.32) / fz) ** 2))
        return (x, y - out, z)
    def point(co):   # round at the bottom, pointed at the top
        k = max(0.0, co.z)
        co.x *= 1 - 0.8 * k; co.y *= 1 - 0.8 * k
    for sd in (-1, 1):
        blob(f'ear_{sd}', g, (sd * 0.14, 0, 0.47), (0.08, 0.05, 0.1), face, rot=(0, sd * 0.35, 0), seg=16, ring=10, shape=point)
        blob(f'ear_in_{sd}', g, (sd * 0.137, -0.03, 0.465), (0.05, 0.02, 0.07), C('#ffb3c6', 0.6), rot=(0, sd * 0.35, 0), seg=12, ring=8, shape=point)
        blob(f'eye_{sd}', g, on_face(sd * 0.08, 0.4, -0.005), (0.026, 0.02, 0.03), C('#4b3442', 0.25), seg=12, ring=8)
        blob(f'blush_{sd}', g, on_face(sd * 0.15, 0.35, -0.003), (0.035, 0.012, 0.022), C('#ff9bb0', 0.8), seg=10, ring=6)
        for k, z in enumerate((0.47, 0.44)):   # tabby stripes on the forehead
            blob(f'stripe_{sd}_{k}', g, on_face(sd * 0.035, z, -0.002), (0.012, 0.01, 0.03), C('#e8a06a', 0.5), rot=(0, sd * 0.4, 0), seg=8, ring=6)
    x0, y0, z0 = on_face(0, 0.36, 0.004)
    tube('mouth', g, [(x0 - 0.035, y0, z0 + 0.008), (x0 - 0.018, y0 - 0.002, z0 - 0.008), (x0, y0, z0), (x0 + 0.018, y0 - 0.002, z0 - 0.008), (x0 + 0.035, y0, z0 + 0.008)],
         [1] * 5, C('#4b3442'), bevel=0.006)
    # a strawberry tucked between the ears
    strawberry(g, 'berry', (0.0, 0.05, 0.5), 0.75)

# ---------- 🍩 strawberry donut ----------
@dessert
def donut(g):
    R_, r = 0.22, 0.11
    def torus_mesh(name, rad, mat, seg=64, sides=24):
        bm = bmesh.new()
        vs = [[None] * sides for _ in range(seg)]
        for i in range(seg):
            th = 2 * math.pi * i / seg
            for j in range(sides):
                ph = 2 * math.pi * j / sides
                rr = rad(th, ph)
                vs[i][j] = bm.verts.new(((R_ + rr * math.cos(ph)) * math.cos(th), (R_ + rr * math.cos(ph)) * math.sin(th), r + rr * math.sin(ph) * 0.92))
        for i in range(seg):
            for j in range(sides):
                bm.faces.new((vs[i][j], vs[(i + 1) % seg][j], vs[(i + 1) % seg][(j + 1) % sides], vs[i][(j + 1) % sides]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return _mesh_object(name, g, (0, 0, 0), bm, mat)
    def surface(th, ph, rr):
        return ((R_ + rr * math.cos(ph)) * math.cos(th), (R_ + rr * math.cos(ph)) * math.sin(th), r + rr * math.sin(ph) * 0.92)
    torus_mesh('dough', lambda th, ph: r, C('#e9b27a', 0.8))
    # strawberry glaze over the top half, running down in wavy drips; below its edge it tucks inside the dough
    def glaze(th, ph):
        edge = -0.4 + 0.22 * math.sin(th * 7) + 0.12 * math.sin(th * 13 + 1)
        k = max(0.0, min(1.0, (math.sin(ph) - edge) / 0.18 + 0.5))
        return r * (0.9 + 0.17 * k)
    torus_mesh('glaze', glaze, C('#f6a5bd', 0.35), seg=96, sides=32)
    # a zigzag of cream drizzled all the way round, from the outer edge to the inner one and back
    corner = lambda k: (2 * math.pi * k / 22, 0.6 if k % 2 else 2.5)
    zig = [surface(*[c0 + (c1 - c0) * u / 6 for c0, c1 in zip(corner(k), corner(k + 1))], r * 1.1) for k in range(22) for u in range(6)]
    tube('drizzle', g, zig, [1] * len(zig), C('#fffaf3', 0.5), bevel=0.011)
    # little pretzel-gold and white sprinkles
    rnd = random.Random(5)
    cols = ['#ffd27a', '#fffaf3', '#c98a4b']
    for k in range(30):
        th, ph = rnd.random() * 2 * math.pi, 0.45 + rnd.random() * 2.2
        x, y, z = surface(th, ph, r * 1.07)
        blob(f'sprinkle_{k}', g, (x, y, z), (0.026, 0.009, 0.009), C(cols[k % 3], 0.4), rot=(0, rnd.random() * 3, rnd.random() * 3), seg=8, ring=6)

# ---------- whole cakes: what goes in the oven (a batch is cut into four slices) ----------
def disk(name, parent, r, z0, h, mat, rd=0.02):
    """A round layer from height z0 up by h, its rims softly rounded."""
    return lathe(name, parent, (0, 0, 0), [(0.0005, z0 + h), (r - rd, z0 + h), (r, z0 + h - rd), (r, z0 + rd), (r - rd, z0), (0.0005, z0)], mat, seg=64)

def ring_drips(name, parent, r, z, mat, th, n, seed, long=0.1):
    """Glaze running down the side of a round cake from height z."""
    rnd = random.Random(seed)
    for k in range(n):
        a = k / n * 2 * math.pi + rnd.random() * 0.1
        ln = long * (0.35 + rnd.random())
        x, y = r * math.cos(a), r * math.sin(a)
        blob(f'{name}_{k}', parent, (x, y, z - ln * 0.5), (th, th, ln * 0.5 + th), mat, seg=12, ring=8)
        blob(f'{name}_tip_{k}', parent, (x, y, z - ln), (th * 1.15,) * 3, mat, seg=12, ring=8)

@dessert
def cheesefull(g):
    s = node('cake', g)
    r = 0.42
    disk('crust', s, r, 0, 0.07, C('#c98b4b', 0.8))
    disk('cake', s, r - 0.005, 0.07, 0.2, C('#fff0cf', 0.55))
    disk('glaze', s, r + 0.008, 0.27, 0.035, C('#f48fa8', 0.3), rd=0.012)
    ring_drips('drip', s, r + 0.01, 0.28, C('#f48fa8', 0.3), 0.02, 16, 3)
    for k in range(6):   # strawberries round the top, a cream puff between each
        a = k / 6 * 2 * math.pi
        strawberry(s, f'berry_{k}', (0.28 * math.cos(a), 0.28 * math.sin(a), 0.3), 0.8)
        b = a + math.pi / 6
        blob(f'puff_{k}', s, (0.28 * math.cos(b), 0.28 * math.sin(b), 0.31), (0.05, 0.05, 0.04), C('#fffaf3', 0.5), seg=14, ring=8)
    strawberry(s, 'berry_mid', (0, 0, 0.3), 1.1)

@dessert
def pretzelfull(g):
    s = node('cake', g)
    r = 0.44
    disk('biscuit', s, r, 0, 0.07, C('#e8b886', 0.8))
    disk('sponge_lo', s, r - 0.004, 0.07, 0.11, C('#fff0cf', 0.7))
    disk('caramel', s, r, 0.18, 0.035, C('#e59a4c', 0.35), rd=0.012)
    disk('sponge_hi', s, r - 0.004, 0.215, 0.11, C('#fff0cf', 0.7))
    disk('icing', s, r + 0.008, 0.325, 0.035, C('#eda95e', 0.3), rd=0.012)
    ring_drips('drip', s, r + 0.01, 0.335, C('#eda95e', 0.3), 0.02, 18, 9, long=0.12)
    blob('cream', s, (0, 0, 0.38), (0.13, 0.13, 0.05), C('#fffaf3', 0.5), seg=18, ring=10)
    pretzel('pretzel', s, (0, 0, 0.5), 0.17, tilt=-0.15)
    for k in range(8):   # a ring of little pink icing dots
        a = k / 8 * 2 * math.pi
        blob(f'dot_{k}', s, (0.3 * math.cos(a), 0.3 * math.sin(a), 0.36), (0.035, 0.035, 0.03), C('#f9cdd9', 0.4), seg=10, ring=6)

# ---------- 🥞 strawberry pancakes ----------
@dessert
def pancake(g):
    # three fluffy pancakes, the top one a little paler, with golden edges
    for i, (r, z0, col) in enumerate([(0.30, 0.0, '#e4a64a'), (0.285, 0.085, '#e9b358'), (0.292, 0.17, '#f0c06a')]):
        disk(f'cake_{i}', g, r, z0, 0.092, C(col, 0.75), rd=0.04)
    # maple syrup pooled on top and running down the sides
    blob('syrup', g, (0, 0, 0.262), (0.235, 0.235, 0.03), C('#c8632b', 0.2), seg=32, ring=10)
    ring_drips('syrup_drip', g, 0.285, 0.272, C('#c8632b', 0.25), 0.022, 11, 4, long=0.15)
    blob('butter', g, (-0.06, 0.04, 0.3), (0.075, 0.07, 0.03), C('#ffe27a', 0.4), rot=(0, 0, 0.4))
    blob('cream', g, (0.04, 0.03, 0.31), (0.105, 0.105, 0.07), C('#fffaf3', 0.5), seg=18, ring=10)
    strawberry(g, 'berry', (0.07, -0.06, 0.32), 0.7)
    strawberry(g, 'berry2', (-0.1, -0.1, 0.285), 0.5)

root = scenery(WHO)
BUILT[WHO](root)
finish(reach=0.15, view='auto', strength=0.4, join=root)
