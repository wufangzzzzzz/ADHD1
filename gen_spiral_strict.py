import math

# 复刻 color-spiral-connect.html 的 getSpiralVertices：
# R = r0 + (s/V)*gap;  ang = baseAngle + s*(2*pi/V)
# 外角固定 = 2*pi/V  =>  内角严格 = pi - 2*pi/V = 60°(V=3) / 90°(V=4)
def spiral_points(V, turns, maxR, base_angle, cx, cy, r0=30.0):
    gap = (maxR - r0) / turns
    pts = []
    n = turns * V
    for s in range(n + 1):
        R = r0 + (s / V) * gap
        ang = base_angle + s * (2 * math.pi / V)
        x = cx + R * math.cos(ang)
        y = cy + R * math.sin(ang)
        pts.append((x, y))
    return pts

def measure_interior(pts, V):
    deg = []
    for i in range(1, len(pts) - 1):
        v0x = pts[i][0] - pts[i-1][0]; v0y = pts[i][1] - pts[i-1][1]
        v1x = pts[i+1][0] - pts[i][0]; v1y = pts[i+1][1] - pts[i][1]
        a0 = math.atan2(v0y, v0x); a1 = math.atan2(v1y, v1x)
        d = abs(a1 - a0)
        if d > math.pi: d = 2 * math.pi - d
        deg.append(math.degrees(math.pi - d))
    # 跳过最内圈过渡（前 V 个），取稳定段均值
    return sum(deg[V:]) / len(deg[V:])

def to_path(pts):
    d = "M {:.2f} {:.2f}".format(pts[0][0], pts[0][1])
    for p in pts[1:]:
        d += " L {:.2f} {:.2f}".format(p[0], p[1])
    return d

cx = cy = 300
maxR = 250          # 三者外接半径一致 -> 与圆螺旋同尺寸
turns = 4

# 三角：baseAngle=-pi/2 配 y=+R*sin -> 顶点在顶部（头朝上）
tri = spiral_points(3, turns, maxR, -math.pi/2, cx, cy)
# 方：baseAngle=pi/4 -> 顶点在 45° 对角线 -> 轴对齐（边水平/垂直）
sq  = spiral_points(4, turns, maxR,  math.pi/4, cx, cy)

print("Triangle interior angle: {:.3f} deg  (target 60)".format(measure_interior(tri, 3)))
print("Square   interior angle: {:.3f} deg  (target 90)".format(measure_interior(sq, 4)))

cards = ""
for name, pts, color, label in [
    ("triangle", tri, "#e8743b", "正三角形螺旋"),
    ("square",   sq,  "#2f7ed8", "正方形螺旋"),
]:
    d = to_path(pts)
    cards += '''
    <div class="card">
      <div class="ttl">{label}</div>
      <svg viewBox="0 0 600 600" width="280" height="280">
        <rect x="0" y="0" width="600" height="600" fill="#fbfcff"/>
        <path d="{d}" fill="none" stroke="{color}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <div class="sub">外接直径 {diam} px（与圆螺旋一致）</div>
    </div>'''.format(label=label, d=d, color=color, diam=2*maxR)

html = '''<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<title>三角与方螺旋（与圆同尺寸）</title>
<style>
  body {{ margin:0; background:#eef1f6; font-family:system-ui,"Microsoft YaHei",sans-serif; }}
  .wrap {{ display:flex; gap:24px; justify-content:center; padding:30px; flex-wrap:wrap; }}
  .card {{ background:#fff; border:1px solid #d7dee8; border-radius:16px; padding:14px 16px; box-shadow:0 6px 18px rgba(28,39,51,.06); }}
  .ttl {{ text-align:center; font-weight:600; color:#1c2733; font-size:15px; margin-bottom:10px; }}
  .sub {{ text-align:center; color:#5b6b7b; font-size:13px; margin-top:6px; }}
</style></head>
<body><div class="wrap">{cards}</div></body></html>'''.format(cards=cards)

with open("D:/专注力项目/shape_match.html", "w", encoding="utf-8") as f:
    f.write(html)
print("written D:/专注力项目/shape_match.html")
