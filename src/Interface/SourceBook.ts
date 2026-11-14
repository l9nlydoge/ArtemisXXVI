import { Catalog } from '../Engine/Catalog/Catalog'
import type { CatalogItem } from '../Engine/Catalog/CatalogItem'
import { CapacityClass } from '../Engine/Catalog/OrbitClass'
import { Sources } from '../Engine/Catalog/Sources'
import { EngineConstants } from '../Engine/EngineConstants'
import { Numbers } from '../Engine/Numbers'
import type { Translator } from '../I18n/Translator'

export enum SourceStatus {
  Sourced = 'Sourced',
  Mixed = 'Mixed',
  Estimated = 'Estimated',
}

export interface SourceRow {
  name: string
  figures: string
  status: SourceStatus
  links: readonly string[]
}

export interface SourceSection {
  id: string
  noteKey?: string
  rows: readonly SourceRow[]
}

export class SourceBook {
  readonly sections: readonly SourceSection[]

  constructor(private readonly translator: Translator, catalog: Catalog = Catalog.shared) {
    const n = (value: number) => translator.number(value)
    const row = (item: CatalogItem, figures: string[], estimated = item.estimated): SourceRow => ({
      name: item.name,
      figures: figures.join(', '),
      status: !estimated ? SourceStatus.Sourced : item.sources.length ? SourceStatus.Mixed : SourceStatus.Estimated,
      links: item.sources,
    })

    this.sections = [
      {
        id: 'LaunchVehicles',
        noteKey: 'Sources.Note.LaunchVehicles',
        rows: catalog.launchVehicles.items.map((vehicle) => {
          const lifts = Object.values(CapacityClass)
            .filter((orbitClass) => vehicle.capacityTo(orbitClass) > 0)
            .map((orbitClass) => `${n(vehicle.capacityTo(orbitClass))} kg ${translator.t(`Sources.To.${orbitClass}`)}`)
          return row(vehicle, [...lifts, `$${n(Numbers.round(vehicle.pricing.costMusd(50, 1, 1), 2))}M`, `${Numbers.percent(vehicle.failureChance)}% ${translator.t('Sources.FailureRisk')}`])
        }),
      },
      {
        id: 'Orbits',
        noteKey: 'Sources.Note.Orbits',
        rows: catalog.orbits.items.map((orbit) =>
          row(orbit, [
            `${n(orbit.spec.altitudeKm)} km`,
            `${n(Numbers.round(orbit.spec.periodMin))} min`,
            `${orbit.spec.eclipseMin} min ${translator.t('Sources.Shadow')}`,
            `${orbit.spec.inclinationDeg}°`,
            `${orbit.spec.keepingDvMsPerYear} m/s ${translator.t('Sources.PerYear')}`,
          ], true),
        ),
      },
      {
        id: 'Instruments',
        rows: catalog.instruments.items.map((instrument) =>
          row(instrument, [`${n(instrument.massKg)} kg`, `${n(instrument.powerW)} W`, `${n(instrument.dataMbps)} Mbps`, `$${n(instrument.costMusd)}M`]),
        ),
      },
      {
        id: 'Buses',
        rows: catalog.buses.items.map((bus) => row(bus, [`${n(bus.massKg)} kg`, `${n(bus.maxPayloadKg)} kg ${translator.t('Sources.Payload')}`, `${n(bus.baseLoadW)} W`, `$${n(bus.costMusd)}M`])),
      },
      {
        id: 'Radios',
        noteKey: 'Sources.Note.Radios',
        rows: catalog.commsBands.items.map((band) => row(band, [`${n(band.dataMbps)} Mbps`, `${n(band.massKg)} kg`, `${n(band.powerW)} W`, `$${n(band.costMusd)}M`], true)),
      },
      {
        id: 'SolarArrays',
        rows: catalog.solarArrays.items.map((array) => row(array, [`${n(array.wattsPerSquareMeter)} W/m²`, `${n(array.kgPerSquareMeter)} kg/m²`, `$${n(array.costMusdPerSquareMeter)}M/m²`])),
      },
      {
        id: 'Landmarks',
        rows: catalog.landmarks.items.map((landmark) =>
          row(landmark, [`${n(landmark.spec.altitudeKm)} km`, `${landmark.spec.inclinationDeg}°`, `${n(landmark.spec.lengthM)} m`, String(landmark.spec.launchedYear)]),
        ),
      },
      { id: 'Rules', rows: this.rules() },
    ]
  }

  private rules(): SourceRow[] {
    const t = this.translator
    const percent = (fraction: number) => `${Numbers.percent(fraction)}%`
    const rule = (key: string, figures: string, links: string[] = []): SourceRow => ({ name: t.t(`Sources.Rule.${key}`), figures, status: links.length ? SourceStatus.Sourced : SourceStatus.Estimated, links })
    return [
      rule('Margin', percent(EngineConstants.flightReadyMargin), [Sources.GoldRules]),
      rule('Discharge', '25%', [Sources.BatteryDepth]),
      rule('ArrayOutput', '350 W/m²', [Sources.SmallSatPower]),
      rule('Reserve', percent(EngineConstants.reserveForStar)),
      rule('ArrayLoss', percent(1 - EngineConstants.arrayLossFactor)),
      rule('Degradation', `${percent(EngineConstants.arrayDegradationPerYear)} ${t.t('Sources.PerYear')}`),
      rule('Battery', `${EngineConstants.batteryWhPerKg} Wh/kg`),
      rule('Overhead', percent(EngineConstants.programOverhead - 1)),
      rule('Learning', percent(EngineConstants.learningCurve)),
      rule('Stations', `$${EngineConstants.stationCostMusdPerYear}M ${t.t('Sources.PerYear')}`),
      rule('Propellant', `${EngineConstants.propellantIspSeconds} s`),
      rule('Reflight', percent(EngineConstants.reflightSpareFraction)),
    ]
  }
}
