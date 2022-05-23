import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { readFile } from 'fs/promises'
import { once } from 'events'
import { join, dirname } from 'path'

import db from './sqlite.js'
import { H } from './util.js'
import { users } from './user.js'
import { encode } from './crypto.js'
import { sendLink } from './mailjet.js'
import { authentify, createSessionFromToken } from './session.js'

const PORT = process.env.PORT || 8666
const DEV = process.env.NODE_ENV !== 'production'

const { handle, handlers, cleanupSession } = await import('./api.js')

// Static templating
const placeholders = {
  EVENTS: JSON.stringify(Object.keys(handlers)),
}

const rootDir = dirname(new URL(import.meta.url).pathname)

// Pending session holds sessions waiting for the mail link to be clicked
const pendingSessions = new Map()
const validateSession = (request, token) => {
  const { session, user } = createSessionFromToken(request, token)
  const payload = JSON.stringify(['session', session])
  for (const [ws, mail] of pendingSessions) {
    if (mail !== user) continue
    pendingSessions.delete(ws)
    ws.send(payload)
  }
  return session
}
const fileCache = {}
const loadFile = async path => {
  const template = await readFile(join(rootDir, path), 'utf8')
  return template.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    (_, key) => placeholders[key],
  )
}

const serveFile = DEV
  ? loadFile // always reload in dev mode
  : path => fileCache[path] || (fileCache[path] = loadFile(path))

// Serve HTTP request
const TYPE_JS = 'application/javascript; charset=utf-8'
const TYPE_HTML = 'text/html; charset=utf-8'
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost/')
  if (request.method === 'GET' && url.pathname.startsWith('/app/')) {
    try {
      const content = await serveFile(url.pathname)
      response.writeHead(200, { 'Content-type': TYPE_JS })
      response.end(content)
    } catch (err) {
      console.log(err)
    }
  }
  if (request.method !== 'GET' || url.pathname !== '/') {
    response.writeHead(404)
    response.end()
  } else {
    let location = url.pathname
    const token = url.searchParams.get('token')
    const content = await serveFile('index.html')
    if (!token) {
      response.writeHead(200, { 'Content-type': TYPE_HTML })
      return response.end(content)
    }
    // handle authentification links
    try {
      location += `?session=${validateSession(request, token)}`
    } catch (err) {
      location += `?error=${encodeURIComponent(err.message)}`
    }
    response.writeHead(302, { location })
    response.end()
  }
})

// Upgrade websocket connexions
const wss = new WebSocketServer({ noServer: true })
server.on('upgrade', (request, socket, head) =>
  wss.handleUpgrade(request, socket, head, async ws => {
    try {
      const user = authentify(request, ws)
      const session = { ws, user }

      // remove listeners when closing
      ws.on('close', () => cleanupSession(session))

      // forward incomming message to API
      ws.on('message', message => {
        try {
          const [name, id, data] = JSON.parse(message.toString('utf8'))
          handle(name, session, id, data)
        } catch (err) {
          console.error('Bad message from user', user.mail, 'API', message)
          console.error(err.stack)
        }
      })

      ws.send(JSON.stringify(['auth', { org: user.org.name }]))
    } catch (err) {
      ws.send(JSON.stringify(['auth', err.message]))
      while (true) {
        // expect a mail
        const [message] = await once(ws, 'message')
        const mail = message.toString('utf8')
        // when mail is know
        if (!users.has(mail)) continue

        // send mail with url link
        console.log('generate session for user')
        const exp = Date.now() + H // expire in 1h
        const token = encode({ exp, mail })

        // wait for link to be click
        pendingSessions.set(ws, mail)
        ws.on('close', () => pendingSessions.delete(ws))

        DEV
          ? validateSession(request, token)
          : sendLink(mail, `https://devazuka.com?token=${token}`)
      }
    }
  }),
)

server.listen(PORT, console.log(`server listening on ${PORT}`))
