import db from './sqlite.js'
import { serverUser, users } from './user.js'

// load initial balances
for (const credit of db.allBalances()) {
  const user = users.get(credit.mail)
  user.balance = credit.balance
}

const serverBy = serverUser.mail
const createCredit = (mail, amount, booking = null) => {
  const at = Date.now()
  const user = users.get(mail)
  const nextBalance = user.balance + amount
  if (nextBalance < 0) throw Error('not enough credits')
  const credit = { at, by: serverBy, mail, amount, booking }
  credit.id = db.createCredit(credit).lastInsertRowid
  user.balance = nextBalance
  return credit
}

export const chargeCredit = (mail, amount, booking) =>
  createCredit(mail, -Math.abs(amount), booking)

export const grantCredit = (mail, amount, booking) =>
  createCredit(mail, Math.abs(amount), booking)
