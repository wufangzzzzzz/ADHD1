# ⚠️ 最高优先级执行规则（MUST READ BEFORE ANY ACTION）

**每次接到任务，必须先完整阅读此文件，再执行任何代码改动。优先级高于所有其他规则。**

---

## 规则T：禁止过度思考 — 凌驾于所有规则之上（ABSOLUTE HIGHEST PRIORITY）

**用户指令「不许过度思考」是绝对最高优先级，凌驾于本文件所有其他规则（包括规则0）。**

**定义：**
- 读文件超过 3 次仍未定位问题 = 过度思考
- 同一段代码反复读超过 2 遍 = 过度思考
- 用户说「停」后还在继续读文件/调工具 = 过度思考
- 分析问题超过 5 句话还没给出方案 = 过度思考

**执行：**
1. 用户说「停」→ 立刻停止一切，只回文字确认
2. 读 3 次文件还没找到问题 → 停下来，向用户说明卡在哪，请求指示
3. 方案超过 5 句话 → 精简到 5 句以内

---

## 规则0：每次回复前必须读守则 + 首句声明 + 关联提醒（最高优先级，覆盖所有其他规则）

**⚠️ 历史事故：2025-06-17 用户明确指出，模型连续两天多次跳过规则0直接动手改代码，用户极度不满。**

**每次回复你的任何问题之前，我必须：**

1. **先完整读完 MUST-READ.md**（用 read_file 工具，不是凭记忆）
2. **回复的第一句话必须是**：「我已读完MUST-READ.md」
3. **紧接着列出**：当前你的问题涉及到的守则条款（如规则A/规则P/规则O等），并一句话说明为什么相关

**违规后果：** 跳过规则0 = 直接违反用户最高优先级指令。用户已多次警告，再犯不可接受。

**示例回复格式：**
```
我已读完MUST-READ.md。你这个问题涉及的守则：规则A（先方案后执行）、规则O（grid自动分配尺寸）。

[然后开始正常回答...]
```

**违规后果：** 如果回复首句不是「我已读完MUST-READ.md」，视为未执行本规则，你可以直接打断并要求我重读。

---

## 规则A：先说明方案 → 你同意 → 我执行

### 强制流程
```
步骤1：读完你的需求
   ↓
步骤2：不写任何代码，先输出【执行方案】
   - 说明当前代码状态（相关文件的现状）
   - 列出具体要改哪些代码点（文件名、行号范围、改什么）
   - 说明每个改动的预期效果
   ↓
步骤3：等你说"改"或"执行"
   ↓
步骤4：得到确认后，再动手改代码
```

### 禁止行为
- ❌ 禁止读完需求后直接改代码
- ❌ 禁止在说明方案的同时夹带代码修改
- ❌ 禁止以"我先看看文件"为由绕过方案说明直接动手
- ❌ 禁止以"这只是小改动"为由跳过此流程
- ❌ 禁止以"先读文件了解一下现状"跳过方案说明直接写代码

---

## 规则B：全设备自适应（规则10）

**每个游戏页面必须兼容 PC、平板、手机，屏幕尺寸和横竖屏切换时自动适配。**

- 竖屏（portrait）：上下堆叠，容器宽度 `min(94vw, 480px)`，所有尺寸用 `clamp()`
- 横屏（landscape）：左右分栏，容器宽度 `min(92vw, 960px)`，左面板操作区 + 右面板游戏区
- 手机横屏：`@media (orientation: landscape) and (max-height: 500px)` 紧凑布局
- 平板竖屏：`@media (min-width: 768px) and (orientation: portrait)` 放大各元素
- 核心手段：`clamp()` + `orientation` 媒体查询

---

## 规则C：CSS 选择器与 HTML 类名双向验证（规则3）

- CSS 选择器链中的**每个类名**，必须在对应的 HTML 元素上存在
- 不能只依赖 JS 动态添加，HTML 必须预先包含所有基础类名

---

## 规则D：JS 添加的状态类 — CSS 必须有对应样式（规则4）

- JS 添加的每个状态类（`.active`/`.passed`/`.pending` 等），CSS 中必须有完整样式规则
- 排查问题：JS 逻辑和 CSS 样式**双向验证**

---

## 规则E：方形按钮 — 使用 aspect-ratio（规则5）

正方形元素必须同时约束宽高：`aspect-ratio: 1` 是最简洁方案，禁止只用 `min-height`。

---

## 规则F：禁用「中途换档」自适应逻辑（规则11 — CRITICAL）

- **题库必须与当前难度一一绑定**。`state.questions` 生成完毕后，中途不得更改 `state.subLevel`
- 需要「自适应难度」的功能，**必须重新生成新题库**，不能只改 subLevel 不刷新 questions
- 「禁用」某个功能 = **删除所有调用点 + 删除函数体**，不只加注释

---

## 规则G：禁用状态 opacity — 必须检查 CSS 伪类（规则12）

- 设置按钮 `disabled` 后，**必须检查** `:disabled` 伪类的 CSS 是否改变了视觉样式（尤其是 `opacity`）
- 答题反馈阶段的按钮变色，必须在 `:disabled` 状态下也能正常显示
- 排查问题优先**双向验证**：既查 JS 逻辑，也查关联 CSS 伪类状态

---

## 规则H：按钮变色 — 必须用 style.cssText（规则13 — CRITICAL）

```js
// ✅ 正确：style.cssText 强制覆盖，不干扰原有 className
btn.style.cssText = 'background: #00C853 !important; border: 3px solid #fff !important; box-shadow: 0 0 25px rgba(0,200,83,0.7) !important;';

// ❌ 错误：className 全量覆盖，丢掉原有背景类
btn.className = 'category-btn btn-correct';
```

- 任何按钮/卡片的**临时颜色反馈**（正确绿/错误红），**必须**使用 `style.cssText` 直接设置
- 反馈结束后，通过**重建 DOM**（`innerHTML = ''`）恢复原始类名
- 同一 DOM 元素同时需要「状态样式 + 原始样式」时，优先用内联样式覆盖

---

## 规则I：分类互斥（规则8）

同题选项必须互斥，不能出现包含关系（如"水果"⊂"食物"）。配置分类组合前必须检查设计文档中的铁律。

---

## 规则J：JS 语法验证 — 修改后必须检查（规则1）

每次修改 JS 后必须用 `node --check` 验证语法完整性。

---

## 规则K：静态资源路径验证（规则2）

每次新增静态资源后，必须用 `curl -o /dev/null -w '%{http_code}' http://localhost:5000/{path}` 验证可访问性。

---

## 规则L：部署后缓存刷新（规则9）

每次交付前在 URL 添加版本参数 `?v=N`，并告知用户进行硬刷新（Ctrl+F5）。

---

## 规则P：禁止过量分析 — 读文件前先明确目标，读完立刻动手（CRITICAL）

**规则来源：** audio-repeat 排版对齐任务，实际只改 5 个 CSS 属性，却读了两个文件各七八次、累计数百行，浪费的算量足够重写游戏 100 次。

**事故根因：** 没有先想清楚"到底要改什么"，而是反复读文件去"找差异"，读一次不够再读一次，陷入无效循环。

**铁律（每次读文件前必须自问）：**
```
❌ 禁止：打开文件 → 读一段 → 不确定要不要改 → 再读一段 → 再读另一文件对比 → 循环
✅ 正确：先列清单（改哪几个属性/哪几行）→ 一次性读目标区域 → 一次性改完 → 验证
```

**具体约束：**
1. **对齐两个文件样式时**：先列出具体属性清单（如 `aspect-ratio: 1→1.2`），再读目标行，改完即止。禁止逐段对比。
2. **同一文件同一区域最多读 2 次**：第一次了解现状，第二次确认修改结果。禁止第三次。
3. **每次 `read_file` 前必须明确**：我要找什么？读完立刻有结论（改/不改/改什么）。
4. **禁止"我先看看"式阅读**：没有明确目标的文件读取一律禁止。

## 此文件为最高权限植入。每次改动代码前必须重新读取此文件。

---

## 规则M：容器宽度必须匹配子面板总宽 — 防止"幽灵空白区"

**规则来源：** AGENTS.md 规则15

**事故复现：** G3 声波搜索横屏下，container（有圆角+阴影）max-width 1100px，但左右面板总和仅 670px → 容器右侧 430px 空白区以可见的圆角方块呈现。

**铁律：**
1. 使用 `border-radius` + `box-shadow` 等可见样式的容器，max-width 必须紧贴子元素总宽，不得大幅超出。
2. 横屏分栏布局中，左面板宽度 + 右面板宽度的总和，应直接作为容器的 max-width（或略加 ≤ 30px 余量）。

---

## 规则N：改动游戏前，必须先执行「三读一确认」

**规则来源：** G5 数字大侦探反复修改十几轮的教训

**事故：** 多次跳过参考文档直接改代码，导致难度配置、交互逻辑与设计文档不一致，用户反复反馈后才发现参考文档早有明确规定。

**铁律（改动任一 G1-G7 游戏前必须执行）：**
```
1️⃣ 读参考文档 → 打开 /workspace/projects/assets/听知觉训练游戏_AI开发设计文档 (4).md，
   找到对应游戏的完整章节（难度表格+素材+交互逻辑），逐行读完
2️⃣ 读当前代码 → 打开对应游戏的 HTML 文件，确认当前实现
3️⃣ 对照检查 → 列出所有"代码与文档不一致"的差异点
4️⃣ 确认后动手 → 差异列给你，等你说"改"才改代码
```

**违规后果：** 跳过任一步骤直接改代码，后面出 bug 不管修多少轮都不算完成任务。

---

## 规则O：听觉游戏按键布局标准 — 让 grid 自动分配尺寸（CRITICAL）

**规则来源：** G5 数字大侦探寻死几十轮的终极教训

**事故：** 在超过 30 轮循环修改中，每次都用 `vh` / `clamp` / `max-width` 等固定值控制 numpad 按键尺寸，每次都被打回"太小/太大/溢出/重叠"。根因是所有方案都在"设死尺寸"，而非让 CSS Grid 自行分配。

**铁律（所有听觉游戏的 grid/网格/按键布局必须遵守）：**

### 布局公式
```css
/* 父容器 grid — 行均分可用高度 */
.container-grid {
    grid-template-rows: repeat(N, 1fr);  /* N=行数 */
}

/* 子按键 — 填满格子，保持方形 */
.grid-btn {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    /* 不设固定 width/height，不设 justify-self/align-self 覆盖 */
}
```

### 禁止行为
- ❌ 禁止 `width: clamp(...)` / `height: clamp(...)` 固定按键尺寸
- ❌ 禁止 `max-width: Npx` / `max-height: Npx` 限制最大尺寸
- ❌ 禁止 `justify-self: center` / `align-self: center` 阻止填充
- ❌ 禁止任何 `vh` / `vw` 作为按键尺寸依据
- ❌ 禁止 `margin: auto` 在 grid 元素上（会导致宽度坍塌，见规则17）

### 正确做法
- ✅ 用 `grid-template-rows: repeat(N, 1fr)` 让行平分可用高度
- ✅ 按键用 `width: 100%; height: 100%; aspect-ratio: 1` 填满格子
- ✅ 容器用 `overflow: hidden` 替代滚动条
- ✅ JS 重置按键类名时必须保留特殊状态类（如 `num-zero`）

## 常见陷阱（每次修改前务必对照检查）

### 陷阱1：className 全量覆盖丢失类
**场景**：每次新题目重置按键状态时 `btn.className = 'num-btn'`，删掉了 0 键的 `num-zero` 类

**后果**：`grid-column: 2` 失效，0 键被 grid auto-placement 排到第 1 列

**正确做法**：重置时保留特殊类
```js
btn.className = 'num-btn' + (btn.dataset.num === '0' ? ' num-zero' : '');
```
- ✅ 弹性元素用 `flex: 1 1 auto; min-height: 0` 允许压缩

### 参考实现（G5 最终正确方案）
```css
.land-right .numpad {
    width: 100%; gap: 6px; padding: 2px;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
}
.land-right .num-btn {
    font-size: clamp(18px,3.5vh,40px);
    width: 100%; height: 100%; aspect-ratio: 1;
}
```

**效果：** 视口大→行高自动变大→按键变大。视口小→等比例缩小。全程无溢出、无重叠、无滚动条、不需任何手动调整。

---

## 规则Q：Python 脚本 `os.makedirs` 必须放在正确分支内 — 禁止在 `.png` 路径上创建目录（CRITICAL）

**规则来源：** geometric-pattern-generator 生成脚本反复报错 `FileExistsError: [Errno 17] File exists`

**事故：** `generate.py` 中 `os.makedirs(args.out, exist_ok=True)` 写在 `if args.all:` 之前，当 `--style suprematism --out /path/to/xxx.png` 时，`args.out` 是 `.png` 文件路径，`os.makedirs` 把它当目录创建，导致后续 `img.save(args.out)` 报错"同名目录已存在"。

**根因：** `os.makedirs` 的执行位置在分支判断之前，对所有模式（`--all` 和 `--style`）都生效。

**铁律：**
1. `os.makedirs(out_path)` **必须**放在需要输出到目录的分支内（如 `if args.all:`），**禁止**放在全局作用域或分支判断之前。
2. 如果 `--out` 可能是文件路径（如 `--style` 模式），**绝对不能**对其执行 `os.makedirs`。应该对 `os.path.dirname(args.out)` 执行。
3. 任何 Python 脚本写文件前，先确认 `out` 是文件还是目录，再决定是否 `makedirs`。

**正确写法：**
```python
# ✅ 正确：目录输出模式
if args.all:
    os.makedirs(args.out, exist_ok=True)
    for style in STYLES:
        img.save(os.path.join(args.out, f"{style}.png"))

# ✅ 正确：单文件输出模式
else:
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    img.save(args.out)
```

**禁止写法：**
```python
# ❌ 错误：makedirs 在分支外，对 .png 路径执行
os.makedirs(args.out, exist_ok=True)  # args.out 可能是 "xxx.png"！
if args.all:
    ...
```

---

## 规则R：禁止任何按钮在交互过程中移动位置（CRITICAL）

**规则来源：** gestalt-completion.html 刷新按钮改造，`buildDiffBtns()` 动态重建 diff-row 导致难度按钮位置跳动。

**事故：** 点击「开始挑战」后 `buildDiffBtns()` 重新渲染 diff-row，难度按钮从居中位置跳到左侧，刷新按钮出现在右侧，布局闪烁。

**根因：** 用 JS 动态 `innerHTML` 重建按钮行，而非在 HTML 中静态定义所有按钮。

**铁律：**
1. **所有按钮必须在 HTML 中静态定义**，禁止用 JS `innerHTML` 动态重建按钮行
2. 按钮状态切换只能用 `className` 变化（加/删 `active`），不能用 `innerHTML = ''` 重建
3. 按钮位置（flex/grid 布局中的顺序）在页面生命周期内**永远不变**
4. 隐藏按钮用 `visibility: hidden`（保留占位），不用 `display: none`（会改变布局）
5. 任何交互（开始游戏/结束游戏/切换难度/切换模式）都**不能**改变按钮的 DOM 位置

---

## 规则S：用户喊停必须立刻停止所有操作（CRITICAL）

**规则来源：** 用户多次喊"停"/"停止"/"过度思考"，但模型仍继续读文件、改代码。

**事故：** 用户说"停"后，模型继续调用 read_file/grep_file 等工具，用户需要重复三次才停下。

**铁律：**
1. 用户说「停」「停止」「够了」「别改了」等明确停止指令时，**立刻停止所有工具调用**
2. 停止后只回复文字确认，**禁止**再调用任何工具（包括 read_file、grep_file、edit_file、write_file 等）
3. 等用户给出下一步明确指令后，再恢复操作
4. 用户说「你又过度思考了」= 停止信号，立刻收手，不要继续分析