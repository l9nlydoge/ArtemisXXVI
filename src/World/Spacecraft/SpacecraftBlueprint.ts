import { Antenna as AntennaModule } from '../../Engine/Modules/UtilityModules'
import { SolarArray } from '../../Engine/Modules/PowerModules'
import type { Spacecraft } from '../../Engine/Spacecraft/Spacecraft'

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
    SmallSat: [0.9, 0.95],
    Explorer: [1.45, 1.75],
    Flagship: [2.1, 2.6],
  }

  private static readonly instrumentSizes: Record<string, [number, number, InstrumentShape]> = {
    Camera: [0.4, 0.66, InstrumentShape.Telescope],
    Spectrometer: [0.36, 0.34, InstrumentShape.Radiator],
    Radar: [2.5, 0.26, InstrumentShape.Panel],
    ParticleDetector: [0.2, 0.2, InstrumentShape.Radiator],
    HighEnergyDetector: [0.44, 0.4, InstrumentShape.Dish],
  }

  private static readonly markGrowth = [1, 1.18, 1.4]
  private static readonly squareMetresPerPower = 1.5

  readonly body: Box
  readonly wings: readonly WingPart[]
  readonly instruments: readonly InstrumentPart[]
  readonly antenna: { shape: AntennaShape; box: Box }
  readonly bounds: Box
  readonly rollOut = false
  readonly shielded: boolean
  readonly spanM: number
  readonly key: string

  constructor(craft: Spacecraft) {
    const { loadout } = craft
    const [bodyW, bodyH] = SpacecraftBlueprint.busSizes[loadout.bus.id] ?? [1, 1]
    this.body = { x: -bodyW / 2, y: -bodyH / 2, w: bodyW, h: bodyH }
    this.shielded = craft.passiveShield > 0
    const arrayPower = loadout.installed.filter((module) => module.card instanceof SolarArray).reduce((sum, module) => sum + module.value, 0)
    this.wings = this.layoutWings(arrayPower * SpacecraftBlueprint.squareMetresPerPower)
    this.instruments = this.layoutInstruments(craft.instruments.map((module) => ({ id: module.card.id, growth: SpacecraftBlueprint.markGrowth[module.mark - 1] })))
    const dish = loadout.installed.find((module) => module.card instanceof AntennaModule)
    this.antenna = this.layoutAntenna(dish ? AntennaShape.Dish : AntennaShape.Patch, dish ? 0.42 * SpacecraftBlueprint.markGrowth[dish.mark - 1] : 0.24)
    this.spanM = this.wings.length ? this.wings[1].box.x + this.wings[1].box.w - this.wings[0].box.x : bodyW
    this.bounds = this.measure()
    this.key = JSON.stringify(loadout.toJson())
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

  private layoutInstruments(fitted: readonly { id: string; growth: number }[]): InstrumentPart[] {
    const sized = fitted.map(({ id, growth }) => {
      const [w, h, shape] = SpacecraftBlueprint.instrumentSizes[id] ?? [0.3, 0.3, InstrumentShape.Radiator]
      return { id, shape, w: w * growth, h: h * growth }
    })
    const row = sized.filter((item) => item.shape !== InstrumentShape.Panel)
    const booms = sized.filter((item) => item.shape === InstrumentShape.Panel)
    const gap = this.body.w * 0.06
    const rowWidth = row.reduce((sum, item) => sum + item.w, 0) + gap * Math.max(0, row.length - 1)
    const fit = rowWidth > this.body.w * 1.15 ? (this.body.w * 1.15) / rowWidth : 1
    const bottom = this.body.y + this.body.h
    let cursor = (-rowWidth * fit) / 2
    const parts: InstrumentPart[] = row.map((item) => {
      const part = { id: item.id, shape: item.shape, box: { x: cursor, y: bottom, w: item.w * fit, h: item.h * fit } }
      cursor += (item.w + gap) * fit
      return part
    })
    const rowHeight = Math.max(0, ...row.map((item) => item.h * fit))
    booms.forEach((item, index) => {
      parts.push({ id: item.id, shape: item.shape, box: { x: -item.w / 2, y: bottom + rowHeight + this.body.h * 0.12 + index * item.h * 1.4, w: item.w, h: item.h } })
    })
    return parts
  }

  private layoutAntenna(shape: AntennaShape, nominal: number): { shape: AntennaShape; box: Box } {
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
