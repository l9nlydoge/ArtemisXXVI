export enum Channel {
  Visible = 'Visible',
  Spectrum = 'Spectrum',
  Radar = 'Radar',
  Particles = 'Particles',
  HighEnergy = 'HighEnergy',
}

export const AllChannels: readonly Channel[] = [Channel.Visible, Channel.Spectrum, Channel.Radar, Channel.Particles, Channel.HighEnergy]
