import { EngineConstants } from '../EngineConstants'
import type { BudgetSheet } from '../Models/BudgetSheet'
import { Verdict } from './Verdict'

export enum StarBadge {
  MissionSuccess = 'MissionSuccess',
  SmartSpending = 'SmartSpending',
  FlightReady = 'FlightReady',
}

export class StarRating {
  readonly badges: readonly StarBadge[]

  constructor(verdict: Verdict, budgets: BudgetSheet, reserveFraction: number) {
    const badges: StarBadge[] = []
    if (verdict === Verdict.Success) {
      badges.push(StarBadge.MissionSuccess)
      if (reserveFraction >= EngineConstants.reserveForStar) badges.push(StarBadge.SmartSpending)
      if (budgets.flightReady) badges.push(StarBadge.FlightReady)
    }
    this.badges = badges
  }

  get stars(): number {
    return this.badges.length
  }
}
