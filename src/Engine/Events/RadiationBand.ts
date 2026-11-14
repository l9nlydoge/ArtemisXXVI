export enum RadiationBand {
  None = 'None',
  Low = 'Low',
  High = 'High',
  Severe = 'Severe',
}

export class RadiationBands {
  private static readonly order = [RadiationBand.None, RadiationBand.Low, RadiationBand.High, RadiationBand.Severe]

  static of(radiation: number): RadiationBand {
    if (radiation <= 0) return RadiationBand.None
    if (radiation <= 3) return RadiationBand.Low
    if (radiation <= 7) return RadiationBand.High
    return RadiationBand.Severe
  }

  static worst(bands: readonly RadiationBand[]): RadiationBand {
    return bands.reduce((worst, band) => (RadiationBands.order.indexOf(band) > RadiationBands.order.indexOf(worst) ? band : worst), RadiationBand.None)
  }
}
