# --- API (Deno + Prisma) ---
FROM denoland/deno:2.8.0 AS api

WORKDIR /app

# Copy Prisma schema + CLI config and generate the Deno client at build time.
# `prisma generate` loads prisma.config.ts but doesn't need DATABASE_URL.
COPY backend/prisma ./prisma
COPY backend/prisma.config.ts backend/deno.jsonc backend/deno.lock ./
RUN deno run -A npm:prisma@^7 generate

# Cache dependencies (installs npm deps, incl. @prisma/adapter-pg + pg, via node_modules)
COPY backend/ .
RUN deno cache src/main.ts 2>/dev/null || true

EXPOSE 3001

# Push schema (reads DATABASE_URL via prisma.config.ts) then start the API
CMD ["sh", "-c", "deno run -A npm:prisma@^7 db push --skip-generate && deno run -A src/main.ts"]

# --- Frontend build ---
FROM node:22-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# --- Frontend (nginx) ---
FROM nginx:alpine AS frontend

COPY --from=frontend-builder /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
