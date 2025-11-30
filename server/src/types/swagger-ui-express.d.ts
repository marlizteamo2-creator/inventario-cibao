declare module "swagger-ui-express" {
  import { Request, Response, NextFunction } from "express";

  type Middleware = (req: Request, res: Response, next: NextFunction) => void;

  export const serve: Middleware[];
  export function setup(document: object): Middleware;
}
