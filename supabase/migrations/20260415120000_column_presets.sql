-- Tabela para armazenar presets de configuração de colunas por usuário.
-- Antes, os presets ficavam só em localStorage, perdendo-se ao limpar cache / trocar de navegador.

CREATE TABLE IF NOT EXISTS column_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,         -- identifica a tabela alvo (ex.: 'participants_table_presets')
  name TEXT NOT NULL,                -- nome do preset exibido ao usuário
  columns JSONB NOT NULL,            -- array de ColumnConfig
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_column_presets_user_key
  ON column_presets (user_id, storage_key);

ALTER TABLE column_presets ENABLE ROW LEVEL SECURITY;

-- Usuário só enxerga / escreve seus próprios presets
CREATE POLICY "Users can read their own column presets"
  ON column_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column presets"
  ON column_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column presets"
  ON column_presets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column presets"
  ON column_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION update_column_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER column_presets_set_updated_at
  BEFORE UPDATE ON column_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_column_presets_updated_at();
