CREATE TABLE IF NOT EXISTS pricing_settings (
  id SERIAL PRIMARY KEY,
  porcentaje_tienda NUMERIC(6,3) NOT NULL DEFAULT 40,
  porcentaje_ruta NUMERIC(6,3) NOT NULL DEFAULT 40,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por UUID REFERENCES usuarios(id_usuario)
);

INSERT INTO pricing_settings (id, porcentaje_tienda, porcentaje_ruta)
VALUES (1, 40, 40)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_pricing_overrides (
  id_override UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
  porcentaje_tienda NUMERIC(6,3),
  porcentaje_ruta NUMERIC(6,3),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por UUID REFERENCES usuarios(id_usuario),
  CONSTRAINT product_pricing_overrides_producto_unique UNIQUE (id_producto)
);

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_costo NUMERIC(14,2);
