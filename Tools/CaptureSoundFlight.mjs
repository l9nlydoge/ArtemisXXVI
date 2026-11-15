import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [width, height] = [Number(process.argv[2] ?? 1280), Number(process.argv[3] ?? 720)]
const outDir = process.argv[4] ?? join(root, 'Tools', '.cache', 'SoundFlight')
const vitePort = 5300 + Math.floor(Math.random() * 400)
const chromePort = 9400 + Math.floor(Math.random() * 400)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
await mkdir(outDir, { recursive: true })
const vite = spawn(join(root, 'node_modules', '.bin', 'vite'), ['--port', String(vitePort), '--strictPort'], { cwd: root, stdio: 'ignore' })
const profile = join(outDir, '.profile')
await rm(profile, { recursive: true, force: true })
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', `--remote-debugging-port=${chromePort}`, `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${width},${height}`, '--hide-scrollbars', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
let target
for (let attempt = 0; attempt < 60 && !target; attempt++) {
  await sleep(250)
  try {
    target = (await (await fetch(`http://127.0.0.1:${chromePort}/json`)).json()).find((entry) => entry.type === 'page')
  } catch {}
}
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve))
let nextId = 1
const waiting = new Map()
const errors = []
socket.addEventListener('message', (message) => {
  const data = JSON.parse(message.data)
  if (data.id && waiting.has(data.id)) {
    waiting.get(data.id)(data)
    waiting.delete(data.id)
  }
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails?.exception?.description ?? data.params.exceptionDetails?.text)
  if (data.method === 'Runtime.consoleAPICalled' && (data.params.type === 'error' || data.params.type === 'warning')) errors.push(`${data.params.type}: ${data.params.args.map((arg) => arg.value ?? arg.description).join(' ')}`)
  if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(`log: ${data.params.entry.text}`)
})
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = nextId++
    waiting.set(id, resolve)
    socket.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
  if (reply.result?.exceptionDetails) console.log('JS ERROR', reply.result.exceptionDetails.exception?.description?.slice(0, 300))
  return reply.result?.result?.value
}
const shot = async (name) => {
  const reply = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(join(outDir, `${width}x${height}-${name}.png`), Buffer.from(reply.result.data, 'base64'))
}
const centre = (selector) => evaluate(`const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`)
const mouse = async (type, [x, y]) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1, pointerType: 'mouse' })
const realClick = async (selector) => {
  const point = await centre(selector)
  if (!point) return false
  await mouse('mouseMoved', point)
  await mouse('mousePressed', point)
  await sleep(40)
  await mouse('mouseReleased', point)
  return true
}
const helpers = `const wait = (ms) => new Promise(r => setTimeout(r, ms)); const btn = (text) => [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(text) && !b.disabled);`
await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
for (let attempt = 0; attempt < 40; attempt++) {
  await sleep(500)
  try {
    await (await fetch(`http://127.0.0.1:${vitePort}/`)).text()
    break
  } catch {}
}
await send('Page.navigate', { url: `http://127.0.0.1:${vitePort}/` })
await sleep(5000)
await evaluate('localStorage.clear(); location.reload()')
await sleep(5000)
const report = {}
report.beforeGesture = await evaluate('return window.Artemis26Sound?.sound.contextState')
await evaluate(`const probe = document.createElement('button'); probe.id = 'DisabledProbe'; probe.disabled = true; probe.textContent = 'probe'; probe.style.cssText = 'position:fixed;left:600px;top:10px;z-index:99'; document.body.append(probe); window.ProbeEvents = []; for (const type of ['pointerdown', 'mousedown', 'click']) document.addEventListener(type, (e) => e.target === probe && window.ProbeEvents.push(type), true)`)
await realClick(`document.getElementById('DisabledProbe')`)
await sleep(200)
report.disabledProbeEvents = await evaluate(`document.getElementById('DisabledProbe').remove(); return window.ProbeEvents`)
report.afterProbe = await evaluate('return window.Artemis26Sound?.sound.contextState')
await shot('1-Home')
const findText = (text) => `[...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(${JSON.stringify(text)}) && !b.disabled)`
await mouse('mouseMoved', (await centre(findText('Fly a mission'))) ?? [10, 10])
await sleep(200)
await realClick(findText('Fly a mission'))
await sleep(600)
report.afterGesture = await evaluate('return window.Artemis26Sound?.sound.contextState')
await sleep(1800)
await shot('2-Week')
await realClick(findText('Build for this week'))
await sleep(2500)
await shot('3-Hangar')
await realClick(findText('Add a second'))
await sleep(600)
await realClick(`document.querySelector('.ModuleRow.IsFitted .ModuleControls .Quiet')`)
await sleep(600)
await realClick(`document.querySelector('.SoundToggle')`)
await sleep(300)
report.mutedEnabled = await evaluate('return window.Artemis26Sound?.sound.enabled')
report.savedWhenMuted = await evaluate(`return localStorage.getItem('Artemis26.Sound')`)
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'm', code: 'KeyM', text: 'm' })
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'm', code: 'KeyM' })
await sleep(300)
report.afterKeyM = await evaluate('return window.Artemis26Sound?.sound.enabled')
await realClick(findText('Launch'))
await sleep(3000)
await shot('4-Scanner')
await realClick(findText('Approach'))
await sleep(1500)
await realClick(`document.querySelector('.ActionCard:not(.IsIdle):not(:disabled)')`)
await sleep(400)
await shot('5-Encounter')
const disabled = await centre(`document.querySelector('.ActionCard:disabled')`)
if (disabled) {
  await mouse('mousePressed', disabled)
  await mouse('mouseReleased', disabled)
}
await evaluate(helpers + `let g = 0; while (!btn('See the debrief') && g++ < 200) { if (btn('End turn')) { document.querySelectorAll('.ActionCard:not(.IsIdle):not(.IsOn):not(:disabled)').forEach(c => c.click()); await wait(120); btn('End turn')?.click(); await wait(900) } else if (btn('Continue')) { btn('Continue').click(); await wait(1200) } else if (btn('Approach')) { btn('Approach').click(); await wait(900) } else if (btn('Hold and recharge')) { btn('Hold and recharge').click(); await wait(900) } else await wait(100) }`)
await sleep(800)
await shot('6-FlightEnd')
await realClick(findText('See the debrief'))
await sleep(2500)
await shot('7-Debrief')
await realClick(findText('Go to the lab'))
await sleep(2500)
await shot('8-Lab')
await evaluate(helpers + `const buy = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Unlock') && !b.disabled); buy?.click(); await wait(800)`)
await shot('9-LabBought')
report.state = await evaluate('return window.Artemis26Sound?.sound.contextState')
const log = await evaluate('return (window.Artemis26Sound?.log ?? []).map(r => r.name + (r.params && Object.keys(r.params).length ? JSON.stringify(r.params) : ""))')
report.cueCounts = {}
for (const name of log ?? []) {
  const key = name.replace(/\{.*$/, '')
  report.cueCounts[key] = (report.cueCounts[key] ?? 0) + 1
}
report.sequence = log
report.errors = errors
await writeFile(join(outDir, `${width}x${height}-report.json`), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ ...report, sequence: (log ?? []).filter((name) => !/^(Hover|Press|Release)/.test(name)).join(' ') }, null, 1))
socket.close()
chrome.kill()
vite.kill()
await sleep(300)
await rm(profile, { recursive: true, force: true })
