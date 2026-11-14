export class Rules {
  static readonly legsPerFlight = 6
  static readonly contactsPerLeg = 2
  static readonly cruiseTurns = 2
  static readonly surveyCost = 3
  static readonly chaseCost = 2
  static readonly shadowChance = 0.3
  static readonly anomalyChance = 0.15
  static readonly anomalyRadiation = 2
  static readonly unidentifiedNotableChance = 0.3
  static readonly channelBonus = 3
  static readonly fullBonus = 5
  static readonly lostShare = 0.5
  static readonly stormKp = 5
  static readonly particleLeadHours = 24
  static readonly flareLeadHours = 72
  static readonly asteroidsPerLeg = 6
  static readonly asteroidMaxLunar = 20
  static readonly minEventsPerWeek = 8
  static readonly markRanks = [1, 2, 4] as const
}
