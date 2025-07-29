const express = require('express');
const router = express.Router();
const fipeCacheService = require('../utils/fipeCache');
const db = require('../config/database');

// GET /api/fipe/years - Listar anos disponíveis
router.get('/years', async (req, res) => {
  try {
    const years = await fipeCacheService.getYears();
    res.json({
      success: true,
      data: years,
      message: 'Anos carregados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar anos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar anos'
    });
  }
});

// GET /api/fipe/brands - Listar marcas de carros por ano
router.get('/brands', async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Ano é obrigatório',
        message: 'É necessário informar o ano para buscar as marcas'
      });
    }
    
    const brands = await fipeCacheService.getBrandsByYear(year);
    res.json({
      success: true,
      data: brands,
      message: 'Marcas carregadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar marcas de carros'
    });
  }
});

// GET /api/fipe/brands/:brandId/models - Listar modelos de uma marca por ano
router.get('/brands/:brandId/models', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({
        success: false,
        error: 'Ano é obrigatório',
        message: 'É necessário informar o ano para buscar os modelos'
      });
    }
    
    const models = await fipeCacheService.getModelsByYearAndBrand(year, brandId);
    res.json({
      success: true,
      data: { modelos: models },
      message: 'Modelos carregados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar modelos de carros'
    });
  }
});

// GET /api/fipe/brands/:brandId/models/:modelId/years/:yearId/value - Buscar valor FIPE
router.get('/brands/:brandId/models/:modelId/years/:yearId/value', async (req, res) => {
  try {
    const { brandId, modelId, yearId } = req.params;
    
    // Extrair o ano do yearId (formato: "2024" ou "2024-1")
    const year = yearId.split('-')[0];
    
    const value = await fipeCacheService.getValueByYearBrandModel(year, brandId, modelId);
    
    // Formatar resposta para manter compatibilidade
    const formattedValue = {
      Valor: value.valor,
      Marca: value.marca,
      Modelo: value.modelo,
      AnoModelo: value.ano_modelo,
      Combustivel: value.combustivel,
      CodigoFipe: value.codigo_fipe,
      MesReferencia: value.mes_referencia,
      TipoVeiculo: value.tipo_veiculo,
      SiglaCombustivel: value.sigla_combustivel,
      DataConsulta: value.data_consulta
    };
    
    res.json({
      success: true,
      data: formattedValue,
      message: 'Valor FIPE encontrado'
    });
  } catch (error) {
    console.error('Erro ao buscar valor:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar valor FIPE'
    });
  }
});

// GET /api/fipe/vehicle/:plate - Buscar informações por placa
router.get('/vehicle/:plate', async (req, res) => {
  try {
    const { plate } = req.params;
    const vehicle = await fipeService.getVehicleByPlate(plate);
    res.json({
      success: true,
      data: vehicle,
      message: 'Informações do veículo carregadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar veículo por placa:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar informações do veículo'
    });
  }
});

// GET /api/fipe/brands/:brandId/models/:modelId/years/:yearId/history - Histórico de valores
router.get('/brands/:brandId/models/:modelId/years/:yearId/history', async (req, res) => {
  try {
    const { brandId, modelId, yearId } = req.params;
    const history = await fipeService.getValueHistory(brandId, modelId, yearId);
    res.json({
      success: true,
      data: history,
      message: 'Histórico de valores carregado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar histórico de valores'
    });
  }
});

// POST /api/fipe/search - Busca completa de veículo
router.post('/search', async (req, res) => {
  try {
    const { brandId, modelId, yearId } = req.body;
    
    if (!brandId || !modelId || !yearId) {
      return res.status(400).json({
        success: false,
        message: 'brandId, modelId e yearId são obrigatórios'
      });
    }

    const value = await fipeService.getCarValue(brandId, modelId, yearId);
    const history = await fipeService.getValueHistory(brandId, modelId, yearId);
    
    res.json({
      success: true,
      data: {
        value,
        history: history.data,
        searchDate: new Date().toISOString()
      },
      message: 'Busca completa realizada com sucesso'
    });
  } catch (error) {
    console.error('Erro na busca completa:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao realizar busca completa'
    });
  }
});

// POST /api/fipe/update - Forçar atualização do cache
router.post('/update', async (req, res) => {
  try {
    console.log('🔄 Iniciando atualização forçada da FIPE...');
    const stats = await fipeCacheService.performFullUpdate();
    res.json({
      success: true,
      data: stats,
      message: 'Atualização da FIPE concluída com sucesso'
    });
  } catch (error) {
    console.error('Erro na atualização da FIPE:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao atualizar dados da FIPE'
    });
  }
});

// GET /api/fipe/cache/stats - Estatísticas do cache
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await fipeCacheService.getCacheStats();
    res.json({
      success: true,
      data: stats,
      message: 'Estatísticas do cache carregadas'
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar estatísticas do cache'
    });
  }
});

// GET /api/fipe/cache/status - Status da última atualização
router.get('/cache/status', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM fipe_updates ORDER BY last_update DESC LIMIT 1'
    );
    
    const needsUpdate = await fipeCacheService.needsUpdate();
    
    res.json({
      success: true,
      data: {
        lastUpdate: result.rows[0] || null,
        needsUpdate,
        nextUpdate: needsUpdate ? 'Agora' : 'Em 24 horas'
      },
      message: 'Status do cache carregado'
    });
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao buscar status do cache'
    });
  }
});

module.exports = router; 