export class Motion {
  static clamp(t: number): number {
    return Math.max(0, Math.min(1, t))
  }

  static span(t: number, from: number, to: number): number {
    return Motion.clamp((t - from) / (to - from))
  }

  static out(t: number): number {
    return 1 - (1 - Motion.clamp(t)) ** 3
  }

  static outQuint(t: number): number {
    return 1 - (1 - Motion.clamp(t)) ** 5
  }

  static in(t: number): number {
    return Motion.clamp(t) ** 3
  }

  static inOut(t: number): number {
    const c = Motion.clamp(t)
    return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2
  }

  static steps(t: number, count: number): number {
    return Math.floor(Motion.clamp(t) * count) / count
  }

  static mix(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  static snap(value: number, grid: number): number {
    return Math.round(value / grid) * grid
  }
}

export class Beat {
  static readonly Bpm = 100
  static readonly Length = 60 / Beat.Bpm
  static readonly Bar = Beat.Length * 4

  static at(beat: number): number {
    return Math.round(beat * Beat.Length * 1000) / 1000
  }
}
