import { Instrument } from '../../Engine/Modules/Instrument'
import type { Mark } from '../../Engine/Modules/MarkSpec'
import type { ModuleCard } from '../../Engine/Modules/ModuleCard'
import type { Wording } from '../../I18n/UseTranslator'

export class ModuleWording {
  constructor(private readonly wording: Wording) {}

  name(card: ModuleCard): string {
    return this.wording.t(`Module.${card.id}.Name`)
  }

  mark(mark: number): string {
    return this.wording.t(`Mark.${mark}`)
  }

  effect(card: ModuleCard, mark: Mark): string {
    const value = card.mark(mark).value
    if (!Number.isFinite(value)) return this.wording.t(`Module.${card.id}.EffectAll`)
    return this.wording.t(`Module.${card.id}.Effect`, { value })
  }

  cost(card: ModuleCard, mark: Mark): string {
    return this.wording.t('Stat.Cost', { cost: card.mark(mark).costMusd })
  }

  bay(card: ModuleCard, mark: Mark): string {
    return this.wording.t('Stat.Bay', { bay: card.mark(mark).bayUnits })
  }

  power(card: ModuleCard): string {
    return card.isActive ? this.wording.t('Stat.Power', { power: card.powerCost }) : this.wording.t('Stat.NoPower')
  }

  channel(card: ModuleCard): string | undefined {
    return card instanceof Instrument ? this.wording.t(`Channel.${card.channel}`) : undefined
  }
}
