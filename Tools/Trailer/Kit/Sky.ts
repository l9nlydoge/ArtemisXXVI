import { Starfield } from '../../../src/Interface/Backdrop/Starfield'
import { GlobePad, GlobeRenderer } from '../../../src/Interface/Backdrop/GlobeRenderer'
import { Assets } from './Assets'
import { Layer } from './Film'
import { Palette } from './Palette'

const Levels = ['#1b2a4e', '#4a5362', '#7c8797', '#b8c1cc', '#ffffff']

export class Sky {
  private readonly field = new Starfield(26)
  private readonly scratch: Layer

  constructor(readonly width: number, readonly height: number) {
    this.scratch = new Layer(width, height)
  }

  paint(context: CanvasRenderingContext2D, driftX: number, driftY: number, beat: number, shown = 5, streak = 0) {
    if (shown >= 5) {
      this.field.paint(context, this.width, this.height, Math.floor(driftX), Math.floor(driftY), beat, streak)
      return
    }
    if (shown <= 0) return
    const scratch = this.scratch.context
    scratch.clearRect(0, 0, this.width, this.height)
    this.field.paint(scratch, this.width, this.height, Math.floor(driftX), Math.floor(driftY), beat, streak)
    const image = scratch.getImageData(0, 0, this.width, this.height)
    const keep = new Set(Levels.slice(5 - shown).map((hex) => parseInt(hex.slice(1), 16)))
    const data = image.data
    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] === 0) continue
      if (!keep.has((data[at] << 16) | (data[at + 1] << 8) | data[at + 2])) data[at + 3] = 0
    }
    scratch.putImageData(image, 0, 0)
    context.drawImage(this.scratch.canvas, 0, 0)
  }
}

export class Globe {
  private readonly renderer: GlobeRenderer

  constructor(readonly radius: number, small = false) {
    this.renderer = new GlobeRenderer(radius, small ? Assets.earthSmall : Assets.earth)
  }

  paint(context: CanvasRenderingContext2D, centreX: number, centreY: number, turn: number) {
    const size = this.renderer.size
    const left = Math.round(centreX) - this.radius - GlobePad
    const top = Math.round(centreY) - this.radius - GlobePad
    const from = Math.max(0, -top)
    const to = Math.min(size, context.canvas.height - top)
    if (to <= from) return
    const canvas = this.renderer.draw(turn, from, to)
    context.drawImage(canvas, 0, from, size, to - from, left, top + from, size, to - from)
  }
}

export function SpaceBackground(layer: Layer) {
  layer.clear(Palette.Space0)
}
