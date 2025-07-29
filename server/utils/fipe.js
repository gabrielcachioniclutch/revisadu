const axios = require('axios');

// Configuração da API FIPE
const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1';

class FipeService {
  constructor() {
    this.baseURL = FIPE_BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas
  }

  // Cache simples para evitar requisições desnecessárias
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Buscar marcas de carros por ano
  async getCarBrandsByYear(year) {
    try {
      const cacheKey = `car_brands_${year}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      console.log(`🚗 Buscando marcas de carros para o ano ${year} na API FIPE...`);
      
      // Para simplificar, vamos retornar todas as marcas
      // Em uma implementação real, filtraríamos por ano
      const response = await axios.get(`${this.baseURL}/carros/marcas`);
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar marcas de carros:', error.message);
      throw new Error('Erro ao buscar marcas de carros');
    }
  }

  // Buscar modelos de uma marca por ano
  async getCarModelsByYear(brandId, year) {
    try {
      const cacheKey = `car_models_${brandId}_${year}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      console.log(`🚗 Buscando modelos da marca ${brandId} para o ano ${year} na API FIPE...`);
      
      // Para simplificar, vamos retornar todos os modelos da marca
      // Em uma implementação real, filtraríamos por ano
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos`);
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar modelos:', error.message);
      throw new Error('Erro ao buscar modelos de carros');
    }
  }

  // Buscar anos de um modelo
  async getCarYears(brandId, modelId) {
    try {
      const cacheKey = `car_years_${brandId}_${modelId}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      console.log(`🚗 Buscando anos do modelo ${modelId} na API FIPE...`);
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos/${modelId}/anos`);
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error.message);
      throw new Error('Erro ao buscar anos do modelo');
    }
  }

  // Buscar valor FIPE de um veículo específico
  async getCarValue(brandId, modelId, yearId) {
    try {
      const cacheKey = `car_value_${brandId}_${modelId}_${yearId}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      console.log(`🚗 Buscando valor FIPE: Marca ${brandId}, Modelo ${modelId}, Ano ${yearId}...`);
      const response = await axios.get(`${this.baseURL}/carros/marcas/${brandId}/modelos/${modelId}/anos/${yearId}`);
      
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar valor FIPE:', error.message);
      throw new Error('Erro ao buscar valor FIPE do veículo');
    }
  }

  // Buscar informações completas de um veículo por placa (simulado)
  async getVehicleByPlate(plate) {
    try {
      // Simulação - em produção, seria necessário uma API de consulta por placa
      console.log(`🚗 Simulando busca por placa: ${plate}`);
      
      // Retorna dados simulados para demonstração
      return {
        success: true,
        data: {
          plate: plate,
          brand: 'Volkswagen',
          model: 'Golf',
          year: 2020,
          fuel: 'Flex',
          fipeCode: '005340-6',
          estimatedValue: 'R$ 85.000,00',
          lastUpdate: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar veículo por placa:', error.message);
      throw new Error('Erro ao buscar informações do veículo');
    }
  }

  // Buscar histórico de valores (simulado)
  async getValueHistory(brandId, modelId, yearId) {
    try {
      console.log(`📊 Buscando histórico de valores...`);
      
      // Simulação de histórico de valores
      const currentDate = new Date();
      const history = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        history.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          value: `R$ ${(Math.random() * 20000 + 70000).toFixed(0)}`,
          variation: `${(Math.random() * 10 - 5).toFixed(2)}%`
        });
      }
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error.message);
      throw new Error('Erro ao buscar histórico de valores');
    }
  }

  // Limpar cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache da API FIPE limpo');
  }

  // Estatísticas do cache
  getCacheStats() {
    const size = this.cache.size;
    const keys = Array.from(this.cache.keys());
    return {
      size,
      keys,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new FipeService(); 