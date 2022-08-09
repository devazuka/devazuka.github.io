import { defineEntity, db } from './atoms.js'

export const User = defineEntity('user', {
  // identification
  mail: String,
  name: String,

  // for tax purposes
  tax: String,
  address: String,

  // social links
  phone: String,
  discord: String,
  github: String,
  eventbrite: String,
  meetup: String,
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

const   MIN = 60 * 1000
const  HOUR = 60 * MIN
const   DAY = 24 * HOUR
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

export const refund = (stripeCheckoutId) => {
  // cancel related pass
  const transaction = Transaction.find.byStripe(stripeCheckoutId)
  if (transaction) {
    console.warn('transaction not found for checkout', { stripeCheckoutId })
    return
  }

  // mark as refunded
  transaction.update({ amount: 0 })

  // expire the pass (if any linked)
  transaction.pass?.update({ until: Date.now() })
}

// load initial data from stripe api
// - find the latest stripe info

// update transaction on strip events (webhook)
