# dbmanager

A small promise-based wrapper around [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).

- Opens the database in WAL mode.
- Every method returns a Promise, so it drops into async code that expects an async DB API.
- Batch helpers run one prepared statement over many parameter sets, inside a single transaction.
- Optional per-query timing logs.

## Install

```sh
npm install @jclanker/dbmanager
```

## Usage

```js
const DbManager = require('@jclanker/dbmanager')

const db = new DbManager('./data.db', true)   // (path, showLogs = false)

await db.runQuery('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)')

const { lastID, changes } = await db.runQuery('INSERT INTO users (name) VALUES (?)', ['alice'])
const { result: user } = await db.getQuery('SELECT * FROM users WHERE id = ?', [lastID])
const { result: users } = await db.allQuery('SELECT * FROM users')

// Named parameters work too
await db.runQuery('UPDATE users SET name = @name WHERE id = @id', { id: 1, name: 'bob' })

db.close()
```

### Batches

```js
// One transaction; if any row fails, the whole batch is rolled back
const { changes } = await db.statementRun(
    'INSERT INTO users (name) VALUES (?)',
    [['carol'], ['dave']]
)

// Returns the rowid of each inserted row (no transaction; see note below)
const { lastIDs, changesList } = await db.statementRunReturningIds(
    'INSERT INTO users (name) VALUES (?)',
    [['erin'], ['frank']]
)

// Runs the query once per parameter set, in one transaction, and concatenates the rows
const { result } = await db.statementAll(
    'SELECT * FROM users WHERE name = ?',
    [['carol'], ['erin']]
)
```

## API

| Method | Resolves to |
| --- | --- |
| `new DbManager(path, showLogs = false)` | Opens (or creates) the database and enables WAL |
| `runQuery(sql, params = [])` | `{ changes, lastID, result: null }` |
| `getQuery(sql, params = [])` | `{ result }`: the first row, or `undefined` |
| `allQuery(sql, params = [])` | `{ result }`: an array of rows |
| `statementRun(sql, paramsList)` | `{ changes }`: total changes, in one transaction |
| `statementRunReturningIds(sql, paramsList)` | `{ lastIDs, changesList, changes }` |
| `statementAll(sql, paramsList)` | `{ result }`: concatenated rows, in one transaction |
| `close()` | Closes the database (synchronous) |
| `db` | The underlying better-sqlite3 `Database`, for anything else |

Errors (SQL errors, constraint violations) reject the returned Promise.

**Note:** better-sqlite3 is synchronous: each query runs and blocks when you call the method, and
the returned Promise is already settled. The Promise wrapper gives you an async-style interface;
it doesn't move work off the main thread.

`statementRunReturningIds` does not wrap its rows in a transaction, so rows inserted before a
failure stay inserted. Wrap the call in `db.db.transaction(...)` yourself if you need it atomic.

## License

ISC
