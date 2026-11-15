import { Channel } from '../Events/Channel'
import { Instrument, Radar } from './Instrument'
import { Marks } from './MarkSpec'
import type { ModuleCard } from './ModuleCard'
import type { ModuleFamily } from './ModuleFamily'
import { Battery, SolarArray } from './PowerModules'
import { MagneticShield, RadiationShielding } from './ProtectionModules'
import { Antenna, CrewCapsule, FlightComputer, RepairDrone, Thrusters } from './UtilityModules'

export class ModuleCatalog {
  static readonly shared = new ModuleCatalog([
    new SolarArray('SolarArray', { minRank: 1, maxCopies: 2, marks: Marks.table([8, 14, 24], [1, 2, 3], [2, 3, 5], [0, 90, 260]) }),
    new Battery('Battery', { minRank: 1, maxCopies: 2, marks: Marks.table([6, 10, 18], [1, 1, 2], [6, 10, 16], [0, 70, 220]) }),
    new Instrument('Camera', Channel.Visible, 2, { minRank: 1, marks: Marks.table([10, 18, 30], [2, 2, 3], [3, 4, 6], [0, 110, 320]) }),
    new Instrument('Spectrometer', Channel.Spectrum, 4, { minRank: 1, marks: Marks.table([14, 24, 38], [2, 3, 3], [4, 6, 8], [0, 140, 360]) }),
    new Radar('Radar', Channel.Radar, 4, { minRank: 1, marks: Marks.table([16, 26, 40], [3, 3, 4], [5, 7, 10], [90, 170, 400]) }),
    new Instrument('ParticleDetector', Channel.Particles, 1, { minRank: 1, marks: Marks.table([6, 10, 16], [1, 1, 1], [2, 3, 5], [0, 80, 240]) }),
    new Instrument('HighEnergyDetector', Channel.HighEnergy, 3, { minRank: 2, marks: Marks.table([18, 28, 44], [2, 2, 3], [4, 6, 9], [120, 200, 440]) }),
    new RadiationShielding('RadiationShielding', { minRank: 1, marks: Marks.table([5, 9, 15], [1, 2, 3], [1, 2, 3], [0, 80, 240]) }),
    new MagneticShield('MagneticShield', 4, { minRank: 1, marks: Marks.table([12, 20, 32], [2, 2, 3], [6, 9, 13], [70, 150, 380]) }),
    new FlightComputer('FlightComputer', { minRank: 1, marks: Marks.table([6, 10, 16], [1, 1, 1], [1, 2, Number.POSITIVE_INFINITY], [40, 100, 240]) }),
    new Thrusters('Thrusters', 2, { minRank: 2, marks: Marks.table([10, 16, 26], [2, 2, 3], [2, 3, 4], [100, 180, 400]) }),
    new Antenna('Antenna', { minRank: 3, marks: Marks.table([8, 14, 22], [1, 2, 2], [1.1, 1.2, 1.35], [120, 220, 460]) }),
    new RepairDrone('RepairDrone', 3, { minRank: 3, marks: Marks.table([9, 15, 24], [1, 1, 2], [6, 9, 12], [110, 200, 420]) }),
    new CrewCapsule('CrewCapsule', { minRank: 6, marks: Marks.table([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]) }),
  ])

  private readonly byId: ReadonlyMap<string, ModuleCard>

  constructor(readonly all: readonly ModuleCard[]) {
    this.byId = new Map(all.map((card) => [card.id, card]))
  }

  has(id: string): boolean {
    return this.byId.has(id)
  }

  get(id: string): ModuleCard {
    const card = this.byId.get(id)
    if (!card) throw new Error(`Unknown module: ${id}`)
    return card
  }

  ofFamily(family: ModuleFamily): ModuleCard[] {
    return this.all.filter((card) => card.family === family)
  }

  get starters(): ModuleCard[] {
    return this.all.filter((card) => card.isStarter)
  }

  instrumentFor(channel: Channel): Instrument | undefined {
    return this.all.find((card): card is Instrument => card instanceof Instrument && card.channel === channel)
  }

  indexOf(id: string): number {
    return this.all.findIndex((card) => card.id === id)
  }
}
