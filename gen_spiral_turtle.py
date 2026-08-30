import math

def turtle_spiral(V, turns, gap_per_turn, base):
    ext = 2 * math.pi / V  # 外角，转角固定
    # 每圈净位移 = gap_per_turn，推导使展开方向对齐 +x
    if V == 3:
        dL = gap_per_turn / math.sqrt(3)
        dir_off = -math.radians(210)
    else:
        dL = gap_per_turn / (2 * math.sqrt(2))
        dir_off = -math.radians(225)
    L0 = dL * 0.6
    phi = base + dir_off
    x = y = 0.0
    pts = [(x, y)]
    n = turns * V       # 画完整 turns 圈，到达最外顶点
    for k in range(n):
        L = L0 + k * dL
        x += L * math.cos(phi)
        y += L * math.sin(phi)
        phi += ext
        pts.append((x, y))
    # 缩短最外顶点：把最外边(倒数第二顶点->最外顶点)的末端沿该边方向收回，
    # 使最外顶点落在"最外圈第1边所在的直线(编号1,2)"上，且 编号1 与最外顶点之间不连线。
    o0 = (turns - 1) * V
    P0 = pts[o0 + V - 1]      # 倒数第二顶点（编号 V）
    Pend = pts[o0 + V]        # 原最外顶点（编号 V+1）
    Q0 = pts[o0]              # 编号1
    Q1 = pts[o0 + 1]          # 编号2
    dx, dy = Pend[0]-P0[0], Pend[1]-P0[1]
    ex, ey = Q1[0]-Q0[0], Q1[1]-Q0[1]
    rhsx, rhsy = Q0[0]-P0[0], Q0[1]-P0[1]
    det = ex*dy - dx*ey
    t = (-rhsx*ey + ex*rhsy) / det
    newP = (P0[0] + t*dx, P0[1] + t*dy)
    pts[o0 + V] = newP
    orig_len = math.hypot(dx, dy)
    colinear = abs((newP[1]-Q0[1])*ex - (newP[0]-Q0[0])*ey) / math.hypot(ex, ey)
    shorten_info = (t, orig_len, abs(t)*orig_len, colinear)
    # 居中到 (0,0)
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    mx = (min(xs) + max(xs)) / 2; my = (min(ys) + max(ys)) / 2
    pts = [(p[0] - mx, p[1] - my) for p in pts]
    return pts, shorten_info

def interior_angles(pts):
    res = []
    for i in range(1, len(pts) - 1):
        v0x = pts[i][0]-pts[i-1][0]; v0y = pts[i][1]-pts[i-1][1]
        v1x = pts[i+1][0]-pts[i][0]; v1y = pts[i+1][1]-pts[i][1]
        a0 = math.atan2(v0y, v0x); a1 = math.atan2(v1y, v1x)
        d = abs(a1 - a0)
        if d > math.pi: d = 2 * math.pi - d
        res.append(math.degrees(math.pi - d))
    return res

def to_path(pts):
    d = "M {:.2f} {:.2f}".format(pts[0][0], pts[0][1])
    for p in pts[1:]:
        d += " L {:.2f} {:.2f}".format(p[0], p[1])
    return d

turns = 4
gap = 50  # 每圈净位移（仅决定相对形状，最终按圈距重新缩放）
TARGET_GAP = 55.0  # 目标：相邻圈法向间距 = 圆螺旋 gap（外接250基准下=55px）

report = ""
cards = ""
all_strict = True
for V, name, color, label in [(3, "triangle", "#e8743b", "正三角形螺旋"),
                               (4, "square",   "#2f7ed8", "正方形螺旋")]:
    base = -math.pi/2 if V == 3 else math.pi/4
    pts, sinfo = turtle_spiral(V, turns, gap, base)
    angs = interior_angles(pts)
    target = 180 - 360.0/V
    bad = [a for a in angs if abs(a - target) > 0.05]
    if bad:
        all_strict = False
    # 未缩放法向间距（最外圈第0边 与 内一圈同方向第0边平行距离）
    o0 = (turns - 1) * V
    A = pts[o0]; B = pts[o0 + 1]; C2 = pts[o0 - V]
    ex, ey = B[0]-A[0], B[1]-A[1]
    ndist0 = abs((C2[0]-A[0])*ey - (C2[1]-A[1])*ex) / math.hypot(ex, ey)
    s = TARGET_GAP / ndist0
    pts = [(p[0]*s, p[1]*s) for p in pts]
    angs2 = interior_angles(pts)  # 缩放不影响角度，复核
    bad2 = [a for a in angs2 if abs(a - target) > 0.05]
    R = max(math.hypot(p[0], p[1]) for p in pts)
    report += f"=== {name} (V={V})  target interior = {target:.2f} ===\n"
    report += (f"  缩放前法向间距={ndist0:.2f}px -> 缩放s={s:.3f} -> 目标圈距={TARGET_GAP:.1f}px\n")
    report += (f"  缩短最外顶点: t={sinfo[0]:.3f}（原边长{sinfo[1]:.1f}px -> 新长{sinfo[2]:.1f}px）"
               f"  共线距离={sinfo[3]:.4f}px  编号1与最外顶点不连线\n")
    report += f"  放大后外接半径={R:.1f}px（圆基准外接250，为对齐圈距而放大）\n"
    report += f"  螺旋转角严格(60/90 within 0.05)={len(angs2)-len(bad2)}\n\n"
    d = to_path(pts)
    outer_verts = pts[o0: turns*V + 1]
    op = to_path(outer_verts)
    badges = ""
    for i, p in enumerate(outer_verts):
        badges += (f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="10" fill="#fff" stroke="#c0392b" stroke-width="2"/>'
                   f'<text x="{p[0]:.1f}" y="{p[1]:.1f}" dy="4" font-size="13" font-weight="700" fill="#c0392b" text-anchor="middle">{i+1}</text>')
    span = 2 * (R + 18)
    cards += f'''
    <div class="card">
      <div class="ttl">{label}</div>
      <svg viewBox="{-(R+18):.0f} {-R-18:.0f} {span:.0f} {span:.0f}" width="{span:.0f}" height="{span:.0f}">
        <rect x="{-(R+18):.0f}" y="{-(R+18):.0f}" width="{span:.0f}" height="{span:.0f}" fill="#fbfcff"/>
        <path d="{d}" fill="none" stroke="{color}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="{op}" fill="none" stroke="#c0392b" stroke-width="5" stroke-linejoin="round" opacity="0.5"/>
        {badges}
      </svg>
      <div class="sub">圈距={TARGET_GAP:.0f}px（与圆一致）；外接半径={R:.0f}px（三角因 cos60/4 需放大到≈445 才能圈距=圆）</div>
    </div>'''

print(report)
print("ALL STRICT:", all_strict)

html = f'''<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<title>三角与方螺旋（圈距对齐圆=55px）</title>
<style>
  body {{ margin:0; background:#eef1f6; font-family:system-ui,"Microsoft YaHei",sans-serif; }}
  .wrap {{ display:flex; gap:24px; justify-content:center; padding:30px; flex-wrap:wrap; align-items:flex-start; }}
  .card {{ background:#fff; border:1px solid #d7dee8; border-radius:16px; padding:14px 16px; box-shadow:0 6px 18px rgba(28,39,51,.06); }}
  .ttl {{ text-align:center; font-weight:600; color:#1c2733; font-size:15px; margin-bottom:10px; }}
  .sub {{ text-align:center; color:#5b6b7b; font-size:13px; margin-top:6px; max-width:480px; }}
</style></head>
<body><div class="wrap">{cards}</div></body></html>'''

with open("D:/专注力项目/shape_match.html", "w", encoding="utf-8") as f:
    f.write(html)
print("written shape_match.html")
