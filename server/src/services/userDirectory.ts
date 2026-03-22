import { query } from "../db/pool";

const formatFullName = (nombre?: string | null, apellido?: string | null) => {
  const full = `${nombre ?? ""} ${apellido ?? ""}`.trim();
  if (full) {
    return full;
  }
  return nombre ?? apellido ?? null;
};

export const getAdminEmails = async () => {
  const { rows } = await query(
    `SELECT u.email
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre_rol = 'Administrador' AND u.activo = true`
  );
  return rows.map((row) => row.email as string).filter(Boolean);
};

export const getUserFullName = async (userId: string) => {
  const { rows } = await query(`SELECT nombre, apellido FROM usuarios WHERE id_usuario = $1 LIMIT 1`, [userId]);
  if (!rows.length) {
    return null;
  }
  return formatFullName(rows[0].nombre, rows[0].apellido);
};

export const getUserContactInfo = async (userId: string) => {
  const { rows } = await query(`SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1 LIMIT 1`, [userId]);
  if (!rows.length) {
    return null;
  }
  return {
    fullName: formatFullName(rows[0].nombre, rows[0].apellido),
    email: rows[0].email ?? null
  };
};
