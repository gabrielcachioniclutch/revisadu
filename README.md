# RevisadU! - Sua Revisão, Seu Controle

## Sobre o Projeto

RevisadU! é uma plataforma inovadora que conecta proprietários de veículos e mecânicos, oferecendo transparência e controle total sobre o processo de manutenção automotiva.

### Conceito do "U!"
- **Você**: Cliente no centro, com total controle
- **União**: Conexão transparente entre proprietários, mecânicos e informações
- **Unidade**: Um ponto único e confiável para todo o histórico e conhecimento automotivo

## Tecnologias Utilizadas

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT para autenticação
- Passport.js para OAuth (Google, Facebook)
- Resend para envio de e-mails transacionais

### Frontend
- React.js
- Material-UI
- React Router
- Axios para requisições HTTP

## Estrutura do Projeto

```
revisadu_app/
├── client/                 # Frontend React
├── server/                 # Backend Node.js/Express
├── database/              # Scripts e configurações do banco
├── public/                # Arquivos estáticos
└── docs/                  # Documentação
```

## Instalação e Configuração

### Pré-requisitos
- Node.js (versão 16 ou superior)
- PostgreSQL (versão 12 ou superior)
- npm ou yarn

### 1. Clone e Instale as Dependências
```bash
# Instalar dependências do backend
npm install

# Instalar dependências do frontend
cd client && npm install
```

### 2. Configuração do Banco de Dados
```bash
# Criar banco de dados PostgreSQL
createdb revisadu_db

# Executar migrações
npm run db:migrate
```

### 3. Configuração de Variáveis de Ambiente
Criar arquivo `.env` na raiz do projeto:
```env
# Servidor
PORT=5000
NODE_ENV=development

# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=revisadu_db
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=sua_chave_secreta_jwt

# E-mail (Resend)
RESEND_API_KEY=sua_chave_resend
EMAIL_FROM=noreply@revisadu.com.br

# OAuth
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
FACEBOOK_APP_ID=seu_facebook_app_id
FACEBOOK_APP_SECRET=seu_facebook_app_secret
```

### 4. Executar o Projeto
```bash
# Desenvolvimento (backend + frontend)
npm run dev

# Apenas backend
npm run server

# Apenas frontend
cd client && npm start
```

## Funcionalidades Principais

### Para Mecânicos
- Cadastro e perfil da oficina
- Registro de manutenções
- Upload de evidências
- Histórico de serviços

### Para Clientes
- Cadastro de veículos
- Aprovação/rejeição de manutenções
- Histórico completo de serviços
- Avaliação de mecânicos

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Recuperação de senha
- `GET /api/auth/google` - Login com Google
- `GET /api/auth/facebook` - Login com Facebook

### Mecânicos
- `GET /api/mechanics/profile` - Perfil do mecânico
- `PUT /api/mechanics/profile` - Atualizar perfil
- `POST /api/mechanics/maintenance` - Registrar manutenção
- `GET /api/mechanics/maintenance` - Listar manutenções

### Clientes
- `GET /api/clients/vehicles` - Listar veículos
- `POST /api/clients/vehicles` - Cadastrar veículo
- `GET /api/clients/maintenance` - Listar manutenções
- `PUT /api/clients/maintenance/:id/approve` - Aprovar manutenção
- `PUT /api/clients/maintenance/:id/reject` - Rejeitar manutenção

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Contato

RevisadU! Team - [contato@revisadu.com.br](mailto:contato@revisadu.com.br)

Link do Projeto: [https://github.com/revisadu/revisadu-app](https://github.com/revisadu/revisadu-app) 