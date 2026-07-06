FROM denoland/deno:2.8.0

WORKDIR /app

# Copy Prisma schema + CLI config and generate the Deno client at build time.
# `prisma generate` loads prisma.config.ts but doesn't need DATABASE_URL.
COPY prisma ./prisma
COPY prisma.config.ts deno.jsonc deno.lock ./
RUN deno run -A npm:prisma@^7 generate

# Cache dependencies (installs npm deps, incl. @prisma/adapter-pg + pg, via node_modules)
COPY . .
RUN deno cache src/main.ts 2>/dev/null || true

EXPOSE 3001

# Push schema (reads DATABASE_URL via prisma.config.ts) then start the API
CMD ["sh", "-c", "deno run -A npm:prisma@^7 db push --skip-generate && deno run -A src/main.ts"]
