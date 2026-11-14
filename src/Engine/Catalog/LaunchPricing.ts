export abstract class LaunchPricing {
  abstract costMusd(spacecraftMassKg: number, copies: number, launches: number): number
  abstract readonly sharesRide: boolean
}

export class DedicatedPricing extends LaunchPricing {
  readonly sharesRide = false

  constructor(private readonly pricePerLaunchMusd: number) {
    super()
  }

  costMusd(_spacecraftMassKg: number, _copies: number, launches: number): number {
    return launches * this.pricePerLaunchMusd
  }
}

export class RidesharePricing extends LaunchPricing {
  readonly sharesRide = true

  constructor(
    private readonly basePriceMusd: number,
    private readonly baseMassKg: number,
    private readonly extraPerKgMusd: number,
  ) {
    super()
  }

  costMusd(spacecraftMassKg: number, copies: number): number {
    const perSpacecraft = this.basePriceMusd + Math.max(0, spacecraftMassKg - this.baseMassKg) * this.extraPerKgMusd
    return perSpacecraft * copies
  }
}
