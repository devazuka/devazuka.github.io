import { readFile } from 'fs/promises'
const [cyan, yellow, grey, green, magenta, red] = [36, 33, 90, 32, 35, 31].map(
  fg => s => `\u001b[${fg}m${s}\u001b[39m`,
)

const code = await readFile('./test.js', 'utf8')
try {
  await import('./test.js')
  console.log(
    code
      .split('\n')
      .filter(l => l.startsWith('//'))
      .map(l => `${green('PASS')}${grey(l.slice(2))}`)
      .join('\n'),
  )
} catch (err) {
  const file = import.meta.url.replace('test-runner.js', 'test.js')
  const [line] = err.stack.split('\n').filter(l => l.includes(file))
  if (!line) throw err
  const parts = line.split(/\.js:([0-9]+):([0-9]+)/)
  const lineNumber = Number(parts[1])
  let lines = []
  let description
  const allLines = [...code.split('\n').entries()]
  const padding = Math.max(String(allLines.length).length, 4)
  for (const [n, l] of allLines) {
    const isBlock = l.startsWith('//')
    if (isBlock) {
      if (n > lineNumber) break
      description && console.log(green('PASS'), grey(description))
      description = l.slice(3)
      lines = []
    } else {
      lines.push([n + 1, l])
    }
  }
  console.log(red('FAIL'), description)
  for (const [n, l] of lines) {
    n === lineNumber
      ? console.log(yellow(String(n).padStart(padding)) + ' ' + l)
      : console.log(grey(String(n).padStart(padding) + ' ' + l))
  }
  console.log(err.message)
}
