const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const db = require('../config/database');
const { authenticateToken, requireClient } = require('../middleware/auth');
const { sendMaintenanceStatusEmail } = require('../utils/email');

// Listar veículos do cliente
router.get('/vehicles', authenticateToken, requireClient, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT * FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      vehicles: result.rows.map(vehicle => ({
        id: vehicle.id,
        licensePlate: vehicle.license_plate,
        renavam: vehicle.renavam,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        vin: vehicle.vin,
        fuelType: vehicle.fuel_type,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        createdAt: vehicle.created_at
      }))
    });

  } catch (error) {
    console.error('Erro ao listar veículos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cadastrar novo veículo
router.post('/vehicles', [
  authenticateToken,
  requireClient,
  body('licensePlate').trim().isLength({ min: 6, max: 10 }),
  body('brand').trim().isLength({ min: 2 }),
  body('model').trim().isLength({ min: 2 }),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('color').optional().trim(),
  body('renavam').optional().trim(),
  body('vin').optional().trim(),
  body('fuelType').optional().trim(),
  body('transmission').optional().trim(),
  body('mileage').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const {
      licensePlate,
      brand,
      model,
      year,
      color,
      renavam,
      vin,
      fuelType,
      transmission,
      mileage
    } = req.body;

    // Verificar se já existe um veículo com esta placa para este usuário
    const existingVehicle = await db.query(
      'SELECT id FROM vehicles WHERE license_plate = $1 AND user_id = $2',
      [licensePlate, userId]
    );

    if (existingVehicle.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um veículo cadastrado com esta placa' });
    }

    const result = await db.query(
      `INSERT INTO vehicles (user_id, license_plate, brand, model, year, color, renavam, vin, fuel_type, transmission, mileage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, licensePlate, brand, model, year, color, renavam, vin, fuelType, transmission, mileage]
    );

    const vehicle = result.rows[0];

    res.status(201).json({
      message: 'Veículo cadastrado com sucesso',
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.license_plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        renavam: vehicle.renavam,
        vin: vehicle.vin,
        fuelType: vehicle.fuel_type,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        createdAt: vehicle.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao cadastrar veículo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar veículo
router.put('/vehicles/:id', [
  authenticateToken,
  requireClient,
  body('brand').optional().trim().isLength({ min: 2 }),
  body('model').optional().trim().isLength({ min: 2 }),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('color').optional().trim(),
  body('renavam').optional().trim(),
  body('vin').optional().trim(),
  body('fuelType').optional().trim(),
  body('transmission').optional().trim(),
  body('mileage').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vehicleId = req.params.id;
    const userId = req.user.userId;

    // Verificar se o veículo pertence ao usuário
    const vehicleCheck = await db.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Construir query dinamicamente baseado nos campos fornecidos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        paramCount++;
        updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${paramCount}`);
        values.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
    }

    values.push(vehicleId, userId);
    const query = `
      UPDATE vehicles 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
      RETURNING *
    `;

    const result = await db.query(query, values);
    const vehicle = result.rows[0];

    res.json({
      message: 'Veículo atualizado com sucesso',
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.license_plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        renavam: vehicle.renavam,
        vin: vehicle.vin,
        fuelType: vehicle.fuel_type,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        updatedAt: vehicle.updated_at
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir veículo
router.delete('/vehicles/:id', authenticateToken, requireClient, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user.userId;

    // Verificar se o veículo pertence ao usuário
    const vehicleCheck = await db.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    // Verificar se há manutenções associadas
    const maintenanceCheck = await db.query(
      'SELECT id FROM maintenance_records WHERE vehicle_id = $1',
      [vehicleId]
    );

    if (maintenanceCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um veículo que possui manutenções registradas' 
      });
    }

    await db.query('DELETE FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);

    res.json({ message: 'Veículo excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir veículo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar manutenções do cliente
router.get('/maintenance', authenticateToken, requireClient, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT mr.*, v.license_plate, v.brand, v.model, v.year,
             u.first_name as mechanic_first_name, u.last_name as mechanic_last_name,
             mp.business_name as mechanic_business_name
      FROM maintenance_records mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      JOIN users u ON mr.mechanic_id = u.id
      LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
      WHERE mr.client_id = $1
    `;
    
    const queryParams = [userId];
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
      WHERE mr.client_id = $1
    `;
    
    const countParams = [userId];
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
        mechanicName: row.mechanic_business_name || `${row.mechanic_first_name} ${row.mechanic_last_name}`,
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
router.get('/maintenance/:id', authenticateToken, requireClient, async (req, res) => {
  try {
    const maintenanceId = req.params.id;
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT mr.*, v.license_plate, v.brand, v.model, v.year, v.color,
              u.first_name as mechanic_first_name, u.last_name as mechanic_last_name,
              u.email as mechanic_email, u.phone as mechanic_phone,
              mp.business_name as mechanic_business_name, mp.address as mechanic_address,
              mp.city as mechanic_city, mp.state as mechanic_state
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.mechanic_id = u.id
       LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
       WHERE mr.id = $1 AND mr.client_id = $2`,
      [maintenanceId, userId]
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
        mechanicName: maintenance.mechanic_business_name || `${maintenance.mechanic_first_name} ${maintenance.mechanic_last_name}`,
        mechanicEmail: maintenance.mechanic_email,
        mechanicPhone: maintenance.mechanic_phone,
        mechanicAddress: maintenance.mechanic_address,
        mechanicCity: maintenance.mechanic_city,
        mechanicState: maintenance.mechanic_state,
        createdAt: maintenance.created_at,
        evidence: evidenceResult.rows
      }
    });

  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar manutenção
router.put('/maintenance/:id/approve', [
  authenticateToken,
  requireClient,
  body('clientNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const maintenanceId = req.params.id;
    const userId = req.user.userId;
    const { clientNotes } = req.body;

    // Verificar se a manutenção pertence ao cliente e está pendente
    const maintenanceCheck = await db.query(
      'SELECT id, status FROM maintenance_records WHERE id = $1 AND client_id = $2',
      [maintenanceId, userId]
    );

    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    if (maintenanceCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Apenas manutenções pendentes podem ser aprovadas' });
    }

    // Aprovar manutenção
    const result = await db.query(
      `UPDATE maintenance_records 
       SET status = 'approved', approval_date = CURRENT_TIMESTAMP, client_notes = $1
       WHERE id = $2 AND client_id = $3
       RETURNING *`,
      [clientNotes, maintenanceId, userId]
    );

    const maintenance = result.rows[0];

    // Buscar informações para o email
    const emailData = await db.query(
      `SELECT mr.*, v.brand, v.model, v.license_plate,
              u.email as mechanic_email,
              mp.business_name as mechanic_business_name
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.mechanic_id = u.id
       LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
       WHERE mr.id = $1`,
      [maintenanceId]
    );

    const emailInfo = emailData.rows[0];

    // Enviar email de notificação para o mecânico
    try {
      const maintenanceData = {
        vehicle_make: emailInfo.brand,
        vehicle_model: emailInfo.model,
        vehicle_plate: emailInfo.license_plate,
        service_description: emailInfo.service_type,
        total_value: emailInfo.total_amount,
        maintenance_date: emailInfo.maintenance_date,
        client_name: `${req.user.firstName} ${req.user.lastName}`
      };
      
      await sendMaintenanceStatusEmail(emailInfo.mechanic_email, maintenanceData, 'approved');
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não falhar a operação se o email não for enviado
    }

    res.json({
      message: 'Manutenção aprovada com sucesso',
      maintenance: {
        id: maintenance.id,
        status: maintenance.status,
        approvalDate: maintenance.approval_date
      }
    });

  } catch (error) {
    console.error('Erro ao aprovar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rejeitar manutenção
router.put('/maintenance/:id/reject', [
  authenticateToken,
  requireClient,
  body('rejectionReason').trim().isLength({ min: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const maintenanceId = req.params.id;
    const userId = req.user.userId;
    const { rejectionReason } = req.body;

    // Verificar se a manutenção pertence ao cliente e está pendente
    const maintenanceCheck = await db.query(
      'SELECT id, status FROM maintenance_records WHERE id = $1 AND client_id = $2',
      [maintenanceId, userId]
    );

    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    if (maintenanceCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Apenas manutenções pendentes podem ser rejeitadas' });
    }

    // Rejeitar manutenção
    const result = await db.query(
      `UPDATE maintenance_records 
       SET status = 'rejected', rejection_date = CURRENT_TIMESTAMP, rejection_reason = $1
       WHERE id = $2 AND client_id = $3
       RETURNING *`,
      [rejectionReason, maintenanceId, userId]
    );

    const maintenance = result.rows[0];

    // Buscar informações para o email
    const emailData = await db.query(
      `SELECT mr.*, v.brand, v.model, v.license_plate,
              u.email as mechanic_email,
              mp.business_name as mechanic_business_name
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.mechanic_id = u.id
       LEFT JOIN mechanic_profiles mp ON u.id = mp.user_id
       WHERE mr.id = $1`,
      [maintenanceId]
    );

    const emailInfo = emailData.rows[0];

    // Enviar email de notificação para o mecânico
    try {
      const maintenanceData = {
        vehicle_make: emailInfo.brand,
        vehicle_model: emailInfo.model,
        vehicle_plate: emailInfo.license_plate,
        service_description: emailInfo.service_type,
        total_value: emailInfo.total_amount,
        maintenance_date: emailInfo.maintenance_date,
        client_name: `${req.user.firstName} ${req.user.lastName}`,
        rejection_reason: rejectionReason
      };
      
      await sendMaintenanceStatusEmail(emailInfo.mechanic_email, maintenanceData, 'rejected');
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Não falhar a operação se o email não for enviado
    }

    res.json({
      message: 'Manutenção rejeitada com sucesso',
      maintenance: {
        id: maintenance.id,
        status: maintenance.status,
        rejectionDate: maintenance.rejection_date,
        rejectionReason: maintenance.rejection_reason
      }
    });

  } catch (error) {
    console.error('Erro ao rejeitar manutenção:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Avaliar mecânico (apenas após aprovação)
router.post('/maintenance/:id/review', [
  authenticateToken,
  requireClient,
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const maintenanceId = req.params.id;
    const userId = req.user.userId;
    const { rating, comment } = req.body;

    // Verificar se a manutenção foi aprovada pelo cliente
    const maintenanceCheck = await db.query(
      'SELECT id, status, mechanic_id FROM maintenance_records WHERE id = $1 AND client_id = $2',
      [maintenanceId, userId]
    );

    if (maintenanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada' });
    }

    if (maintenanceCheck.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Apenas manutenções aprovadas podem ser avaliadas' });
    }

    const mechanicId = maintenanceCheck.rows[0].mechanic_id;

    // Verificar se já existe uma avaliação
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE maintenance_id = $1 AND client_id = $2',
      [maintenanceId, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Esta manutenção já foi avaliada' });
    }

    // Criar avaliação
    const result = await db.query(
      `INSERT INTO reviews (maintenance_id, client_id, mechanic_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [maintenanceId, userId, mechanicId, rating, comment]
    );

    const review = result.rows[0];

    res.status(201).json({
      message: 'Avaliação enviada com sucesso',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 