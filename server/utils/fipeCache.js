const axios = require('axios');
const db = require('../config/database');

// Configuração da API FIPE
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

class FipeCacheService {
  constructor() {
    this.baseURL = FIPE_BASE_URL;
  }

  // Verificar se precisa atualizar (uma vez por dia)
  async needsUpdate() {
    try {
      const result = await db.query(
        'SELECT last_update FROM fipe_updates ORDER BY last_update DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        return true; // Primeira execução
      }

      const lastUpdate = new Date(result.rows[0].last_update);
      const now = new Date();
      const diffHours = (now - lastUpdate) / (1000 * 60 * 60);

      // Atualizar se passou mais de 24 horas
      return diffHours >= 24;
    } catch (error) {
      console.error('❌ Erro ao verificar necessidade de atualização:', error);
      return true; // Em caso de erro, atualizar
    }
  }

  // Registrar início da atualização
  async startUpdate() {
    try {
      await db.query(
        'INSERT INTO fipe_updates (status, last_update) VALUES ($1, $2)',
        ['running', new Date()]
      );
    } catch (error) {
      console.error('❌ Erro ao registrar início da atualização:', error);
    }
  }

  // Registrar fim da atualização
  async finishUpdate(stats, error = null) {
    try {
      await db.query(
        `UPDATE fipe_updates 
         SET status = $1, total_brands = $2, total_models = $3, 
             total_years = $4, total_values = $5, error_message = $6
         WHERE id = (SELECT id FROM fipe_updates ORDER BY created_at DESC LIMIT 1)`,
        [
          error ? 'error' : 'completed',
          stats.brands || 0,
          stats.models || 0,
          stats.years || 0,
          stats.values || 0,
          error
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao registrar fim da atualização:', error);
    }
  }

  // Limpar dados antigos
  async clearOldData() {
    try {
      console.log('🧹 Limpando dados antigos da FIPE...');
      await db.query('DELETE FROM fipe_values');
      await db.query('DELETE FROM fipe_years');
      await db.query('DELETE FROM fipe_models');
      await db.query('DELETE FROM fipe_brands');
      console.log('✅ Dados antigos removidos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados antigos:', error);
      throw error;
    }
  }

  // Buscar e salvar marcas
  async fetchAndSaveBrands() {
    try {
      console.log('🚗 Buscando marcas na API FIPE...');
      const response = await axios.get(`${this.baseURL}/carros/marcas`);
      const brands = response.data;

      console.log(`📝 Salvando ${brands.length} marcas...`);
      for (const brand of brands) {
        await db.query(
          'INSERT INTO fipe_brands (codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO UPDATE SET nome = $2',
          [brand.codigo, brand.nome]
        );
      }

      return brands.length;
    } catch (error) {
      console.error('❌ Erro ao buscar/salvar marcas:', error);
      throw error;
    }
  }

  // Buscar e salvar modelos de uma marca
  async fetchAndSaveModels(brandId, brandName) {
    try {
      console.log(`🚗 Buscando modelos da marca ${brandName}...`);
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos`);
      const models = response.data.modelos;

      console.log(`📝 Salvando ${models.length} modelos da marca ${brandName}...`);
      for (const model of models) {
        await db.query(
          'INSERT INTO fipe_models (brand_id, codigo, nome) VALUES ((SELECT id FROM fipe_brands WHERE codigo = $1), $2, $3) ON CONFLICT (brand_id, codigo) DO UPDATE SET nome = $3',
          [brandId, model.codigo, model.nome]
        );
      }

      return models.length;
    } catch (error) {
      console.error(`❌ Erro ao buscar/salvar modelos da marca ${brandName}:`, error);
      return 0; // Continuar com outras marcas
    }
  }

  // Buscar e salvar anos de um modelo
  async fetchAndSaveYears(brandId, modelId, modelName) {
    try {
      console.log(`🚗 Buscando anos do modelo ${modelName}...`);
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos/${modelId}/anos`);
      const years = response.data;

      console.log(`📝 Salvando ${years.length} anos do modelo ${modelName}...`);
      for (const year of years) {
        await db.query(
          'INSERT INTO fipe_years (model_id, codigo, nome) VALUES ((SELECT id FROM fipe_models WHERE brand_id = (SELECT id FROM fipe_brands WHERE codigo = $1) AND codigo = $2), $3, $4) ON CONFLICT (model_id, codigo) DO UPDATE SET nome = $4',
          [brandId, modelId, year.codigo, year.nome]
        );
      }

      return years.length;
    } catch (error) {
      console.error(`❌ Erro ao buscar/salvar anos do modelo ${modelName}:`, error);
      return 0; // Continuar com outros modelos
    }
  }

  // Buscar e salvar valor de um veículo específico
  async fetchAndSaveValue(brandId, modelId, yearId, yearName) {
    try {
      console.log(`💰 Buscando valor para ${yearName}...`);
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos/${modelId}/anos/${yearId}`);
      const value = response.data;

      await db.query(
        `INSERT INTO fipe_values (year_id, valor, marca, modelo, ano_modelo, combustivel, codigo_fipe, mes_referencia, tipo_veiculo, sigla_combustivel)
         VALUES ((SELECT id FROM fipe_years WHERE model_id = (SELECT id FROM fipe_models WHERE brand_id = (SELECT id FROM fipe_brands WHERE codigo = $1) AND codigo = $2) AND codigo = $3), $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (year_id) DO UPDATE SET 
         valor = $4, marca = $5, modelo = $6, ano_modelo = $7, combustivel = $8, 
         codigo_fipe = $9, mes_referencia = $10, tipo_veiculo = $11, sigla_combustivel = $12, data_consulta = CURRENT_TIMESTAMP`,
        [
          brandId, modelId, yearId,
          value.Valor, value.Marca, value.Modelo, value.AnoModelo,
          value.Combustivel, value.CodigoFipe, value.MesReferencia,
          value.TipoVeiculo, value.SiglaCombustivel
        ]
      );

      return 1;
    } catch (error) {
      console.error(`❌ Erro ao buscar/salvar valor para ${yearName}:`, error);
      return 0; // Continuar com outros anos
    }
  }

  // Executar atualização completa
  async performFullUpdate() {
    const stats = { brands: 0, models: 0, years: 0, values: 0 };
    
    try {
      console.log('🔄 Iniciando atualização completa da FIPE...');
      await this.startUpdate();
      await this.clearOldData();

      // 1. Buscar e salvar marcas
      stats.brands = await this.fetchAndSaveBrands();

      // 2. Buscar marcas salvas para processar modelos
      const brandsResult = await db.query('SELECT codigo, nome FROM fipe_brands ORDER BY nome');
      const brands = brandsResult.rows;

      // 3. Para cada marca, buscar modelos (limitado para teste)
      for (let i = 0; i < Math.min(brands.length, 10); i++) {
        const brand = brands[i];
        const modelCount = await this.fetchAndSaveModels(brand.codigo, brand.nome);
        stats.models += modelCount;

        // 4. Buscar modelos desta marca
        const modelsResult = await db.query(
          'SELECT codigo, nome FROM fipe_models WHERE brand_id = (SELECT id FROM fipe_brands WHERE codigo = $1) ORDER BY nome LIMIT 5',
          [brand.codigo]
        );
        const models = modelsResult.rows;

        // 5. Para cada modelo, buscar anos (limitado para teste)
        for (const model of models) {
          const yearCount = await this.fetchAndSaveYears(brand.codigo, model.codigo, model.nome);
          stats.years += yearCount;

          // 6. Buscar anos deste modelo
          const yearsResult = await db.query(
            'SELECT codigo, nome FROM fipe_years WHERE model_id = (SELECT id FROM fipe_models WHERE brand_id = (SELECT id FROM fipe_brands WHERE codigo = $1) AND codigo = $2) ORDER BY nome LIMIT 3',
            [brand.codigo, model.codigo]
          );
          const years = yearsResult.rows;

          // 7. Para cada ano, buscar valor (limitado para teste)
          for (const year of years) {
            const valueCount = await this.fetchAndSaveValue(brand.codigo, model.codigo, year.codigo, year.nome);
            stats.values += valueCount;
          }
        }
      }

      console.log('✅ Atualização completa finalizada:', stats);
      await this.finishUpdate(stats);
      return stats;

    } catch (error) {
      console.error('❌ Erro na atualização completa:', error);
      await this.finishUpdate(stats, error.message);
      throw error;
    }
  }

  // Buscar anos disponíveis (do cache local)
  async getYears() {
    try {
      const result = await db.query(
        'SELECT DISTINCT ano_modelo as codigo, ano_modelo::text as nome FROM fipe_values ORDER BY ano_modelo DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error);
      throw error;
    }
  }

  // Buscar marcas por ano (do cache local)
  async getBrandsByYear(year) {
    try {
      const result = await db.query(
        `SELECT DISTINCT b.codigo, b.nome 
         FROM fipe_brands b 
         INNER JOIN fipe_models m ON b.id = m.brand_id 
         INNER JOIN fipe_years y ON m.id = y.model_id 
         INNER JOIN fipe_values v ON y.id = v.year_id 
         WHERE v.ano_modelo = $1 
         ORDER BY b.nome`,
        [year]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar marcas por ano:', error);
      throw error;
    }
  }

  // Buscar modelos por ano e marca (do cache local)
  async getModelsByYearAndBrand(year, brandId) {
    try {
      const result = await db.query(
        `SELECT DISTINCT m.codigo, m.nome 
         FROM fipe_models m 
         INNER JOIN fipe_years y ON m.id = y.model_id 
         INNER JOIN fipe_values v ON y.id = v.year_id 
         WHERE v.ano_modelo = $1 AND m.brand_id = (SELECT id FROM fipe_brands WHERE codigo = $2)
         ORDER BY m.nome`,
        [year, brandId]
      );
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar modelos por ano e marca:', error);
      throw error;
    }
  }

  // Buscar valor por ano, marca e modelo (do cache local)
  async getValueByYearBrandModel(year, brandId, modelId) {
    try {
      const result = await db.query(
        `SELECT v.* 
         FROM fipe_values v 
         INNER JOIN fipe_years y ON v.year_id = y.id 
         INNER JOIN fipe_models m ON y.model_id = m.id 
         INNER JOIN fipe_brands b ON m.brand_id = b.id 
         WHERE v.ano_modelo = $1 AND b.codigo = $2 AND m.codigo = $3`,
        [year, brandId, modelId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Valor não encontrado');
      }

      return result.rows[0];
    } catch (error) {
      console.error('❌ Erro ao buscar valor:', error);
      throw error;
    }
  }

  // Estatísticas do cache
  async getCacheStats() {
    try {
      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM fipe_brands) as total_brands,
          (SELECT COUNT(*) FROM fipe_models) as total_models,
          (SELECT COUNT(*) FROM fipe_years) as total_years,
          (SELECT COUNT(*) FROM fipe_values) as total_values,
          (SELECT last_update FROM fipe_updates ORDER BY last_update DESC LIMIT 1) as last_update
      `);
      
      return stats.rows[0];
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
}

module.exports = new FipeCacheService(); 