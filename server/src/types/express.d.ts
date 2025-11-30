declare module "express" {
  import { EventEmitter } from "events";

  export interface Request {
    body?: any;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
  }

  export type NextFunction = (err?: unknown) => void;

  export interface RouterHandler extends EventEmitter {
    post(path: string, handler: (req: Request, res: Response, next: NextFunction) => unknown): this;
    use(...args: any[]): this;
  }

  export interface Express extends EventEmitter {
    use(...args: any[]): Express;
    get(path: string, handler: (req: Request, res: Response, next: NextFunction) => unknown): Express;
    listen(port: number, cb?: () => void): void;
  }

  interface ExpressStatic {
    (): Express;
    Router(): RouterHandler;
    json(): (req: Request, res: Response, next: NextFunction) => void;
  }

  const e: ExpressStatic;
  export = e;
}
