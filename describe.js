import db from './sqlite.js'

const fieldsDescriptions = db.allTables()
export const tables = {}
for (const { table, key, type } of fieldsDescriptions) {
  ;(tables[table] || (tables[table] = {}))[key] = { type }
}

// Add references links
for (const { table, key, refKey, refTable } of fieldsDescriptions) {
  if (!refKey) continue
  const ref = tables[refTable][refKey]
  const refBy = ref.refBy || (ref.refBy = [])
  tables[table][key].ref = `${refTable}.${refKey}`
  refBy.push(`${table}.${key}`)
}

console.dir(tables, { depth: 3 })