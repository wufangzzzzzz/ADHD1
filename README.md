# 读写障碍注意力训练游戏中心

## 项目概览
- 概述: 读写障碍注意力训练游戏中心，包含多个子游戏
- 技术栈: 原生 HTML5 + CSS3 + JavaScript (ES5), Canvas API, Web Audio API
- 编码规范: 原生极简模式，单文件实现，完全兼容旧版浏览器

## 游戏列表
1. 彩色连线 (color-connect.html)
2. 视觉追踪 (visual-trace.html)
3. 蛇形连线 (snake-trace.html)
4. 符号迷宫 (symbol-maze.html)
5. 顺序连线 (sequence-connect.html)
6. 舒尔特方格 (schulte-grid.html)
7. 图形复刻 (pattern-trace.html)

## 图形复刻游戏 - 重要规范

### 六边形蜂窝状点阵坐标系
游戏使用特殊的六边形蜂窝状点阵（3行，第0行3个点，第1行4个点向右错位，第2行3个点）。

**坐标系定义：**
- `(row, col)` 其中 `row` = 行号(0,1,2)，`col` = 该行的列索引
- 第0行：col 0, 1, 2（3个点）
- 第1行：col 0, 1, 2, 3（4个点，向右错位）
- 第2行：col 0, 1, 2（3个点）

**相邻关系规则 (isAdjacent函数)：**
- 同行相邻：只允许 |col差| = 1 的连接
- 跨行相邻：
  - row 0 → row 1：
    - col 0 相邻 row 1的col 0,1 (dc = 0,-1)
    - col 1 相邻 row 1的col 1,2 (dc = 0,1)
    - col 2 相邻 row 1的col 2,3 (dc = 0,1)
  - row 1 → row 2：
    - col 0 相邻 row 2的col 0,1 (dc = 0,-1)
    - col 1 相邻 row 2的col 0,1,2 (dc = 0,1,-1)
    - col 2 相邻 row 2的col 1,2 (dc = -1,0,1)
    - col 3 相邻 row 2的col 2 (dc = -1,0)

### 关卡数据格式
```javascript
{
  name: '关卡名称', color: '#颜色代码',
  lines: [
    { points: [{col: 0, row: 0}, {col: 1, row: 1}] },
    // ...
  ]
}
```

### 原图坐标系对照（原图使用1-based索引）
原图使用 `(行号, 该行的点序号)` 格式：
- 原图第一行第1个点 → 代码(row 0, col 0)
- 原图第二行第2个点 → 代码(row 1, col 1)
- 原图第三行第3个点 → 代码(row 2, col 2)

## 关键决策
- 使用 `reduce` 替代 `Math.max(...)` 解决 Safari 兼容性
- 使用 `function()` 替代箭头函数，`var` 替代 `let/const`
- 添加 `initAttempts` 重试机制确保DOM渲染完成后再初始化Canvas
- CSS Grid 改为 Flex 布局，`aspect-ratio` 改用 `padding-bottom` 技术
- 添加 `-webkit-` 前缀兼容旧版WebKit引擎
- 触摸事件优化：区分点击和滑动，只在点击时触发游戏操作
- 移除resize事件监听器，避免移动端地址栏显示/隐藏时触发游戏重置
- 响应式布局：5档屏幕尺寸适配
- 舒尔特方格游戏：使用三角波生成柔和音效，随机打乱连接顺序和图形位置
- 舒尔特方格难度模式：简单模式9种图形（3x3），困难模式12种图形（3x4），独立按钮切换
- 舒尔特方格背景：静态渐变背景 + 漂浮粒子效果
- 图形复刻游戏：采用六边形蜂窝状点阵（3行，3-4-3个点），点击画线模式，支持相邻点连接验证

## 最近更新
### 2024年修正 - 图形复刻游戏
- **坐标系修正**：原图使用(行号, 该行的点序号)格式，完全匹配到代码中的(row, col)格式
- **isAdjacent函数修正**：修正了row 1到row 2的相邻规则，允许更多有效连接
- **关卡1（蓝色X形）**：4条线，完全匹配原图
- **关卡2（橙色多边形）**：10条线，完全匹配原图
- **关卡3-10**：修正了所有不符合相邻规则的图案

## 访问地址
http://${COZE_PROJECT_DOMAIN_DEFAULT}
