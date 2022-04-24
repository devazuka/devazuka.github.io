// dev server

import { join, extname } from 'https://deno.land/std@0.136.0/path/mod.ts'
import { readableStreamFromReader } from 'https://deno.land/std@0.136.0/streams/mod.ts'

async function main() {
  console.log('in main!')
  const next = () => fetch(location.href).then(r => r.text())
  const wait = ms => new Promise(s => setTimeout(s, ms))
  let prev = await next()
  while (true) {
    await wait(100)
    const current = await next()
    if (current === prev) continue
    console.log('UPDATE')
    prev = current
    document.documentElement.innerHTML = prev
  }
}

async function serveFile(pathname) {
  try {
    const file = await Deno.open(`.${pathname}`, { read: true })
    const stat = await file.stat()

    // If File instance is a directory, lookup for an index.html
    if (stat.isFile) return new Response(readableStreamFromReader(file))
    file.close()
    const index = await Deno.readTextFile(join('./', pathname, 'index.html'))
    const [head, body] = index.split('</head>')

    return new Response(
      `${head}<script>${main};main()</script></head>${body}`,
      { headers: { 'content-type': 'text/html' } },
    )
  } catch (err) {
    // TODO: check the error type: ENOENT
    // if no extension, try .html
    if (!extname(pathname)) return serveFile(`${pathname}.html`)
    console.log(err)
    return new Response(`${pathname}: 404 Not Found`, { status: 404 })
  }
}

const PORT = Deno.env.get('PORT') || 8080
const server = Deno.listen({ port: PORT })
console.log(`HTTP webserver running.`)
console.log(`Access it at: http://localhost:${PORT}/`)

for await (const conn of server) {
  for await (const http of Deno.serveHttp(conn)) {
    try {
      const res = await serveFile(
        decodeURIComponent(new URL(http.request.url).pathname),
      )
      http.respondWith(res)
    } catch (err) {
      console.error(err)
      const body = err.stack
      const status = err.statusCode || 500
      http.respondWith(new Response(body, { status }))
    }
  }
}
