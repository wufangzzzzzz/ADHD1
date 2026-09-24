import ctypes

u = ctypes.windll.user32
lines = []

hwnd = u.GetForegroundWindow()
n = u.GetWindowTextLengthW(hwnd)
buf = ctypes.create_unicode_buffer(n + 1)
u.GetWindowTextW(hwnd, buf, n + 1)
lines.append('前台窗口 hwnd = %s' % hwnd)
lines.append('前台窗口标题 = %s' % buf.value)

res = []


def cb(h, l):
    if u.IsWindowVisible(h):
        ln = u.GetWindowTextLengthW(h)
        b = ctypes.create_unicode_buffer(ln + 1)
        u.GetWindowTextW(h, b, ln + 1)
        if b.value:
            res.append((h, b.value))
    return True


WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
u.EnumWindows(WNDENUMPROC(cb), 0)

lines.append('')
lines.append('--- 标题含"万花筒"或"玻璃"的可见窗口 ---')
hit = 0
for h, t in res:
    if '万花筒' in t or '玻璃' in t:
        lines.append('%s | %s' % (h, t))
        hit += 1
if hit == 0:
    lines.append('（没有找到）')
lines.append('--- 可见且有标题的窗口总数: %d ---' % len(res))

with open(r'D:\专注力项目\_fg_out.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
