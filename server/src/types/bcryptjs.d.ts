declare module "bcryptjs" {
  export function hash(password: string, rounds: number): Promise<string>;
  export function hashSync(password: string, rounds: number): string;
  export function compare(password: string, hash: string): Promise<boolean>;
  export function compareSync(password: string, hash: string): boolean;
  const _default: {
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
  };
  export default _default;
}
