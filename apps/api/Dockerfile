FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV DATABASE_URL=postgresql://nexus:nexus@postgres:5432/nexus_operacional?schema=public
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build --workspace=@nexus/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3333
CMD ["node", "apps/api/dist/main.js"]
