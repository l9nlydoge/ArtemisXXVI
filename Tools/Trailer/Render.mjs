import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'Tools/.cache/Trailer' },
    url: { type: 'string', default: 'http://localhost:5183/Tools/Trailer/Index.html' },
    from: { type: 'string', default: '0' },
    to: { type: 'string', default: '900' },
    every: { type: 'string', default: '1' },
    frames: { type: 'string', default: '' },
    sound: { type: 'boolean', default: false },
    quality: { type: 'string', default: '0.95' },
  },
})

const Fps = 30
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

class Browser {
  static async open(profile) {
    const port = 9400 + Math.floor(Math.random() * 400)
    await rm(profile, { recursive: true, force: true })
    const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--mute-audio', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' })
    let target
    for (let attempt = 0; attempt < 60 && !target; attempt++) {
      await sleep(250)
      try {
        target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((entry) => entry.type === 'page')
      } catch {}
    }
    const browser = new Browser(chrome, new WebSocket(target.webSocketDebuggerUrl), profile)
    await new Promise((resolve) => browser.socket.addEventListener('open', resolve))
    return browser
  }

  constructor(chrome, socket, profile) {
    this.chrome = chrome
    this.socket = socket
    this.profile = profile
    this.next = 1
    this.waiting = new Map()
    socket.addEventListener('message', (message) => {
      const data = JSON.parse(message.data)
      if (data.id && this.waiting.has(data.id)) {
        this.waiting.get(data.id)(data)
        this.waiting.delete(data.id)
      }
      if (data.method === 'Runtime.exceptionThrown') console.log('PAGE', data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text)
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') console.log('PAGE', data.params.args.map((arg) => arg.value ?? arg.description).join(' '))
    })
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = this.next++
      this.waiting.set(id, resolve)
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const reply = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (!reply.result) throw new Error(JSON.stringify(reply.error ?? reply))
    if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description ?? 'evaluate failed')
    return reply.result.result.value
  }

  async close() {
    this.socket.close()
    this.chrome.kill()
    await sleep(400)
    await rm(this.profile, { recursive: true, force: true })
  }
}

await mkdir(values.out, { recursive: true })
const browser = await Browser.open(join(values.out, '.profile'))
try {
  await browser.send('Runtime.enable')
  await browser.send('Page.enable')
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false })
  await browser.send('Page.navigate', { url: values.url })
  let ready
  for (let attempt = 0; attempt < 80 && !ready; attempt++) {
    await sleep(500)
    if (!(await browser.evaluate('typeof window.Trailer === "object"').catch(() => false))) continue
    ready = await browser.evaluate('window.Trailer.ready()').catch(() => undefined)
  }
  await sleep(300)
  console.log('ready', JSON.stringify(ready))
  if (values.sound) {
    const sound = await browser.evaluate('window.Trailer.sound()')
    await writeFile(join(values.out, 'Score.wav'), Buffer.from(sound.wav, 'base64'))
    await writeFile(join(values.out, 'Levels.json'), JSON.stringify(sound.levels))
    console.log('sound peak', sound.peak)
  }
  const list = values.frames ? values.frames.split(',').map(Number) : []
  if (!list.length) for (let frame = Number(values.from); frame < Number(values.to); frame += Number(values.every)) list.push(frame)
  const started = Date.now()
  for (const frame of list) {
    const data = await browser.evaluate(`window.Trailer.frame(${frame} / ${Fps}, ${values.quality})`)
    await writeFile(join(values.out, `f_${String(frame).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'))
  }
  console.log('frames', list.length, 'ms each', Math.round((Date.now() - started) / Math.max(1, list.length)))
} finally {
  await browser.close()
}
