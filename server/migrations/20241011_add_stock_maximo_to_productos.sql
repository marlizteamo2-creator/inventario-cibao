ALTER TABLE productos
ADD COLUMN IF NOT EXISTS stock_maximo INTEGER NOT NULL DEFAULT 0;

UPDATE productos
SET stock_maximo = GREATEST(stock_actual, stock_minimo, 1)
WHERE stock_maximo = 0;

ALTER TABLE productos
ALTER COLUMN stock_maximo SET DEFAULT 0;
