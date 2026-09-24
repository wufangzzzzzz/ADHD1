# -*- coding: utf-8 -*-
r"""
把 3 张狼候选抠底、裁齐，输出：
  D:\专注力项目\wolf-a.png / wolf-b.png / wolf-c.png  透明 PNG 512x512
  D:\专注力项目\wolf-对比.png                          3 连对比图（浅灰底，带 A/B/C 标）
色键：d = g - max(r,b)；d<=0 = 狼（保留，含 d=0 的黑眼/鼻/纯灰部件），d>=1 = 薄荷背景（透明）
"""
import glob, os
from PIL import Image, ImageDraw, ImageFont

OUT = r'D:\专注力项目'
SIZE = 512
frames = sorted(glob.glob(r'D:\专注力项目\wolf\*\Use_the_sheep_*.png'))
assert len(frames) == 3, f'期望 3 张，实际 {len(frames)}'


def key_out(im):
    rgb = im.convert('RGB')
    w, h = rgb.size
    src = rgb.load()
    a = Image.new('L', (w, h))
    ap = a.load()
    trans = 0
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if g - max(r, b) <= 0:      # 狼（含纯灰/黑部件）
                ap[x, y] = 255
            else:                       # 薄荷背景
                ap[x, y] = 0
                trans += 1
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out, trans / (w * h)


norm = []
for tag, fp in zip('abc', frames):
    im = Image.open(fp)
    o, tp = key_out(im)
    b = o.getbbox()
    if not b:
        raise SystemExit('狼被抠空了，检查阈值')
    c = o.crop(b)
    cw, ch = c.size
    side = max(cw, ch)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(c, ((side - cw) // 2, (side - ch) // 2))
    im2 = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    p = os.path.join(OUT, f'wolf-{tag}.png')
    im2.save(p)
    norm.append(im2)
    print(f'{tag.upper()}: 透明占比 {tp*100:.2f}%  裁切 {cw}x{ch} -> {SIZE}x{SIZE}  {os.path.getsize(p)} 字节')

# 对比图：3 连，浅灰底 + A/B/C 标签
PAD = 24
LAB = 46
W = SIZE * 3 + PAD * 4
H = SIZE + PAD * 2 + LAB
board = Image.new('RGB', (W, H), (246, 247, 249))
d = ImageDraw.Draw(board)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', 34)
except Exception:
    font = ImageFont.load_default()
for i, (tag, im) in enumerate(zip('abc', norm), 0):
    x = PAD + i * (SIZE + PAD)
    y = PAD + LAB
    board.paste(im, (x, y), im)
    t = f'{tag.upper()}'
    tw = d.textlength(t, font=font)
    d.text((x + (SIZE - tw) / 2, PAD), t, fill=(60, 66, 78), font=font)
cp = os.path.join(OUT, 'wolf-对比.png')
board.save(cp)
print('对比图:', cp, os.path.getsize(cp), '字节')

# 自检
print('\n=== 自检（四角 alpha 应为 0，不透明占比应合理）===')
for tag, im in zip('abc', norm):
    a = im.getchannel('A').load()
    s = SIZE
    opq = sum(1 for y in range(0, s, 4) for x in range(0, s, 4) if a[x, y] > 128)
    samp = (s // 4) ** 2
    print(f'{tag.upper()}: 不透明 {opq/samp*100:.1f}%  四角alpha={a[0,0]},{a[s-1,0]},{a[0,s-1]},{a[s-1,s-1]}')
