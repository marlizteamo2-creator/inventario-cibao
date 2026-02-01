import express from "express";
import type { Response } from "express";
import type { PoolClient } from "pg";
import { pool, query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { applyPricingToProduct, findLatestPedidoCosto } from "../services/pricing";

const pricingRouter = express.Router();
const adminRoles = ["Administrador"];

const mapSettings = (row: any) => ({
  porcentajeTienda: Number(row.porcentaje_tienda),
  porcentajeRuta: Number(row.porcentaje_ruta),
  actualizadoEn: row.actualizado_en,
  actualizadoPor: row.actualizado_por
});

const mapOverride = (row: any) => ({
  id: row.id_override,
  productoId: row.id_producto,
  producto: row.producto,
  porcentajeTienda: row.porcentaje_tienda !== null ? Number(row.porcentaje_tienda) : null,
  porcentajeRuta: row.porcentaje_ruta !== null ? Number(row.porcentaje_ruta) : null,
  actualizadoEn: row.actualizado_en,
  actualizadoPor: row.actualizado_por,
  actualizadoPorNombre: row.actualizado_por_nombre ?? null
});

const mapTypeOverride = (row: any) => ({
  id: row.id_override,
  tipoId: row.id_tipo_producto,
  tipo: row.tipo_producto,
  porcentajeTienda: row.porcentaje_tienda !== null ? Number(row.porcentaje_tienda) : null,
  porcentajeRuta: row.porcentaje_ruta !== null ? Number(row.porcentaje_ruta) : null,
  actualizadoEn: row.actualizado_en,
  actualizadoPor: row.actualizado_por,
  actualizadoPorNombre: row.actualizado_por_nombre ?? null
});

const overrideSelect = `
  SELECT
    o.id_override,
    o.id_producto,
    o.porcentaje_tienda,
    o.porcentaje_ruta,
    o.actualizado_en,
    o.actualizado_por,
    p.nombre AS producto,
    u.nombre || ' ' || u.apellido AS actualizado_por_nombre
  FROM product_pricing_overrides o
  INNER JOIN productos p ON p.id_producto = o.id_producto
  LEFT JOIN usuarios u ON u.id_usuario = o.actualizado_por
`;

const typeOverrideSelect = `
  SELECT
    t.id_override,
    t.id_tipo_producto,
    t.porcentaje_tienda,
    t.porcentaje_ruta,
    t.actualizado_en,
    t.actualizado_por,
    tp.nombre AS tipo_producto,
    u.nombre || ' ' || u.apellido AS actualizado_por_nombre
  FROM product_type_pricing_overrides t
  INNER JOIN tipos_producto tp ON tp.id_tipo = t.id_tipo_producto
  LEFT JOIN usuarios u ON u.id_usuario = t.actualizado_por
`;

pricingRouter.get("/settings", requireAuth(adminRoles), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id, porcentaje_tienda, porcentaje_ruta, actualizado_en, actualizado_por
       FROM pricing_settings
       ORDER BY actualizado_en DESC, id DESC
       LIMIT 1`
    );
    if (!rows.length) {
      return res.json({ porcentajeTienda: 0, porcentajeRuta: 0, actualizadoEn: null, actualizadoPor: null });
    }
    res.json(mapSettings(rows[0]));
  } catch (error) {
    console.error("Error consultando configuración de precios", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pricingRouter.put("/settings", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const { tiendaPercent, rutaPercent } = (req.body ?? {}) as {
    tiendaPercent?: number;
    rutaPercent?: number;
  };

  const validate = (value?: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000;

  if (!validate(tiendaPercent) || !validate(rutaPercent)) {
    return res.status(400).json({ message: "Debes indicar porcentajes válidos (0 o mayores)." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number }>(`SELECT id FROM pricing_settings ORDER BY id ASC LIMIT 1 FOR UPDATE`);
    if (rows.length) {
      await client.query(
        `UPDATE pricing_settings
         SET porcentaje_tienda = $1,
             porcentaje_ruta = $2,
             actualizado_en = NOW(),
             actualizado_por = $3
         WHERE id = $4`,
        [tiendaPercent, rutaPercent, req.user?.id ?? null, rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO pricing_settings (porcentaje_tienda, porcentaje_ruta, actualizado_por)
         VALUES ($1, $2, $3)`,
        [tiendaPercent, rutaPercent, req.user?.id ?? null]
      );
    }
    const { rows: updatedRows } = await client.query(
      `SELECT id, porcentaje_tienda, porcentaje_ruta, actualizado_en, actualizado_por
       FROM pricing_settings
       ORDER BY actualizado_en DESC, id DESC
       LIMIT 1`
    );

    const {
      rows: productRows
    } = await client.query<{ id_producto: string }>(`SELECT id_producto FROM productos`);

    for (const product of productRows) {
      await applyPricingToProduct(client, product.id_producto, null);
    }

    await client.query("COMMIT");
    res.json(mapSettings(updatedRows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error actualizando configuración de precios", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

pricingRouter.get("/overrides", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filters: string[] = [];
    const params: string[] = [];

    if (search) {
      filters.push(`LOWER(p.nombre) LIKE LOWER($${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { rows } = await query(`${overrideSelect} ${whereClause} ORDER BY p.nombre ASC`, params);
    res.json(rows.map(mapOverride));
  } catch (error) {
    console.error("Error listando porcentajes por producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pricingRouter.put("/overrides/:productId", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.params ?? {};
  if (!productId) {
    return res.status(400).json({ message: "Producto requerido" });
  }

  const { tiendaPercent, rutaPercent } = (req.body ?? {}) as { tiendaPercent?: number; rutaPercent?: number };
  const validate = (value?: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000;

  if (!validate(tiendaPercent) || !validate(rutaPercent)) {
    return res.status(400).json({ message: "Debes indicar porcentajes válidos (0 o mayores)." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(`SELECT 1 FROM productos WHERE id_producto = $1`, [productId]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await client.query(
      `INSERT INTO product_pricing_overrides (id_producto, porcentaje_tienda, porcentaje_ruta, actualizado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_producto) DO UPDATE
       SET porcentaje_tienda = EXCLUDED.porcentaje_tienda,
           porcentaje_ruta = EXCLUDED.porcentaje_ruta,
           actualizado_por = EXCLUDED.actualizado_por,
           actualizado_en = NOW()`,
      [productId, tiendaPercent, rutaPercent, req.user?.id ?? null]
    );

    await applyPricingToProduct(client, productId, null);

    const {
      rows
    } = await client.query(`${overrideSelect} WHERE o.id_producto = $1`, [productId]);

    await client.query("COMMIT");
    res.json(rows.length ? mapOverride(rows[0]) : null);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error guardando porcentaje del producto", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

pricingRouter.delete("/overrides/:productId", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.params ?? {};
  if (!productId) {
    return res.status(400).json({ message: "Producto requerido" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(`SELECT 1 FROM productos WHERE id_producto = $1`, [productId]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    await client.query(`DELETE FROM product_pricing_overrides WHERE id_producto = $1`, [productId]);
    await applyPricingToProduct(client, productId, null);
    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error eliminando porcentaje del producto", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

pricingRouter.get("/type-overrides", requireAuth(adminRoles), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`${typeOverrideSelect} ORDER BY tp.nombre ASC`);
    res.json(rows.map(mapTypeOverride));
  } catch (error) {
    console.error("Error listando porcentajes por tipo", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pricingRouter.put("/type-overrides/:typeId", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const { typeId } = req.params ?? {};
  if (!typeId) {
    return res.status(400).json({ message: "Tipo de producto requerido" });
  }
  const { tiendaPercent, rutaPercent } = (req.body ?? {}) as { tiendaPercent?: number; rutaPercent?: number };
  const validate = (value?: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000;

  if (!validate(tiendaPercent) || !validate(rutaPercent)) {
    return res.status(400).json({ message: "Debes indicar porcentajes válidos (0 o mayores)." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(`SELECT 1 FROM tipos_producto WHERE id_tipo = $1`, [typeId]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Tipo de producto no encontrado" });
    }

    await client.query(
      `INSERT INTO product_type_pricing_overrides (id_tipo_producto, porcentaje_tienda, porcentaje_ruta, actualizado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_tipo_producto) DO UPDATE
       SET porcentaje_tienda = EXCLUDED.porcentaje_tienda,
           porcentaje_ruta = EXCLUDED.porcentaje_ruta,
           actualizado_por = EXCLUDED.actualizado_por,
           actualizado_en = NOW()`,
      [typeId, tiendaPercent, rutaPercent, req.user?.id ?? null]
    );

    const {
      rows: productRows
    } = await client.query<{ id_producto: string }>(
      `SELECT id_producto FROM productos WHERE id_tipo_producto = $1`,
      [typeId]
    );

    for (const product of productRows) {
      await applyPricingToProduct(client, product.id_producto, null);
    }

    const {
      rows
    } = await client.query(`${typeOverrideSelect} WHERE t.id_tipo_producto = $1`, [typeId]);

    await client.query("COMMIT");
    res.json(rows.length ? mapTypeOverride(rows[0]) : null);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error guardando porcentaje por tipo", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

pricingRouter.delete("/type-overrides/:typeId", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const { typeId } = req.params ?? {};
  if (!typeId) {
    return res.status(400).json({ message: "Tipo de producto requerido" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(`SELECT 1 FROM tipos_producto WHERE id_tipo = $1`, [typeId]);
    if (!rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Tipo de producto no encontrado" });
    }
    await client.query(`DELETE FROM product_type_pricing_overrides WHERE id_tipo_producto = $1`, [typeId]);

    const {
      rows: productRows
    } = await client.query<{ id_producto: string }>(
      `SELECT id_producto FROM productos WHERE id_tipo_producto = $1`,
      [typeId]
    );

    for (const product of productRows) {
      await applyPricingToProduct(client, product.id_producto, null);
    }

    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error eliminando porcentaje por tipo", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

pricingRouter.post("/backfill", requireAuth(adminRoles), async (_req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: products
    } = await client.query<{ id_producto: string; id_tipo_producto: string | null; id_marca: string | null; id_modelo: string | null; precio_costo: number | null }>(
      `SELECT id_producto, id_tipo_producto, id_marca, id_modelo, precio_costo
       FROM productos`
    );

    let updated = 0;
    const skipped: Array<{ productId: string; reason: string }> = [];

    for (const product of products) {
      let costo = product.precio_costo !== null ? Number(product.precio_costo) : null;
      if (costo === null) {
        costo = await findLatestPedidoCosto(client, product.id_producto, product.id_tipo_producto, product.id_marca, product.id_modelo);
      }

      if (costo === null) {
        skipped.push({ productId: product.id_producto, reason: "Sin pedidos con precio de costo" });
        continue;
      }

      await applyPricingToProduct(client, product.id_producto, costo);
      updated += 1;
    }

    await client.query("COMMIT");
    res.json({
      updated,
      skipped
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error ejecutando backfill de precios", error);
    res.status(500).json({ message: "Error interno" });
  } finally {
    client.release();
  }
});

export default pricingRouter;
