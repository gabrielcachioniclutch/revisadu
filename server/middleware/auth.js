const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se o usuário é mecânico
const requireMechanic = (req, res, next) => {
  if (req.user.userType !== 'mechanic') {
    return res.status(403).json({ error: 'Acesso restrito a mecânicos' });
  }
  next();
};

// Middleware para verificar se o usuário é cliente
const requireClient = (req, res, next) => {
  if (req.user.userType !== 'client') {
    return res.status(403).json({ error: 'Acesso restrito a clientes' });
  }
  next();
};

// Middleware para verificar se o usuário é o proprietário do recurso
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const resourceId = req.params.id;

      let query;
      let params;

      switch (resourceType) {
        case 'vehicle':
          query = 'SELECT user_id FROM vehicles WHERE id = $1';
          params = [resourceId];
          break;
        case 'maintenance':
          query = 'SELECT client_id, mechanic_id FROM maintenance_records WHERE id = $1';
          params = [resourceId];
          break;
        case 'profile':
          query = 'SELECT user_id FROM mechanic_profiles WHERE id = $1';
          params = [resourceId];
          break;
        default:
          return res.status(400).json({ error: 'Tipo de recurso inválido' });
      }

      const result = await require('../config/database').query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Recurso não encontrado' });
      }

      const resource = result.rows[0];
      let hasAccess = false;

      if (resourceType === 'maintenance') {
        // Para manutenções, tanto cliente quanto mecânico podem acessar
        hasAccess = resource.client_id === userId || resource.mechanic_id === userId;
      } else {
        // Para outros recursos, apenas o proprietário pode acessar
        hasAccess = resource.user_id === userId;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de propriedade:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireMechanic,
  requireClient,
  requireOwnership
}; 