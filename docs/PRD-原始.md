# 笔搭子产品需求文档 (PRD)

## 1. 项目概览

### 1.1 产品定位与核心价值

"笔搭子"是一款面向个人创作者的极简在线写作与反馈工具。产品核心定位为"无负担的私人写作空间+即时AI文学反馈"。目标用户为文学爱好者、日记写作者及需要灵感反馈的创作者。核心价值主张在于：通过零门槛的极简输入体验，结合AI的文学分析能力，为写作者提供类似"文学导师"的精准逐句批注、风格定位及续写启发，同时支持将反馈结果转化为具有美学价值的PDF分享卡片。

### 1.2 技术栈推荐

考虑到单人开发效率及无后端约束，推荐以下技术栈：
- 核心框架：React 18+ (配合 Vite 构建，极速启动)
- 状态管理：Zustand (轻量级，完美契合单页应用与本地状态)
- 样式方案：Tailwind CSS (快速构建极简UI) + Framer Motion (处理悬浮球、幽灵文本等丝滑动画)
- 编辑器内核：Slate.js 或 Lexical (支持富文本批注、幽灵文本渲染及自定义快捷键)
- PDF生成：jspdf + jspdf-autotable (纯前端生成带背景色的PDF)
- 本地存储：localStorage (封装为自定义 Hook，处理JSON序列化)
- AI接口：Fetch API (对接 OpenAI 兼容接口或本地 Mock 数据)

## 2. 页面布局设计

### 2.1 整体页面结构

采用经典的"左编辑-右批注"响应式布局，整体分为三个核心区域：
- 顶部包含篇名（可编辑标题）和作者名（可编辑副标题）两个元信息字段，以及极简的文章列表/切换Tab。
- 左侧主编辑区 (65% 宽度)：占据屏幕主要视觉，暖白色底色，提供沉浸式写作体验。顶部包含极简的文章列表/切换Tab。
- 右侧反馈区 (35% 宽度)：默认隐藏或折叠。点击悬浮球后，色彩从右侧边缘向左、从底部边缘向上以"粉刷"效果晕染展开，颜色直接使用文章调性对应的颜色（如清冷调用淡蓝灰 #D4E1E6 晕染，热烈调用暖橘 #E6D4D4 晕染）。展开后包含"相似作家"、"原文批注"、"总评"三个垂直排列的模块。左上角显示"退回"按钮，点击后以反向粉刷动画收起面板。
- 右下角悬浮球 (固定定位)：始终悬浮于编辑区右下角，作为核心交互入口。

### 2.2 编辑器区域设计规范

- 内容容器：最大宽度限制为 720px，水平居中，保证阅读与写作的最佳行宽。
- 排版：行高 1.8，段落间距 24px。
- 光标与选区：使用柔和的灰色光标，选区背景色为低透明度暖色。
- 幽灵文本区：在编辑器内容最底部，使用斜体及 40% 透明度渲染AI续写内容，视觉上与正文区分。

元信息栏：位于编辑器内容容器最顶部，包含两个可编辑字段——"篇名"（大号衬线标题，默认显示"未命名篇章"，支持点击编辑）和"作者名"（较小字号，位于篇名下方，支持点击编辑）。两个字段均无边框，仅底部有极淡的分隔线（#E0E0E0），聚焦时显示 accent 色下划线高亮。

### 2.3 批注区与总评区设计规范

- 批注卡片：采用半透明磨砂玻璃效果（Backdrop-filter: blur），悬浮于调性背景色之上。每条批注包含"原文引用"、"AI点评"、"定位锚点"。
- 总评区：位于反馈区底部，包含总分、写作水平雷达图（可选）及建议列表。
- 粉刷动画：点击悬浮球后，批注区和总评区从收起状态以"粉刷"效果展开。色彩从右侧面板右边缘向左渗透、从总评区底部边缘向上蔓延，如同水彩渗透纸张。粉刷颜色直接使用文章调性分析得出的对应色值（ToneColorMap 中的颜色），以半透明渐变方式覆盖原暖白底色，形成批注区+总评区整体的调性背景。动画时长不固定，与 AI 评价生成的耗时同步——评价生成需要多久，粉刷动画就持续多久，两者同时完成，给用户"色彩随评价一同涌现"的流畅体验。

退回按钮：位于反馈区左上角，文字为"退回"，采用 accent 色（#4A4A4A）小字号。点击后，粉刷动画以反向执行——色彩从左侧向右、从顶部向下收缩收回，批注区和总评区恢复为收起状态，悬浮球回到可点击状态。

### 2.4 悬浮球设计规范

- 尺寸与位置：直径 64px，距离右侧 32px，距离底部 32px。
- 视觉：默认状态为深色实心圆，内含羽毛笔图标；Hover 时放大至 72px 并显示"AI 锐评"Tooltip。
- 状态：生成中状态显示旋转加载动画；生成完成状态变为对勾图标。

## 3. 功能模块详细设计

### 3.1 极简编辑器与分篇管理

- 功能描述：提供无干扰的纯文本写作环境，支持多篇文章独立存储与切换。
- 触发条件：页面加载时自动初始化；点击顶部文章Tab时切换。
- 交互流程：
  1. 用户输入文本，防抖 500ms 后自动保存至 localStorage。
  2. 点击"+"号创建新篇，默认命名为"未命名篇章 X"。
  3. 双击文章标题可重命名。

编辑器顶部默认展示篇名和作者名两个字段，用户可直接点击修改，失去焦点后自动保存。

- 边界情况：localStorage 达到 5MB 上限时，提示用户清理旧文章；单篇文章超过 10万字时，限制输入并提示。

篇名和作者名修改后实时同步保存至 localStorage，与正文内容独立存储。

### 3.2 AI 锐评触发与生成

- 功能描述：一键触发AI分析，生成作家匹配、逐句批注、续写及总评。
- 触发条件：点击右下角悬浮球。
- 交互流程：
  1. 点击悬浮球，按钮进入 Loading 状态。
  2. 页面平滑滚动至编辑器顶部。
  3. 右侧反馈区以粉刷效果展开：色彩从右侧边缘向左、从底部边缘向上晕染，颜色为文章调性对应色，动画时长与 AI 评价生成时间同步。
  4. 锐评过程透明化展示：右侧面板首先展示"AI 思考过程"区域，以步骤列表形式呈现，每步带有 loading 动画（旋转图标 + 文字），依次点亮：
     - "正在分析句式结构…"
     - "正在检索相似作家…"
     - "正在提取高光句子…"
     - "正在撰写批注…"
     - "正在生成总评…"
  5. 每步耗时约 0.5-1 秒，全部完成后，思考过程区域收起，正式结果（相似作家、批注、总评）依次以打字机效果展示。
  6. 编辑器底部无缝插入"幽灵文本"续写内容。

收起反馈区：用户点击左上角"退回"按钮，粉刷动画反向执行（色彩从左侧向右、从顶部向下收缩收回），面板收起后悬浮球恢复可点击状态。也可点击编辑区空白处收起。

- 状态管理：维护 isGenerating 布尔值，生成期间禁用编辑器输入及悬浮球点击。

### 3.3 幽灵文本续写交互

- 功能描述：AI续写内容以幽灵文本形式呈现，支持键盘快捷操作。
- 触发条件：AI生成完毕且光标位于编辑器末尾。
- 交互流程：
  - 回车键 (Enter)：将幽灵文本的样式类移除，转为正式文本，光标移至新行。
  - 退格键 (Backspace)：直接删除所有幽灵文本，光标回退。
  - 常规输入：若用户输入其他字符，幽灵文本自动消失，新字符正常插入。
  - 选中/复制：允许鼠标选中幽灵文本并复制，但不改变其幽灵状态。
- 边界情况：若用户在生成过程中移动光标至非末尾位置，幽灵文本自动取消。

### 3.4 调性PDF导出

- 功能描述：将核心反馈导出为带调性背景色的PDF。
- 触发条件：点击总评区右上角的"导出分享"按钮。
- 交互流程：
  1. 提取当前文章的作家信息、3-5处高光句子、总评文本。
  2. 获取当前反馈区的调性背景色。
  3. 调用 jspdf 生成 A4 尺寸 PDF，填充背景色，排版文本。
  4. 触发浏览器下载。

## 4. 数据模型设计

### 4.1 文章数据结构 (Article)

```json
{
  "id": "uuid-v4-string",
  "title": "string (文章标题)",
  "content": "string (纯文本内容)",
  "createdAt": "ISO8601-timestamp",
  "updatedAt": "ISO8601-timestamp",
  "review": {
    "author": {
      "name": "string (作家名)",
      "work": "string (代表作)"
    },
    "annotations": [
      {
        "id": "uuid",
        "quote": "string (原文句子)",
        "comment": "string (AI批注)",
        "startIndex": "number (在content中的起始索引)"
      }
    ],
    "continuation": "string (AI续写的100字)",
    "summary": "string (全文总评)",
    "emotionalClosing": "string (鼓励性/温暖的话语，如'这个想法让故事更精彩了')",
    "toneColor": "string (HEX色值，如 #E6E0D4)",
    "generatedAt": "ISO8601-timestamp"
  }
}
```

"篇名": "string (编辑器顶部展示的文章标题，默认'未命名篇章')",
"作者名": "string (编辑器顶部展示的作者名，默认'佚名')",

### 4.2 调性颜色映射表 (ToneColorMap)

```json
{
  "melancholy": "#D4E1E6",
  "passionate": "#E6D4D4",
  "serene": "#D4E6D8",
  "mysterious": "#DCD4E6",
  "humorous": "#E6E0D4",
  "default": "#FAF9F6"
}
```

## 5. 组件设计

### 5.1 EditorCanvas (编辑器画布)
- Props: content, onChange, ghostText, onGhostAccept, onGhostReject
- 新增 Props: articleTitle, onTitleChange, authorName, onAuthorChange
- 状态: isFocused, cursorPosition
- 事件: handleKeyDown (拦截Enter/Backspace处理幽灵文本)

### 5.2 FloatingActionBall (悬浮球)
- Props: isLoading, isCompleted, onClick
- 状态: isHovered
- 事件: handleClick

### 5.3 ReviewPanel (锐评面板)
- Props: reviewData, toneColor, onExport
- 状态: isVisible, isThinking
- 子组件:
  - ThinkingProcess: 新增组件，用于展示AI思考过程。接收思考步骤数组，渲染带 loading 动画的步骤列表，支持收起/展开状态。
  - AuthorCard: 展示相似作家信息
  - AnnotationList: 展示原文批注列表
  - SummaryCard: 展示总评及情绪价值反馈（emotionalClosing 以斜体、accent 色、带引号装饰样式渲染）

### 5.4 GhostTextOverlay (幽灵文本覆盖层)
- Props: text, isActive
- 渲染逻辑: 绝对定位在编辑器末尾，pointer-events 穿透，仅用于视觉展示。

## 6. 样式规范

### 6.1 颜色体系
- 编辑器底色：#FAF9F6 (暖白/羊皮纸色)
- 主文本色：#2C2C2C (深灰，降低纯黑带来的视觉疲劳)
- 次文本色：#6B6B6B
- 幽灵文本色：rgba(44, 44, 44, 0.4)
- 强调色/按钮：#4A4A4A
- 情绪价值反馈色：accent 色（如 #8B7355 暖棕），用于 emotionalClosing 的斜体引号装饰

元信息栏篇名：#2C2C2C（与主文本色一致），字号 24pt，加粗，衬线体
元信息栏作者名：#6B6B6B（次文本色），字号 14pt，位于篇名正下方
元信息栏编辑态：聚焦时篇名/作者名下方显示 accent 色下划线（高度 1px，颜色 #4A4A4A），其余边框不变

### 6.2 字体规范
- 中文："Noto Serif SC", "Source Han Serif", serif (衬线体，增强文学感)
- 英文/数字："Merriweather", serif
- UI界面："Inter", sans-serif

### 6.3 动画规范
- 页面过渡：ease-out, 300ms
- 悬浮球Hover：scale(1.1), transition: transform 0.2s
- 幽灵文本出现：fadeIn, 500ms, delay: 200ms
- 思考过程步骤：
  - 步骤点亮：fadeIn + slideUp, 300ms, ease-out
  - Loading 旋转图标：rotate 360deg, 1s, linear, infinite
  - 思考过程收起：fadeOut + slideUp, 200ms, ease-in

退回按钮：位于反馈区左上角，初始状态为 opacity: 0, pointer-events: none。粉刷动画完成 200ms 后淡入（opacity: 0 -> 1, transition: opacity 200ms ease-out）。Hover 时文字颜色加深至 #2C2C2C，transition: color 150ms。点击时触发反向粉刷动画。

粉刷收起动画（退回按钮）：反向执行——色彩从左侧向右收缩（width: 100% -> 0, transform: translateX(0) -> translateX(-20px)）、从顶部向下收回（height: 100% -> 100% -> 0, transform: translateY(0) -> translateY(-20px)），duration: 400ms, easing: ease-in。收起完成后，面板恢复隐藏状态。

粉刷展开动画：色彩从右侧面板右边缘向左渗透（width: 0 -> 100%, opacity: 0 -> 1, transform: translateX(20px) -> translateX(0), duration: 与评价生成耗时同步, easing: ease-out）、从总评区底部边缘向上蔓延（height: 0 -> 100%, opacity: 0 -> 1, transform: translateY(20px) -> translateY(0), duration: 与评价生成耗时同步, easing: ease-out）。两层粉刷同时启动，使用 CSS backdrop-filter: blur() 实现磨砂质感过渡。

## 7. 交互流程

### 7.1 完整写作与锐评流程
1. 打开页面：加载 localStorage，渲染最近编辑的文章。
2. 沉浸写作：用户输入，自动保存。
3. 触发锐评：点击悬浮球 -> 滚动至顶 -> 请求AI -> 右侧反馈区以粉刷效果展开（色彩从右侧向左、从底部向上晕染，颜色为调性对应色，动画时长=评价生成耗时）-> 展示"AI 思考过程"（5个步骤依次点亮，每步 0.5-1 秒）-> 思考过程收起 -> 渲染正式结果（相似作家、批注、总评）-> 插入幽灵文本。
4. 处理续写：用户按回车接受，或按退格拒绝。
5. 导出分享：点击导出 -> 提取当前篇名、作者名、作家信息、3-5处高光句子、总评文本 -> 生成带调性背景色的PDF -> 触发下载。

### 7.2 续写交互状态机
- IDLE -> (AI生成完毕) -> GHOST_ACTIVE
- GHOST_ACTIVE -> (Enter) -> ACCEPTED (文本固化)
- GHOST_ACTIVE -> (Backspace) -> REJECTED (文本消失)
- GHOST_ACTIVE -> (光标移动/其他输入) -> DISMISSED (文本消失)

## 8. 页面路由/状态管理

### 8.1 状态管理方案 (Zustand Store)

```ts
interface WriterStore {
  articles: Article[];
  activeArticleId: string | null;
  isReviewing: boolean;
  isThinking: boolean; // 新增：思考过程展示状态
  thinkingSteps: string[]; // 新增：思考过程步骤
  setArticles: (articles: Article[]) => void;
  updateActiveArticle: (content: string) => void;
  triggerReview: () => Promise<void>;
  acceptGhostText: () => void;
  rejectGhostText: () => void;
  setThinkingState: (isThinking: boolean, steps?: string[]) => void; // 新增
  title: string; // 新增：篇名
  author: string; // 新增：作者名
  setTitle: (title: string) => void; // 新增：更新篇名
  setAuthor: (author: string) => void; // 新增：更新作者名
}
```

### 8.2 文章切换逻辑
- 切换文章前，强制触发一次 updateActiveArticle 确保当前内容已持久化。
- 切换后，重置 isReviewing 和 isThinking 状态，清空右侧面板。

## 9. 接口设计

### 9.1 AI 锐评 API (Mock / Real)

- Endpoint: POST /api/v1/review
- Request Body: { content: string, articleId: string }
- Request Body 更新为：{ content: string, articleId: string, title: string (篇名), author: string (作者名) }
- Response:

```json
{
  "author": { "name": "鲁迅", "work": "《野草》" },
  "annotations": [...],
  "continuation": "...",
  "summary": "...",
  "emotionalClosing": "这个想法让故事更精彩了",
  "tone": "melancholy",
  "thinkingSteps": [
    "正在分析句式结构...",
    "正在检索相似作家...",
    "正在提取高光句子...",
    "正在撰写批注...",
    "正在生成总评..."
  ]
}
```

### 9.2 调性分析 API
- 可合并至锐评 API 中返回，或独立调用 POST /api/v1/analyze-tone。
- 若为纯前端模拟，可根据关键词匹配返回预设色值。

## 10. 开发实施步骤

Phase 1: MVP (核心链路)
- 搭建 Vite + React + Tailwind 基础工程
- 实现 EditorCanvas 及 localStorage 读写
- 实现 FloatingActionBall 及基础点击交互
- 对接 Mock AI 接口，实现右侧面板静态渲染

Phase 2: 核心体验完善
- 实现幽灵文本渲染及 Enter/Backspace 快捷键拦截
- 实现调性背景色动态渐变
- 实现文章列表切换及重命名
- 新增：实现 ThinkingProcess 组件及思考过程动画
- 新增：实现 emotionalClosing 字段渲染及样式
- 新增：实现编辑器顶部篇名/作者名元信息栏及编辑交互
- 对接真实 AI API (流式输出优化)

Phase 3: 导出与打磨
- 集成 jspdf，实现 PDF 导出功能
- 添加 Framer Motion 页面过渡动画
- 响应式适配 (移动端隐藏右侧面板，改为抽屉弹出)
- 性能优化 (大文本虚拟渲染)

## 11. 验收标准

### 11.1 编辑器验收
- 刷新页面不丢失内容；创建3篇文章可无缝切换；输入延迟 < 16ms。

### 11.2 锐评验收
- 点击悬浮球后 2秒内开始响应；批注精准定位到句子；续写内容正确显示为幽灵文本。

### 11.3 交互验收
- 按 Enter 幽灵文本变实；按 Backspace 幽灵文本消失；其他输入幽灵文本消失。

### 11.4 导出验收
- 导出的 PDF 包含指定内容；背景色与界面调性一致；文件大小 < 500KB。

### 11.5 锐评过程透明化验收（新增）
- 点击悬浮球后，右侧面板首先展示"AI 思考过程"区域，5个步骤依次点亮，每步耗时 0.5-1 秒。
- 每步显示旋转 loading 图标 + 文字，动画流畅无卡顿。
- 全部步骤完成后，思考过程区域平滑收起，正式结果依次展示。
- 思考过程展示期间，悬浮球保持 Loading 状态，编辑器不可输入。

### 11.6 情绪价值反馈验收（新增）
- 总评区底部正确渲染 emotionalClosing 内容。
- emotionalClosing 以斜体、accent 色、带引号装饰样式呈现，与 summary 正文有明显视觉区分。
- 若 emotionalClosing 为空，不显示该区域，不影响总评布局。

### 11.7 篇名与作者名标注验收（新增）
- 编辑器顶部正确渲染篇名和作者名两个可编辑字段，默认值分别为"未命名篇章"和"佚名"。
- 点击篇名或作者名可进入编辑状态，失去焦点后自动保存至 localStorage，刷新页面不丢失。
- 创建新篇时，篇名默认为"未命名篇章 X"（X 为序号），作者名默认为"佚名"。
- 导出 PDF 时，篇名和作者名出现在 PDF 顶部，与调性背景色协调排版。

### 11.8 粉刷动画与退回验收（新增）
- 点击悬浮球后，批注区和总评区以粉刷效果展开：色彩从右侧面板右边缘向左渗透、从总评区底部边缘向上蔓延，颜色为文章调性分析得出的对应色（如清冷调=淡蓝灰 #D4E1E6，热烈调=暖橘 #E6D4D4），非默认白色或固定色。
- 粉刷动画时长与 AI 评价生成耗时完全同步——评价生成需要 3 秒，粉刷动画就持续 3 秒，两者同时完成，无"动画已完成但评价未出"或"评价已出但动画未完"的割裂感。
- 反馈区左上角正确显示"退回"按钮，粉刷动画完成 200ms 后淡入可见。
- 点击"退回"按钮后，粉刷动画以反向执行（色彩从左侧向右收缩、从顶部向下收回），duration 400ms，收起后面板恢复隐藏状态，悬浮球恢复可点击。
- 粉刷过程中（动画进行中），批注区和总评区的内容区域不可交互（pointer-events: none），防止用户操作导致动画异常。
- 粉刷动画使用 backdrop-filter: blur() 实现磨砂质感过渡，非简单的 opacity 渐变，具有层次感。
