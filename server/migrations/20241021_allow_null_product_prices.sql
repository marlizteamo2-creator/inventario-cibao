ALTER TABLE productos
  ALTER COLUMN precio_tienda DROP NOT NULL,
  ALTER COLUMN precio_ruta DROP NOT NULL;

UPDATE productos
SET precio_tienda = NULL
WHERE precio_tienda = 0 AND (precio_costo IS NULL OR precio_costo = 0);

UPDATE productos
SET precio_ruta = NULL
WHERE precio_ruta = 0 AND (precio_costo IS NULL OR precio_costo = 0);
