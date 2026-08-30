import math

# 游戏同款算法（极坐标线性 R）：R=r0+(s/V)*gap, ang=base+s*(2pi/V)
def spiral_points(V, turns, maxR, base_angle, cx, cy, r0=30.0):
    gap = (maxR - r0) / turns
    pts = []
    n = turns * V
    for s in range(n + 1):
        R = r0 + (s / V) * gap
        ang = base_angle + s * (2 * math.pi / V)
        pts.append((cx + R * math.cos(ang), cy + R * math.sin(ang)))
    return pts

def interior_angles(pts):
    res = []
    for i in range(1, len(pts) - 1):
        v0x = pts[i][0]-pts[i-1][0]; v0y = pts[i][1]-pts[i-1][1]
        v1x = pts[i+1][0]-pts[i][0]; v1y = pts[i+1][1]-pts[i][1]
        a0 = math.atan2(v0y, v0x); a1 = math.atan2(v1y, v1x)
        d = abs(a1 - a0)
        if d > math.pi: d = 2*math.pi - d
        res.append(math.degrees(math.pi - d))
    return res

cx = cy = 300
maxR = 250
turns = 4

for V, name, base in [(3, "triangle", -math.pi/2), (4, "square", math.pi/4)]:
    pts = spiral_points(V, turns, maxR, base, cx, cy)
    angs = interior_angles(pts)
    target = 180 - 360.0/V
    print(f"=== {name} (V={V})  target interior = {target:.2f} ===")
    for layer in range(turns):
        seg = angs[layer*V:(layer+1)*V]
        print(f"  layer {layer+1}: " + "  ".join(f"{a:.3f}" for a in seg))
    print(f"  min={min(angs):.3f}  max={max(angs):.3f}  spread={max(angs)-min(angs):.3f}\n")
