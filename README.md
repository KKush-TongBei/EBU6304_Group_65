# EBU6304_Group_65
软件工程 · 助教招聘系统（Web 完整版，不含 AI 功能）

## 成员

周禹同 qmid:231226668 gitId：KKush-TongBei
Yixuan Zhang qmid:231226794 gitId：1678162910
Hongbo Wang 231226749 gitId：Sh1Rana1
hanxin lyu  231226716 gitId：jp2023213481
Liang Xingyu 231226819 gitId：Liang1117
Tie Wang 231226543 gitid:WANGNNNnnn

## 技术栈

- **后端**：Python 3.9+、FastAPI、SQLAlchemy、SQLite（数据文件：`data/app.db`）、JWT、bcrypt  
- **前端**：Vite、React 18、TypeScript、Tailwind CSS、React Router

## 环境要求

- **Python** 3.9 及以上（用于后端）  
- **Node.js** 与 **npm**（用于前端，建议 Node 18+）  

仓库主要目录：`backend/`（API）、`frontend/`（页面）、`data/`（SQLite 数据库文件，首次运行后生成）。

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

可选：将仓库根目录 [`.env.example`](.env.example) 复制为 `backend/.env`，可覆盖 `SECRET_KEY`、`DATABASE_URL`、`CORS_ORIGINS`、`MAX_TA_HOURS_DEFAULT` 等。**不配置时**默认使用仓库根目录下 `data/app.db`（需保证对 `data/` 有写权限）。启动后端时工作目录应在 `backend/`，以便正确读取 `backend/.env`。

### 2. 演示数据（可选）

首次体验可写入示例用户与岗位；也可跳过本步，在前端 **注册** 页自行注册（可选择 TA / MO / Admin 角色）。

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

**联调**：请先保持 **§1 后端已在运行**，再启动前端，否则登录与列表请求会失败。若前端运行在非 5173 端口，请在后端 `CORS_ORIGINS` 中加入对应地址。

### 4. 生产构建（前端）

生产环境请配置前端环境变量 **`VITE_API_BASE`**（后端根 URL，**不要**尾部斜杠），例如 `https://your-api.example.com`。可参考 [`frontend/.env.example`](frontend/.env.example) 复制为 `frontend/.env.production` 或在 CI 中注入。开发环境留空即可，继续使用 Vite 将 `/api` 代理到本机后端。

```bash
cd frontend
npm install
npm run build
npm run preview
```

### 5. 体验与交互（已实现）

- 深色 / 浅色主题（本地记忆）、移动端侧滑导航  
- 全局 Toast、危险操作确认框（替代浏览器原生 `alert` / `confirm`）  
- 列表加载指示与骨架、表格斑马纹与表头可访问性（`scope`）  
- **TA**：通知支持「仅未读」、单条/全部标已读；岗位支持回车搜索、清空条件、申请状态摘要；简历可选本地文件（仅写入文件名，不上传服务器）  
- **MO**：编辑岗位未保存时离开页面会拦截路由，并有关闭标签页前的提示；导出 CSV、录用/拒绝等操作有成功/失败提示  
- **Admin**：工作量表格可单独刷新；超负荷行高亮；退出时请求 `POST /api/auth/logout`（本地 Token 仍会清除）  

## 功能概览（非 AI）

- **TA**：资料与简历路径、浏览/搜索岗位、申请与撤回待处理申请、申请状态、登录后通知  
- **MO**：发布/编辑/关闭岗位、查看申请人、录用/拒绝、按岗位导出 CSV  
- **Admin**：各助教累计工时、超负荷高亮、全量工时 CSV、活动日志  

AI 技能匹配、缺口分析等未实现，界面脚注中标注为后续迭代。

## API 文档

后端启动后可在浏览器访问：

- **http://127.0.0.1:8000/docs** — Swagger UI，可在线试调接口  
- **http://127.0.0.1:8000/redoc** — ReDoc 只读文档  

健康检查：**http://127.0.0.1:8000/api/health**（返回 `{"status":"ok"}`）。
