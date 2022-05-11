import { readdir, readFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'

import sqlite3 from 'better-sqlite3'

// migration dir
const rootDir = dirname(new URL(import.meta.url).pathname)
const queryDir = join(rootDir, 'query')
const migrationDir = join(rootDir, 'migration')

// init db and log verbose for debug
const dbFile = process.env.DB_FILE || '.data/dev.db'
await mkdir(dirname(dbFile), { recursive: true })
const db = sqlite3(dbFile, {
  // verbose: console.log
})

// set performances parameters
db.pragma('synchronous=NORMAL')
db.pragma('journal_mode=WAL')

// current db version
const { user_version } = db.prepare('pragma user_version').get()

const semify = value => value.endsWith(';') || `${value};`
const runUnsafe = query => {
  db.exec(['BEGIN TRANSACTION;', semify(query.trim()), ';COMMIT;'].join('\n'))
}

// load sql migration files
for (const migrationName of await readdir(migrationDir)) {
  if (!migrationName.endsWith('.sql')) continue
  const migrationVersion = Number(migrationName.split('_')[0])
  if (migrationVersion > user_version) {
    try {
      runUnsafe(
        await readFile(join(migrationDir, migrationName), { encoding: 'utf8' }),
      )
      db.pragma(`user_version=${migrationVersion}`)
    } catch (err) {
      console.error('Unable to apply migration', migrationName)
      throw err
    }
  }
}

// prepare queries
const queriesList = await readdir(queryDir)
const queriesEntries = queriesList.map(async name => {
  const sql = await readFile(join(queryDir, name), 'utf8')
  try {
    const prepared = db.prepare(sql)
    const key = name.slice(0, -'.sql'.length)
    if (key.startsWith('get')) return [key, prepared.get.bind(prepared)]
    if (key.startsWith('all')) {
      const query = prepared.all.bind(prepared)
      query.iterate = prepared.iterate.bind(prepared)
      return [key, query]
    }
    return [key, prepared.run.bind(prepared)]
  } catch (err) {
    console.error('Unable to prepare', name)
    throw err
  }
})

// Unsafely run, use for test only
export const sql = (parts, ...vars) =>
  runUnsafe(vars.reduce((t, v, i) => t + v + parts[i + 1], parts[0]))

export default Object.fromEntries(await Promise.all(queriesEntries))
