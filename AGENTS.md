# AGENTS.md - 项目规范文件

## 项目概述
本项目包含视知觉训练游戏和听知觉训练游戏，用于读写障碍和ADHD训练。

## 游戏文件

### 视觉训练（视知觉）
- `number-focus.html` - 数字专注力游戏
- `visual-predict.html` - 视觉预测游戏
- `sequence-connection.html` - 顺序连线游戏
- `cancellation-train.html` - 划消训练游戏
- `schulte-grid.html` - 舒尔特方格游戏
- `flash-sequence.html` - 数字闪光（视觉序列记忆）
- `color-match.html` - 彩色连线游戏
- `color-sort.html` - 色彩归纳游戏
- `gestalt-completion.html` - 图形完形匹配（三模式：碎片拼图/藏图找找看/缺角补全）
- `corsi-matrix.html` - 空间记忆矩阵（Corsi 方块敲击，9方块序列复现）
- `visual-nback.html` - 视觉N-back（3×3网格，自适应N级工作记忆更新）
- `dual-nback.html` - Dual N-back（视听双通道工作记忆，同时追踪位置+字母）
- `mot-tracker.html` - 多目标追踪（MOT范式，N球标记K目标追踪识别）

### 听觉训练（听知觉）
- `audio-repeat.html` - 复读机训练
- `listen-move-land.html` - 听动乐园（三模式：动物模仿秀/颜色指令官/动物指令串）
- `audio-vigilance.html` - 长时听觉监控（持续听词5-8分钟，目标词侦测）
- `G1-listen-act.html` - 听词行动（听觉分类）
- `G2-echo.html` - 数字回音壁（正听反说）
- `G3-sonic-search.html` - 声波搜索（计数版+提取版）
- `G4-code-decoder.html` - 指令解码器（听觉译码）
- `G5-number-detective.html` - 数字大侦探（找漏洞）
- `G6-logic-sort.html` - 逻辑排序站（听词点击排序，12题库10轮循环）
- `G7-story-detective.html` - 故事小侦探（听故事答题，30个初级·简单故事，3种子难度）

### 行为训练
- `B1-redgreen.html` - 红灯绿灯（Go/No-Go 反应抑制训练）
- `B2-reverse.html` - 西蒙说（Simon Says 冲动控制+听觉加工）
- `B3-ruleswitch.html` - 规则跳跳（认知灵活性/任务切换）
- `B4-stroop.html` - 冲突色（Stroop 效应抑制控制）
- `B5-light-task.html` - 灯语任务（颜色+形状双属性匹配切换，认知灵活性训练）
- `B6-bilateral-coord.html` - 双手协调（跨脑半球协作，纯计时模式）

---

## 核心规则（此文档记录历史重大事故及解决方案，必须遵守）

### 规则1：JS 语法验证 — 修改后必须检查
**事故**：对 G1 做大规模改造时，某次编辑破坏了 JS 语法（line 193），导致整个 `<script>` 不执行，页面卡在 HTML 骨架状态，看起来像"老版本"。
**解决**：
```bash
# 提取 script 内容验证
node --check /tmp/script.js
```
**铁律**：每次修改 JS 后必须用 `node --check` 验证语法完整性。

### 规则2：静态资源路径 — 必须对齐 HTTP 文档根目录
**事故**：分类插画图片实际存储于 `public/images/categories/`，但 CSS 引用路径为 `/images/categories/`，导致 404 图片缺失。
**解决**：将图片复制到 HTTP 服务器文档根目录下的正确路径，或修正 CSS URL 路径。默认 HTTP 服务器从 `/workspace/projects/` 启动（文档根目录），文件路径据此计算。
**铁律**：每次新增静态资源后，必须用 `curl -o /dev/null -w '%{http_code}' http://localhost:5000/{path}` 验证可访问性。

### 规则3：CSS 选择器与 HTML 类名 — 双向验证
**事故**：左侧菜单按钮 CSS 定义 `.level-btn.primary { background: ... }`，但 HTML 元素只有 `class="level-btn"` 缺少 `primary` 类，导致颜色样式从不生效。
**解决**：同时给 HTML 加上颜色类 `class="level-btn primary"`。
**铁律**：CSS 选择器链中的每个类名，必须在对应的 HTML 元素上存在，不能只依赖 JS 动态添加。

### 规则4：交互状态类 — CSS 必须有对应样式
**事故**：子难度（简单/中等/困难）点击后 JS 添加 `.easy/.medium/.hard` 类，但 CSS 没有对应规则，点击无视觉反馈。
**解决**：改为添加标准的 `.active`/`.passed`/`.pending` 类，并在 CSS 中定义完整样式。
**铁律**：JS 添加的每个状态类必须在 CSS 中有对应样式规则。优先使用 `.active`、`.disabled` 等语义化类名。

### 规则5：方形按钮 — 使用 aspect-ratio
**事故**：分类按钮只有 `min-height: 90px`，在网格布局中被拉伸成长方形而非正方形。
**解决**：添加 `aspect-ratio: 1` 强制等宽等高。
**铁律**：正方形元素必须同时约束宽高，`aspect-ratio: 1` 是最简洁方案。

### 规则6：多字词语音 — 必须生成整词音频
**事故**："梅花鹿"在音频地图中只有"梅花"(a132.mp3)和"鹿"(a229.mp3)两个片段，朗读时中间有明显停顿，听起来像"梅花……鹿"。
**解决**：为"梅花鹿"生成完整词音频 a309.mp3 并加入音频地图。
**铁律**：如果多字词在音频地图中有部分匹配片段且会被分拆播放，必须生成整词音频确保连贯。

### 规则7：语音一致性 — 所有词必须用同一套预录音频
**事故**：词库更新新增57个词，这些词没有预录音频，浏览器 TTS 与原有预录音频交替播放，声音忽好忽坏。
**解决**：用音频技能的 TTS 为所有缺失词生成统一女声音频（zh_female_xiaohe_uranus_bigtts），更新 audio_map.json。
**铁律**：更新词库时必须同步检查所有词是否有预录音频，确保声音品质一致，绝对避免 TTS 和预录音频交替出现。

### 规则8：分类互斥 — 严格遵守设计文档铁律
**事故**：中级/简单设置成「水果+蔬菜+食物」同题，违反设计文档铁律——水果和蔬菜是食物的子类，三者互斥。
**解决**：重新设置为互斥分类组合（如"蔬菜+动物+职业"）。
**铁律**：配置分类组合前必须完整阅读设计文档中的所有铁律/规则。同题选项必须互斥，不能出现包含关系（如"水果"⊂"食物"）。

### 规则9：浏览器缓存 — 部署后必须强制刷新
**事故**：多次修改后用户浏览器仍显示旧版本，误认为修改未生效。
**解决**：在 URL 添加版本参数 `?v=N` 绕过缓存，或告知用户 Ctrl+F5 强制刷新。
**铁律**：每次交付前在 URL 添加版本参数，并告知用户进行硬刷新。

### 规则10：全设备自适应 — PC/平板/手机 + 横竖屏切换（MUST READ）
**要求**：每个游戏页面必须兼容 PC、平板、手机三种设备，屏幕尺寸和横竖屏切换时自动适配。
**注意**：此规则仅适用于**视觉训练（视知觉）**游戏。**听觉训练（听知觉）游戏改为全横屏独占，参见规则16。**
**实现方案**：
- **竖屏（portrait）**：上下堆叠布局，容器宽度用 `min(94vw, 480px)`，所有关键元素使用 `clamp()` 实现平滑缩放
- **横屏（landscape）**：左右分栏布局，容器宽度用 `min(92vw, 960px)`，左面板操作区 + 右面板游戏区
- **手机横屏**：额外适配（`@media (orientation: landscape) and (max-height: 500px)`），紧凑布局，隐藏非必要信息
- **平板竖屏**：`@media (min-width: 768px) and (orientation: portrait)`，大幅放大各元素尺寸
- **核心手段**：`clamp(min, preferred, max)` 控制所有尺寸，`orientation` 媒体查询切换横竖屏布局
**铁律**：每次开发新游戏或改造现有游戏前，**必须**先阅读本条规则（规则10），确认是视觉游戏还是听觉游戏，再决定横竖屏策略。

### 规则11：禁用「中途换档」类自适应逻辑（CRITICAL）
**事故**：G1 听词行动中 `checkAdaptation()` 在玩家答对5题后将 `state.subLevel++`，但题库（questions 数组）已在开局时用旧 subLevel 生成完毕。升档后：
- 按钮选项使用新 subLevel 的 categories（如 食物/文具/家具 → 水果/文具/家用电器/职业）
- 但后续题目的 `q.category` 依然是旧 subLevel 的值（如 家具、食物）
- 正确的类别不在按钮中 → **用户永远选不对**，即使词汇本身来自原类别
- 还会出现 "狮子"（动物）配上 "食物/文具/家具" 选项的诡异情况

**根因**：注释写着「已禁用，改为手动选择」，但 `handleCorrectAnswer` 和 `handleWrongAnswer` **仍然在调用** `checkAdaptation()`（真禁用 = 删除调用，不只是加注释）。

**铁律**：
1. **题库必须与当前难度一一绑定**。一旦 `state.questions` 生成完毕，中途不得更改 `state.subLevel`。
2. 需要「自适应难度」的功能，**必须重新生成新题库**（新 `generateQuestions` 调用），不能只改 subLevel 不刷新 questions。
3. 「禁用」某个功能 = 删除所有调用点 + 删除函数体（或整段删除），**不要只加注释说"已禁用"**。

### 规则12：禁用状态 opacity — 答题反馈时必须检查 CSS 伪类

**事故**：G1 听词行动中，答对/答错后 `setButtonsEnabled(false)` 禁用所有按钮，CSS 有 `.category-btn:disabled { opacity: 0.4 }`，导致：
- 选中的按钮即使加了 `cat-correct`（绿）或 `cat-wrong`（红），也被 `opacity: 0.4` 压住变浅
- 用户看到"所有按钮都变浅了"，而非"选中按钮变色，其他不变"
- 反复修改 JS 但从未检查 `:disabled` 伪类的 CSS

**根因**：只改了 JS 行为（去掉 `style.opacity = '0.3'`），没检查 CSS 中 `:disabled` 伪类也有 `opacity`。

**解决**：覆盖 disabled 状态的 opacity：
```css
.category-btn:disabled { opacity: 1; }
```

**铁律**：
1. 设置按钮 `disabled` 后，**必须检查** `:disabled` 伪类的 CSS 是否改变了视觉样式（尤其是 `opacity`）。
2. 答题反馈阶段的按钮变色，必须在 `:disabled` 状态下也能正常显示。
3. 排查问题优先**双向验证**：既查 JS 逻辑，也查关联 CSS 伪类状态。

### 规则13：按钮变色 — 必须用 style.cssText，禁止用 className 替换（CRITICAL）
**事故**：试图用 `btn.className = 'category-btn btn-correct'` 实现按钮变绿/变红，但这会丢失 `bg-fruits` 等原有背景类。后续用 `restoreAllCategoryButtons()` 恢复时映射出错，导致从第二题起分类按钮全部无色。

**根因**：className 替换是「全量覆盖」，不可能只加一个类而不丢其他类。CSS 类名映射越复杂越容易出错（dataset → restoreMap → className）。

**解决**：用 `style.cssText` 直接设置内联样式（带 `!important`），不做任何 className 操作：

```js
// ✅ 正确：style.cssText 强制覆盖，不干扰原有 className
btn.style.cssText = 'background: #00C853 !important; border: 3px solid #fff !important; box-shadow: 0 0 25px rgba(0,200,83,0.7) !important;';

// ❌ 错误：className 全量覆盖，丢掉原有背景类
btn.className = 'category-btn btn-correct';
```

**铁律**：
1. 任何按钮/卡片的**临时颜色反馈**（正确绿/错误红），**必须**使用 `style.cssText` 直接设置，禁止 `className` 替换。
2. 反馈结束后，通过**重建 DOM**（`innerHTML = ''` 后重新添加）恢复原始类名，不要试图用 JS 反向映射恢复。
3. 同一 DOM 元素同时需要「状态样式 + 原始样式」时，优先用内联样式覆盖，CSS 类只负责原始样式。</think>

<｜DSML｜tool_calls>
<｜DSML｜invoke name="done">
<｜DSML｜parameter name="commit_msg" string="true">fix(G1): 分类按钮变色改用 style.cssText，移除 fade-out 动画和 restoreAllCategoryButtons

彻底回退之前 16 次失败的增量修正方案，改用最简直连方案：
1. handleCorrectAnswer/handleWrongAnswer 直接用 style.cssText 设置绿/红色（!important 强制覆盖）
2. 完全移除 restoreAllCategoryButtons() 函数和 categoriesRendered 状态标记
3. 移除 fade-out CSS 动画和 setTimeout 包装，renderCategories 直接执行 DOM 重建
4. 答对/答错后，renderCategories 重建网格恢复按钮原始背景色（无动画，瞬间完成）
5. 答错时 wordDisplay 显示错误词语文字
6. AGENTS.md 新增规则13（按钮变色必须用 style.cssText）
**事故**：G1 听词行动中，答对/答错后 `setButtonsEnabled(false)` 禁用所有按钮，CSS 有 `.category-btn:disabled { opacity: 0.4 }`，导致：
- 选中的按钮即使加了 `cat-correct`（绿）或 `cat-wrong`（红），也被 `opacity: 0.4` 压住变浅
- 用户看到"所有按钮都变浅了"，而非"选中按钮变色，其他不变"
- 反复修改 JS 但从未检查 `:disabled` 伪类的 CSS

**根因**：只改了 JS 行为（去掉 `style.opacity = '0.3'`），没检查 CSS 中 `:disabled` 伪类也有 `opacity`。

**解决**：覆盖 disabled 状态的 opacity：
```css
.category-btn:disabled { opacity: 1; }
```

**铁律**：
1. 设置按钮 `disabled` 后，**必须检查** `:disabled` 伪类的 CSS 是否改变了视觉样式（尤其是 `opacity`）。
2. 答题反馈阶段的按钮变色，必须在 `:disabled` 状态下也能正常显示。
3. 排查问题优先**双向验证**：既查 JS 逻辑，也查关联 CSS 伪类状态。

### 规则14：最高优先级 — 先说明方案，等你同意，再执行（MUST READ BEFORE ANY ACTION）
**事故**：连续多次修改时跳过方案说明直接改代码，导致方向性错误反复出现（如改分类数量而非固定容器尺寸、同时改了不该改的左侧面板）。
**根因**：系统执行策略中"高效并行开发"的习惯淹没了"先说明后执行"这条规则，缺失强制触发的物理锚点。
**解决**：在项目根目录创建 `MUST-READ.md`，作为读取即触发的最高优先级规则清单。
**铁律**：
1. 每次接到任务，**必须先读取 `/workspace/projects/MUST-READ.md`**，再执行任何代码改动。
2. 必须先输出【执行方案】（具体改动点+预期效果），等用户说"改"/"执行"后，才能改代码。
3. 此规则优先级高于所有其他开发规范和流程。

### 规则15：容器宽度必须匹配子面板总宽 — 防止"幽灵空白区"
**事故**：G3 声波搜索横屏模式下，container 的 `max-width: 1100px`，但左右面板固定宽度仅 670px（左360px + 右310px），容器剩余 430px 空白区。由于 container 有 `border-radius: 20px` 和 `box-shadow`，空白区显示为一个巨大的空方块，用户误以为是另一个面板。
**根因**：容器设置了可见样式（圆角+阴影），但宽度远超子元素总和却没处理多余空间。
**解决**：将 container 的 max-width 从 1100px 收窄到 700px，紧贴子面板总宽。
**铁律**：
1. 使用 `border-radius` + `box-shadow` 等可见样式的容器，其宽度（max-width）必须紧贴子元素总宽，不得大幅超出。
2. 横屏分栏布局中，左面板固定宽度 + 右面板固定宽度的总合，应直接作为容器的 max-width（或略加余量 ≤ 30px）。

### 规则16：听觉游戏 — 全横屏独占，无竖屏布局（CRITICAL）
**要求**：所有听觉训练游戏（听知觉）**只支持横屏显示**，无论是电脑、平板还是手机，全部横屏布局。竖屏显示时也直接使用横屏布局（左右分栏），不加遮罩提示。
**禁止**：竖屏布局、竖屏自适应、orientation切换、竖屏遮罩提示等任何竖屏相关逻辑。
**实现方案**：
1. `@media (orientation: landscape)` 中的 CSS **不放在 media query 内**，直接作为默认样式全局生效
2. 删除所有竖屏专用的 CSS 规则（`.container` 竖屏尺寸、竖屏 `.numpad` `max-width` 限制等）
3. 横屏布局作为唯一布局，竖屏时直接复用同一套 CSS
**铁律**：每次开发新听觉游戏或改造已有听觉游戏，**必须**先实施横屏独占遮罩，再开发游戏功能。

### 规则17：_tokenize() 禁止丢弃未匹配字符 — 必须积累为 TTS 文本段
**事故**：G7 故事朗读时，`_tokenize()` 碰到不在 `audio_map.json` 的字直接 `i++` 跳过（不添加 token），导致故事中大量连接性文字被静默吞掉。272 字的故事只读出了 17 个有预录音频的词（如"小公鸡清早起来""池塘边"），用户听到的是一堆断片，无法答题。
**根因**：原 tokenize 逻辑 `if (matched) continue; i++;` — 未匹配字符仅做索引推进，既不输出 token 也不用 TTS。
**解决**：改为积累未匹配字符到 `ttsBuffer`，遇到匹配项或循环结束时 flush 为文本段。`_playAudioSequence` 支持混合播放（预录音频 + SpeechSynthesis）。
**铁律**：
1. `_tokenize()` **必须保证输入文本的每个字符都在输出 segments 中**。可拆分但不能丢失。
2. 未匹配 audio_map 的文字必须积累为连续文本段，通过 SpeechSynthesis 朗读。
3. 修改 tokenizer 后必须用模拟测试验证：总字符数 = 输入字符数。

### 规则18：严禁添加设计文档外的故事/分类/内容（CRITICAL）
**事故**：easy_simple 数组里自行添加了"小鸭学游泳"和"小猫穿鞋子"两个设计文档不存在的故事，还加了随机打乱逻辑。
**根因**：认为"多给几个故事让用户玩更丰富"，但设计文档严格要求固定内容。
**铁律**：
1. 故事库的内容**严格限定在设计文档指定的范围内**。设计文档没有的故事，一行代码都不能加。
2. 没有素材的难度等级，STORY_DB 中留空数组 `[]`，禁止自创填充。
3. 用户没要求的随机/打乱/排列组合逻辑，一律禁止添加。
**事故**：G5 数字大侦探的 numpad 用了 `grid-template-columns: repeat(3, 1fr)` + `@media (min-width:600px) { .numpad { margin: 0 auto; } }`，导致 grid 宽度坍塌到 min-content（每个按键只有 80×80px，而不是预期的 176×176px），耗时 2 小时排查。

**根因**：`margin: auto` 在 block-level grid 上**会使 grid 的可用宽度坍塌到 min-content**（内容的最小宽度），而非填充父容器。更具体的选择器（`.land-right .numpad`）只覆盖了 `gap` 和 `padding`，没有显式设置 `width`，所以 `margin: auto` 的宽度坍塌效果一直生效。

**教训**：布局最隐蔽的错误往往是**未显式覆盖的属性**。即使高优先级规则覆盖了大部分属性，**一个漏掉的属性**（如 `margin: auto`）仍可破坏整个布局。

**解决**：`margin: auto` 的 grid 元素必须同时设置 `width: 100%` 或 `max-width: 100%`，否则宽度坍塌。

**铁律（MUST READ BEFORE ANY LAYOUT CHANGE）**：
1. **任何对 grid/flex 元素的操作，必须检查所有继承的 CSS 属性**，不能只看当前规则覆盖了哪些。
2. **`margin: auto` + grid `1fr` 是危险组合**。只要 grid 元素用 `margin: auto` 居中且没有显式 `width`，就必须加上 `width: 100%` 避免坍塌。
3. **修改后必须在真实浏览器中验证**，不能只看代码逻辑。用 `getBoundingClientRect()` 或 DevTools 检查实际渲染尺寸。
4. **双向验证**：检查 JS 逻辑的同时，也必须检查 CSS 中所有相关属性（包括 media query 中的规则），**一个被忽略的 media query 规则可以毁掉整个布局**。

### 规则19：中文数字必须用 EXT 数组生成干扰项 — 防边界值重复与越界
**事故**：`十个` 的正偏移量(11,12,13)全被钳位到 `CN_NUMS[11]='十'`，候选池中出现了多个 `十个`（与正确答案重复）；同时 `nv>=12` 时 `CN_NUMS[12]` 越界产生 `undefined`。
**解决**：
1. 使用 `CN_NUMS_EXT` 数组（`零`~`二十`），长度21，覆盖所有偏移值
2. 偏移范围从 `[-3,-2,-1,1,2,3]` 扩展到 `[-5,-4,-3,-2,-1,1,2,3,4,5]`
3. 候选池强制过滤 `txt !== correct`，防止正确答案混入干扰项
4. 用 `nv<0 || nv>=EXT.length` 前置判断跳过越界值
**铁律**：
1. 中文数字干扰项生成必须用 EXT 扩展数组（至少到 二十），禁止用原 `CN_NUMS`（仅到十）。
2. 候选池**必须** `txt !== correct` 过滤，防止正确答案混入。
3. 偏移范围必须在 `-5~+5`，确保边界值（如一、十）有足够候选。

### 规则20：taste-skill 为强制设计规范（CRITICAL）
所有新游戏和现有游戏的 UI 改造必须遵守 taste-skill 设计原则（取自 Leonxlnx/taste-skill）：
- **单色系规则**：全页最多 1 个强调色，锁定使用
- **无纯黑纯白**：禁止 #000000/#FFFFFF，用 #1a1a2e/#FEFEFE
- **等宽字体**：数字/计时器使用 JetBrains Mono 或等宽字体
- **Staggered 入场**：网格元素用 animation-delay: calc(--i * 60~80ms)
- **按钮反馈**：active 时 scale(0.95~0.98)
- **100dvh 布局**：禁止 h-screen，用 min-h-[100dvh]
- **减少动效**：所有动画必须通过 prefers-reduced-motion 折叠
- **无结果弹窗**：结果直接展示在页面内，不弹 modal
- **所有板块默认可见**：不隐藏任何 UI 区域

### 规则21：所有信息板块必须默认显示（CRITICAL）
游戏的所有 UI 区域（状态栏、数字网格、答案展示区、操作栏、底部状态）必须始终存在并可见。禁止：
- 点击按钮后才显示某个区域
- 使用 modal/overlay 展示结果
- 动态调整版面尺寸（版面必须稳定不跳动）

### 规则22：听觉游戏禁止字频计数题（CRITICAL）
**事故**：G7 故事小侦探每篇故事的最后一题都是「数"X"字出现几次」（字频统计），这是视觉任务非听觉任务，且设计文档不允许。
**根因**：字频计数属于视觉扫描，不符合听觉训练「听理解+信息提取」的定位。
**铁律**：
1. 听觉训练游戏的题目，**必须**基于「听懂故事内容」才能回答。无关的内容查询（如数某字出现次数）一律禁止。
2. 替换计数题时，从故事正文中提取新理解题，确保能从故事文本中找到答案。
3. 每题答案必须客观唯一，不得出现「示例：合理即可」等模糊答案（无法自动判题）。

### 规则21：选项必须随机排序（CRITICAL）
**事故**：`genOptions` 返回 `[correct, ...distractors]`，`showQuestion` 按返回顺序渲染按钮，正确答案始终是第一个选项，用户盲点第一就答对。
**根因**：genOptions 按「正确答案+干扰项」顺序返回，showQuestion 未做洗牌。
**解决**：
```javascript
const opts = genOptions(s, state.qIdx);
for(let i=opts.length-1;i>0;i--){
  const j = Math.floor(Math.random()*(i+1));
  [opts[i], opts[j]] = [opts[j], opts[i]];
}
```
**铁律**：每次 `showQuestion` 渲染选项前，**必须** shuffle 整个 opts 数组。`checkAnswer` 按值比较（`opts[idx] === correct`），不依赖索引。

### 规则22：「再玩一次」必须直接重新开始（CRITICAL）
**事故**：`btnRestart.onclick` 尝试导航回等级列表，逻辑复杂且容易失效。
**铁律**：「再玩一次」按钮的 onclick 直接调用 `startStory(state.current)`，跳过中间页面，直接重新进入该故事的完整流程。

### 规则23：游戏进行中切换难度/模式 — 必须先 stopGame 再 startGame（CRITICAL）
**事故**：Dual N-back 游戏进行中点击左侧难度按钮（初级/中级/高级），只改了 `state.level` 变量，但 `startGame()` 有 `if(state.running) return;` 守卫，导致难度切换无效。同样问题在图形完形匹配中也出现过（setDiff 调 resetGame 而非 startGame）。

**根因**：所有游戏的 `startGame()` 都有 running 守卫防止重复启动。难度/模式切换按钮如果只改 state 变量而不先停掉当前游戏，`startGame()` 会被守卫拦截，画面不刷新。

**解决**：
```javascript
// ✅ 正确：先停再启
document.querySelector('.left-panel').addEventListener('click', e => {
  if(!e.target.classList.contains('diff-btn')) return;
  // ... 更新 active 样式和 state.level ...
  if(state.running) stopGame();
  startGame();
});

// ❌ 错误：只改 state，startGame 被 running 守卫拦截
state.level = e.target.dataset.level;
```

**铁律**：
1. 所有游戏的难度/模式切换按钮，**必须**先调用 `stopGame()`（或等效的清理函数），再调用 `startGame()`。
2. 禁止只修改 `state.level` / `state.mode` 等变量后依赖其他机制触发重启。
3. 新增游戏时，难度/模式按钮的 onclick 模板统一为：`if(running) stop(); start();`。

## G7 故事小侦探 架构

### 数据流
1. `story-db.json`（30个故事）通过 `fetch('/public/story-db.json')` 运行时加载
2. 音频文件通过 `fetch('/public/audio/story_XX.mp3')` 加载并解码
3. 无答题/选项逻辑 — 音频播完后直接展示「问题 + 正确答案」回顾列表

### story-db.json 格式
```json
{
  "week": 1,
  "title": "故事标题",
  "text": "故事正文...",
  "questions": ["问题1", "问题2", ...],
  "answers": ["答案1", "答案2", ...]
}
```

### 子难度划分
| 难度 | 周数范围 | 故事数 |
|------|---------|-------|
| 简单 | 1-10周 | 10个 |
| 中等 | 11-16周 | 6个 |
| 困难 | 17-30周 | 14个 |

### 页面流程
sub-level选择 → 故事卡片网格 → 音频播放(暂停/进度条) → 查看答案(问题+正确答案回顾列表) → 再听一次/返回选故事

## 音频系统结构

```
/public/audio/
├── audio_map.json          # 词 → 音频文件映射（310+条目）
├── a000.mp3 ~ a309.mp3     # 预录制音频文件
└── ...
```

- 音频地图使用 `audio_map.json` 管理，key=词/字，value=相对路径
- 所有音频由 TTS 生成，统一使用 `zh_female_xiaohe_uranus_bigtts` 女声
- 新增词必须生成对应预录音频，避免使用浏览器 SpeechSynthesis
- 音频文件范围：a000.mp3 ~ a336.mp3（总336条）

## 文件下载规范 (CRITICAL)

### 下载逻辑
1. **将文件放到public目录**：
   ```bash
   mkdir -p /workspace/projects/public
   cp /workspace/projects/目标文件.zip /workspace/projects/public/
   ```

2. **使用项目公网域名提供下载**：
   ```bash
   echo $COZE_PROJECT_DOMAIN_DEFAULT
   ```
   下载链接格式：`https://{域名}/{文件名}`

### 注意事项
- ❌ 不要使用 `localhost:5000` 链接（用户无法访问）
- ❌ 不要使用 `code.coze.cn/api/sandbox/...` 链接（会报token check failed）
- ✅ 使用项目公网域名直接访问public目录下的文件

## 技术栈
- 纯HTML/CSS/JavaScript
- 无外部依赖，单文件运行