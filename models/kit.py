# Miw's Town: shared Blender helpers for the character scripts (cat.py, bunny.py, ...).
# Each script runs as  Blender -b -P models/<name>.py -- models/<name>.glb [preview.png]
# Blender is Z-up and characters face -Y; the glTF exporter turns that into Y-up facing +Z, like the town.
# Nodes body, head, tail, foot_L and foot_R sit at the pivots makeCharacter() uses, so every animation still works.
# models.js colors meshes from their material: "skin" takes the agent's color, "stripe" a deeper shade of it,
# and every other material keeps the color set here.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Quaternion

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

# ---------- shared parts ----------
def skeleton(name):
    """The node tree every character has: root → body → head / tail, root → foot_L / foot_R."""
    root = node(name)
    body = node('body', root)
    head = node('head', body, (0, 0, HEAD_Z))
    tail = node('tail', body, TAIL_AT)
    feet = [node(f'foot_{"LR"[sd > 0]}', root, (sd * FOOT_AT[0], FOOT_AT[1], FOOT_AT[2])) for sd in (-1, 1)]
    return root, body, head, tail, feet

def finish():
    if PREVIEW: _preview()
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_texcoords=False)
    print('wrote', OUT)

def _preview():
    w = bpy.data.worlds.new('w'); scene.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = lin('#fdeef0')
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.0; sun.rotation_euler = (0.8, 0.2, -0.6)
    scene.collection.objects.link(sun)
    floor = bpy.data.meshes.new('floor')
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); bm.to_mesh(floor); bm.free()
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
    for tag, pos in views.items():
        cam.location = pos
        cam.rotation_euler = (Vector((0, 0, 0.65)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = PREVIEW.replace('.png', f'_{tag}.png')
        bpy.ops.render.render(write_still=True)
    for name in ('sun', 'floor', 'cam'): bpy.data.objects.remove(bpy.data.objects[name])
