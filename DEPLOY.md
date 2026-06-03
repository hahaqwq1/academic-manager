# 部署与运行说明

个人学术资料管理系统(`academic-manager`)。单人使用。

> **当前决策(2026-06):仅在本机运行,不上 VPS。** 下文第二节 Docker/VPS 作为**保留的可选能力**,非默认目标、非支持路径——受支持的运行方式是本机的「学术资料库.cmd」启动(见第一节)。`DATA_DIR` 抽象 / `file_path` 只存引用 / 应用内不做登录,这些设计即便永不上 VPS 也予以保留(本身就是好设计)。

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

## 二、上 VPS(Docker)— 可选能力,非当前目标

> 本节仅为保留的可选路径(便于他人克隆后容器化)。当前项目仅在本机运行,不走此路。若你确实要上公网,**务必先读本节末「鉴权(公网必读)」并落实反代鉴权**。

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

应用内部不做登录(单用户)。`Dockerfile` 以 `-H 0.0.0.0` 监听,**仅应在反向代理之后使用**。上公网是**硬性前置**:务必在反向代理(Caddy / Nginx)层加 Basic Auth 或其它鉴权,绝不要把 3000 端口裸暴露公网。

Caddy 最小示例:

```caddy
your.domain {
  basicauth { youruser JDJ... }   # 用 `caddy hash-password` 生成
  reverse_proxy localhost:3000
}
```

> 另:作品详情页粘贴 DOI「从 Crossref 导入」时会**联网**访问 `api.crossref.org`(免费、无鉴权、可离线手填)——这是本应用唯一的出站网络调用。

## 三、技术栈

Next.js 16(App Router)+ React 19 + TypeScript · Drizzle ORM + better-sqlite3 · Tailwind v4 + shadcn/ui · Recharts。
