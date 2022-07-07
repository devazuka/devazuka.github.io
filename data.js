import db from './sqlite.js'

const {
  insertEntity,
  insertTransaction,
  insertAtom,
  allAtomsByType,
  allAtomsForAttr,
  getEntityForMatch,
} = db

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
const defineEntity = (name, defs) => {
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
      const t = performance.now() + start
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

  for (const { e, a, v, t } of allAtomsByType(name)) {
    // ignore invalid attributes, possibly removed ?
    const p = parser[a]
    if (!p) continue
    const entity = byId[e] || init(e, t)
    entity[a] = p(v)
    entity[UPDATED_AT] = t
  }

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
  create.atomFilter = () => allEntityForMatch(name, k, v).map(_getById)

  // generate quick find for each attributes
  create.past = Object.create(null)
  for (const key of keys) {
    const finder = (entity, value) => entity[key] === value
    const methodKey = `by${key[0].toUpperCase()}${key.slice(1)}`
    create.find[methodKey] = create.find.bind(null, finder)
    create.filter[methodKey] = create.filter.bind(null, finder)

    create.past[key] = () => allAtomsForAttr(name, key)
  }

  definitions.add(create)

  return create
}

export const User = defineEntity('user', {
  mail: String,
  name: String,
  tax: String,
  phone: String,
  address: String,
  discord: String,
  github: String,
})

export const Pass = defineEntity('pass', {
  user: User,
  until: Date,
})

export const Transaction = defineEntity('transaction', {
  pass: Pass,
  amount: Number, // 0 = refunded
  stripe: String, // stripe checkout id, if null -> cash transaction
})

// TODO:

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const MONTH = 30 * DAY
export const getActiveUsers = () => {
  const now = Date.now()
  const active = Pass.filter(p => p.until > now)
  return active.map(p => ({
    mail: p.user.mail,
    name: p.user.name,
    until: p.until,
  }))
}

// load initial data from stripe api
// update transaction on strip events (webhook)
