# 学术资料管理系统 —— Dockerfile(Phase 7,为上 VPS 备好)
#
# 多阶段构建:deps 装依赖 → builder 构建 → runner 运行。
# 数据库走 DATA_DIR=/data 挂载卷,代码不变(见 src/db/index.ts 与架构原则)。
# 备份 = 复制 /data/app.db 一个文件;另可在「导出」页下载 JSON 二级备份。
#
# 基础镜像用 Debian slim(glibc),better-sqlite3 可拉到预编译二进制,避免在 alpine(musl)上编译。
#
# 构建:  docker build -t academic-manager .
# 运行:  docker run -d --name academic-manager -p 3000:3000 -v academic_data:/data academic-manager
# 首启会自动应用迁移(空卷建表);如需示例数据,进容器执行 npm run db:seed。

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
# 运行所需:依赖、构建产物、静态资源、配置,以及 drizzle 迁移文件 + schema(db:migrate 用)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/src/db ./src/db
# 数据卷:数据库文件持久化于此
VOLUME ["/data"]
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 首次启动应用迁移(空卷自动建表),随后启动 Next.js 生产服务器
CMD ["sh", "-c", "npm run db:migrate && npm run start -- -H 0.0.0.0 -p 3000"]
