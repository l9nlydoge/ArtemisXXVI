import { spawn } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const [width, height, outDir, only] = [Number(process.argv[2] ?? 1440), Number(process.argv[3] ?? 900), process.argv[4] ?? 'out', process.argv[5]]
const port = 9333 + Math.floor(Math.random() * 500)
const profile = join(outDir, '.profile')
await rm(profile, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${width},${height}`, '--hide-scrollbars', '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let target
for (let attempt = 0; attempt < 40 && !target; attempt++) {
  await sleep(250)
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
    target = list.find((entry) => entry.type === 'page')
  } catch {}
}
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve))
let nextId = 1
const waiting = new Map()
socket.addEventListener('message', (message) => {
  const data = JSON.parse(message.data)
  if (data.id && waiting.has(data.id)) { waiting.get(data.id)(data); waiting.delete(data.id) }
})
const send = (method, params = {}) => new Promise((resolve) => { const id = nextId++; waiting.set(id, resolve); socket.send(JSON.stringify({ id, method, params })) })
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
  if (reply.result?.exceptionDetails) console.log('JS ERROR', reply.result.exceptionDetails.exception?.description?.slice(0, 300))
  return reply.result?.result?.value
}
const shot = async (name) => {
  const reply = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(join(outDir, `${name}.png`), Buffer.from(reply.result.data, 'base64'))
  console.log('shot', name)
}
const helpers = `const wait = (ms) => new Promise(r => setTimeout(r, ms)); const btn = (text) => [...document.querySelectorAll('button')].find(b => b.textContent.trim().includes(text) && !b.disabled);`
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: 'http://localhost:5173/' })
await sleep(6000)
const steps = [
  ['1-Home', ''],
  ['2-Week', `btn('Fly a mission').click(); await wait(2500);`],
  ['3-Hangar', `btn('Build for this week').click(); await wait(2500);`],
  ['4-Scanner', `btn('Launch').click(); await wait(2500);`],
  ['5-Encounter', `btn('Approach').click(); await wait(1500); document.querySelector('.ActionCard:not(.IsIdle)')?.click(); await wait(600);`],
  ['6-Result', `let g = 0; while (btn('End turn') && g++ < 8) { document.querySelectorAll('.ActionCard:not(.IsIdle):not(.IsOn):not(:disabled)').forEach(c => c.click()); await wait(80); btn('End turn')?.click(); await wait(150) } await wait(600);`],
  ['7-Debrief', `let g = 0; while (!btn('See the debrief') && g++ < 150) { if (btn('End turn')) { document.querySelectorAll('.ActionCard:not(.IsIdle):not(.IsOn):not(:disabled)').forEach(c => c.click()); await wait(40); btn('End turn')?.click() } else if (btn('Continue')) btn('Continue').click(); else if (btn('Approach')) btn('Approach').click(); else if (btn('Hold and recharge')) btn('Hold and recharge').click(); await wait(60) } btn('See the debrief')?.click(); await wait(2500);`],
  ['8-Lab', `btn('Go to the lab').click(); await wait(2500);`],
]
for (const [name, script] of steps) {
  if (script) await evaluate(helpers + script)
  if (!only || name.includes(only)) await shot(name)
}
socket.close()
chrome.kill()
await sleep(300)
await rm(profile, { recursive: true, force: true })
