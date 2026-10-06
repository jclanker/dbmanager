const Database = require('better-sqlite3')

class DbManager {
    constructor(path, showLogs = false) {
        this.db = new Database(path)
        this.showLogs = showLogs
        this.db.pragma('journal_mode = WAL')
        if (this.showLogs) {
            console.log('better-sqlite3 db init', path)
        }
    }

    close() {
        this.db.close()
    }

    _exec(label, sql, logParams, fn) {
        return new Promise((resolve, reject) => {
            try {
                const t1 = this.showLogs ? performance.now() : 0
                const result = fn(this.db.prepare(sql))
                if (this.showLogs) {
                    const t2 = performance.now()
                    console.log(label, sql, logParams, `(${t2 - t1}ms)`)
                }
                resolve(result)
            } catch (err) {
                reject(err)
            }
        })
    }

    runQuery(sql, params = []) {
        return this._exec('run', sql, params, (statement) => {
            const { changes, lastInsertRowid } = statement.run(params)
            return { changes, lastID: lastInsertRowid, result: null }
        })
    }

    getQuery(sql, params = []) {
        return this._exec('get', sql, params, (statement) => ({ result: statement.get(params) }))
    }

    allQuery(sql, params = []) {
        return this._exec('all', sql, params, (statement) => ({ result: statement.all(params) }))
    }

    statementRun(sql, params) {
        return this._exec('statementRun', sql, params.length, (statement) => {
            const runMany = this.db.transaction((items) => {
                let totalChanges = 0
                for (const item of items) {
                    totalChanges += statement.run(item).changes
                }
                return totalChanges
            })
            return { changes: runMany(params) }
        })
    }

    statementRunReturningIds(sql, params) {
        return this._exec('statementRunReturningIds', sql, params.length, (statement) => {
            const lastIDs = []
            const changesList = []
            for (const item of params) {
                const { lastInsertRowid, changes } = statement.run(item)
                lastIDs.push(lastInsertRowid)
                changesList.push(changes)
            }
            return { lastIDs, changesList, changes: lastIDs.length }
        })
    }

    statementAll(sql, params) {
        return this._exec('statementAll', sql, params.length, (statement) => {
            const getMany = this.db.transaction((items) => {
                const allResults = []
                for (const item of items) {
                    allResults.push(...statement.all(item))
                }
                return allResults
            })
            return { result: getMany(params) }
        })
    }
}

module.exports = DbManager
module.exports.DbManager = DbManager
module.exports.default = DbManager
