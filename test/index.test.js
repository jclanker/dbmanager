const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const DbManager = require('..')

const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dbm-')), 'test.db')

const setup = async () => {
    const db = new DbManager(tmpDb())
    await db.runQuery('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT UNIQUE, qty INTEGER)')
    return db
}

test('enables WAL mode', () => {
    const db = new DbManager(tmpDb())
    assert.strictEqual(db.db.pragma('journal_mode', { simple: true }), 'wal')
    db.close()
})

test('runQuery / getQuery / allQuery', async () => {
    const db = await setup()
    const r = await db.runQuery('INSERT INTO items (name, qty) VALUES (?, ?)', ['a', 1])
    assert.deepStrictEqual(r, { changes: 1, lastID: 1, result: null })
    await db.runQuery('INSERT INTO items (name, qty) VALUES (@name, @qty)', { name: 'b', qty: 2 })

    assert.deepStrictEqual(await db.getQuery('SELECT name, qty FROM items WHERE id = ?', [2]), { result: { name: 'b', qty: 2 } })
    assert.deepStrictEqual(await db.getQuery('SELECT * FROM items WHERE id = ?', [99]), { result: undefined })
    assert.deepStrictEqual(await db.allQuery('SELECT name FROM items ORDER BY id'), { result: [{ name: 'a' }, { name: 'b' }] })
    db.close()
})

test('rejects on SQL errors', async () => {
    const db = await setup()
    await assert.rejects(db.runQuery('INSERT INTO nope VALUES (1)'), /no such table/)
    await assert.rejects(db.getQuery('SELEC 1'), /syntax error/)
    db.close()
})

test('statementRun runs all items in one transaction', async () => {
    const db = await setup()
    const { changes } = await db.statementRun('INSERT INTO items (name, qty) VALUES (?, ?)', [['a', 1], ['b', 2], ['c', 3]])
    assert.strictEqual(changes, 3)

    await assert.rejects(db.statementRun('INSERT INTO items (name, qty) VALUES (?, ?)', [['d', 4], ['a', 5]]), /UNIQUE/)
    const { result } = await db.getQuery('SELECT COUNT(*) AS n FROM items')
    assert.strictEqual(result.n, 3, 'failed batch is rolled back')
    db.close()
})

test('statementRunReturningIds', async () => {
    const db = await setup()
    const r = await db.statementRunReturningIds('INSERT INTO items (name, qty) VALUES (?, ?)', [['a', 1], ['b', 2]])
    assert.deepStrictEqual(r, { lastIDs: [1, 2], changesList: [1, 1], changes: 2 })
    db.close()
})

test('statementAll concatenates results', async () => {
    const db = await setup()
    await db.statementRun('INSERT INTO items (name, qty) VALUES (?, ?)', [['a', 1], ['b', 2], ['c', 3]])
    const { result } = await db.statementAll('SELECT name FROM items WHERE qty >= ? ORDER BY id', [[3], [2]])
    assert.deepStrictEqual(result, [{ name: 'c' }, { name: 'b' }, { name: 'c' }])
    db.close()
})

test('named and default exports', () => {
    assert.strictEqual(DbManager.DbManager, DbManager)
    assert.strictEqual(DbManager.default, DbManager)
})
