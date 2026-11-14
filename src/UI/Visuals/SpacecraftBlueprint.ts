import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export enum InstrumentShape {
  Telescope = 'Telescope',
  Radiator = 'Radiator',
  Dish = 'Dish',
  Panel = 'Panel',
}

export enum AntennaShape {
  Whip = 'Whip',
  Patch = 'Patch',
  Dish = 'Dish',
  Laser = 'Laser',
}

export interface InstrumentPart {
  id: string
  shape: InstrumentShape
  box: Box
}

export interface WingPart {
  box: Box
  panels: number
  side: -1 | 1
}

export class SpacecraftBlueprint {
  private static readonly busSizes: Record<string, [number, number]> = {
    CubeSat6U: [0.2, 0.3],
    SmallSat: [0.9, 0.9],
    Medium: [1.8, 2.2],
    Large: [2.6, 3.2],
  }

  private static readonly instrumentSizes: Record<string, [number, number, InstrumentShape]> = {
    LandsatImager: [1.3, 1.7, InstrumentShape.Telescope],
    ThermalImager: [0.9, 1, InstrumentShape.Radiator],
    MicrowaveSounder: [0.8, 0.7, InstrumentShape.Dish],
    MiniRadiometer: [0.12, 0.1, InstrumentShape.Dish],
    CubeCamera: [0.09, 0.11, InstrumentShape.Telescope],
    Radar: [6, 0.5, InstrumentShape.Panel],
  }

  private static readonly antennas: Record<string, [AntennaShape, number]> = {
    Uhf: [AntennaShape.Whip, 0.5],
    SBand: [AntennaShape.Patch, 0.3],
    XBand: [AntennaShape.Dish, 0.5],
    KaBand: [AntennaShape.Dish, 0.9],
    Laser: [AntennaShape.Laser, 0.3],
  }

  readonly body: Box
  readonly wings: readonly WingPart[]
  readonly instruments: readonly InstrumentPart[]
  readonly antenna: { shape: AntennaShape; box: Box }
  readonly bounds: Box
  readonly rollOut: boolean
  readonly shielded: boolean
  readonly payloadFits: boolean
  readonly spanM: number

  constructor(design: ResolvedDesign) {
    const [bodyW, bodyH] = SpacecraftBlueprint.busSizes[design.bus.id] ?? [1, 1]
    this.body = { x: -bodyW / 2, y: -bodyH / 2, w: bodyW, h: bodyH }
    this.rollOut = design.arrayType.id === 'RollOut'
    this.shielded = design.shielded
    this.payloadFits = design.payloadMassKg <= design.bus.maxPayloadKg
    this.wings = this.layoutWings(design.arrayAreaM2)
    this.instruments = this.layoutInstruments(design.instruments.map((instrument) => instrument.id))
    this.antenna = this.layoutAntenna(design.comms.id)
    this.spanM = this.wings.length ? this.wings[1].box.x + this.wings[1].box.w - this.wings[0].box.x : bodyW
    this.bounds = this.measure()
  }

  get scaleBarM(): number {
    return [10, 5, 2, 1, 0.5, 0.1].find((length) => length <= this.bounds.w * 0.22) ?? 0.05
  }

  private layoutWings(areaM2: number): WingPart[] {
    if (areaM2 <= 0) return []
    const wingArea = areaM2 / 2
    const height = Math.min(this.body.h * 0.85, Math.sqrt(wingArea / 3))
    const length = wingArea / height
    const gap = Math.max(0.04, this.body.w * 0.14)
    const panels = Math.max(1, Math.min(12, Math.round(length / height)))
    const reach = this.body.w / 2 + gap
    return [
      { box: { x: -reach - length, y: -height / 2, w: length, h: height }, panels, side: -1 },
      { box: { x: reach, y: -height / 2, w: length, h: height }, panels, side: 1 },
    ]
  }

  private layoutInstruments(ids: readonly string[]): InstrumentPart[] {
    const sized = ids.map((id) => ({ id, size: SpacecraftBlueprint.instrumentSizes[id] ?? [0.3, 0.3, InstrumentShape.Radiator] as [number, number, InstrumentShape] }))
    const row = sized.filter((item) => item.size[2] !== InstrumentShape.Panel)
    const booms = sized.filter((item) => item.size[2] === InstrumentShape.Panel)
    const gap = this.body.w * 0.06
    const rowWidth = row.reduce((sum, item) => sum + item.size[0], 0) + gap * Math.max(0, row.length - 1)
    const bottom = this.body.y + this.body.h
    let cursor = -rowWidth / 2
    const parts: InstrumentPart[] = row.map((item) => {
      const part = { id: item.id, shape: item.size[2], box: { x: cursor, y: bottom, w: item.size[0], h: item.size[1] } }
      cursor += item.size[0] + gap
      return part
    })
    const rowHeight = Math.max(0, ...row.map((item) => item.size[1]))
    booms.forEach((item, index) => {
      parts.push({ id: item.id, shape: item.size[2], box: { x: -item.size[0] / 2, y: bottom + rowHeight + this.body.h * 0.12 + index * item.size[1] * 1.4, w: item.size[0], h: item.size[1] } })
    })
    return parts
  }

  private layoutAntenna(commsId: string): { shape: AntennaShape; box: Box } {
    const [shape, nominal] = SpacecraftBlueprint.antennas[commsId] ?? [AntennaShape.Patch, 0.3]
    const size = Math.min(nominal, this.body.w * 0.8)
    return { shape, box: { x: this.body.w * 0.1 - size / 2, y: this.body.y - size, w: size, h: size } }
  }

  private measure(): Box {
    const boxes = [this.body, this.antenna.box, ...this.wings.map((wing) => wing.box), ...this.instruments.map((part) => part.box)]
    const left = Math.min(...boxes.map((box) => box.x))
    const right = Math.max(...boxes.map((box) => box.x + box.w))
    const top = Math.min(...boxes.map((box) => box.y))
    const bottom = Math.max(...boxes.map((box) => box.y + box.h))
    const pad = Math.max(right - left, bottom - top) * 0.12
    return { x: left - pad, y: top - pad, w: right - left + pad * 2, h: bottom - top + pad * 2.6 }
  }
}
