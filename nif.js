import { serve } from "https://deno.land/std@0.144.0/http/server.ts";
import { join } from "https://deno.land/std@0.144.0/path/mod.ts";

const keys = [
	
]

let currentKey = Math.floor(Math.random()*keys.length)

const possibleStarts = new Set([
	...[...Array(10).keys()].map(n => `5${n}`),
	'70',
	'71',
	'90',
	'91',
	'98',
	'99',
])

await Promise.all([...possibleStarts].map(d => Deno.mkdir(join('nif', d), {recursive: true})))

const safeReadFile = async (path) => {
	try {
		return await Deno.readFile(path)
	} catch (err) {
		console.log(err)
		// TODO: check that it's err not found or throw
	}
}

const API = async (q) => {
	const key = keys[(++currentKey)%keys.length]
	const res = await fetch(`https://www.nif.pt/?json=1&q=${q}&key=${key}`)
	return res.json()
}

const getNIF = async nif => {
	console.log({ nif })
	const base = nif.slice(0, 2)
	const rest = nif.slice(2)
	// TODO: test nif is only numbers
	//       test nif length
	const canBeCompanyNIF = possibleStarts.has(base)
	if (!canBeCompanyNIF) throw Error('not a company')
	const path = join('nif', base, rest)
	const cache = await safeReadFile(path)
	if (cache) return cache
	const data = await API(nif)
	await Deno.mkdir(base, { recursive: true })
	if (data.result === 'error') {
		console.log(data)
		throw Error(data.message)
	}
	const buff = new TextEncoder().encode(JSON.stringify(data.records[nif]))
	await Deno.writeFile(path, buff)
	return buff
}

const handler = async (req) => {
	try {
		const url = new URL(req.url)
		console.log(url, url.pathname.split('/'))
		return new Response(await getNIF(url.pathname.split('/').at(-1)))
	} catch (err) {
		console.error(err)
		return new Response(JSON.stringify({ error: err.message }), { status: 500 })
	}
}

serve(handler, { port: 9382 })
