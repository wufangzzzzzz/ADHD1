import math

TURNS = 5
R0 = 38.0
MAXR = 300.0
STEPS_PER_TURN = 64
TARGET = 520.0  # 三形状渲染后的最大外接尺寸（px），此处仅三角+方统一对齐

def spiral(V, base, rot=0.0):
    pts = []
    total = V * TURNS
    gap = (MAXR - R0) / TURNS
    start = base + rot
    for s in range(total + 1):
        ang = start + s * (2 * math.pi / V)
        R = R0 + (s / V) * gap
        x = R * math.cos(ang)
        y = R * math.sin(ang)
        pts.append((x, y))
    return pts

def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), max(xs), min(ys), max(ys)

def normalize(pts, target):
    minx, maxx, miny, maxy = bbox(pts)
    w = maxx - minx
    h = maxy - miny
    scale = target / max(w, h)
    cx = (minx + maxx) / 2.0
    cy = (miny + maxy) / 2.0
    return [((x - cx) * scale, (y - cy) * scale) for x, y in pts]

# 仅三角 + 方；三角顶点朝上、方轴对齐（与圆版口径一致）
shapes = {
    "triangle": (3, math.pi / 2),
    "square":   (4, math.pi / 4),
}

paths = {}
metrics = {}
for name, (V, base) in shapes.items():
    p = spiral(V, base)
    p2 = normalize(p, TARGET)
    paths[name] = p2
    minx, maxx, miny, maxy = bbox(p2)
    metrics[name] = (maxx - minx, maxy - miny)

def to_path(pts):
    d = "M {:.1f} {:.1f}".format(pts[0][0], pts[0][1])
    for x, y in pts[1:]:
        d += " L {:.1f} {:.1f}".format(x, y)
    return d

STROKE = {"triangle": "#0984e3", "square": "#e17055"}
LABEL  = {"triangle": "正三角形", "square": "正方形"}

cards = ""
for name in ["triangle", "square"]:
    d = to_path(paths[name])
    w, h = metrics[name]
    color = STROKE[name]
    cards += '''
    <div class="card">
      <div class="ttl">''' + LABEL[name] + '''</div>
      <svg viewBox="-300 -300 600 600" width="320" height="320">
        <rect x="-300" y="-300" width="600" height="600" fill="#fbfcff"/>
        <path d="''' + d + '''" fill="none" stroke="''' + color + '''" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <div class="sub">外接框 ''' + ("{:.0f} × {:.0f}".format(w, h)) + ''' px（与圆螺旋同尺寸）</div>
    </div>'''

html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>三角与方螺旋（与圆同尺寸）</title>
<style>
  body { background:#eef4fa; color:#1c2733; font-family:"PingFang SC","Microsoft YaHei",sans-serif; margin:0; padding:24px; }
  h2 { text-align:center; font-size:18px; margin:0 0 6px; }
  p.note { text-align:center; color:#5b6b7b; font-size:13px; margin:0 0 22px; }
  .row { display:flex; gap:28px; justify-content:center; flex-wrap:wrap; }
  .card { background:#fff; border:1px solid #d7dee8; border-radius:16px; padding:14px 16px; box-shadow:0 6px 18px rgba(28,39,51,.06); }
  .ttl { text-align:center; font-weight:700; font-size:15px; margin-bottom:10px; }
  .sub { text-align:center; font-size:12px; color:#7a8794; margin-top:8px; }
</style>
</head>
<body>
<h2>正三角形 与 正方形（螺旋尺寸与圆一致）</h2>
<p class="note">两个图形的最大外接边统一对齐为 ''' + ("{:.0f}".format(TARGET)) + '''px。</p>
<div class="row">''' + cards + '''
</div>
</body>
</html>'''

with open(r"D:/专注力项目/spiral_match.html", "w", encoding="utf-8") as f:
    f.write(html)

print("OK")
for n in ["triangle", "square"]:
    w, h = metrics[n]
    print(n, "{:.1f} x {:.1f}".format(w, h))
