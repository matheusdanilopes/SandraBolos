-- Adiciona campos de horário de entrega e retirada para validação precisa de atrasos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS hora_entrega time;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS hora_retirada time;
