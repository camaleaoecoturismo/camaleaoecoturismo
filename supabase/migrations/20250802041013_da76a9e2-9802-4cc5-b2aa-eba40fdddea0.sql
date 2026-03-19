-- Criar bucket para PDFs dos roteiros
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-pdfs', 'tour-pdfs', true);

-- Criar políticas para o bucket de PDFs
CREATE POLICY "PDFs são acessíveis publicamente" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tour-pdfs');

CREATE POLICY "Usuários autenticados podem fazer upload de PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tour-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tour-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tour-pdfs' AND auth.uid() IS NOT NULL);

-- Renomear a coluna pdf_url para pdf_file_path
ALTER TABLE tours RENAME COLUMN pdf_url TO pdf_file_path;