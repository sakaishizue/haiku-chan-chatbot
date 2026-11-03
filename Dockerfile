# 秘密情報はイメージに入れない。実行時に環境変数（本番は Secret Manager）で渡す。

# ビルド用のステージ（開発用の依存関係も含む）
FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 実行用のステージ（standalone 出力に必要なファイルだけを入れる）
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
# standalone 出力には public と .next/static が含まれないので、別にコピーする
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
