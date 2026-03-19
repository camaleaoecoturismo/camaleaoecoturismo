
-- Update all email templates with professional design including logo, social media, and contact info

-- Password Reset
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">Recuperação de Senha</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="{{link_recuperacao}}" style="display: inline-block; background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Redefinir Senha</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Este link expira em 1 hora. Se você não solicitou a recuperação de senha, ignore este e-mail.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px; color: #7C12D1; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px; color: #7C12D1; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px; color: #7C12D1; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
                      <strong>Camaleão Ecoturismo</strong>
                    </p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">
                      @camaleaoecoturismo • +55 82 99364-9454
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                      www.camaleaoecoturismo.com.br
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'password_reset';

-- 2FA Code
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">Código de Verificação</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Seu código de verificação para acessar o painel administrativo é:
              </p>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <div style="display: inline-block; background-color: #f4f4f5; border: 2px dashed #7C12D1; border-radius: 12px; padding: 20px 48px;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7C12D1; font-family: monospace;">{{codigo}}</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Este código expira em 10 minutos. Se você não solicitou este código, ignore este e-mail.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = '2fa_code';

-- Reservation Confirmation
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Confirmada</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          
          <!-- Success Banner -->
          <tr>
            <td style="background-color: #10b981; padding: 20px; text-align: center;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 600;">✓ Reserva Confirmada com Sucesso!</span>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Sua reserva para a experiência <strong style="color: #7C12D1;">{{nome_passeio}}</strong> foi confirmada. Prepare-se para uma aventura incrível!
              </p>
              
              <!-- Reservation Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes da Reserva</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="font-size: 14px; color: #71717a;">Nº da Reserva</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                          <strong style="font-size: 14px; color: #18181b;">{{numero_reserva}}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="font-size: 14px; color: #71717a;">Experiência</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                          <strong style="font-size: 14px; color: #7C12D1;">{{nome_passeio}}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="font-size: 14px; color: #71717a;">Data</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                          <strong style="font-size: 14px; color: #18181b;">{{data_passeio}}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7;">
                          <span style="font-size: 14px; color: #71717a;">Embarque</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
                          <strong style="font-size: 14px; color: #18181b;">{{ponto_embarque}}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 14px; color: #71717a;">Valor Pago</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="font-size: 16px; color: #10b981;">R$ {{valor_pago}}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0; font-size: 14px; line-height: 1.6; color: #52525b; background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>Importante:</strong> Alguns dias antes da viagem, você será adicionado(a) ao grupo de WhatsApp da experiência para receber as últimas informações e orientações.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" />
                    </a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;">
                      <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'reservation_confirmation';

-- Payment Pending
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento Pendente</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color: #f59e0b; padding: 20px; text-align: center;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 600;">⏳ Pagamento Aguardando Confirmação</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Sua reserva para <strong style="color: #7C12D1;">{{nome_passeio}}</strong> está aguardando a confirmação do pagamento.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;"><span style="font-size: 14px; color: #71717a;">Nº da Reserva</span></td>
                        <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 14px; color: #18181b;">{{numero_reserva}}</strong></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;"><span style="font-size: 14px; color: #71717a;">Valor</span></td>
                        <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 16px; color: #f59e0b;">R$ {{valor}}</strong></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Caso já tenha efetuado o pagamento, aguarde alguns minutos para a confirmação automática. Se precisar de ajuda, entre em contato conosco.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'payment_pending';

-- Payment Failed
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagamento Não Aprovado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color: #ef4444; padding: 20px; text-align: center;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 600;">✕ Pagamento Não Aprovado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Infelizmente, o pagamento da sua reserva para <strong style="color: #7C12D1;">{{nome_passeio}}</strong> não foi aprovado.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                <strong>Motivo:</strong> {{motivo}}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">Tentar Novamente</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Se precisar de ajuda, entre em contato pelo WhatsApp.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'payment_failed';

-- Trip Reminder 7 Days
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faltam 7 Dias!</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: center;">
              <span style="color: #ffffff; font-size: 32px; font-weight: 700;">7</span>
              <span style="color: #ffffff; font-size: 18px; font-weight: 600; display: block;">dias para sua aventura!</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Falta apenas 1 semana para a experiência <strong style="color: #7C12D1;">{{nome_passeio}}</strong>! É hora de começar os preparativos.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase;">Checklist de Preparação</h3>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">✓ Verifique a previsão do tempo</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">✓ Separe roupas confortáveis</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #52525b;">✓ Prepare protetor solar e repelente</p>
                    <p style="margin: 0; font-size: 14px; color: #52525b;">✓ Confirme seu ponto de embarque</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Em breve você será adicionado(a) ao grupo de WhatsApp para receber informações finais.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'trip_reminder_7_days';

-- Trip Reminder 1 Day
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amanhã é o Grande Dia!</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center;">
              <span style="color: #ffffff; font-size: 24px; font-weight: 700;">🎉 Amanhã é o Grande Dia!</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Amanhã é o dia da sua experiência <strong style="color: #7C12D1;">{{nome_passeio}}</strong>! Estamos animados para te receber.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #7C12D1; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase;">Seu Embarque</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">{{ponto_embarque}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b; background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>Lembrete:</strong> Chegue com pelo menos 10 minutos de antecedência ao ponto de embarque.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Dúvidas de última hora? Fale conosco pelo WhatsApp!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'trip_reminder_1_day';

-- Reservation Cancellation
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Cancelada</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #18181b;">Reserva Cancelada</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Sua reserva <strong>{{numero_reserva}}</strong> para <strong style="color: #7C12D1;">{{nome_passeio}}</strong> foi cancelada conforme solicitado.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                <strong>Motivo:</strong> {{motivo}}
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;">
                Esperamos vê-lo(a) em uma próxima aventura! Confira nossas experiências disponíveis em nosso site.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'reservation_cancellation';

-- Refund Full
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reembolso Processado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color: #10b981; padding: 20px; text-align: center;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 600;">✓ Reembolso Total Processado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                O reembolso da sua reserva <strong>{{numero_reserva}}</strong> foi processado com sucesso.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #059669; text-transform: uppercase;">Valor Reembolsado</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10b981;">R$ {{valor_reembolso}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                O valor será creditado em até 10 dias úteis, dependendo da operadora do seu cartão.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'refund_full';

-- Refund Partial
UPDATE email_templates SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reembolso Parcial Processado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7C12D1 0%, #9333EA 100%); padding: 32px 40px; text-align: center;">
              <img src="https://guwplwuwriixgvkjlutg.supabase.co/storage/v1/object/public/tour-images/logo-horizontal-white.png" alt="Camaleão Ecoturismo" style="height: 50px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color: #f59e0b; padding: 20px; text-align: center;">
              <span style="color: #ffffff; font-size: 18px; font-weight: 600;">Reembolso Parcial Processado</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                Olá <strong style="color: #18181b;">{{nome}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #52525b;">
                O reembolso parcial da sua reserva <strong>{{numero_reserva}}</strong> foi processado.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border-radius: 12px; border: 1px solid #fcd34d; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;"><span style="font-size: 14px; color: #71717a;">Valor Original</span></td>
                        <td style="padding: 8px 0; text-align: right;"><span style="font-size: 14px; color: #71717a; text-decoration: line-through;">R$ {{valor_original}}</span></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;"><span style="font-size: 14px; color: #71717a;">Valor Reembolsado</span></td>
                        <td style="padding: 8px 0; text-align: right;"><strong style="font-size: 18px; color: #f59e0b;">R$ {{valor_reembolso}}</strong></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                <strong>Motivo do reembolso parcial:</strong> {{motivo}}
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                O valor será creditado em até 10 dias úteis, dependendo da operadora do seu cartão.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="https://instagram.com/camaleaoecoturismo" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 24px; height: 24px;" /></a>
                    <a href="https://wa.me/5582993649454" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" style="width: 24px; height: 24px;" /></a>
                    <a href="https://www.camaleaoecoturismo.com.br" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" style="width: 24px; height: 24px;" /></a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;"><strong>Camaleão Ecoturismo</strong></p>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #a1a1aa;">@camaleaoecoturismo • +55 82 99364-9454</p>
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">www.camaleaoecoturismo.com.br</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>' WHERE template_key = 'refund_partial';
