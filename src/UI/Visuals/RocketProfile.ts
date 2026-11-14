export class RocketProfile {
  private static readonly profiles: Record<string, RocketProfile> = {
    Rideshare: new RocketProfile(70, 3.7, 5.2, 0, true),
    Electron: new RocketProfile(18, 1.2, 1.2, 0, false),
    VegaC: new RocketProfile(35, 3.4, 3.3, 0, false),
    Falcon9: new RocketProfile(70, 3.7, 5.2, 0, false),
    Ariane64: new RocketProfile(62, 5.4, 5.4, 2, false),
  }

  static readonly tallestM = 70

  private constructor(
    readonly heightM: number,
    readonly diameterM: number,
    readonly fairingDiameterM: number,
    readonly visibleBoosters: number,
    readonly shared: boolean,
  ) {}

  static of(vehicleId: string): RocketProfile {
    return RocketProfile.profiles[vehicleId] ?? RocketProfile.profiles.Falcon9
  }
}
