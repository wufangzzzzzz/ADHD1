import math

# 完全复刻 color-spiral-connect.html 的 getSpiralVertices 算法（含独立 0.92 缩放）
TURNS = 4                       # 游戏 TURNS=4
MAXR = 276.0                    # 画布 600，留 24 边距 -> (600/2 - 24)
R0 = MAXR * 0.12               # 游戏 r0 = maxR*0.12

def spiral_verts(V, base_angle):
    """复刻 getSpiralVertices：中心在原点、每形状独立缩放到 0.92 直径"""
    gap = (MAXR - R0) / TURNS
    verts = []
    total = V * TURNS
    for s in range(total + 1):
        R = R0 + (s / V) * gap
        ang = base_angle + s * (2 * math.pi / V)
        verts.append((R * math.cos(ang), R * math.sin(ang)))
    # 独立缩放（游戏对每个形状单独做）
    xs = [p[0] for p in verts]; ys = [p[1] for p in verts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    target = 2 * MAXR * 0.92
    sc = target / max(maxx - minx, maxy - miny)
    return [(x * sc, y * sc) for x, y in verts]

# 三角：base=-pi/2 让顶点朝上（游戏默认 pi/2 是朝下，用户要朝上）
triangle = spiral_verts(3, -math.pi / 2)
# 方：轴对齐、底边水平（与游戏一致）
square   = spiral_verts(4,  math.pi / 4)

def to_path(pts):
    d = "M {:.1f} {:.1f}".format(pts[0][0], pts[0][1])
    for x, y in pts[1:]:
        d += " L {:.1f} {:.1f}".format(x, y)
    return d

def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return max(xs) - min(xs), max(ys) - min(ys)

STROKE = {"triangle": "#0984e3", "square": "#e17055"}
LABEL  = {"triangle": "正三角形螺旋", "square": "正方形螺旋"}

cards = ""
for name, pts in [("triangle", triangle), ("square", square)]:
    d = to_path(pts)
    w, h = bbox(pts)
    cards += '''
    <div class="card">
      <div class="ttl">''' + LABEL[name] + '''</div>
      <svg viewBox="-300 -300 600 600" width="340" height="340">
        <rect x="-300" y="-300" width="600" height="600" fill="#fbfcff"/>
        <path d="''' + d + '''" fill="none" stroke="''' + STROKE[name] + '''" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <div class="sub">外接 ''' + ("{:.0f} × {:.0f}".format(w, h)) + ''' px（与圆螺旋同视觉尺寸）</div>
    </div>'''

html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>三角螺旋 与 方螺旋（复刻游戏算法）</title>
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
<h2>正三角形螺旋 与 正方形螺旋</h2>
<p class="note">复刻游戏 getSpiralVertices 算法（TURNS=4，独立放大到 0.92 直径，与圆螺旋同视觉大小）；三角顶点朝上、方轴对齐底边水平。</p>
<div class="row">''' + cards + '''
</div>
</body>
</html>'''

with open(r"D:/专注力项目/shape_match.html", "w", encoding="utf-8") as f:
    f.write(html)

print("OK")
for n, p in [("triangle", triangle), ("square", square)]:
    a, b = bbox(p)
    print(n, "%.1f x %.1f" % (a, b))
