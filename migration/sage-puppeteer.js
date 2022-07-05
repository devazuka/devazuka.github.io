import puppeteer from 'puppeteer'

const getSession = async () => {
	const browser = await puppeteer.launch({
		headless: false
	})

	const page = await browser.newPage()
	await page.goto('https://app.pt.sageone.com/', {
		waitUntil: 'networkidle2',
	})

	await page.type('input[type=email]', 'clement@devazuka.com')
	await page.type('input[type=password]', '')
	await page.keyboard.press('Enter')
	const selector = await page.waitForSelector('meta[name=csrf-token]')
	const token = await page.$eval('meta[name=csrf-token]', meta => meta.content)
	const cookies = Object.fromEntries((await page.cookies()).map(c => [c.name, c.value]))
	await browser.close()
	return { token, cookies }
}

const { token, cookies } = /*await getSession()*/ {
  token: 'V+QYp2eaKY3MeB9+YGas7pbwLgw4rU1rtHvQU6pR3N8=',
  cookies: {
    _sageone_pt_session: 'e75a28da7a2992bf1e3c8890bdf15d89',
    _session_id: 'e620faa266beb9a4686df581c0dabe43',
    __cf_bm: 'bQfG30yEqRDzbPHCObuuGTfJVUbKXgo1J8GCwHnfqPA-1656890654-0-Abv/v28RU+XKsec+RNBrHXQlfFx61P2mMU59xYIp/sz79yDbKUDzGgBgMsS0YR3JhmCNAZ7lZyAtRlo/NNzPc+I='
  }
}

const API = async (url, opts = {}) => {
	const cookie = Object.entries(cookies).map((c) => c.join('=')).join('; ')
	console.log({ url, opts })
	const res = await fetch(url, {
		...opts,
  		headers: { "x-csrf-token": token, cookie, ...opts.headers },
  		redirect: 'manual',
	})
	const setCookies = res.headers.get('set-cookie')
	const __cf_bm = setCookies.split('; ').find(s => s.includes('__cf_bm'))?.split('=')?.[1]
	__cf_bm && (cookies.__cf_bm = __cf_bm)
	console.log({ __cf_bm, setCookies })
	if (res.status >= 300 && res.status <= 399) return API(res.headers.get('location'))
	console.log(res)
	return res.text()
}

const sendInvoice = async ({ invoiceId, email }) => {
	const body = new URLSearchParams({
		'utf8': '✓',
		'authenticity_token': token,
		'email[to]': email,
		'email[cc]': 'clement@devazuka.com',
		'email[message]': 'Your invoice from DEVAZUKA',
		'email[save_default_message]': '0',
		'email[save_default_message]': '1',
		'email[default_message]': '',
		'cancel_url': 'https://app.pt.sageone.com/facturacao/invoicing/sales_invoices',
	})
	const text = await API(`https://app.pt.sageone.com/facturacao/invoicing/sales_invoices/${invoiceId}/email`, {
  		"method": "POST",
  		body: String(body),
	})
	console.log(text)
}

console.log({ t: await sendInvoice({ invoiceId: 5588411, email: 'test@devazuka.com' }) })
/*
// [...]+5D4Z1sMs=

// extract:
// cookie: __cf_bm=[...]-1656888702-0-Ac8/hnAPFD0e+szpx/BgNow7St66FOy7lTOZxA=; _session_id=252[...]753; _sageone_pt_session=a205740fde32eddcd99c24d99220483b; _ga=GA1.4.695467785.1656888709; _gid=GA1.4.[].[]; _fbp=fb.1.[].2122798114; __zlcmid=[]
// '[...]+5D4Z1sMs='
// x-csrf-token: [...]+5D4Z1sMs=



fetch("https://app.pt.sageone.com/facturacao/invoicing/sales_invoices/5588411/email", {
  "headers": {
    "accept": "application/json, text/javascript, /*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "x-csrf-token": "[...]+5D4Z1sMs=",
    "x-requested-with": "XMLHttpRequest",
    "cookie": "__cf_bm=[...]-1656888702-0-Ac8/hnAPFD0e+szpx/BgNow7St66FOy7lTOZxA=; _session_id=252[...]753; _sageone_pt_session=a205740fde32eddcd99c24d99220483b; _ga=GA1.4.695467785.1656888709; _gid=GA1.4.[].[]; _fbp=fb.1.[].2122798114; __zlcmid=[]",
  },
  "body": "utf8=%E2%9C%93&authenticity_token=[...]%2B5D4Z1sMs%3D&email%5Bto%5D=test%40devazuka.com&email%5Bcc%5D=clement%40devazuka.com&email%5Bmessage%5D=aseasease&email%5Bsave_default_message%5D=0&email%5Bsave_default_message%5D=1&email%5Bdefault_message%5D=&cancel_url=https%3A%2F%2Fapp.pt.sageone.com%2Ffacturacao%2Finvoicing%2Fsales_invoices",
  "method": "POST"
})
*/