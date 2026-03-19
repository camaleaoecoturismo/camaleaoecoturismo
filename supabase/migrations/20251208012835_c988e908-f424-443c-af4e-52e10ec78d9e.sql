-- Create table for site settings including reservation policy
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default reservation policy
INSERT INTO public.site_settings (setting_key, setting_value) VALUES (
  'reservation_policy',
  '<h3>Preâmbulo</h3>
<p>A Camaleão Ecoturismo, inscrita no CNPJ sob o número 38.778.474/0001-31, estabelece a seguinte Política de Reservas, que contêm os acordos e contratos de prestação de serviços turísticos, em conformidade com a Resolução Normativa CNTur nº 4, de 28 de janeiro de 1983, além da Política de Cancelamento e Remarcação de Serviços Turísticos, regulamentada pela Deliberação Normativa nº 161, de 09 de agosto de 1985, da Embratur, destinando-se a regulamentar as condições e procedimentos aplicáveis aos cancelamentos de reservas de serviços turísticos, em consonância com o Código de Defesa do Consumidor (Lei nº 8.078/1990) e a Lei Geral do Turismo (Lei nº 11.771/2008).</p>

<h3>Cláusula Primeira - Objetivo</h3>
<p>A presente Política de Reservas tem por objetivo assegurar a transparência e a clareza nas relações comerciais entre a Camaleão Ecoturismo e seus clientes, regulamentando os direitos e deveres de ambas as partes no tocante aos procedimentos de cancelamento de reservas de serviços turísticos.</p>

<h3>Cláusula Segunda - Condições Gerais</h3>
<p>A Camaleão Ecoturismo oferece aos seus clientes a possibilidade de cancelamento das reservas efetuadas, respeitando as condições e prazos estabelecidos nesta política.</p>
<p>Esta política visa garantir a organização e a qualidade dos serviços prestados, bem como o cumprimento das obrigações legais vigentes.</p>

<h3>Cláusula Terceira - Obrigações da Camaleão Ecoturismo</h3>
<p>3.1 A Camaleão Ecoturismo é responsável pelo planejamento, organização e execução da programação, e mesmo sendo intermediária entre os clientes e os demais prestadores de serviço (pessoas físicas e jurídicas), responde pela escolha, nos termos da lei civil e no que couber, nos termos da legislação regente das relações de consumo.</p>
<p>3.2 A Camaleão Ecoturismo não é responsável por atrasos, greves, antecipações de horários, condições atmosféricas, catástrofes naturais, decisões governamentais, atos de terrorismo, roubos e furtos, bem como outros motivos de força maior ou casos fortuitos.</p>
<p>3.3 A programação poderá sofrer alterações, remarcações ou cancelamentos, a exclusivo critério da Camaleão Ecoturismo, por motivo de força maior.</p>
<p>3.4 Restando a escolha da aceitação dessas alterações, com o devido reembolso de eventuais diferenças existentes em favor do cliente ou a rescisão do contrato com a devolução da totalidade dos valores efetivamente pagos até 7 dias após a solicitação de reembolso.</p>
<p>3.5 Créditos provenientes de remarcações ou cancelamentos terão validade monetária e não efeito de vaga adquirida para o mesmo roteiro em data futura.</p>
<p>3.6 Os créditos têm prazo indeterminado para uso. Poderão ser transferíveis desde que o novo cliente tenha claras as definições deste contrato.</p>

<h3>Cláusula Quarta - Obrigações do Cliente</h3>
<p>4.1 Ao participar da programação da Camaleão Ecoturismo, o cliente declara conhecer e adere contratualmente às condições gerais relativas ao programa adquirido.</p>
<p>4.2 Somente será autorizada a substituição do cliente por outra pessoa mediante solicitação por escrito em até 1 dia antes do embarque.</p>
<p>4.3 O cliente obriga-se a chegar nos horários divulgados para saídas e retorno durante todo o programa.</p>
<p>4.4 O cliente se compromete a sempre seguir o grupo e, em caso de dificuldade, comunicar o guia.</p>'
);