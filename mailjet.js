const MAILER_USER = process.env.MAILJET_TOKEN
const MAILER_PASSWD = process.env.MAILJET_SECRET

const Authorization = `Basic ${Buffer.from(
  [MAILER_USER, MAILER_PASSWD].join(':'),
).toString('base64')}`

const HTMLPart = link => `
<h3>Your Authorization link:</h3>
<br />Click <a href="${link}">${link}</a> to authenticate
`

const textPart = link => `
Your Authorization link:
Open ${link} to authenticate
`

export const sendLink = async (email, link) => {
  const message = {
    From: { Email: 'noreply@01-edu.org', Name: 'Lugburz' },
    Subject: 'Connect to 01 Status',
    HTMLPart: HTMLPart(link),
    TextPart: textPart(link),
    To: [{ Email: email }],
  }

  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Messages: [message] }),
  })

  const { ErrorMessage, ...props } = await res.json()
  if (ErrorMessage) throw Object.assign(Error(ErrorMessage), props)
}
