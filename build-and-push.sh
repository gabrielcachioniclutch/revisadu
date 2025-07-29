#!/bin/bash

set -e

echo "🚀 Build e Push da imagem RevisadU! para x86"
echo "============================================="

# Verificar se Podman está funcionando
if ! podman info &> /dev/null; then
    echo "❌ Podman não está funcionando. Iniciando..."
    podman machine start
fi

echo "✅ Podman está funcionando!"

# Login no Docker Hub
echo "🔐 Verificando login no Docker Hub..."
if ! podman info | grep -q "Username"; then
    echo "Por favor, faça login no Docker Hub:"
    podman login docker.io
fi

# Build da imagem
echo "📦 Buildando imagem para x86..."
podman build -t gabrielcachioni/revisadu:latest -f Dockerfile .

# Tag para versão específica
VERSION="v1.0.2"
echo "🏷️ Criando tags para versão $VERSION..."
podman tag gabrielcachioni/revisadu:latest gabrielcachioni/revisadu:$VERSION

# Push para Docker Hub
echo "📤 Fazendo push para Docker Hub..."
podman push gabrielcachioni/revisadu:latest
podman push gabrielcachioni/revisadu:$VERSION

echo "✅ Build e push concluído!"
echo ""
echo "📋 Imagens disponíveis:"
echo "  - gabrielcachioni/revisadu:latest"
echo "  - gabrielcachioni/revisadu:$VERSION"
echo ""
echo "🚀 Para usar no Portainer:"
echo "  1. Acesse o Portainer no TrueNAS"
echo "  2. Vá em Stacks > Add stack"
echo "  3. Cole o conteúdo do docker-compose.yml"
echo "  4. Ajuste as variáveis de ambiente"
echo "  5. Deploy!" 