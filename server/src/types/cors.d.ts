declare module "cors" {
  import { Request, Response, NextFunction } from "express";

  type CorsMiddleware = (req: Request, res: Response, next: NextFunction) => void;

  export default function cors(): CorsMiddleware;
}
