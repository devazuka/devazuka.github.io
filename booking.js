import db from './sqlite.js'
import { H, M, D, nearestHour, nearestDay } from './util.js'
import { specialExperiences, experiences } from './experience.js'
import { chargeCredit, grantCredit } from './credit.js'

const makeDayHandler = experience => {
  const checkStart = start => {
    if (!start) throw Error('this booking required a start time')
    const startDay = nearestDay(start) + experience.open
    const hour = (startDay % D) / H
    console.log({ startDay, experience, hour })
    // if (hour < 8 && hour >)
    return startDay
  }
  // check if free:

  // what differs:
  // - how to calculate availability
  // - get cost
  // - 
  return { checkStart }
}

const makeMeetingRoomHandler = experience => {
  // rules of the booking the meeting room:
  // - if it's current time = 50% + pro rata of time left
  // - if it's less than 1h before = 50% price
  // - if it's less than 1d before = 75% of the price
  // - otherwhise full price
  return { checkStart() {} }
}

const success = (message, booking, credit = 0) => ({ credit, booking, message })

const bookers = new Map(
  Object.entries(specialExperiences).map(([k, experience]) => [
    experience.id,
    experience.capacity === 1
      ? makeMeetingRoomHandler(experience)
      : makeDayHandler(experience),
  ]),
)
const defaultBooker = {
  checkStart: () => null,
}

const getRefundRate = timeLeft => {
  if (timeLeft < 1 * H) return 0.0
  if (timeLeft < 4 * H) return 0.25
  if (timeLeft < 1 * D) return 0.5
  if (timeLeft < 7 * D) return 0.75
  return 0.95
}

const getCapacity = experience =>
  experience.capacity - db.getBookingCount({ for: experience.id }).count

const reOpenBooking = booking => {
  // ensure booking already canceled
  if (!booking.rm) return success('already booked', booking.id)

  // make sure the experience is not full
  const experience = experiences.get(booking.for)
  if (getCapacity(experience) >= 0) throw Error('no bookings left')
  db.cancelBooking({ id: booking.id, rm: null })

  // only charge back if was refunded
  const credit = db.getLastCreditForBooking({ booking: booking.id })
  credit?.amount > 0 && chargeCredit(booking.mail, credit.amount, booking.id)

  return success('booking reopened', booking.id, Math.abs(credit?.amount || 0))
}

export const bookExperience = ({ experience, mail, start }) => {
  const booker = bookers.get(experience.id) || defaultBooker
  start = booker.checkStart(start)

  // check if booking already exist
  const query = { mail, for: experience.id, start }

  // if we already have a booking cancel, we re-use it
  const previousBooking = db.getMatchingBooking(query)
  if (previousBooking) return reOpenBooking(previousBooking)
  // charge for the cost of the experience
  const capacity = getCapacity(experience)
  if (capacity >= 0) throw Error('no bookings left')

  const id = db.createBooking({ ...query, at: Date.now() }).lastInsertRowid
  if (capacity) {
    // early bird price:
    // - less than 1/4 of the capacity and more than 7days before
  }
  try {
    chargeCredit(mail, experience.cost, id)
  } catch (err) {
    // if fail to charge, remove the booking
    db.deleteBooking({ id })
    throw err
  }
  return success('booked', id, experience.cost)
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
  const timeLeft = now - (booking.start || experiences.get(booking.for).open)
  const refundRate = getRefundRate(timeLeft)
  const refundAmount = Math.round(refundRate * chargedAmmout)
  if (!refundAmount) return success('canceled too late for refund')
  grantCredit(booking.mail, refundAmount, id)
  return success(`refunded at ${refundRate * 100}%`, id, refundAmount)
}
