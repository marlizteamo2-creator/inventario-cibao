declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
  }

  export interface VerifyOptions {
    ignoreExpiration?: boolean;
  }

  export function sign(payload: object, secret: string, options?: SignOptions): string;
  export function verify<T = object>(token: string, secret: string, options?: VerifyOptions): T;
}
