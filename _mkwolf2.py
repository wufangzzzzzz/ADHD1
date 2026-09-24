# -*- coding: utf-8 -*-
r"""
B 正面重画：抠底 + 「正面度」数值检测。
正面度 = 剪影左右镜像后的重合率(IoU) + 灰度左右镜像相似度；正面角色高、侧面低。
输出 wolf-bf1.png / wolf-bf2.png（透明）与 wolf-b正面-对比.png（原B + 新1 + 新2）
"""
import glob, os
from PIL import Image, ImageDraw, ImageFont

OUT = r'D:\专注力项目'
SIZE = 512


def key_out(im):
    """色键：d=g-max(r,b)；d<=0 保留（含纯灰/黑眼鼻），d>=1 透明"""
    rgb = im.convert('RGB')
    w, h = rgb.size
    src = rgb.load()
    a = Image.new('L', (w, h))
    ap = a.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            ap[x, y] = 0 if (g - max(r, b)) > 0 else 255
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out


def norm_crop(im):
    b = im.getbbox()
    c = im.crop(b)
    cw, ch = c.size
    side = max(cw, ch)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(c, ((side - cw) // 2, (side - ch) // 2))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def frontality(im):
    """左右镜像重合率：剪影 IoU + 灰度对称相关度（0~1，越高越正面）"""
    s = im.size[0]
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    am = a.transpose(Image.FLIP_LEFT_RIGHT)
    ap, mp = a.load(), am.load()
    inter = union = 0
    for y in range(0, s, 2):
        for x in range(0, s, 2):
            p, q = ap[x, y], mp[x, y]
            if p or q:
                union += 1
                if p and q:
                    inter += 1
    sil = inter / union if union else 0

    # 灰度对称：只看不透明像素的亮度差
    g = im.convert('L').load()
    amask = a.load()
    diff = tot = 0
    for y in range(0, s, 2):
        for x in range(0, s // 2, 2):
            x2 = s - 1 - x
            if amask[x, y] and amask[x2, y]:
                diff += abs(g[x, y] - g[x2, y])
                tot += 1
    gray = 1 - (diff / tot / 255) if tot else 0
    return sil, gray


items = [
    ('原B(旧)', r'D:\专注力项目\wolf\b\Use_the_sheep_in_the_reference_2026-09-07T15-01-05.png', None),
    ('正面1', sorted(glob.glob(r'D:\专注力项目\wolf\b-front1\*.png'))[0], 'bf1'),
    ('正面2', sorted(glob.glob(r'D:\专注力项目\wolf\b-front2\*.png'))[0], 'bf2'),
]

norms, labels = [], []
for tag, fp, save in items:
    im = norm_crop(key_out(Image.open(fp)))
    sil, gray = frontality(im)
    norms.append(im)
    labels.append(f'{tag} 剪影对称 {sil*100:.0f}%  明暗对称 {gray*100:.0f}%')
    print(f'{tag}: 剪影重合 {sil*100:.1f}%  灰度对称 {gray*100:.1f}%')
    if save:
        p = os.path.join(OUT, f'wolf-{save}.png')
        im.save(p)
        print('   写出', p, os.path.getsize(p), '字节')

# 对比图：3 连 + 数值标注
PAD, LAB = 24, 54
W = SIZE * 3 + PAD * 4
H = SIZE + PAD * 2 + LAB
board = Image.new('RGB', (W, H), (246, 247, 249))
d = ImageDraw.Draw(board)
try:
    f1 = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', 32)
    f2 = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
except Exception:
    f1 = f2 = ImageFont.load_default()
for i, (im, lab) in enumerate(zip(norms, labels)):
    x = PAD + i * (SIZE + PAD)
    board.paste(im, (x, PAD + LAB), im)
    name = lab.split()[0]
    tw = d.textlength(name, font=f1)
    d.text((x + (SIZE - tw) / 2, PAD), name, fill=(60, 66, 78), font=f1)
    d.text((x + 6, PAD + 40), lab.split('  ', 1)[1], fill=(90, 98, 112), font=f2)
cp = os.path.join(OUT, 'wolf-b正面-对比.png')
board.save(cp)
print('对比图:', cp, os.path.getsize(cp), '字节')
