import type { RonyxTenantConfig } from "./config";

export type RonyxDatabaseHandle = {
  schema: string;
  connection: string;
  poolSize: number;
  ssl: boolean;
};

export class RonyxDatabase {
  static initialize(config: RonyxTenantConfig["database"]): RonyxDatabaseHandle {
    return {
      schema: config.schema,
      connection: config.connection,
      poolSize: config.poolSize,
      ssl: config.ssl,
    };
  }
}
