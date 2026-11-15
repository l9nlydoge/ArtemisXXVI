import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = process.argv[2] ?? join(root, 'Tools', '.cache', 'Sound')
const only = process.argv[3]
const vitePort = 5300 + Math.floor(Math.random() * 400)
const chromePort = 9400 + Math.floor(Math.random() * 400)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
await mkdir(outDir, { recursive: true })
const vite = spawn(join(root, 'node_modules', '.bin', 'vite'), ['--port', String(vitePort), '--strictPort'], { cwd: root, stdio: 'ignore' })
const profile = join(outDir, '.profile')
await rm(profile, { recursive: true, force: true })
const chrome = spawn('/usr/bin/google-chrome', ['--headless=new', `--remote-debugging-port=${chromePort}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' })
const stopAll = async () => {
  chrome.kill()
  vite.kill()
  await sleep(300)
  await rm(profile, { recursive: true, force: true })
}
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
  if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails?.exception?.description ?? 'exception')
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push(data.params.args.map((arg) => arg.value ?? arg.description).join(' '))
})
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = nextId++
    waiting.set(id, resolve)
    socket.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const reply = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true })
  if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description?.slice(0, 500))
  return reply.result?.result?.value
}
await send('Runtime.enable')
for (let attempt = 0; attempt < 40; attempt++) {
  await sleep(500)
  try {
    await (await fetch(`http://127.0.0.1:${vitePort}/Tools/SoundBench.html`)).text()
    break
  } catch {}
}
await send('Page.navigate', { url: `http://127.0.0.1:${vitePort}/Tools/SoundBench.html` })
for (let attempt = 0; attempt < 60; attempt++) {
  await sleep(500)
  try {
    if (await evaluate('return Boolean(window.SoundBench)')) break
  } catch {}
}
const names = await evaluate('return window.SoundBench.cueNames')
const jobs = [
  ...names.map((name) => ({ id: name, script: `return await window.SoundBench.renderCue(${JSON.stringify(name)})` })),
  { id: 'Launch', script: 'return await window.SoundBench.renderLaunch()' },
  ...['Home', 'Hangar', 'Flight', 'Storm', 'Debrief', 'Lab'].map((place) => ({ id: `Ambience${place}`, script: `return await window.SoundBench.renderAmbience(${JSON.stringify(place)})` })),
  { id: 'Session', script: 'return await window.SoundBench.renderSession()' },
].filter((job) => !only || job.id.includes(only))
const results = []
console.log(['Sound'.padEnd(20), 'Secs'.padStart(6), 'PeakdB'.padStart(7), 'RMSdB'.padStart(7), 'LUFS~'.padStart(7), 'Clip'.padStart(5), 'DC'.padStart(9), 'TaildB'.padStart(6), 'CentHz'.padStart(6), '<150'.padStart(4), 'Band'.padStart(4)].join(' '))
for (const job of jobs) {
  const result = await evaluate(job.script)
  await writeFile(join(outDir, `${result.name}.wav`), Buffer.from(result.wav, 'base64'))
  if (result.spectrogram) {
    const { columns, rows, seconds, lowHz, highHz, cells } = result.spectrogram
    await writeFile(join(outDir, `${result.name}.spectrogram.raw`), Buffer.from(cells, 'base64'))
    await writeFile(join(outDir, `${result.name}.spectrogram.json`), JSON.stringify({ columns, rows, seconds, lowHz, highHz }))
  }
  delete result.wav
  delete result.spectrogram
  results.push(result)
  const m = result.measure
  console.log([result.name.padEnd(20), m.duration.toFixed(2).padStart(6), m.peakDb.toFixed(1).padStart(7), m.rmsDb.toFixed(1).padStart(7), m.loudness.toFixed(1).padStart(7), (m.clips ? 'CLIP' : 'ok').padStart(5), m.dcOffset.toExponential(1).padStart(9), m.tailDb.toFixed(0).padStart(6), Math.round(m.centroid).toString().padStart(6), (m.lowShare * 100).toFixed(0).padStart(4), (m.bandShare * 100).toFixed(0).padStart(4)].join(' '))
}
await writeFile(join(outDir, 'Measurements.json'), JSON.stringify(results, null, 2))
const rows = results
  .map((result) => `<tr><td><strong>${result.name}</strong><br><span>${result.description}</span></td><td><audio controls preload="none" src="${result.name}.wav"></audio></td><td>${result.measure.duration.toFixed(2)} s</td><td>${result.measure.peakDb.toFixed(1)}</td><td>${result.measure.loudness.toFixed(1)}</td><td>${Math.round(result.measure.centroid)} Hz</td></tr>`)
  .join('\n')
const pictures = results
  .filter((result) => ['Session', 'Launch'].includes(result.name))
  .map((result) => `<figure><img src="${result.name}.spectrogram.png" alt="Spectrogram of ${result.name}"><figcaption>${result.name} spectrogram, 40 Hz to 16 kHz on a log scale; green lines at 300 Hz and 4 kHz</figcaption></figure>`)
  .join('\n')
await writeFile(
  join(outDir, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Artemis 26 sound audition</title><style>body{background:#070b1a;color:#eef3f7;font:16px/1.4 system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2b313c;padding:6px 8px;text-align:left;vertical-align:middle}span{color:#a6b0bb;font-size:14px}h1{font-weight:400}img{max-width:100%;image-rendering:pixelated}figure{margin:16px 0}</style></head><body><h1>Artemis 26 sound audition</h1><p>Every sound is synthesised with the Web Audio API and rendered offline through the game's own master chain. Peak in dBFS; loudness is an approximate LUFS. Start with Session.</p>${pictures}<table><tr><th>Sound</th><th>Listen</th><th>Length</th><th>Peak</th><th>Loudness</th><th>Centroid</th></tr>${rows}</table></body></html>`,
)
for (const result of results.filter((entry) => ['Session', 'Launch'].includes(entry.name))) {
  spawnSync('python3', ['-I', join(root, 'Tools', 'MakeSpectrogram.py'), join(outDir, `${result.name}.spectrogram.raw`), join(outDir, `${result.name}.spectrogram.png`)], { stdio: 'inherit' })
}
if (errors.length) console.log('PAGE ERRORS', errors)
socket.close()
await stopAll()
