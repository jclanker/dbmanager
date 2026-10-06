import type BetterSqlite3 from 'better-sqlite3'

declare class DbManager {
    constructor(path: string, showLogs?: boolean)
    readonly db: BetterSqlite3.Database
    showLogs: boolean
    close(): void
    runQuery(sql: string, params?: DbManager.Params): Promise<DbManager.RunResult>
    getQuery<T = any>(sql: string, params?: DbManager.Params): Promise<DbManager.GetResult<T>>
    allQuery<T = any>(sql: string, params?: DbManager.Params): Promise<DbManager.AllResult<T>>
    statementRun(sql: string, params: DbManager.Params[]): Promise<DbManager.StatementRunResult>
    statementRunReturningIds(sql: string, params: DbManager.Params[]): Promise<DbManager.StatementRunReturningIdsResult>
    statementAll<T = any>(sql: string, params: DbManager.Params[]): Promise<DbManager.AllResult<T>>
}

declare namespace DbManager {
    export { DbManager, DbManager as default }

    export type Params = unknown[] | Record<string, unknown>

    export interface RunResult {
        changes: number
        lastID: number | bigint
        result: null
    }

    export interface GetResult<T = any> {
        result: T | undefined
    }

    export interface AllResult<T = any> {
        result: T[]
    }

    export interface StatementRunResult {
        changes: number
    }

    export interface StatementRunReturningIdsResult {
        lastIDs: Array<number | bigint>
        changesList: number[]
        changes: number
    }
}

export = DbManager
