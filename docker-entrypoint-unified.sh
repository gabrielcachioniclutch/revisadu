#!/bin/bash

set -e

echo "🚀 Iniciando RevisadU! Container..."

# Configurar variáveis de ambiente
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-5001}

# Função para aguardar PostgreSQL
wait_for_postgres() {
    echo "⏳ Aguardando PostgreSQL..."
    until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
        echo "PostgreSQL não está pronto - aguardando..."
        sleep 2
    done
    echo "✅ PostgreSQL está pronto!"
}

# Função para inicializar banco de dados
init_database() {
    echo "🗄️ Inicializando banco de dados..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /app/database/schema.sql || true
    echo "✅ Banco de dados inicializado!"
}

# Função para inicializar dados FIPE
init_fipe_data() {
    echo "🚗 Verificando dados FIPE..."
    if [ ! -f /app/fipe_initialized ]; then
        echo "📊 Inicializando dados FIPE..."
        node /app/scripts/update-fipe.js || true
        touch /app/fipe_initialized
        echo "✅ Dados FIPE inicializados!"
    else
        echo "✅ Dados FIPE já inicializados!"
    fi
}

# Executar funções de inicialização
if [ "$NODE_ENV" = "production" ]; then
    wait_for_postgres
    init_database
    init_fipe_data
fi

echo "🎯 Iniciando aplicação..."
exec "$@" 