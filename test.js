import { deepStrictEqual as eq, throws } from 'assert'

// imports
import { D, H, M } from './util.js'
import { bookExperience, cancelBooking } from './booking.js'
import { grantCredit, chargeCredit } from './credit.js'
import { createUser } from './user.js'
import db, { sql } from './sqlite.js'
import {
  FULL_DAY,
  HALF_DAY,
  HAPPY_HOUR,
  MEETING_1H,
  MEETING_2H,
} from './experience.js'

// setup
const richUser = createUser({ mail: 'rich@devazuka.com', name: 'Rich boi' })

grantCredit(richUser.mail, 4000)

const poorUser = createUser({ mail: 'poor@devazuka.com', name: 'Poor boi' })

grantCredit(poorUser.mail, 2)

const start = Date.now() - 1000

// bookings need a start time
throws(() => bookExperience({ experience: FULL_DAY, mail: poorUser.mail }), {
  message: 'this booking required a start time',
})

// book without enough credits
throws(
  () =>
    bookExperience({
      experience: FULL_DAY,
      mail: poorUser.mail,
      start: Date.now(),
    }),
  { message: 'not enough credits' },
)

// expect no bookings to be created so far
eq(db.allBookings().length, 0)

// book a full day
eq(bookExperience({ experience: FULL_DAY, mail: richUser.mail, start }), {
  booking: 1,
  credit: 200,
  message: 'booked',
})
eq(richUser.balance, 3800)

// re-book a day already booked
eq(bookExperience({ experience: FULL_DAY, mail: richUser.mail, start }), {
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
eq(bookExperience({ experience: FULL_DAY, mail: richUser.mail, start }), {
  booking: 1,
  credit: 200,
  message: 'booking reopened',
})
eq(richUser.balance, 3800)

// try different time left and confirm the refund rates
for (const { time, rate } of [
  { time: 1 * H, rate: 0.25 },
  { time: 10 * H, rate: 0.5 },
  { time: 8 * D, rate: 0.95 },
  { time: 6 * D, rate: 0.75 },
]) {
  db.updateBookingTimings({ id: 1, start: start - time, at: start - 0.5 * H })
  db.cancelBooking({ id: 1, rm: null })
  chargeCredit(richUser.mail, 200, 1)

  eq(cancelBooking({ id: 1 }), {
    booking: 1,
    credit: -200 * rate,
    message: `refunded at ${rate * 100}%`,
  })
}
eq(richUser.balance, 3490)

// check reopening partially refunded booking, only cost what was refunded
eq(
  bookExperience({
    experience: FULL_DAY,
    mail: richUser.mail,
    start: start - 6 * D,
  }),
  {
    booking: 1,
    credit: 150,
    message: 'booking reopened',
  },
)
eq(richUser.balance, 3340)

console.log(new Date(Math.floor(Date.now() / H) * H))
