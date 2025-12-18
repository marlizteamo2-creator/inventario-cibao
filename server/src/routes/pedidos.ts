import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const pedidosRouter = express.Router();
const adminRoles = ["Administrador"];
const listAllowedRoles = ["Administrador", "Vendedor"];

const PEDIDO_STATES = ["pendiente", "recibido", "cancelado"];

const normalizeDateInput = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type CreatePedidoBody = {
  productId?: string;
  supplierId?: string;
  cantidadSolicitada?: number;
  fechaEsperada?: string;
};

type UpdatePedidoBody = {
  estado?: string;
  cantidadSolicitada?: number;
  fechaEsperada?: string | null;
  fechaRecibido?: string | null;
};

const baseSelect = `
  SELECT
    p.id_pedido AS id,
    p.id_producto,
    prod.nombre AS producto,
    p.id_suplidor,
    s.nombre_empresa AS suplidor,
    p.cantidad_solicitada,
    p.fecha_pedido,
    p.fecha_esperada,
    p.fecha_recibido,
    p.estado,
    p.id_usuario_solicita,
    u.nombre || ' ' || u.apellido AS solicitado_por
  FROM pedidos_suplidores p
  INNER JOIN productos prod ON prod.id_producto = p.id_producto
  INNER JOIN suplidores s ON s.id_suplidor = p.id_suplidor
  INNER JOIN usuarios u ON u.id_usuario = p.id_usuario_solicita
`;

const mapPedido = (row: any) => ({
  id: row.id,
  productoId: row.id_producto,
  producto: row.producto,
  suplidorId: row.id_suplidor,
  suplidor: row.suplidor,
  cantidadSolicitada: row.cantidad_solicitada,
  fechaPedido: row.fecha_pedido,
  fechaEsperada: row.fecha_esperada,
  fechaRecibido: row.fecha_recibido,
  estado: row.estado,
  usuarioId: row.id_usuario_solicita,
  solicitadoPor: row.solicitado_por
});

async function fetchPedidoById(id: string) {
  const { rows } = await query(`${baseSelect} WHERE p.id_pedido = $1`, [id]);
  return rows.at(0) ? mapPedido(rows[0]) : null;
}

/**
 * @openapi
 * /pedidos:
 *   get:
 *     summary: Listar pedidos realizados a suplidores
 *     tags:
 *       - Pedidos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Listado de pedidos a suplidores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Pedido"
 */
pedidosRouter.get("/", requireAuth(listAllowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { estado, supplierId, productId, from, to } = req.query ?? {};
    const filters: string[] = [];
    const params: string[] = [];

    if (estado) {
      filters.push(`p.estado = $${params.length + 1}`);
      params.push(estado as string);
    }

    if (supplierId) {
      filters.push(`p.id_suplidor = $${params.length + 1}`);
      params.push(supplierId as string);
    }

    if (productId) {
      filters.push(`p.id_producto = $${params.length + 1}`);
      params.push(productId as string);
    }

    if (from) {
      filters.push(`p.fecha_pedido >= $${params.length + 1}`);
      params.push(from as string);
    }

    if (to) {
      filters.push(`p.fecha_pedido <= $${params.length + 1}`);
      params.push(to as string);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { rows } = await query(`${baseSelect} ${whereClause} ORDER BY p.fecha_pedido DESC LIMIT 100`, params);

    res.json(rows.map(mapPedido));
  } catch (error) {
    console.error("Error listando pedidos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /pedidos:
 *   post:
 *     summary: Registrar un pedido a un suplidor
 *     tags:
 *       - Pedidos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PedidoCreateInput"
 *     responses:
 *       201:
 *         description: Pedido registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Pedido"
 */
pedidosRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, supplierId, cantidadSolicitada, fechaEsperada } = (req.body ?? {}) as CreatePedidoBody;
    const tokenUser = req.user;

    if (!tokenUser) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!productId || !supplierId || !cantidadSolicitada) {
      return res.status(400).json({ message: "Producto, suplidor y cantidad son obligatorios" });
    }

    if (cantidadSolicitada <= 0) {
      return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
    }

    const { rowCount: productExists } = await query(`SELECT 1 FROM productos WHERE id_producto = $1`, [productId]);
    if (!productExists) {
      return res.status(400).json({ message: "Producto no existe" });
    }

    const { rowCount: supplierExists } = await query(`SELECT 1 FROM suplidores WHERE id_suplidor = $1`, [supplierId]);
    if (!supplierExists) {
      return res.status(400).json({ message: "Suplidor no existe" });
    }

    const normalizedFecha = normalizeDateInput(fechaEsperada);

    const { rows: duplicateRows } = await query(
      `SELECT id_pedido
       FROM pedidos_suplidores
       WHERE id_producto = $1
         AND id_suplidor = $2
         AND cantidad_solicitada = $3
         AND (
           (fecha_esperada IS NULL AND $4::date IS NULL) OR
           (fecha_esperada = $4::date)
         )
         AND estado = 'pendiente'
       LIMIT 1`,
      [productId, supplierId, cantidadSolicitada, normalizedFecha ?? null]
    );

    if (duplicateRows.length) {
      return res.status(409).json({
        message: "Ya existe un pedido pendiente con los mismos datos. Edita el que ya tienes registrado."
      });
    }

    const { rows } = await query(
      `INSERT INTO pedidos_suplidores (id_producto, id_suplidor, cantidad_solicitada, fecha_esperada, estado, id_usuario_solicita)
       VALUES ($1, $2, $3, $4, 'pendiente', $5)
       RETURNING id_pedido`,
      [productId, supplierId, cantidadSolicitada, normalizedFecha ?? null, tokenUser.id]
    );

    const pedido = await fetchPedidoById(rows[0].id_pedido);
    return res.status(201).json(pedido);
  } catch (error) {
    console.error("Error creando pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /pedidos/{id}:
 *   patch:
 *     summary: Actualizar un pedido
 *     tags:
 *       - Pedidos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PedidoUpdateInput"
 *     responses:
 *       200:
 *         description: Pedido actualizado
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Pedido no encontrado
 */
pedidosRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const body = (req.body ?? {}) as UpdatePedidoBody;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (body.cantidadSolicitada !== undefined) {
      if (body.cantidadSolicitada === null || body.cantidadSolicitada <= 0) {
        return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
      }
      updates.push(`cantidad_solicitada = $${updates.length + 1}`);
      params.push(body.cantidadSolicitada);
    }

    if (body.fechaEsperada !== undefined) {
      const value = normalizeDateInput(body.fechaEsperada) ?? null;
      updates.push(`fecha_esperada = $${updates.length + 1}`);
      params.push(value);
    }

    let fechaRecibidoValue: string | null | undefined = body.fechaRecibido;

    if (body.estado) {
      if (!PEDIDO_STATES.includes(body.estado)) {
        return res.status(400).json({ message: "Estado no válido" });
      }
      updates.push(`estado = $${updates.length + 1}`);
      params.push(body.estado);

      if (body.estado === "recibido" && fechaRecibidoValue === undefined) {
        fechaRecibidoValue = new Date().toISOString().slice(0, 10);
      } else if (body.estado !== "recibido" && fechaRecibidoValue === undefined) {
        fechaRecibidoValue = null;
      }
    }

    if (fechaRecibidoValue !== undefined) {
      const value = normalizeDateInput(fechaRecibidoValue) ?? null;
      updates.push(`fecha_recibido = $${updates.length + 1}`);
      params.push(value);
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);

    const result = await query(`UPDATE pedidos_suplidores SET ${updates.join(", ")} WHERE id_pedido = $${params.length}`, params);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const pedido = await fetchPedidoById(id);
    return res.json(pedido);
  } catch (error) {
    console.error("Error actualizando pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default pedidosRouter;
