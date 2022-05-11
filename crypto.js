import { Buffer } from 'buffer'
import { promisify } from 'util'
import { createCipheriv, createDecipheriv, webcrypto } from 'crypto'

// SECRET must be 48 chars length, generate one with:
// > tr -dc A-Za-z0-9 </dev/urandom | head -c48 ; echo
const SECRET =
  process.env.SECRET || 'dNwQw9cJ73ZaAxPgRCmaTgwagZmNxG39Bjl8J1fSJlavQFOr'
const KEY = SECRET.slice(0, 32)
const IV = SECRET.slice(32, 48)

const b64ToUrl = b64 => b64.replaceAll('/', '_').replaceAll('=', '-').replaceAll('+', '.')
const urlToB64 = url => url.replaceAll('_', '/').replaceAll('-', '=').replaceAll('.', '+')

export const encode = data => {
  const cipher = createCipheriv('aes-256-ctr', KEY, IV)
  return b64ToUrl(
    cipher.update(JSON.stringify(data), 'utf8', 'base64') +
      cipher.final('base64'),
  )
}

export const decode = payload => {
  const decipher = createDecipheriv('aes-256-ctr', KEY, IV)
  return JSON.parse(
    decipher.update(urlToB64(payload), 'base64', 'utf8') +
      decipher.final('utf8'),
  )
}

const toUTF16 = code => String.fromCharCode(code)
export const digestMessage = async message => {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await webcrypto.subtle.digest('SHA-256', data)
  return [...new Uint16Array(hash)].map(toUTF16).join('')
}
