import type { PoolClient } from "pg";

type PricingPercentages = {
  tienda: number;
  ruta: number;
};

const SELECT_SETTINGS = `
  SELECT porcentaje_tienda, porcentaje_ruta
  FROM pricing_settings
  ORDER BY actualizado_en DESC, id DESC
  LIMIT 1
`;

const SELECT_PRODUCT_OVERRIDE = `
  SELECT porcentaje_tienda, porcentaje_ruta
  FROM product_pricing_overrides
  WHERE id_producto = $1
  LIMIT 1
`;

const SELECT_TYPE_OVERRIDE = `
  SELECT porcentaje_tienda, porcentaje_ruta
  FROM product_type_pricing_overrides
  WHERE id_tipo_producto = $1
  LIMIT 1
`;

const normalizeNumber = (value?: number | null) => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const SELECT_LATEST_COST = `
  SELECT precio_costo
  FROM pedidos_suplidores
  WHERE precio_costo IS NOT NULL
    AND (
      (id_producto = $1) OR
      (
        id_producto IS NULL
        AND id_tipo_producto = $2
        AND (id_marca IS NOT DISTINCT FROM $3)
        AND (id_modelo IS NOT DISTINCT FROM $4)
      )
    )
  ORDER BY fecha_pedido DESC
  LIMIT 1
`;

export async function findLatestPedidoCosto(
  client: PoolClient,
  productId: string,
  productTypeId: string | null,
  brandId: string | null,
  modelId: string | null
): Promise<number | null> {
  const { rows } = await client.query(SELECT_LATEST_COST, [productId, productTypeId, brandId, modelId]);
  if (!rows.length) {
    return null;
  }
  return rows[0].precio_costo !== null ? Number(rows[0].precio_costo) : null;
}

const fetchGeneralPercentages = async (client: PoolClient): Promise<PricingPercentages> => {
  const { rows } = await client.query(SELECT_SETTINGS);
  const fallback = rows[0];
  return {
    tienda: fallback ? Number(fallback.porcentaje_tienda) : 0,
    ruta: fallback ? Number(fallback.porcentaje_ruta) : 0
  };
};

export async function resolvePricingPercentages(
  client: PoolClient,
  productId?: string,
  productTypeId?: string | null
): Promise<PricingPercentages> {
  const result = await fetchGeneralPercentages(client);

  if (productTypeId) {
    const { rows } = await client.query(SELECT_TYPE_OVERRIDE, [productTypeId]);
    const typeOverride = rows[0];
    if (typeOverride) {
      if (typeOverride.porcentaje_tienda !== null) {
        result.tienda = Number(typeOverride.porcentaje_tienda);
      }
      if (typeOverride.porcentaje_ruta !== null) {
        result.ruta = Number(typeOverride.porcentaje_ruta);
      }
    }
  }

  if (productId) {
    const { rows } = await client.query(SELECT_PRODUCT_OVERRIDE, [productId]);
    const productOverride = rows[0];
    if (productOverride) {
      if (productOverride.porcentaje_tienda !== null) {
        result.tienda = Number(productOverride.porcentaje_tienda);
      }
      if (productOverride.porcentaje_ruta !== null) {
        result.ruta = Number(productOverride.porcentaje_ruta);
      }
    }
  }

  return result;
}

export async function applyPricingToProduct(
  client: PoolClient,
  productId: string,
  costoOverride?: number | null
): Promise<void> {
  const {
    rows,
    rowCount
  } = await client.query<{ precio_costo: number | null; precio_tienda: number; precio_ruta: number; id_tipo_producto: string | null }>(
    `SELECT precio_costo, precio_tienda, precio_ruta, id_tipo_producto
     FROM productos
     WHERE id_producto = $1
     FOR UPDATE`,
    [productId]
  );

  if (!rowCount) {
    throw new Error("Producto no encontrado para actualizar precios");
  }

  const currentRow = rows[0];
  const costo =
    costoOverride !== undefined && costoOverride !== null
      ? normalizeNumber(costoOverride)
      : currentRow.precio_costo !== null
        ? Number(currentRow.precio_costo)
        : null;

  const percentages = await resolvePricingPercentages(client, productId, currentRow.id_tipo_producto);

  let precioTienda = currentRow.precio_tienda;
  let precioRuta = currentRow.precio_ruta;

  if (costo !== null) {
    precioTienda = roundCurrency(costo * (1 + percentages.tienda / 100));
    precioRuta = roundCurrency(costo * (1 + percentages.ruta / 100));
  }

  await client.query(
    `UPDATE productos
     SET precio_tienda = $1,
         precio_ruta = $2,
         precio_costo = $3
     WHERE id_producto = $4`,
    [precioTienda, precioRuta, costo, productId]
  );
}
