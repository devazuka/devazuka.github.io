import db from './sqlite.js'
import { serverUser, users } from './user.js'

// load initial balances
for (const credit of db.allBalances()) {
  const user = users.get(credit.mail)
  user.balance = credit.balance
}

const checkBalance = (user, amount) => {
  const nextBalance = user.balance - Math.abs(amount)
  if (nextBalance < 0) throw Error('not enough credits')
}

export const canCharge = (mail, amount) => checkBalance(users.get(mail), amount)

const serverBy = serverUser.mail
export const createCredit = (user, amount, booking = null) => {
  if (!amount) return // do nothing if no amount
  const at = Date.now()
  const credit = { at, by: serverBy, mail: user.mail, amount, booking }
  credit.id = db.createCredit(credit).lastInsertRowid
  user.balance += amount
  return credit
}

export const chargeCredit = (mail, amount, booking) => {
  const user = users.get(mail)
  checkBalance(user, amount)
  return createCredit(user, -Math.abs(amount), booking)
}

export const grantCredit = (mail, amount, booking) =>
  createCredit(users.get(mail), Math.abs(amount), booking)
