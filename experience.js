import db from './sqlite.js'
import { H } from './util.js'
import { serverUser } from './user.js'

const MAX_SPECIAL = 99999

export const isSpecial = id => (id?.id || id) <= MAX_SPECIAL

let _lastInsertedRowId = 0
const defExp = (name, params) => ({
  id: ++_lastInsertedRowId,
  at: 0,
  by: serverUser.mail,
  name,
  open: 0,
  capacity: 40,
  ...params,
})

// ORDER MATTER !
export const FULL_DAY = defExp('Full Day', {
  open: 8 * H,
  close: 13 * H,
  cost: 200,
})

export const HALF_DAY = defExp('Half Day', {
  open: 13 * H,
  close: 18 * H,
  cost: 150,
})

export const HAPPY_HOUR = defExp('Happy Hour', {
  open: 18 * H,
  close: 21 * H,
  cost: 75,
})

export const MEETING_1H = defExp('Meeting room 1h', {
  cost: 50,
  close: 1 * H,
  capacity: 1,
})

export const MEETING_2H = defExp('Meeting room 2h', {
  cost: 75,
  close: 2 * H,
  capacity: 1,
})

export const specialExperiences = {
  FULL_DAY,
  HALF_DAY,
  HAPPY_HOUR,
  MEETING_1H,
  MEETING_2H,
}

for (const experience of Object.values(specialExperiences)) {
  try {
    db.createExperience(experience)
  } catch (err) {
    if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') throw err
  }
}
// reserve id block for custom ids

export const experiences = new Map(db.allExperiences().map(e => [e.id, e]))
_lastInsertedRowId = Math.max(MAX_SPECIAL, [...experiences.keys()].at(-1))

export const createExperience = ({
  by,
  name,
  at,
  open,
  close,
  cost = 0,
  capacity = 1,
}) => {
  const id = ++_lastInsertedRowId
  const experience = { id, by, name, cost, at, open, close, capacity }
  db.createExperience(experience)
  experiences.set(id, experience)
  return experience
}

export const updateExperience = ({ id, ...newValues }) => {
  const prevExperience = experiences.get(id)
  if (!prevExperience) throw Error(`experience ${id} not found`)
  const experience = { ...prevExperience }
  for (const [k, v] of Object.entries(newValues)) {
    experience[k] = v
  }
  db.updateExperience(experience)
  experiences.set(id, experience)
  return experience
}

export const cancelExperience = ({ id }) => {
  const experience = experiences.get(id)
  const at = Date.now()
  experience.rm = at
  return db.cancelExperience({ id, at }).changes
}
