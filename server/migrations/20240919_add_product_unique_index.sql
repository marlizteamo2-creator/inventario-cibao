CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_unq_tipo_marca_modelo_precio
ON productos (LOWER(nombre), id_tipo_producto, id_marca, id_modelo, precio_tienda, precio_ruta);
