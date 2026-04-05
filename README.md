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

- **课程合规主版本（提交推荐）**：Java 17、**Jakarta Servlet 6**（Tomcat 10+）、Jackson、JJWT、BCrypt；数据为 **`java-web/data/` 下多文件 JSON**（`users.json`、`jobs.json`、`applications.json`、`notifications.json`、`assignments.json`、`activity_logs.json`、`counters.json`），**不使用数据库**；写入采用临时文件校验后替换，并由读写锁保护。
- **前端**：Vite、React 18、TypeScript、Tailwind CSS、React Router（生产环境可构建进 WAR，与 `/api/*` 同源）。

## 环境要求

- **合规版**：JDK 17+、Maven 3.8+、Tomcat 10+（或同等 Jakarta Servlet 6 容器）  
- **前端构建**：Node.js 与 npm（建议 Node 18+）

主要目录：`java-web/`（合规 WAR 与数据目录）、`frontend/`（页面源码）。

## 本地运行（合规主版本：`java-web`）

### 1. 构建 WAR

```bash
cd java-web
mvn package
```

产物：`java-web/target/ta-recruit.war`。将其部署到 Tomcat `webapps/`（或 IDE 绑定 Tomcat 运行该模块）。

后端包含 **JUnit 5** 基础用例（注册权限、截止后不可申请、MO 数据隔离等），提交前建议本地执行 `mvn test` 确保通过。

数据目录在运行时会自动创建 **`job_templates.json`**（内置 Lab TA / Marker / Invigilator / Event Support 等模板）、**`cv_payloads/*.txt`**（简历 Base64 文本，符合课程「简单文本文件」要求）。合规说明页：**`/ta-recruit/system-info.jsp`**（context path 以部署名为准）。

### 2. 数据目录与密钥

默认在进程**当前工作目录**下的 `data/` 创建并写入上述 JSON（在 Tomcat 中常取决于启动脚本的工作目录）。建议在运行配置中显式指定其一：

- 环境变量 **`TA_DATA_DIR`**：绝对路径，指向可写目录；或  
- JVM 参数 **`-Dta.data.dir=/path/to/data`**

生产环境请设置 **`TA_JWT_SECRET`**（或 `SECRET_KEY`）为足够长的随机串；亦可于 `java-web/src/main/webapp/WEB-INF/web.xml` 的 `secretKey` 上下文参数中配置（留空则使用内置默认值，仅适合本地）。变量名示例见根目录 [`.env.example`](.env.example)。

### 3. 前端嵌入 WAR（同源 `/api`）

```bash
cd frontend
npm install
VITE_API_BASE= npm run build
cp -r dist/* ../java-web/src/main/webapp/
```

然后回到 `java-web` 再次执行 `mvn -DskipTests package` 并重新部署。`WEB-INF` 下的 `index.html` 占位页会被覆盖；未拷贝 dist 时仍可访问占位说明。

客户端路由刷新：过滤器对非 `/api`、无扩展名的 GET 请求回退到 `index.html`（SPA）。

### 4. 健康检查

浏览器或 curl 访问：`http://<主机>:<端口>/<上下文路径>/api/health`，应返回 `{"status":"ok"}`。

### 5. 与教师确认（页面技术）

若课程要求页面必须由 **JSP** 渲染，请在提交前与教师/助教**书面确认**是否允许 **Servlet + 静态 React** 同源部署；在未收到确认前，请勿假设仅 Servlet+静态资源一定符合口头以外的附加约束。

### 6. 前端开发模式（Vite 代理本机 Tomcat）

先在本机启动并部署 `ta-recruit.war`（默认上下文路径为 **`/ta-recruit`**，端口常见为 **8080**）。再在另一终端：

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认 `http://localhost:5173`。Vite 将浏览器请求 **`/api/*`** 转发到 **`http://127.0.0.1:8080/ta-recruit/api/*`**（与 [`frontend/vite.config.ts`](frontend/vite.config.ts) 中配置一致）。若你将 WAR 部署为 **ROOT**（无 `/ta-recruit` 前缀）或使用了其他 context path，请相应修改 `vite.config.ts` / `vite.config.js` 里的 `rewrite` 与 `target`。

### 7. 生产构建（前端指向独立 API 或嵌入 WAR）

若前端与后端不同源部署，设置 **`VITE_API_BASE`** 为 API 根 URL（无尾部斜杠），再 `npm run build`。参见 [`frontend/.env.example`](frontend/.env.example)。嵌入 WAR 时按上文「前端嵌入 WAR」使用 `VITE_API_BASE=` 即可。

## 体验与交互（前端已实现）

- 深色 / 浅色主题（本地记忆）、移动端侧滑导航  
- 全局 Toast、危险操作确认框（替代浏览器原生 `alert` / `confirm`）  
- 列表加载指示与骨架、表格斑马纹与表头可访问性（`scope`）  
- **TA**：通知支持「仅未读」「最近 7 天」、单条/全部标已读；Dashboard 展示规则型提示（截止临近、资料待补）；Token 过期自动跳转登录并提示  
- **MO**：**岗位模板**（内置 + 可保存个人模板）、招聘管道概览与状态流转；编辑岗位未保存时离开页面会拦截路由；导出 CSV、录用/拒绝等操作有成功/失败提示  
- **Admin**：工作量表格可单独刷新；超负荷行高亮；活动日志支持 **实体类型** 筛选与风险行高亮；系统设置含默认岗位名额与学期标签  
- **全角色**：导航栏 **通知** 入口与未读角标（依赖 `/api/notifications`）  

## 功能概览（非 AI）

- **TA**：资料与简历上传（Base64 文本存储）、浏览/搜索岗位、申请与撤回待处理申请、Dashboard 与规则型岗位提示  
- **MO**：模板发帖、发布/编辑/关闭岗位、流程推进、申请人评分卡、录用/拒绝（日志带评估摘要）、按岗位导出 CSV  
- **Admin**：各助教累计工时、Dashboard 洞察、超负荷高亮、全量工时 CSV、活动日志筛选与导出  

**终期提交 ZIP 建议**：勿打包 `node_modules`、`frontend/dist`（若已嵌入 WAR 可二选一说明）、本地 `data/`；保留源码与可复现 README。

AI 技能匹配等未实现。

## API 说明

- **Java 合规版**：与既有前端约定相同的 JSON 形态，路径包括 `/api/auth/*`、`/api/jobs`、`/api/ta/*`、`/api/notifications`、`/api/applications/*/withdraw`、`/api/mo/*`、`/api/admin/*` 等；无内置 Swagger，可用浏览器开发者工具或 curl 联调。

