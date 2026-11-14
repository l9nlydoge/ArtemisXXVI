import { TextRef } from '../../Engine/Core/TextRef'
import { Channel } from '../../Engine/Events/Channel'
import { RareEvent } from '../../Engine/Events/RareEvent'
import { Rarity } from '../../Engine/Events/Rarity'

export class RareEvents {
  static readonly all: readonly RareEvent[] = [
    new RareEvent({
      id: 'Rare.DartImpact',
      label: new TextRef('Event.Rare.DartImpact'),
      dateUtc: '2022-09-26T23:14:00Z',
      rarity: Rarity.Headline,
      channels: new Map([
        [Channel.Visible, { capacity: 12, minMark: 1 }],
        [Channel.Spectrum, { capacity: 8, minMark: 1 }],
      ]),
      turns: [1, 3, 1].map((signal) => ({ signal, radiation: 0 })),
      facts: [new TextRef('Fact.Dart.Date'), new TextRef('Fact.Dart.Target'), new TextRef('Fact.Dart.Parent')],
      learned: new TextRef('Learned.Rare.DartImpact'),
      sourceUrl: 'https://science.nasa.gov/mission/dart/',
      imageId: 'DartImpact',
    }),
    new RareEvent({
      id: 'Rare.Grb221009A',
      label: new TextRef('Event.Rare.Grb221009A'),
      dateUtc: '2022-10-09T13:17:00Z',
      rarity: Rarity.Headline,
      channels: new Map([
        [Channel.HighEnergy, { capacity: 18, minMark: 1 }],
        [Channel.Visible, { capacity: 8, minMark: 1 }],
      ]),
      turns: [3, 1, 0.5].map((signal) => ({ signal, radiation: 0 })),
      facts: [new TextRef('Fact.Grb.Date'), new TextRef('Fact.Grb.Rate')],
      learned: new TextRef('Learned.Rare.Grb221009A'),
      sourceUrl: 'https://www.nasa.gov/universe/nasa-missions-study-what-may-be-a-1-in-10000-year-gamma-ray-burst/',
      imageId: 'Grb221009A',
    }),
  ]
}
