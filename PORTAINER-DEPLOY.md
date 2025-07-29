# 🚀 Deploy RevisadU! no Portainer

## 📋 Pré-requisitos

- TrueNAS Scale com Portainer instalado
- PostgreSQL configurado (pode ser local ou remoto)
- Acesso ao Docker Hub

## 🔧 Configuração no Portainer

### 1. Acesse o Portainer
- Abra o navegador e acesse o Portainer no TrueNAS
- Faça login com suas credenciais

### 2. Criar Stack
- Vá em **Stacks** > **Add stack**
- Nome: `revisadu`
- Cole o conteúdo do `docker-compose.yml`

### 3. Configurar Variáveis de Ambiente

**IMPORTANTE:** Ajuste estas variáveis no docker-compose.yml:

```yaml
environment:
  # Banco de dados (OBRIGATÓRIO)
  - DB_HOST=seu-postgres-host
  - DB_PORT=5432
  - DB_NAME=revisadu_db
  - DB_USER=postgres
  - DB_PASSWORD=sua-senha
  
  # JWT (OBRIGATÓRIO - mude para uma chave segura)
  - JWT_SECRET=sua-chave-jwt-super-secreta
  
  # Email (OBRIGATÓRIO)
  - RESEND_API_KEY=re_Ur1h2iyZ_MWMUFHsj1qZwjnREC4JifLDv
  - EMAIL_FROM=noreply@revisadu.com.br
```

### 4. Deploy
- Clique em **Deploy the stack**
- Aguarde a inicialização

## 🌐 Acesso

- **URL:** `http://seu-truenas-ip`
- **Porta:** 80

## 📊 Monitoramento

- **Logs:** Stacks > revisadu > revisadu > Logs
- **Status:** Stacks > revisadu > revisadu > Status

## 🔧 Troubleshooting

### Container não inicia
1. Verifique os logs: `docker logs revisadu`
2. Confirme as variáveis de ambiente
3. Verifique se o PostgreSQL está acessível

### Erro de banco de dados
1. Confirme as credenciais do PostgreSQL
2. Verifique se o banco `revisadu_db` existe
3. Execute manualmente: `psql -h host -U user -d revisadu_db -f schema.sql`

### Erro de email
1. Verifique se a chave do Resend está correta
2. Confirme o domínio de envio

## 📝 Comandos Úteis

```bash
# Ver logs
docker logs revisadu

# Reiniciar container
docker restart revisadu

# Acessar shell do container
docker exec -it revisadu /bin/bash

# Verificar health check
curl http://localhost/health
```

## 🔄 Atualizações

Para atualizar:
1. Vá em Stacks > revisadu
2. Clique em "Pull and redeploy"
3. Aguarde a reinicialização

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs no Portainer
2. Confirme a configuração do PostgreSQL
3. Teste a conectividade de rede 