import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import { Rarity, RarityTable } from '../Events/Rarity'
import type { SpaceEvent } from '../Events/SpaceEvent'
import type { Week } from '../Weeks/Week'
import { Contact } from './Contact'
import { ConditionRoller } from './TurnCondition'

enum Stream {
  Deal = 1,
  Extra = 2,
  Conditions = 3,
}

export class Scanner {
  private readonly dealt = new Set<string>()

  constructor(
    private readonly week: Week,
    private readonly seed: number,
  ) {}

  deal(legIndex: number): Contact[] {
    const random = SeededRandom.derive(this.seed, Stream.Deal, legIndex)
    const storm = this.week.stormOn(legIndex)
    const picks = this.week.pinnedOn(legIndex).filter((event) => !this.dealt.has(event.id))
    const pool = this.pool(legIndex, picks)

    while (picks.length < Rules.contactsPerLeg && pool.length > 0) {
      const dated = pool.filter((event) => event.isDated)
      const candidates = picks.length === 0 && dated.length > 0 ? dated : pool
      const chosen = random.weighted(candidates, (event) => RarityTable.dealWeight(event.rarity))
      pool.splice(pool.indexOf(chosen), 1)
      picks.push(chosen)
    }

    const contacts: Contact[] = []
    if (storm) contacts.push(this.contact(storm, true, legIndex, 0))
    for (const event of picks) {
      const hidden = event.startsUnidentified || (event.rarity === Rarity.Notable && random.chance(Rules.unidentifiedNotableChance))
      contacts.push(this.contact(event, !hidden, legIndex, contacts.length))
    }
    return contacts
  }

  dealExtra(legIndex: number, slot: number): Contact | undefined {
    const pool = this.pool(legIndex, [])
    if (pool.length === 0) return undefined
    const random = SeededRandom.derive(this.seed, Stream.Extra, legIndex)
    const chosen = random.weighted(pool, (event) => RarityTable.dealWeight(event.rarity))
    return this.contact(chosen, true, legIndex, slot)
  }

  private pool(legIndex: number, taken: readonly SpaceEvent[]): SpaceEvent[] {
    return this.week.eligible(legIndex, this.dealt).filter((event) => !taken.includes(event))
  }

  private contact(event: SpaceEvent, identified: boolean, legIndex: number, slot: number): Contact {
    this.dealt.add(event.id)
    const storm = this.week.stormOn(legIndex)
    const overlay = storm && storm !== event ? storm : undefined
    const roller = new ConditionRoller(SeededRandom.derive(this.seed, Stream.Conditions, legIndex, slot))
    return new Contact(event, identified, roller.roll(event, overlay, storm !== undefined), overlay)
  }
}
