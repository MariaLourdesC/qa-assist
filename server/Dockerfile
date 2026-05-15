FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Install deps first (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# App source
COPY src/ ./src/

# Writable dirs for SQLite and backups
RUN mkdir -p data backups

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "src/server.js"]
