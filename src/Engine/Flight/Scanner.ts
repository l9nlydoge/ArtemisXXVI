import { Rules } from '../Core/Rules'
import { SeededRandom } from '../Core/SeededRandom'
import { Rarity, RarityTable } from '../Events/Rarity'
import type { SpaceEvent } from '../Events/SpaceEvent'
import type { Week } from '../Weeks/Week'
import { Contact } from './Contact'
import { ConditionRoller } from './TurnCondition'

enum Stream {
  Order = 1,
  Identity = 2,
  Conditions = 3,
}

export class Scanner {
  private readonly dealt = new Set<string>()

  constructor(
    private readonly week: Week,
    private readonly seed: number,
  ) {}

  deal(legIndex: number): Contact[] {
    const storm = this.week.stormOn(legIndex)
    const picks = this.week.pinnedOn(legIndex).filter((event) => !this.dealt.has(event.id))
    const queue = this.queue(legIndex, picks)

    if (picks.length === 0) {
      const dated = queue.find((event) => event.isDated)
      if (dated) picks.push(...queue.splice(queue.indexOf(dated), 1))
    }
    while (picks.length < Rules.contactsPerLeg && queue.length > 0) picks.push(queue.shift()!)

    const contacts: Contact[] = []
    if (storm) contacts.push(this.contact(storm, true, legIndex))
    for (const event of picks) contacts.push(this.contact(event, !this.arrivesHidden(event, legIndex), legIndex))
    return contacts
  }

  dealExtra(legIndex: number): Contact | undefined {
    const next = this.queue(legIndex, [])[0]
    return next ? this.contact(next, true, legIndex) : undefined
  }

  private queue(legIndex: number, taken: readonly SpaceEvent[]): SpaceEvent[] {
    return this.week
      .eligible(legIndex, this.dealt)
      .filter((event) => !taken.includes(event))
      .map((event) => ({ event, key: this.drawKey(event, legIndex) }))
      .sort((a, b) => b.key - a.key || a.event.id.localeCompare(b.event.id))
      .map((entry) => entry.event)
  }

  private drawKey(event: SpaceEvent, legIndex: number): number {
    const roll = this.stream(Stream.Order, event, legIndex).next()
    return Math.pow(roll, 1 / RarityTable.dealWeight(event.rarity))
  }

  private arrivesHidden(event: SpaceEvent, legIndex: number): boolean {
    if (event.startsUnidentified) return true
    return event.rarity === Rarity.Notable && this.stream(Stream.Identity, event, legIndex).chance(Rules.unidentifiedNotableChance)
  }

  private contact(event: SpaceEvent, identified: boolean, legIndex: number): Contact {
    this.dealt.add(event.id)
    const storm = this.week.stormOn(legIndex)
    const overlay = storm && storm !== event ? storm : undefined
    const roller = new ConditionRoller(this.stream(Stream.Conditions, event, legIndex))
    return new Contact(event, identified, roller.roll(event, overlay, storm !== undefined), overlay)
  }

  private stream(stream: Stream, event: SpaceEvent, legIndex: number): SeededRandom {
    return SeededRandom.derive(this.seed, stream, legIndex, SeededRandom.hashText(event.id))
  }
}
