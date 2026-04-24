-- Add Google Drive fields to pedidos and update imagens_pedido
alter table pedidos add column if not exists drive_folder_id text;
alter table pedidos add column if not exists nome_cliente text;

-- Ensure imagens_pedido has all required columns (already present, idempotent)
alter table imagens_pedido add column if not exists file_id text not null default '';
alter table imagens_pedido add column if not exists url text not null default '';
