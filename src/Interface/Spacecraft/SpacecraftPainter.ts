import { Colours, DarkHullTones, FoilTones, HullTones, PixelCanvas } from './PixelCanvas'
import { PartKind, type Part, type SpacecraftBlueprint, type WingLayout } from './SpacecraftBlueprint'

const C = Colours
const Spectrum = [C.Danger, C.Foil, C.Caution, C.Good, C.Lens, C.AuroraLight]
const Margin = 3

const ThrusterArt: readonly (readonly string[])[] = [
  ['  K  ', ' KFK ', ' LMD ', 'LMMMD', 'KGGGK'],
  ['  K K  ', '  KFK  ', ' LLMDD ', ' LMMMD ', 'LMMMMMD', 'KGGGGGK'],
  ['   KKK   ', '   KFK   ', '  LLMDD  ', '  LMMMD  ', ' LMMMMMD ', 'LMMMMMMMD', 'KGGGGGGGK'],
]
const DroneArt: readonly (readonly string[])[] = [
  ['  FF    ', ' LMMMMD ', 'LMMMMBDK', 'LMMMMWBD', ' DDDDDD ', ' K   K  '],
  ['   FF     ', ' LLMMMMMD ', 'LMMMMMMBDK', 'LMMMMMMWBD', 'LMMMMMMBBD', ' DDDDDDDD ', ' K     K  '],
  ['    FFF     ', ' LLMMMMMMMD ', 'LMMMMMMMMBDK', 'LMMMMMMMWBBD', 'LMMMMMMMBBBD', 'LMMMMMMMMMMD', ' DDDDDDDDDD ', ' K   K   K  '],
]
const ArtKey: Readonly<Record<string, string>> = { L: C.HullBright, M: C.HullLight, D: C.Hull, K: C.HullDark, F: C.FoilDark, G: C.Glass, B: C.Lens, W: C.LensLight }

function Hash(x: number, y: number): number {
  let value = Math.imul(x * 374761393 + y * 668265263, 1274126177)
  value ^= value >>> 13
  return (value >>> 0) % 100
}

export class SpacecraftPainter {
  constructor(private readonly blueprint: SpacecraftBlueprint) {}

  paint(frame: number, active: ReadonlySet<string>): PixelCanvas {
    const size = 300
    const canvas = new PixelCanvas(size, size, 150, 120)
    this.draw(canvas, frame)
    canvas.outline((owner) => (active.has(owner) ? C.FoilLight : owner === 'Wing' ? C.CellDeep : C.HullDeep))
    return canvas
  }

  static crop(frames: readonly PixelCanvas[]): { x: number; y: number; w: number; h: number } {
    let left = Infinity
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    for (const canvas of frames) {
      canvas.colours.forEach((colour, at) => {
        if (!colour) return
        const x = at % canvas.width
        const y = Math.floor(at / canvas.width)
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      })
    }
    return { x: left - Margin, y: top - Margin, w: right - left + 1 + Margin * 2, h: bottom - top + 1 + Margin * 2 }
  }

  private draw(canvas: PixelCanvas, frame: number) {
    const { blueprint } = this
    if (blueprint.hoop) this.hoop(canvas, false)
    for (const wing of blueprint.wings) this.wing(canvas, wing)
    if (blueprint.tether) this.tether(canvas)
    for (const part of blueprint.parts) if (part.box.y < 0) this.part(canvas, part, frame)
    this.body(canvas)
    if (blueprint.shield) this.shield(canvas)
    if (blueprint.hoop) this.hoop(canvas, true)
    for (const part of blueprint.parts) if (part.box.y >= 0) this.part(canvas, part, frame)
  }

  private body(canvas: PixelCanvas) {
    const { x, y, w, h } = this.blueprint.body
    canvas.owner = 'Body'
    canvas.box(x, y + 2, w, h - 4, FoilTones)
    for (let row = y + 3; row < y + h - 3; row++) {
      for (let column = x + 1; column < x + w - 1; column++) {
        const roll = Hash(column, row)
        if (roll < 7) canvas.set(column, row, C.FoilDark)
        else if (roll > 95) canvas.set(column, row, C.FoilLight)
      }
    }
    const seams = this.blueprint.busId === 'SmallSat' ? [0.55] : [0.38, 0.7]
    for (const share of seams) {
      const at = y + Math.round(h * share)
      canvas.rect(x + 1, at, w - 2, 1, C.FoilDark)
      canvas.rect(x + 1, at + 1, w - 2, 1, C.FoilLight)
    }
    if (this.blueprint.busId === 'Flagship') {
      for (const side of [x + 4, x + w - 10]) {
        canvas.box(side, y + 6, 6, Math.round(h * 0.38) - 6, HullTones)
        for (let row = y + 8; row < y + Math.round(h * 0.38) - 1; row += 2) canvas.rect(side + 1, row, 4, 1, C.Hull)
      }
    }
    if (this.blueprint.busId !== 'SmallSat') {
      const mid = x + Math.floor(w / 2)
      canvas.rect(mid, y + Math.round(h * 0.38) + 2, 1, Math.round(h * 0.32) - 2, C.FoilDark)
    }
    canvas.rect(x - 1, y, w + 2, 1, C.HullBright)
    canvas.rect(x - 1, y + 1, w + 2, 1, C.HullLight)
    canvas.rect(x - 1, y + h - 2, w + 2, 1, C.HullLight)
    canvas.rect(x - 1, y + h - 1, w + 2, 1, C.Hull)
  }

  private shield(canvas: PixelCanvas) {
    const shield = this.blueprint.shield!
    const { x, y, w, h } = this.blueprint.body
    const t = shield.thickness
    canvas.owner = shield.key
    for (let layer = 0; layer < t; layer++) {
      const outer = layer === 0
      canvas.rect(x - t + layer, y + 2, 1, h - 2, outer ? C.HullBright : C.HullLight)
      canvas.rect(x + w + layer, y + 2, 1, h - 2, layer === t - 1 ? C.Hull : C.HullLight)
    }
    for (let row = y + 4; row < y + h - 1; row += 4) {
      canvas.set(x - t + Math.floor(t / 2), row, C.HullDark)
      canvas.set(x + w + Math.floor(t / 2), row, C.HullDark)
    }
    if (t > 1) {
      canvas.rect(x - t, y + h, w + t * 2, t - 1, C.HullLight)
      canvas.rect(x - t, y + h + t - 2, w + t * 2, 1, C.Hull)
    }
  }

  private hoop(canvas: PixelCanvas, front: boolean) {
    const hoop = this.blueprint.hoop!
    canvas.owner = hoop.key
    const keep = (_: number, y: number) => !front || y > hoop.cy + 1
    const rings = hoop.mark === 3 ? [-3, 3] : [0]
    for (const offset of rings) {
      canvas.ellipse(hoop.cx, hoop.cy + offset, hoop.rx, hoop.ry, C.FoilDark, keep)
      canvas.ellipse(hoop.cx, hoop.cy + offset - 1, hoop.rx, hoop.ry, C.Foil, keep)
      if (hoop.mark >= 2) canvas.ellipse(hoop.cx, hoop.cy + offset - 2, hoop.rx - 1, hoop.ry, C.FoilLight, keep)
    }
    if (front) return
    canvas.owner = 'Field'
    const reach = hoop.mark === 1 ? [6] : [6, 11]
    reach.forEach((extra, index) => {
      let count = 0
      canvas.ellipse(hoop.cx, hoop.cy, hoop.rx + extra, hoop.ry + extra, index === 0 ? C.AuroraLight : C.Aurora, () => count++ % 5 < 2)
    })
  }

  private wing(canvas: PixelCanvas, wing: WingLayout) {
    const { x, y, w, h } = wing.box
    const strutY = y + Math.floor(h / 2) - 1
    canvas.owner = 'Strut'
    const from = wing.side === 1 ? wing.strutFrom : x + w
    const to = wing.side === 1 ? x : wing.strutFrom
    canvas.rect(from, strutY, to - from, 1, C.HullBright)
    canvas.rect(from, strutY + 1, to - from, 1, C.Hull)
    canvas.owner = 'Wing'
    for (let segment = 0; segment < wing.segments; segment++) {
      const sx = x + segment * 10
      canvas.rect(sx, y, 9, h, C.Cell)
      canvas.rect(sx, y, 9, 1, C.HullLight)
      canvas.rect(sx, y, 1, h, C.HullLight)
      canvas.rect(sx, y + h - 1, 9, 1, C.Hull)
      canvas.rect(sx + 8, y, 1, h, C.Hull)
      for (let row = y + 1; row < y + h - 1; row++) {
        for (let column = sx + 1; column < sx + 8; column++) {
          const i = column - sx - 1
          const j = row - y - 1
          if (i === 3 || j % 4 === 3) canvas.set(column, row, C.CellDeep)
          else if ((i === 0 || i === 4) && j % 4 === 0) canvas.set(column, row, C.CellLight)
        }
      }
      if (segment < wing.segments - 1) canvas.set(sx + 9, strutY, C.HullLight)
    }
  }

  private tether(canvas: PixelCanvas) {
    const { from, to } = this.blueprint.tether!
    canvas.owner = 'Field'
    const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]))
    for (let step = 0; step <= steps; step += 2) {
      canvas.set(Math.round(from[0] + ((to[0] - from[0]) * step) / steps), Math.round(from[1] + ((to[1] - from[1]) * step) / steps), C.Hull)
    }
  }

  private part(canvas: PixelCanvas, part: Part, frame: number) {
    canvas.owner = part.key
    const { x, y, w, h } = part.box
    const m = part.mark
    switch (part.kind) {
      case PartKind.Camera: {
        canvas.rect(x + 2, y, w - 4, 2, C.HullDark)
        canvas.box(x + 1, y + 2, w - 2, h - 6, HullTones)
        if (m >= 2) {
          canvas.rect(x + 1, y + 4, w - 2, 1, C.Foil)
          canvas.rect(x + 1, y + 5, w - 2, 1, C.FoilDark)
        }
        canvas.box(x, y + h - 4, w, 3, HullTones)
        canvas.rect(x + 1, y + h - 1, w - 2, 1, C.Glass)
        canvas.set(x + 2, y + h - 1, C.LensLight)
        canvas.set(x + 3, y + h - 1, C.Lens)
        break
      }
      case PartKind.Spectrometer: {
        canvas.box(x, y, w, h - 2, DarkHullTones)
        for (let column = x + 1; column < x + w - 1; column += 2) canvas.rect(column, y + 1, 1, 2, C.HullBright)
        Spectrum.slice(0, w - 4).forEach((colour, index) => canvas.set(x + 2 + index, y + h - 5, colour))
        if (m === 3) Spectrum.slice(0, w - 4).forEach((colour, index) => canvas.set(x + 2 + index + 1, y + h - 4, colour))
        canvas.rect(x + 2, y + h - 2, w - 4, 1, C.HullLight)
        canvas.rect(x + 3, y + h - 1, w - 6, 1, C.Glass)
        break
      }
      case PartKind.HighEnergyDetector: {
        canvas.rect(x + 3, y, w - 6, 1, C.HullDark)
        for (let row = 1; row < h; row++) {
          const inset = Math.max(0, Math.floor(((h - row) * 2) / h * 1.5))
          const colour = row === h - 1 ? C.Glass : row % 2 ? C.FoilDark : C.Hull
          canvas.rect(x + inset, y + row, w - inset * 2, 1, colour)
          canvas.set(x + inset, y + row, C.HullBright)
          canvas.set(x + w - inset - 1, y + row, C.HullDark)
        }
        canvas.set(x + Math.floor(w / 2), y + h - 1, C.FoilLight)
        break
      }
      case PartKind.Battery: {
        canvas.box(x, y, w, h, DarkHullTones)
        canvas.rect(x + 1, y + 2, w - 2, h - 3, C.Glass)
        for (let row = y + h - 2; row > y + 2; row -= 2) canvas.rect(x + 1, row, w - 2, 1, frame && row === y + 3 + ((h - 5) % 2) ? C.GoodDark : C.Good)
        break
      }
      case PartKind.Thrusters: {
        canvas.pattern(x, y, ThrusterArt[m - 1], ArtKey)
        break
      }
      case PartKind.Radar: {
        const mid = x + Math.floor(w / 2)
        canvas.owner = part.key
        canvas.rect(mid - 1, y - 4, 1, 4, C.HullBright)
        canvas.rect(mid, y - 4, 1, 4, C.Hull)
        canvas.box(x, y, w, h, DarkHullTones)
        for (let column = x + 2; column < x + w - 2; column += 2) canvas.rect(column, y + 1, 1, h - 2, column % 4 === 0 ? C.HullBright : C.HullDark)
        canvas.rect(mid - 1, y, 2, 1, C.FoilLight)
        break
      }
      case PartKind.FlightComputer: {
        canvas.box(x, y, w, h, DarkHullTones)
        for (let row = y + 2; row < y + h - 1; row += 2) canvas.rect(x + 1, row, w - 4, 1, C.HullDark)
        canvas.set(x + w - 2, y + 1, frame ? C.GoodDark : C.Good)
        if (m >= 2) canvas.set(x + w - 3, y + 1, C.Caution)
        break
      }
      case PartKind.Antenna: {
        const mid = x + Math.floor(w / 2)
        const dishRows = m + 2
        const dishTop = y + 2
        canvas.rect(mid, y, 1, 2, C.HullLight)
        canvas.set(mid, y, C.FoilLight)
        for (let row = 0; row < dishRows; row++) {
          const inset = row === 0 ? 0 : Math.round((row * row * w) / (dishRows * dishRows * 2.4)) + 1
          canvas.rect(x + inset, dishTop + row, w - inset * 2, 1, row === 0 ? C.HullBright : C.HullLight)
          canvas.set(x + inset, dishTop + row, C.HullBright)
          canvas.set(x + w - inset - 1, dishTop + row, C.Hull)
        }
        canvas.rect(mid - 1, dishTop + dishRows, 1, h - dishRows - 2, C.HullBright)
        canvas.rect(mid, dishTop + dishRows, 1, h - dishRows - 2, C.Hull)
        break
      }
      case PartKind.Whip: {
        canvas.owner = 'Body'
        canvas.rect(x + 1, y + 1, 1, h - 1, C.HullLight)
        canvas.set(x + 1, y, C.FoilLight)
        canvas.rect(x, y + h - 1, 3, 1, C.Hull)
        break
      }
      case PartKind.ParticleDetector: {
        const mid = x + Math.floor(w / 2)
        const head = m === 1 ? 4 : 5
        canvas.rect(mid, y + head, 1, h - head, C.HullBright)
        canvas.box(x, y, w, head, HullTones)
        canvas.rect(x + 1, y + 1, w - 2, 1, C.Glass)
        canvas.set(x + 1, y + 1, C.Caution)
        canvas.rect(x, y + head - 1, w, 1, C.FoilDark)
        break
      }
      case PartKind.RepairDrone: {
        canvas.pattern(x, y + (frame ? 1 : 0), DroneArt[m - 1], ArtKey)
        break
      }
    }
  }
}
