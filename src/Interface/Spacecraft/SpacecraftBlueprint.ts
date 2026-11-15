import type { InstalledModule } from '../../Engine/Spacecraft/InstalledModule'
import type { Loadout } from '../../Engine/Spacecraft/Loadout'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export enum PartKind {
  Camera = 'Camera',
  Spectrometer = 'Spectrometer',
  Radar = 'Radar',
  ParticleDetector = 'ParticleDetector',
  HighEnergyDetector = 'HighEnergyDetector',
  Battery = 'Battery',
  Thrusters = 'Thrusters',
  FlightComputer = 'FlightComputer',
  Antenna = 'Antenna',
  Whip = 'Whip',
  RepairDrone = 'RepairDrone',
}

export interface Part {
  kind: PartKind
  mark: number
  key: string
  box: Box
  side?: -1 | 1
}

export interface WingLayout {
  key: string
  mark: number
  segments: number
  strutFrom: number
  box: Box
  side: -1 | 1
}

export interface ShieldLayout {
  key: string
  mark: number
  thickness: number
}

export interface HoopLayout {
  key: string
  mark: number
  cx: number
  cy: number
  rx: number
  ry: number
}

const BusSizes: Readonly<Record<string, [number, number]>> = {
  SmallSat: [22, 22],
  Explorer: [30, 30],
  Flagship: [38, 40],
}

const PartSizes: Readonly<Record<PartKind, readonly [number, number][]>> = {
  [PartKind.Camera]: [[7, 10], [9, 13], [11, 16]],
  [PartKind.Spectrometer]: [[9, 8], [11, 9], [13, 11]],
  [PartKind.Radar]: [[30, 4], [40, 5], [52, 6]],
  [PartKind.ParticleDetector]: [[5, 11], [6, 13], [7, 15]],
  [PartKind.HighEnergyDetector]: [[10, 9], [12, 11], [14, 13]],
  [PartKind.Battery]: [[6, 7], [7, 9], [8, 11]],
  [PartKind.Thrusters]: [[5, 5], [7, 6], [9, 7]],
  [PartKind.FlightComputer]: [[7, 5], [9, 6], [11, 7]],
  [PartKind.Antenna]: [[9, 9], [13, 10], [17, 11]],
  [PartKind.Whip]: [[3, 7], [3, 7], [3, 7]],
  [PartKind.RepairDrone]: [[8, 6], [10, 7], [12, 8]],
}

const BelowBody = new Set<string>(['Camera', 'Spectrometer', 'HighEnergyDetector'])
const SegmentPitch = 10
const WingHeights = [13, 15, 17]
const Gap = 2

export class SpacecraftBlueprint {
  readonly busId: string
  readonly body: Box
  readonly hull: Box
  readonly shield?: ShieldLayout
  readonly hoop?: HoopLayout
  readonly wings: readonly WingLayout[]
  readonly parts: readonly Part[]
  readonly tether?: { from: [number, number]; to: [number, number] }
  readonly key: string

  constructor(loadout: Loadout) {
    const fitted = loadout.installed
    const find = (id: string) => fitted.find((module) => module.card.id === id)
    const all = (id: string) => fitted.filter((module) => module.card.id === id)
    const size = (kind: PartKind, mark: number) => PartSizes[kind][mark - 1]
    this.busId = loadout.bus.id
    const [bw, bh] = BusSizes[loadout.bus.id] ?? BusSizes.SmallSat
    this.body = { x: 0, y: 0, w: bw, h: bh }
    this.key = JSON.stringify(loadout.toJson())

    const shielding = find('RadiationShielding')
    const thickness = shielding ? shielding.mark + 1 : 0
    if (shielding) this.shield = { key: shielding.key, mark: shielding.mark, thickness }
    this.hull = { x: -thickness, y: 0, w: bw + thickness * 2, h: bh + Math.max(0, thickness - 1) }

    const magnetic = find('MagneticShield')
    if (magnetic) this.hoop = { key: magnetic.key, mark: magnetic.mark, cx: Math.floor(bw / 2), cy: Math.floor(bh / 2) + 1, rx: Math.floor(this.hull.w / 2) + 5, ry: Math.floor(bh / 2) + 4 }

    const parts: Part[] = []
    const place = (module: InstalledModule, kind: PartKind, x: number, y: number, side?: -1 | 1) => {
      const [w, h] = size(kind, module.mark)
      const part: Part = { kind, mark: module.mark, key: module.key, box: { x, y, w, h }, side }
      parts.push(part)
      return part
    }

    const arrays = all('SolarArray')
    const power = arrays.reduce((sum, module) => sum + module.value, 0)
    const wings: WingLayout[] = []
    const strutY = Math.round(bh * 0.4)
    if (arrays.length) {
      const mark = Math.max(...arrays.map((module) => module.mark))
      const segments = Math.max(1, Math.min(7, power))
      const height = WingHeights[mark - 1]
      const width = segments * SegmentPitch - 1
      const strut = this.hoop ? this.hoop.rx - Math.floor(this.hull.w / 2) + 3 : 4
      const top = strutY - Math.floor(height / 2)
      wings.push({ key: arrays[0].key, mark, segments, strutFrom: this.hull.x, side: -1, box: { x: this.hull.x - strut - width, y: top, w: width, h: height } })
      wings.push({ key: arrays[0].key, mark, segments, strutFrom: this.hull.x + this.hull.w, side: 1, box: { x: this.hull.x + this.hull.w + strut, y: top, w: width, h: height } })
    }
    this.wings = wings

    const bottom = this.hull.y + this.hull.h
    const row: { module: InstalledModule; kind: PartKind }[] = []
    const batteries = all('Battery')
    if (batteries[0]) row.push({ module: batteries[0], kind: PartKind.Battery })
    for (const module of fitted) if (BelowBody.has(module.card.id)) row.push({ module, kind: module.card.id as PartKind })
    if (batteries[1]) row.push({ module: batteries[1], kind: PartKind.Battery })
    const rowWidth = row.reduce((sum, item) => sum + size(item.kind, item.module.mark)[0], 0) + Gap * Math.max(0, row.length - 1)
    let cursor = Math.floor(bw / 2 - rowWidth / 2)
    const rowStart = cursor
    for (const item of row) {
      place(item.module, item.kind, cursor, bottom, undefined)
      cursor += size(item.kind, item.module.mark)[0] + Gap
    }
    const rowHeight = Math.max(0, ...row.map((item) => size(item.kind, item.module.mark)[1]))

    const thrusters = find('Thrusters')
    if (thrusters) {
      const [tw] = size(PartKind.Thrusters, thrusters.mark)
      const left = Math.min(this.hull.x + 1, rowStart - tw - Gap)
      const right = Math.max(this.hull.x + this.hull.w - tw - 1, rowStart + rowWidth + Gap)
      place(thrusters, PartKind.Thrusters, left, bottom, -1)
      place(thrusters, PartKind.Thrusters, right, bottom, 1)
    }

    const radar = find('Radar')
    if (radar) {
      const [rw] = size(PartKind.Radar, radar.mark)
      place(radar, PartKind.Radar, Math.floor(bw / 2 - rw / 2), bottom + rowHeight + 4)
    }

    const computer = find('FlightComputer')
    if (computer) {
      const [, ch] = size(PartKind.FlightComputer, computer.mark)
      place(computer, PartKind.FlightComputer, 3, -ch)
    }

    const antenna = find('Antenna')
    const mastX = Math.round(bw * 0.66)
    if (antenna) {
      const [aw, ah] = size(PartKind.Antenna, antenna.mark)
      place(antenna, PartKind.Antenna, mastX - Math.floor(aw / 2), -ah)
    } else {
      parts.push({ kind: PartKind.Whip, mark: 1, key: 'Whip', box: { x: mastX - 1, y: -7, w: 3, h: 7 } })
    }

    const particles = find('ParticleDetector')
    if (particles) {
      const [pw, ph] = size(PartKind.ParticleDetector, particles.mark)
      place(particles, PartKind.ParticleDetector, this.hull.x - Math.floor(pw / 2), -ph)
    }

    const drone = find('RepairDrone')
    if (drone) {
      const [, dh] = size(PartKind.RepairDrone, drone.mark)
      const wingTop = wings[1] ? wings[1].box.y : 0
      const x = this.hull.x + this.hull.w + 6
      const y = Math.min(wingTop, 0) - dh - 6
      place(drone, PartKind.RepairDrone, x, y)
      this.tether = { from: [this.hull.x + this.hull.w - 1, 1], to: [x, y + dh - 1] }
    }
    this.parts = parts
  }
}
