# Dockerfile para RevisadU! - Container único x86
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    postgresql-client \
    bash \
    curl \
    nginx \
    supervisor \
    tzdata

# Configurar timezone
ENV TZ=America/Sao_Paulo

# Configurar diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY client/package*.json ./client/

# Instalar dependências do backend
RUN npm ci --only=production

# Instalar dependências do frontend
WORKDIR /app/client
RUN npm ci

# Voltar para o diretório raiz
WORKDIR /app

# Copiar código fonte
COPY . .

# Build do frontend
WORKDIR /app/client
RUN npm run build

# Voltar para o diretório raiz
WORKDIR /app

# Configurar Nginx
COPY nginx-unified.conf /etc/nginx/nginx.conf

# Configurar Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Criar diretórios necessários
RUN mkdir -p uploads /var/log/supervisor /var/log/nginx

# Tornar o script de entrada executável
COPY docker-entrypoint-unified.sh /app/docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Comando de inicialização
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 