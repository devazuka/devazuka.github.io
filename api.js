let _latest = 0
const cleanners = []
export const handlers = {}
const registerEvent = ({ name, match, getInitData, description }) => {
  if (typeof match !== 'function') {
    throw Error('Params match must be a function')
  }

  const listeners = new Map()
  handlers[name] = (session, id, params) => {
    if (listeners.has(id)) return listeners.delete(id)
    const listener = { session, params }
    listeners.set(id, listener)
    getInitData && session.ws.send(JSON.stringify([id, getInitData(listener)]))
  }

  cleanners.push(session => {
    for (const [id, listener] of listeners) {
      listener.session === session && listeners.delete(id)
    }
  })

  return data => {
    const payload = data ? ',' + JSON.stringify(data) : ''
    for (const [id, listener] of listeners.entries()) {
      if (!match(listener, data)) continue
      try {
        listener.session.ws.send(`["${id}"${payload}]`)
      } catch (err) {
        console.error('Unable to emit event', name, 'to user', listener)
      }
    }
  }
}

const registerAction = ({ name, handler, description }) => {
  handlers[name] = async (session, id, params) => {
    try {
      const data = (await handler(params)) || null
      session.ws.send(JSON.stringify([id, data]))
    } catch (err) {
      console.error('Error handling API action', name, '\n', err.stack)
      session.ws.send(JSON.stringify([id, { error: err.message, ...err }]))
    }
  }
}

// remove all
export const cleanupSession = session => {
  for (const clean of cleanners) clean(session)
}

export const handle = (name, session, id, data) =>
  console.log(name, { id, data, user: session?.user?.mail }) ||
  handlers[name](session, id, data)

const eventGet = (_, name) => {
  if (!/^emit[0-9A-Z]/.test(name)) {
    throw Error('events functions must start with emit')
  }
  const eventName = `on${name.slice('emit'.length)}`
  return registerEvent({ name: eventName, ...x })
}
export const EVENT = x => new Proxy({}, { get: eventGet })

/*

Register events:

  const { emitMyEvent } = EVENT({
    description: 'my event',
    match: xxx, // how to know if the session should recieve the event
    persist: true, // should we store it in the database, optional, default false
  })

  emitMyEvent('Hello') // emit event with the data you want

*/

const actionGet = (_, name) => x => registerAction({ name, ...x })
export const ACTION = new Proxy({}, { get: actionGet })

/*

Register actions:

  ACTION.doSomething({
    description: 'Do something amazing',
    handler: async () => {
      return 50 // value will be returned to client
    }
    persist: true, // optional, default false
  })

*/
