# 笔搭子 (Biedazi)

> 无负担的私人写作空间 + 即时 AI 文学反馈

## 技术栈

- **React 18** + Vite
- **Zustand** - 轻量级状态管理
- **Tailwind CSS** - 原子化样式
- **Framer Motion** - 丝滑动画
- **Lucide React** - 图标库

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（需先完成下方「本地开发」配置）
npm run dev
```

## AI 锐评：真实大模型接入（讯飞星辰 MaaS 免费 Qwen）

本项目已不再使用 mock 假数据，AI 锐评会调用 **讯飞星辰 MaaS 平台** 的 Qwen 模型（你创建的推理服务对应模型 ID 为 `xop35qwen2b`）生成真实的文学评价。

调用链路：前端 → Vercel 无服务器函数 `/api/review` → 讯飞星辰 MaaS API（OpenAI 兼容协议）。API Key 只保存在服务端，不会暴露到前端。

### 如何获取 API Key 和模型 ID

1. 打开 [讯飞星辰 MaaS 平台](https://maas.xfyun.cn/) 并注册登录（手机号即可）。
2. 进入 **模型广场**，找到你需要的免费 Qwen 模型（模型卡片上标注"限时免费"），点击进入详情页。
3. 点击 **【API调用】** 按钮，在弹出的弹窗里点击 **"前往创建应用"**（或选择已创建的应用）。
4. 创建完成后，进入左侧菜单的 **推理服务 / API Keys**，即可看到：
   - **接口地址（Base URL）**：形如 `https://maas-api.cn-huabei-1.xf-yun.com/v2`
   - **API Key**：形如 `一串随机字符`
   - **模型 ID（modelId）**：形如 `xop35qwen2b`（请以你看到的为准）

### 部署到 Vercel 并配置环境变量

1. 将项目推送到 GitHub，然后在 Vercel 导入仓库部署（项目已内置 `vercel.json`，会自动识别 `api/` 下的函数）。
2. 在 Vercel 项目 **Settings → Environment Variables** 中添加：
   | 变量名 | 说明 | 必填 |
   | --- | --- | --- |
   | `XFYUN_API_KEY` | 上面拿到的 API Key | ✅ |
   | `XFYUN_MODEL` | 模型 ID，默认 `xop35qwen2b` | 选填 |
   | `XFYUN_BASE_URL` | 接口地址，默认 `https://maas-api.cn-huabei-1.xf-yun.com/v2` | 选填 |
3. 重新部署后即可使用。

### 本地开发

需要开两个窗口，一个跑本地 API 服务（模拟 `/api/review`，端口 3000），一个跑前端（端口 5173，`vite.config.js` 已把 `/api` 代理到 `localhost:3000`）：

```bash
# 本地环境变量（参考 .env.example 创建 .env 并填入 Key 和模型 ID）
# 在项目根目录新建 .env，内容：
#   XFYUN_API_KEY=你的_API_Key
#   XFYUN_MODEL=xop35qwen2b

# 窗口一：本地 API 服务（读 .env 里的 Key 调用讯飞 MaaS）
npm run dev:api

# 窗口二：前端（Vite 开发服务器）
npm run dev
```

浏览器打开 http://localhost:5173 即可使用。

## 核心功能

### 1. 极简编辑器
- 暖白色羊皮纸底色，最佳行宽 720px
- 顶部可编辑「篇名」与「作者名」
- 自动保存至 localStorage（防抖 500ms）
- 多篇文章独立存储与切换

### 2. AI 锐评
- 点击右下角悬浮球触发
- 5 步思考过程透明展示（每步 0.6s）
- 粉刷动画与 AI 生成耗时同步
- 调性背景色动态晕染（清冷/热烈/宁静等）

### 3. 幽灵文本续写
- AI 续写以 40% 透明度斜体呈现
- **Enter** 接受续写，**Backspace** 拒绝
- 其他输入自动取消

### 4. 反馈面板
- 相似作家匹配
- 逐句原文批注（磨砂玻璃质感）
- 总评 + emotionalClosing 情绪价值
- 导出分享（PDF/文本）

## 数据模型

```typescript
interface Article {
  id: string
  title: string
  author: string
  content: string
  createdAt: string
  updatedAt: string
  review: {
    author: { name: string, work: string }
    authors: Array<{ name: string, work: string }>  // 3 位真实存在、风格最相似的作家
    annotations: Array<{ id, quote, comment, startIndex }>
    continuation: string
    summary: string
    emotionalClosing: string
    tone: string
    score: number  // 基于文本内容的启发式评分（55-92），由服务端计算，非模型随机数
    radar: { language, structure, imagery, emotion, innovation }
    generatedAt: string
  } | null
}
```

## 调性颜色映射

| 调性 | 色值 | 描述 |
|------|------|------|
| melancholy | `#D4E1E6` | 清冷忧郁 |
| passionate | `#E6D4D4` | 热烈激情 |
| serene | `#D4E6D8` | 宁静平和 |
| mysterious | `#DCD4E6` | 神秘深邃 |
| humorous | `#E6E0D4` | 幽默诙谐 |

## 文件结构

```
src/
├── store/
│   └── useWriterStore.js    # Zustand 状态管理
├── data/
│   └── mockReviews.js       # 常量 + 真实 AI API 调用封装
├── components/
│   ├── ArticleTabs.jsx      # 文章切换栏
│   ├── EditorCanvas.jsx     # 编辑器画布
│   ├── GhostTextOverlay.jsx # 幽灵文本覆盖层
│   ├── FloatingActionBall.jsx # 悬浮球
│   └── ReviewPanel.jsx      # 锐评面板
├── App.jsx                  # 主应用
├── main.jsx                 # 入口
└── index.css                # 全局样式
api/
└── review.js                # Vercel 函数：转发到讯飞星辰 MaaS
```

## 后续优化方向

- [ ] Slate.js 富文本编辑器替换 contentEditable
- [ ] 大文本虚拟渲染优化
- [ ] 流式输出（SSE）提升锐评加载体验
