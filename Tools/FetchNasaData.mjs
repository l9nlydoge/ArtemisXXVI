import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
const KpStampHours = 3
const JulianUnixEpoch = 2440587.5
const TdbAheadOfUtcMs = 69184
const KmPerAu = 149597870.7
const LunarPerAu = KmPerAu / 384400
const MaxTimeUncertaintyMin = 60
const MaxDistanceSpread = 0.25
const NearEarthSpacecraft = /^(GOES|SOHO|ACE)/

class Api {
  constructor(cacheDir, offline) {
    this.cacheDir = cacheDir
    this.offline = offline
    this.fetched = new Map()
    this.failures = []
  }

  async json(url) {
    const cacheFile = join(this.cacheDir, `${createHash('sha1').update(url).digest('hex')}.json`)
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8'))
      this.fetched.set(url, cached.fetchedAt)
      return cached.body
    } catch {
      if (this.offline) throw new Error(`Not in the cache and --offline was given: ${url}`)
    }
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'space-game-data-fetch' }, signal: AbortSignal.timeout(120000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      const fetchedAt = new Date().toISOString()
      await mkdir(this.cacheDir, { recursive: true })
      await writeFile(cacheFile, JSON.stringify({ url, fetchedAt, body }))
      this.fetched.set(url, fetchedAt)
      return body
    } catch (error) {
      this.failures.push(`${url}: ${error.message}`)
      throw new Error(`Request failed: ${url}: ${error.message}`)
    }
  }

  header(source, host) {
    const requests = [...this.fetched.keys()].filter((url) => url.includes(host))
    const times = requests.map((url) => this.fetched.get(url)).sort()
    return { retrievedAt: times[times.length - 1], firstRetrievedAt: times[0], source, requests }
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

  static stamp(time) {
    return encodeURIComponent(new Date(time).toISOString().replace('T', ' ').slice(0, 19))
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

  covers(time, leadHours = 0) {
    return time >= this.start - leadHours * HourMs && time < this.end
  }
}

class Asteroids {
  constructor(api, weeks) {
    this.api = api
    this.weeks = weeks
    this.dropped = []
  }

  static rows(table) {
    return (table.data ?? []).map((values) => Object.fromEntries(table.fields.map((field, index) => [field, values[index]])))
  }

  static uncertaintyMinutes(text) {
    const parts = /^(?:<\s*)?(?:(\d+)_)?(\d+):(\d+)$/.exec(String(text ?? '').trim())
    if (!parts) return Number.POSITIVE_INFINITY
    return Number(parts[1] ?? 0) * 1440 + Number(parts[2]) * 60 + Number(parts[3])
  }

  isWellKnown(row) {
    const minutes = Asteroids.uncertaintyMinutes(row.t_sigma_f)
    const spread = (Number(row.dist_max) - Number(row.dist_min)) / Number(row.dist)
    if (minutes <= MaxTimeUncertaintyMin && spread <= MaxDistanceSpread) return true
    this.dropped.push(`${row.des}: time known to ${row.t_sigma_f}, distance ${(Number(row.dist_min) * LunarPerAu).toFixed(2)} to ${(Number(row.dist_max) * LunarPerAu).toFixed(2)} lunar distances`)
    return false
  }

  async collect() {
    const records = []
    for (const week of this.weeks) {
      const range = `date-min=${Dates.day(week.start)}&date-max=${Dates.day(week.end)}&dist-max=${MaxLunar}LD&fullname=true&diameter=true`
      const all = Asteroids.rows(await this.api.json(`https://ssd-api.jpl.nasa.gov/cad.api?${range}`))
      const hazardous = new Set(Asteroids.rows(await this.api.json(`https://ssd-api.jpl.nasa.gov/cad.api?${range}&pha=true`)).map((row) => row.des))
      const isPinned = (row) => week.pinned.has(`Asteroid.${row.des.replace(/\s+/g, '')}`)
      const usable = all.filter((row) => row.h !== null && (isPinned(row) || this.isWellKnown(row))).map((row) => ({ row, time: Asteroids.utc(row) }))
      for (const leg of week.legs) {
        const here = usable.filter(({ time }) => time >= leg.start && time < leg.end)
        const kept = here.filter(({ row }) => isPinned(row))
        const rest = here
          .filter(({ row }) => !isPinned(row) && Number(row.dist) * LunarPerAu <= MaxLunar)
          .sort((a, b) => Number(a.row.dist) - Number(b.row.dist))
          .slice(0, Math.max(0, PerLeg - kept.length))
        for (const { row, time } of [...kept, ...rest]) records.push(await this.record(row, time, hazardous.has(row.des), week.id))
      }
    }
    return records
  }

  static utc(row) {
    const tdb = (Number(row.jd) - JulianUnixEpoch) * DayMs
    return Math.round((tdb - TdbAheadOfUtcMs) / 60000) * 60000
  }

  async record(row, time, hazardous, weekId) {
    const magnitude = Number(row.h)
    const fromMagnitude = (albedo) => (1329 / Math.sqrt(albedo)) * Math.pow(10, -magnitude / 5) * 1000
    const measured = row.diameter ? Number(row.diameter) * 1000 : undefined
    const body = await this.api.json(`https://ssd-api.jpl.nasa.gov/sbdb.api?des=${encodeURIComponent(row.des)}`)
    const orbit = body.orbit ?? {}
    if (!/^\d{4}-\d{2}-\d{2}/.test(orbit.first_obs ?? '') || !/^\d{4}-\d{2}-\d{2}/.test(orbit.last_obs ?? '')) throw new Error(`No observation dates for ${row.des}`)
    return {
      id: row.des.replace(/\s+/g, ''),
      name: (row.fullname ?? row.des).trim().replace(/^\((.*)\)$/, '$1'),
      dateUtc: Dates.iso(time),
      speedKmS: Number(Number(row.v_rel).toFixed(3)),
      missLunar: Number((Number(row.dist) * LunarPerAu).toFixed(4)),
      missKm: Math.round(Number(row.dist) * KmPerAu),
      diameterMinM: Number((measured ?? fromMagnitude(0.25)).toFixed(1)),
      diameterMaxM: Number((measured ?? fromMagnitude(0.05)).toFixed(1)),
      diameterMeasured: measured !== undefined,
      firstObserved: orbit.first_obs.slice(0, 10),
      lastObserved: orbit.last_obs.slice(0, 10),
      hazardous,
      url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(row.des)}`,
      weekId,
    }
  }
}

class Weather {
  constructor(api, weeks) {
    this.api = api
    this.weeks = weeks
  }

  async nuggets(kind, week) {
    const from = Dates.stamp(week.start - (FlareLeadHours + KpStampHours) * HourMs)
    const to = Dates.stamp(week.end + KpStampHours * HourMs)
    return this.api.json(`https://ccmc.gsfc.nasa.gov/DONKI/api/donki/nuggets/${kind}/?startDate=${from}&endDate=${to}`)
  }

  static link(kind, nugget) {
    return `https://ccmc.gsfc.nasa.gov/DONKI/view/${kind}/${nugget.nuggetID}/-1`
  }

  static nearEarth(nugget) {
    return (nugget.instruments ?? []).filter((instrument) => NearEarthSpacecraft.test(instrument.spacecraft ?? '')).map((instrument) => instrument.displayName)
  }

  async collect() {
    const storms = []
    const particleEvents = []
    const flares = []
    for (const week of this.weeks) {
      for (const storm of await this.nuggets('gst', week)) {
        const readings = (storm.kpindex ?? []).map((reading) => ({ timeUtc: Dates.iso(reading.observedTime), kp: reading.kpIndex, source: reading.source }))
        if (readings.some((reading) => week.covers(Date.parse(reading.timeUtc) - KpStampHours * HourMs))) {
          storms.push({ id: storm.activityID, weekId: week.id, startUtc: Dates.iso(storm.startTime), kpReadings: readings, url: Weather.link('GST', storm) })
        }
      }
      for (const event of await this.nuggets('sep', week)) {
        const detectedBy = Weather.nearEarth(event)
        if (detectedBy.length > 0 && week.covers(Date.parse(event.eventTime), 24)) {
          particleEvents.push({ id: event.activityID, weekId: week.id, timeUtc: Dates.iso(event.eventTime), detectedBy, url: Weather.link('SEP', event) })
        }
      }
      for (const flare of await this.nuggets('flr', week)) {
        const detectedBy = Weather.nearEarth(flare)
        if (detectedBy.length > 0 && flare.peakTime && /^[MX]/.test(flare.class ?? '') && week.covers(Date.parse(flare.peakTime), FlareLeadHours)) {
          flares.push({ id: flare.activityID, weekId: week.id, peakUtc: Dates.iso(flare.peakTime), classType: flare.class, detectedBy, url: Weather.link('FLR', flare) })
        }
      }
    }
    return { storms, particleEvents, flares, flaresAvailable: true }
  }
}

class Planets {
  constructor(api) {
    this.api = api
  }

  async collect(names) {
    const list = names.map((name) => `'${name.replace(/'/g, "''")}'`).join(',')
    const columns = 'pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_rade,pl_rade_reflink,pl_orbper,sy_dist,sy_vmag,tran_flag'
    const query = `select ${columns} from pscomppars where pl_name in (${list})`
    const rows = await this.api.json(`https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`)
    return rows.map((row) => ({
      name: row.pl_name,
      host: row.hostname,
      method: row.discoverymethod,
      year: row.disc_year,
      facility: row.disc_facility,
      transits: row.tran_flag === 1,
      radiusEarth: row.pl_rade,
      radiusEstimated: /calculated/i.test(row.pl_rade_reflink ?? ''),
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
  const read = async (path) => JSON.parse(await readFile(join(Root, path), 'utf8'))
  const definitions = await read('src/Data/Curated/WeekDefinitions.json')
  const planetList = await read('src/Data/Curated/ExoplanetList.json')
  const weeks = definitions.map((definition) => new WeekPlan(definition))
  const api = new Api(join(Root, 'Tools/.cache'), args.includes('--offline'))
  const asteroidSource = new Asteroids(api, weeks)

  const problems = []
  const attempt = async (label, task) => {
    try {
      return await task()
    } catch (error) {
      problems.push(`${label} not downloaded: ${error.message}`)
      return undefined
    }
  }
  const asteroids = await attempt('Asteroids', () => asteroidSource.collect())
  const exoplanets = await attempt('Exoplanets', () => new Planets(api).collect(planetList.map((entry) => entry.name)))
  const weather = await attempt('Space weather', () => new Weather(api, weeks).collect())

  for (const week of weeks) {
    const mine = (asteroids ?? []).filter((record) => record.weekId === week.id)
    const perLeg = week.legs.map((leg) => mine.filter((record) => Date.parse(record.dateUtc) >= leg.start && Date.parse(record.dateUtc) < leg.end).length)
    const stormLegs = week.legs.map((leg) => {
      const readings = (weather?.storms ?? []).flatMap((storm) => storm.kpReadings).filter((reading) => {
        const begins = Date.parse(reading.timeUtc) - KpStampHours * HourMs
        return begins >= leg.start && begins < leg.end
      })
      const peak = Math.max(0, ...readings.map((reading) => reading.kp))
      return peak >= 5 ? `Kp${Math.floor(peak)}` : '-'
    })
    const count = (list) => list.filter((entry) => entry.weekId === week.id).length
    const weatherLine = weather ? `storms ${stormLegs.join(' ')}; particle events ${count(weather.particleEvents)}; strong flares ${count(weather.flares)}` : 'weather unknown'
    console.log(`${week.id}: asteroids per leg ${perLeg.join(',')} (total ${mine.length}); ${weatherLine}`)
    if (asteroids && exoplanets && mine.length + exoplanets.length < MinEvents) problems.push(`${week.id} has fewer than ${MinEvents} events`)
    for (const pinned of week.pinned) {
      if (asteroids && pinned.startsWith('Asteroid.') && !mine.some((record) => `Asteroid.${record.id}` === pinned)) problems.push(`${week.id}: pinned ${pinned} was not in the data`)
    }
  }
  for (const line of asteroidSource.dropped) console.log(`Left out, pass too uncertain: ${line}`)
  if (exoplanets) {
    const missing = planetList.map((entry) => entry.name).filter((name) => !exoplanets.some((record) => record.name === name))
    console.log(`Exoplanets: ${exoplanets.length} of ${planetList.length}${missing.length ? `; not found: ${missing.join(', ')}` : ''}`)
    if (missing.length) problems.push(`Exoplanets not found: ${missing.join(', ')}`)
  }
  for (const failure of api.failures) console.log(`Failed request: ${failure}`)

  if (!dry) {
    const write = async (name, body) => {
      await writeFile(join(Root, 'src/Data/Snapshot', name), `${JSON.stringify(body, null, 1)}\n`)
      console.log(`Wrote src/Data/Snapshot/${name}`)
    }
    if (asteroids) await write('Asteroids.json', { ...api.header('NASA/JPL Center for Near-Earth Object Studies: SBDB Close-Approach Data API and Small-Body Database API', 'ssd-api.jpl.nasa.gov'), leftOut: asteroidSource.dropped, records: asteroids })
    if (exoplanets) await write('Exoplanets.json', { ...api.header('NASA Exoplanet Archive, Planetary Systems Composite Parameters', 'exoplanetarchive'), records: exoplanets })
    if (weather) await write('SpaceWeather.json', { ...api.header('NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)', '/DONKI/'), pending: false, ...weather })
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
