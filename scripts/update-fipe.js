#!/usr/bin/env node

/**
 * Script para atualização automática da FIPE
 * 
 * Este script deve ser executado uma vez por dia (preferencialmente pela manhã)
 * para atualizar os dados da Tabela FIPE no banco de dados local.
 * 
 * Uso:
 * - Manual: node scripts/update-fipe.js
 * - Cron: 0 6 * * * /usr/bin/node /path/to/revisadu_app/scripts/update-fipe.js
 * - PM2: pm2 start scripts/update-fipe.js --name "fipe-updater" --cron "0 6 * * *"
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://revisadu.com.br/api' 
  : 'http://localhost:5001/api';

async function updateFipe() {
  const startTime = new Date();
  console.log(`🔄 [${startTime.toISOString()}] Iniciando atualização da FIPE...`);

  try {
    // Verificar se o servidor está rodando
    const healthCheck = await axios.get(`${API_BASE_URL}/health`);
    if (!healthCheck.data.status === 'OK') {
      throw new Error('Servidor não está respondendo');
    }

    // Verificar status atual do cache
    const statusResponse = await axios.get(`${API_BASE_URL}/fipe/cache/status`);
    const { needsUpdate } = statusResponse.data.data;

    if (!needsUpdate) {
      console.log('✅ Cache está atualizado. Não é necessário atualizar.');
      return;
    }

    console.log('📊 Cache precisa ser atualizado. Iniciando processo...');

    // Executar atualização
    const updateResponse = await axios.post(`${API_BASE_URL}/fipe/update`);
    const stats = updateResponse.data.data;

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ [${endTime.toISOString()}] Atualização concluída com sucesso!`);
    console.log(`📈 Estatísticas:`);
    console.log(`   - Marcas: ${stats.brands}`);
    console.log(`   - Modelos: ${stats.models}`);
    console.log(`   - Anos: ${stats.years}`);
    console.log(`   - Valores: ${stats.values}`);
    console.log(`⏱️  Duração: ${duration.toFixed(2)} segundos`);

    // Enviar notificação (opcional)
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification(stats, duration);
    }

  } catch (error) {
    const endTime = new Date();
    console.error(`❌ [${endTime.toISOString()}] Erro na atualização da FIPE:`, error.message);
    
    // Enviar notificação de erro (opcional)
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackErrorNotification(error.message);
    }
    
    process.exit(1);
  }
}

async function sendSlackNotification(stats, duration) {
  try {
    const message = {
      text: '🔄 Atualização da FIPE concluída',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*✅ Atualização da FIPE concluída com sucesso!*\n\n` +
                  `📊 *Estatísticas:*\n` +
                  `• Marcas: ${stats.brands}\n` +
                  `• Modelos: ${stats.models}\n` +
                  `• Anos: ${stats.years}\n` +
                  `• Valores: ${stats.values}\n\n` +
                  `⏱️ *Duração:* ${duration.toFixed(2)} segundos`
          }
        }
      ]
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, message);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação Slack:', error.message);
  }
}

async function sendSlackErrorNotification(errorMessage) {
  try {
    const message = {
      text: '❌ Erro na atualização da FIPE',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*❌ Erro na atualização da FIPE*\n\n` +
                  `🔍 *Erro:* ${errorMessage}\n\n` +
                  `⚠️ Verifique os logs do servidor para mais detalhes.`
          }
        }
      ]
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, message);
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de erro Slack:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateFipe()
    .then(() => {
      console.log('🎉 Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { updateFipe }; 