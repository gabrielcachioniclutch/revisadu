const express = require('express');
const router = express.Router();

const db = require('../config/database');

// Buscar manutenção por token (para aprovação pública)
router.get('/approve/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Em uma implementação real, você usaria um token único para cada manutenção
    // Por enquanto, vamos usar o ID da manutenção como exemplo
    const maintenanceId = token;

    const result = await db.query(
      `SELECT mr.*, v.license_plate, v.brand, v.model, v.year, v.color,
              u.first_name as client_first_name, u.last_name as client_last_name,
              u.email as client_email,
              m.first_name as mechanic_first_name, m.last_name as mechanic_last_name,
              mp.business_name as mechanic_business_name, mp.address as mechanic_address,
              mp.city as mechanic_city, mp.state as mechanic_state
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       JOIN users u ON mr.client_id = u.id
       JOIN users m ON mr.mechanic_id = m.id
       LEFT JOIN mechanic_profiles mp ON m.id = mp.user_id
       WHERE mr.id = $1 AND mr.status = 'pending'`,
      [maintenanceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada ou já processada' });
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
        mechanicNotes: maintenance.mechanic_notes,
        licensePlate: maintenance.license_plate,
        brand: maintenance.brand,
        model: maintenance.model,
        year: maintenance.year,
        color: maintenance.color,
        clientName: `${maintenance.client_first_name} ${maintenance.client_last_name}`,
        clientEmail: maintenance.client_email,
        mechanicName: maintenance.mechanic_business_name || `${maintenance.mechanic_first_name} ${maintenance.mechanic_last_name}`,
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

// Buscar estatísticas de manutenção (público)
router.get('/stats', async (req, res) => {
  try {
    // Total de manutenções
    const totalMaintenance = await db.query(
      'SELECT COUNT(*) as total FROM maintenance_records'
    );

    // Manutenções por status
    const statusStats = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM maintenance_records 
       GROUP BY status`
    );

    // Top mecânicos por avaliação
    const topMechanics = await db.query(
      `SELECT mp.business_name, mp.average_rating, mp.total_ratings, mp.total_services
       FROM mechanic_profiles mp
       WHERE mp.average_rating > 0
       ORDER BY mp.average_rating DESC, mp.total_ratings DESC
       LIMIT 10`
    );

    // Manutenções por mês (últimos 12 meses)
    const monthlyStats = await db.query(
      `SELECT 
         DATE_TRUNC('month', created_at) as month,
         COUNT(*) as count,
         SUM(total_amount) as total_amount
       FROM maintenance_records 
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`
    );

    res.json({
      stats: {
        totalMaintenance: parseInt(totalMaintenance.rows[0].total),
        statusBreakdown: statusStats.rows,
        topMechanics: topMechanics.rows,
        monthlyStats: monthlyStats.rows.map(row => ({
          month: row.month,
          count: parseInt(row.count),
          totalAmount: parseFloat(row.total_amount || 0)
        }))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar mecânicos (público)
router.get('/mechanics', async (req, res) => {
  try {
    const { city, state, service, rating, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT mp.*, u.first_name, u.last_name, u.email, u.phone
      FROM mechanic_profiles mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.is_verified = TRUE
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (city) {
      paramCount++;
      query += ` AND LOWER(mp.city) = LOWER($${paramCount})`;
      queryParams.push(city);
    }

    if (state) {
      paramCount++;
      query += ` AND LOWER(mp.state) = LOWER($${paramCount})`;
      queryParams.push(state);
    }

    if (service) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(mp.services_offered)`;
      queryParams.push(service);
    }

    if (rating) {
      paramCount++;
      query += ` AND mp.average_rating >= $${paramCount}`;
      queryParams.push(parseFloat(rating));
    }

    query += ` ORDER BY mp.average_rating DESC, mp.total_ratings DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await db.query(query, queryParams);

    // Contar total
    let countQuery = `
      SELECT COUNT(*) as total
      FROM mechanic_profiles mp
      WHERE mp.is_verified = TRUE
    `;
    
    const countParams = [];
    paramCount = 0;

    if (city) {
      paramCount++;
      countQuery += ` AND LOWER(mp.city) = LOWER($${paramCount})`;
      countParams.push(city);
    }

    if (state) {
      paramCount++;
      countQuery += ` AND LOWER(mp.state) = LOWER($${paramCount})`;
      countParams.push(state);
    }

    if (service) {
      paramCount++;
      countQuery += ` AND $${paramCount} = ANY(mp.services_offered)`;
      countParams.push(service);
    }

    if (rating) {
      paramCount++;
      countQuery += ` AND mp.average_rating >= $${paramCount}`;
      countParams.push(parseFloat(rating));
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      mechanics: result.rows.map(row => ({
        id: row.id,
        businessName: row.business_name,
        address: row.address,
        city: row.city,
        state: row.state,
        phone: row.phone,
        website: row.website,
        description: row.description,
        servicesOffered: row.services_offered,
        averageRating: row.average_rating,
        totalRatings: row.total_ratings,
        totalServices: row.total_services,
        isVerified: row.is_verified,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar mecânicos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar avaliações de um mecânico (público)
router.get('/mechanics/:id/reviews', async (req, res) => {
  try {
    const mechanicId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verificar se o mecânico existe
    const mechanicCheck = await db.query(
      'SELECT id FROM mechanic_profiles WHERE id = $1',
      [mechanicId]
    );

    if (mechanicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Mecânico não encontrado' });
    }

    const result = await db.query(
      `SELECT r.*, u.first_name, u.last_name, mr.title as maintenance_title
       FROM reviews r
       JOIN users u ON r.client_id = u.id
       JOIN maintenance_records mr ON r.maintenance_id = mr.id
       WHERE r.mechanic_id = (SELECT user_id FROM mechanic_profiles WHERE id = $1)
       AND r.is_public = TRUE
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [mechanicId, limit, offset]
    );

    // Contar total
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM reviews r
       WHERE r.mechanic_id = (SELECT user_id FROM mechanic_profiles WHERE id = $1)
       AND r.is_public = TRUE`,
      [mechanicId]
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      reviews: result.rows.map(row => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        clientName: `${row.first_name} ${row.last_name}`,
        maintenanceTitle: row.maintenance_title,
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
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 