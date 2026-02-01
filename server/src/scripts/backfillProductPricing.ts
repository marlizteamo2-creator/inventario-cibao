import { pool } from "../db/pool";
import { findLatestPedidoCosto, resolvePricingPercentages } from "../services/pricing";

type ProductRow = {
  id_producto: string;
  id_tipo_producto: string | null;
  id_marca: string | null;
  id_modelo: string | null;
  precio_costo: number | null;
  precio_tienda: number;
  precio_ruta: number;
  nombre: string;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<ProductRow>(
      `SELECT id_producto, id_tipo_producto, id_marca, id_modelo, precio_costo, precio_tienda, precio_ruta, nombre
       FROM productos
       ORDER BY nombre ASC`
    );

    let updated = 0;
    const skipped: Array<{ productId: string; productName: string; reason: string }> = [];

    for (const product of rows) {
      const percentages = await resolvePricingPercentages(client, product.id_producto, product.id_tipo_producto);
      let costo = product.precio_costo !== null ? Number(product.precio_costo) : null;

      if (costo === null) {
        costo = await findLatestPedidoCosto(client, product.id_producto, product.id_tipo_producto, product.id_marca, product.id_modelo);
      }

      if ((costo === null || Number.isNaN(costo)) && product.precio_tienda > 0) {
        costo = roundCurrency(product.precio_tienda / (1 + percentages.tienda / 100));
      }

      if ((costo === null || Number.isNaN(costo)) && product.precio_ruta > 0) {
        costo = roundCurrency(product.precio_ruta / (1 + percentages.ruta / 100));
      }

      if (costo === null || Number.isNaN(costo) || costo <= 0) {
        skipped.push({
          productId: product.id_producto,
          productName: product.nombre,
          reason: "Sin datos suficientes (ni pedidos ni precios positivos)"
        });
        continue;
      }

      const precioTienda = roundCurrency(costo * (1 + percentages.tienda / 100));
      const precioRuta = roundCurrency(costo * (1 + percentages.ruta / 100));

      await client.query(
        `UPDATE productos
         SET precio_costo = $1,
             precio_tienda = $2,
             precio_ruta = $3
         WHERE id_producto = $4`,
        [costo, precioTienda, precioRuta, product.id_producto]
      );

      updated += 1;
    }

    console.log(`Productos actualizados: ${updated}`);
    if (skipped.length) {
      console.log(`Productos sin datos de costo (${skipped.length}):`);
      skipped.forEach((item) => {
        console.log(`- ${item.productName} (${item.productId}): ${item.reason}`);
      });
    }
  } catch (error) {
    console.error("Error ejecutando el backfill de precios", error);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

void main();
