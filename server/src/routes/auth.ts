import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../db/pool";
import { env } from "../config/env";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const { rows } = await query(
      `
        SELECT
          u.id_usuario   AS id,
          u.nombre       AS first_name,
          u.apellido     AS last_name,
          u.email        AS email,
          u.password     AS password_hash,
          u.activo       AS active,
          r.nombre_rol   AS role_name
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.email = $1
        LIMIT 1
      `,
      [email]
    );

    const user = rows.at(0);

    if (!user || !user.active) {
      return res.status(401).json({ message: "Usuario no encontrado o inactivo" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role_name
      },
      env.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.first_name,
        apellido: user.last_name,
        email: user.email,
        rol: user.role_name
      }
    });
  } catch (error) {
    console.error("Error en login", error);
    return res.status(500).json({ message: "Error interno" });
  }
});

export default authRouter;
