# 笔搭子（biedazi）

无负担的私人写作空间。写下文字，AI 在不打扰你的前提下，悄悄告诉你：你的文字更像谁，哪里打动了我，还能往哪个方向走一步。

线上体验：<https://www.bidazi.cloud>（前端 GitHub Pages：<https://Manzuganjiyi.github.io/biedazi-react>）

## 功能

- **沉浸式写作画布**：Slate 富文本编辑器，专注书写本身，无弹窗打断
- **AI 文字分析**：点击「分析」，服务端两阶段识别你的文字风格
  - Stage 1：识别语言气质画像（用词、审美、文化语境等，七大维度分层标签）
  - Stage 2：与 120 位作家的 DNA 库比对，给出相似度评分、评语与续写建议
- **相似作家推荐**：海选 120 人库 → 排序取 Top 6 → 输出评分与理由
- **评语卡 / 续写**：逐条批注洞察 + 顺着你文气往下写
- **结果分享**：一键生成分享卡（下载图片 / 二维码）

## 架构

```
┌─────────────┐   ┌──────────────────────────────┐
│ React + Vite │   │    Vercel Serverless API     │
│  GitHub Pages │──▶│   /api/review                │
└─────────────┘   │  Stage1(识别) → 海选 → Stage2  │
                  │  讯飞星辰 MaaS（Qwen 模型）      │
                  │  api/writers.js  120 位作家 DNA │
                  │  api/tagging.js  标签/海选       │
                  └──────────────────────────────┘
```

- **前端**：React 18 + Vite + Zustand + Slate + Tailwind，静态部署到 GitHub Pages
- **后端**：Vercel Serverless Functions（`vercel.json` 映射 `/api/*`），调用讯飞星辰 MaaS
- **作家库**：`api/writers.js` 内置 120 位中外作家 DNA。每个作家有 7 大风格维度（主题/叙事/语言/意象节律/结构/情感温度/文化语境）的分层标签，标签按层级结构组织（维度 → 极/类 → 标签，支持近邻关联）
- **匹配算法**：`hierarchicalSimilarity` 对同一维度做层级加权匹配，同一维度内关联标签（如 冷↔沉郁）可获部分相似加分

## 本地开发

需要 Node.js 18+。

```bash
# 安装依赖
npm install

# 复制环境变量模板（API Key 见下）
copy .env.example .env

# 终端 1：前端 Vite 开发服务器
npm run dev

# 终端 2：本地 API 服务（端口 3000，前端代理 /api 到此）
npm run dev:api
```

> ⚠️ 两个命令**必须同时运行**。只开 Vite 时 `/api` 会走代理到 3000，若 `dev:api` 未启动，分析会报错。

## 配置环境变量

`api/review.js` 通过 Vercel 环境变量读取（本地开发时读取 `.env`）：

| 变量 | 必填 | 说明 |
|---|---|---|
| `XFYUN_API_KEY` | ✅ | 讯飞星辰 MaaS 服务接口认证信息里的 API Key |
| `XFYUN_MODEL` | 否 | 模型 ID，如 `xop35qwen2b` |
| `XFYUN_BASE_URL` | 否 | 接口地址，默认 `https://maas-api.cn-huabei-1.xf-yun.com/v2` |

### 如何获取 API Key 和模型 ID

1. 登录讯飞开放平台，进入 **星辰 MaaS 平台**（maas.cn-huabei-1.xf-yun.com）
2. 选择/创建模型，在模型详情页点击【API调用】
3. 从「服务接口认证信息」复制 API Key 填入 `XFYUN_API_KEY`
4. 从「API调用」弹窗复制 `modelId` 填入 `XFYUN_MODEL`

## 部署

两种通道独立部署，都靠推送 `main` 分支 + 本地 CLI 完成：

### 1. API（Vercel，必须）

`api/` 目录以 Serverless Functions 形式运行在 Vercel。在 Vercel 项目后台配置上表环境变量后：

```bash
vercel --prod --yes
```

### 2. 前端（GitHub Pages，可选）

`.github/workflows/deploy.yml` 在每次 push `main` 时自动构建 `dist` 并发布到 GitHub Pages。

> 两者并行：Vercel 同时托管 API 与前端页面；GitHub Pages 是前端静态副本。

## 目录结构

```
api/                Vercel Serverless Functions
  review.js         主入口：Stage1 识别 + 海选 + Stage2 分析
  writers.js        120 位作家 DNA 库 + 分层标签 + 相似度算法
  tagging.js        标签维度定义、海选排序
scripts/
  dev-server.mjs    本地 API 开发服务器（端口 3000）
  debug-multi.mjs   本地多文本调试脚本
src/                前端 React 应用
docs/               迭代总结与设计决策
```

## 版本号

采用 `X.YZ<字母>` 规则（如 `1.11a`），数字部分随部署 `+0.01`，字母随未部署修改顺延。详见 `AGENTS.md`。