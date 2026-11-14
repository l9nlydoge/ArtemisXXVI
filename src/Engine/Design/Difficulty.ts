export enum Difficulty {
  Easy = 'Easy',
  Normal = 'Normal',
  Hard = 'Hard',
}

export class DifficultyProfile {
  private static readonly profiles: Record<Difficulty, DifficultyProfile> = {
    [Difficulty.Easy]: new DifficultyProfile(0.1, 0.5),
    [Difficulty.Normal]: new DifficultyProfile(0.2, 1),
    [Difficulty.Hard]: new DifficultyProfile(0.3, 1.5),
  }

  private constructor(
    readonly massContingency: number,
    readonly eventFrequency: number,
  ) {}

  static of(difficulty: Difficulty): DifficultyProfile {
    return DifficultyProfile.profiles[difficulty]
  }
}
