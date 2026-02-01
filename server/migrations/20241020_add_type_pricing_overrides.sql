CREATE TABLE IF NOT EXISTS product_type_pricing_overrides (
  id_override UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_tipo_producto UUID NOT NULL REFERENCES tipos_producto(id_tipo) ON DELETE CASCADE,
  porcentaje_tienda NUMERIC(6,3),
  porcentaje_ruta NUMERIC(6,3),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por UUID REFERENCES usuarios(id_usuario),
  CONSTRAINT product_type_pricing_overrides_tipo_unique UNIQUE (id_tipo_producto)
);

CREATE INDEX IF NOT EXISTS idx_type_pricing_overrides_tipo ON product_type_pricing_overrides(id_tipo_producto);
