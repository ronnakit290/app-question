# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./

# ใช้ lockfile เป็นหลัก แต่ถ้า lock ยังไม่ตรงกับ package.json
# (เช่นเพิ่ง `npm i` แพ็กเกจใหม่แล้วยังไม่ได้รัน `bun install`) ให้ resolve ใหม่แทนที่จะ build ล้ม
RUN bun install --frozen-lockfile || bun install

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

FROM oven/bun:1.2-alpine AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    CHAT_DB_PATH=/app/data/chat.sqlite

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /app/data && chown nextjs:nodejs /app/data

VOLUME ["/app/data"]

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["bun", "run", "server.js"]
