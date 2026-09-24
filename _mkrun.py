# -*- coding: utf-8 -*-
r"""
把 4 张奔跑帧抠底、按统一包围盒对齐，输出：
  1) 4 张透明 PNG  D:\专注力项目\cat-run\frame1..4.png
  2) 横向 sprite    D:\专注力项目\pattern12-cat-run.png
  3) 动画预览 GIF   D:\专注力项目\cat-run-preview.gif
"""
import glob, os
from PIL import Image

SRC_DIR = r'D:\专注力项目\cat-run'
OUT = r'D:\专注力项目'
FRAME = 512          # 每帧输出边长
GIF_SIZE = 256       # 预览 GIF 单帧边长
GIF_MS = 110         # 每帧停留毫秒（跑动节奏）

frames = sorted(glob.glob(os.path.join(SRC_DIR, 'f*', 'Keep_this_*.png')))
assert len(frames) == 4, f'期望 4 帧，实际 {len(frames)}'


def key_out(im):
    """色键：d = g - max(r,b)；d<0=猫(不透明)，d>=0=薄荷背景(透明)"""
    rgb = im.convert('RGB')
    w, h = rgb.size
    src = rgb.load()
    a = Image.new('L', (w, h))
    ap = a.load()
    trans = 0
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if g - max(r, b) < 0:
                ap[x, y] = 255
            else:
                ap[x, y] = 0
                trans += 1
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out, trans / (w * h)


# 1) 抠底
cut = []
for i, fp in enumerate(frames, 1):
    im = Image.open(fp)
    o, tp = key_out(im)
    cut.append(o)
    print(f'帧{i}: {os.path.basename(fp)[:40]} 透明占比 {tp*100:.2f}%')

# 2) 统一包围盒（4 帧并集）→ 防抖
bx0 = by0 = 10**9
bx1 = by1 = -1
for im in cut:
    b = im.getbbox()
    if not b:
        raise SystemExit('某帧抠空了，检查阈值')
    bx0 = min(bx0, b[0]); by0 = min(by0, b[1])
    bx1 = max(bx1, b[2]); by1 = max(by1, b[3])
print(f'统一包围盒: x[{bx0}..{bx1}] y[{by0}..{by1}]  尺寸 {bx1-bx0}x{by1-by0}')

# 3) 按统一框裁切 + 等比缩放到正方形（居中，四周补透明）
norm = []
for i, im in enumerate(cut, 1):
    c = im.crop((bx0, by0, bx1, by1))
    cw, ch = c.size
    side = max(cw, ch)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(c, ((side - cw) // 2, (side - ch) // 2))
    norm.append(canvas.resize((FRAME, FRAME), Image.LANCZOS))
    print(f'帧{i}: 裁切 {cw}x{ch} -> 归一 {FRAME}x{FRAME}')

# 4) 输出独立帧
for i, im in enumerate(norm, 1):
    p = os.path.join(OUT, f'cat-run-{i}.png')
    im.save(p)
    print('写出', p, os.path.getsize(p), '字节')

# 5) 横向 sprite sheet
sheet = Image.new('RGBA', (FRAME * 4, FRAME), (0, 0, 0, 0))
for i, im in enumerate(norm):
    sheet.paste(im, (FRAME * i, 0))
sp = os.path.join(OUT, 'pattern12-cat-run.png')
sheet.save(sp)
print('写出 sprite:', sp, os.path.getsize(sp), '字节')

# 6) 动画预览 GIF（白底，便于直接看）
gfs = []
for im in norm:
    g = im.resize((GIF_SIZE, GIF_SIZE), Image.LANCZOS)
    bg = Image.new('RGB', (GIF_SIZE, GIF_SIZE), (255, 255, 255))
    bg.paste(g, (0, 0), g)
    gfs.append(bg)
gp = os.path.join(OUT, 'cat-run-preview.gif')
gfs[0].save(gp, save_all=True, append_images=gfs[1:], duration=GIF_MS, loop=0)
print('写出预览 GIF:', gp, os.path.getsize(gp), '字节')

# 7) 自检：alpha 统计
print('\n=== 自检 ===')
for i, im in enumerate(norm, 1):
    a = im.getchannel('A')
    px = a.load()
    tot = FRAME * FRAME
    opq = sum(1 for y in range(0, FRAME, 4) for x in range(0, FRAME, 4) if px[x, y] > 128)
    samp = (FRAME // 4) ** 2
    print(f'帧{i}: 不透明占比 {opq/samp*100:.1f}%  四角alpha='
          f'{px[0,0]},{px[FRAME-1,0]},{px[0,FRAME-1]},{px[FRAME-1,FRAME-1]}')
