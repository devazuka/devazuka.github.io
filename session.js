import { encode, decode } from './crypto.js'
import db from './sqlite.js'
import { users } from './user.js'

const getSessionParams = ({ headers, socket }) => ({
  ua: headers['user-agent'],
  ip: headers['x-forwarded-for']?.split(',').shift()
    || socket?.remoteAddress,
})

export const createSessionFromToken = (request, token) => {
  const { mail, exp } = decode(token)
  const at = Date.now()
  if (exp < at) throw Error('Expired token')
  const { ua, ip } = getSessionParams(request)
  const { lastInsertRowid } = db.createSession({ mail, ua, ip, at })
  return { session: encode({ id: lastInsertRowid, mail }), mail }
}

export const authentify = request => {
  const { headers, socket } = request
  const authorization = request.url.slice(1)
  if (!authorization) throw Error('Missing credentials')
  const payload = decode(authorization)
  const at = Date.now()
  // const { ua, ip } = getSessionParams(request) // not used
  const session = db.getSession(payload.id)
  if (!session) throw Error('Missing Session')
  const user = users.get(session.mail)
  if (!user) throw Error('User not found')
  return user
}
