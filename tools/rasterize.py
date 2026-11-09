import json, sys
from PIL import Image, ImageDraw

src = sys.argv[1]
outdir = sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
W, H = 1280, 720

frames = json.load(open(src, encoding='utf-8'))
for frame in frames:
    img = Image.new('RGB', (int(W * scale), int(H * scale)), (8, 12, 24))
    dr = ImageDraw.Draw(img, 'RGBA')
    for op in frame['ops']:
        a = max(0.0, min(1.0, op.get('alpha', 1.0)))
        c = op['color']
        alpha = int(255 * a * (c.get('a', 1) if isinstance(c, dict) else 1))
        if alpha <= 0:
            continue
        col = (c['r'], c['g'], c['b'], alpha)
        pts = [(p[0] * scale, p[1] * scale) for p in op['pts']]
        if op['t'] == 'poly':
            if len(pts) >= 3:
                dr.polygon(pts, fill=col)
        else:
            w = max(1, int(round(op.get('w', 1) * scale)))
            if len(pts) >= 2:
                dr.line(pts, fill=col, width=w, joint='curve')
    img.save(f"{outdir}/{frame['name']}.png")
    print('wrote', frame['name'])
