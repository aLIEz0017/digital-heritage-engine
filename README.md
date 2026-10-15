# 非遗数字生命互动引擎

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.9+-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)

**基于人工智能与知识图谱的非物质文化遗产数字化平台**

[功能特性](#功能特性) • [快速开始](#快速开始) • [技术架构](#技术架构) • [部署指南](#部署指南) • [文档](#文档)

</div>

---

## 📖 项目简介

非遗数字生命互动引擎是一个基于人工智能与知识组织技术的数字化平台，旨在提升非遗文化的传播效率与交互体验。系统通过知识图谱、智能问答、AI生成等技术，将传统非遗文化从静态展示转变为可交互、可探索、可生成的数字化体验形式。

### 🎯 核心目标

- 解决地方志与非遗知识分散、检索困难的问题
- 提升传统展示方式的交互性，吸引年轻群体
- 帮助用户深入理解非遗文化结构与关联
- 促进非遗文化与现代创意设计的结合

---

## ✨ 功能特性

### 模块一：首页展示
- 🏠 非遗文化概览与导航
- 📊 数据统计与可视化展示
- 🎨 精美的视觉设计与动画效果

### 模块二：智能问答
- 💬 基于大语言模型的智能对话
- 🔍 知识溯源与实体识别
- 📝 会话管理与历史记录
- 🎯 推荐问题与智能提示
- 🌐 离线模式支持

### 模块三：知识图谱
- 🕸️ 知识图谱可视化展示
- 🔎 多维度搜索与筛选
- 📍 地图视图、时间轴视图、列表视图
- 🔗 实体关系探索与路径查找
- 📈 统计分析与数据洞察

## 🚀 快速开始

### 环境要求

- **后端**：Python 3.9+
- **前端**：Node.js 16+、npm 或 pnpm
- **数据库**：SQLite（开发）/ PostgreSQL（生产）

### 安装步骤

#### 1. 克隆项目

```bash
git clone <仓库地址>
cd project24798-6754
```

#### 2. 后端配置

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

#启动后端
python main.py

#### 3. 前端配置

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install
# 或使用 pnpm
pnpm install

# 启动开发服务器
npm run dev
```

#### 4. 访问应用

- **前端界面**：http://localhost:5173
- **后端API**：http://localhost:8000
- **API文档**：http://localhost:8000/docs

---

## 🏗️ 技术架构

### 后端技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| FastAPI | Web框架 | 0.104+ |
| SQLAlchemy | ORM框架 | 2.0+ |
| SQLite/PostgreSQL | 数据库 | - |
| DashScope | AI服务 | 1.14+ |
| Pydantic | 数据验证 | 2.12+ |

### 前端技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | 前端框架 | 18.x |
| TypeScript | 类型系统 | 5.x |
| Vite | 构建工具 | 8.x |
| Zustand | 状态管理 | 5.x |
| ECharts | 图表库 | 6.x |
| TailwindCSS | CSS框架 | 4.x |
| Framer Motion | 动画库 | 10.x |

### 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   AI Service    │
│   (React + TS)  │    │   (Android)     │    │   (DashScope)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Application       │
                    │   Server (FastAPI)  │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
    ┌────▼────┐         ┌─────▼─────┐      ┌───────▼──────┐
    │ Database│         │ Knowledge │      │   Vector     │
    │ (SQLite)│         │   Graph   │      │    Store     │
    └─────────┘         └───────────┘      └──────────────┘
```

---

## 📦 项目结构

```
project24798-6754/
├── package.json              # 仓库根脚本/依赖（与 frontend 协同）
├── pnpm-lock.yaml
├── package-lock.json
├── docker-compose.yml
├── .env.example
├── OPEN_SOURCE_COMPONENTS.md
├── README.md
│
├── backend/                  # FastAPI 后端
│   ├── main.py               # 启动入口（uvicorn）
│   ├── requirements.txt
│   ├── init_data.py / init_db.py
│   ├── migrate_session.py
│   ├── alembic/              # 数据库迁移
│   ├── static/               # 静态资源
│   ├── uploads/              # 用户上传（如头像）
│   ├── tests/                # 后端测试
│   ├── backend-node.Dockerfile
│   └── app/
│       ├── main.py           # FastAPI 应用实例与路由挂载
│       ├── api/v1/           # REST：chat、knowledge、user、graph、upload、favorite
│       ├── core/             # 配置、数据库、鉴权等
│       ├── models/           # ORM 模型
│       ├── schemas/          # Pydantic 模式
│       ├── services/         # 业务与 LLM 等
│       ├── middleware/
│       ├── algorithms/       # 图算法等
│       ├── utils/
│       └── tests/            # app 内联测试（如 graph_service）
│
├── frontend/                 # React + Vite 前端
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js / postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/               # 公共静态文件
│   ├── dist/                 # 构建产物（生成，一般不提交）
│   ├── src/
│   │   ├── main.tsx / app.jsx
│   │   ├── api/              # HTTP 客户端与领域 API
│   │   ├── assets/ / constants/
│   │   ├── components/       # auth、chat、common、graph、knowledge、layout、llm
│   │   ├── config/ / i18n/
│   │   ├── data/             # 本地数据、mock、仓储
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/            # Homepage、Chat、Knowledge、Login、Register、User、Favorites
│   │   ├── services/         # 业务服务（聊天同步、错误处理等）
│   │   ├── storage/
│   │   ├── stores/           # Zustand 等状态
│   │   ├── styles/
│   │   ├── types/ / utils/
│   │   └── test/
│   └── frontend.Dockerfile
│
├── ai-service/               # 独立 AI 服务镜像定义（Dockerfile）
│
└── docs/                     # 任务书、模块设计、配图等文档
    ├── images/
    └── 模块设计/
```

---

## 🔧 配置说明

### 环境变量配置

创建 `.env` 文件并配置以下参数：

```env
# 应用配置
APP_NAME=非遗数字生命互动引擎
APP_VERSION=1.0.0
DEBUG=True

# 数据库配置
DATABASE_URL=sqlite+aiosqlite:///./heritage.db

# CORS配置
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# JWT配置
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI服务配置（可选）
DASHSCOPE_API_KEY=your_dashscope_api_key

# 可选服务配置
REDIS_URL=redis://localhost:6379/0
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

### API密钥获取

- **DashScope API Key**：访问 [阿里云DashScope控制台](https://dashscope.console.aliyun.com/) 获取

---

## 🐳 Docker部署

### 使用Docker Compose

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 单独构建镜像

```bash
# 构建后端镜像
docker build -f backend/backend-node.Dockerfile -t heritage-backend ./backend

# 构建前端镜像
docker build -f frontend/frontend.Dockerfile -t heritage-frontend ./frontend

# 构建AI服务镜像
docker build -f ai-service/ai-service.Dockerfile -t heritage-ai ./ai-service
```

---

## 📚 文档

- [模块二：智能问答页 - 后端接口配置情况文档](./docs/模块设计/模块二_后端接口配置情况文档.md)
- [模块三：知识图谱与知识检索页 - 后端接口配置情况文档](./docs/模块设计/模块三_后端接口配置情况文档.md)
- [非遗数字生命互动引擎任务书](./docs/非遗数字生命互动引擎任务书.md)
- [模块配置需求](./docs/模块配置需求.md)

---

## 🧪 测试

### 后端测试

```bash
cd backend
pytest
```

### 前端测试

```bash
cd frontend
npm run test
```

---

