import db from './sqlite.js'
import { H, M, nearestDay, nearestHour } from './util.js'

// last minute is cheaper for rooms
const deskDiscount = elapsed => {
  if (elapsed >= 18 * H) return 75
  if (elapsed >= 13 * H) return 150
  return 200
}

const deskTimes = start => {
  const open = nearestDay(start) + 8 * H
  return { open, close: open + 21 * H }
}

const makeRoom = ({ cost }) => ({
  max: 1,
  getDetails: (start, mail, duration) => {
    if (!duration) throw Error('invalid booking duration')
    if (duration > 2 * H) throw Error('booking too long')
    if (duration < 1 * H) throw Error('booking too short')
    const match = db.getMatchingBooking({ ...deskTimes(start), mail, space: 'desk' })
    if (!match) throw Error('must have booked a desk to book a room')
    const long = duration > 1 * H
    const discount = (start - Date.now() < 10 * M ? 0.5 : 1) * (long ? 1.5 : 1)
    const open = nearestHour(start)
    const close = open + duration

    // round to the nearest 5, to avoid wierd prices
    const rounded = Math.trunc((discount * cost) / 5 + 0.5) * 5

    // TODO: check that they have a booking for the day
    return { open, close, cost: rounded }
  },
})


export const spaces = {
  desk: {
    max: 40,
    getDetails: start => {
      const { open, close } = deskTimes(start)
      // TODO: check if the space is closed that day, maybe special time too ?
      return { open, close, cost: deskDiscount(start - open) }
    },
  },
  room: makeRoom({ cost: 75 }),
  booth1: makeRoom({ cost: 45 }),
  booth2: makeRoom({ cost: 50 }),
}

for (const name of Object.keys(spaces)) {
  db.createSpace({ name })
}
