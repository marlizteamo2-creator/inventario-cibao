ALTER TABLE productos
ADD COLUMN IF NOT EXISTS semanas_max_sin_movimiento INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_fecha_movimiento TIMESTAMPTZ DEFAULT NOW();

UPDATE productos
SET semanas_max_sin_movimiento = 0
WHERE semanas_max_sin_movimiento IS NULL;

UPDATE productos
SET ultima_fecha_movimiento = NOW()
WHERE ultima_fecha_movimiento IS NULL;
