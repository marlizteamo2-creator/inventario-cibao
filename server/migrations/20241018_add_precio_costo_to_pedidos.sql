ALTER TABLE pedidos_suplidores
  ADD COLUMN IF NOT EXISTS precio_costo NUMERIC(12,2);
