-- Add trigger_event column to email_templates to link emails to specific system events
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS trigger_event text;

-- Add trigger description for admin reference
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS trigger_description text;

-- Update existing templates with their trigger events
UPDATE email_templates SET 
  trigger_event = 'payment_approved',
  trigger_description = 'Disparado automaticamente quando um pagamento é aprovado pelo Mercado Pago'
WHERE template_key = 'reservation_confirmation';

UPDATE email_templates SET 
  trigger_event = 'payment_pending_pix',
  trigger_description = 'Disparado quando uma reserva com PIX é criada e aguarda pagamento'
WHERE template_key = 'payment_pending';

UPDATE email_templates SET 
  trigger_event = 'payment_rejected',
  trigger_description = 'Disparado quando um pagamento com cartão é recusado'
WHERE template_key = 'payment_failed';

UPDATE email_templates SET 
  trigger_event = 'account_created',
  trigger_description = 'Disparado quando um cliente cria uma conta no portal'
WHERE template_key = 'account_created';

UPDATE email_templates SET 
  trigger_event = 'password_reset_requested',
  trigger_description = 'Disparado quando cliente solicita recuperação de senha'
WHERE template_key = 'password_reset';

UPDATE email_templates SET 
  trigger_event = 'admin_2fa_login',
  trigger_description = 'Disparado quando admin faz login e precisa do código 2FA'
WHERE template_key = 'admin_2fa_code';

UPDATE email_templates SET 
  trigger_event = 'reservation_cancelled',
  trigger_description = 'Disparado quando uma reserva é cancelada pelo cliente ou admin'
WHERE template_key = 'reservation_cancelled';

UPDATE email_templates SET 
  trigger_event = 'tour_cancelled',
  trigger_description = 'Disparado quando um passeio inteiro é cancelado pela empresa'
WHERE template_key = 'tour_cancelled';

UPDATE email_templates SET 
  trigger_event = 'refund_full',
  trigger_description = 'Disparado quando um reembolso total é processado'
WHERE template_key = 'refund_full';

UPDATE email_templates SET 
  trigger_event = 'refund_partial',
  trigger_description = 'Disparado quando um reembolso parcial é processado'
WHERE template_key = 'refund_partial';

UPDATE email_templates SET 
  trigger_event = 'whatsapp_group_created',
  trigger_description = 'Disparado manualmente quando o grupo de WhatsApp da viagem é criado'
WHERE template_key = 'whatsapp_group_invite';

UPDATE email_templates SET 
  trigger_event = 'trip_reminder_7days',
  trigger_description = 'Disparado automaticamente 7 dias antes da viagem'
WHERE template_key = 'trip_reminder_7days';

UPDATE email_templates SET 
  trigger_event = 'trip_reminder_1day',
  trigger_description = 'Disparado automaticamente 1 dia antes da viagem'
WHERE template_key = 'trip_reminder_1day';

UPDATE email_templates SET 
  trigger_event = 'trip_info_sent',
  trigger_description = 'Disparado manualmente para enviar informações detalhadas da viagem'
WHERE template_key = 'trip_info';