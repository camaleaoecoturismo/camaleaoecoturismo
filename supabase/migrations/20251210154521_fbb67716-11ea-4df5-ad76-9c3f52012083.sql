-- Add email template for new subscriber admin notification
INSERT INTO email_templates (
  template_key,
  name,
  description,
  category,
  subject,
  body_html,
  variables,
  trigger_event,
  trigger_description,
  is_active
) VALUES (
  'admin_new_subscriber',
  'Notificação de Novo Inscrito',
  'Email enviado ao admin quando há uma nova inscrição paga',
  'reservations',
  '🎉 Nova inscrição: {{nome_participante}} - {{nome_passeio}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #7C12D1, #9333EA); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #666; font-size: 14px; }
    .value { color: #333; font-weight: 600; font-size: 14px; }
    .amount { color: #10b981; font-size: 18px; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .btn { display: inline-block; background: #7C12D1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Nova Inscrição!</h1>
    </div>
    <div class="content">
      <p>Uma nova inscrição foi confirmada:</p>
      
      <div class="info-card">
        <div class="info-row">
          <span class="label">Participante</span>
          <span class="value">{{nome_participante}}</span>
        </div>
        <div class="info-row">
          <span class="label">CPF</span>
          <span class="value">{{cpf}}</span>
        </div>
        <div class="info-row">
          <span class="label">WhatsApp</span>
          <span class="value">{{whatsapp}}</span>
        </div>
        <div class="info-row">
          <span class="label">Email</span>
          <span class="value">{{email}}</span>
        </div>
        <div class="info-row">
          <span class="label">Passeio</span>
          <span class="value">{{nome_passeio}}</span>
        </div>
        <div class="info-row">
          <span class="label">Data</span>
          <span class="value">{{data_passeio}}</span>
        </div>
        <div class="info-row">
          <span class="label">Nº de Participantes</span>
          <span class="value">{{numero_participantes}}</span>
        </div>
        <div class="info-row">
          <span class="label">Ponto de Embarque</span>
          <span class="value">{{ponto_embarque}}</span>
        </div>
        <div class="info-row">
          <span class="label">Valor Pago</span>
          <span class="value amount">R$ {{valor_pago}}</span>
        </div>
        <div class="info-row">
          <span class="label">Método</span>
          <span class="value">{{metodo_pagamento}}</span>
        </div>
        <div class="info-row">
          <span class="label">Nº Reserva</span>
          <span class="value">{{reserva_numero}}</span>
        </div>
      </div>
      
      <p style="text-align: center;">
        <a href="https://camaleaoecoturismo.lovable.app/admin" class="btn">Ver no Painel Admin</a>
      </p>
    </div>
    <div class="footer">
      <p>Camaleão Ecoturismo - Sistema de Reservas</p>
    </div>
  </div>
</body>
</html>',
  '[{"key": "nome_participante", "example": "João Silva"}, {"key": "cpf", "example": "123.456.789-00"}, {"key": "whatsapp", "example": "(82) 99999-9999"}, {"key": "email", "example": "joao@email.com"}, {"key": "nome_passeio", "example": "Trilha do Rio Gelado"}, {"key": "data_passeio", "example": "15/01/2025"}, {"key": "numero_participantes", "example": "2"}, {"key": "ponto_embarque", "example": "Praça Central"}, {"key": "valor_pago", "example": "150,00"}, {"key": "metodo_pagamento", "example": "PIX"}, {"key": "reserva_numero", "example": "RES20250110-0001"}]'::jsonb,
  'new_subscriber',
  'Disparado quando um novo pagamento é aprovado',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  variables = EXCLUDED.variables,
  trigger_event = EXCLUDED.trigger_event,
  trigger_description = EXCLUDED.trigger_description;