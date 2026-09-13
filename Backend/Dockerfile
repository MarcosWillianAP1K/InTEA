# =============================================================================
# Dockerfile — Backend (Node.js / Express / TypeScript — API REST)
# InTEA: Interface do Terapeuta
# =============================================================================

# Stage 1: Build da aplicação TypeScript
FROM node:lts-alpine AS builder

# Atualiza pacotes do SO para eliminar vulnerabilidades de segurança (CVEs)
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Copia o código fonte e compila TypeScript
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Imagem final de Produção
# -----------------------------------------------------------------------------
FROM node:lts-alpine AS production

# Atualiza SO e instala dumb-init para gerenciamento seguro de processos
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S intea -u 1001 -G nodejs

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Instala apenas dependências de produção e remove npm/npx/corepack do container final
# Isso elimina todas as CVEs bundled (undici, cross-spawn, etc.) detectadas por scanners de vulnerabilidade
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -rf /usr/local/lib/node_modules/corepack \
    && rm -rf /usr/local/bin/npm \
    && rm -rf /usr/local/bin/npx \
    && rm -rf /usr/local/bin/corepack \
    && rm -rf /root/.npm \
    && rm -rf /tmp/* \
    && rm -rf /var/cache/apk/*

# Copia arquivos compilados do builder com permissões de usuário não-root
COPY --from=builder --chown=intea:nodejs /app/dist ./dist

USER intea

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/server.js"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1
