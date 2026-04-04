# EBU6304_Group_65

软件工程 · 助教招聘系统（Web 完整版，不含 AI 功能）

## 成员

| QM ID | 姓名 |
|------|------|
| 231226668 | 周禹同 |
| 231226716 | 吕瀚心 |
| 231226794 | 张懿轩 |
| 231226749 | 王宏博 |
| 231226819 | 梁星宇 |
| 231226543 | 王铁 |

## 技术栈

- **后端**：Python 3.9+、FastAPI、SQLAlchemy、SQLite（数据文件：`data/app.db`）、JWT、bcrypt  
- **前端**：Vite、React 18、TypeScript、Tailwind CSS、React Router

## 本地运行

### 1. 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export PYTHONPATH=.         # Windows 可用 set PYTHONPATH=.
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

可选：写入 `backend/.env`（参考仓库根目录 `.env.example`）覆盖 `SECRET_KEY`、`DATABASE_URL`、`CORS_ORIGINS` 等。

### 2. 演示数据（可选）

```bash
cd backend
PYTHONPATH=. python seed.py
```

种子账号：

- `admin@example.com` / `admin123`（管理员）  
- `mo@example.com` / `mo123456`（课程负责人）  
- `ta1@example.com`、`ta2@example.com` / `ta123456`（助教）

### 3. 前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。开发环境下 Vite 会将 `/api` 代理到 `http://127.0.0.1:8000`。

### 4. 生产构建（前端）

```bash
cd frontend
npm run build
npm run preview
```

生产环境需将 API 指到真实后端地址（可改 `vite.config.ts` 的 `proxy` 或在前端使用环境变量区分）。

## 功能概览（非 AI）

- **TA**：资料与简历路径、浏览/搜索岗位、申请与撤回待处理申请、申请状态、登录后通知  
- **MO**：发布/编辑/关闭岗位、查看申请人、录用/拒绝、按岗位导出 CSV  
- **Admin**：各助教累计工时、超负荷高亮、全量工时 CSV、活动日志  

AI 技能匹配、缺口分析等未实现，界面脚注中标注为后续迭代。

## API 文档

后端启动后访问：`http://127.0.0.1:8000/docs`（Swagger UI）。
