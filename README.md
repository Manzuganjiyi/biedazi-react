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




## 目录结构

```
api/                Vercel Serverless Functions
  review.js         主入口：Stage1 识别 + 海选 + Stage2 分析
  writers.js        135 位作家 DNA 库 + 分层标签 + 相似度算法
  tagging.js        标签维度定义、海选排序
scripts/
  dev-server.mjs    本地 API 开发服务器（端口 3000）
  dev.mjs           一键同时启动 Vite + 本地 API（npm run dev）
  build-embedding-vectors.mjs  讯飞 embedding 向量库生成（需 EMB_* 凭证）
  test-embed-blend.mjs         标签/向量融合测试
  verify-samples.mjs           样本与作家库对齐校验
src/                前端 React 应用
docs/               迭代总结与设计决策
```
