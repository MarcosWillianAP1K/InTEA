# =============================================================================
# Dockerfile — Frontend (React + Vite + Tailwind v4 → Nginx)
# InTEA: Interface do Terapeuta
# =============================================================================

# Stage 1: Build do React com Vite
FROM node:lts-alpine AS builder

# Atualiza pacotes do SO para eliminar vulnerabilidades de segurança (CVEs)
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copia dependências primeiro para cache do Docker
COPY package.json package-lock.json* ./
RUN npm ci

# Copia código fonte
COPY . .

# Argumentos de build para variáveis públicas do Vite
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Produção com Nginx Alpine Slim (superfície mínima de ataque e CVEs)
# -----------------------------------------------------------------------------
FROM nginx:alpine-slim AS production

# Atualiza pacotes do SO e limpa cache para zerar vulnerabilidades residuais
RUN apk update && apk upgrade --no-cache \
    && rm -rf /var/cache/apk/*

# Remove default do nginx e adiciona configuração do InTEA
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/intea.conf

# Copia os arquivos compilados pelo Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configura permissões para usuário não-root
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
