declare module "pg" {
  import { EventEmitter } from "events";

  export interface QueryResult<R = any> {
    rows: R[];
    rowCount: number;
    command: string;
  }

  export interface QueryConfig {
    text: string;
    values?: any[];
  }

  export class Pool extends EventEmitter {
    constructor(config: { connectionString: string });
    query<R = any>(text: string | QueryConfig, values?: any[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
}
