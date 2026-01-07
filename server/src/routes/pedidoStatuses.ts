import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const pedidoStatusesRouter = express.Router();

const readRoles = ["Administrador", "Vendedor"];
const adminRoles = ["Administrador"];

const mapStatus = (row: any) => ({
  id: row.id_estado,
  nombre: row.nombre,
  descripcion: row.descripcion,
  activo: row.activo,
  posicion: row.posicion,
  fechaCreacion: row.fecha_creacion
});

pedidoStatusesRouter.get("/", requireAuth(readRoles), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`SELECT * FROM pedido_estados ORDER BY posicion ASC, nombre ASC`);
    res.json(rows.map(mapStatus));
  } catch (error) {
    console.error("Error listando estados de pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pedidoStatusesRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, descripcion, activo = true, posicion } = req.body ?? {};
    const cleanName = typeof nombre === "string" ? nombre.trim() : "";
    if (!cleanName) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }
    const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
    const targetPosicion =
      typeof posicion === "number" && Number.isFinite(posicion)
        ? Math.max(0, Math.floor(posicion))
        : null;

    let resolvedPosicion = targetPosicion;
    if (resolvedPosicion === null) {
      const { rows: posicionRows } = await query(`SELECT COALESCE(MAX(posicion), 0) + 1 AS next_pos FROM pedido_estados`);
      resolvedPosicion = posicionRows[0]?.next_pos ?? 1;
    }

    const { rows } = await query(
      `INSERT INTO pedido_estados (nombre, descripcion, activo, posicion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cleanName, cleanDescription, Boolean(activo), resolvedPosicion]
    );

    res.status(201).json(mapStatus(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un estado con ese nombre" });
    }
    console.error("Error creando estado de pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pedidoStatusesRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { nombre, descripcion, activo, posicion } = req.body ?? {};
    const updates: string[] = [];
    const params: Array<any> = [];

    if (nombre !== undefined) {
      const cleanName = typeof nombre === "string" ? nombre.trim() : "";
      if (!cleanName) {
        return res.status(400).json({ message: "El nombre es obligatorio" });
      }
      updates.push(`nombre = $${updates.length + 1}`);
      params.push(cleanName);
    }

    if (descripcion !== undefined) {
      const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
      updates.push(`descripcion = $${updates.length + 1}`);
      params.push(cleanDescription);
    }

    if (activo !== undefined) {
      updates.push(`activo = $${updates.length + 1}`);
      params.push(Boolean(activo));
    }

    if (posicion !== undefined) {
      if (typeof posicion !== "number" || !Number.isFinite(posicion)) {
        return res.status(400).json({ message: "La posición debe ser un número" });
      }
      updates.push(`posicion = $${updates.length + 1}`);
      params.push(Math.max(0, Math.floor(posicion)));
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No hay datos para actualizar" });
    }

    params.push(id);
    const { rows } = await query(
      `UPDATE pedido_estados SET ${updates.join(", ")} WHERE id_estado = $${params.length} RETURNING *`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }

    res.json(mapStatus(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un estado con ese nombre" });
    }
    console.error("Error actualizando estado de pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

pedidoStatusesRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { rows } = await query(`SELECT nombre FROM pedido_estados WHERE id_estado = $1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }

    const estadoNombre = rows[0].nombre;
    const { rowCount } = await query(`SELECT 1 FROM pedidos_suplidores WHERE estado = $1 LIMIT 1`, [estadoNombre]);
    if (rowCount) {
      return res.status(400).json({ message: "No puedes eliminar un estado que está asociado a pedidos" });
    }

    await query(`DELETE FROM pedido_estados WHERE id_estado = $1`, [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando estado de pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default pedidoStatusesRouter;
