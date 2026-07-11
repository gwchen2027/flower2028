# AGENTS.md

## 项目概览
情书生成器 —— 一个浪漫的 AI 表白信生成网站。用户输入收信人和写信人的名字，AI 自动生成一封深情、专一的表白信，以流式打字机效果呈现。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Font**: Noto Serif SC (via next/font/google)
- **AI**: coze-coding-dev-sdk (LLM 流式输出)

## 目录结构
```
src/
├── app/
│   ├── api/generate-letter/route.ts  # 情书生成 API (SSE 流式)
│   ├── globals.css                    # 全局样式 + 自定义主题
│   ├── layout.tsx                     # 根布局 + 字体配置
│   └── page.tsx                       # 主页面 (输入 + 信件展示)
├── components/ui/                     # shadcn/ui 组件库
├── hooks/
└── lib/
```

## 核心功能
1. **输入表单**: 收信人 + 写信人名字输入
2. **AI 生成**: 调用 LLM 生成深情表白信，SSE 流式返回
3. **打字机效果**: 前端逐字渲染信件内容
4. **视觉设计**: 深酒红背景 + 奶油色信纸 + 金色点缀 + 花瓣飘落动画

## 开发命令
- 开发: `pnpm dev`
- 构建: `pnpm build`
- 启动: `pnpm start`
- 类型检查: `pnpm ts-check`
- Lint: `pnpm lint`

## 设计规范
详见 `DESIGN.md`。核心风格：烛光信笺、古典浪漫、手写温度。
