import db from './sqlite.js'

export const serverUser = {
  at: Date.now(),
  mail: 'server@devazuka.com',
  name: 'Server DEVAZUKA',
}

try {
  db.createUser(serverUser)
} catch (err) {
  if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') throw err
}

export const users = new Map(db.allUsers().map(u => {
  u.balance = 0
  return [u.mail, u]
}))

export const createUser = ({ mail, name }) => {
  if (!mail) throw Error('missing mail')
  name || (name = mail.split('@')[0])
  const user = { at: Date.now(), mail, name, balance: 0 }
  db.createUser(user)
  users.set(mail, user)
  return user
}
