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
- **登录与输入**：登录失败 **连续 3 次**错误密码即锁定；锁定时长随累计锁定次数递增（有上限 24 小时），成功登录后清零；邮箱整条 **≤50** 字符、**姓名/显示名 ≤50**、**学号或工号 ≤25**；其余主要文本字段在后端由 `InputValidation` 做长度与格式校验（写接口返回 **422** 时见错误信息）。
- **前端**：Vite、React 18、TypeScript、Tailwind CSS、React Router（生产环境可构建进 WAR，与 `/api/*` 同源）。

## 环境要求

- **合规版**：JDK 17+、Maven 3.8+、Tomcat 10+（或同等 Jakarta Servlet 6 容器）  
- **前端构建**：Node.js 与 npm（建议 Node 18+）

主要目录：`java-web/`（合规 WAR 与数据目录）、`frontend/`（页面源码）。

## 本地运行（合规主版本：`java-web`）

### 0. 一键环境（推荐）

若已按上文在仓库 `.tools/` 下放置 **JDK 17、Maven 3.9.x、Tomcat 10.1.x**（或通过 `CATALINA_HOME` / `JAVA_HOME` 使用本机安装），可在仓库根目录执行：

```bash
./scripts/tomcat-run.sh          # mvn package + 部署 WAR + 前台启动 Tomcat（Ctrl+C 停止）
./scripts/tomcat-stop.sh         # 停止 Tomcat（若以后台方式启动过）
./scripts/build-war.sh           # 仅构建 WAR（可附加 Maven 参数，如 -DskipTests）
```

脚本会设置 **`TA_DATA_DIR`** 为 **`java-web/data`**（可写、不依赖 Tomcat 工作目录），并设置本地开发用 **`TA_JWT_SECRET`**（生产请覆盖）。

**Cursor / VS Code**：打开仓库根目录后，可安装工作区推荐的 **Extension Pack for Java**；`.vscode/settings.json` 已指向 `.tools` 下的 JDK 17（若路径不存在请在设置里改成本机 JDK）。

### 管理员登录（组内开发 / 演示）

前端**公开注册**可创建 **TA / MO**；**管理员**不能通过前端自注册。组内约定使用下列**演示账号**登录后台（数据目录一般为 `java-web/data/`）：

| | |
|---|---|
| **邮箱** | `zyx1678162910@gmail.com` |
| **密码** | `admin123456` |

**说明：**

- 仅用于**本地与课程演示**，勿用于公网或真实生产环境；提交作业 ZIP 时请按课程要求处理数据，勿泄露敏感信息。
- **首次启动**：若数据中尚无任何 `admin` 用户，后端在启动时会**自动创建**上表中的演示管理员（无需再手动 `export`）。若已存在其他 admin，则不会覆盖。
- **自定义管理员种子**：在**当前没有任何 admin 用户**时，可同时设置  
  `TA_SEED_ADMIN_EMAIL` 与 `TA_SEED_ADMIN_PASSWORD`  
  再启动 Tomcat / `./scripts/tomcat-run.sh`，将用你提供的邮箱与密码创建管理员（请**同时设置两项**，勿只设其一）。
- 也可向组长索取含该管理员的 `users.json` 片段，放入 `java-web/data/`。

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

**组内多台电脑同步用户与业务数据：** `java-web/data/`（含 **`*.json`**、**`uploads/`**、**`cv_payloads/`** 等）已配置为可由 Git 跟踪。新建用户、上传简历或改数据后请 **`git add java-web/data` + `commit` + `push`**，其他成员 **`git pull`** 后即可一致。删除用户记录目前需**手动编辑 `users.json`** 或后续扩展「管理员删除 / 用户注销」接口；**换电脑本身不会清空数据**，只要仓库里已有提交。若仓库为**公开**或交作业打包，请自行脱敏或排除敏感文件。

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

浏览器或 curl 访问：`http://<主机>:<端口>/<上下文路径>/api/health`，应返回 JSON，至少含 `status: ok`，并含 `version`、`time`、`java`、`data_dir` 等字段（便于确认运行版本与数据目录）。

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

可选：若本机未装 Node，可将 Node 解压到仓库约定路径后使用 [`scripts/frontend-run.sh`](scripts/frontend-run.sh) 启动 Vite（脚本内说明路径约定）。

### 7. 生产构建（前端指向独立 API 或嵌入 WAR）

若前端与后端不同源部署，设置 **`VITE_API_BASE`** 为 API 根 URL（无尾部斜杠），再 `npm run build`。参见 [`frontend/.env.example`](frontend/.env.example)。嵌入 WAR 时按上文「前端嵌入 WAR」使用 `VITE_API_BASE=` 即可。

## 用户管理模块（JSON + BCrypt）

为满足课程“禁止数据库、使用本地文件”的要求，新增了独立用户模块：

- **数据文件**：`data/users.json`（可通过 `TA_DATA_DIR` / `-Dta.data.dir` 指向具体目录）；角色支持 `ta`、`mo`、`admin`。
- **DAO 层**：`java-web/src/main/java/com/ebu6304/tarecruit/user/UserDAO.java`，负责 `users.json` 的读取/写入，默认单例 `getInstance()`，并用读写锁保护并发访问。
- **Service 层**：`java-web/src/main/java/com/ebu6304/tarecruit/user/UserService.java`，提供 `register` / `login` 业务逻辑，以及供主流程调用的 `persistNewTa`（指定用户 id，与 `counters.json` 对齐）、`passwordMatches`（登录验密）。
- **与现有接口衔接**：`AuthServlet` 仍暴露 `/api/auth/register`、`/api/auth/login`；公开 **TA/MO 注册** 时由 `TaRecruitService` 调用 `UserService` 写入 `users.json`；**管理员创建 MO/Admin**（`/api/admin/users`）同样经 `UserService.persistNewStaff` 写入同一 `users.json`。**管理员创建 MO** 须填职工号（`student_id`），活动日志动作与公开 MO 注册同为 **`register`**，详情 JSON 中含 `created_by_admin_id` 便于区分代建；创建 Admin 仍为 **`user_created_by_admin`**。**环境变量种子管理员**（`ensureSeedAdmin`）同上。**登录验密** 走 `UserService.passwordMatches`（BCrypt）。JWT 签发、活动日志与计数器仍由 `TaRecruitService` 统一处理。
- **密码安全**：注册时使用 BCrypt 哈希加盐（`Passwords.hash`），登录时使用 BCrypt 校验（经 `UserService`/`Passwords.verify`），不存明文密码。
- **测试**：`java-web/src/test/java/com/ebu6304/tarecruit/user/UserServiceTest.java`，覆盖注册加密、登录校验、重复邮箱、JSON 损坏错误处理。

## 体验与交互（前端已实现）

- 深色 / 浅色主题（本地记忆）、移动端侧滑导航  
- 全局 Toast、危险操作确认框（替代浏览器原生 `alert` / `confirm`）  
- 列表加载指示与骨架、表格斑马纹与表头可访问性（`scope`）  
- **TA**：通知支持「仅未读」「最近 7 天」、单条/全部标已读；Dashboard 展示规则型提示（截止临近、资料待补）；Token 过期自动跳转登录并提示  
- **MO**：**岗位模板**（内置 + 可保存个人模板）、招聘管道概览与状态流转；**申请状态机**（已申请 → 面试中 → 已录用/已拒绝，且拒绝后不可再录用）；编辑岗位未保存时离开页面会拦截路由；导出 CSV、状态操作有成功/失败提示  
- **Admin**：总览页标题为「管理员 · 总览」；工作量表按 TA **有效申请**汇总岗位预估工时，可设超负荷阈值，**超过 20h/周** 时红色预警；表格可单独刷新；活动日志支持 **实体类型** 筛选与风险行高亮；系统设置含默认岗位名额与学期标签  
- **全角色**：导航栏 **通知** 入口与未读角标（依赖 `/api/notifications`）  

## 功能概览（非 AI）

- **TA**：资料与简历上传（Base64 文本存储）、浏览/搜索岗位（**开放岗位 / 已关闭**）、岗位过截止日后视为已关闭且不可申请、申请与撤回待处理申请、Dashboard 与规则型岗位提示  
- **MO**：模板发帖、发布/编辑/关闭岗位、流程推进、申请人评分卡、录用/拒绝（日志带评估摘要）、按岗位导出 CSV  
- **Admin**：各助教累计工时（按申请汇总岗位 `assigned_hours`）、Dashboard 洞察、超负荷与 **>20h/周** 预警、全量工时 CSV、活动日志筛选与导出  

**终期提交 ZIP 建议**：勿打包 `node_modules`、`frontend/dist`（若已嵌入 WAR 可二选一说明）、本地 `data/`；保留源码与可复现 README。

AI 技能匹配等未实现。

## API 说明

- **Java 合规版**：与既有前端约定相同的 JSON 形态，路径包括 `/api/auth/*`、`/api/jobs`、`/api/ta/*`、`/api/notifications`、`/api/applications/*/withdraw`、`/api/mo/*`、`/api/admin/*` 等；无内置 Swagger，可用浏览器开发者工具或 curl 联调。

