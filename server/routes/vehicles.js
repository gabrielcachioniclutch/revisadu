const express = require('express');
const router = express.Router();

const db = require('../config/database');

// Buscar informações de veículo por placa (público)
router.get('/info/:licensePlate', async (req, res) => {
  try {
    const licensePlate = req.params.licensePlate;

    const result = await db.query(
      'SELECT brand, model, year, color FROM vehicles WHERE license_plate = $1 LIMIT 1',
      [licensePlate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Veículo não encontrado' });
    }

    res.json({
      vehicle: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar marcas de veículos (público)
router.get('/brands', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT brand FROM vehicles WHERE brand IS NOT NULL ORDER BY brand'
    );

    res.json({
      brands: result.rows.map(row => row.brand)
    });

  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar modelos por marca (público)
router.get('/models/:brand', async (req, res) => {
  try {
    const brand = req.params.brand;

    const result = await db.query(
      'SELECT DISTINCT model FROM vehicles WHERE brand = $1 AND model IS NOT NULL ORDER BY model',
      [brand]
    );

    res.json({
      models: result.rows.map(row => row.model)
    });

  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 