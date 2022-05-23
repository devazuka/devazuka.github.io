import { deepStrictEqual as eq, throws } from 'assert'

import { D, H, M } from './util.js'
import { book, cancelBooking } from './booking.js'
import { grantCredit, chargeCredit } from './credit.js'
import { createUser } from './user.js'
import db, { sql } from './sqlite.js'

// setup
const richUser = createUser({ mail: 'rich@devazuka.com', name: 'Rich boi' })

grantCredit(richUser.mail, 4000)

const poorUser = createUser({ mail: 'poor@devazuka.com', name: 'Poor boi' })

grantCredit(poorUser.mail, 2)

const start = new Date('2224-05-23T08:03:16.163Z').getTime()
const { now } = Date
const nowDiff = start - now()
globalThis.Date = class extends Date {
  constructor(...args) {
    args.length ? super(...args) : super(Date.now())
  }
}
globalThis.Date.now = () => now() + nowDiff

// bookings need a start time
throws(() => book({ space: 'desk', mail: poorUser.mail }), {
  message: 'this booking required a start time',
})

// book without enough credits
throws(() => book({ space: 'desk', mail: poorUser.mail, start: Date.now() }), {
  message: 'not enough credits',
})

// expect no bookings to be created so far
eq(db.allBookings().length, 0)

// book a full day
eq(book({ space: 'desk', mail: richUser.mail, start }), {
  booking: 1,
  credit: 200,
  message: 'booked',
})
eq(richUser.balance, 3800)

// re-book a day already booked
eq(book({ space: 'desk', mail: richUser.mail, start }), {
  booking: 1,
  credit: 0,
  message: 'already booked',
})
eq(richUser.balance, 3800)

// cancel a very recent booking, full refund
eq(cancelBooking({ id: 1 }), {
  booking: 1,
  credit: -200,
  message: 'full refund',
})
eq(richUser.balance, 4000)

// re-book a day already canceled
eq(book({ space: 'desk', mail: richUser.mail, start }), {
  booking: 1,
  credit: 200,
  message: 'booking reopened',
})
eq(richUser.balance, 3800)
const booking1 = db.getBookingById({ id: 1 }) // save for later

// different time left and confirm the refund rates
for (const { time, rate } of [
  { time: 1 * H, rate: 0.25 },
  { time: 10 * H, rate: 0.5 },
  { time: 8 * D, rate: 0.95 },
  { time: 6 * D, rate: 0.75 },
]) {
  const open = start - time
  db.updateBookingTimings({ id: 1, open, at: open - 30 * M, rm: null })
  chargeCredit(richUser.mail, 200, 1)
  eq(cancelBooking({ id: 1 }), {
    booking: 1,
    credit: -200 * rate,
    message: `refunded at ${rate * 100}%`,
  })
}
eq(richUser.balance, 3490)

// reopening partially refunded booking only cost what was refunded
db.updateBookingTimings({ ...booking1, rm: Date.now() }) // restore saved time
eq(book({ space: 'desk', mail: richUser.mail, start }), {
  booking: 1,
  credit: 150,
  message: 'booking reopened',
})
eq(richUser.balance, 3340)

// book a closed booking
throws(() => book({ space: 'desk', mail: richUser.mail, start: start - D }), {
  message: 'booking already closed',
})

// book a room
eq(book({ space: 'room', mail: richUser.mail, start, duration: 2 * H }), {
  booking: 2,
  credit: 55,
  message: 'booked',
})

// overlapping including booking
eq(book({ space: 'room', mail: richUser.mail, start, duration: 1 * H }), {
  booking: 2,
  credit: 0,
  message: 'already booked',
})

eq(
  book({ space: 'room', mail: richUser.mail, start: start + H, duration: H }),
  { booking: 2, credit: 0, message: 'already booked' },
)

// overlapping error
throws(
  () =>
    book({
      space: 'room',
      mail: richUser.mail,
      start: start + H,
      duration: 2 * H,
    }),
  { message: 'you have an overlapping booking' },
)

// overlapping excluding (before) booking
eq(
  book({
    space: 'room',
    mail: richUser.mail,
    start: start + 2 * H,
    duration: H,
  }),
  { booking: 3, credit: 75, message: 'booked' },
)

eq(
  book({
    space: 'room',
    mail: richUser.mail,
    start: start + 2 * H,
    duration: 2 * H,
  }),
  { booking: 4, credit: 40, message: 'booked' },
)
eq(typeof db.getBookingById({ id: 3 }).rm, 'number')

// overlapping excluding (after) booking
// book the touching previous hour
