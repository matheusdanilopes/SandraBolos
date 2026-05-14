-- Add descricao to produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Add visual customization fields to cardapio_config
ALTER TABLE cardapio_config
  ADD COLUMN IF NOT EXISTS cor_titulo    TEXT NOT NULL DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS cor_descricao TEXT NOT NULL DEFAULT '#4b5563',
  ADD COLUMN IF NOT EXISTS cor_preco     TEXT NOT NULL DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS alinhamento   TEXT NOT NULL DEFAULT 'esquerda',
  ADD COLUMN IF NOT EXISTS observacoes   TEXT;
