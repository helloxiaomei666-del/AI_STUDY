# 智习管家

AI自习室错题诊断与学习反馈系统 MVP。第一版聚焦数学、物理、化学和严谨学术英语错题复盘闭环：学生档案、AI错题分析、错题本、学习计划、家长日报、门店额度和平台后台。

## 技术栈

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- JWT Cookie 登录
- `AIService` 统一封装 AI 调用，默认使用 mock 输出，可切换 OpenAI Responses API

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 准备环境变量：

```bash
copy .env.example .env
```

3. 启动 PostgreSQL。没有本机数据库时，可在安装 Docker 后执行：

```bash
docker compose up -d
```

4. 初始化数据库：

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. 启动应用：

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 演示账号

- 平台管理员：`18800000000 / 123456`
- 门店老板：`18800000001 / 123456`
- 督学员工：`18800000002 / 123456`

## AI 配置

默认 `.env` 中 `AI_PROVIDER=mock`，无需真实模型也能跑通演示闭环。

如需接入真实模型：

```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_TEXT_MODEL="gpt-5.5"
OPENAI_VISION_MODEL="gpt-5.5"
OPENAI_REASONING_EFFORT="low"
OPENAI_TIMEOUT_MS="60000"
UPLOAD_STORAGE_PROVIDER="local"
```

所有 AI 请求都从服务端 `AIService` 发起，门店账号不能配置或看到 API Key。每次成功调用会记录模型、token、成本并扣减对应门店额度。
AI 调用失败或超时不会扣减额度；正式上线前必须配置 `AUTH_SECRET`，图片存储可通过 `UPLOAD_STORAGE_PROVIDER` 从本地存储迁移到对象存储实现。

## 已实现模块

- 登录与角色权限：`platform_admin`、`store_owner`、`staff`
- 学生档案：新增、列表、详情、历史记录聚合
- 员工账号：老板创建督学账号
- AI错题分析：支持数学、物理、化学和学术英语图片上传预览、分层提示、解析、复习建议、错题本沉淀；英语输出必须保持正式、严谨、学术化表达，不做口语俚语训练
- AI学习计划：按学生、计划类型、可学习时间生成计划
- AI家长日报：生成微信风格日报、一键复制并记录复制次数
- 套餐额度：本月额度进度、AI调用日志
- 平台后台：创建门店、调整额度和状态、编辑 Prompt 模板
- Prisma 迁移与 seed 数据

## 关键接口

- `POST /api/auth/login`
- `GET/POST /api/students`
- `POST /api/wrong-questions/analyze`
- `GET /api/wrong-questions`
- `PATCH /api/wrong-questions/:id/mastery`
- `POST /api/study-plans/generate`
- `POST /api/daily-reports/generate`
- `POST /api/daily-reports/:id/copy`
- `GET /api/quotas/current`
- `GET/POST /api/admin/stores`
- `PATCH /api/admin/stores/:id/quota`
- `GET/POST/PATCH /api/admin/prompt-templates`

## 验证

```bash
npm run lint
npm run build
```
