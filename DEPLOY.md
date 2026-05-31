# 部署与运行说明

个人学术资料管理系统(`academic-manager`)。单人使用,本地优先,可平滑迁移到 VPS。

## 一、本地运行(Windows)

桌面已放置启动入口 **「学术资料库.cmd」**,双击即可:

1. 首次双击会自动构建(`npm run build`,约 10–20 秒);
2. 随后启动生产服务器,并自动打开浏览器到 <http://localhost:3000>;
3. 关闭那个黑色命令行窗口即停止服务。

手动方式(命令行):

```bash
npm install        # 仅首次
npm run db:migrate # 仅首次(建表)
npm run db:seed    # 可选,写入示例数据
npm run build
npm run start      # http://localhost:3000
```

开发模式:`npm run dev`。

### 数据与备份

- 数据库是单个文件:`data/app.db`(路径由环境变量 `DATA_DIR` 决定,默认 `./data`)。
- **备份 = 复制 `data/app.db`**。另可在应用「导出」页一键下载整库 JSON 作为二级备份。

## 二、上 VPS(Docker)

代码无需改动,只要把 `DATA_DIR` 指向挂载卷即可(已在 `Dockerfile` 中设为 `/data`)。

```bash
docker build -t academic-manager .
docker run -d --name academic-manager \
  -p 3000:3000 \
  -v academic_data:/data \
  academic-manager
```

- 首次启动会自动应用数据库迁移(空卷建表)。
- 如需示例数据:`docker exec -it academic-manager npm run db:seed`。
- 备份:`docker cp academic-manager:/data/app.db ./app.db.bak`,或用卷快照。

### 鉴权(公网必读)

应用内部不做登录(单用户)。上公网务必在反向代理(Caddy / Nginx)层加 Basic Auth 或其它鉴权,不要把 3000 端口裸暴露公网。

## 三、技术栈

Next.js 16(App Router)+ React 19 + TypeScript · Drizzle ORM + better-sqlite3 · Tailwind v4 + shadcn/ui · Recharts。
