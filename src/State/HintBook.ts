import type { Profile } from '../Engine/Progress/Profile'

export enum Hint {
  Hangar = 'Hangar',
  Scanner = 'Scanner',
  Encounter = 'Encounter',
  Radiation = 'Radiation',
  Debrief = 'Debrief',
  Lab = 'Lab',
}

abstract class HintRule {
  constructor(readonly hint: Hint) {}

  wants(profile: Profile): boolean {
    return !profile.hasSeen(this.hint) && this.fits(profile)
  }

  protected abstract fits(profile: Profile): boolean
}

class DuringFirstFlight extends HintRule {
  protected fits(profile: Profile): boolean {
    return profile.flights === 0
  }
}

class AfterFirstFlight extends HintRule {
  protected fits(profile: Profile): boolean {
    return profile.flights === 1 && profile.hasSeen(Hint.Hangar)
  }
}

export class HintBook {
  private static readonly rules: ReadonlyMap<Hint, HintRule> = new Map<Hint, HintRule>([
    [Hint.Hangar, new DuringFirstFlight(Hint.Hangar)],
    [Hint.Scanner, new DuringFirstFlight(Hint.Scanner)],
    [Hint.Encounter, new DuringFirstFlight(Hint.Encounter)],
    [Hint.Radiation, new DuringFirstFlight(Hint.Radiation)],
    [Hint.Debrief, new AfterFirstFlight(Hint.Debrief)],
    [Hint.Lab, new AfterFirstFlight(Hint.Lab)],
  ])

  static get all(): Hint[] {
    return [...HintBook.rules.keys()]
  }

  static wants(hint: Hint, profile: Profile): boolean {
    return HintBook.rules.get(hint)?.wants(profile) ?? false
  }

  static textKey(hint: Hint): string {
    return `Hint.${hint}`
  }
}
