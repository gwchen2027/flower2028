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

## 会员与付费（T2 账户体系）
- **认证**：Supabase Auth 邮箱注册/登录（配置动态注入，前端 `@/lib/supabase-browser`，后端校验 `x-session` header）。
- **鉴权工具**：`src/lib/member.ts`（`getAuthUser` 解析登录、`getOrCreateProfile` 读会员资料）。
- **付费模型**：会员 30 元/月 = 30 天有效期 + 30 封额度；每生成 1 封扣 1 额度（原子 SQL 函数 `consume_credit`）。
- **兑换码**：`redeem_codes` 表 + 原子 SQL 函数 `redeem_code`（防并发竞态）。DEV 测试码：`WELCOME30`、`LOVE30DEMO`。
- **在线支付**：`/api/member/order`，需配置 `ALIPAY_APP_ID` / `WECHAT_MCH_ID` 等商户凭证；未配置时如实返回 503（不 Mock 支付）。
- **数据表**：`member_profiles` / `redeem_codes` / `payment_orders` / `usage_records`（定义于 `src/storage/database/shared/schema.ts`，经 `coze-coding-ai db upgrade` 同步）。
- **接口鉴权**：生成信件接口 `/api/generate-letter` 强制登录 + 会员 + 额度。

## 多语言（i18n）
- 字典 `src/lib/i18n.ts`（zh-CN / zh-TW / en / ja），Provider `src/lib/i18n-context.tsx`，Hook `useI18n()` 的 `t(key)`。
- 语言选择存 localStorage，`<LocaleSwitcher>` 切换。

