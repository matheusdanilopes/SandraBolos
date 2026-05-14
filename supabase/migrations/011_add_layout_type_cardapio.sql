-- Dynamic layout support for cardapio_config
ALTER TABLE cardapio_config
  ADD COLUMN IF NOT EXISTS layout_type    TEXT    NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS overlay_anchor TEXT    NOT NULL DEFAULT 'top-left',
  ADD COLUMN IF NOT EXISTS position_x     NUMERIC NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS position_y     NUMERIC NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS panel_opacity  NUMERIC NOT NULL DEFAULT 0.88,
  ADD COLUMN IF NOT EXISTS panel_color    TEXT    NOT NULL DEFAULT '#ffffff';
