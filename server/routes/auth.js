const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const router = express.Router();

const db = require('../config/database');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');

// Registro de usuário
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('userType').isIn(['client', 'mechanic']),
  body('phone').optional().isMobilePhone('pt-BR')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, userType, phone } = req.body;

    // Verificar se o email já existe
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Gerar token de verificação de email
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Inserir usuário
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, user_type, phone, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, user_type, email_verified`,
      [email, passwordHash, firstName, lastName, userType, phone, emailVerificationToken]
    );

    const user = result.rows[0];

    // Enviar email de verificação
    await sendVerificationEmail(email, emailVerificationToken, firstName);

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso. Verifique seu email.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        emailVerified: user.email_verified
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = result.rows[0];

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar se email foi verificado
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Email não verificado',
        needsVerification: true 
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      { userId: user.id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        emailVerified: user.email_verified,
        avatarUrl: user.avatar_url
      },
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await db.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE email_verification_token = $1 RETURNING id, email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    res.json({ message: 'Email verificado com sucesso' });

  } catch (error) {
    console.error('Erro na verificação de email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Esqueci minha senha
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Verificar se o usuário existe
    const result = await db.query(
      'SELECT id, first_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Por segurança, não revelar se o email existe ou não
      return res.json({ message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação' });
    }

    const user = result.rows[0];

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hora

    await db.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Enviar email de reset
    await sendPasswordResetEmail(email, resetToken, user.first_name);

    res.json({ message: 'Se o email estiver cadastrado, você receberá as instruções de recuperação' });

  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reset de senha
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Verificar token
    const result = await db.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const user = result.rows[0];

    // Hash da nova senha
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Atualizar senha
    await db.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Senha alterada com sucesso' });

  } catch (error) {
    console.error('Erro no reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login com Google
router.get('/google', (req, res) => {
  // Esta rota será implementada com Passport.js
  res.json({ message: 'Login com Google - Em desenvolvimento' });
});

// Login com Facebook
router.get('/facebook', (req, res) => {
  // Esta rota será implementada com Passport.js
  res.json({ message: 'Login com Facebook - Em desenvolvimento' });
});

// Verificar token (rota protegida)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Token válido',
    user: req.user 
  });
});

// Logout (rota protegida)
router.post('/logout', authenticateToken, (req, res) => {
  // Em uma implementação mais robusta, você pode invalidar o token
  res.json({ message: 'Logout realizado com sucesso' });
});

module.exports = router; 