export interface LearnedSource {
  eventId: string
  url: string
  checkedOn: string
}

export class LearnedSources {
  static readonly all: readonly LearnedSource[] = [
    { eventId: 'Asteroid.2019OK', url: 'https://ssd-api.jpl.nasa.gov/cad.api?des=2019%20OK&date-min=2019-07-25&date-max=2019-07-26&dist-max=1LD', checkedOn: '2026-11-14' },
    { eventId: 'Rare.DartImpact', url: 'https://science.nasa.gov/mission/dart/', checkedOn: '2026-11-14' },
    { eventId: 'Rare.Grb221009A', url: 'https://www.nasa.gov/universe/nasa-missions-study-what-may-be-a-1-in-10000-year-gamma-ray-burst/', checkedOn: '2026-11-15' },
    { eventId: 'Exoplanet.TRAPPIST1e', url: 'https://science.nasa.gov/exoplanet-catalog/trappist-1-e/', checkedOn: '2026-11-14' },
    { eventId: 'Exoplanet.51Pegb', url: 'https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/', checkedOn: '2026-11-14' },
    { eventId: 'Exoplanet.ProximaCenb', url: 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/', checkedOn: '2026-11-14' },
    { eventId: 'Exoplanet.WASP39b', url: 'https://science.nasa.gov/missions/webb/nasas-webb-detects-carbon-dioxide-in-exoplanet-atmosphere/', checkedOn: '2026-11-14' },
  ]

  static for(eventId: string): LearnedSource | undefined {
    return LearnedSources.all.find((source) => source.eventId === eventId)
  }

  static linkFor(event: { id: string; sourceUrl: string }): string {
    return LearnedSources.for(event.id)?.url ?? event.sourceUrl
  }
}
