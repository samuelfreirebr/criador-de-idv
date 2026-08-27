# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1. Dependências
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Sem --ignore-scripts: o postinstall do @prisma/engines precisa rodar, senão o
# `prisma generate` do build não encontra os engines.
RUN npm ci

# ---------------------------------------------------------------------------
# 2. Build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `prebuild` sincroniza o registro de blocos e gera o Prisma Client.
# As fontes são baixadas aqui e servidas pelo próprio app depois: em produção
# não há chamada a CDN nenhum.
RUN npm run build

# ---------------------------------------------------------------------------
# 2b. CLI de migração
#
# Copiar node_modules/prisma solto do build NÃO funciona: a CLI depende de
# pacotes que o npm instala na raiz do node_modules e que não vêm junto. Aqui
# ela é instalada limpa, num diretório próprio. A versão sai do lockfile, então
# não há como divergir da usada no build.
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS migrator
WORKDIR /migrator

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package-lock.json ./
RUN VERSAO=$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version") \
    && echo "CLI do Prisma: $VERSAO" \
    && rm package-lock.json \
    && npm init -y > /dev/null \
    && npm install --no-save "prisma@$VERSAO"

# ---------------------------------------------------------------------------
# 3. Runtime
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs

ENV HOME=/home/nextjs

# Saída standalone: apenas o necessário para rodar.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Schema e migrações.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma Client gerado — é o que a aplicação usa para falar com o banco.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# CLI do Prisma, isolada, usada só pelo entrypoint.
COPY --from=migrator --chown=nextjs:nodejs /migrator/node_modules ./migrator/node_modules

# bcryptjs não sobrevive à saída standalone (o Next o embute no bundle), mas o
# script de criação do administrador precisa dele como módulo.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --chown=nextjs:nodejs docker/criar-usuario.mjs ./criar-usuario.mjs
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
