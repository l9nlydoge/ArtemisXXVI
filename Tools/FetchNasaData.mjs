import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const Root = join(dirname(fileURLToPath(import.meta.url)), '..')
const HourMs = 3600000
const DayMs = 24 * HourMs
const MaxLunar = 20
const PerLeg = 6
const MinEvents = 8
const FlareLeadHours = 72
const JulianUnixEpoch = 2440587.5
const KmPerAu = 149597870.7
const LunarPerAu = KmPerAu / 384400

class Api {
  constructor(key, cacheDir, offline) {
    this.key = key
    this.cacheDir = cacheDir
    this.offline = offline
    this.requests = []
    this.fetchedAt = new Map()
    this.failures = []
  }

  async json(url, { keyed = false, optional = false } = {}) {
    const shown = url
    const full = keyed ? `${url}${url.includes('?') ? '&' : '?'}api_key=${this.key}` : url
    const cacheFile = join(this.cacheDir, `${createHash('sha1').update(shown).digest('hex')}.json`)
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8'))
      this.requests.push(shown)
      this.fetchedAt.set(shown, (await stat(cacheFile)).mtime)
      return cached
    } catch {
      if (this.offline) throw new Error(`Not in the cache and --offline was given: ${shown}`)
    }
    try {
      const response = await fetch(full, { headers: { 'User-Agent': 'space-game-data-fetch' }, signal: AbortSignal.timeout(60000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      await mkdir(this.cacheDir, { recursive: true })
      await writeFile(cacheFile, JSON.stringify(body))
      this.requests.push(shown)
      this.fetchedAt.set(shown, new Date())
      return body
    } catch (error) {
      this.failures.push(`${shown}: ${error.message}`)
      if (optional) return undefined
      throw new Error(`Request failed: ${shown}: ${error.message}`)
    }
  }
}

class WeekPlan {
  constructor(definition) {
    this.id = definition.id
    this.legs = definition.legs.map((leg) => ({ start: Date.parse(leg.startUtc), end: Date.parse(leg.endUtc), pinned: leg.pinned ?? [] }))
    this.start = this.legs[0].start
    this.end = this.legs[this.legs.length - 1].end
    this.pinned = new Set(this.legs.flatMap((leg) => leg.pinned))
  }

  legOf(time) {
    return this.legs.findIndex((leg) => time >= leg.start && time < leg.end)
  }

  covers(time, leadHours = 0) {
    return time >= this.start - leadHours * HourMs && time < this.end
  }

  get feedChunks() {
    const chunks = []
    for (let from = this.start; from < this.end; from += 7 * DayMs) {
      const to = Math.min(this.end - DayMs, from + 6 * DayMs)
      chunks.push([Dates.day(from), Dates.day(to)])
    }
    return chunks
  }
}

class Dates {
  static day(time) {
    return new Date(time).toISOString().slice(0, 10)
  }

  static iso(value) {
    const time = typeof value === 'number' ? value : Date.parse(value)
    if (Number.isNaN(time)) throw new Error(`Not a date: ${value}`)
    return new Date(time).toISOString().replace('.000Z', 'Z')
  }
}

class Collector {
  constructor(api, weeks) {
    this.api = api
    this.weeks = weeks
  }

  async asteroids() {
    const records = []
    for (const week of this.weeks) {
      const range = `date-min=${Dates.day(week.start)}&date-max=${Dates.day(week.end)}&dist-max=${MaxLunar}LD&fullname=true&diameter=true`
      const all = await this.api.json(`https://ssd-api.jpl.nasa.gov/cad.api?${range}`)
      const hazardous = await this.api.json(`https://ssd-api.jpl.nasa.gov/cad.api?${range}&pha=true`)
      const hazardSet = new Set(Collector.rows(hazardous).map((row) => row.des))
      const found = Collector.rows(all).map((row) => Collector.asteroid(row, hazardSet.has(row.des), week.id))
      week.legs.forEach((leg) => {
        const here = found.filter((record) => Date.parse(record.dateUtc) >= leg.start && Date.parse(record.dateUtc) < leg.end)
        const isPinned = (record) => week.pinned.has(`Asteroid.${record.id}`)
        const kept = here.filter(isPinned)
        const rest = here.filter((record) => !isPinned(record) && record.missLunar <= MaxLunar).sort((a, b) => a.missLunar - b.missLunar).slice(0, Math.max(0, PerLeg - kept.length))
        records.push(...kept, ...rest)
      })
    }
    return records
  }

  static rows(table) {
    return (table.data ?? []).map((values) => Object.fromEntries(table.fields.map((field, index) => [field, values[index]])))
  }

  static asteroid(row, hazardous, weekId) {
    const time = Math.round(((Number(row.jd) - JulianUnixEpoch) * DayMs) / 60000) * 60000
    const magnitude = Number(row.h)
    const fromMagnitude = (albedo) => (1329 / Math.sqrt(albedo)) * Math.pow(10, -magnitude / 5) * 1000
    const measured = row.diameter ? Number(row.diameter) * 1000 : undefined
    const name = (row.fullname ?? row.des).trim().replace(/^\((.*)\)$/, '$1')
    return {
      id: row.des.replace(/\s+/g, ''),
      name,
      dateUtc: Dates.iso(time),
      speedKmS: Number(Number(row.v_rel).toFixed(3)),
      missLunar: Number((Number(row.dist) * LunarPerAu).toFixed(4)),
      missKm: Math.round(Number(row.dist) * KmPerAu),
      diameterMinM: Number((measured ?? fromMagnitude(0.25)).toFixed(1)),
      diameterMaxM: Number((measured ?? fromMagnitude(0.05)).toFixed(1)),
      hazardous,
      url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(row.des)}`,
      weekId,
    }
  }

  async weather() {
    const from = Dates.day(Math.min(...this.weeks.map((week) => week.start)) - FlareLeadHours * HourMs)
    const to = Dates.day(Math.max(...this.weeks.map((week) => week.end)))
    const range = `startDate=${from}&endDate=${to}`
    const weekOf = (time, lead) => this.weeks.find((week) => week.covers(time, lead))?.id
    const storms = []
    for (const storm of (await this.api.json(`https://api.nasa.gov/DONKI/GST?${range}`, { keyed: true })) ?? []) {
      const readings = (storm.allKpIndex ?? []).map((reading) => ({ timeUtc: Dates.iso(reading.observedTime), kp: reading.kpIndex }))
      const weekId = readings.map((reading) => weekOf(Date.parse(reading.timeUtc), 0)).find(Boolean)
      if (weekId) storms.push({ id: storm.gstID, weekId, startUtc: Dates.iso(storm.startTime), kpReadings: readings, url: storm.link })
    }
    const particleEvents = []
    for (const event of (await this.api.json(`https://api.nasa.gov/DONKI/SEP?${range}`, { keyed: true })) ?? []) {
      const weekId = weekOf(Date.parse(event.eventTime), 24)
      if (weekId) particleEvents.push({ id: event.sepID, weekId, timeUtc: Dates.iso(event.eventTime), url: event.link })
    }
    const flareFeed = await this.api.json(`https://api.nasa.gov/DONKI/FLR?${range}`, { keyed: true, optional: true })
    const flares = []
    for (const flare of flareFeed ?? []) {
      const weekId = flare.peakTime && weekOf(Date.parse(flare.peakTime), FlareLeadHours)
      if (weekId && /^[MX]/.test(flare.classType ?? '')) flares.push({ id: flare.flrID, weekId, peakUtc: Dates.iso(flare.peakTime), classType: flare.classType, url: flare.link })
    }
    return { storms, particleEvents, flares, flaresAvailable: Array.isArray(flareFeed) }
  }

  async exoplanets(names) {
    const list = names.map((name) => `'${name.replace(/'/g, "''")}'`).join(',')
    const query = `select pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_rade,pl_orbper,sy_dist,sy_vmag from pscomppars where pl_name in (${list})`
    const rows = await this.api.json(`https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`)
    return rows.map((row) => ({
      name: row.pl_name,
      host: row.hostname,
      method: row.discoverymethod,
      year: row.disc_year,
      facility: row.disc_facility,
      radiusEarth: row.pl_rade,
      periodDays: row.pl_orbper,
      distanceParsec: row.sy_dist,
      starVmag: row.sy_vmag,
      url: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(row.pl_name)}`,
    }))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const key = process.env.NASA_API_KEY || 'DEMO_KEY'
  const read = async (path) => JSON.parse(await readFile(join(Root, path), 'utf8'))
  const definitions = await read('src/Data/Curated/WeekDefinitions.json')
  const planetList = await read('src/Data/Curated/ExoplanetList.json')
  const weeks = definitions.map((definition) => new WeekPlan(definition))
  const api = new Api(key, join(Root, 'Tools/.cache'), args.includes('--offline'))
  const collector = new Collector(api, weeks)

  const problems = []
  const attempt = async (label, task) => {
    try {
      return await task()
    } catch (error) {
      problems.push(`${label} not downloaded: ${error.message}`)
      return undefined
    }
  }
  const asteroids = await attempt('Asteroids', () => collector.asteroids())
  const exoplanets = await attempt('Exoplanets', () => collector.exoplanets(planetList.map((entry) => entry.name)))
  const weather = await attempt('Space weather', () => collector.weather())

  console.log(`Key: ${key === 'DEMO_KEY' ? 'DEMO_KEY (10 requests per window)' : 'personal key'}`)
  for (const week of weeks) {
    const mine = (asteroids ?? []).filter((record) => record.weekId === week.id)
    const perLeg = week.legs.map((leg) => mine.filter((record) => Date.parse(record.dateUtc) >= leg.start && Date.parse(record.dateUtc) < leg.end).length)
    const stormLegs = week.legs.map((leg) => {
      const readings = (weather?.storms ?? []).flatMap((storm) => storm.kpReadings).filter((reading) => Date.parse(reading.timeUtc) >= leg.start && Date.parse(reading.timeUtc) < leg.end)
      const peak = Math.max(0, ...readings.map((reading) => reading.kp))
      return peak >= 5 ? `Kp${Math.floor(peak)}` : '-'
    })
    const weatherLine = weather
      ? `storms ${stormLegs.join(' ')}; particle events ${weather.particleEvents.filter((event) => event.weekId === week.id).length}; strong flares ${weather.flares.filter((flare) => flare.weekId === week.id).length}`
      : 'weather unknown'
    console.log(`${week.id}: asteroids per leg ${perLeg.join(',')} (total ${mine.length}); ${weatherLine}`)
    if (asteroids && exoplanets && mine.length + exoplanets.length < MinEvents) problems.push(`${week.id} has fewer than ${MinEvents} events`)
    for (const pinned of week.pinned) {
      if (asteroids && pinned.startsWith('Asteroid.') && !mine.some((record) => `Asteroid.${record.id}` === pinned)) problems.push(`${week.id}: pinned ${pinned} was not in the data`)
    }
  }
  if (exoplanets) {
    const missing = planetList.map((entry) => entry.name).filter((name) => !exoplanets.some((record) => record.name === name))
    console.log(`Exoplanets: ${exoplanets.length} of ${planetList.length}${missing.length ? `; not found: ${missing.join(', ')}` : ''}`)
    if (missing.length) problems.push(`Exoplanets not found: ${missing.join(', ')}`)
  }
  if (weather) console.log(`Flare data: ${weather.flaresAvailable ? 'available' : 'NOT available, flare classes will be inferred'}`)
  for (const failure of api.failures) console.log(`Failed request: ${failure}`)

  if (!dry) {
    const header = (source, host) => {
      const requests = api.requests.filter((url) => url.includes(host))
      const latest = Math.max(...requests.map((url) => api.fetchedAt.get(url).getTime()))
      return { retrievedAt: new Date(latest).toISOString(), source, requests }
    }
    const write = async (name, body) => {
      await writeFile(join(Root, 'src/Data/Snapshot', name), `${JSON.stringify(body, null, 1)}\n`)
      console.log(`Wrote src/Data/Snapshot/${name}`)
    }
    if (asteroids) await write('Asteroids.json', { ...header('NASA/JPL Center for Near-Earth Object Studies, SBDB Close-Approach Data API', 'cad.api'), records: asteroids })
    if (exoplanets) await write('Exoplanets.json', { ...header('NASA Exoplanet Archive, Planetary Systems Composite Parameters', 'exoplanetarchive'), records: exoplanets })
    if (weather) await write('SpaceWeather.json', { ...header('NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)', '/DONKI/'), pending: false, ...weather })
  } else {
    console.log('Dry run: nothing written.')
  }
  for (const problem of problems) console.error(`PROBLEM: ${problem}`)
  if (problems.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
