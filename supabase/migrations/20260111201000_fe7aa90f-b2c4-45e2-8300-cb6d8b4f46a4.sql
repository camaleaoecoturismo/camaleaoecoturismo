UPDATE email_templates 
SET body_html = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reserva Confirmada</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f5; font-family:''Segoe UI'',Tahoma,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px; background:#f4f4f5;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border-radius:14px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C12D1,#9333EA); padding:26px; text-align:center;">
              <img src="https://agenda.camaleaoecoturismo.com/assets/logo-DEGx40g5.png"
                   alt="Camaleão Ecoturismo" style="height:48px;">
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="background:#10b981; text-align:center; padding:14px;">
              <span style="color:#ffffff; font-size:17px; font-weight:600;">Reserva Confirmada</span>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding:32px 28px;">

              <p style="font-size:15px; color:#52525b; margin:0 0 18px;">
                Olá <strong>{{nome}}</strong>,
              </p>

              <p style="font-size:15px; color:#52525b; line-height:1.6; margin:0 0 20px;">
                Sua reserva para a experiência <strong style="color:#7C12D1;">{{tour_nome}}</strong> foi confirmada com sucesso.
                A viagem está marcada para <strong>{{tour_data}}</strong> e inclui
                <strong>{{num_participantes}}</strong> participante(s) cadastrados.
              </p>

              <p style="font-size:15px; color:#52525b; margin:0 0 22px;">
                Abaixo você encontra um resumo completo da sua reserva:
              </p>

              <!-- Detalhes da reserva -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                     style="background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; margin-bottom:26px;">
                <tr>
                  <td style="padding:22px 22px;">

                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                           style="font-size:14px; color:#444444; line-height:1.4;">

                      <tr>
                        <td>Número da reserva</td>
                        <td style="text-align:right;"><strong>{{reserva_numero}}</strong></td>
                      </tr>
                      <tr><td colspan="2" style="border-bottom:1px solid #e4e4e7; padding:6px 0;"></td></tr>

                      <tr>
                        <td>Experiência</td>
                        <td style="text-align:right;"><strong>{{tour_nome}}</strong></td>
                      </tr>
                      <tr><td colspan="2" style="border-bottom:1px solid #e4e4e7; padding:6px 0;"></td></tr>

                      <tr>
                        <td>Data</td>
                        <td style="text-align:right;"><strong>{{tour_data}}</strong></td>
                      </tr>
                      <tr><td colspan="2" style="border-bottom:1px solid #e4e4e7; padding:6px 0;"></td></tr>

                      <tr>
                        <td>Ponto de embarque</td>
                        <td style="text-align:right;"><strong>{{ponto_embarque}}</strong></td>
                      </tr>
                      <tr><td colspan="2" style="border-bottom:1px solid #e4e4e7; padding:6px 0;"></td></tr>

                      <tr>
                        <td>Nº de participantes</td>
                        <td style="text-align:right;"><strong>{{num_participantes}}</strong></td>
                      </tr>
                      <tr><td colspan="2" style="border-bottom:1px solid #e4e4e7; padding:6px 0;"></td></tr>

                      <tr>
                        <td>Valor pago</td>
                        <td style="text-align:right;"><strong style="color:#10b981;">R$ {{valor_pago}}</strong></td>
                      </tr>

                    </table>

                  </td>
                </tr>
              </table>

              <!-- Ingresso com QR Code -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#f0fdf4; border:2px solid #10b981; border-radius:10px; padding:20px; text-align:center;">
                    <p style="margin:0 0 12px; font-size:15px; color:#166534; font-weight:600;">
                      🎫 Seu Ingresso
                    </p>
                    <p style="margin:0 0 16px; font-size:13px; color:#52525b; line-height:1.5;">
                      Clique no botão abaixo para acessar e baixar seu ingresso.<br>
                      <strong>O QR Code deverá ser apresentado (impresso ou digital) no momento do embarque.</strong>
                    </p>
                    <a href="{{link_ingresso}}" 
                       style="display:inline-block; background:#10b981; color:#ffffff; text-decoration:none; 
                              padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px;">
                      📲 Baixar Ingresso
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Aviso WhatsApp -->
              <p style="background:#e0f2fe; padding:14px; border-left:4px solid #0284c7;
                        border-radius:6px; font-size:13px; color:#333; margin:0 0 22px; line-height:1.5;">
                <strong>Grupo do WhatsApp:</strong> Próximo à data da viagem, criaremos um grupo oficial no WhatsApp
                para envio das orientações finais, checklist e atualizações importantes sobre a experiência.
              </p>

              <!-- Suporte -->
              <p style="margin:0 0 24px; font-size:14px; color:#52525b; line-height:1.6; text-align:center;">
                Se tiver qualquer dúvida, fale com nossa equipe pelo WhatsApp:<br>
                <a href="https://wa.me/5582993649454"
                   style="color:#7C12D1; text-decoration:none; font-weight:600;">
                  (82) 99364-9454
                </a>
              </p>

              <!-- Links úteis -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:16px;">
                <tr>
                  <td style="text-align:center; font-size:13px; color:#52525b;">
                    <a href="{{link_ingresso}}"
                       style="color:#7C12D1; text-decoration:none; margin:0 8px;">
                      🎫 Ingresso
                    </a>
                    |
                    <a href="{{link_politica_cancelamento}}"
                       style="color:#7C12D1; text-decoration:none; margin:0 8px;">
                      📋 Política de Cancelamento
                    </a>
                    {{#link_roteiro}}
                    |
                    <a href="{{link_roteiro}}"
                       style="color:#7C12D1; text-decoration:none; margin:0 8px;">
                      🗺️ Roteiro da Viagem
                    </a>
                    {{/link_roteiro}}
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="text-align:center; font-size:13px; color:#52525b;">
                    <a href="https://agenda.camaleaoecoturismo.com/termos"
                       style="color:#7C12D1; text-decoration:none; margin:0 8px;">
                      Termos e Condições
                    </a>
                    |
                    <a href="https://camaleaoecoturismo.com.br/faq"
                       style="color:#7C12D1; text-decoration:none; margin:0 8px;">
                      FAQ
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#fafafa; padding:22px; border-top:1px solid #e4e4e7; text-align:center;">

              <div style="margin-bottom:12px;">
                <a href="https://instagram.com/camaleaoecoturismo"
                   style="margin:0 6px; text-decoration:none;">
                  <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png"
                       width="22" style="display:inline-block;" alt="Instagram">
                </a>
                <a href="https://wa.me/5582993649454"
                   style="margin:0 6px; text-decoration:none;">
                  <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                       width="22" style="display:inline-block;" alt="WhatsApp">
                </a>
                <a href="https://www.camaleaoecoturismo.com.br"
                   style="margin:0 6px; text-decoration:none;">
                  <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png"
                       width="22" style="display:inline-block;" alt="Site">
                </a>
              </div>

              <p style="margin:2px 0; font-size:11px; color:#777;">
                © 2025 Camaleão Ecoturismo - 38.778.474/0001-31
              </p>
              <p style="margin:0; font-size:11px; color:#777;">
                Reconexão com a natureza
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>',
updated_at = NOW()
WHERE id = '887e558d-0d21-4fcd-bc28-4112b681c75d';