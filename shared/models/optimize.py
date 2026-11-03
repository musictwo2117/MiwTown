#!/usr/bin/env python3
"""Make the .glb files smaller without changing how they look:  python3 shared/models/optimize.py [file.glb ...]

Blender writes vertex colours as 32-bit floats and exports every colour layer, but the game only reads the first one
(three.js takes COLOR_0), so this
  - turns COLOR_0 into normalised 8-bit values (a quarter of the size; colours are 0-1 anyway), and
  - drops COLOR_1 and anything else nothing refers to.
Run it again on a file already done: it has nothing left to change. build.sh runs it after every export."""
import json, struct, sys, glob, os

def read(path):
    d = open(path, 'rb').read()
    assert d[:4] == b'glTF'
    jl = struct.unpack('<I', d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack('<I', d[off:off + 4])[0]
    return j, d[off + 8:off + 8 + bl]

def write(path, j, binary):
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4); binary += b'\0' * (-len(binary) % 4)
    out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(binary))
    out += struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(binary)) + b'BIN\0' + binary
    open(path, 'wb').write(out)

def optimize(path):
    j, blob = read(path)
    acc, views = j['accessors'], j['bufferViews']
    before = os.path.getsize(path)

    # 1. drop every colour layer but the first
    for m in j.get('meshes', []):
        for p in m['primitives']:
            for k in [k for k in p['attributes'] if k.startswith('COLOR_') and k != 'COLOR_0']:
                del p['attributes'][k]

    # 2. COLOR_0 as normalised unsigned bytes (always 4 components, so every vertex stays 4-byte aligned)
    new_data = {}   # accessor index -> replacement bytes
    for m in j.get('meshes', []):
        for p in m['primitives']:
            i = p['attributes'].get('COLOR_0')
            if i is None or acc[i]['componentType'] != 5126 or i in new_data: continue
            a = acc[i]; v = views[a['bufferView']]
            n, comps = a['count'], {'VEC3': 3, 'VEC4': 4}[a['type']]
            start = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride', comps * 4)
            out = bytearray()
            for k in range(n):
                f = struct.unpack_from('<' + 'f' * comps, blob, start + k * stride)
                out += bytes(max(0, min(255, round(x * 255))) for x in (f + (1.0,))[:4])
            new_data[i] = bytes(out)

    # 3. rebuild the accessors and buffer views that are still used, with new numbering
    used = set()
    for m in j.get('meshes', []):
        for p in m['primitives']:
            used.update(p['attributes'].values())
            if 'indices' in p: used.add(p['indices'])
    for s in j.get('skins', []): used.add(s['inverseBindMatrices']) if 'inverseBindMatrices' in s else None
    for an in j.get('animations', []):
        for s in an['samplers']: used.update((s['input'], s['output']))
    for m in j.get('meshes', []):
        for p in m['primitives']:
            for t in p.get('targets', []): used.update(t.values())

    out = bytearray(); new_views, new_acc, amap = [], [], {}
    for ai in sorted(used):
        a = dict(acc[ai]); v = views[a['bufferView']]
        if ai in new_data:
            data = new_data[ai]; a.update(componentType=5121, type='VEC4', normalized=True); a.pop('min', None); a.pop('max', None); a.pop('byteOffset', None)
            nv = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data), 'target': 34962}
        else:
            start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
            esize = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[a['componentType']] * {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
            stride = v.get('byteStride', esize)
            if stride != esize: raise SystemExit(f'{path}: interleaved data, not handled')
            data = blob[start:start + a['count'] * esize]
            nv = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}
            if 'target' in v: nv['target'] = v['target']
            a.pop('byteOffset', None)
        out += data; out += b'\0' * (-len(out) % 4)
        a['bufferView'] = len(new_views); new_views.append(nv)
        amap[ai] = len(new_acc); new_acc.append(a)

    def fix(d):
        for k in list(d): d[k] = amap[d[k]]
    for m in j.get('meshes', []):
        for p in m['primitives']:
            fix(p['attributes'])
            if 'indices' in p: p['indices'] = amap[p['indices']]
            for t in p.get('targets', []): fix(t)
    for s in j.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = amap[s['inverseBindMatrices']]
    for an in j.get('animations', []):
        for s in an['samplers']: s['input'], s['output'] = amap[s['input']], amap[s['output']]
    j['accessors'], j['bufferViews'] = new_acc, new_views
    j['buffers'] = [{'byteLength': len(out)}]
    j.pop('images', None) if not j.get('images') else None
    write(path, j, bytes(out))
    return before, os.path.getsize(path)

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    files = sys.argv[1:] or sorted(glob.glob(os.path.join(here, '*.glb')))
    tot = [0, 0]
    for f in files:
        b, a = optimize(f); tot[0] += b; tot[1] += a
        print(f'{os.path.basename(f):22s} {b:>9,} -> {a:>9,}')
    print(f'total {tot[0]:,} -> {tot[1]:,}  ({100 - 100 * tot[1] // max(1, tot[0])}% smaller)')
