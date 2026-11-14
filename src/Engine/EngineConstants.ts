export class EngineConstants {
  static readonly standardGravity = 9.80665
  static readonly propellantIspSeconds = 220
  static readonly propellantReserve = 1.1
  static readonly arrayLossFactor = 0.85
  static readonly arrayDegradationPerYear = 0.025
  static readonly batteryRoundTripEfficiency = 0.9
  static readonly batteryWhPerKg = 120
  static readonly batteryCostMusdPerWh = 0.002
  static readonly batteryReferenceLifeYears = 10
  static readonly batteryMaxLifeYears = 15
  static readonly shieldingMassFraction = 0.05
  static readonly shieldingCostMusd = 5
  static readonly programOverhead = 1.3
  static readonly learningCurve = 0.8
  static readonly stationCostMusdPerYear = 2
  static readonly busLifeCostPerYear = 0.05
  static readonly busLifeBaselineYears = 3
  static readonly flightReadyMargin = 0.2
  static readonly reserveForStar = 0.1
  static readonly timeStepYears = 0.25
}
