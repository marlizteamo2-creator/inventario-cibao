import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { query } from "../db/pool";

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const unauthorized = (res: Response) => res.status(401).json({ message: "Token no válido" });

export const requireAuth = (allowedRoles?: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return unauthorized(res);
      }

      const token = authHeader.replace("Bearer ", "");
      let payload: TokenPayload;
      try {
        payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
      } catch (error) {
        console.error("Token inválido", error);
        return unauthorized(res);
      }

      const { rows } = await query(
        `SELECT u.id_usuario AS id, u.email, u.activo, r.nombre_rol AS role_name
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1
         LIMIT 1`,
        [payload.sub]
      );

      const user = rows.at(0);
      if (!user || !user.activo) {
        return unauthorized(res);
      }

      if (allowedRoles && !allowedRoles.includes(user.role_name)) {
        return res.status(403).json({ message: "No tienes permisos para esta acción" });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role_name
      };

      next();
    } catch (error) {
      console.error("Error en middleware de autenticación", error);
      return unauthorized(res);
    }
  };
};
