import { EventKind, SpaceEvent } from './SpaceEvent'

export class RareEvent extends SpaceEvent {
  readonly kind = EventKind.Rare

  override get startsUnidentified(): boolean {
    return true
  }
}
