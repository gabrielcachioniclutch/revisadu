const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia e-mail de verificação de conta
 */
const sendVerificationEmail = async (email, token, name) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: 'RevisadU! - Confirme seu e-mail',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirme seu e-mail - RevisadU!</title>
          <style>
            body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #70f3a7 0%, #29b0b4 100%); padding: 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
            .slogan { color: #ffffff; font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
            .message { color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background-color: #70f3a7; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RevisadU!</div>
              <div class="slogan">Sua Revisão, Seu Controle</div>
            </div>
            <div class="content">
              <h1 class="title">Confirme seu e-mail</h1>
              <p class="message">
                Olá ${name}!<br><br>
                Bem-vindo ao RevisadU! Para começar a usar nossa plataforma, 
                precisamos confirmar que este é seu endereço de e-mail.
              </p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Confirmar E-mail</a>
              </div>
              <div class="warning">
                <strong>Importante:</strong> Este link expira em 24 horas. 
                Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br>
                <a href="${verificationUrl}" style="color: #29b0b4;">${verificationUrl}</a>
              </div>
            </div>
            <div class="footer">
              <p>Se você não criou uma conta no RevisadU!, ignore este e-mail.</p>
              <p>&copy; 2024 RevisadU! - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Erro ao enviar e-mail de verificação:', error);
      throw new Error('Falha ao enviar e-mail de verificação');
    }

    console.log('E-mail de verificação enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro no envio de e-mail de verificação:', error);
    throw error;
  }
};

/**
 * Envia e-mail de redefinição de senha
 */
const sendPasswordResetEmail = async (email, token, name) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: 'RevisadU! - Redefinir sua senha',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redefinir Senha - RevisadU!</title>
          <style>
            body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #70f3a7 0%, #29b0b4 100%); padding: 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
            .slogan { color: #ffffff; font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
            .message { color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .button { display: inline-block; background-color: #70f3a7; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RevisadU!</div>
              <div class="slogan">Sua Revisão, Seu Controle</div>
            </div>
            <div class="content">
              <h1 class="title">Redefinir sua senha</h1>
              <p class="message">
                Olá ${name}!<br><br>
                Recebemos uma solicitação para redefinir a senha da sua conta RevisadU!.
                Clique no botão abaixo para criar uma nova senha.
              </p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
              </div>
              <div class="warning">
                <strong>Importante:</strong> Este link expira em 1 hora. 
                Se você não solicitou esta redefinição, ignore este e-mail.<br>
                <a href="${resetUrl}" style="color: #29b0b4;">${resetUrl}</a>
              </div>
            </div>
            <div class="footer">
              <p>Se você não solicitou esta redefinição, sua senha permanecerá inalterada.</p>
              <p>&copy; 2024 RevisadU! - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Erro ao enviar e-mail de redefinição:', error);
      throw new Error('Falha ao enviar e-mail de redefinição');
    }

    console.log('E-mail de redefinição enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro no envio de e-mail de redefinição:', error);
    throw error;
  }
};

/**
 * Envia e-mail de notificação de manutenção para aprovação
 */
const sendMaintenanceApprovalEmail = async (email, maintenanceData, approvalToken) => {
  try {
    const approvalUrl = `${process.env.FRONTEND_URL}/approve-maintenance?token=${approvalToken}`;
    const registrationUrl = `${process.env.FRONTEND_URL}/register?maintenance=${approvalToken}`;
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: `RevisadU!: Aprovação de Manutenção para seu ${maintenanceData.vehicle_model} - Placa ${maintenanceData.vehicle_plate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aprovação de Manutenção - RevisadU!</title>
          <style>
            body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #70f3a7 0%, #29b0b4 100%); padding: 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
            .slogan { color: #ffffff; font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
            .message { color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .maintenance-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .detail-label { font-weight: 600; color: #333333; }
            .detail-value { color: #666666; }
            .buttons { text-align: center; margin: 30px 0; }
            .btn-approve { display: inline-block; background-color: #70f3a7; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px; }
            .btn-register { display: inline-block; background-color: #29b0b4; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RevisadU!</div>
              <div class="slogan">Sua Revisão, Seu Controle</div>
            </div>
            <div class="content">
              <h1 class="title">Manutenção Pendente de Aprovação</h1>
              <p class="message">
                Olá! Uma manutenção foi registrada para seu veículo e aguarda sua aprovação.
                Abaixo estão os detalhes do serviço realizado.
              </p>
              
              <div class="maintenance-details">
                <div class="detail-row">
                  <span class="detail-label">Veículo:</span>
                  <span class="detail-value">${maintenanceData.vehicle_make} ${maintenanceData.vehicle_model} (${maintenanceData.vehicle_year})</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Placa:</span>
                  <span class="detail-value">${maintenanceData.vehicle_plate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Mecânico:</span>
                  <span class="detail-value">${maintenanceData.mechanic_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Serviço:</span>
                  <span class="detail-value">${maintenanceData.service_description}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Valor:</span>
                  <span class="detail-value">R$ ${maintenanceData.total_value.toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Data:</span>
                  <span class="detail-value">${new Date(maintenanceData.maintenance_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div class="buttons">
                <a href="${approvalUrl}" class="btn-approve">Aprovar Manutenção</a>
                <a href="${registrationUrl}" class="btn-register">Criar Conta</a>
              </div>

              <div class="warning">
                <strong>Novo no RevisadU!?</strong> Se você ainda não tem uma conta, 
                clique em "Criar Conta" para se registrar e aprovar esta manutenção.
              </div>
            </div>
            <div class="footer">
              <p>Este link é válido por 7 dias. Após este período, entre em contato com o mecânico.</p>
              <p>&copy; 2024 RevisadU! - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Erro ao enviar e-mail de aprovação:', error);
      throw new Error('Falha ao enviar e-mail de aprovação');
    }

    console.log('E-mail de aprovação enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro no envio de e-mail de aprovação:', error);
    throw error;
  }
};

/**
 * Envia e-mail de notificação de status da manutenção
 */
const sendMaintenanceStatusEmail = async (email, maintenanceData, status, mechanicName) => {
  try {
    const statusText = status === 'approved' ? 'Aprovada' : 'Rejeitada';
    const statusColor = status === 'approved' ? '#70f3a7' : '#ff6b6b';
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: `RevisadU!: Manutenção ${statusText} - ${maintenanceData.vehicle_plate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Status da Manutenção - RevisadU!</title>
          <style>
            body { font-family: 'Poppins', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #70f3a7 0%, #29b0b4 100%); padding: 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; color: #ffffff; margin-bottom: 10px; }
            .slogan { color: #ffffff; font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #333333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
            .status-badge { display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .message { color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RevisadU!</div>
              <div class="slogan">Sua Revisão, Seu Controle</div>
            </div>
            <div class="content">
              <h1 class="title">Status da Manutenção</h1>
              <div style="text-align: center;">
                <div class="status-badge">${statusText}</div>
              </div>
              <p class="message">
                A manutenção do veículo <strong>${maintenanceData.vehicle_plate}</strong> foi <strong>${statusText.toLowerCase()}</strong> pelo cliente.<br><br>
                <strong>Detalhes:</strong><br>
                • Veículo: ${maintenanceData.vehicle_make} ${maintenanceData.vehicle_model}<br>
                • Serviço: ${maintenanceData.service_description}<br>
                • Valor: R$ ${maintenanceData.total_value.toFixed(2)}<br>
                • Cliente: ${maintenanceData.client_name}<br><br>
                ${status === 'rejected' && maintenanceData.rejection_reason ? 
                  `<strong>Motivo da rejeição:</strong> ${maintenanceData.rejection_reason}<br><br>` : ''}
                Acesse seu dashboard para mais detalhes.
              </p>
            </div>
            <div class="footer">
              <p>Obrigado por usar o RevisadU!</p>
              <p>&copy; 2024 RevisadU! - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Erro ao enviar e-mail de status:', error);
      throw new Error('Falha ao enviar e-mail de status');
    }

    console.log('E-mail de status enviado:', data);
    return data;
  } catch (error) {
    console.error('Erro no envio de e-mail de status:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMaintenanceApprovalEmail,
  sendMaintenanceStatusEmail
}; 