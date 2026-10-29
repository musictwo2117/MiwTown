# Miw's Town: shared Blender helpers for the character scripts (cat.py, bunny.py, ...).
# Each script runs as  Blender -b -P models/<name>.py -- models/<name>.glb [preview.png]
# Blender is Z-up and characters face -Y; the glTF exporter turns that into Y-up facing +Z, like the town.
# Nodes body, head, tail, foot_L and foot_R sit at the pivots makeCharacter() uses, so every animation still works.
# models.js colors meshes from their material: "skin" takes the agent's color, "stripe" a deeper shade of it,
# and every other material keeps the color set here.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree

sys.dont_write_bytecode = True
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else 'model.glb'
PREVIEW = args[1] if len(args) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# where the town's animations expect things (Blender coordinates)
HEAD_Z = 0.86
TAIL_AT = (0, 0.28, 0.25)
FOOT_AT = (0.14, -0.1, 0.07)

# ---------- materials ----------
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple((v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1,)

_mats = {}
def material(name, hex_, rough=0.6):
    if name in _mats: return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(hex_)
    p.inputs['Roughness'].default_value = rough
    _mats[name] = m
    return m

SKIN = material('skin', '#f7a072')   # preview color; the town uses the agent's
EYE = material('eye', '#2b1d16', 0.25)
SHINE = material('shine', '#ffffff', 0.3)
MOUTH = material('mouth', '#4b3442')
BLUSH = material('blush', '#ff9bb0', 0.8)
PINK = material('pink', '#ff9fbf')
NOSE = material('nose', '#ff7b9c', 0.4)
CREAM = material('cream', '#fff4e0')

# ---------- building blocks ----------
def link(o, parent=None, loc=(0, 0, 0)):
    scene.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    return o

def node(name, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.1
    return link(o, parent, loc)

def _mesh_object(name, parent, loc, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    return link(bpy.data.objects.new(name, me), parent, loc)

def blob(name, parent, loc, scale, mat, rot=(0, 0, 0), seg=32, ring=18, shape=None):
    """A smooth sphere, optionally reshaped per vertex by shape(co) before scaling."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1)
    if shape:
        for v in bm.verts: shape(v.co)
    o = _mesh_object(name, parent, loc, bm, mat)
    o.scale = scale
    o.rotation_euler = rot
    return o

def lathe(name, parent, loc, profile, mat, seg=32):
    """A closed surface of revolution around Z from (radius, z) pairs, top to bottom."""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)] for r, z in profile]
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _mesh_object(name, parent, loc, bm, mat)

def tube(name, parent, pts, radii, mat, bevel=1.0, loc=(0, 0, 0)):
    """A smooth tapered tube along points, converted to a mesh."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = bevel
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS')
    sp.points.add(len(pts) - 1)
    for i, (co, r) in enumerate(zip(pts, radii)):
        sp.points[i].co = (*co, 1)
        sp.points[i].radius = r
    sp.order_u = min(4, len(pts))
    sp.use_endpoint_u = True
    sp.resolution_u = 6
    o = link(bpy.data.objects.new(name, cu), parent, loc)
    cu.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.view_layer.objects: s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    for p in o.data.polygons: p.use_smooth = True
    return o

def ring(name, parent, loc, radius, thick, mat, quat):
    """A torus (glasses rims, hair ties) lying in the plane facing quat's Z."""
    bm = bmesh.new()
    seg, sides = 32, 8
    vs = [[bm.verts.new(((radius + thick * math.cos(2 * math.pi * j / sides)) * math.cos(2 * math.pi * i / seg),
                         (radius + thick * math.cos(2 * math.pi * j / sides)) * math.sin(2 * math.pi * i / seg),
                         thick * math.sin(2 * math.pi * j / sides))) for j in range(sides)] for i in range(seg)]
    for i in range(seg):
        for j in range(sides):
            bm.faces.new((vs[i][j], vs[(i + 1) % seg][j], vs[(i + 1) % seg][(j + 1) % sides], vs[i][(j + 1) % sides]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mesh_object(name, parent, loc, bm, mat)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = quat
    return o

def taper(n, lo=0.35):
    return [lo + (1 - lo) * math.sin(math.pi * i / (n - 1)) for i in range(n)]

class Ell:
    """An ellipsoid (optionally pear-shaped) that things can be stuck onto, by yaw (0 = straight ahead) and pitch."""
    def __init__(self, parent, center, radii, pear=0.0):
        self.parent, self.c, self.r, self.pear = parent, Vector(center), Vector(radii), pear

    def shape(self, co):
        k = 1 - self.pear * co.z
        co.x *= k; co.y *= k

    def body(self, name, mat, seg=36, ring=22, flat_bottom=False):
        def shape(co):
            self.shape(co)
            if flat_bottom and co.z < -0.6: co.z = -0.6 - (co.z + 0.6) * 0.5
        return blob(name, self.parent, self.c, self.r, mat, seg=seg, ring=ring, shape=shape)

    def at(self, yaw, pitch, out=0.0):
        d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
        a, b, c = self.r
        u = d / math.sqrt((d.x / a) ** 2 + (d.y / b) ** 2 + (d.z / c) ** 2)   # on the plain ellipsoid
        k = 1 - self.pear * (u.z / c)
        p = Vector((u.x * k, u.y * k, u.z))
        n = Vector((p.x / (a * k) ** 2, p.y / (b * k) ** 2, p.z / c ** 2)).normalized()
        return self.c + p + n * out, n

    def decal(self, name, yaw, pitch, size, mat, out=0.0, spin=0.0, seg=24, ring=12):
        """A flattened blob lying on the surface, facing outwards."""
        p, n = self.at(yaw, pitch, out)
        o = blob(name, self.parent, p, size, mat, seg=seg, ring=ring)
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = n.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), spin)
        return o

    def stroke(self, name, pts, mat, width, out=0.006, radii=None):
        """A tube drawn along the surface through (yaw, pitch) points."""
        p = [tuple(self.at(y, pt, out)[0]) for y, pt in pts]
        return tube(name, self.parent, p, radii or [1] * len(p), mat, bevel=width)

# ---------- faces ----------
def eyes(h, yaw=0.36, pitch=-0.06, size=(0.072, 0.092), out=0.0):
    """Big glossy eyes with a big and a small highlight."""
    for sd in (-1, 1):
        s = "LR"[sd > 0]
        h.decal(f'eye_{s}', sd * yaw, pitch, (*size, 0.035), EYE, out=out)
        h.decal(f'shine_{s}', sd * yaw + sd * size[0] * 0.7, pitch + size[1] * 0.85, (size[0] * 0.42, size[1] * 0.35, 0.02), SHINE, out=out + 0.022)
        h.decal(f'sparkle_{s}', sd * yaw - sd * size[0] * 0.55, pitch - size[1] * 0.65, (size[0] * 0.2, size[0] * 0.2, 0.012), SHINE, out=out + 0.022)

def blush(h, yaw=0.66, pitch=-0.2, size=(0.075, 0.042), out=0.002):
    for sd in (-1, 1):
        h.decal(f'blush_{"LR"[sd > 0]}', sd * yaw, pitch, (*size, 0.015), BLUSH, out=out)

def beak(parent, loc, size, mat, name='beak'):
    """A rounded little cone pointing forward (-Y)."""
    def point(co):
        k = 1 - 0.75 * max(0.0, -co.y)
        co.x *= k; co.z *= k
    return blob(name, parent, loc, size, mat, seg=20, ring=12, shape=point)

def toes(f, mat, size=0.04, spread=0.075, reach=0.13):
    """Three round toes fanned out in front of a foot."""
    for k, dx in enumerate((-spread, 0, spread)):
        blob(f'toe{f.name[-2:]}{k}', f, (dx, -reach + abs(dx) * 0.4, -0.02), (size, size * 1.2, size * 0.75), mat)

def omega_mouth(h, pitch=-0.205, width=0.13, depth=0.04, name='mouth'):
    pts = [((-1 + i / 8) * width, pitch - depth * abs(math.sin(math.pi * (-1 + i / 8)))) for i in range(17)]
    return h.stroke(name, pts, MOUTH, 0.009)

def smile(h, pitch=-0.2, width=0.12, depth=0.04, name='mouth', thick=0.009):
    pts = [((-1 + i / 6) * width, pitch - depth * math.cos(math.pi / 2 * (-1 + i / 6))) for i in range(13)]
    return h.stroke(name, pts, MOUTH, thick)

# ---------- architecture (buildings and furniture) ----------
# Scenery scripts are written in the pages' own three.js coordinates (y up, +z towards the road or the camera),
# so numbers can be lifted straight from town.html / room.html. V() and R() turn them into Blender's.
def V(x=0, y=0, z=0):
    return Vector((x, -z, y))

def R(rx=0, ry=0, rz=0):
    return (rx, -rz, ry)

_colors = {}
def C(hex_, rough=0.7):
    """A plain material per color; models.js reads the color back. A few names mean something to the pages
    (window, glow, bulb) — make those with material() instead."""
    return _colors.get(hex_) or _colors.setdefault(hex_, material('c' + hex_[1:], hex_, rough))

def _place(o, loc, rot):
    o.location = V(*loc)
    o.rotation_euler = R(*rot)
    return o

def revolve(name, parent, profile, mat, loc=(0, 0, 0), rot=(0, 0, 0), seg=32, sweep=2 * math.pi, start=0.0):
    """Spin (radius, height) points around the vertical axis, top to bottom. A part sweep gets flat end caps."""
    bm = bmesh.new()
    full = sweep >= 2 * math.pi - 1e-6
    cols = seg if full else seg + 1
    rings = [[bm.verts.new((r * math.cos(start + sweep * i / seg), r * math.sin(start + sweep * i / seg), h)) for i in range(cols)] for r, h in profile]
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % cols
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if not full:
        bm.faces.new([r[0] for r in rings]); bm.faces.new([r[-1] for r in reversed(rings)])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _mesh_object(name, parent, (0, 0, 0), bm, mat)
    if not full:
        cap_n = [Vector((math.sin(start), -math.cos(start), 0)), Vector((math.sin(start + sweep), -math.cos(start + sweep), 0))]
        for p in o.data.polygons: p.use_smooth = all(abs(p.normal.dot(n)) < 0.99 for n in cap_n)   # flat end caps
    return _place(o, loc, rot)

def _rounded(rt, rb, h, r, steps=4):
    """Profile of a cylinder (top radius rt, bottom rb, height h) whose rims are rounded with radius r."""
    r = min(r, h / 2 - 1e-4, rt - 1e-4 if rt > r else r, rb - 1e-4 if rb > r else r)
    top = [(rt - r + r * math.sin(math.pi / 2 * k / steps), h / 2 - r + r * math.cos(math.pi / 2 * k / steps)) for k in range(steps + 1)]
    bot = [(rb - r + r * math.cos(math.pi / 2 * k / steps), -h / 2 + r - r * math.sin(math.pi / 2 * k / steps)) for k in range(steps + 1)]
    return [(0.0005, h / 2)] + top + bot + [(0.0005, -h / 2)]

def cyl(name, parent, rt, rb, h, loc, mat, r=0.03, rot=(0, 0, 0), seg=32, sweep=2 * math.pi, start=0.0):
    """A cylinder or cone frustum (centred on loc, upright) with softly rounded rims. A part sweep (from start,
    measured in Blender's XY plane from +X) makes half-cylinders for barrel roofs and arched door tops."""
    return revolve(name, parent, _rounded(max(rt, 0.001), max(rb, 0.001), h, r), mat, loc, rot, seg, sweep, start)

def dome(name, parent, radius, loc, mat, squash=1.0, rot=(0, 0, 0), seg=40, lip=0.0):
    """A half sphere sitting on loc; lip curls the rim outwards a little, like a mushroom cap."""
    n = 14
    prof = [(max(0.0005, radius * math.sin(math.pi / 2 * k / n)), radius * squash * math.cos(math.pi / 2 * k / n)) for k in range(n + 1)]
    if lip: prof += [(radius + lip * 0.6, -lip * 0.5), (radius - lip * 0.4, -lip * 0.6)]
    prof += [(0.0005, -lip * 0.6)]
    return revolve(name, parent, prof, mat, loc, rot, seg)

def torus(name, parent, R_, r, loc, mat, rot=(0, 0, 0), arc=2 * math.pi, seg=32, sides=10):
    """A ring of radius R_ and tube radius r in three.js's TorusGeometry pose (lying in the XY plane, facing +z)."""
    bm = bmesh.new()
    full = arc >= 2 * math.pi - 1e-6
    cols = seg if full else seg + 1
    vs = [[bm.verts.new(((R_ + r * math.cos(2 * math.pi * j / sides)) * math.cos(arc * i / seg),
                         -r * math.sin(2 * math.pi * j / sides),
                         (R_ + r * math.cos(2 * math.pi * j / sides)) * math.sin(arc * i / seg))) for j in range(sides)] for i in range(cols)]
    for i in range(seg):
        for j in range(sides):
            bm.faces.new((vs[i][j], vs[(i + 1) % cols][j], vs[(i + 1) % cols][(j + 1) % sides], vs[i][(j + 1) % sides]))
    if not full:
        bm.faces.new(vs[0]); bm.faces.new(list(reversed(vs[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _place(_mesh_object(name, parent, (0, 0, 0), bm, mat), loc, rot)

def rbox(name, parent, size, loc, mat, r=0.04, rot=(0, 0, 0)):
    """A box (three.js width, height, depth) with bevelled, softly shaded edges and crisp flat faces."""
    w, h, d = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    r = min(r, w * 0.45, h * 0.45, d * 0.45)
    if r > 0.002:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=3, profile=0.5, affect='EDGES')
    o = _mesh_object(name, parent, (0, 0, 0), bm, mat)
    for p in o.data.polygons:
        n = p.normal
        p.use_smooth = max(abs(n.x), abs(n.y), abs(n.z)) < 0.999
    return _place(o, loc, rot)

def prism(name, parent, pts, depth, loc, mat, r=0.03, rot=(0, 0, 0)):
    """A flat shape (three.js x, y points) pushed out along z by depth, centred, with bevelled edges."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, y)) for x, y in pts]
    back = [bm.verts.new((x, depth / 2, y)) for x, y in pts]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if r > 0.002: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=3, profile=0.5, affect='EDGES')
    o = _mesh_object(name, parent, (0, 0, 0), bm, mat)
    big = max(p.area for p in o.data.polygons)
    for p in o.data.polygons: p.use_smooth = p.area < big * 0.05
    return _place(o, loc, rot)

def ball(name, parent, radius, loc, mat, scale=(1, 1, 1), rot=(0, 0, 0), seg=20):
    """A sphere in three.js terms (scale is x, y, z there)."""
    o = blob(name, parent, (0, 0, 0), (radius * scale[0], radius * scale[2], radius * scale[1]), mat, seg=seg, ring=max(8, seg // 2))
    return _place(o, loc, rot)

def scenery(name):
    """The root of a building or piece of furniture."""
    return node(name)

# ---------- shared parts ----------
def skeleton(name):
    """The node tree every character has: root → body → head / tail, root → foot_L / foot_R."""
    root = node(name)
    body = node('body', root)
    head = node('head', body, (0, 0, HEAD_Z))
    tail = node('tail', body, TAIL_AT)
    feet = [node(f'foot_{"LR"[sd > 0]}', root, (sd * FOOT_AT[0], FOOT_AT[1], FOOT_AT[2])) for sd in (-1, 1)]
    return root, body, head, tail, feet

def group(name, parent, loc, names):
    """Gather already-built parts under a new pivot node at loc (in parent's space), so they can swing about it."""
    g = node(name, parent, loc)
    for n in names:
        o = bpy.data.objects[n]
        o.parent = g
        o.location = o.location - Vector(loc)
    return g

# ---------- animation ----------
# Three clips, exported as glTF animations that models.js plays with an AnimationMixer:
#   walk  — one stride every half second (the town's own bob runs at the same pace), drives body, head, tail, feet and limbs
#   idle  — a slow loop for limbs and ears only, so the town's state poses on body and head still show
#   blink — the eyes squeeze shut once every few seconds, always on
FPS = 24
WALK, IDLE, BLINK = 12, 72, 96   # clip lengths in frames
CLIP_START = 1000
_rest = {}   # object → its rest transform, put back before rendering or exporting

def _clip(clip, obj, frames, fn):
    """Key obj on every frame of a looping clip with fn(u) → dict(loc=..., rot=..., scale=...), u running 0 → 2π."""
    rest = _rest.setdefault(obj, (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy()))
    ad = obj.animation_data_create()
    act = bpy.data.actions.new(f'{clip}_{obj.name}')
    ad.action = act
    for f in range(frames + 1):
        k = fn(2 * math.pi * f / frames)
        obj.location = rest[0] + Vector(k.get('loc', (0, 0, 0)))
        obj.rotation_euler = [r + d for r, d in zip(rest[1], k.get('rot', (0, 0, 0)))]
        obj.scale = [s * d for s, d in zip(rest[2], k.get('scale', (1, 1, 1)))]
        for path in ('location', 'rotation_euler', 'scale'):
            obj.keyframe_insert(path, frame=f)
    obj.location, obj.rotation_euler, obj.scale = rest
    track = ad.nla_tracks.new()
    track.name = clip
    # clips live far from frame 0 so the scene at frame 0 (what the exporter takes as the rest pose) stays untouched
    track.strips.new(clip, CLIP_START, act).extrapolation = 'NOTHING'
    ad.action = None

def animate(body, head, tail, feet, limbs=(), ears=(), eyes=(), stride=0.12, lift=0.06):
    """limbs: (node, axis, swing, phase) — arms, wings or braids that swing with the stride.
    ears: (node, axis, amount) — bob twice per stride and twitch now and then at rest.
    eyes: nodes holding each eye, squashed for a blink."""
    s = math.sin
    _clip('walk', body, WALK, lambda u: dict(loc=(0, 0, abs(s(u)) * 0.1), rot=(0.06, -s(u) * 0.08, 0)))
    _clip('walk', head, WALK, lambda u: dict(rot=(s(2 * u) * 0.04, s(u) * 0.06, 0)))
    _clip('walk', tail, WALK, lambda u: dict(rot=(0, s(u) * 0.4, s(u) * 0.2)))
    for f, ph in zip(feet, (0, math.pi)):
        _clip('walk', f, WALK, lambda u, ph=ph: dict(loc=(0, -s(u + ph) * stride, max(0.0, math.cos(u + ph)) * lift),
                                                     rot=(-math.cos(u + ph) * 0.25, 0, 0)))
    for n, axis, swing, ph in limbs:
        rot = lambda u, a=axis, w=swing, p=ph: dict(rot=tuple(w * s(u + p) if i == a else 0 for i in range(3)))
        _clip('walk', n, WALK, rot)
        _clip('idle', n, IDLE, lambda u, a=axis, w=swing: dict(rot=tuple(w * 0.25 * s(u) if i == a else 0 for i in range(3))))
    for n, axis, amt in ears:
        _clip('walk', n, WALK, lambda u, a=axis, w=amt: dict(rot=tuple(w * s(2 * u) if i == a else 0 for i in range(3))))
        # a quick twitch near the end of the idle loop
        twitch = lambda u: max(0.0, s((u - 5.0) * 6)) if 5.0 < u < 5.0 + math.pi / 3 else 0.0
        _clip('idle', n, IDLE, lambda u, a=axis, w=amt: dict(rot=tuple(w * 1.5 * twitch(u) if i == a else 0 for i in range(3))))
    for n in eyes:
        shut = lambda u: max(0.0, 1 - abs(u - 5.9) / 0.2)   # closed for a moment near the end of the loop
        _clip('blink', n, BLINK, lambda u: dict(scale=(1, 1, 1 - 0.9 * shut(u))))

def eye_group(head, side, extra=()):
    """Gather one eye's pieces (eye, shine, sparkle, ...) under a pivot at the eye, for blinking."""
    names = [n for n in (f'eye_{side}', f'shine_{side}', f'sparkle_{side}', *extra) if n in bpy.data.objects]
    return group(f'blink_{side}', head, bpy.data.objects[f'eye_{side}'].location.copy(), names)

def at_rest():
    """Silence the clips and put every animated node back at rest: where no clip plays, the NLA would
    otherwise zero their channels, and the exporter takes what it sees as each node's rest pose."""
    for o, (loc, rot, scale) in _rest.items():
        for t in o.animation_data.nla_tracks: t.mute = True
        o.location, o.rotation_euler, o.scale = loc, rot, scale
    scene.frame_set(0)

# ---------- soft shadows ----------
def bake_ao(rays=32, reach=0.35, strength=0.55):
    """Ambient occlusion baked into each vertex's color: creases, undersides and spots tucked under other parts go
    softly darker, like a clay toy under a cloudy sky. The town multiplies it into the material color."""
    bpy.context.view_layer.update()
    meshes = [o for o in scene.objects if o.type == 'MESH' and o.name != 'floor']
    verts, polys = [], []
    for o in meshes:
        mw, base = o.matrix_world, len(verts)
        verts += [mw @ v.co for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    bvh = BVHTree.FromPolygons(verts, polys)
    # evenly spread directions over a sphere, flipped into each vertex's hemisphere
    golden = math.pi * (3 - math.sqrt(5))
    dirs = [Vector((math.cos(golden * i) * math.sqrt(1 - z * z), math.sin(golden * i) * math.sqrt(1 - z * z), z))
            for i, z in ((i, 1 - (2 * i + 1) / rays) for i in range(rays))]
    for o in meshes:
        me, mw = o.data, o.matrix_world
        nm = mw.to_3x3().inverted_safe().transposed()
        attr = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
        for v in me.vertices:
            p, n = mw @ v.co, (nm @ v.normal).normalized()
            shade = 0.0
            for d in dirs:
                d = d if d.dot(n) >= 0 else -d
                hit = bvh.ray_cast(p + n * 0.003, d, reach)
                if hit[0] is not None: shade += (1 - hit[3] / reach) * d.dot(n)
            k = 1 - strength * min(1.0, 2 * shade / rays)
            attr.data[v.index].color = (k, k, k, 1)
        me.color_attributes.active_color = attr

def finish(ao=True, reach=0.35, view=1.0, strength=0.55):
    """Bake, optionally render previews (view scales the camera out for bigger things), and export."""
    at_rest()
    if ao: bake_ao(reach=reach, strength=strength)
    if PREVIEW: _preview(view)
    at_rest()
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_texcoords=False,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_anim_slide_to_zero=True,
                              export_vertex_color='ACTIVE')
    print('wrote', OUT)

def _preview(view=1.0):
    w = bpy.data.worlds.new('w'); scene.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#fdeef0')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0; sun.rotation_euler = (0.8, 0.2, -0.6)
    scene.collection.objects.link(sun)
    floor = bpy.data.meshes.new('floor')
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4 * view); bm.to_mesh(floor); bm.free()
    floor.materials.append(material('floor', '#f6d9de'))
    link(bpy.data.objects.new('floor', floor))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 55
    scene.collection.objects.link(cam); scene.camera = cam
    scene.render.resolution_x = scene.render.resolution_y = 480
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try: scene.render.engine = eng; break
        except TypeError: pass
    views = {'front': (-0.9, -3.1, 1.3), 'side': (2.8, 1.6, 1.4), 'back': (-1.2, 3.0, 1.6)}
    aim = Vector((0, 0, 0.65 * view))
    for tag, pos in views.items():
        cam.location = Vector(pos) * view
        cam.rotation_euler = (aim - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = PREVIEW.replace('.png', f'_{tag}.png')
        bpy.ops.render.render(write_still=True)
    # four frames of the walk, side on
    tracks = [t for o in scene.objects if o.animation_data for t in o.animation_data.nla_tracks]
    if tracks:
        for t in tracks: t.mute = t.name != 'walk'
        cam.location = (3.2, -0.3, 1.0)
        cam.rotation_euler = (Vector((0, 0, 0.6)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        for f in (0, 3, 6, 9):
            scene.frame_set(CLIP_START + f)
            scene.render.filepath = PREVIEW.replace('.png', f'_walk{f}.png')
            bpy.ops.render.render(write_still=True)
    for name in ('sun', 'floor', 'cam'): bpy.data.objects.remove(bpy.data.objects[name])
