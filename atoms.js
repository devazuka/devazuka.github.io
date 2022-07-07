import { Database } from 'bun:sqlite'

const db = new Database('.data/dev.db', { create: true })
const run = ([query]) => db.run(query)
const sql = ([query]) =>
  new Proxy({}, {
    get: (_, key) => {
      try {
        const stmt = db.prepare(query)
        if (key.startsWith('get')) return stmt.get.bind(stmt)
        if (key.startsWith('all')) {
          const query = stmt.all.bind(stmt)
          query.values = stmt.values.bind(stmt)
          return query
        }
        return stmt.run.bind(stmt)
      } catch (err) {
        console.error('Unable to prepare', key)
        throw err
      }
    },
  })

run`PRAGMA synchronous=NORMAL`
run`PRAGMA journal_mode=WAL`
run`BEGIN TRANSACTION`
run`CREATE TABLE IF NOT EXISTS entity (
  id   INTEGER PRIMARY KEY,
  type TEXT NOT NULL     -- description of the operation
)`
run`CREATE TABLE IF NOT EXISTS tx (
  ts REAL PRIMARY KEY, -- timestamp of the transaction
  op TEXT NOT NULL     -- description of the operation
) WITHOUT ROWID`
run`CREATE TABLE IF NOT EXISTS atom (
  e INTEGER,             -- entity
  a TEXT    NOT NULL,    -- attribute
  v BLOB,                -- value, null = retracted
  t REAL    NOT NULL,    -- timestamp of the transaction
  FOREIGN KEY(e) REFERENCES entity(id),
  FOREIGN KEY(t) REFERENCES tx(ts),
  PRIMARY KEY(e, a, t)
) WITHOUT ROWID`
run`COMMIT`

const { allAtomsByType } = sql`
SELECT e, a, v, t FROM atom
LEFT JOIN entity ON e = id
WHERE type = ?
ORDER BY t ASC
`

const { allAtomsForAttr } = sql`
SELECT e, a, v, t FROM atom
LEFT JOIN entity ON e = id
WHERE type = ? AND a = ?
ORDER BY t ASC
`

const { allAtomsForMatch } = sql`
SELECT id FROM entity
LEFT JOIN atom ON e = id
WHERE type = ? AND a = ? AND v = ?
ORDER BY t ASC
`

const { allEntityForMatch } = sql`
SELECT id FROM entity
LEFT JOIN atom ON e = id
WHERE type = ? AND a = ? AND v = ?
ORDER BY t ASC
`

const { getEntityForMatch } = sql`
SELECT id FROM entity
LEFT JOIN atom ON e = id
WHERE type = ? AND a = ? AND v = ?
ORDER BY t ASC
LIMIT 1
`

const { insertAtom } = sql`
INSERT INTO atom (e, a, v, t) VALUES (?, ?, ?, ?)
`

const { insertEntity } = sql`
INSERT INTO entity (type) VALUES (?)
`
const { insertTransaction } = sql`
INSERT INTO tx (ts, op) VALUES (?, ?)
`

// ENTITY SYSTEM
const start = Date.now()
const ID = Symbol('ID')
const UPDATED_AT = Symbol('UPDATED_AT')
const CREATED_AT = Symbol('CREATED_AT')
const byId = Object.create(null)
const definitions = new Set()
const getById = id => byId[id]
const getFormater = valueType => {
  if (definitions.has(valueType)) return value => value[ID]
  if (valueType === Boolean) return Number
  if (valueType === String) return String
  if (valueType === Date) return value => new Date(value).getTime()
  return _ => _
}
const getParser = valueType => {
  if (definitions.has(valueType)) return getById
  if (valueType === Boolean) return Boolean
  if (valueType === String) return String
  if (valueType === Date) return value => new Date(value)
  return v => (v == null ? undefined : v)
}

export const defineEntity = (name, defs) => {
  const keys = []
  const parser = Object.create(null)
  const formatter = Object.create(null)
  for (const [name, valueType] of Object.entries(defs)) {
    keys.push(name)
    parser[name] = getParser(valueType)
    formatter[name] = getFormater(valueType)
  }

  const entities = []
  const byMail = Object.create(null)
  const meta = new WeakMap()
  const init = (id, createdAt) => {
    const entity = Object.create(proto)
    entities.push((byId[(entity[ID] = id)] = entity))
    entity[CREATED_AT] = createdAt
    return entity
  }
  const empty = Object.fromEntries(keys.map(k => [k]))
  const proto = {
    get createdAt() {
      return this[CREATED_AT]
    },
    get updatedAt() {
      return this[UPDATED_AT]
    },
    clear(reason = defaultClearReason) {
      return this.update(empty, reason)
    },
    update(values, reason = defaultUpdateReason) {
      const changes = []
      for (const [k, v] of Object.entries(values)) {
        const f = formatter[k]
        if (!f) continue // ignore values not defined
        v === this[k] || changes.push({ k, v: f(v) })
      }
      if (!changes.length) return this
      const t = Bun.nanoseconds() / 1e6 + start
      insertTransaction(t, reason)
      this[UPDATED_AT] = t
      const e = this[ID]
      for (const { k, v } of changes) {
        insertAtom(e, k, v, t)
        this[k] = parser[k](v)
      }
      return this
    },
  }

  console.time(`init ${name}`)
  for (const { e, a, v, t } of allAtomsByType(name)) {
    // ignore invalid attributes, possibly removed ?
    const p = parser[a]
    if (!p) continue
    const entity = byId[e] || init(e, t)
    entity[a] = p(v)
    entity[UPDATED_AT] = t
  }
  console.timeEnd(`init ${name}`)

  const defaultClearReason = `clear ${name}`
  const defaultUpdateReason = `update ${name}`
  const defaultAddReason = `create ${name}`
  const create = (values, reason = defaultAddReason) => {
    const id = insertEntity(name).lastInsertRowid
    const entity = init(id).update(values, reason)
    entity[CREATED_AT] = entity[UPDATED_AT]
    return entity
  }

  create.find = (fn, args) => {
    for (const entity of entities) {
      if (fn(entity, args)) return entity
    }
  }

  create.filter = (fn, args) => {
    const results = []
    for (const entity of entities) {
      fn(entity, args) && results.push(entity)
    }
    return results
  }

  create.groupBy = (fn, args) => {
    const groups = {}
    for (const entity of entities) {
      const key = fn(entity, args)
      const group = groups[key] || (groups[key] = [])
      group.push(entity)
    }
    return groups
  }

  create.atomFind = (k, v) => byId[getEntityForMatch(name, k, v)?.id]
  const _getById = e => byId[e.id]
  create.atomFilter = (k, v) => allEntityForMatch(name, k, v).map(_getById)

  // generate quick find for each attributes
  create.past = Object.create(null)
  for (const key of keys) {
    const finder = (entity, value) => entity[key] === value
    const methodKey = `by${key[0].toUpperCase()}${key.slice(1)}`
    create.find[methodKey] = create.find.bind(null, finder)
    create.filter[methodKey] = create.filter.bind(null, finder)
    create.atomFind[methodKey] = create.atomFind.bind(null, key)
    create.atomFilter[methodKey] = create.atomFilter.bind(null, key)
    create.past[key] = () => allAtomsForAttr(name, key)
  }

  definitions.add(create)

  return create
}
