export interface AsteroidRecord {
  id: string
  name: string
  dateUtc: string
  speedKmS: number
  missLunar: number
  missKm: number
  diameterMinM: number
  diameterMaxM: number
  diameterMeasured: boolean
  firstObserved: string
  lastObserved: string
  hazardous: boolean
  url: string
  weekId: string
}

export interface KpReading {
  timeUtc: string
  kp: number
}

export interface StormRecord {
  id: string
  weekId: string
  startUtc: string
  kpReadings: KpReading[]
  url: string
}

export interface ParticleEventRecord {
  id: string
  weekId: string
  timeUtc: string
  detectedBy: readonly string[]
  url: string
}

export interface FlareRecord {
  id: string
  weekId: string
  peakUtc: string
  classType: string
  detectedBy: readonly string[]
  url: string
}

export interface SpaceWeather {
  storms: readonly StormRecord[]
  particleEvents: readonly ParticleEventRecord[]
  flares: readonly FlareRecord[]
  flaresAvailable: boolean
}

export interface ExoplanetRecord {
  name: string
  host: string
  method: string
  year: number
  facility: string
  transits: boolean
  radiusEarth: number | null
  radiusEstimated: boolean
  periodDays: number | null
  distanceParsec: number | null
  starVmag: number | null
  url: string
}

export interface ExoplanetNote {
  famous: boolean
  atmosphere: boolean
}
