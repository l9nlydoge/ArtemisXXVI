export enum Difficulty {
  Easy = 'Easy',
  Normal = 'Normal',
  Hard = 'Hard',
}

export enum LaunchPolicy {
  AlwaysSucceeds = 'AlwaysSucceeds',
  ReflightFromReserve = 'ReflightFromReserve',
  NoSecondChance = 'NoSecondChance',
}

export class DifficultyProfile {
  private static readonly profiles: Record<Difficulty, DifficultyProfile> = {
    [Difficulty.Easy]: new DifficultyProfile(0.1, 0.5, 2, LaunchPolicy.AlwaysSucceeds, true),
    [Difficulty.Normal]: new DifficultyProfile(0.2, 1, 1, LaunchPolicy.ReflightFromReserve, true),
    [Difficulty.Hard]: new DifficultyProfile(0.3, 1.5, 0, LaunchPolicy.NoSecondChance, false),
  }

  private constructor(
    readonly massContingency: number,
    readonly eventFrequency: number,
    readonly graceYears: number,
    readonly launchPolicy: LaunchPolicy,
    readonly sparesLastInstrument: boolean,
  ) {}

  static of(difficulty: Difficulty): DifficultyProfile {
    return DifficultyProfile.profiles[difficulty]
  }
}
