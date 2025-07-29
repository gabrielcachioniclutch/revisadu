const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const db = require('../config/database');
const { authenticateToken, requireMechanic } = require('../middleware/auth');
const { sendMaintenanceApprovalEmail } = require('../utils/email');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens e documentos são permitidos'));
    }
  }
});

// Obter perfil do mecânico
router.get('/profile', authenticateToken, requireMechanic, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT mp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
       FROM mechanic_profiles mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    const profile = result.rows[0];

    res.json({
      profile: {
        id: profile.id,
        businessName: profile.business_name,
        cnpj: profile.cnpj,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zip_code,
        phone: profile.phone,
        website: profile.website,
        description: profile.description,
        workingHours: profile.working_hours,
        servicesOffered: profile.services_offered,
        averageRating: profile.average_rating,
        totalRatings: profile.total_ratings,
        totalServices: profile.total_services,
        isVerified: profile.is_verified,
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: profile.email,
        avatarUrl: profile.avatar_url
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do mecânico
router.put('/profile', [
  authenticateToken,
  requireMechanic,
  body('businessName').trim().isLength({ min: 2 }),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().isLength({ min: 2, max: 2 }),
  body('zipCode').optional().trim(),
  body('phone').optional().isMobilePhone('pt-BR'),
  body('website').optional().isURL(),
  body('description').optional().trim(),
  body('servicesOffered').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const {
      businessName,
      cnpj,
      address,
      city,
      state,
      zipCode,
      phone,
      website,
      description,
      workingHours,
      servicesOffered
    } = req.body;

    // Verificar se o perfil já existe
    const existingProfile = await db.query(
      'SELECT id FROM mechanic_profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      // Atualizar perfil existente
      const result = await db.query(
        `UPDATE mechanic_profiles 
         SET business_name = $1, cnpj = $2, address = $3, city = $4, state = $5, 
             zip_code = $6, phone = $7, website = $8, description = $9, 
             working_hours = $10, services_offered = $11
         WHERE user_id = $12
         RETURNING *`,
        [businessName, cnpj, address, city, state, zipCode, phone, website, 
         description, workingHours, servicesOffered, userId]
      );

      res.json({
        message: 'Perfil atualizado com sucesso',
        profile: result.rows[0]
      });
    } else {
      // Criar novo perfil
      const result = await db.query(
        `INSERT INTO mechanic_profiles 
         (user_id, business_name, cnpj, address, city, state, zip_code, phone, 
          website, description, working_hours, services_offered)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [userId, businessName, cnpj, address, city, state, zipCode, phone, 
         website, description, workingHours, servicesOffered]
      );

      res.status(201).json({
        message: 'Perfil criado com sucesso',
        profile: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Registrar nova manutenção
router.post('/maintenance', [
  authenticateToken,
  requireMechanic,
  body('licensePlate').trim().isLength({ min: 6, max: 10 }),
  body('brand').trim().isLength({ min: 2 }),
  body('model').trim().isLength({ min: 2 }),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('clientName').trim().isLength({ min: 2 }),
  body('clientEmail').isEmail().normalizeEmail(),
  body('clientPhone').optional().isMobilePhone('pt-BR'),
  body('serviceType').trim().isLength({ min: 2 }),
  body('description').trim().isLength({ min: 10 }),
  body('totalAmount').isFloat({ min: 0 }),
  body('maintenanceDate').isISO8601(),
  body('mechanicNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mechanicId = req.user.userId;
    const {
      licensePlate,
      brand,
      model,
      year,
      clientName,
      clientEmail,
      clientPhone,
      serviceType,
      description,
      totalAmount,
      maintenanceDate,
      mechanicNotes
    } = req.body;

    // Verificar se o cliente existe ou criar um novo
    let clientId;
    const existingClient = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [clientEmail]
    );

    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      // Criar novo cliente
      const newClient = await db.query(
        `INSERT INTO users (email, first_name, last_name, phone, user_type, email_verified)
         VALUES ($1, $2, $3, $4, 'client', TRUE)
         RETURNING id`,
        [clientEmail, clientName.split(' ')[0], clientName.split(' ').slice(1).join(' ') || '', clientPhone]
      );
      clientId = newClient.rows[0].id;
    }

    // Verificar se o veículo existe ou criar um novo
    let vehicleId;
    const existingVehicle = await db.query(
      'SELECT id FROM vehicles WHERE license_plate = $1 AND user_id = $2',
      [licensePlate, clientId]
    );

    if (existingVehicle.rows.length > 0) {
      vehicleId = existingVehicle.rows[0].id;
    } else {
      // Criar novo veículo
      const newVehicle = await db.query(
        `INSERT INTO vehicles (user_id, license_plate, brand, model, year)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [clientId, licensePlate, brand, model, year]
      );
      vehicleId = newVehicle.rows[0].id;
    }

    // Criar registro de manutenção
    const maintenanceResult = await db.query(
      `INSERT INTO maintenance_records 
       (vehicle_id, mechanic_id, client_id, title, description, service_type, 
        total_amount, maintenance_date, mechanic_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [vehicleId, mechanicId, clientId, `${serviceType} - ${brand} ${model}`, 
       description, serviceType, totalAmount, maintenanceDate, mechanicNotes]
    );

    const maintenance = maintenanceResult.rows[0];

    // Buscar informações do mecânico para o email
    const mechanicInfo = await db.query(
      'SELECT business_name FROM mechanic_profiles WHERE user_id = $1',
      [mechanicId]
    );

    const mechanicName = mechanicInfo.rows.length > 0 
      ? mechanicInfo.rows[0].business_name 
      : 'Mecânico';

    // Enviar email de notificação para o cliente
    try {
      const maintenanceData = {
        vehicle_make: brand,
        vehicle_model: model,
        vehicle_year: year,
        vehicle_plate: licensePlate,
        service_description: description,
        total_value: totalAmount,
        maintenance_date: maintenanceDate,
        mechanic_name: mechanicName
      };
      
      await sendMaintenanceApprovalEmail(clientEmail, maintenanceData, maintenance.id);
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não falhar a operação se o email não for enviado
    }

    res.status(201).json({
      message: 'Manutenção registrada com sucesso. Email de notificação enviado.',
      maintenance: {
        id: maintenance.id,
        title: maintenance.title,
        serviceType: maintenance.service_type,
        totalAmount: maintenance.total_amount,
        maintenanceDate: maintenance.maintenance_date,
        status: maintenance.status
      }
    });

  } catch (error) {
    console.error('Erro ao registrar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de evidências para manutenção
router.post('/maintenance/:id/evidence', [
  authenticateToken,
  requireMechanic
], upload.array('files', 10), async (req, res) => {
  try {
    const maintenanceId = req.params.id;
    const mechanicId = req.user.userId;

    // Verificar se a manutenção pertence ao mecânico
    const maintenanceCheck = await db.query(
      'SELECT id FROM maintenance_records WHERE id = $1 AND mechanic_id = $2',
      [maintenanceId, mechanicId]
    );

    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const evidencePromises = req.files.map(file => {
      return db.query(
        `INSERT INTO maintenance_evidence 
         (maintenance_id, file_name, file_path, file_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, file_name, file_path`,
        [maintenanceId, file.originalname, file.path, file.mimetype, file.size, mechanicId]
      );
    });

    const evidenceResults = await Promise.all(evidencePromises);
    const evidence = evidenceResults.map(result => result.rows[0]);

    res.status(201).json({
      message: 'Evidências enviadas com sucesso',
      evidence: evidence
    });

  } catch (error) {
    console.error('Erro ao enviar evidências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar manutenções do mecânico
router.get('/maintenance', [
  authenticateToken,
  requireMechanic
], async (req, res) => {
  try {
    const mechanicId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT mr.*, v.license_plate, v.brand, v.model, v.year,
             u.first_name as client_first_name, u.last_name as client_last_name,
             u.email as client_email
      FROM maintenance_records mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      JOIN users u ON mr.client_id = u.id
      WHERE mr.mechanic_id = $1
    `;
    
    const queryParams = [mechanicId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND mr.status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ` ORDER BY mr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Contar total de registros
    let countQuery = `
      SELECT COUNT(*) as total
      FROM maintenance_records mr
      WHERE mr.mechanic_id = $1
    `;
    
    const countParams = [mechanicId];
    if (status) {
      countQuery += ` AND mr.status = $2`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      maintenances: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        serviceType: row.service_type,
        totalAmount: row.total_amount,
        maintenanceDate: row.maintenance_date,
        status: row.status,
        licensePlate: row.license_plate,
        brand: row.brand,
        model: row.model,
        year: row.year,
        clientName: `${row.client_first_name} ${row.client_last_name}`,
        clientEmail: row.client_email,
        createdAt: row.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar manutenções:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de uma manutenção específica
router.get('/maintenance/:id', [
  authenticateToken,
  requireMechanic
], async (req, res) => {
  try {
    const maintenanceId = req.params.id;
    const mechanicId = req.user.userId;

    const result = await db.query(
      `SELECT mr.*, v.license_plate, v.brand, v.model, v.year, v.color,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.email as client_email, u.phone as client_phone
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.client_id = u.id
       WHERE mr.id = $1 AND mr.mechanic_id = $2`,
      [maintenanceId, mechanicId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    const maintenance = result.rows[0];

    // Buscar evidências
    const evidenceResult = await db.query(
      'SELECT * FROM maintenance_evidence WHERE maintenance_id = $1 ORDER BY created_at DESC',
      [maintenanceId]
    );

    res.json({
      maintenance: {
        id: maintenance.id,
        title: maintenance.title,
        description: maintenance.description,
        serviceType: maintenance.service_type,
        totalAmount: maintenance.total_amount,
        maintenanceDate: maintenance.maintenance_date,
        status: maintenance.status,
        mechanicNotes: maintenance.mechanic_notes,
        clientNotes: maintenance.client_notes,
        approvalDate: maintenance.approval_date,
        rejectionDate: maintenance.rejection_date,
        rejectionReason: maintenance.rejection_reason,
        licensePlate: maintenance.license_plate,
        brand: maintenance.brand,
        model: maintenance.model,
        year: maintenance.year,
        color: maintenance.color,
        clientName: `${maintenance.client_first_name} ${maintenance.client_last_name}`,
        clientEmail: maintenance.client_email,
        clientPhone: maintenance.client_phone,
        createdAt: maintenance.created_at,
        evidence: evidenceResult.rows
      }
    });

  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 