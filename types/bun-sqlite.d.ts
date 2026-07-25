/**
 * Minimal ambient types for `bun:sqlite` so the project typechecks without
 * pulling in the full `bun-types` package. Install `@types/bun` to replace this.
 */
declare module "bun:sqlite" {
  export class Statement<Row = unknown, Params extends unknown[] = unknown[]> {
    all(...params: Params): Row[];
    get(...params: Params): Row | null;
    run(...params: Params): { changes: number; lastInsertRowid: number };
  }

  export class Database {
    constructor(filename?: string, options?: { create?: boolean; readonly?: boolean });
    query<Row = unknown, Params extends unknown[] = unknown[]>(
      sql: string,
    ): Statement<Row, Params>;
    run(sql: string, ...params: unknown[]): void;
    exec(sql: string, ...params: unknown[]): void;
    close(): void;
  }

  export default Database;
}
