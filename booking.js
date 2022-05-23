import db from './sqlite.js'
import { H, M, D, nearestHour, nearestDay } from './util.js'
import { chargeCredit, grantCredit, canCharge } from './credit.js'
import { spaces } from './space.js'

const success = (message, booking, credit = 0) => ({ credit, booking, message })

const getRefundRate = timeLeft => {
  if (timeLeft < 1 * H) return 0.0
  if (timeLeft < 4 * H) return 0.25
  if (timeLeft < 1 * D) return 0.5
  if (timeLeft < 7 * D) return 0.75
  return 0.95
}

const getCapacity = booking =>
  spaces[booking.space].max - db.getBookingCount(booking).count

const reOpenBooking = booking => {
  // ensure booking already canceled
  if (!booking.rm) return success('already booked', booking.id)

  // make sure the experience is not full
  const capacity = getCapacity(booking)
  if (capacity >= 0) throw Error('no bookings left')
  db.cancelBooking({ id: booking.id, rm: null })

  // only charge back if was refunded
  const credit = db.getLastCreditForBooking({ booking: booking.id })
  credit?.amount > 0 && chargeCredit(booking.mail, credit.amount, booking.id)

  return success('booking reopened', booking.id, Math.abs(credit?.amount || 0))
}

export const book = ({ space, mail, start, duration }) => {
  if (!start) throw Error('this booking required a start time')
  const def = spaces[space]
  if (!def) throw Error(`space [${space}] not found`)
  const { open, close, cost } = def.getDetails(start, mail, duration)
  const now = Date.now()

  // if already closed
  if (close < now) throw Error('booking already closed')

  // check if booking already exist
  const booking = { mail, space, open, close, at: now }

  // if we already have a booking cancel, we re-use it
  const previousBooking = db.getMatchingBooking(booking)
  if (previousBooking) return reOpenBooking(previousBooking)

  // check if we have an overlapping booking (same space, overlaping time)
  const overlapping = db.getOverlappingBooking(booking)
  if (overlapping) {
    // check if the booking already include this booking
    if (close <= overlapping.close && open >= overlapping.open) {
      return success('already booked', overlapping.id)
    }

    // fail if we are not extending the overlapping booking
    // ex: a room booking from 8h-10h overlapping with 9h-11h booking
    if (close < overlapping.close || open > overlapping.open) {
      throw Error('you have an overlapping booking')
    }
  }

  // we must have some capacity left
  const capacity = getCapacity(booking)
  if (capacity > 0) throw Error('no bookings left')

  const alreadySpend = Math.min(overlapping?.cost || 0, 0)
  const finalCost = Math.max(cost + alreadySpend, 0)
  canCharge(mail, finalCost) // throw if not possible

  // cancel booking being extended
  overlapping && db.cancelBooking({ id: overlapping.id, rm: now })

  // create the booking and charge for the cost of the experience
  const id = db.createBooking(booking).lastInsertRowid
  chargeCredit(mail, finalCost, id)
  return success('booked', id, finalCost)
}

export const cancelBooking = ({ id }) => {
  const now = Date.now()
  const booking = db.getBookingById({ id })
  if (booking.rm) throw Error('booking already canceled')
  db.cancelBooking({ id, rm: now })

  // handle the refund
  const credit = db.getLastCreditForBooking({ booking: id })
  const chargedAmmout = credit?.amount || 0

  if (chargedAmmout > 0) throw Error('nothing to refund')

  // check the time of the booking, full refund if booked 5min ago
  const elapsed = now - booking.at
  if (elapsed < 5 * M) {
    grantCredit(booking.mail, chargedAmmout, id)
    return success('full refund', id, chargedAmmout)
  }

  // check the time until the experience
  const refundRate = getRefundRate(now - booking.open)
  const refundAmount = Math.round(refundRate * chargedAmmout)
  if (!refundAmount) return success('canceled too late for refund')
  grantCredit(booking.mail, refundAmount, id)
  return success(`refunded at ${refundRate * 100}%`, id, refundAmount)
}
